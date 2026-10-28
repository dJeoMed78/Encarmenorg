# ENC-REVIEWS-006 — Checkpoints

## Inicio — 2026-10-28T02:40:46.807Z
- Estado EN_PROGRESO. Rama work/enc-reviews-006.
- Base y commit actual al iniciar: 6004ef637021ee0bea72f5c892a815696c1c8c13.
- Instrucciones generales (blob): c4ef37ba0f690f60cd9fb5189190afd2be9a8faa; tarea (blob): d81c21af1676ff8cfd26a23c5f2e85b73f6521c7.
- Leídos contexto, coordinación, antecedentes 001/002/003/004 y tarea 005 disponible. No hay informe de ejecución 005 aportado; no se inventa.
- Se incorporarán cambios seleccionados de a681963 y 2e0d007 sin merges, únicamente en archivos autorizados.
- No se detectó mariadbd ni Docker local; se usarán mocks aislados, sin abrir conexiones reales. Integración MariaDB pendiente.
- Plan: canonicalizar IDs, serializar votos únicamente mediante recursos de ratings sin bloquear/modificar businesses, validar esquema existente, separar SQL propuesto de arranque, consolidar consumidores y pruebas.
- Riesgos vigentes: esquema/permiso/backup de hosting no verificados, arranque histórico con efectos laterales ajenos que no se ejecutará.
