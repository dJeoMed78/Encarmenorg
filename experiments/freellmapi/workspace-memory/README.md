# FreeLLMAPI — Memoria de trabajo persistente

Esta carpeta contiene la memoria operativa para dar continuidad a proyectos y conversaciones aunque cambie el proveedor/modelo o se agote su cuota.

## Archivos
- `CURRENT_STATE.md`: estado vigente y siguiente acción. Leer primero.
- `PROJECTS.md`: índice de proyectos y sus objetivos.
- `DECISIONS.md`: decisiones confirmadas y restricciones.
- `HANDOFF_TEMPLATE.md`: formato obligatorio de traspaso entre agentes/modelos.
- `sessions/YYYY/MM/`: transcripciones o resúmenes de sesiones, por fecha.
- `artifacts/`: referencias a commits, PR, pruebas y entregables.

## Protocolo de continuidad
1. Leer `CURRENT_STATE.md`, `PROJECTS.md` y `DECISIONS.md`.
2. Leer el último handoff y la sesión más reciente del proyecto activo.
3. Verificar el estado real del código, commits, despliegues y pruebas; la memoria no sustituye la verificación.
4. Al terminar cada tarea, registrar resultados comprobables, errores, decisiones y siguiente acción.
5. Antes de cambiar de proveedor/modelo, guardar un handoff actualizado y el resumen de sesión.
6. No marcar una tarea como terminada sin evidencia.

## Seguridad y privacidad
- Nunca guardar API keys, tokens, contraseñas, cookies, secretos, datos personales sensibles ni contenido de archivos de credenciales.
- Las transcripciones deben redactarse para eliminar secretos y datos sensibles.
- No registrar prompts privados ajenos al proyecto ni datos de terceros innecesarios.
- La memoria de GitHub es específica de este proyecto; no guardar aquí conversaciones de otros proyectos.
- No usar `main` ni modificar ENCARMEN productivo desde este espacio experimental.

## Estado de automatización
La estructura documental queda preparada. El guardado automático de mensajes requiere habilitar una credencial GitHub de escritura limitada y conectar el backend de Vercel a esta ruta. Hasta entonces, los registros se guardan mediante commits explícitos; no se debe afirmar que el historial se captura automáticamente.
