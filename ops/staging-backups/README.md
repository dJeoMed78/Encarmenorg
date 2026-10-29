# Sistema de respaldos de Staging — ENCARMEN

**Estado:** estructura y utilidades creadas en GitHub. **No se ha extraído ningún archivo ni base de datos del servidor.** Los permisos de GitHub no incluyen automáticamente acceso a los archivos, SSH, almacenamiento o MariaDB de Hostinger.

## Directorio privado de respaldos (servidor)

Configurar fuera de `public_html`, `staging`, cualquier webroot y de GitHub:

```text
<ruta-privada-verificada>/encarmen-staging-backups/
├── database/              # respaldo SQL consistente cada 72 h, máx. 3 copias, ventana de 9 días
│   ├── staging-db-YYYYMMDDTHHMMSSZ.sql.gz
│   └── staging-db-YYYYMMDDTHHMMSSZ.json
└── files/                 # sólo archivos afectados, 1 base diaria y 7 días de retención
    └── YYYY-MM-DD/
        ├── manifest.json
        └── archivos/
```

La carpeta que GitHub muestra aquí es **sólo código/documentación** y jamás debe almacenar dumps reales, secretos ni archivos obtenidos del servidor.

## Respaldo de base de datos

Script: `ops/staging-backups/backup_staging_db.py`.

Antes de activarlo:
1. Verificar independientemente que la BD `u293982346_encarmentest`, usuario, host y recursos son de Staging y que no existe riesgo de afectar producción. Una copia lógica es de sólo lectura, pero las credenciales y el destino también requieren protección.
2. Preparar un archivo de configuración privado para la herramienta `mariadb`/`mariadb-dump` con permisos 0600, sin publicarlo en GitHub.
3. Confirmar una carpeta absoluta, privada, sin enlaces simbólicos, fuera del webroot, con permisos 0700.
4. Instalar MariaDB client, Python 3 y programar ejecución cada tres días en el **servidor aislado** (cron/servicio equivalente). El script verificará la identidad SQL y rechazará producción.
5. Ejecutar una primera copia manual, comprobar su manifiesto/hash y probar su restauración **en un laboratorio separado**, nunca directamente en Staging.
6. Activar la programación sólo tras constatar el resultado y la autorización de acceso.

Ejemplo de configuración operacional (sustituir rutas del servidor tras verificarlas):

```bash
export ENC_STAGING_BACKUP_DIR=/ruta/privada/encarmen-staging-backups
export ENC_STAGING_BACKUP_CNF=/ruta/privada/credenciales-staging.cnf
export ENC_STAGING_BACKUP_HOST_VERIFIED=yes
python3 ops/staging-backups/backup_staging_db.py
```

La ejecución sólo crea una copia si no existe una válida en las últimas 72 horas. Guarda máximo tres y elimina la más antigua **después de generar y verificar** la nueva; borra las de más de nueve días durante una rotación exitosa. Si falla el dump, conserva todas las copias anteriores.

## Respaldos selectivos de archivos

Se aplica la política ya registrada en `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md`: una copia base diaria de los archivos efectivamente modificados por cambios significativos, retención siete días, manifiesto y restauración selectiva, sin copiar el sitio completo. Los cambios menores pueden revertirse mediante Git si coincide con lo desplegado.

## Límite de la automatización

**Este commit no instala cron, no crea carpetas de Hostinger, no realiza dumps y no habilita acceso remoto.** Queda preparado para ejecutar una vez acreditados el entorno y el destino privado. No se deben poner respaldos SQL en GitHub Actions artifacts o commits sin establecer políticas de confidencialidad y duración.
