import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

function AuraLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_rp_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_rp_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_rp_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_rp_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_rp_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_rp_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_rp_orb)"/>
      <circle cx="19.5" cy="19" r="2" fill="white" opacity="0.35"/>
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['transparent', '#ef4444', '#f59e0b', '#10b981'][strength];
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Lien invalide. Refaites la demande de réinitialisation.');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password: form.password });
      toast.success('Mot de passe modifié ! Vous pouvez vous connecter.');
      navigate('/login?reset=true');
    } catch (err) {
      const msg = err.response?.data?.message || 'Lien invalide ou expiré. Refaites la demande.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={s.page}>
        <div style={s.bgOrb} /><div style={s.bgOrb2} />
        <div style={s.card}>
          <div style={s.header}><AuraLogo size={40} /><div><div style={s.appName}>Aura</div><div style={s.appSub}>Student Life OS</div></div></div>
          <h1 style={s.title}>Lien invalide</h1>
          <p style={s.sub}>Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link to="/forgot-password" style={{ ...s.submitBtn, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Faire une nouvelle demande
          </Link>
          <Link to="/login" style={s.backLink}><ArrowLeft size={14} /> Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.bgOrb} />
      <div style={s.bgOrb2} />

      <div style={s.card}>
        <div style={s.header}>
          <AuraLogo size={40} />
          <div>
            <div style={s.appName}>Aura</div>
            <div style={s.appSub}>Student Life OS</div>
          </div>
        </div>

        <h1 style={s.title}>Nouveau mot de passe</h1>
        <p style={s.sub}>Choisissez un mot de passe sécurisé pour votre compte Aura.</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Nouveau mot de passe</label>
            <div style={s.inputWrap}>
              <Lock size={15} style={s.inputIcon} />
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Au moins 6 caractères"
                required
                style={s.input}
              />
            </div>
            {form.password.length > 0 && (
              <div style={s.strengthRow}>
                <div style={s.strengthTrack}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{
                      ...s.strengthSeg,
                      background: i <= strength ? strengthColor : 'rgba(255,255,255,0.06)',
                    }} />
                  ))}
                </div>
                <span style={{ ...s.strengthLbl, color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Confirmer le mot de passe</label>
            <div style={s.inputWrap}>
              <Lock size={15} style={s.inputIcon} />
              <input
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Répéter le mot de passe"
                required
                style={s.input}
              />
            </div>
            {form.confirm.length > 0 && form.password !== form.confirm && (
              <span style={s.errorHint}>Les mots de passe ne correspondent pas</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...s.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading
              ? 'Modification...'
              : <><span>Modifier le mot de passe</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <Link to="/login" style={s.backLink}>
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
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
  strengthRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 },
  strengthTrack: { display: 'flex', gap: 4, flex: 1 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2, transition: 'background 0.2s' },
  strengthLbl: { fontSize: '0.72rem', fontWeight: 600, minWidth: 36 },
  errorHint: { fontSize: '0.75rem', color: '#ef4444', marginTop: 4 },
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
};
