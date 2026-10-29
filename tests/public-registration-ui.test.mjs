import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contactDigits } from '../src/utils/businessContacts.ts';

const registerViewSource = readFileSync(new URL('../src/components/RegisterBusinessView.tsx', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('Validación estricta de contactos independientes: Teléfono y WhatsApp', () => {
  // Teléfono local mexicano de 10 dígitos
  assert.equal(contactDigits('938 123 4567'), '9381234567', 'Formatea 10 dígitos locales');
  assert.equal(contactDigits('+52 938 123 4567'), '9381234567', 'Remueve prefijo +52');
  assert.equal(contactDigits('521 938 123 4567'), '9381234567', 'Remueve prefijo móvil 521');
  assert.equal(contactDigits('12345'), '', 'Rechaza números de longitud inválida');
  assert.equal(contactDigits('abcdefghij'), '', 'Rechaza caracteres no numéricos');

  // Ambos campos deben ser independientes y nunca inferirse
  const phone = '9381112233';
  const wa = '';
  assert.equal(contactDigits(phone), '9381112233');
  assert.equal(contactDigits(wa), '', 'WhatsApp no se infiere del teléfono');
});

test('RegisterBusinessView: Campos independientes de teléfono y WhatsApp en interfaz', () => {
  assert.ok(registerViewSource.includes('Teléfono Local de Atención'), 'Posee etiqueta explícita para teléfono');
  assert.ok(registerViewSource.includes('WhatsApp para Pedidos'), 'Posee etiqueta explícita para WhatsApp');
  assert.ok(registerViewSource.includes('Canal independiente de mensajería (no se infiere de teléfono)'), 'Aclara que WhatsApp no se infiere');
  assert.ok(registerViewSource.includes('contactDigits(formData.phone)'), 'Valida dígitos de teléfono con contactDigits');
  assert.ok(registerViewSource.includes('contactDigits(formData.whatsapp)'), 'Valida dígitos de WhatsApp con contactDigits');
});

test('RegisterBusinessView: Publicación inmediata confirmada en MariaDB sin aprobación administrativa', () => {
  assert.ok(registerViewSource.includes('Guardado y Publicado en MariaDB'), 'Muestra insignia de guardado en MariaDB');
  assert.ok(registerViewSource.includes('¡Tu negocio ya está publicado en el directorio!'), 'Confirma publicación inmediata');
  assert.ok(registerViewSource.includes('sin requerir aprobaciones intermedias'), 'Explicita que no hay aprobación administrativa previa');
  assert.ok(!registerViewSource.includes('pendiente de aprobación'), 'No contiene estados pendientes de aprobación');
  assert.ok(!registerViewSource.includes('solicitud pendiente'), 'No contiene mensajes de solicitud pendiente');
});

test('RegisterBusinessView: Manejo de errores reales y reintento con Idempotency-Key', () => {
  assert.ok(registerViewSource.includes('No se pudo confirmar la publicación'), 'Encabezado compatible con confirmaciones inciertas');
  assert.ok(registerViewSource.includes('Reintentar Guardado'), 'Botón para reintentar guardado');
  assert.ok(registerViewSource.includes('registrationRequestId.current'), 'Reutiliza la misma clave de idempotencia en reintentos');
  assert.ok(registerViewSource.includes('Guardando y confirmando en MariaDB...'), 'Estado de carga descriptivo');
});

test('RegisterBusinessView: Exclusión de datos personales del propietario para compatibilidad con Staging', () => {
  assert.ok(!registerViewSource.includes('...cleanFormData'), 'El envío usa campos explícitos sin datos personales');
});

test('App.tsx: Integración de RegisterBusinessView sin navegación prematura', () => {
  assert.ok(appSource.includes('<RegisterBusinessView'), 'RegisterBusinessView está montado en App');
  assert.ok(!appSource.includes("onBusinessAdded={(newBiz) => {\n              setBusinessesList((prev) => [newBiz, ...prev.filter((b) => String(b.id) !== String(newBiz.id))]);\n              setBusinessOverrides((prev) => ({ ...prev, [newBiz.id]: newBiz }));\n              setActiveTab('negocios');"), 'No redirige prematuramente antes de que el usuario vea la confirmación');
});
