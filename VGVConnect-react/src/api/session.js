export const TOKEN_KEY = "vgv-token";
export const USER_KEY = "vgv-user";

const expiredListeners = new Set();
const passwordChangeListeners = new Set();

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);

export const storeToken = (token) => localStorage.setItem(TOKEN_KEY, token);

export const clearStoredSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const onSessionExpired = (listener) => {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
};

// Solo se cierra la sesión si el 401 corresponde al token vigente: así varias respuestas
// simultáneas generan un único cierre y un 401 tardío de una sesión anterior no expulsa a la nueva.
export const handleUnauthorized = (sentToken) => {
  const currentToken = getStoredToken();
  if ((sentToken || null) !== currentToken) return;
  if (!currentToken && !localStorage.getItem(USER_KEY)) return;
  clearStoredSession();
  expiredListeners.forEach((listener) => listener());
};

export const onPasswordChangeRequired = (listener) => {
  passwordChangeListeners.add(listener);
  return () => passwordChangeListeners.delete(listener);
};

// Un 403 PASSWORD_CHANGE_REQUIRED no cierra la sesión: marca al usuario para llevarlo a cambiar la contraseña.
export const handlePasswordChangeRequired = (sentToken) => {
  if ((sentToken || null) !== getStoredToken()) return;
  let user;
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return;
  }
  if (!user || user.mustChangePassword) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, mustChangePassword: true }));
  passwordChangeListeners.forEach((listener) => listener());
};
