# ENC-SEO-ROUTES-001 — Rutas públicas, soft-404 y categorías

**Coordinación:** 01 — Nia  
**Repositorio:** `dJeoMed78/Encarmenorg`  
**Issue relacionado:** #85 — ENC-SEO-INDEXING-001  
**Rama:** `work/enc-seo-routes-001-nia`  
**Base:** `main` — `65cc5f85389639d72f5101c8bc20eb488a247beb`  
**Estado:** implementación preparada para revisión independiente; no integrada ni desplegada en producción.

## Hallazgos verificados

1. `/api/businesses/empresa-3235` devuelve HTTP 404 porque no existe un negocio con ese identificador.
2. Antes de esta corrección, `/empresa/empresa-3235` devolvía el shell de la SPA como HTTP 200 y mostraba el directorio general (soft-404).
3. El slug publicado de Uniformes Cd del Carmen es `uniformescddelcarmen`; `uniformesccddelcarmen` no existe en el API.
4. Las rutas de categoría de inmuebles y automotriz mostraban el directorio general sin activar el filtro solicitado.

## Cambios incluidos

- Responder HTTP 404 + `X-Robots-Tag: noindex, nofollow, noarchive` para fichas empresariales inexistentes.
- Resolver slugs de categorías principales y aplicar el filtro correspondiente en carga directa y navegación atrás/adelante.
- Responder HTTP 404 para categorías inexistentes.
- Inyectar title, description, Open Graph y Twitter metadata específicos para las categorías.
- Marcar `*.hostingersite.com` como noindex por cabecera y meta, sin cambiar el canonical oficial `https://encarmen.org`.

## Pruebas requeridas

- `node --import tsx --test tests/enc-seo-indexing-production.test.mjs`
- `npm run build --if-present`
- Verificar en preview las dos categorías del reporte, ficha válida, slug inexistente y categoría inexistente.
- Confirmar cabecera `X-Robots-Tag` y meta robots noindex en Hostinger preview.
- Confirmar que canonical de preview apunta a `https://encarmen.org`.

## Límites de seguridad

- Solo GET/HEAD durante la verificación pública.
- Sin cambios a bases de datos, contenido de empresas, DNS, Cloudflare, Hostinger, secretos ni producción.
- No integrar ni publicar en `main` hasta revisar CI y el comportamiento del preview.
- La validación de Search Console y el diagnóstico del 403/5xx se registran por separado en Issue #85.
