# PRUEBA DE MEMORIA

- ID: prueba-de-memoria
- Creado: 2026-11-17T16:17:45.055Z
- Estado: EN CURSO

## Objetivo
Por definir.

## Historial de trabajo

## Decisiones

## Pendientes

## Siguiente acción


### 2026-11-17T16:24:37.876Z · user

QUE OTRAS IA ME PUEDEN DAR API GRATUITAS Y SIN LIMITES.. DAME 3.

### 2026-11-17T16:24:40.520Z · assistant

Aquí tienes tres opciones de IA que ofrecen APIs gratuitas (con límites razonables que suelen cubrir la mayoría de los proyectos pequeños o pruebas). Ten en cuenta que, aunque son gratuitas, normalmente tienen algún tipo de límite de uso (por ejemplo, número de tokens, peticiones por día, etc.), así que revisa bien los términos antes de usarlas en producción.

| # | Plataforma | Tipo de IA | Límite gratuito | Enlace |
|---|------------|------------|-----------------|--------|
| 1 | **Hugging Face 🤗 Inference API** | Modelos NLP/Visión/Audio (BERT, GPT‑2, T5, Stable Diffusion, etc.) | 5 000 peticiones por mes (para la mayoría de los modelos) y 1 000 tokens por petición | <https://huggingface.co/inference-api> |
| 2 | **Cohere** | Modelos de lenguaje (similar a GPT‑3, pero con enfoque en generación y clasificación) | 50 000 tokens gratuitos al mes (incluye 1 000 tokens de prueba por día) | <https://cohere.com> |
| 3 | **AI21 Labs (Jurassic‑2)** | Modelos de lenguaje de gran escala | 5 000 tokens gratuitos al mes con acceso a “Jurassic‑2” y “Jurassic‑2‑Ultra” | <https://www.ai21.com> |

### Cómo empezar

1. **Regístrate** en la página indicada y crea una cuenta gratuita.
2. **Genera una API key** siguiendo la guía de la plataforma.
3. **Lee la documentación** para ver los endpoints disponibles y los límites exactos de cada plan gratuito.
4. **Implementa** la llamada desde tu aplicación (por ejemplo, usando `fetch` en JavaScript, `requests` en Python, etc.).

#### Tips rápidos

| Consejo | Detalle |
|---------|---------|
| **Gestiona los tokens** | Usa los parámetros de truncamiento (`max_tokens`, `max_length`, etc.) para no consumir más de lo necesario. |
| **Cacheo** | Implementa una capa de caché local (por ejemplo, Redis) para evitar repetir las mismas consultas. |
| **Monitorización** | Almacena los registros de uso para detectar cuando te acercas al límite y puedas cambiar a otro plan o a otro proveedor. |

> **Advertencia**: ninguna API realmente es *sin límites* en el sentido absoluto. Los límites gratuitos están diseñados para permitir pruebas y proyectos pequeños; si tu uso crece, deberás pasar a un plan de pago o combinar varios
