# ENC-REVIEWS-COMMENTS-002

## Inicio — 2026-10-28T10:57:37.657Z
Estado EN_PROGRESO. Rama work/enc-reviews-comments-002; base 1455e568a93629dcd7ae3f58df61d03c76a64f4d.
Instrucción blob 92380799f74dd3c04f302733c49b4bc5fc2f7ffa. Corrección Glass publicada en f3046a1354057ed09f4bed3b007545aeb186ea59 y 12 pruebas PASS previas.
Auditoría breve: PR #4 abierto/no integrado; NO se editará ficha Glass ni App. Montaje público en StarRatingWidget. business_ratings ya dispone de comment y contrato de 200 caracteres; se conservará límite 10–200 para no migrar ni ampliar esquema. Componente admin identificado inequívocamente: AdminBusinessesTab.tsx; NO se editará porque moderación queda bloqueada por gestión insegura de credenciales (cambio de contraseña sin autorización fiable), aunque existe token efímero servidor. No se habilitará borrado, ocultamiento o reporte persistente sin contrato/auditoría segura.
Plan autorizado: política de texto puro compartida BusinessCommentsPolicy.tsx, lectura paginada filtrada, formulario explícito de estrellas+comentario, límites de solicitudes y feature gate servidor default off. Sin nuevas tablas/columnas; sin SQL ejecutado. La activación requerirá coordinación y moderación segura/plan de abuso. Stars sin comentario mantendrán RATINGS_SCHEMA_APPROVED.
Archivos previstos: StarRatingWidget.tsx, nuevos BusinessComments*.tsx/.css, services/api.ts, utils/realRatings.ts, server.ts solo ratings/comments, db/mariadb.ts solo repositorio de ratings/comments, WORK_RESULTADOS y este progreso. Sin dependencias nuevas ni autenticación global.
Pruebas previstas: política inerte, rutas extraídas Express con repositorio falso, cliente/navegador y concurrencia simulada; nunca ejecutar server.ts completo ni conectar MariaDB.

## Implementación y pruebas iniciales — 2026-10-28T11:04:20.995Z
Frontend y backend preparados, gate RATINGS_COMMENTS_APPROVED cerrado por defecto. Política compartida 10–200 caracteres/800 bytes; JSON de ratings 2kb, paginación y DTO público mínimo, lectura de legado también filtrada, rate limit en memoria (IP HMAC efímera, visitante, negocio y repetición de texto). Moderación responde 403 sin mutación. Sin migración, sin SQL ejecutado. 37 pruebas política/rutas PASS y 13 Chromium PASS; TypeScript y Vite PASS (advertencia chunk>500kB). API/DB simuladas, no persistencia real. Falta cierre documental y capturas; PR4 no integrado, no ficha Glass modificada.

## ENC-REVIEWS-COMMENTS-002 — entrega parcial segura (2026-10-28T11:06:15.592Z)
Estado: PROBADO_POR_WORK en entorno simulado; ACTIVACIÓN PÚBLICA Y MODERACIÓN BLOQUEADAS.
Rama work/enc-reviews-comments-002; base 1455e568a93629dcd7ae3f58df61d03c76a64f4d.
Checkpoint 0297bf369cb2bac1fc90cd15d3df1ff886643248; implementación ef220ce878f1cb5371452fecfc0c32270a9ceab7.
Instrucción 92380799f74dd3c04f302733c49b4bc5fc2f7ffa. Leídos WORK_INSTRUCCIONES (c4ef37ba0f690f60cd9fb5189190afd2be9a8faa), CONTEXTO, COMMENTS-001 y código de base. Sin actualizar CONTEXTO por regla de alcance.

