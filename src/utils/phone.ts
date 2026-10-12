export function cleanPhoneNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('521')) return digits.substring(3);
  if (digits.length === 12 && digits.startsWith('52')) return digits.substring(2);
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function formatPhoneNumber(raw: string | undefined | null): string {
  const clean = cleanPhoneNumber(raw);
  if (clean.length === 10) {
    return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }
  return clean || String(raw || '');
}

export const formatMexicanPhone = formatPhoneNumber;

export function getWhatsAppUrl(
  phone: string | undefined | null,
  message: string = 'Hola, encontré su información en el directorio Empresas en Carmen y deseo solicitar informes.'
): string {
  if (!phone) return '';
  const clean = cleanPhoneNumber(phone);
  if (clean) {
    const fullNumber = clean.length === 10 ? `52${clean}` : clean;
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  }
  if (phone.startsWith('http://') || phone.startsWith('https://')) return phone;
  return '';
}
