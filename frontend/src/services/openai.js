import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function askAI(messages) {
  const system = `Tu es Aura, un assistant IA intelligent intégré dans l'app Aura Student Life OS.
Tu peux répondre à absolument n'importe quelle question : études, sciences, maths, code, sport, culture, langues, actualités, conseils de vie, recettes, voyages, finances, philosophie, etc.
Tu es bienveillant, précis, et tu adaptes ton style selon la question.
Tu réponds toujours en français sauf si l'utilisateur parle une autre langue.
Ne te limite à aucun domaine — réponds librement à toute question posée.`;

  try {
    const { data } = await api.post('/ai/chat', { messages, system });
    return data.content;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) throw new Error('Session expirée. Reconnectez-vous.');
    if (status === 500) {
      const raw = err.response?.data?.message || '';
      const msg = raw.replace(/^Internal server error:\s*/i, '');
      if (msg.includes('Limite')) throw new Error('⏳ ' + msg);
      throw new Error('⚠️ ' + (msg || 'Erreur serveur. Réessayez.'));
    }
    throw new Error(err.message || 'Erreur inconnue');
  }
}
