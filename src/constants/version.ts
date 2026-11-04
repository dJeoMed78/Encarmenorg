// Default for source checkout. scripts/update_version.cjs rewrites this file during build.
// Displaying a timestamp without a Git SHA must never claim a verified deployment.
export const APP_VERSION = 'SIN-COMPILAR';
export const APP_COMMIT_SHA: string | null = null;
export const APP_BUILD_TIMESTAMP = '';
