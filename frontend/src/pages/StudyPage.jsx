import { useState, useEffect, useRef } from 'react';
import { BookOpen, Play, Pause, RotateCcw, CheckCircle, Clock, TrendingUp, Plus, Trash2, X } from 'lucide-react';
import { useStudent } from '../context/StudentContext';
import { studyAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };
const title = { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 };

const POMODORO = 25 * 60;
const SHORT_BREAK = 5 * 60;

const EMPTY_TASK = { title: '', subject: '', estimatedTime: '' };

export default function StudyPage() {
  const { data } = useStudent();
  const { study } = data;
  const [timer, setTimer] = useState(POMODORO);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('focus');
  const [sessions, setSessions] = useState(0);
  const ref = useRef(null);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [savingTask, setSavingTask] = useState(false);

  useEffect(() => {
    studyAPI.getTasks()
      .then(res => setTasks(res.data))
      .catch(() => toast.error('Erreur chargement des tâches'))
      .finally(() => setLoadingTasks(false));
  }, []);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setTimer(t => {
        if (t <= 1) {
          setRunning(false);
          setSessions(s => s + 1);
          return mode === 'focus' ? SHORT_BREAK : POMODORO;
        }
        return t - 1;
      }), 1000);
    }
    return () => clearInterval(ref.current);
  }, [running, mode]);

  const fmt = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const pct = mode === 'focus' ? ((POMODORO - timer) / POMODORO) * 100 : ((SHORT_BREAK - timer) / SHORT_BREAK) * 100;

  async function handleToggle(task) {
    try {
      const res = await studyAPI.toggleTask(task.id);
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleDeleteTask(id) {
    try {
      await studyAPI.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Tâche supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    try {
      const res = await studyAPI.createTask(taskForm);
      setTasks(prev => [...prev, res.data]);
      setTaskForm(EMPTY_TASK);
      setShowTaskForm(false);
      toast.success('Tâche ajoutée ✓');
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSavingTask(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={24} color="#4361ee" /> Études
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 20 }}>
        {/* Pomodoro */}
        <div style={card}>
          <div style={title}>⏱ Timer Pomodoro</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg width={160} height={160}>
                <circle cx={80} cy={80} r={70} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                <circle cx={80} cy={80} r={70} fill="none"
                  stroke={mode === 'focus' ? '#4361ee' : '#10b981'}
                  strokeWidth={10} strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={2 * Math.PI * 70 * (1 - pct / 100)}
                  strokeLinecap="round" transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{fmt(timer)}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{mode === 'focus' ? 'Focus' : 'Pause'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['focus', 'break'].map(m => (
                <button key={m} onClick={() => { setMode(m); setTimer(m === 'focus' ? POMODORO : SHORT_BREAK); setRunning(false); }} style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: mode === m ? (m === 'focus' ? '#4361ee' : '#10b981') : 'rgba(255,255,255,0.06)',
                  color: mode === m ? 'white' : '#64748b',
                }}>{m === 'focus' ? '🎯 Focus 25m' : '☕ Pause 5m'}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setRunning(r => !r)} style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer', background: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {running ? <Pause size={18} color="white" /> : <Play size={18} color="white" />}
              </button>
              <button onClick={() => { setTimer(mode === 'focus' ? POMODORO : SHORT_BREAK); setRunning(false); }} style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#7c3aed', fontWeight: 600 }}>🍅 {sessions} sessions aujourd'hui</div>
          </div>
        </div>

        {/* Weekly study chart */}
        <div style={card}>
          <div style={title}>📊 Heures d'étude — semaine</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={study.weeklyStudy} barSize={32}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} formatter={v => [`${v}h`, 'Étude']} />
              <Bar dataKey="hours" fill="#4361ee" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 16 }}>
            {[{ label: "Aujourd'hui", val: `${study.todayHours}h`, icon: Clock }, { label: 'Cette semaine', val: `${study.weekHours}h`, icon: TrendingUp }, { label: 'Streak', val: `${study.streak}j 🔥`, icon: CheckCircle }].map(s => (
              <div key={s.label} style={{ textAlign: 'center', background: 'rgba(67,97,238,0.08)', borderRadius: 12, padding: '10px 6px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#4361ee' }}>{s.val}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects progress */}
        <div style={card}>
          <div style={title}>📚 Progression par matière</div>
          {study.subjects.map(s => (
            <div key={s.name} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.color }}>{s.progress}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: `${s.progress}%`, background: s.color, borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 3 }}>{s.hours}h cette semaine</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={title}>✅ Devoirs & tâches</div>
          <button
            onClick={() => setShowTaskForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <Plus size={13} /> Ajouter
          </button>
        </div>

        {loadingTasks ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '0.85rem' }}>Chargement...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📚</div>
            <div>Aucune tâche pour le moment</div>
            <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Cliquez sur "Ajouter" pour créer une tâche</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {tasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: t.done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${t.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 14, transition: 'all 0.2s',
              }}>
                <div
                  onClick={() => handleToggle(t)}
                  style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${t.done ? '#10b981' : 'rgba(255,255,255,0.2)'}`, background: t.done ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  {t.done && <CheckCircle size={13} color="white" />}
                </div>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleToggle(t)}>
                  <div style={{ fontSize: '0.85rem', color: t.done ? '#64748b' : '#f1f5f9', fontWeight: 500, textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                    {t.subject && <>{t.subject}</>}
                    {t.subject && t.estimatedTime && ' • '}
                    {t.estimatedTime && <>≈ {t.estimatedTime}</>}
                  </div>
                </div>
                <button onClick={() => handleDeleteTask(t.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: 5, cursor: 'pointer', color: '#ef4444', display: 'flex', flexShrink: 0 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task creation modal */}
      {showTaskForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouvelle tâche</div>
              <button onClick={() => { setShowTaskForm(false); setTaskForm(EMPTY_TASK); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Titre *</label>
                <input
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  required autoFocus
                  placeholder="Ex: Révision chapitre 5 — Intégrales"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Matière</label>
                  <input
                    value={taskForm.subject}
                    onChange={e => setTaskForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Ex: Maths"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Durée estimée</label>
                  <input
                    value={taskForm.estimatedTime}
                    onChange={e => setTaskForm(f => ({ ...f, estimatedTime: e.target.value }))}
                    placeholder="Ex: 1h30"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowTaskForm(false); setTaskForm(EMPTY_TASK); }}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button type="submit" disabled={savingTask}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  {savingTask ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
