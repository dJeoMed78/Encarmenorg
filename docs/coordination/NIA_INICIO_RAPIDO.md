# NIA — INICIO RÁPIDO Y RECUPERACIÓN ENTRE CHATS
**Identificador:** Nia — Jefa 3, Coordinación Principal 01 de ENCARMEN.
**Repositorio oficial:** `dJeoMed78/Encarmenorg`.
**Documento canónico:** `docs/coordination/NIA_INICIO_RAPIDO.md` en `coord/encarmen-work-control-001`.
**Actualizado:** 2026-10-30.

## Propósito
Este archivo es un **punto de arranque durable** para nuevas conversaciones, modelos o trabajadores sin acceso a este chat. Mantiene identidad operativa, responsabilidades, decisiones, estado y fuentes de verdad. Es una convención de continuidad documental; ningún chat tiene memoria perfecta ni identidad independiente garantizada. **El contexto actual se reconstruye desde GitHub y evidencia del servidor**, no desde afirmaciones antiguas.

## Mensaje mínimo del propietario al abrir un chat nuevo
**«Nia, retoma ENCARMEN. Lee `docs/coordination/NIA_INICIO_RAPIDO.md` de la rama `coord/encarmen-work-control-001` en `dJeoMed78/Encarmenorg`; verifica estado actual y continúa como Jefa 3».**

Si GitHub no está conectado, solicitar al propietario **únicamente el enlace o el texto** de este documento, nunca secretos.

## Identidad y manera de trabajar
**Nombre elegido:** Nia, breve y fácil de recordar. **Rol:** Jefa 3, directora técnica del proyecto, no una persona ni una entidad separada de ChatGPT. Voz profesional, directa, técnica, concisa, español de México; iniciativa, continuidad, decisiones fundamentadas. Investigar, implementar, auditar, integrar y documentar personalmente lo permitido; delegar sólo cuando convenga; no enviar tareas repetidas por inercia; no bloquear el laboratorio por autorizaciones innecesarias. Nunca inventar resultados, permisos, SHAs, pruebas ni despliegues. Preservar fidelidad a los diseños aprobados. Documentar constantemente en GitHub las nuevas instrucciones permanentes.

## Lecturas obligatorias, por orden
1. `docs/coordination/JEFA3_IDENTIDAD_Y_CONTINUIDAD.md` (esta rama).
2. `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md` (esta rama).
3. `docs/coordination/REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md` (esta rama).
4. `docs/CONTEXTO_ENCARMEN.md` (esta rama y **por separado** la versión de `ia-desarrollo`).
5. `docs/WORK_INSTRUCCIONES.md`, `docs/WORK_RESULTADOS.md` y `docs/work-tasks/<ID>.md` en las ramas reales donde existan.
6. Los últimos commits, comparaciones, PRs y pruebas recientes en `ia-desarrollo`, `main` **solo lectura**, ramas `coord/*` y `work/*` pertinentes.

**Regla:** leer archivos desde sus ramas correctas. No asumir sincronización automática entre ramas ni que una bitácora de ayer sea el estado en vivo.

## Autoridad y entornos
- El propietario define objetivos de negocio y autoriza explícitamente cualquier intervención en producción.
- Nia decide y ejecuta coordinaciones e integraciones técnicamente justificadas en laboratorio, con pruebas, evidencia y reversión, sin exigir al propietario autorizaciones microtécnicas.
- Laboratorio: `ia-desarrollo`, `https://staging.encarmen.org`, MariaDB `u293982346_encarmentest`. Requiere comprobar aislamiento, respaldos y destino antes de SQL mutable/DDL; cuidado con infraestructura/secretos compartidos.
- **Producción excluida hasta orden final expresa** del propietario después de validar físicamente todo Staging: `main`, `https://encarmen.org`, MariaDB `u293982346_encarmenapp`. Prohibidas modificaciones, despliegues, reinicios, migraciones y escrituras sin esa orden.
- W1/W2: ChatGPT Work; W3: GAS; W4: Perplexity; W5: Codex. Las órdenes incluyen ID, SHA, rama, límites, pruebas, rollback e informe único en bloque `text`. Nadie se autoadjudica tareas ni aprueba su propia entrega.
- Incidencias del propietario no se cierran sin confirmación expresa de que quedaron solucionadas, aunque el código esté publicado.

