# ENCARMEN — Protocolo SSH mediante GitHub Actions
**Instrucción permanente del propietario, 2026-11-03.**
**Responsable:** Nia — Jefa 3, Coordinación Principal 01.
**Repositorio:** `dJeoMed78/Encarmenorg`.
**Diagnóstico autorizado:** `https://staging.encarmen.org`, exclusivamente.
**Integración:** `ia-desarrollo`.
**Documentación:** `coord/encarmen-work-control-001`.
**Producción protegida:** `main`, `https://encarmen.org` y su base de datos.

## Principio y recuperación
El acceso SSH previsto no exige terminal SSH propia de Nia: conector GitHub → GitHub Actions → runner autorizado → cliente SSH con secretos configurados → Hostinger Staging → logs y artefactos de Actions → análisis de Nia. **Que exista un workflow no autoriza comandos distintos de los definidos.**

En cada nueva conversación:
1. Recuperar `NIA_INICIO_RAPIDO.md`, `LA_JEFA_METODOLOGIA_PERMANENTE.md`, `REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md` y este protocolo desde esta rama.
2. Enumerar `.github/workflows/` y leer **YAML vigente** del workflow pertinente.
3. Verificar nombre, rama, trigger (`workflow_dispatch` si existe), inputs, `permissions`, nombres de secretos **sin valores**, host, comandos exactos, limitaciones, objetivo y respaldos.
4. Evitar inventar workflows, secretos, identidad del servidor o vías alternativas.
5. Confirmar que el conector soporta iniciar ese workflow. Si no lo soporta, documentar limitación; **no simular ejecución ni disparar por commits artificiales**.

## Ejecución controlada
Si hay herramienta de dispatch y la operación exacta está autorizada: comprobar Staging y rama; ejecutar únicamente el workflow con inputs definidos; recuperar run ID, URL, hora, jobs, conclusión, logs permitidos y artefactos; cotejar identidad del servidor y versión; dejar evidencia. Sin run ID y registro verificable, **no afirmar que se ejecutó SSH**. Nunca tratar CI, merge o compilación como prueba de despliegue.

## Diagnósticos permitidos previa revisión
Identidad y estado del proceso Node, versión efectivamente desplegada, conectividad, salud de endpoints, configuración no sensible, evidencia de aislamiento, logs expresamente autorizados y SQL estrictamente de lectura mediante flujo aprobado. **Antes de leer** archivos/logs comprobar que no impriman secretos ni datos personales. No registrar contraseñas, tokens, claves SSH, contenido `.env`, cookies, credenciales MariaDB ni información de usuarios.

## Sin autorización específica está prohibido
Reinicios, despliegues, migraciones, sentencias SQL mutables/DDL, editar configuración, modificar permisos, instalar dependencias de servidor, cambiar credenciales, comandos SSH arbitrarios, operaciones destructivas y cualquier cambio en `main` o producción. La capacidad técnica de ejecutar no implica autorización.

## Condiciones obligatorias antes de modificar Staging
Confirmar identidad del servidor, BD de Staging y ausencia de conexión a producción; comprobar recursos/dependencias compartidos, respaldo apto, reversión viable, alcance, autorización y registro. Nunca inferir aislamiento por un dominio o una variable. Ante fallo, identificar paso exacto (workflow, permisos, `workflow_dispatch`, secreto configurado sin revelar valor, autenticación, huella de host, conexión, comando remoto). **No desactivar protecciones** para conseguir acceso.

## Informe obligatorio
`REPOSITORIO | RAMA | WORKFLOW | RUN ID | URL | FECHA | ENTORNO | OBJETIVO | COMANDOS AUTORIZADOS | RESULTADO | ERRORES | RIESGOS | CAMBIOS REALIZADOS | ESTADO DE PRODUCCIÓN | SIGUIENTE ACCIÓN`.
Separar: no ejecutado; ejecutado con error; ejecutado correctamente; resultado verificado; cambio aplicado; cambio desplegado; validado por propietario.

## Inventario verificado 2026-11-03 (no sustituye futuras lecturas)
- Rama de coordinación: `.github/workflows/encarmen-staging-version-inspection.yml` — `workflow_dispatch`, solo lectura, SSH Staging, `permissions: contents: read`; inspección de versiones, symlink `current` y proceso.
- `encarmen-staging-inventory.yml`, `encarmen-staging-deploy-inventory.yml`, `encarmen-staging-ssh-connectivity.yml` también documentan diagnósticos `workflow_dispatch`.
- Secreto de SSH referido **por nombre** en workflows de inspección: `ENC_STAGING_SSH_PASSWORD`. Su presencia funcional y valor no fueron comprobados.
- `encarmen-staging-deploy-authorized.yml` **no expone `workflow_dispatch`**, se activa por `push` a un archivo específico y referencia un SHA antiguo fijo `7e7818166beecb9e3905aa8af83ec61f7d993737`. **No sirve como autorización de despliegue para cualquier SHA.**
- `encarmen-staging-postdeploy-readonly.yml` tiene comparaciones fijas contra aquella versión anterior; no prueba la versión reciente.
- El conector GitHub disponible en esta conversación permite leer workflows y runs, pero **no ofrece herramienta de dispatch**; no se inició SSH.
- `ia-desarrollo` tiene merge `7affd0ac66effbba001ae996889f18b3299dba30` (PR #52). GitHub Actions media regression gate de ese SHA terminó SUCCESS, pero su YAML ejecuta **CI sin deploy**.
- Despliegue Hostinger y verificación HTTP/MariaDB de 12 imágenes siguen **sin confirmarse**. No modificar producción.

## Regla de continuidad
Google Drive conserva memoria narrativa y GitHub evidencias y órdenes técnicas. Recuperar y comprobar este protocolo antes de operaciones SSH; reutilizar flujos existentes, y registrar resultados reales. **Primero verificar, después ejecutar lo autorizado y finalmente comprobar y documentar.**
