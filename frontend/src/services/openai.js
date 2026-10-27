import axios from 'axios';
import { prepareAIMessages } from '../utils/aiMessages';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function askAI(messages) {
  try {
    const { data } = await api.post('/ai/chat', { messages: prepareAIMessages(messages) });
    return data.content;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) throw new Error('Session expirée. Reconnectez-vous.');
    if ([400, 413, 429, 502].includes(status)) throw new Error(err.response?.data?.message || 'Requête IA refusée. Vérifiez la taille des messages ou réessayez plus tard.');
    if (status === 500) {
      const raw = err.response?.data?.message || '';
      const msg = raw.replace(/^Internal server error:\s*/i, '');
      if (msg.includes('Limite')) throw new Error('⏳ ' + msg);
      throw new Error('⚠️ ' + (msg || 'Erreur serveur. Réessayez.'));
    }
    throw new Error(err.message || 'Erreur inconnue');
  }
}
