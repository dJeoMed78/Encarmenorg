# ENC-REVIEWS-COMMENTS-001 — Comentarios opcionales vinculados a calificaciones

**Estado:** ESPECIFICACIÓN APROBADA, implementación pendiente de asignación. **Responsable de coordinación:** 01. **Rama de instrucciones:** `coord/encarmen-work-control-001`.
**Repositorio:** `dJeoMed78/Encarmenorg`.
**Dependencia:** módulo de estrellas ENC-REVIEWS-006 integrado en `ia-desarrollo`, desplegado en Staging y probado con voto 4 estrellas en negocio 966; no modificar datos de producción.
**Conflictos:** Work desarrolla ENC-GLASS-EDITOR-001 en `src/components/EditBusinessModal.tsx`; evitar ese archivo.

## Decisión del propietario
- El visitante primero selecciona de 1 a 5 estrellas; después puede añadir **un comentario opcional**.
- **Publicación automática** de comentarios que pasen filtros; sin cola obligatoria de aprobación previa.
- Solo **texto plano en español**. Rechazar groserías, amenazas, publicidad, spam, enlaces, direcciones, datos personales, contenido malicioso y mensajes claramente en otros idiomas.
- Mantener reseñas negativas legítimas: puntuaciones bajas, críticas y experiencias desfavorables no son motivos de rechazo.
- Comentario vinculado al mismo voto y negocio, sin crear votos duplicados.
- Administrador debe poder reportar, ocultar o retirar comentarios abusivos publicados; conservar trazabilidad apropiada y minimizar datos personales.

## Requisitos técnicos de seguridad
1. Inspeccionar primero `server.ts`, `src/db/mariadb.ts`, `src/services/api.ts`, `src/components/StarRatingWidget.tsx` y consumidores; definir contrato actual y migración **solo si imprescindible**. La tabla histórica `business_ratings` tiene columna `comment`, pero su existencia no prueba funcionalidad de comentarios.
2. Validar del lado servidor con esquema estricto: tipo string, normalización Unicode NFKC donde sea apropiado, longitud máxima propuesta 500 caracteres y mínima útil, límite de bytes, límites de cuerpo HTTP, rechazo de caracteres de control/bidi invisibles y textos vacíos tras normalización.
3. Tratar como **texto no confiable**: consultas parametrizadas, sin concatenación SQL; salida escapada por React/textContent; jamás `dangerouslySetInnerHTML` para comentarios; cabeceras de seguridad/CSP cuando corresponda; no ejecutar, evaluar ni renderizar HTML/Markdown.
4. Rechazar URLs (http, https, www, dominios disfrazados, shorteners), emails, teléfonos, contactos, handles de mensajería y direcciones identificables con reglas de bajo falso positivo. No eliminar a ciegas palabras como «calle» cuando formen parte de una crítica legítima.
5. Español: detección heurística prudente; permitir nombres propios, marcas, topónimos, préstamos comunes, acentos y textos cortos ambiguos. No afirmar detección lingüística perfecta; evitar depender de servicios de IA externos sin aprobación de costos/privacidad.
6. Groserías: listas versionadas + variaciones con sustitución de caracteres, separación, Unicode homoglyphs; aplicar contexto para reducir falsos positivos. Amenazas, discriminación, datos personales, sexual explícito y spam.
7. Antispam/abuso: límites por identificador, IP truncada/hash cuando legalmente apropiado, negocio y ventana de tiempo; protección frente a envíos simultáneos; límite de solicitudes y tamaño; duplicados y patrones repetidos; evitar que la detección permita enumeración de datos personales. La identificación de navegador no prueba identidad; documentar límites frente a evasión.
8. Definir comportamiento de comentario inválido: **no publicarlo**, respuesta legible con causa genérica segura, y **no perder una calificación válida** por texto rechazado sin informar claramente al visitante. Preferible validación previa y confirmación explícita; definir transacción/contrato antes de implementar.
9. Respuesta y errores reales: no simular éxito ante fallos MariaDB; mantener bloqueo `RATINGS_SCHEMA_APPROVED`; manejo de indisponibilidad y registros sin exponer payloads personales o secretos.
10. Moderación posterior: reportes, ocultar, eliminar o bloquear abuso mediante autorización backend; evitar ataques de reportes masivos. Si requiere tablas nuevas, proponer SQL con respaldo y rollback para autorización separada.
11. Accesibilidad, diseño Glass responsive y compatibilidad con widget de estrellas existente. Comentarios públicos paginados, solo texto, fecha y estrellas; no revelar visitor_id ni IP.
12. Seguridad operativa: no probar payloads maliciosos contra producción; pruebas unitarias con cadenas inertes y entorno local. No tocar `main` ni desplegar Staging sin permiso específico.

## Pruebas y criterios de aceptación
- Voto sin comentario sigue funcionando, sin regresión.
- Voto con comentario válido en español se almacena y se recupera en otro navegador.
- Comentarios con enlaces, emails, teléfonos, datos personales, lenguaje ofensivo, otros idiomas evidentes, scripts y HTML son rechazados sin ejecutar contenido.
- Crítica negativa legítima en español se acepta.
- Unicode, emojis, textos cortos, repetidos, vacíos, largos, evasión de URL y envíos concurrentes se prueban y documentan.
- No se duplica un voto por agregar comentario; control de carrera y persistencia SQL comprobados.
- Reportar/ocultar funciona solo con permisos; no se muestran datos privados.
- TypeScript/build y pruebas automatizadas verificables; pruebas reales de MariaDB solo tras autorización.
- Publicar avances y reporte en rama aislada; coordinación revisa antes de integrar.

## Próximo paso
La coordinación revisará contratos y propondrá tarea de implementación con rama `work/enc-reviews-comments-001` cuando Work termine su tarea activa o exista autorización expresa para ejecutarlas en paralelo. No modificar archivos ahora.
