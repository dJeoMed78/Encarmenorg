# ENC-INTEGRATION-VALIDATION-001

Estado: EN_PROGRESO. Fecha:2026-10-29. Base exacta:afa344a291a2f64354989c890f8f55dad0a2af7c. Rama:work/enc-integration-validation-001.

Fase1: SHA y CI40942083179 comprobados(success sobre la misma base); rama nueva creada sin sobrescribir otra. Se consultaron documentación oficial y candidata. WORK_INSTRUCCIONES.md no existe en la candidata; se leyó la copia de coordinación y se registra la diferencia. Fuentes recuperadas contrastadas por hash Git, incluido server.ts completo. Scripts de build actualizan versión: se usarán compiladores directos.

Hallazgos iniciales: permisos SQL de clasificados aceptan grants globales/ajenos por regex; campos de UI no se persisten; price=null no se aplica por COALESCE; recuperación de titular tras POST incierto no está resuelta; cuotas y límite de cuerpo requieren cobertura. Se ampliarán H01-H04, HTTP completo, cliente/router y persistencia.

Laboratorio: descarga de binarios MariaDB en carpeta propia, sin instalación/servicios del sistema. Playwright está disponible pero instalación inicial de browser falló por lock; se investiga descarga aislada. Todavía NO se declara prueba real SQL ni navegador. Sin Hostinger, bases existentes, cambios de variables remotas, integración o despliegue.
