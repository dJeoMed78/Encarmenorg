# ENC-CLASSIFIEDS-BACKEND-001 — backend público de clasificados

Rama `work/enc-classifieds-backend-001`, base `work/enc-consolidation-001` (`a16ca710449eda3c68f26016b91ce59d55b95b2b`). Referencia GAS: `067a3b0e2015397dc33862da475cc5b0eb4ae208`. Laboratorio MariaDB de referencia: `e53ba79f9fda5115d813f418e6ffcc0b624b94ae`.

## Contrato API

- `GET /api/public/classifieds` → `{ success, total, classifieds }` (solo activos no expirados; fallo SQL = 503, nunca lista vacía ni caché).
- `POST /api/public/classifieds` → `201 { success, message, classified }`; idempotente con `idempotencyKey`; duplicado → `200 { ..., duplicate: true }`.
- `PATCH /api/public/classifieds/:id` → requiere `x-classified-owner-token`; permite `status` (`active|sold|retired`), `title`, `description`, `price`; responde `{ success, message, classified }`.
- `DELETE /api/public/classifieds/:id` → requiere token; retiro lógico (`status='retired'`) confirmado por lectura posterior; responde `{ success, message }`.
- Errores: `{ success:false, error, message }`; si la escritura pudo haber ocurrido pero no se pudo confirmar: `error:'CLASSIFIEDS_WRITE_UNCONFIRMED'` y `writeMayHaveSucceeded:true`.
- Sin autorización de titular: `OWNER_AUTHORIZATION_REQUIRED` / `OWNER_AUTHORIZATION_INVALID` (403). La autorización sólida definitiva (login/cuenta) queda pendiente; el token de titular emitido en la creación es la medida inicial.

## Seguridad y aislamiento

- `classified:manage` NO se usa para el carril público; los permisos administrativos existentes no se modifican.
- Escritura solo si: pool activo, base distinta de producción, usuario distinto del de producción, tabla `enc_classifieds_isolation` con `marker_value='ENC-CLASSIFIEDS-LAB-ISOLATED'`, motor InnoDB y privilegios INSERT/ALL.
- Sin verificación de aislamiento → `ISOLATION_*` (503); no hay alta en memoria ni en JSON como sustituto.
- `getPool()` nulo → `PERSISTENCE_UNAVAILABLE` (503).
- Validación cerrada: título 5–120, descripción 10–2000, categoría de lista cerrada, teléfono a 10 dígitos, precio 0–9,999,999.99, imagen solo rutas internas (`/uploads|/images|/wp-content`, sin `..`), idempotencyKey 8–64.
- Vigencia: 7 días; `GET` marca expirados y lista solo vigentes; no elimina registros.
- Fotografías: solo referencias a rutas internas; la carga pública de archivos queda pendiente.

## Integración con server.ts

`scripts/apply-classifieds-backend-patch.mjs` inserta, con anclas exactas e idempotencia:

1. `import { registerPublicClassifieds } from './src/server/publicClassifieds';` después del import de `businessContacts`.
2. `registerPublicClassifieds(app);` después de `app.use(express.urlencoded(...))` (para que el body parser esté activo).

    node scripts/apply-classifieds-backend-patch.mjs --server server.ts --check
    node scripts/apply-classifieds-backend-patch.mjs --server server.ts

## Solapamiento con W1

No se modificaron los bloques W1 (H01–H04) ni el middleware de Staging. Punto de integración documentado: en Staging, el middleware existente `STAGING_READ_ONLY` bloquea POST/PATCH/DELETE de `/api/public/classifieds` antes de que este módulo pueda evaluar su propio aislamiento. Para habilitar el carril en Staging habría que añadir una excepción explícita y acotada a ese middleware; no se hizo para no tocar W1 sin autorización específica.

## Pruebas

`tests/public-classifieds.test.mjs` — 14 pruebas con pool simulado:

1. Validación cerrada (7 casos inválidos).
2. POST válido con persistencia y lectura posterior.
3. Idempotencia (misma clave, mismo id, una fila).
4. Duplicado con datos distintos → 409.
5. Fallo SQL en INSERT → error confirmado, sin mutación.
6. Resultado incierto (readback falla) → `writeMayHaveSucceeded`.
7. GET: activos vigentes y expiración.
8. GET con fallo SQL → 503, sin servir caché.
9. Edición exige token; token inválido rechazado.
10. Baja confirmada y desaparición del listado.
11. Aislamiento (marca, producción, motor, privilegios).
12. Sin pool → sin escritura ni memoria.
13. Vigencia de 7 días.
14. Registro de rutas: solo el carril público, sin rutas admin.

## Estado de ejecución

**NO se ejecutaron las pruebas, `tsc`, `vite build` ni pruebas contra MariaDB real en este entorno** (no hay Node/Docker disponibles para el agente). El código y las pruebas se entregan listos para ejecución:

    npx tsx --test tests/public-classifieds.test.mjs
    npx tsc --noEmit
    npx vite build

No se declaran como probados la compilación, la suite ni la persistencia real. Para MariaDB real, usar únicamente una instancia desechable con la marca de aislamiento creada previamente:

    CREATE TABLE enc_classifieds_isolation (marker_value VARCHAR(64) PRIMARY KEY);
    INSERT INTO enc_classifieds_isolation VALUES ('ENC-CLASSIFIEDS-LAB-ISOLATED');
