# ENC-STAGING-CANDIDATE-CLOSURE-004

W1. Fecha2026-10-29, America/Mexico_City. Estado IMPLEMENTADO/PROBADO LOCALMENTE; publicación y revisión independientes pendientes al crear checkpoint. No integrado/desplegado ni incidencias cerradas.

Base obligatoria74e3300fa9ff022153d7e6671c65362203258032, work/enc-data-integrity-closure-003 comprobada. Rama destino inexistente al consultar; creada work/enc-staging-candidate-closure-004 desde SHA exacto, sin force ni cambios en ramas ajenas.

Consultados punto de entrada de coordinación, registro maestro actualizado, metodología/contexto/instrucciones y resultados e informes previos de consolidación/H01-H04/R3/closure003. La entrega003 está terminada y es base; no se reinicia ni se repite recuperación histórica de contactos. Sin acceso a Hostinger/bases reales.

## Matriz de paquetes

A:74e3300fa9ff022153d7e6671c65362203258032. Preservados H01-H04, fetchReports tipado sin localStorage, panel/carrera, acuse de contactos, R3 y políticas cerradas.
B:79757de8cfb07317668553c02a37502de4b64366, coord/enc-upload-honest-result-001. Incorporadas por hunks las funciones upload/duplicados/updateReportStatus/deleteReport y dos handlers de error del panel; suite original incluida.
C:aa5260cf16a08539e04f4225056e152472302c57, coord/enc-report-persistence-001. Incorporados handlers y affectedRows de DELETE; suite incluida y adaptador ampliado para lectura fresca/UPDATE sin upsert. Se corrigieron brechas adicionales descritas abajo.
D:73a68214cb326283375a8fe5e5ceeb669cee6d49, coord/enc-f007a-completion-001. Incorporados únicamente movimiento de sección y CSS por hunks; script/suite relacionados. Corregido reconocimiento idempotente del script que buscaba className incompleto. No se incorporaron documentos/ramas completos ni paquetes ajenos. Los HEAD de B/C/D coincidían con esos SHA al verificarlos.

## Implementación adicional necesaria

- dbLoadAllReports deja de convertir pool ausente/error/resultado inválido en []; lanza error y conserva [] como consulta válida.
- GET /api/reports exige MariaDB activa, realiza lectura SQL actual por solicitud, no-store y503 en fallo. No usa caché como confirmación; solo actualiza caché tras lectura válida. Startup maneja error/vacío sin JSON/semilla de reportes ni impedir carga de otros módulos.
- Mutaciones consultan SQL fresco, no dependen de existencia en caché antigua, y solo actualizan caché/JSON tras acuse booleano real. PATCH usa UPDATE dedicado, no upsert que pudiera recrear un reporte eliminado. Helpers exigen affectedRows>0. Registro inexistente404; fallo o acuse insuficiente503, con incertidumbre de escritura cuando no puede descartarse. No se afirma transacción SQL+JSON ni idempotencia de POST.
- Lectura SQL normaliza nombres snake_case/camelCase para consumidores. Metadatos de reportes de clasificados/comentarios, que antes se perdían al escribir columnas limitadas, se conservan en details existente mediante envoltura JSON versionada y campos cerrados. Lectura acepta también details histórico de texto puro. Sin columna/migración nueva. Prueba de roundtrip con adaptadorSQL confirma identificación de clasificado y comentario.
- Galería administrativa ya no sustituye carga fallida por base64; error visible y estado anterior conservado. Logo fallido no modifica URL guardada y muestra error.
- Promociones conservaban fallback base64 aun con API corregida: ahora distinguen preview pendiente de URL remota, bloquean guardado no confirmado y excluyen preview del payload; quitar imagen limpia la preview pendiente. Formularios no se restablecen tras fallo.
- F007A conserva un solo widget/calificaciones y contactos; DOM sitúa opiniones tras datos, CSSdesktopfila3/tabletfila4/móvilorder7. Su aceptación sigue reservada al propietario.

## Hito ejecutado

Batería de fuentes173 PASS/0FAIL/0omitidas, incluye anterior147 sin regresión; paquetes B/C/D13 PASS incluidos. Pruebas de consumidores, HTTP loopback con middleware real y SQL simulado, helper SQL y DOM están incluidas; no son173 escenarios únicos. Suite histórica de backend compilado27 PASS/0FAIL. CompilaciónTS/Vite/esbuild PASS, ambas copias backend idénticas y segunda compilación coincidente. Comandos y detalle final tras publicar checkpoint.
Chromium real intentado: falla antes de página por socket Unix EPERM; no capturas ni validación geométrica. Sin MariaDB real, SQL real, servidor completo ni despliegue.

## Validación previa a publicación del checkpoint

La batería final ampliada tras las últimas correcciones pasó176/176,0omitidas. Incluye147regresiones base, suites B/C/D, controles adicionales de registro inexistente, consumidores de upload y comprobación del móduloSQL compilado. La suite independiente histórica del bundle27/27 también pasó; tiene cobertura compartida y no se suma como escenarios nuevos.
Se reforzó el acuse con lectura SQL posterior: guardar/actualizar comprueba id/status/details y DELETE comprueba ausencia. Así, affectedRows por sí solo no acredita un contenido truncado ni un resultado inexistente. Un fallo de readback conserva incertidumbre y no adelanta la caché. No se afirma transacción entre lectura, escritura y caché.
