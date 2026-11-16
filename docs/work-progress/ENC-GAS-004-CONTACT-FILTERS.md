# ENC-GAS-004 — Trazabilidad de filtros de contactos (Issue #6)

**Rama de integración:** `ia-desarrollo`  
**PR documental:** #117 (sustituye al #115, cerrado sin fusionar)  
**Alcance de este PR:** documentación de funcionalidad preexistente; no modifica código ejecutable.

## Implementación comprobada en código

- `src/utils/businessContacts.ts`: `CONTACT_FILTERS` incluye `all`, `phone`, `no-phone`, `whatsapp`, `no-whatsapp` y `none`; `contactDigits` normaliza números mexicanos; `matchesContactFilter` evalúa teléfono y WhatsApp independientemente; `contactCounts` cuenta registros; `prepareContactPatch` omite valores vacíos no destructivos y exige autorización administrativa para `clearContacts`; `contactsMatchReadback` verifica la lectura posterior.
- `src/components/AdminBusinessesTab.tsx`: se calculan `coverage = contactCounts(contactSource)` y `scopedCoverage = contactCounts(filteredBusinesses)`; el filtro de contacto se aplica después de búsqueda y filtros de negocio y antes de ordenar/paginar; la interfaz muestra opciones, conteos y avisos de contactos ausentes o inválidos.
- `tests/contacts-r2.test.mjs` y `tests/contacts-r3.test.mjs`: contienen pruebas de normalización, parches, readback, persistencia simulada y fallos de base de datos. La presencia del código de prueba no implica ejecución exitosa de cada escenario en esta revisión.

## Evidencia comprobada por coordinación

- PR #117: solo modifica este archivo de documentación.
- GitHub Actions del commit `2daf77ab315d719e88db54fcae59882aa34037f9`: comprobación `media-regressions` concluida con éxito. Esta comprobación no acredita por sí misma pruebas específicas de filtros, conexión MariaDB real o sesión administrativa de Staging.
- GAS informó `npm run build` y `tsc --noEmit` exitosos, pero no adjuntó registros independientes de esas ejecuciones.

## Pendientes de aceptación funcional

1. Probar en `https://staging.encarmen.org/control` los seis filtros combinados con búsqueda, categorías, paginación y recuentos, mediante sesión administrativa autorizada.
2. Contrastar los contadores contra registros de la fuente real y comprobar que el conjunto de negocios recibido es completo; no inferir exactitud global si la API entrega una muestra.
3. Probar sin afectar datos reales la conservación de contactos ante importaciones con campos vacíos, actualizaciones independientes y borrado explícito, con evidencia de lectura posterior en MariaDB aislada.
4. Definir con el propietario el umbral de alerta de caída abrupta de cobertura de contactos, si se requiere para cierre del Issue #6.

**Dictamen:** documentación corregida y apta para integración en `ia-desarrollo`. **Issue #6 permanece abierto** hasta validar Staging y los criterios de aceptación. No se afirma que se haya ejecutado una comparación real contra MariaDB.
