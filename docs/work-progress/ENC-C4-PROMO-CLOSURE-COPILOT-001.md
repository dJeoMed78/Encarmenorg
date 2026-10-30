# ENC-C4-PROMO-CLOSURE-COPILOT-001

## Identificación

- Base obligatoria: `c79992a385213b437541cb92954c76a99c2485b1`
- Rama de trabajo: `work/enc-c4-promo-closure-copilot-001`
- Alcance: `src/components/AdminPromotionsTab.tsx` y pruebas específicas
- Commit funcional: `3d43982ed348b9a08ca21e427621413a3eb256fa`
- SHA final publicado: `e44ffcc8bc4c47bd35b7c79ef890c009450e907e`

## Cambios realizados

Se añadió una generación con `useRef` para invalidar subidas anteriores al
iniciar otra subida, editar una promoción, restablecer el formulario o quitar
el cartel. Cada continuación posterior a compresión y carga vuelve a comprobar
la generación; las respuestas tardías no modifican imagen, preview, errores ni
estado de carga de otra operación.

Se separó la preview local (`promoImagePreview`) del dato histórico
`promoImageData`. Una imagen base64 recibida históricamente queda confirmada y
se conserva al editar campos no relacionados. Una nueva URL remota confirmada
reemplaza el histórico; una falla conserva el cartel anterior y muestra el
error. Las URLs `data:` no se aceptan como confirmación remota y no se envían
como `promoImage`.

El guardado queda bloqueado mientras hay una carga pendiente o una preview no
confirmada, y se evita el doble guardado mientras existe un guardado activo.

## Pruebas ejecutadas

### Pruebas específicas

```text
node --test tests/enc-c4-promo-copilot-001.test.mjs
24 pruebas, 24 aprobadas, 0 fallidas.
```

La suite ejercita handlers reales extraídos del componente y cubre éxito,
HTTP 500/503, red, `success:false`, URL ausente, URL `data:`, carreras A/B,
cambio de promoción, reset, histórico base64, sustitución, conservación de
campos, bloqueo de guardado, doble guardado y mensajes de error.

### Regresión C4 existente

```text
node --import tsx --test tests/staging-candidate-closure-004.test.mjs
5 pruebas, 5 aprobadas, 0 fallidas.
```

### Validación estática y compilación

```text
npm run lint
PASS (tsc --noEmit)

node_modules/.bin/vite build --outDir /tmp/enc-c4-promo-closure-copilot-dist-2
PASS
```

El build solo escribió en `/tmp`; no se inició servidor ni se usaron bases de
datos. El build emitió únicamente el aviso existente de chunk grande.

Una ejecución directa de la regresión sin `--import tsx` falló porque Node no
puede cargar `src/services/api.ts` con sintaxis TypeScript avanzada en modo
strip-only. Se repitió con el loader del proyecto y pasó.

## Limitaciones y riesgos

- No se ejecutó MariaDB, SQL real, servidor completo, Staging ni despliegue.
- No se modificaron `package.json`, `package-lock.json`, backend, servicios ni
  archivos fuera del alcance autorizado.
- La prueba de componente usa evaluación controlada de los handlers reales,
  porque el repositorio no incluye una infraestructura de montaje React/DOM
  para esta suite específica.
- La rama publicada contiene ambos commits y no está integrada ni desplegada.
