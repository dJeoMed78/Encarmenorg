# ENCARMEN — Correcciones directas de La Jefa al backend PERP
Fecha: 2026-10-29
Origen: work/enc-classifieds-backend-001, SHA 49b8e52b2c594a0bc0bc9b9b261410392106febc
Rama correctiva: coord/encarmen-classifieds-backend-fixes-001
Estado: IMPLEMENTADO/PUBLICADO CON VERIFICACIÓN ESTÁTICA PARCIAL. NO INTEGRADO, NO DESPLEGADO, NO PROBADO CON MARIADB REAL.

## Hallazgos comprobados en código original y correcciones
1. GET /api/public/classifieds ejecutaba UPDATE para marcar expirados, y cada ruta llamaba ensureSchema() con CREATE TABLE IF NOT EXISTS. Se eliminaron estos efectos automáticos. La tabla se debe preparar por una operación aprobada y aislada; GET filtra expiración por expires_at > NOW() sin escribir.
2. POST retornaba éxito y classified pero omitía ownerToken recién creado, necesario para el PATCH/DELETE autenticados por token. Ahora el POST 201 de una creación nueva incluye ownerToken; replay idempotente no lo reexpone.
3. validateClassifiedInput y validateClassifiedPatch aceptaban propiedades desconocidas. Ahora rechazan campos extra y tipos de datos inesperados.
4. update comprobaba solo título/estado tras SQL; ahora contrasta también descripción y precio. Persisten limitaciones sobre anular un precio (SQL COALESCE), y errores de red/reintento.
5. getDb() aplicaba operador ?? a deps.pool, por lo que la inyección explícita de null volvía a getPool() real. Ahora respeta null y deniega sin pool.
6. Categorías de backend diferían de los IDs de GAS; se alinearon con ['inmuebles','vehiculos','empleos','compra-venta','mascotas','eventos']. Salida pública incorpora aliases phone/whatsapp/image para UI.
7. Antes se admitían referencias multimedia internas arbitrarias en nuevos anuncios; se deniegan hasta disponer de política segura de carga y propiedad.

## Pruebas añadidas
- GET no escribe, no crea tablas y no elimina registros.
- Validación cerrada de campos.
- ownerToken sólo en primer POST.
- Categorías reales de frontend y campos públicos esperados.
- Bloqueo de imagen no habilitada.
- Se ajustó test de expiración para reflejar filtrado de lectura sin UPDATE.

**No se ha ejecutado el conjunto de pruebas, TypeScript ni build en esta sesión.** Estas pruebas son código agregado, no evidencia de ejecución. No hay MariaDB desechable verificada.

## Bloqueos todavía abiertos
- El módulo no está conectado a server.ts en su propia rama; aplicar script en una rama de integración sólo después de revisión. El middleware Staging bloquea mutaciones de /api/public/classifieds. NO abrirlo sin autorización y aislamiento demostrado.
- Token de titular se entrega una sola vez; ante pérdida de la respuesta del primer POST, el reintento idempotente no recupera el token. Resolver mediante un mecanismo seguro de reclamación/identidad, no revelándolo a cualquier portador del idempotencyKey.
- No hay prueba real MariaDB, HTTP completo, concurrencia, autorización sólida con cuentas, cuotas antiabuso ni administración de esquema.
- El código GAS se corrigió de forma independiente en coord/encarmen-gas-client-fixes-001; ambos requieren pruebas conjuntas reales.
- H01–H04 de la consolidación continúan bloqueando integración.
- No modificar main, ia-desarrollo, Hostinger, producción ni Staging sin autorización específica.
