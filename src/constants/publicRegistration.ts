// Contrato público cerrado; campos derivados y privilegios nunca se aceptan del visitante.
// ENC-STAGING-PUBLIC-MEDIA-001: logo_url, image y gallery solo admiten rutas /uploads/ emitidas por el servidor para el intento (mediaAttempt).
export const PUBLIC_REGISTRATION_FIELDS = ['name', 'category', 'subcategory', 'description', 'address', 'colonia', 'postalCode', 'phone', 'whatsapp', 'schedule', 'payment', 'delivery', 'facebook', 'instagram', 'website', 'hp', 'logo_url', 'image', 'gallery', 'mediaAttempt'] as const;
