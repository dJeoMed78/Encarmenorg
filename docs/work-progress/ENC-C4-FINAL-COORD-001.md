# ENC-C4-FINAL-COORD-001 — Corrección directa de Jefa / puerta de integración
Fecha: 2026-10-29. Propietario autorizó expresamente corregir tres defectos y **considerar** integración tras verificación.
Base de esta rama: W1 R1 `797fb5e918c2228721cb099d94c5a2914201a5f5`; rama `coord/enc-c4-final-001`.

## Cambios realmente publicados
Archivo funcional `src/components/AdminPromotionsTab.tsx`:
1. **Preview/servidor**: tras respuesta de subida validada se escribe la URL en promoImage y se vacía promoImageData; así `src={promoImageData || promoImage}` muestra la imagen remota efectiva y el payload no porta base64 temporal. Ref `confirmedImage` conserva último estado confirmado o histórico.
2. **Continuidad tras upload fallido**: la operación muestra error, restablece `promoImage`/`promoImageData` desde la última imagen confirmada y recupera `imageMode` y `promoImageUnconfirmed=false`; permite guardar otros campos después de terminar el fallo, sin enviar la vista previa fallida ni perder imagen histórica; mientras la carga está pendiente continúa bloqueada.
3. **Doble envío**: `savePending` es un ref sincrónico que bloquea segundo submit durante la primera solicitud; se libera en finally, también ante rechazo. Se conserva `isSaving` de React para UI.

En `tests/staging-candidate-closure-004-r1.test.mjs` se actualizó el caso de URL inválida para verificar que NO persiste la preview pero sí puede salvar el histórico previo; se agregaron 3 pruebas de React/jsdom para URL remota mostrada, recuperación de histórico tras fallo y doble submit.

## Verificación independiente
Se recuperó de GitHub el código publicado en esta rama y se ejecutaron mediante función JavaScript de V8 aislada **3 escenarios dinámicos directos** con handlers reales extraídos: subida exitosa limpia base64 y preserva la nueva URL, fallo subsecuente restaura la última imagen confirmada, y dos submit simultáneos originan solo 1 llamada al servicio. **3/3 PASS**. No se manipuló el servidor real.
**No** se ejecutó aquí la suite `node --import tsx --test ...`, `npm run lint`, Vite completo, browser real, MariaDB, Hostinger, SQL ni deployment; no se atribuyen los 188 PASS heredados como nueva ejecución de Coordinación. Las pruebas nuevas están publicadas pero **pendientes de ejecutar** en checkout con dependencias.

Comandos de verificación seguros:
```sh
node --import tsx --test tests/staging-candidate-closure-004-r1.test.mjs
npm run lint
node_modules/.bin/vite build --outDir /tmp/enc-c4-final-001-frontend
```

## Dictamen de integración
La rama `ia-desarrollo` está en SHA `0d231cb2779b7a14d8d336fc2f4de3782663c738`, **24 commits por detrás del SHA W1 R1**, con 0 commits divergentes según comparación GitHub. Incorporar `coord/enc-c4-final-001` mediante fusión completa introduciría no solo estos 3 cambios, sino módulos de autenticación/seguridad, backend, contactos, registro público, bundles y otras tareas anteriores. El frontend `dist` está versionado en el conjunto anterior y puede requerir regeneración coherente con la fuente final.

**No integrar automáticamente a `ia-desarrollo` mientras no se ejecuten las pruebas del SHA final ni se verifique que la integración no dispare un despliegue automático o altere recursos compartidos.** Preparar revisión de integración puntual/PR en cuanto estas verificaciones sean posibles. No se autoriza Staging/producción por esta tarea.

Las incidencias del propietario siguen abiertas hasta aceptación. No revertir datos reales ni tocar SQL. Revertir commits del ajuste solo si se comprueba regresión; no regresar a candidato C4 con defectos conocidos.
