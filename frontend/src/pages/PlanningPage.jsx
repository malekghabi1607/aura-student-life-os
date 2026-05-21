import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { planningAPI } from '../services/api';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };
const typeColor = { exam: '#ef4444', fitness: '#10b981', deadline: '#f59e0b', study: '#4361ee', meeting: '#7c3aed', other: '#64748b' };
const typeLabel = { exam: 'Examen', fitness: 'Sport', deadline: 'Deadline', study: 'Révision', meeting: 'Réunion', other: 'Autre' };

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const todayStr = new Date().toISOString().split('T')[0];

const EMPTY_FORM = { title: '', type: 'study', date: todayStr, time: '09:00', location: '', duration: '1h', description: '' };

export default function PlanningPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(todayStr);

  useEffect(() => {
    planningAPI.getAll()
      .then(res => setEvents(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const cells = Array.from({ length: startOffset }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  function dateStr(d) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const selectedEvents = events.filter(e => e.date === selected);
  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setSaving(true);
    try {
      const res = await planningAPI.create(form);
      setEvents(prev => [...prev, res.data]);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSelected(form.date);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await planningAPI.delete(id);
      setEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={24} color="#7c3aed" /> Planning
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Ajouter
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Calendar */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{MONTHS[month]} {year}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCurrent(new Date(year, month - 1, 1))} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={14} color="#94a3b8" />
              </button>
              <button onClick={() => setCurrent(new Date(year, month + 1, 1))} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={14} color="#94a3b8" />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
            {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', color: '#475569', fontWeight: 700, padding: '4px 0' }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const ds = dateStr(d);
              const isToday = ds === todayStr;
              const isSel = ds === selected;
              const hasEvent = events.some(e => e.date === ds);
              return (
                <button key={ds} onClick={() => setSelected(ds)} style={{
                  aspectRatio: '1', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: '0.8rem', fontWeight: isSel || isToday ? 700 : 400,
                  background: isSel ? '#4361ee' : isToday ? 'rgba(67,97,238,0.2)' : 'transparent',
                  color: isSel ? 'white' : isToday ? '#4361ee' : '#94a3b8',
                  position: 'relative',
                }}>
                  {d}
                  {hasEvent && <div style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.8)' : '#4361ee' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div style={card}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            {new Date(selected + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: '0.85rem' }}>Chargement...</div>
          ) : selectedEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✨</div>
              Aucun événement ce jour
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedEvents.map(ev => (
                <div key={ev.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, borderLeft: `3px solid ${typeColor[ev.type] || '#64748b'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f1f5f9' }}>{ev.title}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', background: (typeColor[ev.type] || '#64748b') + '22', color: typeColor[ev.type] || '#64748b', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>{typeLabel[ev.type] || ev.type}</span>
                      <button onClick={() => handleDelete(ev.id)} style={{ background: 'rgba(239,68,68,0.12)', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: '#ef4444', display: 'flex' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: '#64748b' }}>
                    {ev.time && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{ev.time}{ev.duration ? ` (${ev.duration})` : ''}</span>}
                    {ev.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{ev.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div style={card}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Prochains événements</div>
        {upcomingEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#475569', fontSize: '0.85rem' }}>Aucun événement à venir</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
            {upcomingEvents.map(ev => (
              <div key={ev.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, borderTop: `2px solid ${typeColor[ev.type] || '#64748b'}` }}>
                <div style={{ fontSize: '0.7rem', color: typeColor[ev.type] || '#64748b', fontWeight: 700, marginBottom: 4 }}>{typeLabel[ev.type] || ev.type}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>{ev.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{ev.time ? ` à ${ev.time}` : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouvel événement</div>
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
                  placeholder="Ex: Examen de mathématiques"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    style={{ width: '100%', background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }}>
                    {Object.entries(typeLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Heure</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Durée</label>
                  <input
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="Ex: 2h"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Lieu</label>
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ex: Salle A101"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
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
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
