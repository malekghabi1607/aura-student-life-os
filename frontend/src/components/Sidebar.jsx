import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowUpDown, Tag, BarChart3,
  Menu, X, Coins, LogOut, CircleUser,
  BookOpen, Dumbbell, Target, Calendar, Sparkles, ChevronDown,
  Settings2, BookMarked, Languages, Library, Activity
} from 'lucide-react';

function AuraLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <defs>
        <linearGradient id="lg_sidebar_bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d1b69"/><stop offset="1" stopColor="#1a0533"/>
        </linearGradient>
        <linearGradient id="lg_sidebar_ring" x1="0" y1="44" x2="44" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee"/><stop offset="0.4" stopColor="#a855f7"/>
          <stop offset="0.75" stopColor="#ec4899"/><stop offset="1" stopColor="#22d3ee"/>
        </linearGradient>
        <radialGradient id="lg_sidebar_orb" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#e879f9"/>
          <stop offset="55%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </radialGradient>
      </defs>
      <rect width="44" height="44" rx="14" fill="url(#lg_sidebar_bg)"/>
      <circle cx="22" cy="22" r="18" stroke="url(#lg_sidebar_ring)" strokeWidth="1.5" fill="none" opacity="0.5"/>
      <circle cx="22" cy="22" r="12" stroke="url(#lg_sidebar_ring)" strokeWidth="1" fill="none" opacity="0.4"/>
      <circle cx="22" cy="22" r="7" fill="url(#lg_sidebar_orb)"/>
      <circle cx="19.5" cy="19" r="2" fill="white" opacity="0.35"/>
    </svg>
  );
}
import { useState, useEffect } from 'react';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'aura_modules';

// Core modules — always shown
const coreModules = [
  { to: '/study', icon: BookOpen, label: 'Études', key: 'study' },
  { to: '/fitness', icon: Dumbbell, label: 'Sport & Santé', key: 'fitness' },
  { to: '/goals', icon: Target, label: 'Objectifs', key: 'goals' },
  { to: '/planning', icon: Calendar, label: 'Planning', key: 'planning' },
];

// Extra modules — can be toggled
const extraModules = [
  { to: '/notes', icon: BookMarked, label: 'Notes', key: 'notes' },
  { to: '/languages', icon: Languages, label: 'Langues', key: 'languages' },
  { to: '/readings', icon: Library, label: 'Lectures', key: 'readings' },
  { to: '/habits', icon: Activity, label: 'Habitudes', key: 'habits' },
];

function loadVisibleExtras() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [visibleExtras, setVisibleExtras] = useState(loadVisibleExtras);
  const { currency, changeCurrency } = useCurrency();
  const { user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleExtras));
  }, [visibleExtras]);

  function toggleExtra(key) {
    setVisibleExtras(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const visibleExtraModules = extraModules.filter(m => visibleExtras[m.key]);
  const allModuleItems = [...coreModules, ...visibleExtraModules];

  const navGroups = [
    {
      label: 'Dashboard',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Vue générale' },
        { to: '/ai', icon: Sparkles, label: 'Assistant IA', badge: 'IA' },
      ],
    },
    {
      label: 'Modules',
      items: allModuleItems,
      hasManage: true,
    },
    {
      label: 'Finance',
      items: [
        { to: '/', icon: BarChart3, label: 'Dashboard Budget', end: true },
        { to: '/transactions', icon: ArrowUpDown, label: 'Transactions' },
        { to: '/categories', icon: Tag, label: 'Catégories' },
      ],
    },
  ];

  return (
    <>
      <div className="mobile-header">
        <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Aura</span>
      </div>

      {mobileOpen && (
        <div className="modal-overlay" style={{ zIndex: 49 }} onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ background: 'none', padding: 0, boxShadow: 'none' }}>
            <AuraLogo size={36} />
          </div>
          <div>
            <h1>Aura<span>Student Life OS</span></h1>
          </div>
          {mobileOpen && (
            <button className="btn btn-ghost btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto' }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 6 }}>
                <span className="nav-section-title">{group.label}</span>
                {group.hasManage && (
                  <button
                    onClick={() => setManageOpen(o => !o)}
                    title="Gérer les modules"
                    style={{
                      background: manageOpen ? 'rgba(124,58,237,0.2)' : 'transparent',
                      border: 'none', borderRadius: 6, padding: '3px 5px',
                      cursor: 'pointer', color: manageOpen ? '#a855f7' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                    }}>
                    <Settings2 size={13} />
                  </button>
                )}
              </div>

              {group.items.map(({ to, icon: Icon, label, badge, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} />
                  {label}
                  {badge && (
                    <span style={{
                      marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700,
                      background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                      color: 'white', borderRadius: 999, padding: '2px 7px',
                    }}>{badge}</span>
                  )}
                </NavLink>
              ))}

              {/* Module manager panel */}
              {group.hasManage && manageOpen && (
                <div style={{
                  margin: '6px 8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Modules disponibles
                  </div>
                  {extraModules.map(m => {
                    const Icon = m.icon;
                    const active = !!visibleExtras[m.key];
                    return (
                      <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: active ? '#f1f5f9' : '#64748b' }}>
                          <Icon size={14} />
                          {m.label}
                        </div>
                        <button
                          onClick={() => toggleExtra(m.key)}
                          style={{
                            width: 32, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer',
                            background: active ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                          }}>
                          <div style={{
                            position: 'absolute', top: 2, left: active ? 16 : 2,
                            width: 14, height: 14, borderRadius: '50%',
                            background: 'white', transition: 'left 0.2s',
                          }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CircleUser size={16} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
            <button onClick={logout} title="Déconnexion" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, flexShrink: 0 }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Currency */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-subtle)', position: 'relative' }}>
          <button
            onClick={() => setCurrencyOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', background: 'var(--bg-hover)',
              border: '1px solid var(--border-default)', borderRadius: 999,
              padding: '7px 14px', cursor: 'pointer', color: 'var(--text-primary)',
              fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-active)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          >
            <Coins size={14} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{currency.symbol} — {currency.label}</span>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: currencyOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {currencyOpen && (
            <div style={{
              position: 'absolute', bottom: '110%', left: 14, right: 14,
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 14, padding: 6, zIndex: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {CURRENCIES.map(c => (
                <button key={c.code} onClick={() => { changeCurrency(c.code); setCurrencyOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 12px',
                  background: currency.code === c.code ? 'var(--primary-500)' : 'transparent',
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  color: currency.code === c.code ? 'white' : 'var(--text-primary)',
                  fontSize: '0.82rem', textAlign: 'left', transition: 'background 0.1s',
                }}>
                  <span style={{ fontWeight: 700, minWidth: 28 }}>{c.symbol}</span>
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
