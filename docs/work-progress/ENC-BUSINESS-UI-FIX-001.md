# ENC-BUSINESS-UI-FIX-001 — calificaciones y descripciones de la ficha

Rama: `work/enc-business-ui-fix-001`. Base: `ia-desarrollo` @ `0d231cb2779b7a14d8d336fc2f4de3782663c738`. Sin merge, PR, despliegue, SQL ni cambios de Hostinger/MariaDB.

## 1. «Sin calificaciones» con rating 5 / reviewCount 1

Conclusión: no es un defecto del widget; no se cambió código de calificaciones.

Evidencia (lectura de `ia-desarrollo`):
- `StarRatingWidget` obtiene el resumen solo de `useBusinessRatings` → `fetchBusinessRating` (API `/api/ratings`). Comentario en el código: los `initialRating/initialReviewCount` del catálogo «no son autoritativos». Muestra «Sin calificaciones» cuando el servidor responde `count === 0`; si la consulta falla muestra «Calificaciones no disponibles».
- `ratings_db.json` (raíz, heredado): `"ratings": []` y `stats["1081"] = {average:5, count:1}`. Es decir, un agregado histórico sin ningún voto individual que lo respalde. De ahí vienen `rating: 5` y `reviewCount: 1` de `/api/businesses/1081` (además, `mariadb.ts` usa `5.0` como valor por defecto de `rating`).
- `docs/WORK_RESULTADOS.md` (ENC-REVIEWS-003/006): «No se importan agregados como votos», el catálogo conserva defaults históricos y los consumidores no deben usarlos. El guion de 26 comprobaciones ya incluye el caso «Cero votos ignora catálogo (initialRating 5, initialReviewCount 1) → Sin calificaciones».

Por tanto, mostrar 5.0 / 1 voto sería presentar un dato sin respaldo. No se sustituyó el sistema oficial ni se inventaron reseñas.

No verificado (sin acceso a la API): la respuesta real de `GET /api/ratings` para 1081. Si devolviera `count >= 1` y la ficha aun así dijera «Sin calificaciones», habría un defecto distinto (normalización de ID o reconciliación) y requeriría leer `server.ts`.

Decisión pendiente de Coordinación (fuera de alcance): `/api/businesses/:id` sigue exponiendo `rating`/`reviewCount` heredados; conviene no tratarlos como votos en consumidores externos.

## 2. URL multimedia en descripciones

Causa: `BusinessPublicDetail` mostraba `b.description` como texto plano, por lo que URL de video/imagen, shortcodes de WordPress (`[embed]…`) y etiquetas HTML heredadas aparecían crudas y largas.

Cambio:
- `src/utils/descriptionLinks.ts` (nuevo): normaliza shortcodes/HTML heredado conservando el texto y las URL, detecta URL `http(s)`/`www.`, quita puntuación final, rechaza esquemas no http(s) y URL con credenciales, y asigna etiquetas legibles (YouTube, Vimeo, TikTok, Facebook, Instagram, Google Maps, WhatsApp, imagen, video, audio, dominio).
- `src/components/BusinessDescription.tsx` (nuevo): renderiza texto + enlaces `target="_blank" rel="noopener noreferrer nofollow ugc"`; estilo en línea porque la hoja Glass pone `a { color: inherit; text-decoration: none }`. No incrusta iframes ni carga contenido externo.
- `src/components/BusinessPublicDetail.tsx`: solo la línea de descripción pasa a usar el componente (commit 2).
- No cambia la descripción almacenada ni el CSS (`.bpd-description` ya usa `white-space: pre-line`).

## Pruebas

`tests/business-description-links.test.mjs` (13 pruebas, `node --test`, Node ≥ 22.18/24 con type stripping). Ver el informe de entrega para resultados y limitaciones.

## Pendiente / riesgos

- `ClientBusinessPageView.tsx`, `BusinessCard.tsx` y otras vistas que muestren `description` no se modificaron; pueden reutilizar `BusinessDescription`.
- `tsc --noEmit`, `vite build` y render React/navegador no se ejecutaron en esta entrega (sin TypeScript ni red en el entorno de Perplexity).
- `docs/WORK_RESULTADOS.md` y `docs/CONTEXTO_ENCARMEN.md` no se editaron (archivos grandes que la herramienta lee truncados; reemplazarlos podría perder contenido). Coordinación debe añadir el registro.
- Reversión: descartar la rama o revertir sus commits; no hay cambios de datos.
