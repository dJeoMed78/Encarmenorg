# Encarmen — Contexto maestro y protocolo de continuidad

> **PUNTO DE ENTRADA NIA (2026-10-30):** ante chat nuevo o pérdida de contexto, leer primero `docs/coordination/NIA_INICIO_RAPIDO.md` de `coord/encarmen-work-control-001`. Conserva nombre Nia, rol Jefa 3, personalidad operativa, reglas del laboratorio Staging, prohibición de producción, pruebas y último estado verificado. Actualizar cuando cambie el estado real. La memoria de chat no sustituye GitHub.


> **JEFA 3 — CONTINUIDAD Y AUTONOMÍA DE STAGING (2026-10-30):** para toda nueva conversación de ENCARMEN, leer primero `docs/coordination/JEFA3_IDENTIDAD_Y_CONTINUIDAD.md` y `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md` de la rama `coord/encarmen-work-control-001`. El propietario declaró `ia-desarrollo`, `https://staging.encarmen.org` y MariaDB `u293982346_encarmentest` laboratorio autorizado, sujeto a aislamiento real, respaldos y reversión. Producción `main`, `https://encarmen.org` y `u293982346_encarmenapp` siguen prohibidos hasta orden final explícita, después de validación física completa del propietario. **PR #10 fusionado** en `ia-desarrollo` SHA `667682fe953c94c65c90777a7ee75a6451b824ff`; inspección del proceso Staging confirma bundle compilado con readback estricto y GET MariaDB válido, pero POST/PATCH público autenticado sigue pendiente. Ver registro maestro para evidencias actualizadas; el historial antiguo de este documento no sustituye las pruebas actuales.


> **PROTOCOLO PERMANENTE DE LA JEFA (2026-10-29):** leer obligatoriamente `docs/coordination/LA_JEFA_METODOLOGIA_PERMANENTE.md` en esta rama. La Jefa debe actuar proactivamente como directora técnica: revisar código y pruebas reales, corregir directamente en ramas aisladas lo que pueda resolver, reservar trabajadores para tareas pesadas o especializadas, evitar confirmaciones/traslados innecesarios, administrar cuotas y mantener continuidad documentada en GitHub. Este protocolo no autoriza integración ni despliegue automático. No asumir bases independientes entre Staging y producción sin prueba.


> Documento de continuidad para asistentes y colaboradores. Fecha de actualización: 2026-10-27.
> **Leer este archivo al comenzar cualquier sesión de desarrollo.** Es documentación, no una orden de modificar producción.
> Mantener actualizado al cerrar cada intervención técnica. No almacenar secretos ni datos personales.

## 1. Identidad y objetivos

- Proyecto: **Encarmen**, directorio empresarial de Ciudad del Carmen, México.
- Producción: https://encarmen.org
- Staging: https://staging.encarmen.org
- Repositorio: `dJeoMed78/Encarmenorg`.
- El propietario prioriza precisión visual, funcionamiento real, continuidad de contexto, cambios auditables y evitar despliegues innecesarios.
- Idioma de comunicación: español de México. No afirmar que algo quedó publicado, probado o idéntico si no existe evidencia.

## 2. Entornos y política estricta

- `main`: **producción**. No modificar ni fusionar a `main` sin autorización expresa del propietario.
- `ia-desarrollo`: rama de trabajo de **staging**, con despliegue automático de Hostinger según la configuración informada.
- Existen otras ramas históricas, entre ellas `google-ai-studio-limpieza`; revisar antes de proponer fusiones.
- Staging y producción deben mantener bases de datos independientes. La base staging reportada es `u293982346_encarmentest`. **No guardar usuarios, passwords, cadenas de conexión ni tokens aquí.**
- `STAGING_READ_ONLY=false` fue el valor reportado para pruebas de staging. Verificar configuración vigente antes de operaciones que escriban datos.
- No modificar, borrar, migrar ni sobrescribir datos reales de producción.
- Evitar commits repetitivos: agrupar cambios coherentes y probar antes de subir.

