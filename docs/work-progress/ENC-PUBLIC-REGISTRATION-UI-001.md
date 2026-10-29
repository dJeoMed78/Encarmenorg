# ENC-PUBLIC-REGISTRATION-UI-001 — Interfaz de Registro Público con Publicación Inmediata

**Rama:** `work/enc-public-registration-ui-001`  
**Base:** `0e2488f5552bf7768a15711316b0de4d71b5d17e`  
**Objetivo:** Implementar exclusivamente la interfaz del registro público para que una empresa se publique inmediatamente después de que MariaDB confirme el guardado, sin requerir aprobación administrativa.

---

## 1. Cambios Implementados

### Interfaz de Registro Público (`src/components/RegisterBusinessView.tsx`)
1. **Publicación Inmediata tras Confirmación MariaDB:**
   - La pantalla de éxito confirma de forma transparente el guardado y publicación en MariaDB: `"Guardado y Publicado en MariaDB"`.
   - Se muestra el ID asignado directamente por MariaDB (`ID #...`) y el estado activo.
   - No existen estados pendientes de moderación ni cuellos de botella de aprobación administrativa.
   - Sin anuncios falsos de éxito: únicamente se declara publicado cuando el backend/MariaDB devuelve `res.success === true` y la empresa confirmada con ID válido.
2. **Campos Independientes de Teléfono y WhatsApp:**
   - Campo 1: **Teléfono Local de Atención** (10 dígitos mexicanos, llamadas directas).
   - Campo 2: **WhatsApp para Pedidos** (10 dígitos mexicanos, mensajería directa para clientes y cotizaciones).
   - WhatsApp nunca se infiere ni se duplica automáticamente del teléfono; ambos canales se gestionan de forma diferenciada.
   - Indicador visual dinámico en tiempo real de validación de 10 dígitos mexicanos (`contactDigits`).
3. **Manejo de Errores Reales y Reintento Idempotente:**
   - Si ocurre un conflicto de duplicado o fallo en la base de datos/red, se despliega el mensaje de error textual devuelto por el servidor.
   - Se incluye un botón de **Reintentar Guardado** que preserva la clave de registro (`registrationRequestId` / UUID v4 de idempotencia) para garantizar reintentos seguros sin crear registros duplicados en caso de confirmaciones demoradas.
4. **Diseño Glassmorphism:**
   - Componentes y tarjetas con `backdrop-filter: blur()`, bordes translúcidos con resalte blanco, sombras suaves y botones de acción rápida con estética carmelita (ámbar/esmeralda).
5. **Integración en `src/App.tsx`:**
   - Al confirmar el guardado en MariaDB, el nuevo negocio se incorpora inmediatamente a la lista global en memoria (`businessesList`), permitiendo al usuario visualizar la tarjeta de confirmación antes de navegar al directorio mediante el botón "Ver en el Directorio".

---

## 2. Pruebas Automatizadas de Interfaz

Se implementó y ejecutó la suite `tests/public-registration-ui.test.mjs` con `tsx/node:test`:
1. `Validación estricta de contactos independientes: Teléfono y WhatsApp` (ok)
2. `RegisterBusinessView: Campos independientes de teléfono y WhatsApp en interfaz` (ok)
3. `RegisterBusinessView: Publicación inmediata confirmada en MariaDB sin aprobación administrativa` (ok)
4. `RegisterBusinessView: Manejo de errores reales y reintento con Idempotency-Key` (ok)
5. `RegisterBusinessView: Exclusión de datos personales del propietario para compatibilidad con Staging` (ok)
6. `App.tsx: Integración de RegisterBusinessView sin navegación prematura` (ok)

Resultado: 6 pruebas ejecutadas, 6 superadas con éxito (0 fallos).
Suite de aislamiento preexistente (`tests/staging-isolation-proof.test.mjs`): 10 pruebas superadas con éxito.
Compilación de la aplicación: verificada con `compile_applet` (éxito total).