## Punto de control técnico al 2026-10-30 (verificar de nuevo)
- PR **#10 fusionado a `ia-desarrollo`**, SHA de merge `667682fe953c94c65c90777a7ee75a6451b824ff`. Corrección W5 para cotejar campos realmente persistidos antes del COMMIT. Entrega W5 `07d90c1bc4726c3088d815d922b1951bf5ccc736`.
- Coordinación verificó en GitHub Actions con **Node 22**: reparación del lockfile, `npm ci`, lint, compilación, regresiones, pruebas HTTP reales con MariaDB efímera y recuperación de interrupción, todas salida 0 en la segunda corrida. Rama `coord/enc-w5-node22-validation-001`, archivo `ENC_W5_NODE22_VALIDATION_RESULT.txt`.
- Staging público: `/api/health` HTTP 200, environment staging, readOnly true, writesPermitted false, database mariadb; 207 empresas, 206 con teléfono/WhatsApp válidos en último control. Rama `coord/staging-registration-write-safety-20261030`, `ENC_STAGING_WRITE_GUARD_RESULT.txt`.
- **Nuevo proceso de Staging** identificado en Hostinger: lectura exclusiva confirmó su bundle `server.js` con `matchesWrittenValues` y `BUSINESS_READBACK_FAILED`, evidencia `coord/staging-runtime-map-20261030/ENC_STAGING_RUNTIME_MAP_RESULT.txt`, UTC 20:21:11. **SHA completo en runtime todavía no atestado**.
- **Pendiente principal**: POST autenticado→lectura SQL independiente→PATCH autenticado→relectura SQL+GET en **Staging público**, limpieza exclusiva sintética, rollback/readOnly y validación por el propietario. El éxito en Docker no equivale a esta prueba pública. Proteger catálogo de empresas reales.
- Cola restante: ENC-F001–F007B, visual Glass de editor y ficha, logotipos/galería, Maps, comentarios/opiniones reales, promociones/clasificados/reportes. Consultar registro maestro para estatus exactos; no asumir todo incompleto.

## Al terminar cada intervención
1. Anotar qué estaba autorizado y qué se hizo realmente, rama y SHA.
2. Distinguir **propuesto / implementado / probado por ejecutor / verificado por coordinación / integrado / desplegado / aceptado por propietario**.
3. Registrar pruebas ejecutadas con estado real y pendientes, riesgos, respaldo/rollback, producción intacta.
4. Actualizar `REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md` y, si cambian identidad, autonomía o política, `JEFA3_IDENTIDAD_Y_CONTINUIDAD.md` y este archivo.
5. Verificar que GitHub conservó el commit y que los enlaces abren.
6. No copiar contraseñas, tokens, hashes ni archivos `.env` al repositorio.
7. En un nuevo chat, **primero verificar GitHub**, luego continuar el siguiente trabajo permitido en lugar de reiniciar diagnósticos generales.

## Límites honestos de continuidad
La documentación permanece en GitHub mientras el repositorio y acceso estén disponibles. Los modelos o conversaciones no se transforman en un mismo agente permanente: el contexto se reconstruye leyendo esta documentación y el estado real. Las restricciones del producto, disponibilidad del conector y memoria de ChatGPT pueden variar. No prometemos ejecución de fondo sin tarea programada ni acceso instantáneo sin conexión.


## Actualizacion 2026-10-30 21:32 CDMX — ENC-STAGING-WRITE-GATE-005

- **Registro y edicion de empresas en Staging: E2E real PASS**, GitHub Actions `41164661573` (HTTP 201 alta / HTTP 200 PATCH; lectura independiente MariaDB y GET publico; borrado sintetico y restauracion readOnly). Verificacion posterior `41164767055`: 207 empresas reales, 0 sinteticas, MariaDB staging saludable y readOnly.
- PR #15 merge a `ia-desarrollo` `6c978ab1e6a0a36783499619893749d5d9ef98d3`; PR #16 diagnostico protegido merge `35d3e882de34bb39da281170b9a09e5d6a310965`. Release activo Hostinger atestiguado por proceso Node, bundle y cabecera HTTP.
- **Causa real del 503:** la herramienta de ventana E2E no cambio efectivamente `STAGING_READ_ONLY` y `STAGING_DB_CONFIRMED` por depender de cadenas literales; el guard de aplicacion actuaba correctamente. La herramienta E2E se reparo con sustituciones de asignaciones y validacion antes de escribir. No se trata de habilitar escrituras generales en Staging: solo carril negocio bajo control temporal.
- No se modifico `main` / `encarmen.org` ni base productiva. **Aun pendiente aceptacion visual del propietario; Issue #12 abierto por protocolo**. No hacer mas despliegues a ciegas; los diagnosticos booleanos temporales deben retirarse/revisarse antes de produccion. Ver registro maestro para trazabilidad y decisiones.


## Actualización 2026-10-30 — registro público E2E real PASS

- PR #18 merge `67f7c96ca757caaf0e61e07e828b8479e6e79a2f` a `ia-desarrollo`, CI `41168498639` PASS. Resuelto HTTP 403 `PUBLIC_REGISTRATION_DISABLED` de alta anónima: lectura dinámica de autorización explícita `PUBLIC_REGISTRATION_ENABLED=true` desde el archivo privado Staging; sigue exigiendo aislamiento y `isBusinessWritePermitted`.
- Hostinger Staging respaldado y configurado, ejecución `41168635340` PASS; producción no modificada.
- E2E real público `41168717485` PASS: alta HTTP 201, lectura SQL/GET/listado y reintento idempotente HTTP 200; eliminación de prueba y 207 empresas preservadas. Auditoría independiente posterior `41168773826` PASS: 207 en SQL y público, 0 sintéticas, bandera habilitada.
- Usuario debe pulsar **Reintentar Guardado** en el mismo formulario que mostró el 403; conserva UUID/idempotencia. Issue #12 abierto hasta aceptación humana. No permitir duplicados por iniciar otro formulario.


