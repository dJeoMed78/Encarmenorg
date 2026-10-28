# Protocolo de Aislamiento de Desarrollo — Google AI Studio (Trabajador 04)

**Identificador de Tarea:** `ENC-GOOGLE-DEV-ISOLATION-001-R1`  
**Repositorio Oficial:** `dJeoMed78/Encarmenorg`  
**Coordinación Principal:** ChatGPT — 01  
**Ejecutor:** Google AI Studio — 04  

---

## 1. Topología de Ramas y Política de Protección

| Rama | Propósito | Regla de Acceso para Google AI Studio |
| :--- | :--- | :--- |
| `main` | **Producción activa** en Hostinger (`encarmen.org` / `empresasencarmen.com`). | ⛔ **PROHIBIDO MODIFICAR O HACER PUSH DIRECTO**. |
| `ia-desarrollo` | **Integración y Staging** administrada exclusivamente por Coordinación (ChatGPT 01). | ⛔ **PROHIBIDO MODIFICAR DIRECTAMENTE**. Solo lectura como base (HEAD) para bifurcar. |
| `google-ai-studio-limpieza` | **Rama histórica de auditoría**. | 🔒 **Solo lectura**. Conservada sin uso como rama activa. |
| `work/<ID>` | **Rama de trabajo aislada y autorizada** (ej. `work/ENC-GOOGLE-DEV-ISOLATION-001`). |  **ÚNICO DESTINO AUTORIZADO**. Debe coincidir exactamente con la tarea aprobada por Coordinación. |

---

## 2. Aislamiento de Producción y Hostinger

### 2.1 Auditoría de GitHub Actions y Mecanismos de Despliegue
- **Flujos de trabajo auditados en el repositorio:**  
  Se consultó la API de GitHub (`/actions/workflows`) y el directorio `.github/workflows/`, identificándose un único archivo activo: `.github/workflows/main_carmen.yml` (`Node.js CI Build (Hostinger Production)`).
- **Condiciones de activación:**  
  Dicho flujo únicamente se ejecuta ante eventos `push` sobre la rama `main` (`branches: ['main']`) o por disparo manual (`workflow_dispatch`).  
- **Comprobación verificada:** Las ramas `work/*` e `ia-desarrollo` no disparan `.github/workflows/main_carmen.yml`. No se identificaron flujos de CI/CD que escuchen eventos `push` en ramas de trabajo en este repositorio.

### 2.2 Auditoría de Conexiones y Webhooks
- **Comprobación verificada:** La consulta a `GET /repos/dJeoMed78/Encarmenorg/hooks` devolvió `[]` (cero webhooks registrados en GitHub).
- El mecanismo de despliegue a producción de Hostinger depende del seguimiento de la rama `main`.

### 2.3 Estado de la Base de Datos (MariaDB / Hostinger)
- **Advertencia Crítica:** Staging y Desarrollo **NO cuentan con una base de datos aislada** comprobada. La configuración predeterminada en `.env.example` y variables de entorno apunta a la base de datos de producción (`srv1356.hstgr.io`).
- **Prohibición Estricta:**
  - Queda estrictamente prohibido ejecutar sentencias DDL destructivas (`DROP TABLE`, `TRUNCATE`, `ALTER` destructivo) o escrituras de prueba no autorizadas sobre MariaDB.
  - Las validaciones locales deben limitarse a mocks en memoria o archivos JSON locales.

### 2.4 Invalidación de Caché (Cloudflare / LiteSpeed)
- En `scripts/update_version.cjs`, se confirmó la ausencia de emisión de llamadas `PURGE` automáticas hacia `encarmen.org` durante compilaciones de desarrollo/staging.

---

## 3. Comportamiento y Reglas de `scripts/github_push.mjs`

El script `scripts/github_push.mjs` ha sido refactorizado con las siguientes garantías:

1. **Sin excepciones ni bypass:**  
   No existe ninguna variable de entorno (como `ALLOW_PROTECTED_PUSH`) que permita eludir las protecciones. Si dicha variable está presente en el entorno, la ejecución aborta inmediatamente por motivos de seguridad.
2. **Validación positiva y destino explícito:**  
   La rama destino debe suministrarse obligatoriamente como primer argumento CLI (ej. `node scripts/github_push.mjs work/ENC-GOOGLE-DEV-ISOLATION-001 "mensaje"`). No existen ramas por defecto ni selección implícita.
3. **Restricción a la tarea autorizada:**  
   Cualquier destino que no sea idéntico a `work/ENC-GOOGLE-DEV-ISOLATION-001` (incluyendo `main`, `ia-desarrollo`, `google-ai-studio-limpieza` u otras ramas `work/*`) es rechazado con error de validación antes de realizar cualquier llamada de red.
4. **Manejo diferenciado de códigos de estado HTTP:**  
   Solo el código HTTP 404 (Not Found) se interpreta como ausencia de la rama en el remoto (para crearla a partir del HEAD de `ia-desarrollo`). Errores HTTP 401 (no autorizado), 403 (permisos/límite de tasa), 429 (límite de peticiones), 500 (error del servidor de GitHub) o fallas de red detienen la operación inmediatamente sin asumir un estado remoto inexistente.
5. **Alcance estricto de archivos:**  
   El script verifica localmente que únicamente los archivos autorizados para esta tarea (`scripts/github_push.mjs` y `docs/DEV_WORKFLOW_ISOLATION.md`) sean modificados. Si se detecta cualquier otro archivo fuera de alcance, la publicación se rechaza de inmediato.
6. **Control de concurrencia y prevención de sobreescritura:**  
   Antes de actualizar la referencia remota (`PATCH /git/refs/heads/...`), el script re-consulta el SHA remoto actual. Si difiere del `baseCommitSha` capturado al inicio, aborta con `ConcurrencyError` para impedir sobreescritura accidental o actualizaciones basadas en referencias obsoletas. Además, el parámetro `force` está permanentemente configurado en `false`.

---

## 4. Procedimiento de Ejecución

Para publicar dentro de la rama autorizada:

```bash
# Mediante invocación directa
node scripts/github_push.mjs work/ENC-GOOGLE-DEV-ISOLATION-001 "feat(isolation): mensaje descriptivo"

# O mediante npm run (pasando explícitamente los argumentos tras '--')
npm run push:github -- work/ENC-GOOGLE-DEV-ISOLATION-001 "feat(isolation): mensaje descriptivo"
```

Cualquier invocación sin argumentos o hacia otra rama resultará en la terminación inmediata del proceso.
