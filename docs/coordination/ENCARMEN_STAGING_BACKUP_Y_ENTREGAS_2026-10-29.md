# ENCARMEN — Entregas W1/W2/PERP y respaldo real Staging (29 oct 2026)

## Verificación de entregas
- **W1**, rama `work/enc-integration-validation-001`, HEAD confirmado `c34aa4318d95b86b0c53378180223c5c088c5d4a`. Informó 128/128 suites locales, TS y builds OK; pruebas navegador local bloqueadas. No integrado ni desplegado.
- **W2**, rama `work/enc-browser-e2e-001`, HEAD confirmado `5f188b199f87e745e44bef928137e7c09cb5f941`. Reportó navegador real 164/165; botón SOS recortado a 320px.
- **PERP**, rama `work/enc-mariadb-ci-real-002`, HEAD confirmado `e1ed1189f62087be7f149ae0e5495f786b55f87a`. Su CI original https://github.com/dJeoMed78/Encarmenorg/actions/runs/40952030255 FALLÓ por un import inexistente antes de ejecutar las pruebas. No afirmar PASS de PERP original.

## Consolidación directa coordinación
Rama `coord/encarmen-staging-candidate-001` creada desde el SHA W1.
- Corrección `src/components/Navbar.tsx` para mostrar SOS y registro dentro de ancho 320px. **No se ha ejecutado Playwright nuevamente con esta corrección**.
- Incorporación del laboratorio PERP actualizado a backend W1.
- Adaptación del esquema y permisos reales de MariaDB: tablas precreadas, índices, marcador, usuarios sintéticos de mínimos privilegios, pruebas negativas separadas. Retiro de una expectativa inválida: GET no cambia estado SQL a expired, sólo filtra vencidos.
- **Resultado CI real** https://github.com/dJeoMed78/Encarmenorg/actions/runs/40960529100 — `SUCCESS`, **18/18 pruebas sobre MariaDB 11.4 desechable**. No equivale a ejecución en BD de Hostinger.

## Conectividad y primera copia de BD de Staging
- GitHub Actions autenticó por SSH en Hostinger, usuario esperado y huella ED25519 verificada:
  https://github.com/dJeoMed78/Encarmenorg/actions/runs/40957317052
- Inventario remoto de lectura localizó `/home/u293982346/domains/staging.encarmen.org`, aparte de `/home/u293982346/domains/encarmen.org/public_html`. La existencia de ambos no demuestra separación completa de infraestructura.
- Configuración privada `hbuilds/config/.env` dentro de Staging: presencia de usuario/host/contraseña y DB_NAME exacto **`u293982346_encarmentest`**, distinto de producción. No se publicaron credenciales.
- Carpeta realmente creada en servidor: `/home/u293982346/encarmen-staging-backups/{database,files,bin}`, fuera de webroot, permisos 0700. Evidencia:
  https://github.com/dJeoMed78/Encarmenorg/actions/runs/40960911014
- El backup SQL real **SÍ SE EJECUTÓ**. Archivo privado `staging-db-20261029T215244Z.sql.gz`. Logs confirmaron `SUCCESS: copia verificada, retención aplicada`; la corrida original se marcó falla exclusivamente por un `awk` de la comprobación posterior:
  https://github.com/dJeoMed78/Encarmenorg/actions/runs/40961363399
- Corrigida última comprobación y reejecutada: **workflow SUCCESS**, detectó `SKIP` por copia reciente y validó **DB_BACKUP_COUNT=1** junto con gzip, manifiesto y permisos 700:
  https://github.com/dJeoMed78/Encarmenorg/actions/runs/40961499416
- Scripts de backup y wrapper privados instalados en `/home/u293982346/encarmen-staging-backups/bin/`. La configuración SQL se lee desde Staging en la ejecución, sin publicarse en GitHub; directorio SQL privado. Intervalo mínimo 72 horas, máximo 3 instantáneas, eliminación sólo después de nueva copia válida. **Restauración en BD temporal distinta: todavía no probada.**
- Se intentó instalar crontab remoto https://github.com/dJeoMed78/Encarmenorg/actions/runs/40961696176; resultado interno `CRON_UNAVAILABLE`. **NO HAY programación periódica habilitada aún.** Para el calendario cada 3 días se necesita usar la función Cron Jobs del hPanel, otra herramienta programadora verificada o autorización explícita para mecanismo alternativo. No fingir automatización.
- Respaldo selectivo de archivos: carpeta `files/` preparada; **todavía no se ha tomado snapshot de archivos desplegados**, porque aún no se ha autorizado ningún reemplazo de archivos de Staging.

## Siguiente paso sin ciclos redundantes
1. Configurar tarea programada del backup con Hostinger hPanel (o alternativa segura) sin tocar `main`.
2. Confirmar ubicación exacta del sitio Staging y aislamiento operativo respecto a producción; tomar snapshot selectivo de los archivos que se reemplazarían.
3. Repasar sólo el diff concreto de rama candidata W1 y el contrato schema `details_json`, preparar migración reversible sólo para DB de Staging cuando se autorice.
4. Solicitar permiso **específico** del propietario para primer despliegue Staging, con reversión disponible. No crear otras auditorías generales ni esperar pruebas infinitas.