## 3. Stack técnico verificado / informado

- Frontend: React, TypeScript, Vite, Tailwind CSS, lucide-react.
- Backend: Node.js, Express; base de datos MariaDB/MySQL mediante `mysql2`.
- Hosting: **Hostinger Web Hosting Business** (confirmado por propietario el 2026-10-27).
- Node 22 fue reportado para staging; verificar en hPanel.
- Comandos observados en `package.json` el 2026-10-27:
  - `npm run lint` → `tsc --noEmit`
  - `npm run build:server` → `vite build && esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js && cp server.js api/server.bundle.js`
  - `npm run build` → actualización de versión + `npm run build:server`.
- **Antes de desplegar** ejecutar validación TypeScript y compilación si el entorno lo permite. Si no se ejecutaron, declarar explícitamente esa limitación.
- La compilación y el despliegue de Hostinger son comprobaciones diferentes; un commit exitoso no prueba que la aplicación esté publicada y operativa.

## 4. Funcionalidad: editor de negocios

- Archivo principal: `src/components/EditBusinessModal.tsx`.
- El usuario aprobó una referencia visual de editor **iOS/macOS Glass** y exige fidelidad detallada, sobre todo transparencia, desenfoque, colores, bordes y composición.
- La referencia aprobada es la **primera imagen** de una comparación de seis capturas compartidas en conversación el 2026-10-27. Las demás eran capturas de una implementación insatisfactoria. **La imagen no está incorporada en el repositorio por este documento; pedirla o localizarla antes de afirmar coincidencia píxel a píxel.**
- La superposición verde tipo Matrix de capturas anteriores **no es parte del diseño**.

### Diseño aprobado: estructura

1. Modal flotante translúcido, cristal esmerilado con blur real, fondo ambiental azul/rosa visible a través del panel, borde fino blanco, esquinas redondeadas; evitar bloque gris opaco.
2. Encabezado: ícono de lápiz en cuadro de cristal, título **Editar Negocio**, subtítulo **Actualiza la información de tu negocio en el directorio**, botón circular de cierre.
3. Seis tarjetas agrupadas, no una tarjeta por campo:
   - **Información Básica**: ícono amarillo, nombre y categoría en dos columnas; descripción y contador de 500 caracteres.
   - **Contacto**: ícono azul, teléfono y WhatsApp en dos columnas.
   - **Ubicación**: ícono rosa, colonia/fraccionamiento y ciudad en dos columnas.
   - **Modalidad de Atención y Entrega**: ícono violeta, cinco opciones tipo chip, selección azul.
   - **Métodos de Pago**: ícono verde, cuatro chips, selección azul.
   - **Horarios de Atención**: ícono violeta, toggles Lun–Dom y controles de hora de apertura/cierre.
4. Pie translúcido fijo con **Cancelar** y botón azul **Guardar Cambios**.
5. Campos blancos y contraste legible; composición compacta, responsive y sin scroll excesivo en las seis secciones.
6. Mantener funciones existentes de enlaces, administración, logo y galería sin entorpecer las seis secciones; considerar sección avanzada plegable.

### Requisitos funcionales

- Al menos un teléfono **o** WhatsApp válido de 10 dígitos.
- Cinco opciones estandarizadas de modalidad/entrega con multiselección.
- No cerrar el modal accidentalmente al seleccionar texto.
- Conservar logo, imágenes, galería, enlaces y opciones administrativas existentes.
- No mostrar guardado exitoso si el backend no confirmó persistencia.
- Si se sustituyen horarios de texto libre por controles semanales, **preservar horarios preexistentes**; no sobrescribirlos al abrir/guardar sin edición.
- Verificar que la información se guarda en MariaDB de staging y se vuelve a mostrar al recargar.

## 5. Historial y estado pendiente

