export const DELIVERY_OPTIONS = [
  'Atención en el Local de la empresa',
  'Servicio a domicilio con costo',
  'Servicio a domicilio gratis',
  'Atención en el lugar del cliente',
  'Envíos locales / Paquetería',
  'No Aplica'
] as const;

export type DeliveryOption = typeof DELIVERY_OPTIONS[number];

function normalizeSingleDeliveryOption(raw?: string | null): string {
  if (!raw) return 'No Aplica';
  const val = raw.trim().replace(/\.$/, '');
  if ((DELIVERY_OPTIONS as readonly string[]).includes(val)) return val;
  const n = val.toLowerCase();
  if (n.includes('no aplica') || n.includes('no tiene') || n.includes('no cuenta') || n === 'no' || n === 'ninguno' || n === 'n/a') {
    return 'No Aplica';
  }
  if (n.includes('local') || n.includes('mostrador') || n.includes('sucursal')) {
    return 'Atención en el Local de la empresa';
  }
  if (n.includes('gratis') || n.includes('sin costo')) {
    return 'Servicio a domicilio gratis';
  }
  if (n.includes('costo') || n.includes('mandadito') || n.includes('reparto') || (n.includes('domicilio') && !n.includes('gratis'))) {
    return 'Servicio a domicilio con costo';
  }
  if (n.includes('cliente') || n.includes('instalacion') || n.includes('taller')) {
    return 'Atención en el lugar del cliente';
  }
  if (n.includes('envio') || n.includes('envío') || n.includes('paqueteria') || n.includes('paquetería')) {
    return 'Envíos locales / Paquetería';
  }
  return val;
}

export function normalizeDeliveryOption(raw?: string | null): string {
  if (!raw) return 'No Aplica';
  const val = raw.trim();
  if (val.includes(',')) {
    const parts = val.split(',').map(p => p.trim()).filter(Boolean);
    const normalizedParts = Array.from(new Set(parts.map(p => normalizeSingleDeliveryOption(p)).filter(p => p !== 'No Aplica')));
    return normalizedParts.length > 0 ? normalizedParts.join(', ') : 'No Aplica';
  }
  return normalizeSingleDeliveryOption(val);
}
