# ENC-PUBLIC-REGISTRATION-001 — solicitudes públicas de registro (backend)

Rama: `work/enc-public-registration-001`, base `0e2488f5552bf7768a15711316b0de4d71b5d17e`. Sin merge, PR, despliegue, SQL real, migraciones, variables ni Hostinger.

## Flujo

1. Visitante anónimo: `POST /api/public/business-registrations` con cabecera `Idempotency-Key` (UUID v4). Se valida, se guarda una fila `pending` en `business_registration_requests` y se confirma con lectura SQL posterior. No se publica nada ni se toca `businesses`.
2. Administrador (sesión de servidor): `GET /api/admin/business-registrations?status=&limit=&offset=`, `POST .../:id/approve`, `POST .../:id/reject` (cuerpo `{reason}`).
3. Aprobar: reclama la solicitud (`approving`, con `FOR UPDATE`), llama al almacén existente `createStagingBusinessStore().create(draft, <id de la solicitud>)` (INSERT sin upsert, duplicados, ID bajo bloqueo, lectura posterior, aislamiento) y cierra la solicitud (`approved` + `business_id`) con lectura posterior. El id de la solicitud es la clave de idempotencia del almacén: un reintento tras un fallo incierto converge sin crear una segunda empresa. Un duplicado devuelve la solicitud a `pending` y responde 409.

Antiabuso: honeypot `hp`, campos permitidos cerrados, sin HTML, límites de longitud, contactos mexicanos de 10 dígitos (WhatsApp nunca se infiere), límite persistente por IP (3/hora, 6/día; la IP solo se guarda como SHA-256 con sal), cola máxima de 200 pendientes y límite en memoria de 20 intentos/15 min. Duplicados contra empresas y contra solicitudes pendientes.

Aislamiento: toda escritura exige `canWrite()` y `verifyStagingIsolation` (commit `0e2488f`); sin ambos, 403 y ninguna consulta de escritura. El almacén no se construye sin verificador.

## Tabla requerida (propuesta, NO ejecutada; el código falla con 503 `REGISTRATION_STORAGE_NOT_READY` si no existe)

    CREATE TABLE business_registration_requests (
      id CHAR(36) NOT NULL PRIMARY KEY,
      request_key CHAR(36) NOT NULL,
      digest CHAR(64) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      name VARCHAR(160) NOT NULL,
      name_norm VARCHAR(160) NOT NULL,
      phone VARCHAR(10) NOT NULL DEFAULT '',
      whatsapp VARCHAR(10) NOT NULL DEFAULT '',
      applicant_email VARCHAR(160) NOT NULL DEFAULT '',
      payload LONGTEXT NOT NULL,
      ip_hash CHAR(64) NOT NULL,
      business_id VARCHAR(64) NULL,
      reject_reason VARCHAR(500) NULL,
      reviewed_by VARCHAR(64) NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_request_key (request_key),
      KEY idx_status_created (status, created_at),
      KEY idx_ip_created (ip_hash, created_at),
      KEY idx_name_norm (name_norm),
      KEY idx_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

La cuenta de Staging necesita SELECT, INSERT y UPDATE sobre esta tabla (la comprobación de aislamiento ya exige INSERT/UPDATE sobre la base de Staging).

## Cableado pendiente en server.ts (no editable con la herramienta: 350 KB)

Junto a `registerStagingBusinessRoutes(...)`:

    import { mountPublicRegistration } from './src/server/publicRegistrationWiring';
    mountPublicRegistration(app, { isStaging, canWrite: isBusinessWritePermitted, isAdmin: isVerifiedAdminSession, getPool, businessStore: stagingBusinessStore });

Si el guardián global de Staging bloquea métodos de escritura desconocidos, permitir `POST /api/public/business-registrations` y `POST /api/admin/business-registrations/:id/(approve|reject)`. Variables nuevas (solo en Staging, por el propietario): `PUBLIC_REGISTRATION_ENABLED=true` y `PUBLIC_REGISTRATION_IP_SALT` (secreto aleatorio de al menos 16 caracteres). Si falta cualquiera, el envío público responde con error real (403/503). Detrás de un proxy, configurar `trust proxy` para que `req.ip` sea la IP del visitante.

Reversión: quitar `PUBLIC_REGISTRATION_ENABLED` (o la llamada de montaje) y reiniciar solo Staging; las solicitudes guardadas permanecen y no afectan al directorio.

## Pruebas y límites

`tests/public-registration.test.mjs`: 17 pruebas con MariaDB y almacén de negocios SIMULADOS (Node 20, tipos eliminados con un script propio): validación, alta, idempotencia, duplicados, límites, errores, aislamiento, aprobación (concurrente, duplicado, fallo incierto, cierre fallido), rechazo, listado, rutas y lista blanca de SQL. 9 mutaciones del código fueron detectadas. No se ejecutó `tsc`, `vite build` ni nada contra MariaDB real, ni contra el almacén real `stagingBusinessStore`. Sin CAPTCHA (solo honeypot y límites): si se expone a Internet, añadir uno. El correo del solicitante se guarda solo en la solicitud y no pasa a la empresa.
