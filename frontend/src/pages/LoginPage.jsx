import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { authAPI } from '../services/auth';
import { authError } from '../utils/authSession';
import ResendVerification from '../components/ResendVerification';

function AuraLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_login_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_login_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_login_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_login_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_login_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_login_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_login_orb)"/>
      <circle cx="19.5" cy="19" r="2" fill="white" opacity="0.35"/>
    </svg>
  );
}

const MODULES = [
  { icon: '📚', label: 'Études',    color: '#a855f7', anim: 'float',  delay: '0s',    top: '22%', left: '8%' },
  { icon: '💰', label: 'Finances',  color: '#10b981', anim: 'float2', delay: '0.4s',  top: '16%', left: '52%' },
  { icon: '🏃', label: 'Sport',     color: '#f59e0b', anim: 'float3', delay: '0.8s',  top: '40%', left: '62%' },
  { icon: '🤖', label: 'IA',        color: '#ec4899', anim: 'float',  delay: '1.2s',  top: '58%', left: '5%' },
  { icon: '🎯', label: 'Objectifs', color: '#22d3ee', anim: 'float2', delay: '0.6s',  top: '70%', left: '48%' },
  { icon: '📅', label: 'Planning',  color: '#6366f1', anim: 'float3', delay: '1.0s',  top: '30%', left: '30%' },
  { icon: '📖', label: 'Lectures',  color: '#f97316', anim: 'float',  delay: '0.2s',  top: '78%', left: '22%' },
  { icon: '✅', label: 'Habitudes', color: '#06b6d4', anim: 'float2', delay: '1.4s',  top: '50%', left: '78%' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('verified') === 'true')
      toast.success('Email vérifié ! Vous pouvez vous connecter.');
    if (searchParams.get('error') === 'invalid-token')
      toast.error('Lien de vérification invalide ou expiré.');
    if (searchParams.get('error') === 'expired-token')
      toast.error('Ce lien de confirmation a expiré. Demandez un nouveau lien ci-dessous.');
    if (searchParams.get('reset') === 'true')
      toast.success('Mot de passe modifié avec succès !');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setNeedsVerification(false);
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email: email.trim(), password });
      if (!data.token) {
        toast.error(data.name || 'Email ou mot de passe incorrect');
        return;
      }
      login(data.token, { email: data.email, name: data.name });
      toast.success(`Bienvenue, ${data.name} !`);
      navigate('/dashboard');
    } catch (err) {
      setNeedsVerification(err.response?.data?.code === 'EMAIL_NOT_VERIFIED');
      setError(authError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── Left brand panel ── */}
      <div style={s.brand}>
        <div style={s.bgOrb} />
        <div style={s.bgOrb2} />

        {/* Header logo */}
        <div style={s.logoRow}>
          <AuraLogo size={44} />
          <div>
            <div style={s.appName}>Aura</div>
            <div style={s.appSub}>Student Life OS</div>
          </div>
        </div>

        {/* Floating modules */}
        {MODULES.map(m => (
          <div key={m.label} style={{
            position: 'absolute', top: m.top, left: m.left,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${m.color}30`,
            borderRadius: 100, padding: '8px 14px',
            boxShadow: `0 4px 20px ${m.color}20`,
            animation: `${m.anim} 3s ease-in-out ${m.delay} infinite`,
            zIndex: 2,
          }}>
            <span style={{ fontSize: 16 }}>{m.icon}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
              {m.label}
            </span>
          </div>
        ))}

        {/* Hero text */}
        <div style={s.heroBottom}>
          <h2 style={s.heroTitle}>Votre OS<br/>de vie étudiant.</h2>
          <p style={s.heroSub}>Études · Finances · Sport · IA · Planning · Habitudes</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.right}>
        <div style={s.formWrap}>
          {/* Mobile-only logo */}
          <div style={s.mobileLogo}>
            <AuraLogo size={36} />
            <span style={s.mobileAppName}>Aura</span>
          </div>

          <h1 style={s.formTitle}>Connexion</h1>
          <p style={s.formSub}>Accédez à votre espace Aura</p>
          {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
          {searchParams.get('error') && <p role="alert" style={{ color: '#fca5a5' }}>
            {searchParams.get('error') === 'expired-token' ? 'Le lien de confirmation a expiré.' : 'Le lien de confirmation est invalide ou a déjà été utilisé.'}
          </p>}

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
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

            <div style={s.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={s.label}>Mot de passe</label>
                <Link to="/forgot-password" style={s.forgotLink}>Mot de passe oublié ?</Link>
              </div>
              <div style={s.inputWrap}>
                <Lock size={15} style={s.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {loading ? 'Connexion...' : <><span>Se connecter</span><ArrowRight size={16} /></>}
            </button>
          </form>
          {(needsVerification || searchParams.get('error')) && <ResendVerification initialEmail={email} />}

          <div style={s.orRow}>
            <div style={s.orLine} /><span style={s.orText}>ou</span><div style={s.orLine} />
          </div>

          {import.meta.env.DEV && <button
            style={s.demoBtn}
            onClick={() => { setEmail('demo@finance.app'); setPassword('demo123'); }}
          >
            <CheckCircle size={14} style={{ color: '#10b981' }} />
            Essayer avec le compte démo
          </button>}

          <p style={s.footer}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={s.link}>Créer un compte gratuitement</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', background: '#07070e' },

  brand: {
    width: '50%', minHeight: '100vh',
    background: 'linear-gradient(150deg, #0e0820 0%, #07070e 55%, #0d0818 100%)',
    borderRight: '1px solid rgba(168,85,247,0.1)',
    padding: '52px 44px', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
  },

  bgOrb: {
    position: 'absolute', top: '25%', left: '20%',
    width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)',
    animation: 'auraGlow 4s ease-in-out infinite',
    pointerEvents: 'none', zIndex: 0,
  },
  bgOrb2: {
    position: 'absolute', bottom: '15%', right: '10%',
    width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.12), transparent 70%)',
    animation: 'auraGlow 5s ease-in-out 1s infinite',
    pointerEvents: 'none', zIndex: 0,
  },

  logoRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    position: 'relative', zIndex: 3,
  },
  appName: {
    fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em',
  },
  appSub: { fontSize: '0.68rem', color: '#6d5a8a', fontWeight: 400, marginTop: 2 },

  heroBottom: {
    position: 'relative', zIndex: 3,
  },
  heroTitle: {
    fontSize: '2.6rem', fontWeight: 900, lineHeight: 1.15,
    letterSpacing: '-0.04em', margin: '0 0 14px',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #a855f7 50%, #22d3ee 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  },
  heroSub: {
    fontSize: '0.88rem', color: '#6d5a8a', lineHeight: 1.7,
    margin: 0, maxWidth: 340,
  },

  right: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 40px', background: '#0a0a14',
  },
  formWrap: { width: '100%', maxWidth: 400 },
  mobileLogo: { display: 'none', alignItems: 'center', gap: 10, marginBottom: 28 },
  mobileAppName: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' },
  formTitle: {
    fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9',
    letterSpacing: '-0.03em', margin: '0 0 6px',
  },
  formSub: { fontSize: '0.87rem', color: '#64748b', margin: '0 0 32px' },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: '0.81rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.01em' },
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
    marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    color: 'white', border: 'none', borderRadius: 12, padding: '13px 20px',
    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(124,58,237,0.5)', fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
  orRow: { display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' },
  orLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' },
  orText: { fontSize: '0.75rem', color: '#475569' },
  demoBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: 12,
    padding: '11px 20px', fontSize: '0.85rem', fontWeight: 500,
    color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
  },
  footer: { marginTop: 24, textAlign: 'center', fontSize: '0.84rem', color: '#475569' },
  link: { color: '#c084fc', textDecoration: 'none', fontWeight: 600 },
  forgotLink: { fontSize: '0.78rem', color: '#8b5cf6', textDecoration: 'none', fontWeight: 500 },
};
