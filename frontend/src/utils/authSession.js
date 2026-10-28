export function clearSession(storage) {
  storage.removeItem('auth_token');
  storage.removeItem('auth_user');
}

export function readSession(storage) {
  try {
    const token = storage.getItem('auth_token');
    const user = JSON.parse(storage.getItem('auth_user') || 'null');
    if (token && user && typeof user.email === 'string') return { token, user };
  } catch { /* Invalid local storage must never prevent reaching the login page. */ }
  clearSession(storage);
  return null;
}

export function saveSession(storage, token, user) {
  if (!token || typeof user?.email !== 'string') throw new Error('Invalid authentication response');
  storage.setItem('auth_token', token);
  storage.setItem('auth_user', JSON.stringify(user));
}

export function authError(error, fallback = 'La demande a échoué. Réessayez.') {
  const status = error.response?.status;
  if (!status) return 'Serveur inaccessible. Vérifiez votre connexion et réessayez.';
  const data = error.response?.data;
  // Fixed server text (no provider detail): e-mail delivery is not configured on the server.
  if (data?.code === 'EMAIL_SERVICE_UNAVAILABLE' && typeof data.message === 'string') return data.message;
  if (status >= 500) return 'Le service est temporairement indisponible. Réessayez dans quelques instants.';
  if (status === 429) return 'Trop de demandes. Patientez avant de réessayer.';
  if (status === 401) return 'Email ou mot de passe incorrect.';
  if (data?.code === 'EMAIL_NOT_VERIFIED') return 'Validez votre adresse e-mail avant de vous connecter. Vous pouvez renvoyer un lien ci-dessous.';
  const validation = Object.values(data?.errors || {}).find(value => typeof value === 'string');
  return validation || data?.message || fallback;
}
