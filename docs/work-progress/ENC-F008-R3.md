# ENC-F008-R3 — recuperación y revisión

Estado EN_PROGRESO. Fecha local 2026-10-28. Rama work/enc-f008-r3-recuperacion. Base verificada d826a17b6f4bd29eaac1ef350111910ab2dfe872, procedente exclusivamente de work/enc-f008-contactos-visibilidad; ia-desarrollo sigue en0d231cb2779b7a14d8d336fc2f4de3782663c738. Instrucciones coordinación51ae3a45a6f82bc8fcec9f02432835f312ce8c02.

## Auditoría inicial recuperada

Revisados ambos commits053b729bb82f852fa61063802a6a757947cf8b12 y d826a17b6f4bd29eaac1ef350111910ab2dfe872, sus13 archivos, instrucciones generales, contexto, resultados, checkpointR2 e issues5/6. El documento completo ENC-F008-AUDIT-001 no aparece en los árboles de coordinación/R2 ni en búsqueda de código; se aplican los siete hallazgos proporcionados expresamente por Coordinación. No se declara leído un archivo no localizado.

R2 implementa autoridad de columnas SQL, lectura estricta, errores503 sin semillas, preservación por defecto del upsert, borrado explícito con sesión, canales separados y filtros/contadores/paginación. Sus nueve grupos de pruebas son evidencia histórica, todavía no resultados R3.

Server.ts:401 líneas eliminadas, principalmente importador bidireccionalWooCommerce/arranque de sincronización, inicialización de negocios desde semillas y sync-catalog que contaba guardados aunque fallaran. Se conservan estas decisiones: responden al alcance de preservación y a la retirada documental de WordPress; no se reactivan importaciones ni se restaura código destructivo. Las rutas ajenas, calificaciones, Radar y Editor no se sustituyen.

Hallazgos nuevos a resolver/probar: guard DDL de Staging no comprueba isWritePermitted antes de schema-init; tarjeta tel sin prefijo+; enlace administrativo de PIN infiere WhatsApp desde teléfono; datos de tipo objeto/array pueden coercionarse a contacto; readback de PATCH no valida contactos solicitados ni diferencia confirmación fallida posterior a escritura; alias oldId y respuestas frontend antiguas requieren pruebas adicionales.

La conexión/aislamiento de Hostinger sigue siendo una dependencia operativa. No cambiar variables, credenciales, permisos, infraestructura ni activar STAGING_DB_CONFIRMED. Preparar matriz de configuración con entorno sintético y guía para autorización posterior. No se ejecutó SQL real ni servidor completo.

Siguiente hito: recuperar fuente remota íntegra en copia aislada, corregir defectos de contacto y confirmar configuración mediante pruebas sin pool real; publicar pruebas y resultados. No integración, PR ni despliegue. Este checkpoint no aprueba R2.
