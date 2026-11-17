# Handoff — FreeLLMAPI
- Proyecto: FreeLLMAPI
- Fecha/hora UTC: 2026-11-17
- Agente/modelo de origen: ChatGPT
- Proveedor/modelo usado: Gemini y Groq configurados como proveedores del proyecto; no inferir cuál respondió en esta sesión.
- Rama y commit base: `experiment/freellmapi-evaluation-20261116`
- Estado general: EN CURSO

## Objetivo activo
Implementar memoria persistente por proyecto y continuidad entre proveedores/modelos cuando se agote una cuota.

## Contexto imprescindible
El propietario pidió que el historial de cada conversación/proyecto quede en GitHub para que otro modelo pueda continuar el trabajo con el contexto previo.

## Instrucciones del propietario
- No tocar nunca el productivo de `encarmen.org`.
- No modificar el proyecto principal IA para Todos.
- No habilitar pagos ni facturación; usar cuotas gratuitas.
- No afirmar que una prueba pasó sin evidencia.

## Decisiones confirmadas
- Memoria por proyecto, independiente del proveedor.
- GitHub es el registro versionado.
- Mantener secretos fuera del historial.
- La estructura documental se creó en `experiments/freellmapi/workspace-memory/`.

## Cambios realizados
- README, CURRENT_STATE, PROJECTS, DECISIONS, HANDOFF_TEMPLATE y sessions/README creados en la rama experimental.
- El backend y la UI tienen código de selector Gemini/Groq y modo automático. La validación de despliegue/failover real sigue pendiente.
- Vercel no tiene actualmente una variable GitHub de memoria configurada; por ello no hay guardado automático de mensajes todavía.

## Pendientes
1. Crear un Fine-grained PAT con Contents: Read and write limitado solo a `Encarmenorg`.
2. Guardarlo en Vercel como variable sensible `GITHUB_MEMORY_TOKEN`, sin compartirlo en el chat.
3. Implementar API de persistencia: crear/listar proyectos, crear/guardar sesiones, anexar mensajes, leer estado y handoff.
4. Implementar recuperación automática de contexto al iniciar chat o cambiar proveedor.
5. Añadir sanitización de secretos, límites de tamaño y control de concurrencia.
6. Probar guardado y recuperación end-to-end.
7. Verificar failover Gemini↔Groq en el despliegue.

## Siguiente acción concreta
El propietario debe crear y guardar el Fine-grained PAT en Vercel. Después implementar endpoints usando esa variable de entorno.

## Seguridad
No se guardaron API keys, tokens ni contraseñas. La credencial Gemini compartida previamente fue revocada por el propietario.
