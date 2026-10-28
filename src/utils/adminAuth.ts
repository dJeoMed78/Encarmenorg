export interface AdminAccountInfo {
  username: string;
  role: string;
  avatarColor: string;
  initial: string;
}
export const ADMIN_AUTH_STORAGE_KEY = "admin_authenticated";
export const ADMIN_TOKEN_STORAGE_KEY = "encarmen_admin_session_token";
export const ADMIN_USER_STORAGE_KEY = "admin_authenticated_user";
export const ADMIN_EXPIRES_STORAGE_KEY = "admin_auth_expires_at";
export const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;
/** Compatibility exports only; client password verification is permanently removed. */
export const ADMIN_SALT = "";
export const DEFAULT_ADMIN_ACCOUNTS: AdminAccountInfo[] = [];
export const FALLBACK_ADMIN_HASHES: Readonly<Record<string, string>> =
  Object.freeze({});
export async function hashPassword(_plain: string): Promise<string> {
  return "";
}
let verified: {
  user: AdminAccountInfo;
  expiresAt: number;
  checkedAt: number;
  token: string;
  permissions: string[];
} | null = null;
let epoch = 0;
const emit = () => {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("admin-auth-changed"));
};
function token() {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}
export function clearAdminAuth() {
  epoch++;
  const had = Boolean(verified || token());
  verified = null;
  if (typeof window === "undefined") return;
  for (const storageName of ["localStorage", "sessionStorage"] as const)
    try {
      const storage=window[storageName];
      for (const key of [
        ADMIN_AUTH_STORAGE_KEY,
        ADMIN_TOKEN_STORAGE_KEY,
        ADMIN_USER_STORAGE_KEY,
        ADMIN_EXPIRES_STORAGE_KEY,
      ])
        storage.removeItem(key);
    } catch {}
  if (had) emit();
}
export function isSessionAdminAuthenticated() {
  return Boolean(
    verified &&
    verified.expiresAt > Date.now() &&
    Date.now() - verified.checkedAt < 30000 &&
    verified.token === token(),
  );
}
export function getLoggedInAdminName() {
  return isSessionAdminAuthenticated()
    ? verified!.user.username
    : "Administrador";
}
/** Legacy callers cannot mint a session. Only a server-verified session is recognized. */
export function saveAdminAuth(_username = "Administrador") {
  if (isSessionAdminAuthenticated()) emit();
}
export function getAdminSessionTimeRemaining() {
  const ms = isSessionAdminAuthenticated()
    ? Math.max(0, verified!.expiresAt - Date.now())
    : 0;
  return {
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
  };
}
async function request(
  url: string,
  options: RequestInit,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 10000);
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok || data?.success !== true)
      throw new Error(
        response.status === 401
          ? "Usuario o contraseña incorrectos."
          : response.status === 503
            ? "Acceso administrativo no disponible; requiere configuración segura."
            : "El servidor no confirmó la operación.",
      );
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export async function verifyAdminSession(
  signal?: AbortSignal,
): Promise<boolean> {
  const ticket = epoch,
    t = token();
  if (!/^[0-9a-f]{64}$/.test(t)) {
    clearAdminAuth();
    return false;
  }
  try {
    const data = await request(
      "/api/admin/session",
      { headers: { "X-Encarmen-Admin-Token": t } },
      signal,
    );
    if (
      ticket !== epoch ||
      signal?.aborted ||
      !data.user ||
      typeof data.user.username !== "string" ||
      typeof data.user.role !== "string" ||
      !Number.isFinite(data.expiresAt) ||
      data.expiresAt <= Date.now() ||
      !Array.isArray(data.permissions) ||
      (!data.permissions.includes("admin:manage")&&!data.permissions.includes("business:manage")) ||
      data.permissions.some((p: unknown) => typeof p !== "string")
    )
      throw new Error();
    verified = {
      token: t,
      user: {
        username: data.user.username,
        role: data.user.role,
        initial: data.user.username.slice(0, 1),
        avatarColor: "from-sky-500 to-indigo-600",
      },
      expiresAt: data.expiresAt,
      checkedAt: Date.now(),
      permissions: data.permissions,
    };
    emit();
    return true;
  } catch {
    if (ticket === epoch) clearAdminAuth();
    return false;
  }
}
export async function loginAdminUser(
  username: string,
  passwordInput: string,
  signal?: AbortSignal,
): Promise<{ success: boolean; user?: AdminAccountInfo; error?: string }> {
  clearAdminAuth();
  const ticket = epoch;
  try {
    const data = await request(
      "/api/admin/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: passwordInput }),
      },
      signal,
    );
    if (
      ticket !== epoch ||
      signal?.aborted ||
      typeof data.token !== "string" ||
      !/^[0-9a-f]{64}$/.test(data.token)
    )
      throw new Error("El servidor no confirmó una sesión válida.");
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
    if (!(await verifyAdminSession(signal)))
      throw new Error("No se pudo verificar la sesión con el servidor.");
    return { success: true, user: verified!.user };
  } catch (error) {
    if (ticket === epoch) clearAdminAuth();
    return {
      success: false,
      error: signal?.aborted
        ? "Inicio de sesión cancelado."
        : error instanceof Error
          ? error.message
          : "No se pudo autenticar con el servidor.",
    };
  }
}
export async function fetchAdminAccounts(): Promise<AdminAccountInfo[]> {
  if (!(await verifyAdminSession())) return [];
  try {
    const data = await request("/api/admin/accounts", {
      headers: { "X-Encarmen-Admin-Token": token() },
    });
    return Array.isArray(data.accounts)
      ? data.accounts
          .filter(
            (a: any) =>
              typeof a?.username === "string" && typeof a?.role === "string",
          )
          .map((a: any) => ({
            username: a.username,
            role: a.role,
            avatarColor: "from-sky-500 to-indigo-600",
            initial: a.username.slice(0, 1),
          }))
      : [];
  } catch {
    return [];
  }
}
export async function changeAdminPassword(
  _targetUsername: string,
  _newPassword: string,
): Promise<{ success: boolean; message?: string; error?: string }> {
  return {
    success: false,
    error:
      "Cambio de credenciales bloqueado hasta disponer de un procedimiento seguro autorizado.",
  };
}
