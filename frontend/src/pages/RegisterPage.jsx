import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/auth';
import { authError } from '../utils/authSession';

function AuraLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_register_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_register_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_register_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_register_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_register_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_register_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_register_orb)"/>
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

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authAPI.register({
        name: form.name.trim(), email: form.email.trim(), password: form.password,
      });
      navigate('/check-email', { state: { email: form.email.trim(), emailSent: data.emailSent, message: data.message } });
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const msgs = Object.values(data.errors);
        msgs.forEach(msg => toast.error(msg));
      } else {
        toast.error(authError(err, 'Erreur lors de la création du compte'));
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['transparent', '#ef4444', '#f59e0b', '#10b981'][strength];
  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort'][strength];

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
          <h2 style={s.heroTitle}>Rejoignez<br/>l'OS étudiant.</h2>
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

          <h1 style={s.formTitle}>Créer un compte</h1>
          <p style={s.formSub}>Rejoignez Aura gratuitement</p>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Nom complet</label>
              <div style={s.inputWrap}>
                <User size={15} style={s.inputIcon} />
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Votre nom"
                  required
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Email</label>
              <div style={s.inputWrap}>
                <Mail size={15} style={s.inputIcon} />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="vous@exemple.com"
                  required
                  style={s.input}
                />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Mot de passe</label>
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
                      <div
                        key={i}
                        style={{
                          ...s.strengthSeg,
                          background: i <= strength ? strengthColor : 'rgba(255,255,255,0.06)',
                        }}
                      />
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
              {loading ? 'Création...' : <><span>Créer mon compte</span><ArrowRight size={16} /></>}
            </button>
          </form>

          <p style={s.footer}>
            Déjà un compte ?{' '}
            <Link to="/login" style={s.link}>Se connecter</Link>
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
  appName: { fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' },
  appSub: { fontSize: '0.68rem', color: '#6d5a8a', fontWeight: 400, marginTop: 2 },

  heroBottom: { position: 'relative', zIndex: 3 },
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
  formSub: { fontSize: '0.87rem', color: '#64748b', margin: '0 0 28px' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
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
    marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    color: 'white', border: 'none', borderRadius: 12, padding: '13px 20px',
    fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(124,58,237,0.5)', fontFamily: 'inherit',
    transition: 'opacity 0.2s',
  },
  footer: { marginTop: 24, textAlign: 'center', fontSize: '0.84rem', color: '#475569' },
  link: { color: '#c084fc', textDecoration: 'none', fontWeight: 600 },
};
