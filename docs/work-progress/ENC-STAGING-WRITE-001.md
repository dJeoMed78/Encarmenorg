# ENC-STAGING-WRITE-001 — checkpoint inicial

Estado EN_PROGRESO. Base work/enc-f008-r3-recuperacion @924127e1b76919918c87ce9563d8b0de62a3d373. Nueva rama exclusiva work/enc-staging-write-001. Coordinación51ae3a45a6f82bc8fcec9f02432835f312ce8c02; ia-desarrollo0d231cb2779b7a14d8d336fc2f4de3782663c738. Contexto, instrucciones, resultados y checkpointsR3 recuperados. El estado de207 empresas/206 con ambos contactos y conexiónMariaDB es reportado por Coordinación, no una prueba de Work contra DB real.

Auditoría: registro público sin auth; PATCH restringe solo algunos campos y la retirada explícita; IDs de registro desde máximo de caché y upsert pueden sobrescribir un negocio bajo carrera; WhatsApp se infiere del teléfono al registrar; permisos generales de escritura activarían procesos ajenos al catálogo; login usa credenciales embebidas y PIN heredado incluye override. No se publican credenciales ni PIN. Estas condiciones impiden una activación segura con el código heredado.

Decisión: conservar R3 y preparar carril exclusivo de negocios para Staging. Otras tablas/procesos seguirán bloqueados; esquema/DDL/importaciones deshabilitados. Registro y edición solo administrador con sesión de servidor; alta INSERT sin upsert, exclusión entre procesos y clave de reintento para no duplicar ante ack perdido; edición transaccional de registro existente con preservación de contactos. La autenticación de esta fase no usará contraseñas embebidas ni PINmaestro. Configuración de credenciales seguras y permisos reales será dependencia del propietario antes de activar, sin solicitar ni generar secretos reales.

Próximo hito: implementación aislada, pruebas con conexiones/repositorio simulados y procedimientoHostinger. No se inició servidor completo ni se accedió a MariaDB real, Hostinger o producción. No integración, despliegue, migraciones, SQL real, sincronización ni variables aplicadas.


## Preservación urgente del código funcional

Publicación por orden urgente de Coordinación. Estado IMPLEMENTADO_SIN_VERIFICACIÓN_FINAL de esta instantánea. Implementados carril exclusivo de negocios, autenticaciónStaging por scrypt configurable sin fallback embebido, límites de login/sesiones, INSERT transaccional con idempotencia, UPDATE de campos explícitos y lectura SQL canónica, comprobación de base/engine/PK, protección de arranque/otras tablas y eliminación de éxitos falsos localStorage. Formularios público y administrativo conservan clave de reintento y separan contactos; edición inline solo envía cambios. Se corrigieron dos llamadas con firma vieja que TypeScript detectó en el formulario administrativo.

Resultados previos a los últimos ajustes de ese formulario: suite específica17PASS; regresiónR3 19PASS (comparten9 grupos, no sumarlos como36 distintos); TypeScript/frontend/backendPASS. Pendiente repetir las comprobaciones principales sobre este commit. No servidor completo, DB real, SQL real, Hostinger, integración ni despliegue. Autenticación operativa y permisos pendientes de configuración segura/validación del propietario; no se habilitó ningún flag real.

Alcance controlado: solo administradores de servidor; registro público anónimo, PIN, uploads, DELETE, sincronizaciones y otras tablas permanecen bloqueados enStaging. Activación futura requiere revisión, cuenta exclusiva limitada, InnoDB/PKid comprobadas, hashes scrypt seguros, recompilar artefactos y autorización separada antes de cambiar flags. Las credenciales embebidas heredadas no se aceptan en el loginStaging de este carril.
