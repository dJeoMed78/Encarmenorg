# NIA — CHECKPOINT DE CONTINUIDAD
**Fecha:** 2026-11-09 (America/Mexico_City, UTC-6)  
**Identidad operativa:** Nia — Jefa 3, Coordinación Principal 01 de ENCARMEN.  
**Memoria Drive de esta conversación:** [NIA-2026-11-09.md](https://docs.google.com/document/d/1GlBH-jeqIayumtzfjFvwPiTK2KlMUrrujV9D2bE95HU/edit)  
**ID Drive:** `1GlBH-jeqIayumtzfjFvwPiTK2KlMUrrujV9D2bE95HU`  
**Memoria anterior:** `NIA-2026-11-07.md`, ID `1EC6i3pMF-YxzXnVQnRBCaVLq2wSDrJXRwKYaNZVy2vo`.  
**Fuente recibida:** adjunto `Nia-07112026-2026-11-09.md`.

## 1. Último checkpoint recuperado

**ENC-SEO-INDEXING-001 — consolidación de dominios, canonical y rastreo de Google.**

El propietario ordenó expresamente revisar, validar, integrar en `main` y publicar en `encarmen.org`. No pedir de nuevo la autorización ya concedida para este alcance.

## 2. Estado técnico comprobado

### Producción — GitHub `main`

- PR #87: **MERGED** a `main`.
- HEAD de `main`: `1e94f16db03e2347c18d933002e25c3f79495765`.
- Run CI `42660316602`: **SUCCESS**. Job `build` completo.
- YAML vigente `.github/workflows/main_carmen.yml`: ejecuta `npm ci`, suite SEO `tests/enc-seo-indexing-production.test.mjs` y build. **No contiene SSH ni paso de despliegue a Hostinger.**
- Issue #85: **OPEN**.
- Correcciones incluidas en el commit: 301 de `empresasencarmen.com`, `www.empresasencarmen.com` y `www.encarmen.org` hacia `https://encarmen.org` conservando ruta/query; canonical fijo; sitemap único; rutas heredadas WordPress/WooCommerce con 410/404; Staging noindex; bypass de GeoIP para crawlers Google solo después de verificación DNS inversa/directa.
- No hay evidencia disponible de que Hostinger haya activado el commit. No declarar producción desplegada.

### Staging — rama `ia-desarrollo`

- HEAD actual: `830602beb0a0b59f009458c5bce8f0a22f46e46a`.
- PR #86 integrada.
- Run `42651774101`: **SUCCESS**. Job `deploy` completó identidad SSH fijada, respaldo SQL aislado, despliegue exclusivo de Staging y comprobación HTTP del SHA exacto.
- Esta prueba certifica Staging, **no** producción.

### Acceso a verificación pública / Hostinger

- La herramienta web no pudo abrir `encarmen.org`, `robots.txt` ni `sitemap.xml`; `www.empresasencarmen.com` tampoco fue accesible. El dominio raíz alternativo solo entregó metadatos sin contenido legible. No se obtuvieron códigos HTTP ni cabeceras.
- Browser connector: error de invocación.
- No hay conector de administración de Hostinger instalado; la conexión presente es Hostinger Mail.
- Se sugirió TinyFish para poder revisar el panel web de Hostinger; aún no está confirmado como conectado.
- Por tanto, despliegue Hostinger, release activo y respuestas HTTP públicas permanecen **NO VERIFICADOS**.

## 3. Otras incidencias consultadas en GitHub

- **#43 Radar de empresas:** OPEN. PR #68 OPEN/DRAFT; rama `work/enc-radar-empresas-043-final-gas`, head `ddea6e2cad06ca96b7a4a41bbff5d8bde878b96e`. No integrada ni desplegada. La auditoría previa detectó brechas de conexión MariaDB/pool, deduplicación, readback y pruebas simuladas; conservar las correcciones solicitadas y reauditar.
- **#41 Radar de clasificados:** OPEN. PR #54 abierta; falta E2E de aprobación porque no se obtuvieron candidatos reales verificables.
- **#42 Radar de eventos:** OPEN; falta validar fuentes directas, fechas y persistencia.
- **#19 Imágenes:** GitHub CLOSED (actualizado 2026-11-09 14:21 UTC).
- **#34 Calificaciones/comentarios:** GitHub CLOSED; aceptación del propietario ya confirmada.

## 4. Decisiones y salvaguardas

1. No fusionar `ia-desarrollo` completa en `main`; las ramas están divergidas. PR #87 se creó desde `main` para aislar la corrección SEO.
2. El permiso del propietario cubre publicar esta corrección en producción. Ejecutar solo el mecanismo real de Hostinger, sin ampliar el alcance.
3. No alterar bases de datos ni datos de producción para esta corrección SEO.
4. No cerrar #85 hasta comprobar release activo, 301, canonical, robots, sitemap, 410/404 y rastreo.
5. Distinguir siempre código implementado, CI, integración, despliegue, HTTP verificado y aceptación del propietario.

## 5. Siguiente acción

**Prioridad inmediata: cerrar la brecha de publicación de producción.**

1. Obtener acceso operativo al panel de Hostinger o identificar un mecanismo real de deploy existente.
2. Confirmar si Hostinger está ejecutando `1e94f16db03e2347c18d933002e25c3f79495765`.
3. Si no está activo, publicar ese commit por el mecanismo seguro existente y autorizado.
4. Validar HTTP real: 301 con ruta/query, HTML canonical, `robots.txt`, `sitemap.xml`, 410/404 de rutas heredadas y acceso de Googlebot verificado.
5. Actualizar Issue #85 y solicitar validación de las URLs afectadas en Search Console.

Después, continuar la auditoría de PR #68 / Issue #43. Producción no se debe declarar desplegada antes de obtener evidencia HTTP/Hostinger.


## Auditoría pública adicional — TinyFish (2026-11-09)

- Run navegador solo lectura: `cf4f694f-47dc-4902-90ed-750733245025`.
- El navegador de auditoría recibió pantalla Cloudflare **Attention Required!** en `https://encarmen.org` y `/sitemap.xml`. No se obtuvo código HTTP ni HTML real. Es evidencia de bloqueo para ese navegador/entorno, no de bloqueo universal ni de Googlebot.
- `https://empresasencarmen.com/prueba-seo?x=1` terminó en `https://encarmen.org/prueba-seo?x=1`, conservando ruta y query; no se observó código HTTP, por lo que no confirma 301.
- La extracción directa de `robots.txt` devolvió directivas de estilo Cloudflare (`Content-Signal`, reglas para agentes de IA y `Google-Extended`), diferentes del texto construido por `app.get('/robots.txt')` en `main`. Posible Cloudflare Managed Robots/respuesta edge; investigar configuración antes de modificarla. No se observó bloqueo explícito de Googlebot en el texto recuperado, pero falta prueba directa de Googlebot.
- Revisión estática de `server.ts`: verificación Google usa `cf-connecting-ip` o `req.ip`, DNS inverso/directo y caché positiva 30 min / negativa 2 min; bypass GeoIP solo para crawlers verificados en GET/HEAD; visitantes no MX no verificados reciben 302 a Google. Código integrado; runtime no confirmado.
- TinyFish tiene solo perfil `Default`, sin sitios autenticados. No se intentó acceder a Hostinger.
- No se modificó código, Cloudflare, Hostinger ni producción.
- Próximo paso: autorización del propietario para abrir sesión TinyFish de Hostinger en `https://hpanel.hostinger.com`; después comprobar release/medio de publicación y revisar configuración Cloudflare según evidencia.


## Auditoría pública adicional — TinyFish (2026-11-09)

- Run navegador solo lectura: `cf4f694f-47dc-4902-90ed-750733245025`.
- El navegador de auditoría recibió pantalla Cloudflare **Attention Required!** en `https://encarmen.org` y `/sitemap.xml`. No se obtuvo código HTTP ni HTML real. Es evidencia de bloqueo para ese navegador/entorno, no de bloqueo universal ni de Googlebot.
- `https://empresasencarmen.com/prueba-seo?x=1` terminó en `https://encarmen.org/prueba-seo?x=1`, conservando ruta y query; no se observó código HTTP, por lo que no confirma 301.
- La extracción directa de `robots.txt` devolvió directivas de estilo Cloudflare (`Content-Signal`, reglas para agentes de IA y `Google-Extended`), diferentes del texto construido por `app.get('/robots.txt')` en `main`. Posible Cloudflare Managed Robots/respuesta edge; investigar configuración antes de modificarla. No se observó bloqueo explícito de Googlebot en el texto recuperado, pero falta prueba directa de Googlebot.
- Revisión estática de `server.ts`: verificación Google usa `cf-connecting-ip` o `req.ip`, DNS inverso/directo y caché positiva 30 min / negativa 2 min; bypass GeoIP solo para crawlers verificados en GET/HEAD; visitantes no MX no verificados reciben 302 a Google. Código integrado; runtime no confirmado.
- TinyFish tiene solo perfil `Default`, sin sitios autenticados. No se intentó acceder a Hostinger.
- No se modificó código, Cloudflare, Hostinger ni producción.
- Próximo paso: autorización del propietario para abrir sesión TinyFish de Hostinger en `https://hpanel.hostinger.com`; después comprobar release/medio de publicación y revisar configuración Cloudflare según evidencia.
