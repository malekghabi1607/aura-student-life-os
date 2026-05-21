import { useState, useEffect } from 'react';
import { Target, Plus, Flame, Trophy, Calendar, Trash2, X } from 'lucide-react';
import { goalsAPI } from '../services/api';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };
const catIcons = { study: '📚', fitness: '🏋️', finance: '💰', culture: '📖', skills: '🎯' };
const catLabels = { study: 'Études', fitness: 'Sport', finance: 'Finance', culture: 'Culture', skills: 'Compétences' };

const EMPTY_FORM = { title: '', description: '', category: 'study', target: 100, unit: '%', color: '#a855f7', deadline: '' };

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    goalsAPI.getAll()
      .then(res => setGoals(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cats = ['all', ...new Set(goals.map(g => g.category))];
  const filtered = filter === 'all' ? goals : goals.filter(g => g.category === filter);

  const done = goals.filter(g => {
    const pct = g.unit === '%' ? g.progress : Math.round((g.progress / g.target) * 100);
    return pct >= 100;
  }).length;
  const avgProgress = goals.length === 0 ? 0 : Math.round(
    goals.reduce((a, g) => a + (g.unit === '%' ? g.progress : Math.round((g.progress / g.target) * 100)), 0) / goals.length
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.category) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        target: Number(form.target),
        deadline: form.deadline || null,
      };
      const res = await goalsAPI.create(payload);
      setGoals(prev => [...prev, res.data]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await goalsAPI.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleProgressChange(goal, newProgress) {
    try {
      const res = await goalsAPI.updateProgress(goal.id, newProgress);
      setGoals(prev => prev.map(g => g.id === goal.id ? res.data : g));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
        Chargement des objectifs...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Target size={24} color="#f59e0b" /> Objectifs
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Nouvel objectif
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Objectifs actifs', val: goals.length, icon: Target, color: '#4361ee' },
          { label: 'Complétés', val: done, icon: Trophy, color: '#10b981' },
          { label: 'Progression moy.', val: `${avgProgress}%`, icon: Flame, color: '#f59e0b' },
          { label: 'Ce mois', val: goals.filter(g => {
            if (!g.createdAt) return false;
            const d = new Date(g.createdAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length, icon: Calendar, color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 18 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9' }}>{s.val}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
            background: filter === c ? '#4361ee' : 'rgba(255,255,255,0.06)',
            color: filter === c ? 'white' : '#64748b',
          }}>{c === 'all' ? 'Tous' : `${catIcons[c] || ''} ${catLabels[c] || c}`}</button>
        ))}
      </div>

      {/* Goals grid */}
      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🎯</div>
          <div>Aucun objectif pour l'instant</div>
          <div style={{ fontSize: '0.8rem', marginTop: 6 }}>Cliquez sur "Nouvel objectif" pour commencer</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
          {filtered.map(g => {
            const pct = g.unit === '%' ? g.progress : Math.round((g.progress / g.target) * 100);
            return (
              <div key={g.id} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: 3, width: `${Math.min(pct, 100)}%`, background: g.color || '#a855f7', transition: 'width 0.8s ease' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1.1rem', marginBottom: 4 }}>{catIcons[g.category] || '🎯'}</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>{g.title}</div>
                    {g.deadline && (
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        Deadline : {new Date(g.deadline + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: g.color || '#a855f7' }}>{pct}%</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {g.unit !== '%' ? `${g.progress} / ${g.target} ${g.unit}` : 'complété'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(g.id)}
                      style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${g.color || '#a855f7'}88, ${g.color || '#a855f7'})`, borderRadius: 999, transition: 'width 0.8s ease' }} />
                </div>
                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={g.unit === '%' ? 100 : g.target}
                  value={g.progress}
                  onChange={e => handleProgressChange(g, Number(e.target.value))}
                  style={{ width: '100%', accentColor: g.color || '#a855f7', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>{catLabels[g.category] || g.category}</span>
                  {pct >= 100 && <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>Complété !</span>}
                  {pct >= 75 && pct < 100 && <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>Presque !</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouvel objectif</div>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Titre *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Ex: Apprendre React"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Catégorie</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width: '100%', background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }}>
                    {Object.entries(catLabels).map(([k, v]) => <option key={k} value={k}>{catIcons[k]} {v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Couleur</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: '100%', height: 42, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Cible</label>
                  <input
                    type="number"
                    value={form.target}
                    onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                    min={1}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Unité</label>
                  <input
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="%"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Deadline (optionnel)</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