- `1e8fff4`: corrección previa del comando de compilación para staging (según historial de trabajo).
- `ec5f3b6`: implementación anterior del editor, rechazada por discrepancias visuales.
- `940fded412c5e58955653ab0a726ca033575fbf9`: intento de reconstrucción de tarjetas Glass en `ia-desarrollo`. **No fue validado visualmente ni confirmado por compilación en esa intervención. No declararlo terminado.**
- Al revisar el archivo desde GitHub el 2026-10-27, `EditBusinessModal.tsx` tenía SHA de blob `e7553dabc3bbe50584d93fda48b5cad5e979bb1b`, diferente al SHA de una lectura anterior. **No asumir que el último estado del código equivale al commit histórico citado: inspeccionar diff y compilación.**
- Pendientes prioritarios: verificar JSX/TSX y build; contrastar contra imagen aprobada; ajustar efecto glass y ambiente detrás del modal; completar controles semanales y horas; unificar chips seleccionados en azul; fijar footer; plegar campos avanzados; probar edición/guardado/recarga.
- Registro temporal de pruebas mencionado: negocio ID `20271` de staging. No reutilizar ni editar sin verificar que sigue siendo registro de prueba.

## 6. Operación de Hostinger y SSH

- Plan confirmado: **Web Hosting Business**.
- Hostinger permite SSH en planes Premium y superiores, incluido Business. La ruta actual documentada es **Websites → Dashboard → SSH Access**.
- En hosting compartido, SSH suele estar limitado al directorio de la cuenta, **no necesariamente al subdominio staging**. Puede exponer archivos de otros sitios de la misma cuenta.
- **Esta conversación no tiene conexión SSH directa autenticada con Hostinger.** Habilitar SSH en hPanel no concede acceso automático al asistente.
- No pegar contraseñas, claves privadas, tokens, contenido de `.env`, respaldos de bases de datos ni cadenas de conexión en chats o repositorio.
- Si se configura integración de Hostinger, priorizar permisos mínimos, operaciones limitadas a staging y aprobación explícita para acciones destructivas.
- Para revisar hPanel mediante navegador interactivo se puede evaluar ChatGPT Work, sujeto a disponibilidad y permisos.
- La conexión a GitHub y el acceso a Hostinger son independientes.

## 7. Protocolo para futuras conversaciones

1. Leer este archivo desde la rama `ia-desarrollo`, no confiar solo en memoria conversacional.
2. Leer el código y los commits actuales; comparar contra este documento, que puede estar desactualizado.
3. Preguntar o localizar la imagen de diseño aprobada cuando sea necesaria una comparación visual exacta.
4. Identificar alcance, riesgos y archivos afectados antes de escribir.
5. No tocar `main` ni producción sin permiso explícito.
6. Agrupar modificaciones, ejecutar `npm run lint` y `npm run build:server` cuando sea posible.
7. Confirmar despliegue de Hostinger y pruebas funcionales/visuales **solo si realmente se observaron**.
8. Informar rama, SHA del commit, cambios, pruebas ejecutadas, fallas y pendientes.
9. Actualizar **Estado actual** de este documento después de cada intervención significativa, manteniendo historial útil.
10. No registrar secretos ni datos sensibles.

## 8. Estado actual de esta documentación

- 2026-10-27: primera versión del contexto maestro, creada como documentación en `ia-desarrollo`.
- Documentación basada en antecedentes de trabajo y una lectura actual de `package.json` y del SHA de `EditBusinessModal.tsx`.
- **No se ha realizado aquí prueba de compilación ni validación visual del editor.**
- Próxima tarea: confirmar acceso a Hostinger de forma segura y continuar corrección del editor en staging.


---

# Anexo A — Historial técnico ampliado y decisiones que deben preservarse

Este anexo conserva información adicional recuperada del historial del proyecto. Cuando una afirmación procede de una conversación o un resultado previo, se indica como **reportada** y debe verificarse contra el repositorio o servidor actual antes de actuar.

