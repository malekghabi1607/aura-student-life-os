import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ResendVerification from '../components/ResendVerification';

function AuraLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_check_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_check_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_check_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_check_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_check_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_check_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_check_orb)"/>
      <circle cx="19.5" cy="19" r="2" fill="white" opacity="0.35"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="lg_check_mail" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed"/>
          <stop offset="1" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="20" fill="url(#lg_check_mail)"/>
      <rect x="12" y="20" width="40" height="28" rx="4" stroke="white" strokeWidth="2.5" fill="none" strokeOpacity="0.9"/>
      <polyline points="12,24 32,38 52,24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.9"/>
      {/* Green check badge */}
      <circle cx="50" cy="16" r="10" fill="#10b981"/>
      <polyline points="45,16 49,20 55,12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function CheckEmailPage() {
  const { state } = useLocation();
  const email = state?.email || 'votre adresse email';

  return (
    <div style={s.page}>
      {/* Background orbs */}
      <div style={s.decor1} />
      <div style={s.decor2} />

      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <AuraLogo size={36} />
          <span style={s.appName}>Aura</span>
        </div>

        {/* Mail icon */}
        <div style={s.iconWrap}>
          <div style={s.iconGlow} />
          <MailIcon />
        </div>

        <h1 style={s.title}>Vérifiez votre email</h1>
        <p style={s.sub}>{state?.emailSent === false
          ? (state.message || "Votre compte est créé, mais l'envoi de l'e-mail a échoué. Réessayez ci-dessous dans une minute.")
          : "Consultez votre boîte e-mail pour le lien d'activation. Si aucun message n'arrive, vous pouvez le renvoyer."}</p>
        <div style={s.emailBox}>
          <span style={s.emailText}>{email}</span>
        </div>

        {/* Steps */}
        <div style={s.steps}>
          {[
            { n: 1, text: 'Ouvrez votre boîte email' },
            { n: 2, text: 'Cliquez sur "Activer mon compte"' },
            { n: 3, text: 'Connectez-vous à Aura' },
          ].map(({ n, text }) => (
            <div key={n} style={s.step}>
              <div style={s.stepNum}>{n}</div>
              <span style={s.stepText}>{text}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={s.divider} />

        {/* Spam hint */}
        <div style={s.hint}>
          <RefreshCw size={13} style={{ color: '#6d5a8a', flexShrink: 0 }} />
          <span>Vous n'avez pas reçu l'email ? Vérifiez vos spams ou courriers indésirables.</span>
        </div>

        {/* Back button */}
        <ResendVerification initialEmail={state?.email || ''} />
        <Link to="/login" style={s.backBtn}>
          <ArrowLeft size={15} />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh', background: '#07070e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative', overflow: 'hidden',
  },
  decor1: {
    position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)',
    width: 600, height: 400, borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(168,85,247,0.14) 0%, transparent 70%)',
    animation: 'auraGlow 4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  decor2: {
    position: 'fixed', bottom: '-8%', right: '15%',
    width: 340, height: 340, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)',
    animation: 'auraGlow 5s ease-in-out 1.5s infinite',
    pointerEvents: 'none',
  },

  card: {
    position: 'relative', zIndex: 1,
    background: '#111120', border: '1px solid rgba(168,85,247,0.15)',
    borderRadius: 24, padding: '44px 40px',
    width: '100%', maxWidth: 440, textAlign: 'center',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(124,58,237,0.08)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 36,
  },
  appName: {
    fontSize: '1.15rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em',
  },

  iconWrap: { position: 'relative', display: 'inline-block', marginBottom: 28 },
  iconGlow: {
    position: 'absolute', inset: -16, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },

  title: {
    fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9',
    letterSpacing: '-0.03em', margin: '0 0 8px',
  },
  sub: { fontSize: '0.87rem', color: '#64748b', margin: '0 0 10px' },
  emailBox: {
    display: 'inline-block',
    background: 'rgba(168,85,247,0.1)',
    border: '1px solid rgba(168,85,247,0.25)', borderRadius: 8,
    padding: '6px 16px', margin: '0 0 28px',
  },
  emailText: {
    fontSize: '0.9rem', fontWeight: 600, color: '#c084fc', wordBreak: 'break-all',
  },

  steps: {
    display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', marginBottom: 28,
  },
  step: { display: 'flex', alignItems: 'center', gap: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(236,72,153,0.15))',
    border: '1px solid rgba(168,85,247,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 800, color: '#c084fc',
  },
  stepText: { fontSize: '0.85rem', color: '#94a3b8' },

  divider: { height: 1, background: 'rgba(168,85,247,0.1)', margin: '0 0 20px' },

  hint: {
    display: 'flex', alignItems: 'flex-start', gap: 8, justifyContent: 'center',
    fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, marginBottom: 28,
  },

  backBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    color: 'white', padding: '11px 28px', borderRadius: 12,
    textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700,
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
  },
};
