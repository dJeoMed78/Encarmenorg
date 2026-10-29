# ENC-PUBLIC-REGISTRATION-001-R1 — registro público directo en businesses

Rama `work/enc-public-registration-001`, base `a6dc0a73ee394f1f5e07901814c2f123e7be01cc`. Sin merge, PR, despliegue, SQL real, migraciones, variables ni Hostinger.

## Flujo implementado

Usuario -> formulario -> `POST /api/public/business-registrations` -> validación -> `stagingBusinessStore.create(draft, Idempotency-Key)` (INSERT sin upsert, duplicados por nombre o contacto, ID bajo bloqueo, idempotencia, aislamiento de Staging, lectura posterior) -> segunda lectura SQL independiente (`SELECT id, name, phone, whatsapp, status FROM businesses WHERE id = ?`) -> caché del directorio actualizada -> `201` con el ID.

- Sin estados de revisión, sin aprobación administrativa y sin tabla nueva: se retiró la tabla de solicitudes y las rutas de administración de la entrega anterior.
- El POST es anónimo y no consulta sesiones. No recibe ni acepta campos privilegiados (`id`, `status`, `slug`, `isTopBusiness`, `isRecommended`, `clearContacts`, `rating`...). La capa pública no escribe SQL propio: solo `SELECT`.
- Teléfono y WhatsApp son independientes; se exige al menos uno válido (10 dígitos, acepta 52/521). El negocio guarda `registrationSource: "public-form"` para poder auditar y moderar a posteriori.
- Abuso: campos cerrados, honeypot `hp`, sin HTML, longitudes, URL http(s) sin credenciales, `Content-Length` obligatorio y máximo 16 KB antes del analizador JSON global (50 MB), 20 intentos/15 min y 3 registros válidos/hora por IP (en memoria), y tope global persistente de 30/hora y 200/día contado sobre `businesses` (`raw_data LIKE`).
- Errores reales: 400 validación, 403 deshabilitado, 409 duplicado o clave reutilizada con otros datos, 429 límites, 503 MariaDB o lectura de confirmación fallida (`writeMayHaveSucceeded` indica si conviene reintentar con la misma clave). Nunca se guarda en local ni se responde éxito sin lectura confirmada.
- Solo Staging: `mountPublicRegistration` no registra nada fuera de Staging y exige `PUBLIC_REGISTRATION_ENABLED=true` más el interruptor de escritura de negocios existente.

## Conexión en server.ts (PENDIENTE: la herramienta no puede editar server.ts)

`server.ts` pesa cientos de KB y la herramienta no permite editarlo parcialmente. El parche exacto y verificable es el script de este commit; se aplica desde la raíz del repositorio en esta rama:

    node scripts/apply-public-registration-patch.mjs server.ts --check
    node scripts/apply-public-registration-patch.mjs server.ts

Cada paso exige que su ancla aparezca exactamente una vez (si no, aborta sin escribir) y es idempotente. Cambios:
1. Importa `mountPublicRegistration` y `publicRegistrationBodyLimit` de `./src/server/publicRegistrationWiring.ts`.
2. Añade `getPool` a la importación de `./src/db/mariadb.ts`.
3. En el guardián de Staging, `businessMutation` pasa a incluir `req.method === 'POST' && req.path === '/api/public/business-registrations'` (coincidencia exacta; PUT, PATCH, DELETE, barra final y subrutas siguen bloqueados).
4. `app.use('/api/public/business-registrations', publicRegistrationBodyLimit)` justo antes de `app.use(express.json({ limit: '50mb' }))`.
5. Tras `registerStagingBusinessRoutes(...)`, llama a `mountPublicRegistration(app, {...})` reutilizando `stagingBusinessStore`, `generateCategorySlugs` y la misma actualización de `businessesCache`/`cachedDbSignature` que usa el alta administrativa.

Después de aplicarlo: `npx tsc --noEmit` y `npx vite build` (no ejecutados por Perplexity).

## Variables (solo Staging, por el propietario)

`PUBLIC_REGISTRATION_ENABLED=true`, además de la configuración de escrituras ya documentada (`STAGING_READ_ONLY=false`, `STAGING_DB_CONFIRMED=true`, `STAGING_BUSINESS_WRITES_ENABLED=true`, marca de entorno y cuenta limitada de `ENC-STAGING-WRITE-001-RECOVERY`). Detrás de un proxy hay que configurar `trust proxy` para que `req.ip` sea la IP real; si no, todos los visitantes comparten el límite por IP. Reversión: quitar `PUBLIC_REGISTRATION_ENABLED` y reiniciar solo Staging. Para revisar altas públicas: `SELECT id, name, created_at FROM businesses WHERE raw_data LIKE '%"registrationSource":"public-form"%' ORDER BY created_at DESC;`.

## Pendientes y riesgos

- La publicación inmediata de contenido anónimo no tiene revisión previa: honeypot y límites reducen el abuso pero no sustituyen un CAPTCHA ni la moderación posterior con las herramientas administrativas existentes.
- El formulario del frontend aún apunta a `/api/submit-business` (requiere sesión administrativa en Staging); debe enviar a la ruta nueva solo los campos permitidos. No se modificó el frontend.
- Si el tope global se agota, un reintento de un registro ya guardado recibe 429 hasta que baje el contador (luego se repite de forma idempotente).
- Pruebas ejecutadas con MariaDB y almacén simulados; la persistencia real y el almacén real no se probaron. `tsc` y `vite build` no se ejecutaron.
