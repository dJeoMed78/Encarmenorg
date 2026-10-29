export type ContactField = 'phone' | 'whatsapp';
// Mexican business contacts only. Never infer WhatsApp from the voice number.
export function contactDigits(value: unknown): string {
  if (typeof value !== 'string' && (typeof value !== 'number' || !Number.isSafeInteger(value))) return '';
  const text = String(value).trim();
  if (!/^[+\d\s().-]+$/.test(text)) return '';
  const digits = text.replace(/\D/g, '');
  if (/^521\d{10}$/.test(digits)) return digits.slice(3);
  if (/^52\d{10}$/.test(digits)) return digits.slice(2);
  return /^\d{10}$/.test(digits) ? digits : '';
}

// Empty legacy fields preserve SQL contacts. Replacements require compare-and-set.
export function prepareContactUpdate(body: Record<string, any>, current: Record<string, any>) {
  if (body.clearContacts !== undefined) throw new Error('CONTACT_DELETE_NOT_SUPPORTED');
  const patch: Partial<Record<ContactField, string>> = {};
  const expected: Partial<Record<ContactField, string>> = {};
  for (const field of ['phone', 'whatsapp'] as const) {
    const value = body[field];
    if (value == null || (typeof value === 'string' && !value.trim())) continue;
    const digits = contactDigits(value);
    if (!digits) throw new Error('INVALID_CONTACT');
    // Sending the unchanged contact in an old full-object client is harmless.
    if (digits === contactDigits(current[field])) continue;
    const supplied = body.expectedContacts;
    if (!supplied || typeof supplied[field] !== 'string' || supplied[field] !== String(current[field] ?? '')) {
      throw new Error('CONTACT_CONFLICT');
    }
    patch[field] = digits;
    expected[field] = supplied[field];
  }
  return { patch, expected };
}

export function contactsMatchReadback(patch: Partial<Record<ContactField, string>>, record: Record<string, any>) {
  return (Object.keys(patch) as ContactField[]).every(field => contactDigits(record[field]) === patch[field]);
}