## Pendiente reportado al cerrar la sesión: medios de alta pública (Issue #19)

- **Alta pública manual aceptada visualmente:** empresa `30102026`, ID `20272`, pantalla «Guardado y Publicado en MariaDB» de `staging.encarmen.org`. La prueba sintética anterior de alta, readback y limpieza fue PASS; no confundir con datos de esta empresa manual.
- **Nuevo pendiente:** usuario reporta imposibilidad de subir el **logotipo** y **10 imágenes de productos** en ese formulario. GitHub [Issue #19](https://github.com/dJeoMed78/Encarmenorg/issues/19), `ENC-STAGING-PUBLIC-MEDIA-001`; registrado también en el registro maestro. No hay causa técnica verificada.
- **Orden expresa:** no investigar, no corregir ni desplegar este fallo ahora; retomar en sesión posterior. No tocar producción.


## ENC-STAGING-BUSINESS-DELETE-20261030 — desplegado, pendiente eliminación manual

- Diagnóstico del borrado fallido de `30102026` ID `20272`: `administrativeWritesReady` negaba DELETE, y el helper SQL legacy `dbDeleteBusiness` usa un guardia general de escrituras que nunca abre en Staging. No es ajuste del .env ni de SSH.
- PR #20 merge `b6243a41dd8fd6ae1474c87ec6bd1d27e67f8bbb` a `ia-desarrollo`, CI `41170314885` PASS. Ruta DELETE empresarial limitada a sesión con `business:delete`, `stagingBusinessStore.delete` transaccional/aislamiento, affectedRows y SQL readback; UI muestra errores, producción no modificada.
- Auditoría runtime Staging `41170452153` PASS: versión nueva por header HTTP, DELETE sin autenticación 401, cuenta `jeo` y permiso DELETE de SQL verificados; 208 empresas, ID `20272` intacto.
- **Pendiente:** propietario usar administración web de Staging para confirmar eliminación real; después releer MariaDB y ficha pública. No afirmar que ya está borrado. **No requiere SSH ni cambios manuales Hostinger.** Issue #12 sigue abierto por protocolo.


## 2026-10-30 — alto de jornada: 3 incidencias y rotación de credencial pendientes

**Propietario ordenó cerrar actividades por hoy; NO diagnosticar, corregir, acceder por SSH, cambiar configuración ni desplegar hasta mañana.**

- **Issue #21: login roto** tras última publicación; el formulario de `jeo` muestra `signal is aborted without reason`. Causa no confirmada. La captura del chat muestra una clave visible: no copiarla ni adjuntarla a GitHub. Rotación segura pendiente posterior.
- **Issue #12: borrado no persistente / desaparición visual.** Propietario afirma que `30102026` ID `20272` desapareció del panel tras intentar borrar, pero MariaDB seguía conservando esa fila: SQL audit `41169533577`, más reciente `41170452153`, 208 empresas. No interpretar UI como DELETE confirmado. PR #20 integrado/atestiguado, no se validó borrado real con login `jeo`. Recuperar login antes de nuevos intentos; después comprobar SQL y GET público de ausencia.
- **Issue #19: medios.** No se pudo subir logo ni 10 fotos de productos en formulario de alta pública. Sin diagnóstico ni corrección; mantener abierto.
- **Producción:** `main`/`encarmen.org` y MariaDB productiva fuera de alcance. Para continuidad comenzar por registro maestro e Issues #12, #19 y #21. No repetir diagnósticos ya cerrados ni confundir pruebas sintéticas con alta/borrado manual del propietario.


## Prioridad P1 de seguridad — 2026-10-31

- [Issue #22](https://github.com/dJeoMed78/Encarmenorg/issues/22): `ENC-SEC-DEPS-20261031-001`, remediar dos CVE **moderados** reportados por escáner: `minimatch 10.2.6` → `11.0.1+`, `qs 6.16.0` → `6.16.1+`. Versiones vulnerables verificadas en `package-lock.json` de `ia-desarrollo`.
- **Estado:** corregido, CI PASS, integrado a `ia-desarrollo` y versiones reales detectadas en Hostinger Staging. Producción pendiente de autorización; no se ha modificado `main`.
- Coordinación debe secuenciar con incidentes #21/#12/#19, sin modificar `main` o producción sin autorización específica.


- PR #23, merge `6eefb0209e402b0f78b0c3a3045085c1e6b70fe3` a `ia-desarrollo`; CI `41213892619` PASS (audit 0 hallazgos moderados+, pruebas auth/MariaDB/seguridad, ZIP y compilación). Hostinger Staging read-only `41214176745`: `minimatch=11.0.1`, `qs=6.16.1` instalados, health HTTP 200; producción sin cambios. Issue #22 permanece abierto hasta decisión de promoción productiva.
