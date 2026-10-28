# Protocolo de Aislamiento de Desarrollo — Google AI Studio (Trabajador 04)

**Identificador de Tarea:** `ENC-GOOGLE-DEV-ISOLATION-001-R2`  
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
| `work/<ID>` | **Rama de trabajo aislada y autorizada** (exclusivamente `work/ENC-GOOGLE-DEV-ISOLATION-001`). |  **ÚNICO DESTINO AUTORIZADO**. Debe coincidir exactamente con la tarea aprobada por Coordinación. |

---

## 2. Aislamiento de Producción y Hostinger

### 2.1 Auditoría de GitHub Actions y Mecanismos de Despliegue
- **Flujos de trabajo auditados en el repositorio:**  
  Se consultó la API de GitHub (`/actions/workflows`) y el directorio `.github/workflows/`, identificándose un único archivo activo: `.github/workflows/main_carmen.yml` (`Node.js CI Build (Hostinger Production)`).
- **Condiciones de activación:**  
  Dicho flujo únicamente se ejecuta ante eventos `push` sobre la rama `main` (`branches: ['main']`) o por disparo manual (`workflow_dispatch`).  
- **Comprobación verificada:** Las ramas `work/*` e `ia-desarrollo` no disparan `.github/workflows/main_carmen.yml`. No existen otros flujos de CI/CD en este repositorio.

### 2.2 Auditoría de Conexiones y Webhooks
- **Comprobación verificada:** La consulta a `GET /repos/dJeoMed78/Encarmenorg/hooks` devolvió `[]` (cero webhooks registrados en GitHub).
- El despliegue de Hostinger en producción depende exclusivamente de la rama `main`.

### 2.3 Estado de la Base de Datos (MariaDB / Hostinger)
- **Advertencia Crítica:** Staging y Desarrollo **NO cuentan con una base de datos aislada** comprobada. Las variables de entorno en `.env` apuntan a la base de datos de producción (`srv1356.hstgr.io`).
- **Prohibición Estricta:**
  - Queda estrictamente prohibido ejecutar sentencias DDL destructivas (`DROP TABLE`, `TRUNCATE`, `ALTER` destructivo) o escrituras de prueba no autorizadas sobre MariaDB.
  - El desarrollo debe limitarse a lecturas seguras o emulaciones locales en memoria/JSON.

### 2.4 Invalidación de Caché (Cloudflare / LiteSpeed)
- En `scripts/update_version.cjs`, se suprimió la emisión de llamadas `PURGE` automáticas hacia `encarmen.org` durante compilaciones de desarrollo/staging.

---

## 3. Comportamiento y Reglas de `scripts/github_push.mjs`

El script `scripts/github_push.mjs` implementa los siguientes controles estrictos:

1. **Sin excepciones ni bypass:**  
   No existe ninguna variable de entorno que permita eludir las protecciones. Si se detecta la presencia de `ALLOW_PROTECTED_PUSH` en el entorno, la ejecución aborta inmediatamente con `SecurityValidationError`.
2. **Validación positiva y destino explícito:**  
   La rama destino debe suministrarse obligatoriamente como primer argumento CLI (ej. `node scripts/github_push.mjs work/ENC-GOOGLE-DEV-ISOLATION-001 "mensaje"`). No existen ramas por defecto ni selección implícita.
3. **Restricción a la tarea autorizada:**  
   Cualquier destino que no sea idéntico a `work/ENC-GOOGLE-DEV-ISOLATION-001` (incluyendo `main`, `ia-desarrollo`, `google-ai-studio-limpieza` u otras ramas `work/*`) es rechazado con error de validación antes de realizar cualquier llamada de red.
   *Nota importante:* El script está bloqueado intencionalmente para esta tarea específica; **no es un mecanismo general de publicación para otras tareas** sin previa autorización y ajuste por Coordinación.
4. **Manejo diferenciado de códigos de estado HTTP:**  
   Solo el código HTTP 404 (Not Found) se interpreta como ausencia de la rama en el remoto. Errores HTTP 401 (no autorizado), 403 (permisos/límite de tasa), 429 (límite de peticiones), 500 (error del servidor) o fallas de red detienen la operación inmediatamente sin asumir un estado remoto inexistente.
5. **Inspección de alcance de archivos estricta (sin retorno silencioso):**  
   - La función `getLocalModifiedFiles()` inspecciona:
     a) Cambios en working tree no committeados (`git diff --name-only HEAD`).
     b) Cambios preparados en el índice (`git diff --cached --name-only`).
     c) Archivos no rastreados (`git ls-files --others`).
     d) Cambios incorporados en commits locales anteriores respecto a `origin/ia-desarrollo`.
   - **Criterio estricto:** Cualquier error en la ejecución de comandos Git aborta inmediatamente la publicación; nunca devuelve listas vacías ni asume éxito ante fallos.
   - Si se detecta cualquier archivo fuera de la lista autorizada (`scripts/github_push.mjs` y `docs/DEV_WORKFLOW_ISOLATION.md`), la publicación es rechazada de inmediato.
6. **Validación contra versiones locales obsoletas:**  
   Mediante `verifyNotBehind(baseCommitSha)`, el script comprueba que el commit remoto base sea ancestro de la copia local (`git merge-base --is-ancestor`). Si la copia local está desactualizada respecto al remoto, aborta la operación para impedir sobreescrituras con código obsoleto.
7. **Control de concurrencia y limitaciones técnicas:**  
   - **Nivel 1 (Pre-verificación):** Antes de enviar el `PATCH`, se re-consulta el SHA remoto de la rama. Si cambió respecto a la lectura inicial, aborta con `ConcurrencyError`.
   - **Nivel 2 (Fast-forward garantizado):** La llamada `PATCH` utiliza obligatoriamente `force: false`. Si la rama remota divergió, GitHub rechaza la solicitud con HTTP 422 ("Update is not a fast forward").
   - **Limitación técnica documentada:** La API REST de GitHub Database (`/git/refs`) no proporciona encabezados de condición atómica (Compare-And-Swap / ETag / If-Match). Por tanto, aunque el doble nivel previene sobreescrituras no fast-forward y detecta desfases concurrentes, no es posible afirmar una atomicidad matemática absoluta en el transporte HTTP REST.

---

## 4. Procedimiento de Ejecución y Comandos Reales Disponibles

### Auditoría de `package.json`
- Se auditó el archivo `package.json` en la raíz del proyecto.
- **Resultado confirmado:** El script `"push:github"` **NO existe** en `package.json`. No está permitida la modificación de `package.json` sin autorización de Coordinación.
- Por tanto, **NO debe invocarse `npm run push:github`**.

### Comandos Reales y Disponibles
Para publicar dentro de la rama autorizada:

```bash
# Invocación directa mediante Node.js:
node scripts/github_push.mjs work/ENC-GOOGLE-DEV-ISOLATION-001 "feat(isolation): descripción del cambio"

# O publicación estándar mediante Git CLI (autenticado):
git push origin work/ENC-GOOGLE-DEV-ISOLATION-001
```

Cualquier invocación sin argumentos o hacia otra rama resultará en la terminación inmediata del proceso.