## A.1 Evolución arquitectónica: WordPress y WooCommerce

- Se acordó migrar hacia una arquitectura **autónoma** basada en Hostinger, Node/Express y MariaDB, sin dependencia operativa de WordPress/WooCommerce.
- Según un registro técnico anterior, `server.ts` eliminó la sincronización con WooCommerce/WordPress; `/api/sync`, el webhook y la sincronización por negocio se configuraron para responder **HTTP 410 Gone**, mientras `/api/health-wp` indicó `decommissioned`. **Verificar el estado actual antes de confiar en estos endpoints.**
- Se reportaron cambios asociados en `src/services/api.ts`, `WordPressSyncModal.tsx`, `RegisterBusinessView.tsx`, `render.yaml`, `.env.example`, `README.md` y bundles.
- Se informó que se conservaron **1,824 archivos multimedia**, con una prueba de imagen HTTP 200, TypeScript y compilación correctos en aquella intervención. Esto **no equivale a una auditoría actual** de integridad de medios.
- La decisión de retirar WordPress es relevante: no reintroducir sincronización ni dependencia WordPress/WooCommerce sin nueva autorización.
- En aquel registro se aclaró que no se había desplegado a producción. Los despliegues posteriores deben reconstruirse desde GitHub y Hostinger.

## A.2 Bases de datos y aislamiento

- Nombre de BD de producción **reportado** en una conversación previa: `u293982346_encarmenapp`.
- Nombre de BD de staging **reportado**: `u293982346_encarmentest`.
- Se reportó una importación de respaldo de staging con **76 consultas, 13 tablas y 206 empresas**. Son cifras históricas, **no recuentos actuales**.
- La base staging se describió como una copia independiente y con escritura habilitada para pruebas.
- **No registrar ni repetir nombres de usuario de BD, contraseñas, tokens, claves ni valores de conexión.** Tampoco pegar contenidos de archivos `.env`.
- Nunca asumir que una operación en staging es inocua sin comprobar a qué BD apunta el proceso activo.
- Antes de cualquier operación de datos: comprobar variables de entorno sin revelar secretos, confirmar conexión al esquema correcto, planificar reversión y evitar alteraciones masivas.

## A.3 Historia de compilación y despliegue

- Se reportó un fallo en el que la compilación de Hostinger no actualizaba el frontend React/Vite como se esperaba; se investigaron diferencias entre `npm run build` y `npm run build:server`.
- Commits históricos mencionados en conversaciones: `615b770`, `8ec8b85`, `a6dcff7`, `8d274f61`, `ab07d2fd`, `e884c...` (último identificador incompleto). **No atribuirles cambios específicos sin inspeccionar sus diffs.**
- En una intervención posterior se reportó que `1e8fff4` dejó `build:server` incluyendo Vite, esbuild y copia del bundle. La lectura directa de `package.json` el 2026-10-27 confirmó esa composición del script, aunque no certifica qué commit la introdujo.
- En Hostinger Business, el disparador automático puede ejecutar compilaciones por commits documentales. Evitar cambios pequeños innecesarios en `ia-desarrollo`.
- Para validar un despliegue comprobar: SHA de origen, resultado de build, artefactos actualizados, respuesta HTTP, versión visible, consola de navegador, rutas API, persistencia en BD y regresiones.
- La herramienta GitHub conectada permite leer/escribir archivos y commits; **no proporciona por sí sola acceso SSH ni consola hPanel**.

## A.4 Editor Glass: diferencias detectadas en capturas

Comparación del 2026-10-27: primera imagen = diseño aprobado; imágenes restantes = implementación real de staging.

