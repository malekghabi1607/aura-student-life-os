import { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, X, Check, Flame } from 'lucide-react';

const STORAGE_KEY = 'aura_habits';
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };

const HABIT_ICONS = ['💧', '🏃', '📚', '🧘', '🍎', '💊', '☀️', '🧹', '✍️', '🎵'];
const HABIT_COLORS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#ec4899', '#06b6d4'];

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split('T')[0];
  });
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { habits: [], logs: {} }; }
  catch { return { habits: [], logs: {} }; }
}

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '💧', color: '#4361ee', description: '' });

  useEffect(() => {
    const data = loadData();
    setHabits(data.habits || []);
    setLogs(data.logs || {});
  }, []);

  function persist(h, l) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ habits: h, logs: l }));
  }

  function toggleLog(habitId, date) {
    const key = `${habitId}_${date}`;
    const updated = { ...logs, [key]: !logs[key] };
    setLogs(updated);
    persist(habits, updated);
  }

  function createHabit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const habit = { id: Date.now(), ...form, createdAt: todayKey() };
    const updated = [...habits, habit];
    setHabits(updated);
    persist(updated, logs);
    setForm({ name: '', icon: '💧', color: '#4361ee', description: '' });
    setShowForm(false);
  }

  function deleteHabit(id) {
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);
    persist(updated, logs);
  }

  const last7 = getLast7Days();
  const today = todayKey();

  function getStreak(habit) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = `${habit.id}_${d.toISOString().split('T')[0]}`;
      if (!logs[key]) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function getCompletionRate(habit) {
    const done = last7.filter(d => logs[`${habit.id}_${d}`]).length;
    return Math.round((done / 7) * 100);
  }

  const dayLabels = last7.map(d => {
    const date = new Date(d + 'T12:00:00');
    return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={24} color="#10b981" /> Habitudes
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Nouvelle habitude
        </button>
      </div>

      {/* Stats */}
      {habits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {[
            { label: 'Habitudes actives', val: habits.length, color: '#4361ee' },
            { label: "Complétées aujourd'hui", val: habits.filter(h => logs[`${h.id}_${today}`]).length, color: '#10b981' },
            { label: 'Taux moyen (7j)', val: `${habits.length ? Math.round(habits.reduce((a, h) => a + getCompletionRate(h), 0) / habits.length) : 0}%`, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Habits grid */}
      {habits.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌱</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Aucune habitude</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Créez vos premières habitudes pour les suivre au quotidien</div>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, margin: '16px auto 0' }}>
            <Plus size={15} /> Commencer
          </button>
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div style={{ ...card, padding: '16px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Habitude</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {dayLabels.map((d, i) => (
                  <div key={i} style={{ width: 32, textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: last7[i] === today ? '#4361ee' : '#475569' }}>{d}</div>
                ))}
                <div style={{ width: 60, textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#475569' }}>Streak</div>
              </div>
            </div>

            {habits.map(habit => (
              <div key={habit.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: habit.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {habit.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f1f5f9' }}>{habit.name}</div>
                    {habit.description && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{habit.description}</div>}
                    <div style={{ fontSize: '0.65rem', color: habit.color, fontWeight: 600, marginTop: 2 }}>{getCompletionRate(habit)}% cette semaine</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {last7.map((date, i) => {
                    const done = !!logs[`${habit.id}_${date}`];
                    const isToday = date === today;
                    const isFuture = date > today;
                    return (
                      <button
                        key={date}
                        onClick={() => !isFuture && toggleLog(habit.id, date)}
                        disabled={isFuture}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: done ? habit.color : isToday ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                          cursor: isFuture ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s', opacity: isFuture ? 0.3 : 1,
                          boxShadow: isToday && !done ? `0 0 0 1px ${habit.color}44` : 'none',
                        }}
                      >
                        {done && <Check size={14} color="white" strokeWidth={3} />}
                      </button>
                    );
                  })}
                  <div style={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Flame size={13} color="#f59e0b" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b' }}>{getStreak(habit)}</span>
                  </div>
                  <button onClick={() => deleteHabit(habit.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouvelle habitude</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <form onSubmit={createHabit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Nom *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus
                  placeholder="Ex: Boire 2L d'eau"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Icône</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {HABIT_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                      style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${form.icon === icon ? '#4361ee' : 'transparent'}`, background: form.icon === icon ? 'rgba(67,97,238,0.2)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '1.1rem' }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Couleur</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {HABIT_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${form.color === color ? 'white' : 'transparent'}`, background: color, cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Description (optionnel)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Avant chaque repas"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
