# Protocolo de Aislamiento de Desarrollo — Google AI Studio (Trabajador 04)

**Identificador de Tarea:** `ENC-GOOGLE-DEV-ISOLATION-001`  
**Repositorio Oficial:** `dJeoMed78/Encarmenorg`  
**Coordinación Principal:** ChatGPT — 01  
**Ejecutor:** Google AI Studio — 04  

---

## 1. Topología de Ramas y Reglas de Protección

| Rama | Propósito | Regla de Acceso para Google AI Studio |
| :--- | :--- | :--- |
| `main` | **Producción activa** en Hostinger (`encarmen.org` / `empresasencarmen.com`). | ⛔ **PROHIBIDO MODIFICAR O HACER PUSH DIRECTO**. |
| `ia-desarrollo` | **Integración y Staging** administrada exclusivamente por Coordinación (ChatGPT 01). | ⛔ **PROHIBIDO MODIFICAR DIRECTAMENTE**. Se usa exclusivamente como base (HEAD) para bifurcar. |
| `google-ai-studio-limpieza` | **Rama histórica de auditoría**. | 🔒 **Solo lectura**. No utilizar para desarrollo activo. |
| `work/<ID>` | **Ramas de trabajo aisladas** por tarea autorizada (ej. `work/ENC-GOOGLE-DEV-ISOLATION-001`). |  **PERMITIDO**. Todas las tareas deben nacer y publicarse en su propia rama `work/<ID>`. |

---

## 2. Aislamiento de Producción y Hostinger

### 2.1 GitHub Actions y Despliegue Automático
- Archivo de flujo de trabajo: `.github/workflows/main_carmen.yml`.
- **Condición de activación:** Únicamente eventos de tipo `push` en la rama `main` (`branches: ['main']`) o `workflow_dispatch`.
- Las ramas `work/*` e `ia-desarrollo` **no activan** ninguna acción de GitHub ni despliegue de Hostinger.

### 2.2 Conexiones y Webhooks
- La API de GitHub confirma `Hooks: []` (sin webhooks de terceros o automáticos en ramas secundarias).
- El despliegue a producción de Hostinger depende del seguimiento de `main`.

### 2.3 Base de Datos (MariaDB / Hostinger)
- Configuración en `.env`: `DB_HOST=srv1356.hstgr.io`.
- **Directriz Crítica:** Staging y Entornos de Prueba no cuentan con un clúster MariaDB aislado. Por ende:
  - Queda estrictamente prohibido ejecutar comandos destructivos (`DROP TABLE`, `TRUNCATE`, `DELETE` masivos o `ALTER` que rompan compatibilidad).
  - Los scripts de prueba y validación deben usar datos locales en memoria o JSON cuando corresponda.

### 2.4 Invalidación de Caché (Cloudflare / LiteSpeed)
- En `scripts/update_version.cjs`, se suprimió la emisión de llamadas `PURGE` automáticas a `encarmen.org` y `empresasencarmen.com` en pre-compilación para evitar afección sobre el tráfico productivo.

---

## 3. Procedimiento Operativo para Google AI Studio

1. **Creación de Rama de Trabajo:**
   Partir siempre del commit más reciente de `ia-desarrollo`:
   ```bash
   git fetch origin ia-desarrollo
   git checkout -b work/<ID_DE_TAREA> origin/ia-desarrollo
   ```

2. **Desarrollo y Pruebas Locales:**
   - Validar compilación con `npm run build` o `compile_applet`.
   - Verificar tipo con `npm run lint`.
   - Probar en el servidor de desarrollo local (puerto 3000).

3. **Publicación Segura:**
   - Mediante Git CLI:
     ```bash
     git push -u origin work/<ID_DE_TAREA>
     ```
   - O mediante el script seguro de sincronización:
     ```bash
     npm run push:github -- work/<ID_DE_TAREA> "feat(<scope>): descripción clara"
     ```
   - El script rechaza automáticamente cualquier intento de push hacia `main`, `ia-desarrollo` o `google-ai-studio-limpieza`.

4. **Entrega a Coordinación:**
   - Proveer a ChatGPT 01 el nombre de la rama, el SHA base, el SHA final del commit y el enlace de GitHub para su revisión e integración a `ia-desarrollo`.
