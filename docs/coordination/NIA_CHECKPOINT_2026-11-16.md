# ENCARMEN — Checkpoint de transición NIA, 2026-11-16

**Estado:** cierre de conversación; continuidad en nuevo chat. **Coordinación:** NIA / 01. **Fuente técnica oficial:** GitHub. **Memoria narrativa:** Drive, carpeta `memoria NIA` (ID `1Qy7yHshDTRsKg3XE-7DsuqjNhw2mbD6L`). No sobrescribir memorias históricas.

## Últimos cambios verificados

- `ia-desarrollo` HEAD verificado tras PR #110: `ff6a0b2752f65bd34a35916a5f6263709f3be337`.
- PR #117 (GAS-004, Issue #6): **fusionado** a `ia-desarrollo` mediante `01539e11a525ce42b9d9c7f4b062e5a11f4ce961`. Solo documentación; seis filtros y protecciones ya existían. Se corrigieron afirmaciones no demostradas de pruebas MariaDB. Issue #6 **abierto** por falta de validación UI/DB Staging.
- PR #110: **fusionado** a `ia-desarrollo` mediante `ff6a0b2752f65bd34a35916a5f6263709f3be337`; rutas /media históricas y fallback a archivos/MariaDB. CI del PR aprobada; falta verificar imágenes reales en Staging. No equivale a eliminación integral de WordPress/WooCommerce.
- Issue #43 DENUE: implementación integrada previamente por PR #94; PR documental #114 fusionado en `e9557f823f1984138e0fb77d11783b5fef23464c`. El workflow de despliegue se reactivó mediante commit no funcional `b75df024282dd1aa151c16ee022126e374f75aa1`; ejecución #43924140216 **cancelada** al llegar nuevo despliegue. Última ejecución de despliegue #43924381277 para SHA `ff6a0b2...` estaba **in_progress** en última consulta. No afirmar éxito ni cierre sin consultar Actions y comprobar SHA servido.
- CI de medios #43924381251 para SHA `ff6a0b2...`: **success**.
- Último despliegue Staging histórico completado con éxito antes de estos cambios: #43913239358 SHA `792476f24fac377bf6b305d195f202ec20eb0f39`. El endpoint `/encarmen-release.json` dio anteriormente `RELEASE_IDENTITY_NOT_VERIFIED` y un reporte posterior HTTP 503: **identidad de release pendiente de comprobar**.
- No se modificó `main` ni producción.

## Pendientes priorizados (NO CERRADOS)

**P0 / Staging:**
1. Consultar resultado final de Actions #43924381277, sus jobs y logs. Si falla, diagnosticar, corregir en rama autorizada, repetir y verificar; si termina, comparar SHA real en Staging y footer con commit esperado. No confundir éxito de Actions con prueba HTTP.
2. Issue #43: comprobar `INEGI_DENUE_TOKEN` sin revelar secreto, consultas DENUE reales a Ciudad del Carmen, fichas, UI admin autenticada, aislamiento DB Staging `u293982346_encarmentest`, respaldo, escritura controlada/COMMIT/readback y cierre de ventana. No publicar negocios automáticamente. Cerrar solo con evidencia.
3. Issue #6: probar seis filtros (all, phone, no-phone, whatsapp, no-whatsapp, none), búsqueda, categorías, paginación, contadores sobre conjunto completo, protección de contactos y readback real en Staging; registrar evidencia y cerrar si pasa.
4. PR #110: verificar que imágenes históricas reales se sirven correctamente por `/media/*` en Staging y no se pierden; completar retiro de referencias heredadas de WordPress/WooCommerce sin romper fotos ni datos.

**P1 / revisión técnica:**
5. PR #104: retiro de handlers WooCommerce, **conflictos**, no integrar sin reconciliación y CI. No restaurar código obsoleto.
6. PR #111: README GAS-001 contiene menciones WooCommerce y documentación potencialmente desactualizada; no integrar sin corregir.
7. PR #55 y borrador #68: cambios antiguos Radar Empresas, riesgo de sobrescribir implementación moderna; revisar diff contra HEAD, no integrar ciegamente.
8. PR #93 (INT-007): SQL-first readback, borrador con riesgos de rutas CRUD, falta CI y pruebas.
9. PR #72 y #65: borradores marcados expresamente NO INTEGRAR, solo lectura/diagnóstico.
10. PR #88 y #90: SEO hacia `main`, **no fusionar en producción sin revisión/autorización específica**; revisar indexación de dominios `encarmen.org` y `empresasencarmen.com`.
11. Seguimiento a otros pendientes de integridad, administración y registros públicos desde Issues y documentos oficiales; no asumir resueltos.

## Instrucciones para sucesora

1. Si el propietario escribe «TU ERES NIA», seguir protocolo de recuperación Drive/GitHub y crear memoria nueva de la conversación sin sobrescribir anteriores. Consultar `docs/coordination/NIA_REACTIVACION_TU_ERES_NIA.md` y cuatro documentos oficiales de inicio/identidad/metodología/registro maestro.
2. Revalidar HEAD, PRs, Issues, Actions, HTTP Staging en tiempo real antes de operar; este checkpoint es fotografía histórica.
3. Integrar solo entregas terminadas y verificadas; ejecutar Staging hasta cierre, no quedarse en instrucciones para W1/GAS cuando herramientas propias permitan operar.
4. No alterar `main`, producción, secretos ni datos sin autorización; Staging requiere verificar aislamiento antes de escribir. No simular éxito ni cerrar Issues sin evidencia.
5. Mantener doble publicación GitHub/Drive, actualizar exclusivamente memoria de conversación nueva y checkpoints de coordinación.
