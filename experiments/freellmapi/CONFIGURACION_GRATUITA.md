# FreeLLMAPI — configuración de proveedores gratuitos (experimental)

Estado: configuración base preparada, **sin claves ni conexión real**. No desplegar en Hostinger ni modificar main o producción.

## Proveedores gratuitos para alta manual

1. **Google AI Studio**: https://aistudio.google.com/apikey — crear proyecto **sin facturación habilitada** y clave de Gemini API; seleccionar solo modelos marcados Free tier.
2. **GroqCloud**: https://console.groq.com/keys — crear clave en plan Free; no pasar a Developer/billing.
3. **OpenRouter**: https://openrouter.ai/settings/keys — crear clave sin comprar créditos; usar exclusivamente modelos con sufijo `:free` o `openrouter/free`. Su plan gratuito tiene límites de solicitudes.

## Configuración segura

FreeLLMAPI soporta claves desde el dashboard **Keys**, almacenadas cifradas en SQLite mediante `ENCRYPTION_KEY` (64 caracteres hexadecimales, generada fuera de GitHub). Añadir claves de proveedor en la instancia privada, no en este repositorio ni en tickets, logs o capturas. El archivo `free-providers.config.json` únicamente establece la estrategia de enrutamiento `balanced` y no crea claves falsas.

Para iniciar una instancia privada según la documentación upstream: configurar `ENCRYPTION_KEY`, instalar dependencias, compilar, ejecutar `node server/dist/index.js`, abrir el dashboard en `http://localhost:3001`, crear usuario administrador y añadir claves en **Keys**. Requiere un equipo o servicio que ejecute Node.js y almacenamiento persistente; GitHub Actions solo valida el proyecto, **no mantiene un servidor activo**. No exponer el dashboard públicamente sin controles de acceso y TLS.

Una vez que haya al menos una clave gratuita activa, consultar `/v1/models` y efectuar una petición real para verificar autenticación, cuota y respuesta. **No considerar conectado** hasta obtener respuesta del proveedor.

### Restricciones

- No habilitar billing, recargas, tarjetas ni modelos de pago.
- No incluir código, datos privados o secretos de ENCARMEN en solicitudes a proveedores gratuitos sin revisar sus condiciones de privacidad.
- No tocar `main`, `ia-desarrollo`, Hostinger ni `encarmen.org`.
- La suscripción Gemini Pro de consumo no equivale a crédito de API.

## Fuentes

- https://ai.google.dev/gemini-api/docs/pricing
- https://console.groq.com/docs/rate-limits
- https://openrouter.ai/collections/free-models
- https://openrouter.ai/pricing
- `upstream/docs/en/install/01-install.md`
