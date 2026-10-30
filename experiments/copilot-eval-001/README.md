# ENC-COPILOT-EVAL-001

## Objetivo

Experimento independiente para clasificar resultados ficticios de operaciones
HTTP administrativas. El módulo no se conecta a la aplicación, no realiza
solicitudes de red, no consulta bases de datos y no modifica registros.

## Contrato de entrada

`classifyOperationResult(input)` recibe un objeto plano con `status` entero
entre 100 y 599. `body` puede ser un objeto plano con una propiedad propia
`success` booleana. `networkError` es opcional; si se incluye debe ser booleano.
No se convierten tipos y no se mutan los argumentos.

## Contrato de salida

Siempre devuelve exactamente:

```js
{ state: 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN' | 'INVALID',
  confirmed: boolean,
  retryable: boolean }
```

## Tabla de decisiones

| Condición | `state` | `confirmed` | `retryable` |
| --- | --- | ---: | ---: |
| Input no plano, `null`, o `status` inválido | `INVALID` | `false` | `false` |
| `networkError === true` | `UNCERTAIN` | `false` | `true` |
| 2xx y `body.success === true` | `CONFIRMED` | `true` | `false` |
| 2xx y `body.success === false` | `REJECTED` | `false` | `false` |
| 2xx sin `success` booleano válido | `UNCERTAIN` | `false` | `true` |
| 400, 401, 403, 404, 409 o 422 | `REJECTED` | `false` | `false` |
| 408, 429 o 5xx | `UNCERTAIN` | `false` | `true` |
| Otro código HTTP válido | `UNCERTAIN` | `false` | `false` |

`networkError === true` tiene precedencia sobre la validación del código HTTP.

## Ejemplos

```js
classifyOperationResult({ status: 200, body: { success: true } });
// { state: 'CONFIRMED', confirmed: true, retryable: false }

classifyOperationResult({ status: 500 });
// { state: 'UNCERTAIN', confirmed: false, retryable: true }
```

## Ejecución

```sh
node --test experiments/copilot-eval-001/classifyOperationResult.test.mjs
```

## Resultados reales

- Node: v26.12.1
- Comando: `node --test experiments/copilot-eval-001/classifyOperationResult.test.mjs`
- Pruebas: 24
- Aprobadas: 24
- Fallidas: 0
- Errores: ninguno

## Alcance y limitaciones

El módulo solo clasifica objetos recibidos como argumentos. No realiza red,
temporizadores, disco, SQL, migraciones ni integración con la aplicación real.
Los documentos de coordinación solicitados no están presentes en la rama base
revisada, por lo que no fueron modificados.

## Trazabilidad

- SHA base: `e60582e971f4f8cb56ea56191d33d91824f3fc5e`
- SHA final del cambio implementado: `c76ffc4`
