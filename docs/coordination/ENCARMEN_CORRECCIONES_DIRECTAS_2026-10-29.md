# ENCARMEN — Correcciones directas de La Jefa, 2026-10-29

Estado: cambios publicados en rama aislada; verificación estática parcial, NO aprobados, NO integrados, NO desplegados.

## Rama y trazabilidad
- Origen GAS: work/enc-classifieds-integration-002 @ 328939caeab4801b33070b13f0b70826d9bc752d.
- Rama de Coordinación: coord/encarmen-gas-client-fixes-001.
- Commits secuenciales:
  - 781fceb71dcfe0a5b051c840c05ef7181948eafa: respuestas estrictas y prohibición de imágenes inseguras.
  - 69040381c600a8aa6ea4d64284be18cec36363d8: deshabilitar upload público sin almacenamiento seguro.
  - 5dee62a56e0ed7331c8e95d12193c5be96384b78: token de titular requerido para edición/baja y almacenar token únicamente si servidor lo entrega.
  - a11d0212555acca3294b2744a781a684e020f3ce: adaptar contactos del POST a nombres de backend PERP.
  - df852dc40c323b3b72faa5456ecc4276e28e0301: idempotencyKey estable por formulario y quitar userToken inventado como credencial.
- Archivos funcionales modificados: src/services/api.ts, src/components/ClassifiedCreateModal.tsx.
- Comp comprobación: 11 condiciones estáticas sobre lectura posterior de GitHub pasaron; **no se ha ejecutado TypeScript, build, navegador ni prueba de integración real**.

## Hallazgos sobre backend PERP nuevo
- Backend PERP publicado en work/enc-classifieds-backend-001 SHA 49b8e52b2c594a0bc0bc9b9b261410392106febc (primera versión comprobada), difiere de GAS.
- Backend exige POST {title,description,category,price,contactPhone,contactWhatsapp,imageUrl,idempotencyKey}, mientras UI GAS enviaba {phone,whatsapp,userToken,images,...}; se ha alineado cuerpo básico en rama de correcciones.
- Backend exige x-classified-owner-token en PATCH y DELETE, pero su handler POST actualmente **NO incluye ownerToken en respuesta**, aunque servicio crea uno. Por ello edición/baja públicas continuarán denegadas en cliente sin token; nunca fingir que operan. Corregir contrato backend después de revisión de seguridad (entrega de token implica responsabilidad de almacenamiento y recuperación).
- Backend categorías permitidas: servicios, compra-venta, empleos, inmuebles, vehiculos, otros; UI contiene mascotas, puede obtener 400. Revisar categorías juntas.
- Backend requiere teléfono 10 dígitos; UI permitía email solo. Se ajustó validación del formulario para informar que teléfono o WhatsApp es obligatorio mientras backend no soporte correo.
- Backend PERP agrega módulo y script apply; NO está incorporado a server.ts de su propia rama en esta primera versión. Además carril público está bloqueado por middleware Staging hasta decidir una excepción segura, sin autorizar despliegues.
- Backend usa token propietario aleatorio hash, pero no lo devuelve; no considerar autenticación de titular terminada.
- Imágenes base64 quedan bloqueadas por cliente, input deshabilitado: requiere solución real de multimedia y controles.
- GAS reportó 'riesgo nulo'; rechazado por Coordinación.

## Siguiente verificación imprescindible
1. Comprobar correcciones con TypeScript, Vite, suites y tests que importen funciones reales del frontend, no solo HTTP a mocks.
2. Revisar código PERP independientemente (rutas, seguridad, aislamiento, DDL, idempotencia y confirmación SQL); no asumir que un SHA en GitHub implica corrección.
3. Resolver token de titular y categorías; compatibilidad conjunta frontend/backend con datos sintéticos; evitar ampliar permisos de Staging sin seguridad.
4. Resolver H01–H04 de auditoría W2 antes de integrar la consolidación.
5. Ninguna modificación a main, ia-desarrollo, Hostinger, Staging ni BD real.
