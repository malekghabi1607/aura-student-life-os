import { useState, useEffect } from 'react';
import {
  Dumbbell, Moon, Droplets, Flame, Scale,
  Settings, Check, Plus, X, Trash2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { fitnessAPI } from '../services/api';
import toast from 'react-hot-toast';

/* ─── constants ─────────────────────────────────────────────── */
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };
const today = new Date().toISOString().split('T')[0];

const WORKOUT_TYPES = [
  { key: 'cardio',       label: 'Cardio',        emoji: '🏃', color: '#ef4444' },
  { key: 'musculation',  label: 'Musculation',   emoji: '🏋️', color: '#4361ee' },
  { key: 'yoga',         label: 'Yoga / Stretching', emoji: '🧘', color: '#7c3aed' },
  { key: 'sport',        label: 'Sport collectif', emoji: '⚽', color: '#10b981' },
  { key: 'swimming',     label: 'Natation',       emoji: '🏊', color: '#06b6d4' },
  { key: 'cycling',      label: 'Vélo',           emoji: '🚴', color: '#f59e0b' },
  { key: 'other',        label: 'Autre',          emoji: '💪', color: '#64748b' },
];

const DEFAULT_PROFILE = {
  name: '', gender: 'homme', age: 20, height: 175,
  currentWeight: 75, targetWeight: 70,
  weeklyCaloriesGoal: 2500, weeklySessionsGoal: 4,
  dailyWaterGoal: 2.5, dailySleepGoal: 8,
};
const DEFAULT_DAILY = { water: 0, sleep: 0, weight: null };

function loadProfile() {
  try { return JSON.parse(localStorage.getItem('fitness_profile')) || DEFAULT_PROFILE; }
  catch { return DEFAULT_PROFILE; }
}
function loadDaily() {
  try { return JSON.parse(localStorage.getItem('fitness_daily')) || {}; }
  catch { return {}; }
}
function saveDaily(data) { localStorage.setItem('fitness_daily', JSON.stringify(data)); }
function saveProfile(p)  { localStorage.setItem('fitness_profile', JSON.stringify(p)); }

function getLast7Dates() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });
}

function typeInfo(key) {
  return WORKOUT_TYPES.find(t => t.key === key) || WORKOUT_TYPES.at(-1);
}