Problemas observados/reclamados:
- Panel demasiado gris y opaco, sin transparencia ni color ambiental visibles.
- Tarjetas excesivamente separadas en vez de seis grupos compactos.
- Demasiado desplazamiento vertical debido a campos administrativos y multimedia mezclados con el formulario principal.
- Chips seleccionados en naranja para entrega y violeta para pagos, cuando la referencia aprobada los muestra azules.
- Horarios como texto libre en lugar de siete toggles de días y dos controles de apertura/cierre.
- Pie de acciones no fijo.
- Encabezado con icono de edificio en lugar del lápiz de la referencia.
- La referencia tenía borde luminoso blanco, desenfoque intenso, tarjetas translúcidas y fondo difuso azul/rosa visible detrás.
- Un simple `backdrop-filter` no garantiza el efecto de la imagen si detrás hay una capa plana u opaca: revisar conjuntamente el **fondo detrás del modal**, la opacidad de overlay y panel, blur, saturación, bordes y sombras.
- La superposición verde tipo Matrix que apareció en otras capturas **debe ignorarse**.

Advertencia de implementación:
- La reorganización del JSX de `EditBusinessModal.tsx` alrededor del commit `940fded` se hizo sin prueba de compilación confirmada en esa intervención.
- El campo `formData.schedule` se había descrito como texto libre. Si se agregan controles semanales, preservar horarios históricos; escribir al campo persistente únicamente después de una edición explícita o una conversión validada.
- Preservar selección múltiple, datos existentes, imágenes, categorías, direcciones, enlaces y administración.
- Los cambios visuales deben verificarse con capturas reales a tamaño comparable; no prometer identidad sin comparación.

## A.5 Reglas de trabajo y preferencias del propietario

- El propietario exige **fidelidad exacta** a diseños aprobados; una interpretación parecida no basta.
- Solicita pruebas reales y comunicación transparente, sin afirmar “terminado” o “publicado correctamente” solo por haber creado un commit.
- Prefiere trabajar extensamente en el mismo chat y reducir cambios de herramienta; considera Work/Codex solo cuando aporten pruebas, navegador o ejecución que aquí no esté disponible.
- Quiere que el proyecto pueda retomarse **sin repetir todo el historial**. Este archivo debe ser el punto de entrada obligatorio y actualizarse al concluir cada trabajo.
- Prioriza **staging** para toda modificación y no tocar producción sin autorización explícita.
- Busca integrar Hostinger con el flujo actual, idealmente con privilegios limitados a staging.
- Evitar cambios de diseño, reestructuración o eliminación de funciones no solicitados.

## A.6 Hostinger Business: SSH y captura de estado

- El propietario confirmó **Web Hosting Business**.
- En captura de hPanel del 2026-10-27, sección “Detalles de SSH”, el panel mostraba:
  - Estado: **INACTIVE**.
  - Puerto SSH: **65002**.
  - Existían una IP del servidor, usuario SSH y huellas de host ED25519/ECDSA/RSA visibles. **No hace falta reproducirlos aquí**; consultarlos en hPanel antes de conectarse.
  - Botón **Activar** disponible.
- No se ha confirmado en esta documentación que SSH haya sido activado.
- Activar SSH no otorga automáticamente permisos a esta conversación. Requiere un cliente/integración con autenticación.
- Hostinger Business es alojamiento compartido: el usuario SSH puede abarcar más que staging. **No asumir confinamiento por subdominio**.
- Nunca subir claves privadas al repositorio ni pedir que se peguen en el chat. Para una integración futura, usar credenciales administradas por el servicio correspondiente y comprobar el alcance antes de habilitar escritura.
- No cambiar contraseña, firewall, permisos, archivos o procesos de producción como parte de la puesta en marcha de staging.

## A.7 Registro de decisiones abiertas

