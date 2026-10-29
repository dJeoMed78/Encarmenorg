# ENC-CONSOLIDATION-FIXES-002

W1. Fecha 2026-10-29, America/Merida. Estado IMPLEMENTADO Y PROBADO LOCALMENTE, pendiente revisión de Coordinación. NO integrado/desplegado.

## Base y checkpoint funcional

Base exacta 809dc7c05a8a633fc21379ad2121345b3aae71c7, work/enc-security-radar-001, comprobada en GitHub. La rama destino no existía; se creó work/enc-consolidation-fixes-002 exclusivamente desde esa base. Leída revisión de Coordinación docs/coordination/ENC_SECURITY_RADAR_001_REVISION_2026-10-29.md (blob b29e46042432e9cb5309dbf4dd8afe1bd9187600). No se retorna a consolidación vulnerable ni se incorporan ramas posteriores.

H02: navegación popstate comparte versión y AbortController con catálogo y guardado. Cambiar ficha/ruta o recibir guardado/alta confirmados invalida solicitudes anteriores; cleanup aborta al desmontar. Guardados usan actualización funcional por ID, sin sustituir otra ficha/modal ni cambiar su ruta al terminar un guardado previo. URL actual prevalece sobre slug inicial inyectado. Si navegación interrumpe catálogo inicial vacío se solicita uno nuevo.

H03: clasificación conservadora. Solo rechazo4xx contractual explícito (excepto408 y cualquier señal de escritura incierta) permite writeMayHaveSucceeded=false. 5xx, timeout/desconexión, JSON inválido o lectura posterior fallida no se interpretan como ausencia de COMMIT. Mensaje de incertidumbre pide conservar la misma clave. Se preservan POST público, UUID/Idempotency-Key, validación de ficha/listado y canales independientes. Formulario existente ya conserva UUID y evita doble envío; se comprueba, sin reimplementarlo. JSON se serializa antes de marcar posible envío.

H04: sendBusinessReport/sendClassifiedReport no guardan fallback local ni generan éxito remoto simulado. Solo HTTP exitoso y success===true confirman recepción. Campo opcional deliveryState compatible: confirmed/rejected/uncertain. Fallos conservan el formulario y mensajes de no confirmación. Borradores históricos locales no se convierten en prueba de envío. Solo ClassifiedDetailModal consume el envío en src; no hubo necesidad de modificar componente/tipos: su rama de error conserva texto y su rama de éxito queda protegida por API estricta. sendBusinessReport y alias exportado mantienen compatibilidad.

Archivos funcionales: src/App.tsx y src/services/api.ts. Pruebas: tres nuevas suites consolidation-fixes-002; ajuste de un mensaje esperado en tests/staging-write-001.test.mjs. Documentación exclusivamente esta bitácora y WORK_RESULTADOS acumulativo.

Resultado preliminar conjunto:142 PASS /0 FAIL /0 omitidas; lint y Vite PASS. H01 conservado: server.ts, adminSecurity.ts, política y bundles idénticos a base; su suite HTTP se ejecuta otra vez. No backend/SQL/configuración/credenciales modificados. Siguiente operación: publicar checkpoint funcional y completar verificación remota/documentación final. El SHA actual se identifica con el commit que contiene este documento y se informa al cierre (sin inventar autorreferencia).
