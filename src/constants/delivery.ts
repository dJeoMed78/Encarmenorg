export const DELIVERY_OPTIONS = [
  'Servicio a domicilio con costo',
  'Servicio a domicilio gratis',
  'Atención en el Local de la empresa',
  'Atención en el lugar del cliente.',
  'No Aplica'
] as const;

export type DeliveryOption = typeof DELIVERY_OPTIONS[number];

export function normalizeDeliveryOption(raw?: string | null): string {
  if (!raw) return 'No Aplica';
  const val = raw.trim();
  if ((DELIVERY_OPTIONS as readonly string[]).includes(val)) return val;
  const n = val.toLowerCase();
  if (n.includes('no aplica') || n.includes('no tiene') || n.includes('no cuenta') || n === 'no' || n === 'ninguno' || n === 'n/a') {
    return 'No Aplica';
  }
  if (n.includes('gratis') || n.includes('sin costo')) {
    return 'Servicio a domicilio gratis';
  }
  if (n.includes('costo') || n.includes('mandadito') || n.includes('domicilio') || n.includes('envio') || n.includes('envío') || n.includes('reparto')) {
    return 'Servicio a domicilio con costo';
  }
  if (n.includes('local') || n.includes('mostrador') || n.includes('sucursal')) {
    return 'Atención en el Local de la empresa';
  }
  if (n.includes('cliente') || n.includes('instalacion') || n.includes('taller')) {
    return 'Atención en el lugar del cliente.';
  }
  return val;
}
