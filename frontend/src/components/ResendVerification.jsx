import { useState } from 'react';
import { authAPI } from '../services/auth';
import { authError } from '../utils/authSession';

export default function ResendVerification({ initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function resend(event) {
    event.preventDefault();
    setLoading(true); setError(''); setMessage('');
    try {
      const { data } = await authAPI.resendVerification(email.trim());
      setMessage(data.message);
    } catch (failure) { setError(authError(failure)); }
    finally { setLoading(false); }
  }

  return <form onSubmit={resend} style={{ margin: '20px 0', color: '#94a3b8' }}>
    <label htmlFor="resend-email">Renvoyer le lien de confirmation</label>
    <input id="resend-email" type="email" autoComplete="email" required maxLength={254}
      value={email} onChange={event => setEmail(event.target.value)}
      placeholder="vous@exemple.com" style={{ width: '100%', boxSizing: 'border-box', padding: 10, margin: '8px 0' }} />
    <button type="submit" disabled={loading}>{loading ? 'Demande en cours…' : "Renvoyer l’e-mail"}</button>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
