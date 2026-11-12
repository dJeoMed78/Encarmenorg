# ENCARMEN — CHECKPOINT DE COORDINACIÓN NIA
## 2026-11-12

**Coordinación:** Nia, Jefa 3 — Coordinación Principal 01  
**Propietario:** Jeo  
**Repositorio:** dJeoMed78/Encarmenorg  
**Rama de este registro:** coord/encarmen-work-control-001  
**Memoria narrativa Drive:** [NIA-2026-11-12.md](https://docs.google.com/document/d/1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4/edit)  
**Drive ID:** 1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4  
**Memoria anterior:** NIA-2026-11-09.md — Drive ID 1GlBH-jeqIayumtzfjFvwPiTK2KlMUrrujV9D2bE95HU

## 1. HEAD verificados

Consulta GitHub realizada el 2026-11-12:

| Rama | HEAD | Descripción |
|---|---|---|
| main | `65cc5f85389639d72f5101c8bc20eb488a247beb` | `fix(seo): return 404 for missing business detail routes (#88)` |
| ia-desarrollo | `830602beb0a0b59f009458c5bce8f0a22f46e46a` | `fix(seo): consolidate canonical domain and retire legacy routes` |
| coord/encarmen-work-control-001 | `b1e4a748b9fb275c25fb28cad4e936c6b3190335` antes de este checkpoint | `docs(coord): verify W1 build audit and retain runtime check` |

Issues consultados:
- [#85 SEO/indexación](https://github.com/dJeoMed78/Encarmenorg/issues/85): OPEN.
- [#41 Radar de clasificados](https://github.com/dJeoMed78/Encarmenorg/issues/41): OPEN.
- PR #54: cerrada y fusionada a ia-desarrollo el 2026-11-06, merge `d5b056fcc07838164b57bb871a4528e3f60b566c`. No confundir merge con aceptación E2E.

## 2. SEO y sitemap — estado de continuidad

El propietario indicó que empresasencarmen.com y encarmen.org apuntan al mismo sitio. En la prueba manual, escribir www.empresasencarmen.com no cambiaba la barra a encarmen.org; el status HTTP de la redirección requiere evidencia específica.

Capturas de Search Console compartidas:
- Propiedad encarmen.org: `https://encarmen.org/sitemap.xml` enviado 2026-10-03, última lectura 2026-10-22, “No se ha podido obtener”, 0 páginas en esa captura.
- Propiedad empresasencarmen.com: `http://empresasencarmen.com/sitemap.xml` figuraba Correcto con 220 páginas descubiertas y última lectura 2026-11-09.
- En esa propiedad, `https://empresasencarmen.com/sitemap.xml` también figuraba Correcto con 220 páginas; `sitemap.rss` tenía error y 0 páginas.

Evidencia histórica posterior a la desactivación de Cloudflare (NIA-2026-11-09):
- robots.txt permitió `/`, excluyó `/api/` y `/admin/`, y anunció `https://encarmen.org/sitemap.xml`.
- sitemap.xml fue recuperado directamente con 220 URLs bajo encarmen.org.
- Los dominios alternativos terminaron en encarmen.org en las extracciones; no se observó status 301/308.
- `/wp-admin/` devolvió 410; `/wp-content/uploads/` devolvió 404 para el directorio.
- Issue #85 sigue OPEN.
- El intento de entrar a Search Console se quedó en verificación Google Passkey y la vista embebida no permitió avanzar/desplazarse. El propietario pidió dejarlo pendiente. No afirmar que el sitemap fue enviado desde Search Console.

Despliegues mostrados en capturas del propietario:
- main commit `65cc5f85`, estado completado/actual, 2026-11-09 13:54:34.
- main tuvo un despliegue anterior `1e94f16`, 2026-11-09 11:02.
- ia-desarrollo commit `830602be`, despliegue Staging mostrado como completado 2026-11-09 10:10.
Estas capturas acreditan lo que mostraba el panel, no el proceso Node actualmente activo ni la persistencia real.

## 3. Auditoría Perplexity — revisión independiente Nia

El propietario indicó expresamente no aceptar sin revisión la auditoría de Perplexity. Coordinación examinó estáticamente `server.ts`, `server.js`, `src/server/adminSecurity.ts`, `src/db/mariadb.ts`, `src/services/api.ts`, `src/components/AdminClassifiedsTab.tsx`, pruebas y `package.json` en ia-desarrollo SHA `830602b`.

- PR #54 está fusionada a ia-desarrollo; Issue #41 permanece abierto.
- `server.ts` tiene autorización explícita en `POST /api/classifieds/radar-search` y compuertas de autorización/escritura en aprobaciones.
- `server.js` versionado es anterior y no contiene la misma comprobación explícita del handler radar-search. Esto no prueba que Hostinger ejecutara ese bundle antiguo.
- Confirmados en fuente: Perplexity #1, #2, #4, #5, #10, #11, #12, #14, #15, #17, #18, #19, #20, #22 y #23.
- Parciales/dependientes del runtime: #3, #6, #9, #16 y #21.
- Corregidos en fuente o no confirmados en la versión examinada: #7 y #8; #13 no se encontró como lo describía Perplexity, pero no se certificó su PASS en esa auditoría.
- Hallazgo adicional: `GET /api/img?url=` permite fetch remoto HTTP/HTTPS y sigue redirects sin allowlist/bloqueo de IP privadas/metadata ni límite explícito de bytes. Riesgo SSRF potencial confirmado por lectura estática; no se intentó explotación.

## 4. Tarea W1 — ENC-BUILD-SERVER-ARTIFACT-20261109-001

W1 realizó auditoría read-only el 2026-11-11 sobre ia-desarrollo SHA `830602beb0a0b59f009458c5bce8f0a22f46e46a`. No creó ramas/commits/PR, no modificó archivos remotos y no desplegó.

Flujo package.json:
- `prebuild`: `node scripts/update_version.cjs`
- `build`: `node scripts/update_version.cjs && npm run build:server`
- `build:server`: Vite + esbuild de `server.ts` a `server.js`, luego copia a `api/server.bundle.js`.
- `start`: `node server.js`, no recompila por sí solo.

La diferencia del bundle versionado no prueba despliegue antiguo: el workflow de Staging compila desde `server.ts` en CI y empaqueta el resultado.

### Verificación independiente GitHub Actions

Run [42651774101](https://github.com/dJeoMed78/Encarmenorg/actions/runs/42651774101):
- Workflow `ENC radars 041+043 authorized reversible staging deployment`.
- SHA `830602beb0a0b59f009458c5bce8f0a22f46e46a`; Node 22; SUCCESS.
- `npm ci` instaló 262 paquetes.
- lint PASS.
- Suites 44/44 y 37/37 PASS (81 pruebas).
- `npm run build` PASS; esbuild generó `server.js` desde `server.ts` y copió `api/server.bundle.js`.
- Paquete `server.js`, `api/server.bundle.js` y `dist` transferido por SSH a Staging.
- Release `enc-coord-830602beb0a0` activada; symlink `hbuilds/current` cambiado y `restart.txt` tocado.
- Logs `SWITCHED_TO=enc-coord-830602beb0a0`, `ENC041_STAGING_SWITCH=PASS`.
- Marcador HTTP del SHA: `ENCARMEN_STAGING_FOOTER_RELEASE_IDENTITY=PASS`.

Correcciones al informe W1:
- `npm ci` falló en la copia local Node 24/npm 11, pero CI Node 22 ejecutó `npm ci` limpio con éxito; no modificar lockfile por ese fallo aislado.
- El marcador HTTP demuestra identidad del paquete/release publicada, no hash del archivo que el proceso Node tiene cargado.
- El script de despliegue reutiliza `node_modules` de la release anterior; existe riesgo de paridad, no discrepancia demostrada.
- `update_version.cjs` se ejecuta dos veces por `prebuild` y `build`; redundancia sin defecto demostrado.
- El filtro `push.paths` no enumera package.json, package-lock.json, vite.config.ts ni scripts/update_version.cjs; mejora preventiva.

**Dictamen:** CI/build verificados; 81 pruebas PASS; paquete transferido; release Staging activada; marcador HTTP SHA PASS. **Runtime Node activo, entrypoint efectivo, hash del server.js cargado y paridad de node_modules siguen NO VERIFICADOS.** No repetir build ni despliegue para el mismo SHA solo por la fecha del bundle versionado.

## 5. Pendientes oficiales

| Prioridad | ID / Issue | Estado |
|---|---|---|
| P1 | ENC-BUILD-SERVER-ARTIFACT-20261109-001 | Parcial; verificar runtime Node, entrypoint, hash de server.js y dependencias en Hostinger Staging, solo lectura. |
| P1 | ENC-SEC-SSRF-IMG-20261109-001 | Riesgo SSRF potencial; preparar corrección aislada, allowlist de CDN, validación DNS/IP/redirect, límites y pruebas negativas. |
| P1 | Issue #41 / ENC-RADAR-CLASIFICADOS-041 | PR #54 fusionada; E2E HTTP administrativo, selección explícita, retry por modo, lotes parciales, CRUD y persistencia pendientes. |
| P1 | ENC-INT-007 | Corregir persistencia manual de clasificados y sincronización de limpieza; readback antes de éxito. |
| P2 | ENC-API-FAIL-CLOSED-20261109-001 | Estados error/unknown para estadísticas, mantenimiento y analíticas. |
| P2 | ENC-HTTP-PERIMETER-20261109-001 | CORS por ruta, trust proxy, GeoIP, hosts exactos, límites de body, dotenv y filtros. |
| P1/continuidad | Issue #85 SEO | Resolver sitemap Search Console para encarmen.org, status HTTP de alias/canonical y acceso de verificación. |

## 6. Seguridad y autorización

- No modificar `main` ni `https://encarmen.org` sin autorización específica.
- No repetir despliegue Staging para el SHA auditado sin necesidad técnica nueva.
- Para inspección Hostinger, usar solo lectura y no revelar secretos.
- No ejecutar pruebas mutantes ni conexiones MariaDB hasta comprobar aislamiento, backup y rollback.
- No presentar release del panel, bundle transferido, marcador HTTP, proceso Node, persistencia real y aceptación como equivalentes.

## 7. Continuidad

Memoria narrativa de esta conversación: [NIA-2026-11-12.md](https://docs.google.com/document/d/1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4/edit) (Drive ID `1A1jNq2ZWPBspdzMLHzAqbreCO7fuhNrKNUpoaKo93m4`), en la carpeta privada `memoria NIA`.
Memoria anterior: NIA-2026-11-09.md (Drive ID `1GlBH-jeqIayumtzfjFvwPiTK2KlMUrrujV9D2bE95HU`).
Registro maestro: `docs/coordination/REGISTRO_MAESTRO_TAREAS_INCIDENCIAS.md`; HEAD previo `b1e4a748b9fb275c25fb28cad4e936c6b3190335`.

Siguiente Nia debe leer este checkpoint y la memoria Drive, verificar los HEAD actuales y Issues #85/#41 antes de dar instrucciones o afirmar estados.

**Estado al guardar:** esta conversación respaldada narrativamente en Drive; este checkpoint y el índice de doble publicación se publicarán en GitHub. No se hicieron cambios de código, integración ni despliegue como parte de este respaldo.
