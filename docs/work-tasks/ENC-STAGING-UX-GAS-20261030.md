# ENCARMEN — Orden para W3 Google AI Studio

**Tarea:** ENC-STAGING-UX-GAS-20261030  
**Tipo:** Revisión funcional/UI DE LECTURA, sin publicar  
**Repo:** `dJeoMed78/Encarmenorg`  
**Versión:** `ia-desarrollo`, merge commit `4407e6aeb08b52cc750c952735467a0e04fe19cc`  
**Entorno objetivo:** sitio real `https://staging.encarmen.org` exclusivamente para consultas HTTP GET y revisión visual, o lectura estática GitHub.

## Contexto indispensable
**PROHIBIDO iniciar el backend con `tsx server.ts` en GAS preview, ejecutar comandos de arranque, abrir conexiones MariaDB, cargar secretos, disparar purgas automáticas ni iniciar sincronizaciones.** Se observó previamente que GAS preview `/app/applet` alcanzó MariaDB productiva por fallback: no repetirlo. GAS preview NO es el Staging real de Hostinger. `main`, `encarmen.org` y `u293982346_encarmenapp` son inamovibles; no consultar ni escribir producción.

## Objetivo
1. Revisar exclusivamente flujo visual y navegación en Staging: detalle público empresarial, botones de teléfono y WhatsApp, búsqueda/filtros, registro público, edición empresarial, promociones, reportes y vista móvil.
2. Inspeccionar estructura de formularios y validación de campos por lectura de código, registrar defectos concretos con rutas y pasos de reproducción, incluyendo CSS responsivo y mensaje de errores `401`/`403`.
3. Consultar solo páginas/GET públicos de `staging.encarmen.org`, SIN introducir datos reales ni enviar formularios. Si el entorno no permite visualizar Staging sin iniciar backend, realizar auditoría ESTÁTICA de UI y declarar límite.
4. No intentar probar persistencia ni autenticación hasta que Coordinación habilite de manera controlada la cuenta administrativa de pruebas.

## Restricciones
Solo lectura. Ningún cambio en GitHub, Hostinger, configuración, SQL, Actions, ramas ni archivos; no crear PR. No inventar pruebas. No tocar producción. Aportar capturas solo si fueron tomadas realmente en Staging.

## Informe
Un único bloque `text` con ID, SHA, pantallas inspeccionadas, evidencia real, problemas reproducibles, prioridad y pendientes. Separar claramente observaciones visuales de inferencias de código.
