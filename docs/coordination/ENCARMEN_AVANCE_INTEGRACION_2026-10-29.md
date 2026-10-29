# ENCARMEN — Avance tangible de coordinación 2026-10-29
Fecha: 2026-10-29. Fuente: inspección directa GitHub. Estado: IMPLEMENTADO, PUBLICADO; FALTA EJECUTAR PRUEBAS. Sin integración en ia-desarrollo ni despliegue.

## Rama central de integración aislada
- Rama: coord/encarmen-classifieds-integration-001
- HEAD comprobado: 92d4758a29c0418d3a3fead5860bae10213224db
- Origen: rama GAS corregida coord/encarmen-gas-client-fixes-001 @ df852dc40c323b3b72faa5456ecc4276e28e0301
- 11 commits ahead, 9 archivos cambiados según comparación de GitHub.
- Trae backend PERP corregido src/server/publicClassifieds.ts + suite tests/public-classifieds.test.mjs + script y lo registra directamente en server.ts, tras los parsers HTTP.
- Mantiene guard Staging que bloquea escrituras públicas; NO se amplían permisos; NO SQL real ni creación automática de tablas.

## Hallazgos H01–H04 corregidos en fuente
- H01 ALTO: en adminSecurity.ts y server.ts excepción radar-search ahora exige POST exacto. Nuevo tests/enc-consolidation-h01-regression.test.mjs prueba permisos de métodos y revisa guards.
- H02 MEDIO: App.tsx popstate GET sincronizado con businessRequestVersion y AbortController, evita sobrescritura por respuesta atrasada.
- H03 MEDIO: api.ts registro negocio ahora preserva incertidumbre en HTTP 5xx o confirmación incompleta de negocio.
- H04 MEDIO: reportes no retornan éxito después de fallos API ni fingen envío mediante localStorage.
- Backend clasificados: UPDATE readback fallido y INSERT con desenlace ambiguo se reportan como no confirmados; pruebas de fake pool corregidas.

## Verificación
- SHA HEAD confirmado, comparación contra base y documentación recuperada.
- Pruebas escritas pero no ejecutadas en sesión. El contenedor tiene Node 22; no tiene checkout del repositorio ni DNS funcional a GitHub para clonar. **No atribuir PASS de TypeScript, HTTP, Vite ni MariaDB real**.
- Antes de integración: ejecutar tests y compiler con checkout real, revisar seguridad SQL, completar E2E y demostrar independencia de bases; inspección independiente de H01–H04.
- No alterar producción, staging, ia-desarrollo ni bases sin autorización específica.
