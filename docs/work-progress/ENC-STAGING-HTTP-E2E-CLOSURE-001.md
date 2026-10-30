# ENC-STAGING-HTTP-E2E-CLOSURE-001 — W5

## Checkpoint 1 — inspección (2026-10-30 UTC)
Base real ia-desarrollo: `4407e6aeb08b52cc750c952735467a0e04fe19cc`.
Rama creada tras verificar ausencia: `work/enc-staging-http-e2e-closure-001`.
Repositorio confirmado por conector y git ls-remote/clone. Sin cambios a main/ia.

Leídos CONTEXTO_ENCARMEN.md, WORK_RESULTADOS.md, fuentes requeridas y package.json.
WORK_INSTRUCCIONES.md y registro maestro no existen en base; consultados en
origin/coord/encarmen-work-control-001. No AGENTS.md en checkout.

Orden real: contención de descargas → registerAdminSecurity (parser/login propio,
provider ENC_ADMIN_CREDENTIALS_JSON, tokens X-Encarmen-Admin-Token, permisos/origen)
→ guard Staging → parser JSON general → GET estricto → rutas Staging → legado.
POST /api/submit-business y PATCH /api/businesses/:id usan stagingBusinessStore,
transacción, marcador/grants/esquemas, InnoDB/PK, lock de altas, readback y COMMIT.
GET /api/businesses exige lectura MariaDB fresca; health informa escrituras GENERALES,
no la capacidad empresarial. No inferir capacidad empresarial de ese indicador.
Ruta pública separada requiere PUBLIC_REGISTRATION_ENABLED; no se habilitará.
Legado POST retirado (503); PATCH Staging es interceptado antes del legado.
Rutas no empresariales bloqueadas por guard/autorización.

Riesgos encontrados para ensayar: pruebas actuales de HTTP usan SQL simulado;
readback de store solo compara contactos, no otros campos; gestión de conexiones
ante rollback/lock/commit inciertos merece regresión. Ningún defecto se declara
confirmado sin reproducción. No se ejecutan scripts históricos.

Historial revisado: cinco ramas coord solicitadas, resultados runtime map,
HTTP persistence, business window, write guard y SQL transaction; scripts de
instancia temporal, activación/restauración de ventana y transacción auditados.
La sonda anterior esperaba health.environment correctamente, pero no logró
loopback; limpieza dependía de recibir ID, insuficiente ante interrupción tras
COMMIT. La prueba SQL validaba identidad DESPUÉS de ejecutar el bloque completo;
no es patrón seguro para reutilizar. Los scripts de activación modifican .env
remoto: excluidos de esta tarea. Runtime map usaba separación de NUL incorrecta.
Ningún script/workflow remoto ejecutado ni copiado.

GET público 2026-10-30T19:33Z: health 200, staging, readOnly=true,
writesPermitted=false, mariadb, 207 negocios. /api/version devolvió
6618e1d53de1f229-1793375896229; no contiene SHA Git verificable. Por ello no se
certifica que Hostinger ejecute el SHA inspeccionado; evidencia histórica no basta.
No hubo solicitudes a producción ni cambios remotos.

Entorno: Node 24.19.0; Docker local 28.4.0; imagen mariadb:11.4 descargada,
digest sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620.
Primer clone falló por sandbox de red; con permiso de red funcionó.
npm ci FALLÓ por lockfile preexistente incompleto (dependencias opcionales).
Para continuar: npm install --no-package-lock --ignore-scripts, sin cambiar
manifiestos. Esta instalación no equivale a npm ci exitoso.

Siguiente: harness de servidor real compilado en directorio temporal sin .env,
MariaDB efímera sin datos reales, cuenta SQL mínima, pruebas HTTP/SQL y limpieza.
No integración/despliegue/aprobación.