| Tema | Decisión vigente | Pendiente |
| --- | --- | --- |
| Producción | No tocar `main` sin permiso | Ninguno |
| Staging | `ia-desarrollo` como rama de trabajo | Confirmar despliegue y versión |
| Diseño editor | Referencia Glass aprobada | Implementación y validación pixel/funcional |
| Horarios | Preservar datos históricos | Diseñar serialización de controles semanales |
| Funciones extra | No perder datos ni funciones | Ordenarlas en interfaz avanzada |
| Hostinger | Plan Business confirmado | Activar SSH si procede y definir integración segura |
| Documentación | Mantener contexto exhaustivo en GitHub | Actualizar al cierre de cada intervención |
| WordPress | Arquitectura autónoma sin sincronización | Verificar que no haya dependencias residuales |

## A.8 Lista de comprobación de cierre de cada intervención

- [ ] Revisé el estado actual del repositorio y los archivos relevantes.
- [ ] Trabajé solo en `ia-desarrollo`, salvo autorización expresa.
- [ ] Respeté el diseño aprobado y no eliminé funciones existentes.
- [ ] Ejecuté `npm run lint` y `npm run build:server`, o indiqué que no fue posible.
- [ ] Verifiqué el despliegue en Hostinger, o indiqué que no tengo acceso a comprobarlo.
- [ ] Probé guardado, recarga, multimedia y comportamiento responsive cuando correspondía.
- [ ] Informé SHA de commit, archivos modificados, pruebas, riesgos y pendientes.
- [ ] Actualicé este documento con los cambios importantes y el estado real.
- [ ] No incorporé secretos, contraseñas, claves privadas ni datos sensibles.

## A.9 Límites de esta memoria técnica

- Este archivo **no es una transcripción íntegra** de todas las conversaciones. Conserva los hechos y decisiones técnicas recuperables y útiles.
- No se garantiza que todas las conversaciones o capturas históricas estén disponibles desde una sesión futura. Por eso es recomendable conservar las referencias visuales aprobadas también como archivos de proyecto, sin secretos.
- Cuando un dato histórico contradiga código, registros o configuración actual, **investigar y registrar la discrepancia** en vez de asumir que uno de los dos es correcto.
- Los identificadores de commits incompletos, estados de hosting y cifras históricas se mantienen como pistas de auditoría, no como verificaciones actuales.



## 15. REGLA OBLIGATORIA: documentación sincronizada con cada push (2026-10-27)

**Instrucción expresa del propietario, sin excepciones:** cada push o commit de cambios funcionales a `ia-desarrollo` debe incluir la actualización correspondiente de este documento, idealmente en el mismo commit. Antes de declarar un despliegue terminado, comprobar que este archivo refleja código implementado, decisiones aprobadas, pendientes, riesgos y pruebas efectuadas. No afirmar que una maqueta es código desplegado. No modificar `main` sin autorización específica.

### Ficha pública de negocios — diseño visual aprobado, AÚN PENDIENTE DE IMPLEMENTACIÓN

- Diseño iOS/macOS Glass aprobado en conversación: **no crear una barra superior de navegación adicional** dentro de la ficha. Respetar la navegación existente del portal.
- Fotografía y galería a la izquierda, logo a la derecha del encabezado, tipografía consistente con el nombre en `BusinessCard.tsx`: **Roboto**, actualmente definido allí con `font-bold`, 18 px y `letter-spacing: -0.015em`. Homologar la familia en todo el portal, con escalas y pesos distintos según jerarquía y pantalla; evitar imponer un mismo tamaño a todos.
- El botón azul para llamar ya contiene el teléfono: no duplicar tarjeta de teléfono.
- El botón de Landing Page debe mostrar la URL real generada a partir del slug, por ejemplo `https://encarmen.org/bendita_carmelita`; no inventar slugs ni URLs.
- Eliminar «Nuestros servicios» porque el formulario de alta no captura un catálogo de servicios.
- Distribución solicitada: descripción amplia; opiniones de la comunidad; formas de pago; modalidades de atención/entrega; ubicación en mapa con dirección agrupada debajo; horarios y acciones actuales. Los datos mostrados deben provenir de campos existentes, no inventarse.
- Los controles, enlaces, WhatsApp, llamadas, favoritos, galería, QR, edición y gestión deben continuar funcionando. Adaptar a móvil y tableta.
- Símbolo **π**: carácter pequeño y discreto junto al borde de la ventana de negocio, no gran botón flotante ni bloque en esquina. Al pulsarlo, mostrar autenticación administrativa centrada si no hay sesión válida; con sesión válida mostrar menú de gestión Glass centrado. La autorización de editar, marcar TOP/recomendada y eliminar **debe comprobarse en backend**, nunca depender solo del ocultamiento de controles.
- El menú de administración debe conservar editar datos del negocio, marcar recomendada, TOP y eliminar con confirmación.

