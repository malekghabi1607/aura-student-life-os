import axios from 'axios';

// Public auth requests intentionally do not inherit a stale session's Bearer token.
export function createAuthAPI(client = axios.create({ baseURL: '/api/auth', timeout: 15000 })) {
  return {
    register: fields => client.post('/register', fields),
    login: fields => client.post('/login', fields),
    resendVerification: email => client.post('/resend-verification', { email }),
    forgotPassword: email => client.post('/forgot-password', { email }),
    resetPassword: fields => client.post('/reset-password', fields),
    me: token => client.get('/me', { headers: { Authorization: `Bearer ${token}` } }),
    logout: token => client.post('/logout', null, { headers: { Authorization: `Bearer ${token}` } }),
  };
}

export const authAPI = createAuthAPI();
