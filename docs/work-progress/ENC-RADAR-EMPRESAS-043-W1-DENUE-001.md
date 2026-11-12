# ENC-RADAR-EMPRESAS-043-W1-DENUE-001

## Checkpoint de implementación — 2026-11-12

Base remota verificada: `41bbaac6dbf2cd8a66819b5119928f6e18ab9dcd` (`ia-desarrollo`). Rama propia: `work/enc-radar-empresas-043-w1-denue-001`. No integración ni despliegue.

Issue #43 revisado. PR #68 abierta, no fusionada, HEAD `ddea6e2cad06ca96b7a4a41bbff5d8bde878b96e`. Se revisaron sus cambios en bloqueo, asignación de ID y readback; no se copió su servidor ni se fusionó su rama. El camino DENUE usa el store transaccional actual de Staging: una conexión, GET_LOCK, INSERT exclusivo, comparación de columnas/raw_data antes de COMMIT y nueva consulta posterior. Los handlers históricos quedan conservados para contraste, pero las rutas de aprobación del radar se conectan al flujo DENUE.

### Implementación
- Cliente exclusivo del servidor para BuscarAreaAct y Ficha. Filtros 04/003/0001 y comprobación estricta de AreaGeo. Sin búsquedas por radio ni extracción de Google Maps.
- Token `INEGI_DENUE_TOKEN` requerido en el entorno del proceso servidor. Nunca se devuelve, registra ni incluye en enlaces del cliente. Sin configuración remota realizada.
- Timeout 8 s, cuerpo máximo 2 MB, página de 20, máximo 100 páginas, 30 consultas/minuto/proceso, 2 consultas simultáneas. Sin redirecciones ni reintentos automáticos; estos límites son internos, no una afirmación de la cuota oficial.
- Normalización sin inventar datos: teléfono independiente, WhatsApp vacío, sin descripción comercial/fotos/horarios. Fecha de alta diferenciada de actualización.
- Candidatos temporales 15 minutos, máximo 200; revisión ligada a hash del contenido consultado. Cambios posteriores requieren nueva revisión.
- Consulta GET autenticada; aprobaciones mediante rutas ya protegidas. No se amplían permisos globales. Publicación DENUE exclusivamente por el carril Staging existente, con mutaciones administrativas explícitamente habilitadas por el operador.
- Duplicados por ID/CLEE/nombre-dirección y coincidencias parciales; ninguna escritura sobre empresas existentes. Callback de deduplicación dentro del bloqueo del store, conservando el comportamiento predeterminado del registro público.
- UUID estable por ID DENUE, readback y recuperación de reintento tras confirmación perdida. Sin publicación optimista ni copia JSON.
- Interfaz Glass con selección voluntaria de hasta 10 candidatos, confirmación, descarte local, resultado individual y reconocimiento explícito de ficha no disponible. Retiro del descubrimiento de semilla/IA de las rutas del radar.
- Fuente y metadatos guardados en raw_data; atribución y enlace INEGI en ficha pública. Sin DDL.

### Evidencia externa y límites
Documentación consultada: https://www.inegi.org.mx/servicios/api-denue/
Términos: https://www.inegi.org.mx/contenidos/inegi/doc/terminos_info.pdf
Los términos permiten reutilización con atribución y sin atribuir las transformaciones al INEGI. El cliente conserva la procedencia y señala la normalización.

Sin token INEGI autorizado disponible para esta ejecución: NO se ejecutaron búsquedas reales autenticadas ni se verificaron establecimientos reales. Se intentó abrir el visor con `idee=190675` a partir de una referencia pública de terceros; la herramienta devolvió URL inaccesible. Ese establecimiento NO se incorporó, ni se considera comprobado. Cero enlaces individuales reales certificados. No se sustituyó este requisito con datos ficticios: los fixtures son exclusivamente de pruebas.

La API Ficha valida ID/nombre/dirección; no demuestra que la interfaz JavaScript del visor abra la ficha adecuada. La UI exige comprobación administrativa y permite bloquear la fuente. Falta la validación real de Nia con negocios de Ciudad del Carmen antes de activar.

### Pruebas iniciales
- Nuevas pruebas: 29 de cliente/normalización/HTTP/SQL simulado y 1 React/jsdom: PASS en primera ejecución; ampliación de casos en curso.
- TypeScript y build frontend/backend: PASS con dependencias locales disponibles. No equivale a instalación limpia.
- Regresiones: 76 pruebas, 73 PASS y 3 FAIL. Los mismos tres fallos se reprodujeron sobre fuentes originales del SHA base (11 pruebas, 8 PASS y 3 FAIL): registro público (contrato imágenes y respuesta HTML) y test histórico que espera radar de clasificados anónimo. No se alteró seguridad para satisfacerlo.
- npm ci inicial: EUSAGE por paquetes opcionales ausentes del lockfile. Regeneración aislada añadió 78 entradas opcionales sin modificar versiones ni metadatos existentes. Instalación limpia y dependencia jsdom de pruebas pendientes de cierre.

### Activación posterior reservada a Coordinación
1. Revisar PR y CI. Resolver fallos históricos según sus tareas, sin debilitamientos.
2. Obtener token propio mediante registro oficial INEGI y configurarlo privadamente en el entorno del proceso servidor, nunca en VITE_* ni URLs públicas. Esta rama no cambia Hostinger.
3. Probar consultas y visor con establecimientos reales; comprobar ID, nombre, dirección, AreaGeo y atribución. No certificar solamente HTTP 200 del visor.
4. Verificar identidad/aislamiento de MariaDB Staging, respaldo recuperable y ventana de escritura vigente antes de cualquier aprobación real.
5. Aprobar un negocio controlado, comprobar COMMIT y consulta independiente, directorio/ficha, reintento y duplicados. El código no habilita producción.
6. Cerrar ventana de escritura y comprobar rechazo. Reversión de código: volver al release anterior por procedimiento de Coordinación. No borrar registros importados automáticamente.

Pendientes externos: token, consultas DENUE reales, visor individual, MariaDB real y aceptación visual. No se usaron credenciales reales ni se ejecutó SQL real.