/* ─── sub-components ─────────────────────────────────────────── */
function Ring({ pct, color, size = 110, stroke = 10, label, value }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(Math.max(pct || 0, 0), 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (filled / 100) * circ}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50%" y="44%" textAnchor="middle" dominantBaseline="central" fill="#f1f5f9" fontSize={size * 0.17} fontWeight="800">{value}</text>
        <text x="50%" y="64%" textAnchor="middle" dominantBaseline="central" fill="#64748b" fontSize={size * 0.1}>{Math.round(filled)}%</text>
      </svg>
      <span style={{ fontSize: '0.7rem', color: '#64748b', textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function SetupModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState(profile);
  const set = k => e => setForm(f => ({ ...f, [k]: parseFloat(e.target.value) || e.target.value }));
  const fields = [
    { key: 'age', label: 'Âge', unit: 'ans', min: 10, max: 100 },
    { key: 'height', label: 'Taille', unit: 'cm', min: 100, max: 250 },
    { key: 'currentWeight', label: 'Poids actuel', unit: 'kg', min: 30, max: 300, step: 0.1 },
    { key: 'targetWeight', label: 'Poids cible', unit: 'kg', min: 30, max: 300, step: 0.1 },
    { key: 'weeklyCaloriesGoal', label: 'Calories / semaine', unit: 'kcal', min: 500, max: 10000 },
    { key: 'weeklySessionsGoal', label: 'Séances / semaine', unit: 'séances', min: 1, max: 14 },
    { key: 'dailyWaterGoal', label: 'Eau par jour', unit: 'L', min: 0.5, max: 6, step: 0.1 },
    { key: 'dailySleepGoal', label: 'Sommeil objectif', unit: 'h', min: 4, max: 12, step: 0.5 },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#12121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>⚙️ Mon profil Fitness</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Prénom</label>
            <input value={form.name} onChange={set('name')} placeholder="Ton prénom"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: 6 }}>Genre</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['homme', 'femme', 'autre'].map(g => (
                <button key={g} type="button" onClick={() => setForm(f => ({ ...f, gender: g }))}
                  style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: form.gender === g ? '#4361ee' : 'rgba(255,255,255,0.06)', color: form.gender === g ? 'white' : '#64748b' }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" value={form[f.key]} onChange={set(f.key)} min={f.min} max={f.max} step={f.step || 1}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: '0.88rem', outline: 'none' }} />
                <span style={{ fontSize: '0.72rem', color: '#475569', whiteSpace: 'nowrap' }}>{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { onSave(form); onClose(); }}
          style={{ width: '100%', marginTop: 24, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#4361ee,#7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
          ✓ Enregistrer mon profil
        </button>
      </div>
    </div>
  );
}

function WorkoutModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'cardio', duration: '', calories: '', date: today, notes: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        type: form.type,
        duration: form.duration ? Number(form.duration) : null,
        calories: form.calories ? Number(form.calories) : null,
        date: form.date,
        notes: form.notes || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#12121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>🏋️ Nouvelle séance</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Nom *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus
              placeholder="Ex: Course à pied 5km"
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {/* Type */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
              {WORKOUT_TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setForm(f => ({ ...f, type: t.key }))}
                  style={{ padding: '8px 4px', borderRadius: 10, border: `2px solid ${form.type === t.key ? t.color : 'transparent'}`, background: form.type === t.key ? t.color + '22' : 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, color: form.type === t.key ? t.color : '#64748b', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem' }}>{t.emoji}</div>
                  {t.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Durée (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} min={1} placeholder="Ex: 45"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Calories</label>
              <input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} min={0} placeholder="Ex: 350"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Notes (optionnel)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ressenti, performance..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 700 }}>
              {saving ? 'Enregistrement...' : '✓ Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DailyLogModal({ daily, profile, onSave, onClose }) {
  const [form, setForm] = useState({ water: daily.water || 0, sleep: daily.sleep || 0, weight: daily.weight || '' });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#12121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>📝 Journal du jour</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'water',  label: 'Eau bue',         unit: 'L',  icon: Droplets, color: '#4361ee', target: profile.dailyWaterGoal,  step: 0.1 },
            { key: 'sleep',  label: 'Heures de sommeil', unit: 'h', icon: Moon,     color: '#7c3aed', target: profile.dailySleepGoal,  step: 0.5 },
          ].map(e => (
            <div key={e.key} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: e.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <e.icon size={14} color={e.color} />
                </div>
                <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500 }}>{e.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#475569' }}>Objectif : {e.target} {e.unit}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="number" value={form[e.key]} onChange={ev => setForm(f => ({ ...f, [e.key]: parseFloat(ev.target.value) || 0 }))} min={0} step={e.step}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, outline: 'none' }} />
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>{e.unit}</span>
                {form[e.key] >= e.target && <Check size={16} color="#10b981" />}
              </div>
            </div>
          ))}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f59e0b22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scale size={14} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500 }}>Pesée (optionnel)</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: parseFloat(e.target.value) || '' }))} placeholder="--" step={0.1}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#f1f5f9', fontSize: '1rem', fontWeight: 700, outline: 'none' }} />
              <span style={{ fontSize: '0.75rem', color: '#475569' }}>kg</span>
            </div>
          </div>
        </div>
        <button onClick={() => { onSave(form); onClose(); }}
          style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
          ✓ Enregistrer
        </button>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export default function FitnessPage() {
  const [profile, setProfile]       = useState(loadProfile);
  const [dailyLogs, setDailyLogs]   = useState(loadDaily);
  const [workouts, setWorkouts]     = useState([]);
  const [loading, setLoading]       = useState(true);

  const [showSetup,    setShowSetup]    = useState(!loadProfile().name);
  const [showWorkout,  setShowWorkout]  = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);

  useEffect(() => {
    fitnessAPI.getWorkouts()
      .then(r => setWorkouts(r.data))
      .catch(() => toast.error('Erreur chargement des séances'))
      .finally(() => setLoading(false));
  }, []);

  /* helpers */
  function handleProfileSave(p) { setProfile(p); saveProfile(p); }

  function handleDailyLog(data) {
    const updated = { ...dailyLogs, [today]: { ...(dailyLogs[today] || {}), ...data } };
    setDailyLogs(updated);
    saveDaily(updated);
    toast.success('Journal enregistré ✓');
  }

  async function handleCreateWorkout(data) {
    try {
      const res = await fitnessAPI.createWorkout(data);
      setWorkouts(prev => [res.data, ...prev]);
      toast.success('Séance enregistrée ✓');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
      throw new Error('save failed');
    }
  }

  async function handleDeleteWorkout(id) {
    try {
      await fitnessAPI.deleteWorkout(id);
      setWorkouts(prev => prev.filter(w => w.id !== id));
      toast.success('Séance supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }

  /* derived data */
  const last7Dates  = getLast7Dates();
  const todayLog    = dailyLogs[today] || DEFAULT_DAILY;
  const todayWorkouts = workouts.filter(w => w.date === today);
  const todayCals   = todayWorkouts.reduce((a, w) => a + (w.calories || 0), 0);
  const todaySess   = todayWorkouts.length;

  /* weekly aggregates */
  const weekWorkouts = workouts.filter(w => last7Dates.includes(w.date));
  const weekCals     = weekWorkouts.reduce((a, w) => a + (w.calories || 0), 0);
  const weekSess     = weekWorkouts.length;
  const weekMins     = weekWorkouts.reduce((a, w) => a + (w.duration || 0), 0);

  /* 7-day bar chart data */
  const barData = last7Dates.map(date => {
    const dayWk = workouts.filter(w => w.date === date);
    const d = new Date(date + 'T12:00:00');
    return {
      day: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()],
      calories: dayWk.reduce((a, w) => a + (w.calories || 0), 0),
      sessions: dayWk.length,
      isToday: date === today,
    };
  });

  /* weight history */
  const weightHistory = last7Dates
    .map(date => ({ date: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), kg: dailyLogs[date]?.weight || null }))
    .filter(d => d.kg);

  const lastWeight = [...last7Dates].reverse().map(d => dailyLogs[d]?.weight).find(Boolean) || profile.currentWeight;
  const weightLost = profile.currentWeight - lastWeight;
  const weightToGo = Math.abs(profile.currentWeight - profile.targetWeight);
  const weightPct  = weightToGo ? Math.max(0, Math.min(100, (Math.abs(weightLost) / weightToGo) * 100)) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {showSetup    && <SetupModal profile={profile} onSave={handleProfileSave} onClose={() => setShowSetup(false)} />}
      {showWorkout  && <WorkoutModal onSave={handleCreateWorkout} onClose={() => setShowWorkout(false)} />}
      {showDailyLog && <DailyLogModal daily={todayLog} profile={profile} onSave={handleDailyLog} onClose={() => setShowDailyLog(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dumbbell size={24} color="#10b981" />
          {profile.name ? `Sport & Santé — ${profile.name}` : 'Sport & Santé'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowDailyLog(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(67,97,238,0.15)', border: '1px solid rgba(67,97,238,0.3)', color: '#4361ee', borderRadius: 12, padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <Droplets size={14} /> Journal
          </button>
          <button onClick={() => setShowWorkout(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <Plus size={15} /> Séance
          </button>
          <button onClick={() => setShowSetup(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, padding: '9px 14px', cursor: 'pointer', fontSize: '0.85rem' }}>
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* Today rings */}
      <div style={card}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>
          🏃 Aujourd'hui — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
          <Ring pct={profile.weeklyCaloriesGoal ? (todayCals / (profile.weeklyCaloriesGoal / 7)) * 100 : 0}
            color="#ef4444" size={120} stroke={12} label="Calories" value={todayCals} />
          <Ring pct={(todaySess / Math.max(profile.weeklySessionsGoal / 7, 1)) * 100}
            color="#10b981" size={120} stroke={12} label="Séances" value={todaySess} />
          <Ring pct={profile.dailyWaterGoal ? (todayLog.water / profile.dailyWaterGoal) * 100 : 0}
            color="#4361ee" size={120} stroke={12} label={`Eau / ${profile.dailyWaterGoal}L`} value={`${todayLog.water}L`} />
          <Ring pct={profile.dailySleepGoal ? (todayLog.sleep / profile.dailySleepGoal) * 100 : 0}
            color="#7c3aed" size={120} stroke={12} label={`Sommeil / ${profile.dailySleepGoal}h`} value={`${todayLog.sleep}h`} />
        </div>
        {todaySess === 0 && !todayLog.water && !todayLog.sleep && (
          <div onClick={() => setShowWorkout(true)} style={{ textAlign: 'center', marginTop: 16, padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: 12, fontSize: '0.82rem', color: '#10b981', cursor: 'pointer' }}>
            ✏️ Enregistre ta première séance d'aujourd'hui
          </div>
        )}
      </div>

      {/* Weekly stats + weight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>📊 Semaine en cours</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {[
              { label: 'Séances', val: `${weekSess}/${profile.weeklySessionsGoal}`, color: '#10b981', icon: Dumbbell },
              { label: 'Calories brûlées', val: weekCals, target: profile.weeklyCaloriesGoal, color: '#ef4444', icon: Flame },
              { label: 'Temps actif', val: `${weekMins} min`, color: '#f59e0b', icon: Dumbbell },
              { label: 'Poids actuel', val: `${lastWeight} kg`, color: '#4361ee', icon: Scale },
            ].map(s => (
              <div key={s.label} style={{ background: s.color + '11', borderRadius: 14, padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <s.icon size={13} color={s.color} />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                {s.target && <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 2 }}>Objectif : {s.target}</div>}
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>⚖️ Objectif poids</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div><div style={{ fontSize: '0.7rem', color: '#64748b' }}>Départ</div><div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>{profile.currentWeight} kg</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '0.7rem', color: '#64748b' }}>{weightLost >= 0 ? 'Perdu' : 'Pris'}</div><div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{Math.abs(weightLost).toFixed(1)} kg</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.7rem', color: '#64748b' }}>Objectif</div><div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4361ee' }}>{profile.targetWeight} kg</div></div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${weightPct}%`, background: 'linear-gradient(90deg,#10b981,#4361ee)', borderRadius: 999, transition: 'width 0.8s' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 12 }}>{Math.round(weightPct)}% vers l'objectif · encore {Math.abs(profile.targetWeight - lastWeight).toFixed(1)} kg</div>
          {weightHistory.length >= 2 && (
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={weightHistory}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={v => [`${v} kg`]} />
                <Line type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 7-day charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={card}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>🔥 Calories — 7 jours</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData} barSize={26}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={v => [`${v} kcal`]} />
              <Bar dataKey="calories" radius={[6,6,0,0]}
                fill="#ef4444"
                label={{ position: 'top', fill: '#64748b', fontSize: 9, formatter: v => v > 0 ? v : '' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>🏋️ Séances — 7 jours</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={barData} barSize={26}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={v => [`${v} séance(s)`]} />
              <Bar dataKey="sessions" fill="#10b981" radius={[6,6,0,0]}
                label={{ position: 'top', fill: '#64748b', fontSize: 9, formatter: v => v > 0 ? v : '' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workout history */}
      <div style={card}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>📋 Historique des séances</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>Chargement...</div>
        ) : workouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🏋️</div>
            <div>Aucune séance enregistrée</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Commencez par ajouter votre première séance</div>
            <button onClick={() => setShowWorkout(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: 'white', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, margin: '16px auto 0' }}>
              <Plus size={15} /> Ajouter une séance
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workouts.slice(0, 20).map(w => {
              const t = typeInfo(w.type);
              return (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: t.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                    {t.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                      {t.label}
                      {w.duration && ` · ${w.duration} min`}
                      {w.calories && ` · ${w.calories} kcal`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {new Date(w.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    {w.date === today && <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 700, marginTop: 2 }}>Aujourd'hui</div>}
                  </div>
                  <button onClick={() => handleDeleteWorkout(w.id)}
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '6px 7px', cursor: 'pointer', color: '#ef4444', display: 'flex', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
