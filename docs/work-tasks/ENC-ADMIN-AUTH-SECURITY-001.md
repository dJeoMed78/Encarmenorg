# ENC-ADMIN-AUTH-SECURITY-001 — Incidencia prioritaria de acceso administrativo

**Prioridad:** P0 revisión de control de acceso. **Estado:** ABIERTA, NO CORREGIDA. **Entorno observado:** ia-desarrollo/Staging. **Rama de trabajo propuesta:** work/enc-admin-auth-security-001. No tocar main ni producción sin autorización expresa.

## Reporte del propietario
La ficha pública debe mostrar únicamente el signo de texto π (sin apariencia de botón) como acceso administrativo discreto. Al pulsarlo debe exigir usuario y contraseña, y **ninguna modificación** puede ejecutarse sin autenticación/autorización verificadas por servidor. El propietario reporta que cualquier visitante puede modificar; tratarlo como posible fallo crítico hasta reproducirlo con pruebas seguras.

## Evidencia estática confirmada por coordinación
- `src/components/BusinessPublicDetail.tsx`: pie muestra botón «Gestión del negocio» que abre un panel informativo con cuatro acciones `disabled`. Por sí mismo **no demuestra** que se pueda modificar desde esa pantalla; revisar otros accesos/rutas y APIs.
- `src/utils/adminAuth.ts`: `loginAdminUser` permite **fallback de verificación de contraseña en cliente** después de error del servidor, y almacena indicador de sesión en storage. Esto es inseguro como mecanismo de autorización y debe retirarse, pero no prueba por sí solo que el backend acepte modificaciones no autorizadas.
- `server.ts`: existe `/api/admin/login` y otros endpoints; auditar individualmente verificación real de token/sesión/rol en todas las operaciones de escritura y lectura sensibles. Un header `x-admin-auth` no debe considerarse autenticación por sí solo.

## Trabajo autorizado de auditoría segura + correcciones aisladas
1. Leer `docs/WORK_INSTRUCCIONES.md`, `docs/CONTEXTO_ENCARMEN.md`, código y rutas actuales. Inventariar operaciones crear/editar/borrar negocios, TOP/recomendado, clasificados, eventos y moderación; identificar middleware y rutas que no validen credenciales.
2. Pruebas **locales sin datos reales**: visitante sin sesión, token ausente, header falso, token inválido, sesión caducada, roles incorrectos, acceso directo URL, CSRF si cookies, errores API. Nunca probar escrituras no autorizadas contra producción ni Staging sin permiso específico.
3. Corrección inmediata segura y de bajo riesgo de **UI pública** en rama aislada: sustituir «Gestión del negocio» por símbolo π como control accesible visualmente texto sin botón decorado; mostrar autenticación real solo si existe endpoint seguro y no abrir edición por bandera de navegador. Si no hay autenticación segura, mostrar mensaje de indisponibilidad y bloquear acciones.
4. Proponer/implementar en rama aislada (sin despliegue) retirar fallback de contraseña en frontend, exigir respuesta del servidor y token/sesión verificable; backend debe denegar por defecto todos los endpoints mutables sin autorización real. **Si el diseño requiere nuevas credenciales, migración, rotación de secretos o cambio de infraestructura, documentar y detener esa parte para aprobación.** No publicar hashes, claves ni secretos en informes.
5. Evitar desactivar sin análisis endpoints públicos legítimos de calificaciones; distinguir rutas públicas, privadas y administrativas. Preservar API de ratings y lecturas del directorio.
6. Entregar plan de reversión, compatibilidad de sesiones y pruebas enfocadas de autenticación. No afirmar solución sin demostrar 401/403 y operaciones admin exitosas con sesión real en entorno local.

## Archivos permitidos
- `src/components/BusinessPublicDetail.tsx` y `src/components/BusinessPublicDetail.css` (solo control π/puerta de acceso)
- `src/utils/adminAuth.ts` (eliminar fallback inseguro y sesión local no verificada, con pruebas)
- `server.ts` (solo endurecimiento de rutas administrativas previamente identificadas, sin refactor masivo)
- `docs/WORK_RESULTADOS.md`, `docs/work-progress/ENC-ADMIN-AUTH-SECURITY-001.md`
Otros archivos, BD, migraciones, credenciales y cambios de infraestructura requieren ampliación expresa. **Si Work ya modifica BusinessPublicDetail en tarea de comentarios/logo, no editar simultáneamente: coordinar secuencia y evitar conflictos.**

## Condiciones
No merge, deploy, SQL, producción ni pruebas de escritura sobre Staging. Si un control administrativo ya está expuesto en Staging, recomendar contención temporal reversible por el propietario/hosting hasta corregirlo. Informe final en un solo bloque `text`, hallazgos clasificados entre confirmados, potenciales y falsos positivos.
