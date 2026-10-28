# ENCARMEN — Empaquetador Estático para Demostración (Cloudflare Pages)

**ID de Tarea:** ENC-DEMO-STATIC-PACKAGER-001  
**Ejecutor:** 04 — Google AI Studio (Trabajador 3)  
**Destinatario:** Coordinación Principal (01 — ChatGPT)  
**Estado:** Implementado y Verificado (12/12 pruebas superadas)

---

## 1. Visión General

El **Empaquetador Estático de Demostración** (`scripts/package_static_demo.mjs`) es una herramienta CLI automatizada, determinista e independiente diseñada para procesar el directorio de compilación de frontend (`dist/` de Vite/React) y generar un paquete estático seguro y listo para su distribución en **Cloudflare Pages**, sin riesgo de fuga de credenciales, esquemas de bases de datos o archivos de configuración de producción.

---

## 2. Principios y Políticas de Seguridad

### 2.1. Política Estricta de Inclusión (Allowlist Positiva)
En lugar de únicamente filtrar extensiones conocidas (blacklist), el empaquetador utiliza una **lista blanca estricta** de tipos MIME y extensiones de archivo seguras:
- **Documentos y Scripts:** `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.map`, `.txt`, `.xml`, `.webmanifest`, `.manifest`.
- **Datos Estructurados Públicos:** `.json` (excluyendo patrones de nombres sensibles como `*config*.json`, `*secret*.json`, `*admin*.json`, `*db*.json`).
- **Imágenes y Gráficos:** `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.ico`, `.gif`, `.avif`.
- **Tipografías y Multimedia:** `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`, `.mp4`, `.webm`, `.mp3`.

Cualquier archivo cuya extensión o tipo no esté explícitamente en la lista blanca es rechazado y registrado en el reporte.

### 2.2. Rechazo Inmediato de Archivos Sensibles y del Entorno
Se identifican y bloquean activamente:
- **Scripts y Dumps SQL:** `.sql` (por ejemplo, scripts de inicialización MariaDB como `hostinger_mariadb_setup.sql` o backups en `public/`).
- **Variables de Entorno:** `.env`, `.env.*` (claves secretas, contraseñas).
- **Archivos de Respaldo y Compresión:** `.zip`, `.tar`, `.gz`, `.tgz`, `.7z`, `.rar`, `.bak`, `.swp`, `.dump`.
- **Llaves Privadas y Certificados:** `.key`, `.pem`, `.crt`, `.cer`, `.p12`, `.pfx`, `id_rsa*`, `id_ed25519*`.
- **Bases de Datos Locales:** `.sqlite`, `.sqlite3`, `.db`, `.mdb`.
- **Archivos Ocultos:** Cualquier directorio o archivo que comience con un punto (`.git`, `.github`, `.secret`, etc.).
- **Symlinks Externos y Path Traversal:** Se valida la resolución de rutas mediante `fs.realpathSync` y `path.resolve` para evitar symlinks que apunten fuera de la raíz del directorio de entrada o secuencias de escape (`..`).

### 2.3. Detección Heurística de Secretos en Contenido
Antes de emitir cualquier archivo hacia el paquete final, el empaquetador analiza el contenido de archivos de texto (`.html`, `.js`, `.mjs`, `.css`, `.json`, `.txt`, `.xml`) evaluando patrones de:
1. Bloques de llaves privadas (`-----BEGIN [RSA|EC|OPENSSH] PRIVATE KEY-----`).
2. URIs de conexión a bases de datos con usuario y contraseña (`mariadb://user:pass@host`, `mysql://...`, `postgres://...`, `mongodb://...`).
3. Asignaciones explícitas de contraseñas de bases de datos (`MARIADB_PASSWORD = "..."`, `DB_PASSWORD = "..."`).
4. Tokens de autenticación y llaves de API conocidas (AWS `AKIA...`, Stripe `sk_live_...`, GitHub tokens, Bearer tokens).

**Comportamiento ante detección:**
- En modo estricto (`strictSecrets: true`, por defecto), cualquier secreto clasificado como `CRITICAL` aborta inmediatamente la ejecución con código de salida `2`, impidiendo la generación o entrega de un paquete comprometido.

---

## 3. Límites Técnicos del Análisis Heurístico (Regex vs. AST)

Es crítico tener en cuenta las fronteras de inspección en bundles minificados:

| Característica | Análisis por Expresiones Regulares (Regex) | Análisis por Árbol de Sintaxis Abstracta (AST) |
|---|---|---|
| **Velocidad de ejecución** | Extremadamente rápida (<5 ms para bundles completos). | Moderada (requiere parsear todo el AST con Babel/SWC). |
| **Identificación de patrones directos** | Alta efectividad en URIs, llaves API con prefijos fijos (`sk_live_`, `ghp_`, `AKIA`) y bloques PEM. | Alta efectividad si los literales se mantienen como strings continuos. |
| **Código ofuscado / concatenado** | Vulnerable si un secreto se divide dinámicamente: `'sec' + 'ret_pass'`. | Capaz de resolver concatenaciones de literales simples (Constant Folding), pero no expresiones complejas en runtime. |
| **Minificación agresiva** | Si el minificador reemplaza nombres de variables (`DB_PASSWORD` -> `a`), las regex que buscan identificadores fallan. | Permite rastrear flujos de variables y llamadas a funciones (`fetch(..., { headers: { Authorization: ... } })`). |
| **Sobrecarga de dependencias** | Cero dependencias adicionales (usa el motor RegExp nativo de Node.js). | Requiere bibliotecas pesadas de parsing (p. ej., `@babel/parser`, `acorn`, `@swc/core`). |

