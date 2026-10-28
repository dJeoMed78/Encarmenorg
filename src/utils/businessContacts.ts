export type ContactField = 'phone' | 'whatsapp';
export type ContactFilter = 'all' | 'phone' | 'no-phone' | 'whatsapp' | 'no-whatsapp' | 'none';
export const CONTACT_FILTERS: ContactFilter[] = ['all', 'phone', 'no-phone', 'whatsapp', 'no-whatsapp', 'none'];

// Mexican business contacts only. Never infer WhatsApp from the voice number.
export function contactDigits(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!/^[+\d\s().-]+$/.test(text)) return '';
  const digits = text.replace(/\D/g, '');
  if (/^521\d{10}$/.test(digits)) return digits.slice(3);
  if (/^52\d{10}$/.test(digits)) return digits.slice(2);
  return /^\d{10}$/.test(digits) ? digits : '';
}

export function matchesContactFilter(business: {phone?: unknown; whatsapp?: unknown}, filter: ContactFilter): boolean {
  const phone = Boolean(contactDigits(business.phone));
  const whatsapp = Boolean(contactDigits(business.whatsapp));
  return filter === 'phone' ? phone : filter === 'no-phone' ? !phone : filter === 'whatsapp' ? whatsapp : filter === 'no-whatsapp' ? !whatsapp : filter === 'none' ? !phone && !whatsapp : true;
}

export function contactCounts(list: Array<{phone?: unknown; whatsapp?: unknown}>) {
  return Object.fromEntries(CONTACT_FILTERS.map(filter => [filter, list.filter(b => matchesContactFilter(b, filter)).length])) as Record<ContactFilter, number>;
}

export class ContactPatchError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Empty/null is a non-destructive legacy update. Deletion is a separate server-authorized intent.
export function prepareContactPatch(body: Record<string, unknown>, isAdmin: boolean) {
  const requested = body.clearContacts;
  if (requested !== undefined && (!Array.isArray(requested) || requested.some(key => key !== 'phone' && key !== 'whatsapp'))) {
    throw new ContactPatchError(400, 'clearContacts debe contener únicamente phone o whatsapp.');
  }
  const clear = [...new Set((requested || []) as ContactField[])];
  if (clear.length && !isAdmin) throw new ContactPatchError(403, 'La eliminación de contactos requiere una sesión administrativa vigente.');
  const patch: Partial<Record<ContactField, string>> = {};
  for (const key of ['phone', 'whatsapp'] as const) {
    const value = body[key];
    if (clear.includes(key)) {
      if (value != null && String(value).trim() !== '') throw new ContactPatchError(400, 'No se puede eliminar y sustituir el mismo contacto.');
      patch[key] = '';
    } else if (value != null && String(value).trim() !== '') {
      const digits = contactDigits(value);
      if (!digits) throw new ContactPatchError(400, 'El contacto debe ser un número mexicano válido de diez dígitos.');
      patch[key] = digits;
    }
  }
  return {patch, clear};
}