### Implementación
- StarRatingWidget: selección de puntuación sin envío inmediato; texto opcional, contador/vista previa, confirmación explícita; quitar/corregir comentario sin perder borrador por rechazo. Errores y reconciliación del voto existentes conservados.
- BusinessComments.tsx/CSS: lista paginada con abort/generación para respuestas obsoletas, DTO sin IP/visitor_id, texto renderizado por React, cero nombres/fechas/fotos inventados. Página vacía diferenciada de indisponibilidad. Sin fechas porque el contrato no las garantiza.
- BusinessCommentsPolicy.tsx: política compartida server/repositorio/cliente, NFKC, controles/bidi/invisibles rechazados, texto 10–200 unidades UTF-16 (mínimo por caracteres) y 800 bytes, sin HTML/código/enlaces/contactos/direcciones identificables; heurísticas conservadoras de español, insultos, amenazas/publicidad y repetición. No servicios externos/dependencias nuevas. Lenguaje y datos personales NO se detectan con garantía absoluta; falsos positivos/negativos requieren moderación humana.
- Contrato compatible POST /api/ratings con comment opcional; límites 200 del esquema/contrato existente conservados en lugar de 500 propuestos; estrellas sin comentario siguen disponibles bajo RATINGS_SCHEMA_APPROVED.
- GET /api/ratings/:businessId/comments?limit=1..20&cursor=<id público>: consulta parametrizada, máximo 21 filas exploradas, filtrado también sobre legado; cursor opaco de fila, no fecha cronológica. IDs públicos de comentario, puntuación y texto únicamente.
- JSON restringido a 2kb para /api/ratings antes del parser global; esquema estricto. Límites por minuto: IP 30 escrituras/120 lecturas, visitante 5, negocio 60, mismo texto/negocio 1; Retry-After 60. Mapa acotado a 5000 claves, HMAC efímera de IP sin persistencia/logs. Límite por proceso: no sustituye control distribuido, bots/desafío ni identidad humana; verificar proxy antes de activación.
- RATINGS_COMMENTS_APPROVED debe ser exactamente true para lectura y publicación. DEFAULT OFF. No se cambió ninguna variable real. Repositorio también falla cerrado. Sin comentario, las estrellas no dependen del nuevo gate.
- POST .../comments/:commentId/moderation devuelve siempre 403; no mutación ni confianza en isAdmin/token del cliente. No implementa eliminación. No se habilitaron controles administrativos.
- Repositorio reutiliza business_ratings.comment, transacción/lock/índice UNIQUE existentes. No columnas/tablas nuevas ni migración propuesta/ejecutada. Consultas parametrizadas escritas en código para revisión futura; NINGUNA consulta fue ejecutada contra BD.

### Bloqueos
1. Moderación, reporte persistente, auditoría/retirada y bloqueo urgente por comentario NO implementados: gestión de contraseña administrativa permite cambio sin autorización fiable. El token efímero servidor existente no basta para confiar en la identidad de administrador. Cambiar autenticación global queda fuera del alcance.
2. AdminBusinessesTab.tsx fue identificado inequívocamente como panel real ANTES de editar; se mantuvo sin cambios por el bloqueo anterior. No se entregan los dos controles eliminar; módulo NO completo.
3. PR #4 seguía abierto/no integrado al comenzar. Se respetó la precondición: base ia-desarrollo 1455e568a93629dcd7ae3f58df61d03c76a64f4d, sin editar BusinessPublicDetail, su CSS, adaptadores, App ni logo. Montaje en widget compartido actual. Tras integración de Glass, coordinación debe resolver su aviso estático anterior “Comentarios todavía no disponibles” antes de activar texto. No se mezcló la rama Glass.
4. Sin pruebas reales de MariaDB, esquema activo, permisos, concurrencia de BD o dos navegadores contra persistencia real. Activar texto requiere revisión de esquema ya aprobado, pruebas autorizadas de persistencia y moderación/plan de abuso seguro. NO APTO para habilitación pública ahora.

### Pruebas realmente ejecutadas
- tsc --noEmit -p comments-002/tsconfig.json: PASS.
- vite build directo, sin scripts de versión: PASS, 1723 módulos; advertencia chunk >500kb.
- node /tmp/enc-comments-validation/test-routes.cjs: 37 PASS. Política, español/crítica negativa, URLs espaciadas/fullwidth, email/teléfono/dirección, HTML, Unicode invisible/bidi, repetición, idioma inglés evidente, insulto separado, amenaza, publicidad, tamaño, esquema, GET en cliente separado, duplicado/carrera simulada, 400/403/409/413/429/503, gate cerrado y estrellas sin texto.
- node /tmp/enc-comments-validation/test-browser.cjs: 13 PASS en Chromium 153. Confirmación explícita, negativo 1 estrella, recuperación mediante GET, 1440x1050/834x1112/390x844, borrador rechazado sin envío, quitar texto, pendiente/doble envío bloqueado, 400/409/429/503 sin éxito falso, gate cerrado y cero errores JS.
- HTTP de pruebas real local con repositorio EN MEMORIA y API browser interceptada. Se extrajo únicamente registerRatingsRoutes para el harness; NO se importó/ejecutó el servidor completo, NO se abrió conexión MariaDB y NO se ejecutó SQL.
- La prueba inicial descubrió evasión de dominio con letras espaciadas; corregida y repetida batería 37/37. No se afirma eficacia total del filtro.
- Capturas sobre ficha existente de la base, no Glass aún sin integrar. Logo Glass no modificado; 12 responsive de la corrección siguen en rama Glass, no se atribuyen a estas pruebas.

