# Encarmen — Contexto maestro y protocolo de continuidad

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
