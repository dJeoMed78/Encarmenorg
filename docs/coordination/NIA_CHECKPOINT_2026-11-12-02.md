# ENCARMEN — CHECKPOINT DE COORDINACIÓN NIA
## 2026-11-12 — Conversación 02

**Coordinación:** Nia, Jefa 3 — Coordinación Principal 01
**Propietario:** Jeo
**Repositorio:** dJeoMed78/Encarmenorg
**Rama:** coord/encarmen-work-control-001
**Memoria narrativa:** [NIA-2026-11-12-02.md](https://docs.google.com/document/d/1k4a-KgQx8OgVBaiQxaX9xbhHqoNAljccQN6GBArxb_k/edit)
**Drive ID:** 1k4a-KgQx8OgVBaiQxaX9xbhHqoNAljccQN6GBArxb_k
**Memoria anterior:** [NIA-2026-11-12.md](https://docs.google.com/document/d/1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4/edit), Drive ID 1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4.

## 1. Estado técnico verificado al iniciar esta conversación

HEAD antes de publicar este checkpoint:
- main: 65cc5f85389639d72f5101c8bc20eb488a247beb.
- ia-desarrollo: 830602beb0a0b59f009458c5bce8f0a22f46e46a.
- coord: 2662b20c9a1484e1b829fcc0bb760308ef584d7a.

Staging:
- /api/health respondió status=ok, environment=staging, readOnly=true, writesPermitted=false.
- Reportó 211 empresas, 13 eventos, 11 clasificados.
- Extracción de la página principal devolvió “Iniciando directorio...”; no se certifica interfaz completa.
- El release marker HTTP expone SHA 830602beb0a0b59f009458c5bce8f0a22f46e46a y updatedAt 2026-11-09T16:09:45.073Z. Esto identifica el marcador del release, no el hash del bundle cargado por el proceso Node.
Producción:
- encarmen.org respondió y presentó el directorio con 208 empresas.
- Canonical observado https://encarmen.org; robots index/follow.
- No se modificó producción.

## 2. Estado de trabajo

- Issue #41 sigue OPEN: falta E2E administrativo real, selección explícita, conciliación de lotes y persistencia.
- Issue #85 sigue OPEN: falta validación autenticada de Search Console y status HTTP explícito de redirecciones.
- PR #90 está abierta y sus workflows CI asociados concluyeron SUCCESS; falta revisión independiente.
- PR #88 sigue abierta según GitHub aunque su corrección soft-404 ya está en main; el runtime público devolvió HTTP 404 para /empresa/empresa-3235. Resolver estado administrativo sin reintroducir cambios.
- PR #68 sigue draft; CI radar-classifieds falla en la suite de pruebas y las ramas divergen.
- PR #55/#56 no son aptas para reusar directamente: presentan divergencia/atraso frente a ia-desarrollo.
- P1/P2 vigentes: ENC-BUILD-SERVER-ARTIFACT-20261109-001, ENC-SEC-SSRF-IMG-20261109-001, Issue #41, ENC-INT-007, ENC-API-FAIL-CLOSED-20261109-001 y ENC-HTTP-PERIMETER-20261109-001.

## 3. Nueva directriz del propietario — 2026-11-12

El propietario exige una ejecución más proactiva: las tareas delegadas deben completarse de principio a fin para que Nia realice una sola revisión final independiente y continúe con la integración/publicación autorizada.

- Delegar con alcance completo, criterios de aceptación, pruebas y evidencia final; no fraccionar en diagnósticos y pruebas repetitivas.
- El ejecutor corrige fallos dentro del alcance y repite solo pruebas afectadas.
- El ejecutor no se autoaprueba ni integra por su cuenta.
- Nia revisa el código y las pruebas una vez al final; corrige directamente defectos acotados cuando sea más rápido.
- Nia edita directamente el sitio/panel cuando exista sesión autenticada y sea más práctico, con autorización, entorno verificado, reversión proporcional y trazabilidad GitHub.
- Después de revisión, Nia continúa integración/publicación en el entorno autorizado sin pedir confirmaciones repetitivas.
- Producción (main/encarmen.org) sigue requiriendo autorización expresa.

La regla quedó añadida a `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md` en esta rama.

## 4. Capacidad directa comprobada en esta conversación

- GitHub permite editar archivos en la rama de coordinación.
- El navegador conectado devolvió NOT_FOUND al listar pestañas.
- TinyFish Default no reportó sitios autenticados.
- No quedó verificada sesión autenticada de Hostinger ni edición directa del panel. No afirmar edición directa no realizada.
- La vía GitHub/Actions sigue siendo utilizable cuando el workflow y la autorización aplicables estén disponibles.

## 5. Siguiente acción

Aplicar desde ahora el protocolo de delegación end-to-end. Priorizar un P1 y asignarlo solo después de confirmar que el ejecutor está disponible; si la solución es más rápida y segura directamente por Nia, implementarla en rama aislada. La siguiente entrega debe ser completa y lista para una revisión final, no otro diagnóstico parcial.

## 6. Seguridad y límites

- No modificar main ni producción sin autorización expresa.
- No ejecutar operaciones mutantes/destructivas sin aislamiento, respaldo y reversión proporcionales.
- No integrar automáticamente trabajo de ejecutores.
- No exponer secretos ni datos personales.
- Distinguir implementado, probado, integrado, desplegado, verificado en runtime y aceptado.

**Estado:** memoria narrativa Drive creada y leída de vuelta; checkpoint GitHub creado en rama de coordinación. Falta lectura posterior de GitHub y actualización/verificación del índice de doble publicación.


## 7. Actualización posterior — Auditoría SSH de runtime (2026-11-12)

La limitación de acceso reportada inicialmente quedó superada mediante un workflow temporal de solo lectura que utilizó la conexión SSH de Staging ya configurada en GitHub Actions. Esta evidencia posterior reemplaza la nota inicial de que no se había verificado acceso SSH.

- Workflow de auditoría en rama aislada: `audit/staging-runtime-readonly-20261112`.
- Commit del workflow: `8056b2612e07dd3b310fd18d0cc88f0555ebd8f9`.
- Run exitoso: [43277110058](https://github.com/dJeoMed78/Encarmenorg/actions/runs/43277110058).
- PID de Staging: `3067741`; ejecutable Node 22: `/opt/alt/alt-nodejs22/root/usr/bin/node`.
- CWD del PID: `/home/u293982346/domains/staging.encarmen.org/hbuilds/versions/enc-coord-830602beb0a0/nodejs`, idéntico a la ruta física de `current/nodejs`.
- Inicio del PID: `2026-11-12 16:49:44 UTC`; coincide al segundo con el inicio calculado desde `/api/health` (`uptime=4912` a `18:11:36.227Z`).
- Symlink actual: `versions/enc-coord-830602beb0a0`; release marker SHA: `830602beb0a0b59f009458c5bce8f0a22f46e46a`.
- SHA-256 `server.js` = SHA-256 `api/server.bundle.js` = `d799d5ea77abc6a88b767cf9aabcdc798e1322630ccc7808251b7bccc9180c05`.
- `dist/encarmen-release.json`: `963e835186dcfff5f3873f20dd3498f6d028eb3a6601b888e18d94bec6af2156`.
- `package-lock.json`: `2e46802e4cd9aef96f9463b9ccaac8654995099928d9f244b20dc70cf792c813`.
- `tmp/restart.txt` conserva mtime `2026-11-09 16:12:45.782 UTC`, coincidente con el cambio de symlink.
- Los demás procesos `lsnode` listados pertenecen al path físico de `encarmen.org`; el PID `3067741` es el proceso ubicado en Staging.

**Conclusión:** CONFIRMADO. El proceso Node/LiteSpeed de Staging se ejecuta desde la release activa del commit `830602beb0a0...`. El argumento server.js no aparece en el cmdline de LiteSpeed, pero Hostinger reportó `server.js` como entrypoint configurado, `package.json` declara `node server.js`, y el CWD del proceso coincide con la carpeta física de esa release. Auditoría sin cambios, reinicios ni despliegues.

**Estado de tarea:** `ENC-BUILD-SERVER-ARTIFACT-20261109-001` queda cerrada técnicamente para Staging. No se extrapola esta conclusión a Producción.

## 8. Siguiente prioridad

Retirar la duda de identidad del runtime Staging de la lista P1. Siguiente acción recomendada: completar la remediación SSRF de `/api/img?url=` en rama aislada, con validación de destinos, redirects, IP privadas y límites de respuesta; ejecutar pruebas dirigidas, revisión final y preparar integración en `ia-desarrollo`. No modificar Producción.
