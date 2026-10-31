# ENC-STAGING-WRITE-GATE-005
Estado: diagnóstico dirigido parcial; implementación bloqueada por falta de atribución inequívoca del 503. No corregido ni desplegado.
Base documental: 3f02d0ccf82d2739d40bf89e18ce79656a00c29e, head_sha del run41153793806 que compila server.ts y publica bundle; resultado reporta DEPLOYED_STAGING_ORIGIN_GATE_ACCEPTED. HEAD posterior de rama origen:0d09e02efc9f96f0e589c4604a1dc6f61f30c1d5. No se comprobó hash vivo del bundle en Hostinger; no confundir evidencia del workflow con comparación binaria actual.

Leídos Issue12, informe permanente E2E, seguimiento de coordinación, workflow de despliegue y seis archivos prioritarios. No investigación general.

## Hallazgo reproducible
server.ts líneas218-225: providerResolver/providerVersion leen identidad privada por petición. Línea231: mutationsEnabled aún depende de process.env. mariadb.ts:1288-1289 exige stagingBusinessConfiguration(process.env) y privateStagingBusinessWindowOpen(process.env). Por tanto abrir archivo privado NO basta si el proceso arrancó con flags readonly. Login dinámico puede200 mientras guard de adminSecurity devuelve503 antes del handler. Restablecer archivo cierra la ventana adicional, pero abrirlo no actualiza los flags congelados. No es evidencia de fallo SQL.
La evidencia E2E solo publica códigos503, sin mensaje/código de respuesta ni estados de estas puertas. Otros503 posibles: motor/PK no verificados, aislamiento, excepción transaccional/readback. No atribuir definitivamente los siete503 al guard sin distinguirlos. Reinicio solicitado no acredita que todos los workers hayan recargado configuración.

## Pruebas locales ejecutadas
7 aserciones PASS usando funciones exactas stagingBusinessConfiguration y administrativeWritesReady recuperadas del SHA, cargadas con node:module stripTypeScriptTypes y datos sintéticos: readonly rechaza; flags abiertos aceptan configuración; admin switch falso rechaza aun con businessWrites=true; POST permitido solo con todas condiciones; DELETE no permitido; DB producción rechazada; restaurar readonly rechaza. Son pruebas de funciones, NO pipeline HTTP ni persistencia.
Intento esbuild usando workspace anterior falló al iniciar proceso: No such file or directory. Alternativa Node nativo ejecutada satisfactoriamente. No TypeScript global ni build acreditados. Herramienta environment_status no disponible en catálogo.

## Corrección propuesta, NO aplicada
Una única instantánea privada validada por petición para permisos empresariales, manteniendo identidad de conexión efectiva, ruta canónica, permisos0600, rechazo de symlinks/duplicados y cuatro flags explícitos. Debe alimentar también verifyStagingIsolation, que hoy recibe process.env, y revalidar antes de COMMIT. No eliminar unilateralmente stagingBusinessConfiguration ni ENC_ADMIN_MUTATIONS_ENABLED: eso debilitaría aislamiento. No cambiar credenciales jeo.
Alternativa operacional: reinicio verificado de todos los workers con flags autorizados, solo por Coordinación; no ejecutado.

## Bloqueo y siguiente acción mínima
Obtener de evidencia autorizada el cuerpo sanitizado del503 (error/message) y por petición indicadores no secretos: processConfigured,privateWindowOpen,adminMutationsEnabled,connectedDatabaseMatches y versión runtime. No publicar credenciales. Un 503 con mensaje Operación bloqueada hasta habilitar administración segura identifica el guard; códigos BUSINESS_ENGINE_UNVERIFIED/BUSINESS_PRIMARY_KEY_UNVERIFIED/READBACK identifican otras capas. Comprobar hash runtime con bundle generado por run antes de base funcional definitiva. No repetir escrituras ni reinicios ciegos.

Solo se publica este diagnóstico. Ningún archivo funcional modificado. No prueba HTTP nueva, SQL real, Hostinger, cambios de cuenta, integración ni despliegue. No main/ia-desarrollo/producción. Reversión documental por revert normal; no hay parche runtime que revertir. Pendiente causa operativa confirmada y parche con regresiones HTTP. Dictamen BLOQUEADO PARA DECLARAR RESUELTO.
Evidencia: https://github.com/dJeoMed78/Encarmenorg/issues/12 y https://github.com/dJeoMed78/Encarmenorg/actions/runs/41153793806 .
