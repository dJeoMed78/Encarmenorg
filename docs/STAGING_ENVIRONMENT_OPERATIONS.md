# ENCARMEN — Manual de Operaciones y Aislamiento del Entorno de Staging

**Identificador:** ENC-STAGING-ENV-READINESS-001  
**Repositorio:** `dJeoMed78/Encarmenorg`  
**Entorno:** `staging.encarmen.org`  
**Destinatario:** Coordinación Principal (ChatGPT — 01) / Operaciones de Infraestructura  

---

## 1. Objetivo y Filosofía de Aislamiento

El entorno de Staging (`staging.encarmen.org`) tiene como propósito validar y demostrar nuevas funcionalidades desarrolladas para ENCARMEN con total fidelidad respecto al comportamiento del servidor Node.js y la base de datos MariaDB de Hostinger, **garantizando con certeza absoluta que ningún dato, archivo multimedia, caché o servicio de producción sea alterado, degradado o sobrescrito**.

Para lograr esto, la arquitectura implementa una estrategia de **Defensa en Profundidad (Defense in Depth)** estructurada en cuatro capas independientes:

```
[ Capa 1: Aislamiento DNS y Enrutamiento HTTP ]
       ↓
[ Capa 2: Middleware HTTP de Bloqueo de Mutaciones ]
       ↓
[ Capa 3: Validación de Base de Datos y Arranque a Prueba de Fallos (Fail-Closed) ]
       ↓
[ Capa 4: Guardián a Nivel Repositorio en Métodos de Escritura (DML/DDL) ]
```

---

## 2. Inventario de Recursos y Reglas de Separación

| Recurso | Producción (`encarmen.org`) | Staging (`staging.encarmen.org`) | Regla de Aislamiento |
| :--- | :--- | :--- | :--- |
| **Dominio** | `encarmen.org`, `empresasencarmen.com` | `staging.encarmen.org` | VirtualHost / Subdominio separado en Hostinger |
| **Base de Datos** | `u293982346_encarmenapp` | `u293982346_encarmentest` | **PROHIBIDO** apuntar Staging a la BD de producción |
| **Usuario DB** | `u293982346_appuser` | `u293982346_staginguser` | Usuario independiente; sin privilegios sobre tablas de producción |
| **Modo de Base de Datos** | Lectura / Escritura | Lectura obligatoria o Escritura en BD de prueba confirmada | `STAGING_READ_ONLY=true` por defecto |
| **Inicialización DDL** | Tablas automáticas permitidas | Bloqueada por defecto | `STAGING_ALLOW_SCHEMA_INIT=false` |
| **Sincronización de Catálogo** | Autoritativa hacia MariaDB | Omitida al arrancar en Staging | Evita insertar o mutar empresas de producción |
| **Purga de Caché CDN** | Envía PURGE a dominios oficiales | Bloqueada (`ENABLE_CACHE_PURGE=false`) | Evita invalidar caché de visitantes en producción |
| **Archivos Multimedia** | `public/uploads/`, logos oficiales | Bloqueado en read-only | Evita sobrescribir logotipos o banners oficiales |

---

## 3. Barreras de Seguridad Implementadas en Código

### 3.1 Prohibición de Fallback Implícito
En versiones anteriores, `getMariaDbConfig()` asumía automáticamente valores predeterminados apuntando a la base de datos de producción (`u293982346_encarmenapp`) si no se suministraban variables en el archivo `.env`.  
**Corrección implementada:** Cuando `isStagingEnvironment()` es verdadero, no se admite ningún fallback a producción; el arranque exige que `DB_NAME` esté configurado explícitamente.

### 3.2 Detección de Colisión con Producción
Si Staging detecta `DB_NAME === 'u293982346_encarmenapp'` y `STAGING_READ_ONLY !== 'true'`, el sistema aborta de inmediato la inicialización y bloquea el pool de conexiones.

### 3.3 Omisión de Mutaciones al Inicio del Servidor
En `server.ts`, el bloque `initMariaDb().then(...)` sincronizaba registros faltantes (`missingInDb`), sembraba tablas vacías y ejecutaba `pruneExpiredEvents()`.  
**Corrección implementada:** Toda escritura al arranque se condiciona a `isWritePermitted()`. En modo Staging seguro o solo lectura, se omiten todas las inserciones y eliminaciones automáticas.

