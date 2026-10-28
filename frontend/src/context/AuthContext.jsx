import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/auth';
import { clearSession, readSession, saveSession } from '../utils/authSession';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return readSession(localStorage)?.user || null;
  });

  useEffect(() => {
    let active = true;
    const session = readSession(localStorage);
    if (session) authAPI.me(session.token).then(({ data }) => {
      if (active && localStorage.getItem('auth_token') === session.token) {
        const current = { email: data.email, name: data.name };
        saveSession(localStorage, session.token, current);
        setUser(current);
      }
    }).catch(error => {
      if (active && [401, 403].includes(error.response?.status)
          && localStorage.getItem('auth_token') === session.token) {
        clearSession(localStorage); setUser(null);
      }
    });
    const synchronize = () => setUser(readSession(localStorage)?.user || null);
    window.addEventListener('storage', synchronize);
    return () => { active = false; window.removeEventListener('storage', synchronize); };
  }, []);

  function login(token, userData) {
    saveSession(localStorage, token, userData);
    setUser(userData);
  }

  function clearAuthentication() {
    clearSession(localStorage);
    setUser(null);
  }

  async function logout() {
    const token = localStorage.getItem('auth_token');
    try {
      if (token) await authAPI.logout(token);
    } catch (error) {
      if (![401, 403].includes(error.response?.status)) {
        toast.error('Déconnexion locale effectuée. Le serveur est inaccessible : la révocation distante reste à confirmer.');
      }
    } finally { clearAuthentication(); }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, clearAuthentication, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext) ?? { user: null, login: () => {}, logout: () => {}, clearAuthentication: () => {}, isAuthenticated: false };
}
