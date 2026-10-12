import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import {
  AdminAccountInfo,
  DEFAULT_ADMIN_ACCOUNTS,
  fetchAdminAccounts,
  changeAdminPassword,
  getLoggedInAdminName
} from '../utils/adminAuth';

export const AdminAccountsManagerTab: React.FC = () => {
  const [accounts, setAccounts] = useState<AdminAccountInfo[]>(DEFAULT_ADMIN_ACCOUNTS);
  const [selectedUser, setSelectedUser] = useState<string>('Yuss');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentAdmin = getLoggedInAdminName();

  useEffect(() => {
    fetchAdminAccounts().then(accs => {
      if (accs && accs.length > 0) setAccounts(accs);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const pass = newPassword.trim();
    if (pass.length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres.');
      return;
    }
    if (pass !== confirmPassword.trim()) {
      setErrorMessage('Las contraseñas no coinciden. Verifícalas cuidadosamente.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await changeAdminPassword(selectedUser, pass);
      if (res.success) {
        setSuccessMessage(`¡Contraseña de ${selectedUser} actualizada y cifrada con éxito!`);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMessage(res.error || 'No se pudo actualizar la contraseña.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-purple-950/80 via-stone-900 to-stone-900 p-6 sm:p-8 rounded-2xl border border-purple-500/30 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
          <KeyRound className="w-3.5 h-3.5" />
          <span>Seguridad de Acceso · SHA-256 Hashing</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
          Administradores y Cuentas de Acceso
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 font-light leading-relaxed">
          Gestión de los dos administradores oficiales de{' '}
          <span className="text-purple-300 font-medium">Empresas en Carmen</span>. Todas las
          contraseñas se almacenan mediante{' '}
          <strong className="text-white">cifrado irreversible SHA-256 con salt</strong>,
          garantizando que nadie pueda averiguar las claves en texto plano.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map(acc => {
          const isCurrent = acc.username.toLowerCase() === currentAdmin.toLowerCase();
          const isSelected = selectedUser === acc.username;

          return (
            <div
              key={acc.username}
              className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-purple-950/30 border-purple-400/60 shadow-lg shadow-purple-900/20 ring-1 ring-purple-400/40'
                  : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${acc.avatarColor} text-white flex items-center justify-center text-2xl font-light shadow-md`}
                  >
                    {acc.initial}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-medium text-white tracking-tight">{acc.username}</h3>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          Tu sesión activa
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 font-light">{acc.role} Principal</p>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-stone-400">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cifrado SHA-256 Activo</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(acc.username);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                  }`}
                >
                  {isSelected ? 'Seleccionado para editar' : 'Cambiar clave'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-stone-900 border border-stone-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-purple-400" />
              <span>Modificar Contraseña de Administrador</span>
            </h3>
            <p className="text-xs text-stone-400 font-light mt-0.5">
              Selecciona el administrador al que deseas cambiarle la clave y escribe la nueva.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Usuario seleccionado:</span>
            <div className="px-3 py-1 rounded-xl bg-purple-900/40 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>{selectedUser}</span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-medium flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-stone-300">Selecciona al Administrador</label>
              <div className="grid grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setSelectedUser(acc.username);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    className={`py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      selectedUser === acc.username
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
                    }`}
                  >
                    <span>{acc.username}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-300">
                Nueva Contraseña para {selectedUser}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Escribe la nueva contraseña..."
                  required
                  className="w-full py-2.5 px-3.5 pr-10 rounded-xl bg-stone-800 border border-stone-700 text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder:text-stone-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-300">Confirmar Nueva Contraseña</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña..."
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-stone-800 border border-stone-700 text-white text-sm outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all placeholder:text-stone-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-start gap-2.5 text-xs text-purple-200">
            <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Codificación de Seguridad:</strong> La contraseña nunca se envía ni guarda en
              texto legible. Se calcula su huella criptográfica SHA-256 única y se almacena protegida en el
              servidor y en la base de datos MariaDB.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !newPassword}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cifrando y Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Clave de {selectedUser}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
