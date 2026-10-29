# ENCARMEN — Revisión de Coordinación 01: GAS / Clasificados
Fecha: 2026-10-29
Tarea: ENC-CLASSIFIEDS-INTEGRATION-002
Rama: work/enc-classifieds-integration-002
SHA: 328939caeab4801b33070b13f0b70826d9bc752d
Base: a16ca710449eda3c68f26016b91ce59d55b95b2b
Estado: publicado y código inspeccionado parcialmente por coordinación; NO APROBADO PARA INTEGRAR, NO DESPLEGADO.

## Hechos comprobados
GitHub: rama coincide con SHA publicado; 1 commit por delante de base; 7 archivos cambiados: src/App.tsx, src/services/api.ts, tres componentes de clasificados, tests/classifieds-integration-002.test.mjs y documentación. No cambios backend.
GAS reporta 16/16 y pruebas previas, TypeScript y build. No se han reproducido aquí los builds ni las pruebas de GAS; la suite revisada llama fetch a servidor HTTP simulado directamente, sin probar funciones de api.ts ni SQL real.
GAS comunica cuota gratuita agotada hoy: no asignar nuevas tareas por ahora.

## Hallazgos de revisión de código
1. ALTO: src/services/api.ts aprox líneas 644, 692, 734: success: data.success ?? true en POST/PATCH/DELETE. HTTP favorable sin confirmación explícita se puede presentar como éxito. Requerir success===true y respuesta contractual válida, y para mutaciones comprobar resultado/identificador.
2. ALTO (contrato de autenticación incompleto): PATCH y DELETE /api/public/classifieds/:id no transportan credencial de titular; creación envía userToken en cuerpo, generado por Date.now/Math.random y guardado en localStorage. Reconciliar diseño seguro de titularidad con backend PERP; no asumir propietario verificado.
3. MEDIO: ClassifiedCreateModal admite image/* y 6 archivos de hasta 5 MB convertidos a data URLs. Requiere contrato seguro de almacenamiento; nunca admitir carga pública insegura ni asumir aceptación backend.
4. MEDIO: casos de suite HTTP simulado no acreditan enlace real entre frontend y backend de PERP, ni persistencia real; tests estáticos inspeccionan cadenas.
5. El reporte GAS declara riesgo de integración 'nulo', lo que no está acreditado; integración real y coexistencia con cambios H01-H04 pendientes.

## Situación conjunta
W1 consolidación a16ca710 sigue BLOQUEADA por H01 alto y H02-H04 medios señalados por auditoría independiente W2.
PERP backend work/enc-classifieds-backend-001 estaba aún en SHA base al verificar por última vez; esperar SHA real.
NO modificar main, ia-desarrollo, staging ni producción.
Prioridad de Coordinación: revisar código backend PERP y contrato, luego corregir frontend/API y ejecutar pruebas cruzadas seguras, sin gastar cuota de GAS hoy.
En la bitácora previa docs/coordination/ENCARMEN_CONTINUIDAD_2026-10-29.md se conserva el contexto general.