### Evidencia y archivos
4 capturas sintéticas: comentarios desktop/tablet/mobile y gate cerrado:
https://chatgpt.com/library?file_id=libfile_2bcafafc336c81919b5b5d39ac891ae3&account_id=personal
Archivos modificados: server.ts, src/db/mariadb.ts, src/services/api.ts, src/utils/realRatings.ts, src/components/StarRatingWidget.tsx; nuevos src/components/BusinessComments.tsx, BusinessCommentsPolicy.tsx, BusinessComments.css; WORK_RESULTADOS y progreso de esta tarea.
Sin App, editor, Radar, auth global ni dependencias. No PR/merge/despliegue/SQL. Rollback propuesto: revertir commits de esta rama en una integración futura; gate default off conserva no publicación de texto. No rollback de datos porque no se escribió BD.
Dictamen: APTO PARA REVISIÓN DEL CÓDIGO PREPARADO; NO APTO PARA ACTIVAR COMENTARIOS PÚBLICOS NI MODERACIÓN. Se concluye el trabajo seguro posible y continúa Radar sin nueva espera.

### Verificación adicional de cierre — 2026-10-28T11:21:02.702Z
- Compilación aislada del backend completo con esbuild --bundle --platform=node --format=esm --packages=external --outfile=/tmp/enc-comments-validation/server.bundle.mjs: PASS. Solo compilación, jamás ejecución de servidor ni conexión/consulta.
- Rutas/política harness SHA256 bd33b1a54ec10bfc204731d2ae2e95c2017007ecc2b2f5d5c1f02897d91e4657; navegador 90646a3aca5011100b407ce41db880db1ff07997e3cad8a841185b4914bacaec.
- Los ocho archivos de código publicados fueron leídos de vuelta y coinciden exactamente con la copia probada.
- Cambio concurrente verificado: PR #4 ya fue integrado por coordinación en cad1222618c94f4eb3dabb589b6e58836191dcb7 después de la base de esta tarea. Work no integró ni rebasó Comentarios. Se mantiene la dependencia de adaptar el aviso estático de Glass en integración revisada; código de logo intacto.
- Entrega final sigue siendo PARCIAL PREPARADA, gate default off y moderación bloqueada. No activar ni declarar módulo completo.

### Corrección final de parser de ratings — 2026-10-28T11:22:37.597Z
Se detectó que el parser JSON de 2kb no impedía que cuerpos no JSON llegaran al parser urlencoded global de 50mb. Corregido exclusivamente en /api/ratings: POST no JSON devuelve 415 antes de parsear y Content-Length >2048 devuelve 413; el parser JSON mantiene límite para cuerpos chunked/descomprimidos. No se cambió el parser de otras rutas.
Se extrajo también el middleware REAL al harness: 38 pruebas de política/rutas/middleware PASS, incluidas 413 y 415; TypeScript y bundle esbuild del backend PASS. Harness rutas actualizado SHA256 b7f41ffa06712883fccf80bd1a4d2ae3cae8c0a175d6453323d9e23e7c8c44a2. Una ejecución inicial del harness falló por resolución de body-parser al empaquetar Express; se marcó Express externo en el harness y la batería completa pasó. No es fallo de aplicación.
La batería Chromium de 13 PASS sigue vigente: no hubo cambios frontend tras ella. Gate cerrado por defecto y bloqueos administrativos intactos. Sin servidor completo, SQL ni BD.

### Salida del borrador si cae disponibilidad — 2026-10-28T11:24:35.640Z
Añadido botón “Quitar comentario”, disponible aunque la consulta de comentarios falle, salvo durante envío. Corrige el caso en que textarea queda deshabilitado con borrador y el visitante necesita confirmar solo estrellas. La batería completa Chromium ahora pasa 14/14, incluido cambio a 503 durante borrador y envío posterior sin texto. TypeScript y Vite PASS. Las 38 pruebas backend/política siguen vigentes; sin cambios backend en este commit.
Harness navegador final SHA256 9cb52b2ff54c33bf5edd8e636d8708d4a66f807ffd8b8de69213f08dcc8d96d2. Cuatro capturas regeneradas en el mismo enlace anterior. Gate cerrado por defecto, sin activación, moderación, SQL ni persistencia real probada.
