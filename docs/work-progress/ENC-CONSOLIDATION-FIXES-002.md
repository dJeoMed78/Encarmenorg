# ENC-CONSOLIDATION-FIXES-002

W1. Fecha 2026-10-29, America/Merida. Estado IMPLEMENTADO Y PROBADO LOCALMENTE, pendiente revisión de Coordinación. NO integrado/desplegado.

## Base y checkpoint funcional

Base exacta 809dc7c05a8a633fc21379ad2121345b3aae71c7, work/enc-security-radar-001, comprobada en GitHub. La rama destino no existía; se creó work/enc-consolidation-fixes-002 exclusivamente desde esa base. Leída revisión de Coordinación docs/coordination/ENC_SECURITY_RADAR_001_REVISION_2026-10-29.md (blob b29e46042432e9cb5309dbf4dd8afe1bd9187600). No se retorna a consolidación vulnerable ni se incorporan ramas posteriores.

H02: navegación popstate comparte versión y AbortController con catálogo y guardado. Cambiar ficha/ruta o recibir guardado/alta confirmados invalida solicitudes anteriores; cleanup aborta al desmontar. Guardados usan actualización funcional por ID, sin sustituir otra ficha/modal ni cambiar su ruta al terminar un guardado previo. URL actual prevalece sobre slug inicial inyectado. Si navegación interrumpe catálogo inicial vacío se solicita uno nuevo.

H03: clasificación conservadora. Solo rechazo4xx contractual explícito (excepto408 y cualquier señal de escritura incierta) permite writeMayHaveSucceeded=false. 5xx, timeout/desconexión, JSON inválido o lectura posterior fallida no se interpretan como ausencia de COMMIT. Mensaje de incertidumbre pide conservar la misma clave. Se preservan POST público, UUID/Idempotency-Key, validación de ficha/listado y canales independientes. Formulario existente ya conserva UUID y evita doble envío; se comprueba, sin reimplementarlo. JSON se serializa antes de marcar posible envío.

H04: sendBusinessReport/sendClassifiedReport no guardan fallback local ni generan éxito remoto simulado. Solo HTTP exitoso y success===true confirman recepción. Campo opcional deliveryState compatible: confirmed/rejected/uncertain. Fallos conservan el formulario y mensajes de no confirmación. Borradores históricos locales no se convierten en prueba de envío. Solo ClassifiedDetailModal consume el envío en src; no hubo necesidad de modificar componente/tipos: su rama de error conserva texto y su rama de éxito queda protegida por API estricta. sendBusinessReport y alias exportado mantienen compatibilidad.

Archivos funcionales: src/App.tsx y src/services/api.ts. Pruebas: tres nuevas suites consolidation-fixes-002; ajuste de un mensaje esperado en tests/staging-write-001.test.mjs. Documentación exclusivamente esta bitácora y WORK_RESULTADOS acumulativo.

Resultado preliminar conjunto:142 PASS /0 FAIL /0 omitidas; lint y Vite PASS. H01 conservado: server.ts, adminSecurity.ts, política y bundles idénticos a base; su suite HTTP se ejecuta otra vez. No backend/SQL/configuración/credenciales modificados. Siguiente operación: publicar checkpoint funcional y completar verificación remota/documentación final. El SHA actual se identifica con el commit que contiene este documento y se informa al cierre (sin inventar autorreferencia).

## Cierre — resultados ejecutados y límites

Checkpoint publicado y conservado: 4dba25fd0b10b14a168e43f042a2fd0f71d41858. El commit de cierre contiene este registro, la entrada acumulativa y aserciones adicionales del contrato API; su SHA se entrega al coordinador sin autorreferencia ficticia.

### Reproducción exacta

    npm run lint
    node_modules/.bin/vite build --outDir /tmp/enc-consolidation-fixes-002-dist
    node --import tsx --test tests/consolidation-fixes-002-*.test.mjs tests/security-radar-001.test.mjs tests/public-registration*.test.mjs tests/consolidation-001.test.mjs tests/contacts-r3.test.mjs tests/staging-write-001.test.mjs tests/staging-isolation-proof.test.mjs tests/security-containment-003.test.mjs tests/backup-security-002.test.cjs

Última ejecución:142 PASS,0 FAIL,0 skipped; duración de la batería6260.132759ms. Es conteo del runner, con cobertura compartida/importada entre suites, no142 escenarios únicos. TypeScript PASS, exit0, sin diagnósticos. Vite PASS, exit0. Node24.22.1, TS7.0.2, Vite8.3.5. Advertencias npm http-proxy y chunk Vite>500kb, no errores. Dependencias locales reutilizadas; instalación npmci limpia no realizada. No scripts de versión ni npm run build. Frontend generado en /tmp, no se publica dist ni se cambia configuración.

