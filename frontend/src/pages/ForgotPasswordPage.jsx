import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

function AuraLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_fp_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_fp_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_fp_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_fp_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_fp_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_fp_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_fp_orb)"/>
      <circle cx="19.5" cy="19" r="2" fill="white" opacity="0.35"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch {
      toast.error('Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.bgOrb} />
      <div style={s.bgOrb2} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <AuraLogo size={40} />
          <div>
            <div style={s.appName}>Aura</div>
            <div style={s.appSub}>Student Life OS</div>
          </div>
        </div>

        {sent ? (
          /* ── Success state ── */
          <div style={s.successWrap}>
            <div style={s.mailIcon}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <defs>
                  <linearGradient id="lg_fp_mail" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7c3aed"/><stop offset="1" stopColor="#22d3ee"/>
                  </linearGradient>
                </defs>
                <rect width="52" height="52" rx="16" fill="url(#lg_fp_mail)"/>
                <rect x="9" y="16" width="34" height="22" rx="3" stroke="white" strokeWidth="2" fill="none" strokeOpacity="0.9"/>
                <polyline points="9,16 26,28 43,16" stroke="white" strokeWidth="2" fill="none" strokeOpacity="0.9"/>
                <circle cx="38" cy="14" r="6" fill="#10b981"/>
                <polyline points="35,14 37.5,16.5 41,12" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={s.title}>Email envoyé !</h2>
            <p style={s.sub}>
              Si un compte existe pour <strong style={{ color: '#c084fc' }}>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
            </p>
            <div style={s.infoBox}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Vérifiez aussi vos spams. Le lien expire dans <strong style={{ color: '#a855f7' }}>1 heure</strong>.
              </span>
            </div>
            <Link to="/login" style={s.backLink}>
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <h1 style={s.title}>Mot de passe oublié ?</h1>
            <p style={s.sub}>
              Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.field}>
                <label style={s.label}>Adresse email</label>
                <div style={s.inputWrap}>
                  <Mail size={15} style={s.inputIcon} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    required
                    style={s.input}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
              >
                {loading
                  ? 'Envoi en cours...'
                  : <><span>Envoyer le lien</span><ArrowRight size={16} /></>}
              </button>
            </form>

            <Link to="/login" style={s.backLink}>
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#07070e', padding: '24px', position: 'relative', overflow: 'hidden',
  },
  bgOrb: {
    position: 'fixed', top: '20%', left: '15%',
    width: 360, height: 360, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.14), transparent 70%)',
    animation: 'auraGlow 5s ease-in-out infinite', pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'fixed', bottom: '15%', right: '10%',
    width: 280, height: 280, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.10), transparent 70%)',
    animation: 'auraGlow 6s ease-in-out 1.5s infinite', pointerEvents: 'none',
  },
  card: {
    width: '100%', maxWidth: 440, position: 'relative', zIndex: 1,
    background: '#111120', border: '1px solid rgba(168,85,247,0.15)',
    borderRadius: 24, padding: '40px 36px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
  },
  header: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 },
  appName: { fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  appSub: { fontSize: '0.65rem', color: '#6d5a8a', marginTop: 2 },
  title: {
    fontSize: '1.55rem', fontWeight: 800, color: '#f1f5f9',
    letterSpacing: '-0.03em', margin: '0 0 10px',
  },
  sub: { fontSize: '0.87rem', color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: '0.81rem', fontWeight: 600, color: '#94a3b8' },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
    color: '#475569', pointerEvents: 'none',
  },
  input: {
    width: '100%', boxSizing: 'border-box',
    background: '#0f0f1e', color: '#f1f5f9',
    border: '1.5px solid rgba(168,85,247,0.15)', borderRadius: 12,
    padding: '12px 14px 12px 44px', fontSize: '0.9rem', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    color: 'white', border: 'none', borderRadius: 12, padding: '13px 20px',
    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(124,58,237,0.4)', fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
  backLink: {
    display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    marginTop: 20, fontSize: '0.84rem', color: '#c084fc',
    textDecoration: 'none', fontWeight: 600,
  },
  successWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  mailIcon: { marginBottom: 20 },
  infoBox: {
    background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)',
    borderRadius: 12, padding: '14px 18px', marginBottom: 24, width: '100%', textAlign: 'left',
  },
};
