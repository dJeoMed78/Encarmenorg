# ENCARMEN — Auditoría de ia-desarrollo, 13-nov-2026
Fuente: auditoría externa facilitada por el propietario; contraste independiente de código en GitHub rama ia-desarrollo SHA cf60bc391ca1021a71344d0b7e94741b5cb5d63d. Estado: hallazgos de código, NO pruebas de explotación ni confirmación de runtime. Prohibido copiar secretos en informes. No se cambió producción.

## Hallazgos confirmados / prioridades
1. P0 — Scripts scripts/repair_all_wordpress_products.ts y scripts/pull_all_real_images_from_wordpress.mjs contienen fallbacks con credenciales WC incrustadas (patrones ck_/cs_). Mitigación: retirar de todas las ramas pertinentes, determinar exposición y rotar/revocar claves por canal seguro; evitar registrar valores en logs.
2. P0 — Endpoints que consumen Gemini sin guardia de autenticación explícita: POST /api/ai/parse-business (server.ts ~5305), POST /api/businesses/auto-search-ai (~7292). Confirmar middleware global y proteger, autorizar, limitar consumo y cuota. No invocar endpoints con consumo de IA para probar sin presupuesto.
3. P1 — README.md expone identificadores/configuración de MariaDB productiva y presenta WooCommerce como activo; retirar información operativa sensible, corregir documentación, evaluar exposición histórica.
4. P1 — CORS '*' y Access-Control-Allow-Headers '*' (~302-304), eliminación de X-Frame-Options; helmet no presente en package.json ni server.ts. Endurecer con política de orígenes y cabeceras sin romper usos permitidos.
5. P1 — Limitador 1500 req/min (~435), exención admin, IP tomada de X-Forwarded-For; filtro geográfico depende de cf-ipcountry (~371). Evaluar confianza de proxy, IP spoofing, rate limits por ruta y alternativas al filtro Cloudflare.
6. P1 — POST /api/upload-logo (~8309): base64 MIME declarado, buffer escrito en public/uploads sin validación de firma ni dimensiones; JSON global 50mb (~453). Aplicar límites, detección real, normalización segura, autorización y pruebas.
7. P1 — Escrituras JSON mediante fs.writeFileSync en server.ts (ej. eventos, promociones, clasificados, reportes). Identificar rutas activas y exigir SQL-first/persistencia real; NO afirmar que todo el proyecto usa JSON, pues también usa MariaDB.
8. P1 — Workflow .github/workflows/enc-control-operations.yml utiliza sshpass y autenticación SSH por contraseña, con fingerprint fijado. Planificar migración segura a clave sin romper el canal, revocación posterior y prueba de rollback.
9. P2 — server.ts 8722 líneas; public/uploads versionado (45 archivos); nombre/version react-example 0.0.0; deuda de modularización, artefactos y calidad. Dist no aparece versionado en el árbol de este SHA.
10. P2 — Ausencia de Dockerfile y disparador main-only en .github/workflows/main_carmen.yml; existen numerosos workflows de CI para ia-desarrollo y 64 archivos bajo tests/, por lo que no es correcto afirmar ausencia total de CI o tests. Evaluar cobertura y coherencia de despliegue.

## Hallazgos parcialmente confirmados / necesitan análisis
- /api/sync y /api/webhook/woocommerce definidos después del handler 410 (~1854 y ~3120/3146). En Express, el primer handler responde 410 y no llama next; los posteriores son código muerto bajo el orden actual, no un bypass demostrado. Retirar handlers inalcanzables con pruebas de regresión.
- Staging read-only: hay guardas explícitas y excepciones; auditar aislamiento y rutas con pruebas seguras. No concluir bypass sin pruebas.
- edit_pins.json presente en repositorio; no confirma PIN activo. Verificar contenido y eliminar datos heredados de manera controlada, sin difundirlos.
- Bundles duplicados: build:server produce server.js y api/server.bundle.js, pero no demuestra que estén versionados en este SHA.
- CI 'sin ESLint': package.json lint=tsc --noEmit; no hay comando ESLint definido, pero sí verificaciones automatizadas.

## Criterio de cierre
Cada tarea requiere corrección en rama aislada, pruebas, PR revisada, integración ia-desarrollo, Staging desplegado y verificado, lectura posterior/persistencia y evidencias de seguridad. Proteger main y producción. No registrar hallazgos como explotación demostrada.
