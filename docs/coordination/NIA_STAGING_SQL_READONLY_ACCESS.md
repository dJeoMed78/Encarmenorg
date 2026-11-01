# ENCARMEN — Acceso de consulta SQL a Staging por GitHub Actions

Fecha: 2026-10-31. Responsable: Coordinación 01, Nia.
Estado: **PLAN DOCUMENTADO; NO EJECUTADO NI PROBADO**.

## Propósito
Permitir verificaciones puntuales de solo lectura sobre MariaDB Staging sin solicitar al propietario ingreso repetido a phpMyAdmin. Primera prueba: comprobar ausencia o presencia del negocio con ID 20272 en la tabla `businesses`.

## Diagnóstico de la limitación de la conexión actual
- El plugin GitHub está instalado y activo.
- La configuración específica de permisos en ChatGPT es `Allow all actions` (comprobada 2026-10-31); por tanto, no se debe pedir al propietario que amplíe sus permisos generales.
- Las acciones expuestas en esta conversación permiten leer/escribir archivos, inspeccionar jobs y reejecutar ciertos jobs, pero **NO exponen una operación de `workflow_dispatch` para lanzar un workflow nuevo**. Esto describe la capacidad del conector en esta sesión, no prueba una falta de autorización de GitHub Actions en el repositorio.
- Históricamente existen verificaciones vía GitHub Actions y SSH; esto no implica que una nueva ejecución haya ocurrido hoy.

## Diseño de implementación (pendiente)
1. Identificar el workflow existente que ya usa SSH y comprobar su alcance, disparador y seguridad sin leer/imprimir secretos.
2. Implementar una consulta de **solo lectura**, usando usuario MariaDB limitado con permiso SELECT sobre `u293982346_encarmentest`, sin privilegios de escritura y sin acceso al esquema productivo. No reutilizar un usuario privilegiado para una herramienta permanente de consultas.
3. Fijar servidor, esquema y tabla autorizados por código (sin SQL arbitrario como parámetro). Comprobar identidad de la conexión y objetivo antes de la consulta. Usar `SELECT COUNT(*) AS coincidencias FROM businesses WHERE id = 20272` tras comprobar esquema real de campos y tipo de ID.
4. Restringir el disparador a operadores autorizados, usar environment de GitHub protegido, permisos de token mínimos, y no imprimir secretos, registros completos ni datos privados.
5. En primera corrida emitir únicamente esquema autorizado, estado de controles y conteo 0/1; guardar identificador del run y resultado verificable. No ejecutar DELETE ni cambiar flags de Staging.
6. **Lanzamiento:** la conexión GitHub de esta conversación no ofrece actualmente un método para iniciar `workflow_dispatch`. Podrá iniciarse desde GitHub Actions por el propietario cuando el workflow esté disponible en la rama principal de workflows; **eso no autoriza ningún cambio de código productivo o despliegue**. Estudiar alternativa por herramienta GitHub/CLI que exponga `workflow_dispatch` antes de pedir intervención manual.
7. Antes de introducir workflows en rama `main`, requerir autorización expresa del propietario: `main` es rama de producción. Preparar y revisar en rama aislada previamente.

## Estado del negocio 20272
El propietario reportó comprobación directa en MariaDB a ~16:00 local del 31/oct/2026: registro no aparece. Esta conversación **NO** ha hecho readback SQL nuevo ni recuperado captura original. No duplicar DELETE ni elevar afirmación a verificación independiente.

## Restricciones
No modificar producción, credenciales, SSH, staging runtime ni ejecutar SQL de escritura. No usar `pull_request_target` ni recibir SQL libre. Registrar SHA de implementación, revisión, ejecución y aceptación por separado.
