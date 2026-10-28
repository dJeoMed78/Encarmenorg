# ENC-RADAR-FIX-001 — Corrección aislada y bloqueo backend

**Responsable:** coordinación principal. **Rama:** coord/radar-classifieds-fix-001, nacida de ia-desarrollo. **Commit de código:** 6d22bc15e23d3d7a21d48159a5af207988bfc804.

## Implementado
Archivo único: src/components/AdminClassifiedsTab.tsx.
- Aprobación individual: no eliminar candidato ni notificar éxito antes de respuesta exitosa con objeto classified; mostrar error y conservar candidato ante fallo.
- Aprobación masiva: exigir success y count igual a cantidad solicitada antes de retirar candidatos; informar fallo o lote incompleto, conservando selección y lista para conciliación.
- Impedir iniciar una aprobación si otra individual/masiva está en curso; no borrar notificación con temporizador anterior.
- Sin cambios en BD, server.ts, src/services/api.ts, ia-desarrollo, main, Hostinger ni Staging.

## Bloqueo crítico descubierto por inspección backend
server.ts, rutas /api/classifieds/approve-candidate y /api/classifieds/batch-approve:
- Se inserta primero en classifiedsCache.
- fs.writeFileSync falla y su excepción es ignorada.
- Si MariaDB está activa, dbSaveClassified falla y la excepción también se ignora.
- Aun así ambas rutas devuelven success:true (y objeto/count).
**Consecuencia:** incluso el frontend corregido puede mostrar éxito falso porque el contrato del backend no garantiza persistencia.
**Requerido:** hacer que la persistencia sea condición de éxito; transacción o estrategia de consistencia entre MariaDB/cache/JSON; evitar escrituras parciales y duplicados al reintentar; controlar autorización y fallos; tests de MariaDB fallida, disco fallido, lote parcial y concurrencia. Nunca simular éxito.

## Bloqueo de concurrencia de desarrollo
ENC-REVIEWS-006 de Work está modificando server.ts y src/services/api.ts. No editar esos archivos desde esta rama hasta que la coordinación haga integración controlada. No mezclar automáticamente cambios.

## Verificación
- Lectura de código GitHub: SÍ.
- Commit aislado de frontend: SÍ.
- Build, TypeScript, pruebas automatizadas y navegador: NO EJECUTADOS en esta intervención.
- Pruebas de persistencia MariaDB y Staging: NO EJECUTADAS.
**Estado:** frontend corregido por inspección estática; NO APTO para integrar/desplegar sin corregir backend y probar.


## Actualización — corrección del Radar de eventos (rama aislada)
- Commit `5b384ba1ca5c26f2f1cff6532f39a181e13ba856`: src/components/AdminEventsTab.tsx deja de presentar como éxito las excepciones de patrón/proxy; reporta errores reales de escaneo/búsqueda; maneja fallo y conteo incompleto en publicación de candidatos.
- Commit `3d13ccc475a91e845f10040ed5794698ec813a47`: src/services/eventsService.ts elimina tres fallbacks engañosos: (1) escaneo que reportaba `newEventsAdded: 1` aunque fallara la red, (2) búsqueda que reciclaba eventos locales como resultados de Radar, (3) publicación que guardaba únicamente en el navegador y devolvía `success:true`. Ahora exige respuesta HTTP correcta y contrato de servidor, o informa error.
- Comparación GitHub `ia-desarrollo...coord/radar-classifieds-fix-001`: **tres commits**, únicamente `src/components/AdminClassifiedsTab.tsx`, `src/components/AdminEventsTab.tsx` y `src/services/eventsService.ts`. No se tocaron `server.ts` ni `src/services/api.ts` de Work.
- **No se han ejecutado** TypeScript, build, pruebas automatizadas ni navegador sobre esta rama. Las rutas del servidor siguen requiriendo auditoría de persistencia y autorización. **NO APTO PARA INTEGRACIÓN**.
- Nota de diseño: se preserva el almacenamiento local de eventos recibidos con éxito del servidor como caché de presentación; se eliminan las simulaciones de éxito cuando falla el servidor.
