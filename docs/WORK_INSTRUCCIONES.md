# WORK_INSTRUCCIONES.md — Coordinación técnica Encarmen

**Responsable de coordinación y validación:** conversación principal de ChatGPT con el usuario.
**Ejecutor delegado:** ChatGPT Work.
**Repositorio:** `dJeoMed78/Encarmenorg`
**Integración de pruebas:** `ia-desarrollo`
**Producción:** `main` / `https://encarmen.org` **PROHIBIDO MODIFICAR**.
**Staging:** `https://staging.encarmen.org` — despliegue exclusivamente después de revisión y autorización del coordinador.

## 1. Reglas no negociables
1. No modificar, fusionar, publicar ni desplegar en `main` ni en `encarmen.org`. Tampoco acceder o escribir a la base de datos o secretos de producción. Verificar separación real de infraestructura antes de pruebas destructivas.
2. Leer íntegramente `docs/CONTEXTO_ENCARMEN.md` y anexos pertinentes **antes** de comenzar cada tarea. Respetar decisiones existentes y reportar contradicciones.
3. Trabajar en **rama propia por tarea**, nacida de `ia-desarrollo` o de la base especificada en la tarea. No hacer push directo a `ia-desarrollo` ni fusionar PR sin aprobación del coordinador.
4. Modificar solo archivos incluidos en el alcance autorizado. Si se requieren archivos adicionales, explicarlo en resultados y pedir autorización antes de modificarlos. No sobrescribir trabajo ajeno.
5. Verificar el SHA de la rama base al iniciar y antes de entregar. Si hubo cambios concurrentes, reportar diferencias; no usar force push ni reescritura de historial.
6. Inspeccionar primero scripts de `package.json` y efectos secundarios de `npm run lint` / `npm run build` (versiones y archivos generados). Si alteran archivos fuera del alcance, pedir autorización o usar pruebas no mutantes. Registrar comandos y resultados reales. **Nunca confundir revisión estática con pruebas ejecutadas.**
7. No usar datos inventados, resultados falsos ni mecanismos que reporten éxito ante fallas del servidor o MariaDB.
8. No introducir secretos, claves, datos personales de clientes o volcados de BD en commits, informes o logs.
9. Documentar implementación y resultados en `docs/WORK_RESULTADOS.md` **en la misma rama de trabajo**, sin sustituir registros anteriores. Cada tarea autorizará incorporar este archivo desde la rama de coordinación o crearlo si falta en la base. No actualizar `CONTEXTO_ENCARMEN.md` salvo asignación expresa; esta regla prevalece sobre instrucciones generales del contexto.
10. Cuando concluya o se bloquee, notificar al usuario en la sesión de Work, indicando el ID de tarea, rama, commit y estado. La entrega al coordinador ocurre cuando el usuario avisa o comparte el informe; **no existe sincronización autónoma entre sesiones**.

## 2. Estados de seguimiento
- `PENDIENTE`: sin comenzar.
- `EN_PROGRESO`: trabajo activo.
- `IMPLEMENTADO_SIN_VERIFICAR`: código en GitHub, sin ejecución completa de pruebas.
- `PROBADO_POR_WORK`: Work proporciona evidencias de pruebas.
- `BLOQUEADO`: falta autorización, herramienta o insumo.
- `VERIFICADO_COORDINADOR`: el coordinador inspeccionó cambios y pruebas.
- `INTEGRADO_STAGING`: tras aprobación se fusionó a `ia-desarrollo` y se comprobó staging.

**Work nunca asigna `VERIFICADO_COORDINADOR` o `INTEGRADO_STAGING` por cuenta propia.**

## 3. Formato de tarea obligatorio
- ID único (ej. `ENC-001`), título, objetivo y contexto.
- SHA de versión de instrucciones y rama/commit base.
- Archivos autorizados y expresamente excluidos.
- Comportamiento esperado, criterios de aceptación, casos de prueba y rollback.
- Entregables (rama, commits, diff, pruebas, limitaciones y reporte).

## 4. Protocolo de entrega
1. Crear rama de tarea.
2. Ejecutar tarea únicamente dentro de alcance.
3. Ejecutar y registrar pruebas reales, incluyendo las que fallaron o no se pudieron ejecutar.
4. Agregar entrada al final de `docs/WORK_RESULTADOS.md`.
5. Hacer commit y publicar implementación y resultados exclusivamente en rama de tarea. Si se realizan pruebas posteriores, documentarlas y publicar otro commit antes de entregar.
6. Entregar al usuario URL de rama/commit, ID y estatus; esperar revisión técnica.
7. Coordinador compara rama contra `ia-desarrollo`; si aprueba, organiza integración y validación de Staging. Autorizaciones históricas no sustituyen aprobación de integración. Producción no es opción.

## 5. Tareas asignadas
**Tarea asignada:** `ENC-REVIEWS-001`. Instrucciones completas en `docs/work-tasks/ENC-REVIEWS-001.md` de esta rama. Solo ejecutar cuando el usuario transmita expresamente este ID. No asumir que existen otras tareas autorizadas.

## 6. Antecedentes
Prueba `ENC-SETUP-001`: rama `work/verificacion-acceso-001`, commit `d48a3367805b21e1e49cb1aac05fe835dbe5748f`, exclusivamente archivo `docs/WORK_PRUEBA_ACCESO.md`; verificada por el coordinador mediante comparación GitHub con base `6004ef637021ee0bea72f5c892a815696c1c8c13`. No integra código de aplicación.

Última actualización inicial: 2026-10-27.

## 7. Validación ENC-SETUP-002
Work confirmó lectura completa y detectó cinco riesgos, abordados en esta revisión: prioridad de alcance documental, efectos secundarios de scripts, commit de resultados, disponibilidad de resultados entre ramas y autorización de Staging. No modificó archivos durante su revisión.
