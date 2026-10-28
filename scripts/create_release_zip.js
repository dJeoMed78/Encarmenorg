// ENC-BACKUP-SECURITY-002: public release ZIP generation is disabled.
// Do not read, create, copy, move, truncate or delete any existing backup.
// A private recovery mechanism requires a separately approved implementation.
console.error('Generación de paquetes públicos deshabilitada por seguridad. No se modificaron archivos.');
process.exitCode = 1;