**Recomendación de arquitectura:**  
El empaquetador implementa detección preventiva de alta velocidad. Para código en producción, la regla dorada de aislamiento sigue siendo **nunca inyectar variables de servidor en el bundle del cliente** (mediante la regla de Vite que solo expone variables explícitamente prefijadas con `VITE_`).

---

## 4. Estructura del Paquete Generado (`dist-demo/`)

Una ejecución exitosa del empaquetador produce la siguiente estructura en el directorio de salida:

```
dist-demo/
├── index.html                 # Punto de entrada validado (HTML5 con raíz de React)
├── _redirects                 # Regla SPA de Cloudflare: /* /index.html 200
├── _headers                   # Cabeceras de seguridad y caché estático
├── manifest.json              # Manifiesto JSON criptográfico con metadatos y hashes
├── SHA256SUMS                 # Checksums estándar SHA-256 de todos los artefactos
├── packaging-report.json      # Auditoría completa (archivos escaneados, incluidos y rechazados)
└── assets/                    # Bundles JS, CSS e imágenes autorizadas
    ├── index.js
    └── index.css
```

### 4.1. Configuración de Cloudflare Pages (`_redirects` y `_headers`)
- **`_redirects`:**  
  ```
  /*    /index.html   200
  ```
  Garantiza que cualquier ruta del SPA (por ejemplo, `/negocios`, `/clasificados`, `/eventos`) sea atendida por el frontend en el navegador sin generar errores 404.
- **`_headers`:**  
  Configura `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, y caché inmutable de 1 año (`max-age=31536000, immutable`) para `/assets/*`.

---

## 5. Instrucciones de Uso

### 5.1. Comandos npm
- **Ejecutar empaquetado de demostración:**
  ```bash
  npm run package:demo
  ```
- **Ejecutar suite de pruebas de validación:**
  ```bash
  npm run test:packager
  ```

### 5.2. Opciones de Línea de Comandos
```bash
node scripts/package_static_demo.mjs [opciones]
```
- `--input <dir>`: Directorio de entrada (por defecto: `./dist`).
- `--output <dir>`: Directorio de salida (por defecto: `./dist-demo`).
- `--no-strict-secrets`: Desactiva el aborto crítico ante detección de patrones (útil solo para depuración controlada).
- `--no-redirects`: Omite la generación del archivo `_redirects`.
- `--no-clean`: No vacía el directorio de salida antes de empaquetar.
- `--help, -h`: Muestra el menú de ayuda.

---

## 6. Procedimiento para Publicación Futura en Cloudflare Pages

Cuando Coordinación Principal autorice la publicación externa, existen dos vías directas para desplegar la carpeta generada (`dist-demo`):

### Opción A: Direct Upload sin conexión de repositorio (Recomendada para demos independientes)
1. **Compilar y empaquetar:**
   ```bash
   npm run build
   npm run package:demo
   ```
2. **Subida mediante Cloudflare Wrangler CLI:**
   ```bash
   npx wrangler pages deploy dist-demo --project-name encarmen-demo
   ```
   *Ventajas:* No requiere conectar el repositorio de GitHub ni conceder permisos de acceso a código fuente.

### Opción B: Subida Manual vía Dashboard de Cloudflare
1. En el panel de Cloudflare Pages, seleccionar **Create a project** > **Direct Upload**.
2. Arrastrar la carpeta `dist-demo/` (o su equivalente en `.zip` empaquetado exclusivamente desde dicha carpeta).
3. Cloudflare Pages asigna inmediatamente una URL HTTPS tipo `https://encarmen-demo.pages.dev`.

---

## 7. Resultados de la Suite de Pruebas Automatizadas

La suite `scripts/test_package_static_demo.mjs` valida 12 escenarios independientes con fixtures sintéticos aislados:

1. **Caso 1:** Bundle estático válido -> Aprobado con generación de `_redirects`, `_headers`, `manifest.json`, `SHA256SUMS` y `packaging-report.json`.
2. **Caso 2:** Detección y rechazo de archivos `.sql` (`hostinger_mariadb_setup.sql`, `db_dump.sql`).
3. **Caso 3:** Detección y rechazo de archivos de entorno `.env` y `.env.production`.
4. **Caso 4:** Detección y rechazo de backups y compresión (`.zip`, `.tar.gz`, `.bak`).
5. **Caso 5:** Detección y rechazo de llaves privadas y certificados (`.key`, `.pem`, `id_rsa`).
6. **Caso 6:** Exclusión estricta de directorios ocultos (`.git`, `.secret`).
7. **Caso 7:** Bloqueo de escapes por path traversal (`../`).
8. **Caso 8:** Detección y rechazo de enlaces simbólicos (symlinks) externos.
9. **Caso 9:** Aborto con código de salida `2` ante credenciales o connection strings detectadas dentro de código `.js`.
10. **Caso 10:** Inmutabilidad del directorio de origen comprobada mediante suma criptográfica antes y después del proceso.
11. **Caso 11:** Determinismo e idempotencia verificados: ejecuciones repetidas producen sumas SHA-256 idénticas.
12. **Caso 12:** Control de fallo ante compilación incompleta (ausencia o invalidez de `index.html`) con código de salida `1`.