Desglose nuevo:22 tests PASS (8 H02,10 H03,3 H04 API,1 H04 React/DOM). Incluidos en142, no sumarlos nuevamente.
- H02: GET atrasado tras guardado conserva teléfono/WhatsApp nuevos; Back/Forward y respuestas fuera de orden; fallo antiguo; desmontaje; abrir otra empresa; guardar A mientras ficha/modal/ruta B están activos; catálogo pendiente tras guardado; URL actual sobre hint inicial del servidor.
- H02 usa efectos/handlers reales extraídos de App y transpilados, con estado/peticiones diferidas controlados. No se afirma navegador real por esas pruebas. Regresiones existentes ejercen además App y contactos en DOM jsdom.
- H03:200 incompleto,200 no JSON,400 contractual/400 inválido,409 BUSINESS_DUPLICATE real del contrato,500/502,timeout y desconexión; lectura posterior fallida y reintento exitoso con mismo UUID. Confirmación válida exige ficha/listado y contactos correspondientes. La prueba de replay nueva usa servidor simulado explícito; la suite existente prueba también HTTP Express real con SQL simulado e idempotencia del almacén. No se demuestra COMMIT MariaDB real.
- H04:401/403/500,no JSON,cuerpo inválido,success=false,red,localStorage inaccesible y borrador local histórico; ninguno genera éxito remoto. Solo respuesta2xx y success===true devuelve deliveryState=confirmed. Rechazos se distinguen de incertidumbre sin cambiar contrato de success/message/report. Se conserva texto en formulario; no se añade nuevo almacenamiento local de borradores.
- Prueba React REAL con jsdom del ClassifiedDetailModal: abrir formulario, escribir comentario, enviar con403, conservar texto/formulario y mensaje sin éxito; reintentar y mostrar confirmación únicamente tras2xx/success=true. Es interacción DOM, no prueba visual Chromium/responsive.
- H01: suite existente6/6 PASS dentro de la batería, incluyendo90 solicitudes no autorizadas y32 identificadores reservados con sesión. Caché, archivos temporales y contadores de escrituras SQL simuladas permanecen intactos en rechazos; búsquedas legítimas siguen operativas. Autenticación/aislamiento/respaldos/registro/edición/contactos también pasan sus regresiones relacionadas.

### Revisión de alcance y procedencia

Únicos archivos funcionales modificados: src/App.tsx y src/services/api.ts. No componentes visuales ni backend/esquema/credenciales/permisos/configuración. Tres nuevas suites y una aserción actualizada en tests/staging-write-001.test.mjs: el mensaje esperado ahora describe incertidumbre, conservando comprobaciones de UUID y doble envío.
server.ts, src/server/adminSecurity.ts, src/server/consolidatedWritePolicy.ts, src/db, server.js y api/server.bundle.js se conservan desde la base H01. No existe importación de App/API cliente en el backend; recompilación de servidor no requerida ni ejecutada. No se incorporan correcciones de clasificados ni otras ramas. Copia local contenía un runner auxiliar histórico sin seguimiento: no ejecutado ni publicado. Historial WORK_RESULTADOS conservado; solo se añade la entrada de esta tarea.

### Errores encontrados durante implementación

Primera compilación detectó falta de import useCallback: corregida antes de la ejecución final. La primera fixture de navegación omitía setActiveTab; se completó. Una variante que limpiaba landing al iniciar GET interfería con guardado pendiente: se eliminó esa modificación y se comprobó conservación de la ficha. Un test previo esperaba el texto crudo del error5xx; se actualizó al mensaje honesto de resultado incierto y se mantuvo su prueba de reintento con UUID idéntico. Todos esos ensayos iniciales se distinguen del resultado final142/142.

### Riesgos, pendientes y reversión

Sin bloqueos técnicos abiertos para revisión del código. Falta revisión independiente de Coordinación; no aprobación propia. Sin prueba de Hostinger, MariaDB real, red de proveedores ni navegador real: no se presentan mocks o jsdom como persistencia/validación visual. Los límites operativos y la persistencia best-effort heredada documentados en H01 permanecen fuera de esta tarea; no se habilitan operaciones bloqueadas.
El UUID del formulario permanece en su instancia durante reintentos; no se añade recuperación entre dispositivos ni almacenamiento de registros personales. Los reportes sin acuse son inciertos, no confirmados; no se añade idempotencia backend de reportes ni se garantiza ausencia de duplicados si el operador repite un envío remoto incierto. Errores4xx contractuales respetan el contrato del servidor, sin alterar backend.

main, ia-desarrollo y rama H01 no modificadas por esta tarea. Sin PR, force, integración, despliegue, Hostinger, SQL real ni secretos. Revisión de integración futura debe preservar H01 y recompilar frontend desde las fuentes aprobadas antes de cualquier publicación autorizada.
Reversión propuesta: commits normales exclusivos de ENC-CONSOLIDATION-FIXES-002, preservando base809dc7c y sus defensas H01. No revertir al SHA vulnerable a16ca710. No hay cambios SQL compartidos que revertir.

Dictamen del ejecutor: PREPARADO PARA REVISIÓN DE COORDINACIÓN; no integrado ni desplegado.
