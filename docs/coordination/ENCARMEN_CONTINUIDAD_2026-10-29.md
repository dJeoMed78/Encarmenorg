# ENCARMEN — Bitácora de continuidad de Coordinación 01
**Fecha:** 2026-10-29 (America/Mexico_City)
**Propósito:** preservar decisiones, entregas y pendientes entre conversaciones. Documento de coordinación; no representa integración ni despliegue.
**Repositorio:** `dJeoMed78/Encarmenorg`. Producción: `main`; integración: `ia-desarrollo`; staging y producción sin autorización de cambios.

## 1. Reglas vigentes decididas por propietario
- La Jefa revisa **la lógica real y cobertura de pruebas** de cada entrega, no solo existencia de archivos/commits. Inspeccionar rutas, métodos, efectos secundarios, pruebas negativas, persistencia, interacciones y seguridad; distinguir pruebas simuladas de reales.
- La Jefa ejecuta directamente lo que permitan herramientas propias, preservando cuotas limitadas de W1/W2/GAS. Delegaciones pueden ser GRANDES si están cohesionadas; incluir instrucciones completas y autorizaciones de commits/publicación para evitar confirmaciones repetidas.
- Solo enviar instrucciones listas para usar a trabajadores disponibles en ese momento; NO anticipar mensajes para Work si la cuota está agotada. Usuario informó 8% restante de Work y restablecimiento a las 14:05 según captura de su aplicación; no asumir cuota actual ni que W1 y W2 comparten límite.
- Evitar tiempos muertos: tareas paralelas no conflictivas y control de entregas, sin sustituir la revisión independiente.
- Mantener bitácora periódicamente en esta rama para continuidad; no guardar secretos ni datos personales.
- No modificar `main`, `ia-desarrollo`, Hostinger, staging ni bases reales sin autorización específica. Ninguna publicación de rama significa integración/aprobación.

## 2. Entregas verificadas en GitHub
| Responsable / ID | Rama | SHA | Estado verificable |
|---|---|---|---|
| W1 registro integrado | `work/enc-public-registration-integration-001` | `184874835d9d588e679b201b790643dfd923aff8` | Publicado; pruebas locales con SQL simulado |
| W2 seguridad | `work/enc-security-containment-003` | `22ce2a30741bf9145acbb2b939d1d6a936c1843f` | Publicado; seguridad bajo revisión posterior |
| PERP integridad | `work/enc-data-integrity-001` | `84819002a20857fee3e5f668189a615ef9a43618` | Propuesta de parche NO aplicada; 17 pruebas simuladas |
| GAS ficha móvil | `work/enc-public-detail-ux-001` | `174cb16fff855a16b8bbe5ac083f88140c31924f` | Publicado; 26 pruebas reportadas y capturas |
| W1 consolidación | `work/enc-consolidation-001` | `a16ca710449eda3c68f26016b91ce59d55b95b2b` | 3 commits sobre W1; 132 pruebas locales reportadas + 27 compilado; SQL simulado, sin MariaDB real ni Chromium |
| GAS clasificados UX | `work/enc-classifieds-ux-001` | `067a3b0e2015397dc33862da475cc5b0eb4ae208` | Publicado; 5+10 pruebas reportadas, capturas; NO integrado |
| PERP laboratorio | `work/enc-mariadb-real-test-001` | `e53ba79f9fda5115d813f418e6ffcc0b624b94ae` | Script y documentación publicados; NO probado en MariaDB real |

## 3. Auditoría independiente de consolidación
W2 auditó exactamente `a16ca710449eda3c68f26016b91ce59d55b95b2b` en tarea `ENC-CONSOLIDATION-REVIEW-001`. Dictamen: **REQUIERE CORRECCIONES**; informe compartido por usuario en conversación, no asumir que está publicado en GitHub.

