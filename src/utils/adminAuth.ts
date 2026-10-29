export interface AdminAccountInfo {
  username: string;
  role: string;
  avatarColor: string;
  initial: string;
}

export const ADMIN_AUTH_STORAGE_KEY = 'admin_authenticated';
export const ADMIN_TOKEN_STORAGE_KEY = 'encarmen_admin_session_token';
export const ADMIN_USER_STORAGE_KEY = 'admin_authenticated_user';
export const ADMIN_EXPIRES_STORAGE_KEY = 'admin_auth_expires_at';
export const SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
export const ADMIN_SALT = 'carmen_admin_secure_salt_2026_';

export const DEFAULT_ADMIN_ACCOUNTS: AdminAccountInfo[] = [
  {
    username: 'Y',
    role: 'Administrador',
    avatarColor: 'from-sky-500 to-indigo-600',
    initial: 'Y'
  },
  {
    username: 'J',
    role: 'Administrador',
    avatarColor: 'from-amber-500 to-rose-600',
    initial: 'J'
  }
];

// Fallback password hashes (SHA-256 with ADMIN_SALT)
export const FALLBACK_ADMIN_HASHES: Record<string, string> = {
  Y: 'b69ffa80dbc7db6ceabd2cc84876c3e029f1d5fde303764fb71748c3725fc459',
  J: '4aeec421356673b4cb9f15faf8bfe7ea9ad23b373c9ac69363321e8265ecf9ae',
  Yuss: 'b69ffa80dbc7db6ceabd2cc84876c3e029f1d5fde303764fb71748c3725fc459',
  Jeo: '4aeec421356673b4cb9f15faf8bfe7ea9ad23b373c9ac69363321e8265ecf9ae'
};

export async function hashPassword(plain: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ADMIN_SALT + plain.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return plain.trim();
  }
}

export function isSessionAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isAuth =
      localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true' ||
      sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true';
    const expiresAt = Number(localStorage.getItem(ADMIN_EXPIRES_STORAGE_KEY) || 0);

    const token = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
    if (isAuth && /^[a-f0-9]{64}$/i.test(token) && expiresAt > Date.now()) {
      return true;
    }
    if (isAuth && expiresAt > 0 && expiresAt <= Date.now()) {
      clearAdminAuth();
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

export function getLoggedInAdminName(): string {
  if (typeof window === 'undefined') return 'Administrador';
  try {
    return (
      localStorage.getItem(ADMIN_USER_STORAGE_KEY) ||
      sessionStorage.getItem(ADMIN_USER_STORAGE_KEY) ||
      'Administrador'
    );
  } catch {
    return 'Administrador';
  }
}

export function saveAdminAuth(username: string = 'Administrador'): void {
  if (typeof window === 'undefined') return;
  try {
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    localStorage.setItem(ADMIN_USER_STORAGE_KEY, username);
    localStorage.setItem(ADMIN_EXPIRES_STORAGE_KEY, String(expiresAt));

    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    sessionStorage.setItem(ADMIN_USER_STORAGE_KEY, username);

    window.dispatchEvent(new Event('admin-auth-changed'));
  } catch {}
}

export function clearAdminAuth(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    localStorage.removeItem(ADMIN_USER_STORAGE_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_STORAGE_KEY);

    sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_USER_STORAGE_KEY);

    window.dispatchEvent(new Event('admin-auth-changed'));
  } catch {}
}

export function getAdminSessionTimeRemaining(): { hours: number; minutes: number } {
  if (typeof window === 'undefined') return { hours: 0, minutes: 0 };
  try {
    const expiresAt = Number(localStorage.getItem(ADMIN_EXPIRES_STORAGE_KEY) || 0);
    const diff = Math.max(0, expiresAt - Date.now());
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  } catch {
    return { hours: 0, minutes: 0 };
  }
}

export async function fetchAdminAccounts(): Promise<AdminAccountInfo[]> {
  try {
    const res = await fetch('/api/admin/accounts');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        return data.accounts;
      }
    }
  } catch (e) {
    console.warn('Could not fetch admin accounts from API, using defaults:', e);
  }
  return DEFAULT_ADMIN_ACCOUNTS;
}

export async function loginAdminUser(
  username: string,
  passwordInput: string
): Promise<{ success: boolean; user?: AdminAccountInfo; error?: string }> {
  clearAdminAuth();
  try {
    const res=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:passwordInput})});
    const data=await res.json();
    if(!res.ok || data.success!==true || typeof data.token!=='string' || !/^[a-f0-9]{64}$/i.test(data.token)) return {success:false,error:data.error || 'El servidor no confirmó una sesión válida.'};
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY,data.token);
    saveAdminAuth(data.user?.username || data.username || username);
    return {success:true,user:data.user || DEFAULT_ADMIN_ACCOUNTS.find(a=>a.username===(data.username||username))};
  } catch {return {success:false,error:'No se pudo autenticar con el servidor. No se habilitó acceso local.'};}
}

export async function changeAdminPassword(
  targetUsername: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUsername, newPassword })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      FALLBACK_ADMIN_HASHES[targetUsername] = await hashPassword(newPassword);
      return { success: true, message: data.message };
    }
    return { success: false, error: data.message || 'Error al actualizar contraseña' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con el servidor' };
  }
}

