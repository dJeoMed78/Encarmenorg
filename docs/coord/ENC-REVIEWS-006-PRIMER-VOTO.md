# ENC-REVIEWS-006 — Primer voto real en Staging (2026-10-28)

## Evidencia visual aportada por propietario
- En `staging.encarmen.org`, ficha de negocio con enlace visible `/negocio/rosalsa`.
- Se muestra **Calificación de la Comunidad: 4.0 / 5, 1 voto**.
- Banner: «Ya calificaste este negocio con 4 estrellas. Voto registrado para este identificador de visitante.»
- Mensaje: «Gracias. El servidor confirmó tu calificación.»
- Anteriormente, `GET /api/ratings` respondió `{"stats":{}}` después de activar `RATINGS_SCHEMA_APPROVED=true` en Staging.
- Hostinger informó despliegue completo de commit `1455e568` en `ia-desarrollo`.

## Estado
**Voto aceptado y reflejado en UI de Staging: VERIFICADO POR CAPTURA.**
**Persistencia SQL directa, comportamiento tras recarga/reinicio y prevención de duplicados en servidor: PENDIENTES.**
No declarar todo el módulo terminado ni modificar producción.

## Próxima verificación de solo lectura en phpMyAdmin
```sql
SELECT DATABASE() AS base_actual;
SELECT business_id, visitor_id, rating, created_at
FROM `u293982346_encarmentest`.`business_ratings`
ORDER BY created_at DESC
LIMIT 5;
```
**Nota privacidad:** `visitor_id` puede identificar un navegador; para captura pública es preferible omitirlo:
```sql
SELECT business_id, rating, created_at
FROM `u293982346_encarmentest`.`business_ratings`
ORDER BY created_at DESC
LIMIT 5;
```
Tras ello recargar ficha y verificar promedio/voto sin emitir otro voto. No revelar identificadores de visitante ni secretos.
