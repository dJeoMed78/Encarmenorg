# ENCARMEN — Revisión de La Jefa: backend PERP
Fecha: 2026-10-29
Entrega PERP: ENC-CLASSIFIEDS-BACKEND-001; rama work/enc-classifieds-backend-001 @ 49b8e52b2c594a0bc0bc9b9b261410392106febc (SHA confirmado antes de corregir).
Dictamen: implementado pero NO aprobado; PERP reconoce que no ejecutó Node, TypeScript, Vite ni MariaDB real.
La Jefa leyó src/server/publicClassifieds.ts, scripts/apply-classifieds-backend-patch.mjs y tests/public-classifieds.test.mjs.

## Defectos y correcciones directas
Rama: coord/encarmen-classifieds-backend-fixes-001, basada exactamente en 49b8e52.
Commits funcionales:
- f351f4a4281d517d88e417411c9b1cc0811879f3: retirar DDL automático y UPDATE del GET; validación cerrada, token propietario en creación nueva, verificación ampliada de readback y pool null explícito.
- 153eeab687c89b117d846a7c1d1c22b131d7b327: añadir pruebas de GET sin escritura, campos extra y ownerToken sólo primer POST.
- e10f17f10d19dc9024f290e6593f8ec67996be1d: alinear categorías con GAS, alias phone/whatsapp/image de salida; deshabilitar referencias de imagen no verificadas.
- 0a3a07363232f163af9da745646e74103d93e01d: ampliar aserciones de categoría/imagen/contrato.
- f5a03d20b398f7c0ab0e5cebd75bdd4ffbb8fe4b: documentación de correcciones.
Archivo de estado: docs/work-progress/ENC-CLASSIFIEDS-BACKEND-COORD-FIXES-001.md en rama correctiva.

## Riesgos pendientes
- SIN ejecutar pruebas/tsc/build/MariaDB por esta coordinación. No afirmar compatibilidad funcional verificada por tests.
- El módulo de PERP no está importado/registrado en server.ts hasta aplicar el parche; su guard de Staging bloquea mutaciones. No habilitar salvo comprobación real de aislamiento.
- Token titular de primer POST no se puede recuperar en un replay idempotente si la respuesta se pierde; no revelarlo a desconocidos. Requiere protocolo seguro de recuperación.
- Alta carece de cuotas/rate limit específico y pruebas de concurrencia reales.
- Cliente GAS corregido en coord/encarmen-gas-client-fixes-001 @ df852dc40c323b3b72faa5456ecc4276e28e0301: respuesta estricta, campos básicos, owner token y fotos bloqueadas; falta probar en conjunto.
- H01–H04 de consolidación a16ca710 continúan bloqueando toda integración.
- MariaDB LAB --apply no autorizado hasta acreditar aislamiento real.
- NO integrado a ia-desarrollo, main, Staging ni producción.

## Política del propietario reiterada
La Jefa debe corregir directamente problemas concretos en ramas aisladas cuando tenga herramientas y permisos; no enviar microinstrucciones al trabajador sólo para copiar el fix. Conservar evidencias y actualizar memoria de GitHub.