### Opiniones — funcionalidad requerida, AÚN NO IMPLEMENTADA

- Se solicita sistema real de opiniones con texto, calificación, consulta y agregados persistidos en MariaDB; no presentar datos ficticios como opiniones reales.
- Se constató el 2026-10-27 que `src/utils/realRatings.ts` utiliza `localStorage` para calificaciones y efectúa una solicitud secundaria a `/api/ratings`; eso **no es** una solución de opiniones comunitarias segura ni multiusuario.
- Diseñar primero modelo SQL y API de consulta/publicación con validación de longitud y contenido, consultas parametrizadas, límites por IP/cuenta/negocio, protección de bots (p. ej. desafío validado en servidor), control de duplicados, moderación y estados pendiente/aprobada/rechazada, y auditoría sin exponer datos sensibles.
- No desplegar una caja de publicación de opiniones abierta sin estas defensas. No usar calificaciones o nombres inventados en staging como si fueran opiniones reales.

### Ajustes visuales anteriores pendientes de cierre

- En editor de negocios, dar al botón «Quitar foto» estilo de botón Glass acorde con «Cambiar foto», sin perder funcionalidad.
- Barra «Canales Oficiales y Comunidades WhatsApp» inmediatamente debajo de la foto, sin superposición: borde superior recto y esquinas inferiores redondeadas; flecha circular, sin texto «Desplegar».
- Promociones y eventos: pestañas retráctiles Glass en escritorio y controles compactos responsivos en móvil/tableta. Revisar visualmente su implementación en `Hero.tsx`.
- Todos los cambios de diseño deben respetar el arte aprobado y los campos realmente disponibles.

### Estado de ejecución

- **Autorización de publicación en staging:** concedida explícitamente por el propietario el 2026-10-27.
- La generación de una imagen nueva **no** equivale a modificar el repositorio ni a publicar en Hostinger.
- Antes de dar por completada la ficha nueva y las opiniones, verificar implementación, compilación, seguridad y despliegue efectivo. Producción `main` sigue fuera de alcance.

## Registro de implementación incremental — 2026-10-27

- `src/components/BusinessCard.tsx`: se eliminan teléfonos de respaldo ajenos al negocio, se normalizan números mexicanos de WhatsApp, se deshabilitan botones cuando falta un contacto y se presenta dirección formateada.
- Esta corrección funcional **no** equivale al rediseño de la ficha Glass ni a opiniones persistentes; ambos siguen pendientes.
- Pruebas: revisión estática. No se ejecutaron compilación TypeScript ni validación de despliegue Hostinger desde esta conexión.

### Avance de implementación — 2026-10-27 (ficha empresarial)

- Commit `ce1dbf0782e0071fb347431593f419f08450d55c`: `BusinessDetailModal.tsx` ahora muestra bajo «Landing Page» la ruta pública `https://encarmen.org/negocio/{slug o id}` según la ruta que abre el botón, y cambia el encabezado «Descripción y Servicios» a «Descripción del negocio» sin alterar el contenido.
- Verificación pendiente: compilación y prueba de navegación en Staging; el rediseño integral, reseñas escritas persistentes y protecciones anti-spam siguen pendientes. No desplegado a producción.