- H01 ALTO: excepciones `radar-search` en `src/server/adminSecurity.ts` y guard de `server.ts` no limitan método. En Express, PUT/DELETE `/api/events/radar-search` pueden alcanzar handlers `/api/events/:id`. W2 reprodujo cambio/borrado sintético en memoria y llamadas a escritura de archivo; NO SQL real. Código confirmado por La Jefa.
- H02 MEDIO: `src/App.tsx` navegación popstate GET atrasado puede sobrescribir visualmente ficha recién guardada.
- H03 MEDIO: `src/services/api.ts` POST con HTTP 502 no JSON clasifica indebidamente escritura como confirmadamente fallida; conservar incertidumbre y UUID.
- H04 MEDIO: `src/services/api.ts` reportes usan fallback localStorage y pueden devolver éxito tras rechazo HTTP.
- No integrar `a16ca710` hasta corregir H01 y resolver H02–H04 según revisión; volver a verificar de manera independiente sin consumir cuota en auditorías redundantes.
- Riesgos no resueltos: MariaDB real, navegador real, seguridad de archivos servidos por Hostinger/CDN, límites por proceso, cuotas pre-INSERT no transaccionales.

## 4. Observaciones técnicas adicionales de Coordinación
- En consolidación `server.ts` antiguo backend de clasificados `POST /api/classifieds`, PATCH/DELETE puede responder éxito pese a fallos de archivo/MariaDB; la ruta administrativa requiere permiso `classified:manage`. No asumir que el frontend GAS con API elimina errores de backend.
- GAS `ClassifiedsView` elimina filtro `approvedByAdmin !== true`, añade categorías y mejoras móviles. `src/App.tsx` y `src/services/api.ts` tienen divergencias con consolidación; integrar selectivamente.
- El laboratorio PERP `scripts/mariadb-real-lab.mjs` contiene `DROP DATABASE IF EXISTS` y `CREATE DATABASE`; su verificación por nombre/usuario NO demuestra servidor desechable. **No autorizar --apply** sin aislamiento acreditado y salvaguardas revisadas. No se han realizado pruebas reales.
- La documentación antigua `docs/CONTEXTO_ENCARMEN.md` dice que staging y producción 'deben mantener' bases separadas, pero **eso no demuestra separación real**. Confirmarla antes de toda escritura.

## 5. Nuevas delegaciones decididas; NO asumir ejecución hasta recibir SHA
- **W1:** `ENC-CONSOLIDATION-001-R1`, corregir H01–H04 en `work/enc-consolidation-001`, base `a16ca710`. Instrucción preparada pero propietario pidió NO enviarla hasta que W1 tenga cuota. Estado: **pendiente, NO afirmar en ejecución**.
- **GAS:** `ENC-CLASSIFIEDS-INTEGRATION-002`, rama `work/enc-classifieds-integration-002`, base `a16ca710`, integrar frontend clasificados sobre consolidación; contrato nuevo público. Instrucción entregada al usuario para envío, ejecución/commit todavía NO comprobados.
- **PERP:** `ENC-CLASSIFIEDS-BACKEND-001`, rama `work/enc-classifieds-backend-001`, base `a16ca710`, backend público seguro y persistente de clasificados; denegación segura sin aislamiento probado. Instrucción entregada al usuario para envío, ejecución/commit todavía NO comprobados.
- **W2:** revisión independiente de correcciones después de W1, solo si necesaria; auditoría inicial terminada.

## 6. Protocolo de verificación para toda entrega futura
1. Confirmar en GitHub la rama, SHA, base, diff y archivos; no confundir esto con corrección funcional.
2. Leer **implementación** y contratos backend/frontend; comparar con requerimiento y código actual. Buscar permisos, rutas equivalentes, métodos, race conditions, actualización de cache, errores SQL, respuestas falsas y seguridad por defecto.
3. Revisar tests por aserciones reales, no solo conteo; ejecutar pruebas locales si posible, incluyendo negativas y regresión. Señalar datos simulados, ausencia de infraestructura y no atribuir verificación real a logs.
4. Revisar conflictos de ramas y dependencias; encontrar defectos y pedir correcciones concretas antes de integrar.
5. Clasificar entrega: publicada / implementada / probada por trabajador / verificada por coordinación / lista para considerar integración / integrada / desplegada.
6. Mantener evidencia, fecha, SHA y acciones pendientes aquí, sin modificar producción.

## 7. Próximo orden
1. Recibir resultados de GAS y PERP sobre clasificados y comprobar código (no solamente publicación).
2. Corregir H01–H04 con W1 cuando haya cuota o directamente con herramientas seguras disponibles, conservando auditoría independiente.
3. Validar compatibilidad conjunta de registro, seguridad, clasificados y UX.
4. Ejecutar prueba MariaDB **real aislada** y navegador real antes de valorar integración a `ia-desarrollo`.
5. Actualizar esta bitácora por un commit en rama de coordinación al llegar avances significativos.
