# Estado actual — FreeLLMAPI

**Actualizado:** 2026-11-17  
**Repositorio:** `dJeoMed78/Encarmenorg`  
**Rama experimental:** `experiment/freellmapi-evaluation-20261116`  
**Ruta de la aplicación:** `experiments/freellmapi/vercel-adapter/`  
**Entorno autorizado:** proyecto experimental independiente en Vercel.

## Objetivo
Chat web privado que permite trabajar con distintos proveedores de IA y conservar el contexto del proyecto para continuar cuando se agote la cuota o se cambie de modelo.

## Estado técnico conocido
- Interfaz web de chat implementada.
- Autenticación de acceso por cookie HttpOnly y contraseña de acceso configurada como variable sensible en Vercel.
- Adaptador compatible con formato de mensajes tipo OpenAI.
- Proveedor Gemini: ruta configurada mediante `GEMINI_API_KEY`.
- Proveedor Groq: ruta configurada mediante `GROQ_API_KEY`, modelo `openai/gpt-oss-20b`.
- Selector visual de proveedores: modo automático, Gemini y Groq.
- Código de fallback automático agregado: ante 429, 500, 502, 503, 504 o timeout intenta el proveedor alternativo. No hacer fallback ante errores de autenticación o solicitudes inválidas.
- No se ha documentado todavía una prueba real controlada que demuestre el failover automático de extremo a extremo.
- No hay credencial GitHub configurada en Vercel para que la aplicación escriba su propia memoria.
- Por tanto, el guardado automático de transcripciones aún NO está implementado.

## Seguridad
No copiar ni registrar valores de `GEMINI_API_KEY`, `GROQ_API_KEY`, `PROXY_ACCESS_TOKEN` ni `CHAT_ACCESS_PASSWORD`. Todas son credenciales privadas.
La clave Gemini expuesta anteriormente fue revocada por el propietario. No asumir que la nueva credencial de Vercel es válida sin probar generación real.

## Restricciones del propietario
- No modificar nunca el sitio productivo `encarmen.org`.
- No modificar el proyecto principal IA para Todos.
- Mantener este trabajo aislado en la rama y proyecto experimental FreeLLMAPI.
- No habilitar facturación ni servicios de pago; respetar las cuotas gratuitas.
- No declarar éxito sin pruebas reales.

## Pendientes prioritarios
1. Confirmar que el último despliegue de Vercel está READY y verificar que contiene el selector automático.
2. Probar generación real con Gemini y Groq por separado.
3. Probar failover real provocando/ simulando un 429 controlado sin consumir cuota innecesaria.
4. Implementar persistencia de proyectos, conversaciones, mensajes y resúmenes en GitHub.
5. Añadir recuperación de contexto al abrir una conversación y al cambiar de proveedor.
6. Añadir límites de tamaño, paginación y saneamiento de datos; nunca almacenar secretos.
7. Verificar que las operaciones de guardado no bloqueen el chat cuando GitHub esté indisponible.

## Próxima acción
Configurar un Fine-grained Personal Access Token de GitHub con acceso **Contents: Read and write** únicamente al repositorio `Encarmenorg`, almacenarlo en Vercel como variable sensible `GITHUB_MEMORY_TOKEN`, y después implementar los endpoints de lectura/escritura para esta carpeta. Nunca pegar el token en el chat ni guardarlo en el repositorio.