### 3.4 Desactivación de Purgas Externas
La función `purgeWordPressCache()` ahora verifica `isStagingEnvironment()` o `ENABLE_CACHE_PURGE === 'false'` antes de emitir solicitudes HTTP `PURGE` a `https://encarmen.org` o `https://empresasencarmen.com`.

---

## 4. Modos Operativos de Staging

El entorno soporta dos modos operativos controlados mediante variables de entorno:

### Modo A: Demostración y Pruebas Seguras (Solo Lectura) — *Recomendado*
- **Variables clave:**
  ```ini
  APP_ENV=staging
  STAGING_READ_ONLY=true
  STAGING_SAFE_MODE=true
  STAGING_STRICT_BOOT=true
  STAGING_DB_CONFIRMED=false
  ENABLE_CACHE_PURGE=false
  ENABLE_WP_SYNC=false
  ```
- **Comportamiento:**
  - El servidor sirve la interfaz completa en `staging.encarmen.org`.
  - Peticiones `GET`, `HEAD` y `OPTIONS` funcionan normalmente.
  - Peticiones `POST`, `PUT`, `DELETE` son rechazadas con HTTP `403 Forbidden` (`STAGING_READ_ONLY`).
  - No se escriben archivos en disco ni se ejecutan mutaciones en MariaDB.

### Modo B: Pruebas Interactivas (Escritura en Base de Datos de Prueba)
- **Variables clave:**
  ```ini
  APP_ENV=staging
  STAGING_READ_ONLY=false
  STAGING_SAFE_MODE=true
  STAGING_STRICT_BOOT=true
  STAGING_DB_CONFIRMED=true
  DB_NAME=u293982346_encarmentest
  DB_USER=u293982346_staginguser
  ENABLE_CACHE_PURGE=false
  ENABLE_WP_SYNC=false
  ```
- **Comportamiento:**
  - Permite probar flujos de creación (nuevas empresas, cupones, avisos clasificados).
  - Las escrituras se dirigen exclusivamente a la base de datos `u293982346_encarmentest`.
  - Si por error humano se configurara `DB_NAME=u293982346_encarmenapp`, el arranque falla de inmediato gracias a `validateStagingDbConfiguration()`.

---

## 5. Procedimiento de Puesta en Marcha en Hostinger

1. **Creación de Base de Datos en hPanel:**
   - Crear base de datos: `u293982346_encarmentest`.
   - Crear usuario: `u293982346_staginguser`.
   - Asignar permisos al usuario sobre dicha base de datos.
   - Si se usará el Modo Solo Lectura estricto en la BD, asignar únicamente permisos `SELECT`.

2. **Copia de Estructura Inicial (Opcional):**
   - Exportar esquema sin datos o con datos anonimizados desde producción hacia `u293982346_encarmentest`.
   - O permitir `STAGING_ALLOW_SCHEMA_INIT=true` en la primera ejecución sobre `u293982346_encarmentest`.

3. **Configuración de Variables de Entorno en el Servidor Staging:**
   - Copiar `.env.staging.example` como `.env` en el directorio de la aplicación de Staging.
   - Completar `DB_PASSWORD` correspondiente al usuario de staging.

4. **Arranque y Verificación de Salud:**
   - Iniciar el proceso Node.js (ej. `pm2 start server.ts --name encarmen-staging` o vía control de Node de Hostinger).
   - Comprobar endpoints de diagnóstico:
     ```bash
     curl -s https://staging.encarmen.org/api/health | jq .
     curl -s https://staging.encarmen.org/api/database-status | jq .
     ```
   - Confirmar en la salida JSON que:
     - `environment === "staging"`
     - `stagingIsolation.isStaging === true`
     - `stagingIsolation.isProductionDb === false`
     - `stagingIsolation.isolationValid === true`

---

## 6. Procedimiento de Rollback y Desconexión Inmediata

En caso de cualquier comportamiento inesperado en el entorno de Staging:

1. **Desconexión rápida:**
   - Establecer `STAGING_READ_ONLY=true` en el `.env` de Staging.
   - Reiniciar el proceso de Staging (`pm2 restart encarmen-staging`).
2. **Apagado de emergencia:**
   - Si se requiere detener Staging por completo:
     ```bash
     pm2 stop encarmen-staging
     ```
3. Ninguna de estas operaciones afecta el entorno de producción, dado que este corre bajo un proceso independiente, puerto separado y credenciales aisladas.
