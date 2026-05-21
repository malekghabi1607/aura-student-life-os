import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Brain, Zap, Target, Calendar, Flame, Moon,
  Droplets, TrendingUp, BookOpen, Dumbbell, Star, Award
} from 'lucide-react';
import { useStudent } from '../context/StudentContext';

const S = {
  page: { display: 'flex', flexDirection: 'column', gap: 24, padding: '0 0 32px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  greeting: { fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' },
  sub: { fontSize: '0.85rem', color: '#64748b', marginTop: 2 },
  row: { display: 'grid', gap: 20 },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    backdropFilter: 'blur(12px)',
  },
  cardTitle: { fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 },
  label: { fontSize: '0.72rem', color: '#64748b' },
  val: { fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9' },
  valSm: { fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: color + '22', color, borderRadius: 999,
    padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600,
  }),
  pill: (active, color) => ({
    width: 8, height: 8, borderRadius: '50%',
    background: active ? color : 'rgba(255,255,255,0.1)',
  }),
};

function LifeScoreRing({ score, color, size = 120, stroke = 10 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="#f1f5f9" fontSize={size * 0.22} fontWeight="800">{score}</text>
      <text x="50%" y="65%" textAnchor="middle" dominantBaseline="central"
        fill="#64748b" fontSize={size * 0.1}>/ 100</text>
    </svg>
  );
}

function StatBar({ label, value, color, icon: Icon }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={13} color={color} />
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{label}</span>
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function QuickStat({ icon: Icon, label, value, unit, color, sub }) {
  return (
    <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={color} />
        </div>
        {sub && <span style={S.badge('#10b981')}>{sub}</span>}
      </div>
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>{value}<span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 3 }}>{unit}</span></div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function MoodPicker({ value, onChange, max = 5, colors }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} onClick={() => onChange(n)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: n <= value ? colors[Math.floor((n - 1) / max * colors.length)] + 'cc' : 'rgba(255,255,255,0.06)',
          border: n === Math.round(value) ? `2px solid ${colors[Math.floor((n - 1) / max * colors.length)]}` : '2px solid transparent',
          cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          {['😴', '😐', '🙂', '😊', '🔥'][n - 1]}
        </button>
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const { data, updateMood, updateEnergy } = useStudent();
  const { lifeScore, study, fitness, goals, mood, events, profile } = data;

  const radarData = [
    { subject: 'Études', value: lifeScore.learning },
    { subject: 'Santé', value: lifeScore.health },
    { subject: 'Discipline', value: lifeScore.discipline },
    { subject: 'Social', value: lifeScore.social },
    { subject: 'Finance', value: lifeScore.finance },
  ];

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.greeting}>Bonjour, {profile.name} 👋</div>
          <div style={S.sub}>{today.charAt(0).toUpperCase() + today.slice(1)} • Niveau {profile.level} — {profile.xp.toLocaleString()} XP</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...S.badge('#f59e0b'), fontSize: '0.8rem', padding: '6px 14px' }}>
            <Flame size={13} /> Streak {study.streak}j
          </div>
          <div style={{ ...S.badge('#7c3aed'), fontSize: '0.8rem', padding: '6px 14px' }}>
            <Star size={13} /> Life Score {lifeScore.overall}
          </div>
        </div>
      </div>

      {/* XP Bar */}
      <div style={{ ...S.card, padding: '14px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Progression niveau {profile.level}</span>
          <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700 }}>{profile.xp.toLocaleString()} / {profile.xpNext.toLocaleString()} XP</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(profile.xp / profile.xpNext) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #4361ee)', borderRadius: 999 }} />
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ ...S.row, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <QuickStat icon={BookOpen} label="Étude aujourd'hui" value={study.todayHours} unit="h" color="#4361ee" sub={`+${study.weekHours}h/sem`} />
        <QuickStat icon={Dumbbell} label="Calories brûlées" value={fitness.calories} unit="kcal" color="#10b981" sub={`${fitness.weekSessions} séances`} />
        <QuickStat icon={Moon} label="Sommeil" value={fitness.sleep} unit="h" color="#7c3aed" />
        <QuickStat icon={Target} label="Objectifs actifs" value={goals.length} unit="" color="#f59e0b" sub="ce mois" />
      </div>

      {/* Life Score + Radar + Weekly Study */}
      <div style={{ ...S.row, gridTemplateColumns: '1fr 1fr 1.4fr' }}>
        {/* Life Score */}
        <div style={S.card}>
          <div style={S.cardTitle}>⚡ Life Score</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <LifeScoreRing score={lifeScore.overall} color="#4361ee" size={130} />
            <div style={{ width: '100%' }}>
              <StatBar label="Études" value={lifeScore.learning} color="#4361ee" icon={BookOpen} />
              <StatBar label="Santé" value={lifeScore.health} color="#10b981" icon={Dumbbell} />
              <StatBar label="Discipline" value={lifeScore.discipline} color="#7c3aed" icon={Award} />
              <StatBar label="Finance" value={lifeScore.finance} color="#f59e0b" icon={TrendingUp} />
            </div>
          </div>
        </div>

        {/* Radar */}
        <div style={S.card}>
          <div style={S.cardTitle}>📡 Profil de compétences</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Score" dataKey="value" stroke="#4361ee" fill="#4361ee" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Study Chart */}
        <div style={S.card}>
          <div style={S.cardTitle}>📚 Heures d'étude — semaine</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={study.weeklyStudy} barSize={28}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v) => [`${v}h`, 'Étude']}
              />
              <Bar dataKey="hours" fill="#4361ee" radius={[8, 8, 0, 0]}
                label={{ position: 'top', fill: '#64748b', fontSize: 10, formatter: v => v ? `${v}h` : '' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mood + Events + Goals */}
      <div style={{ ...S.row, gridTemplateColumns: '1fr 1.5fr 1.5fr' }}>
        {/* Mood */}
        <div style={S.card}>
          <div style={S.cardTitle}>🌡️ Mood & Énergie</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>Humeur du jour</div>
              <MoodPicker value={mood.today} onChange={updateMood} colors={['#ef4444', '#f59e0b', '#eab308', '#10b981', '#4361ee']} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 10 }}>Niveau d'énergie</div>
              <MoodPicker value={Math.round(mood.energy)} onChange={updateEnergy} colors={['#ef4444', '#f59e0b', '#eab308', '#10b981', '#7c3aed']} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(67,97,238,0.1)', borderRadius: 12, padding: '10px 0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Hydratation</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4361ee' }}>{fitness.water}L</div>
                <Droplets size={14} color="#4361ee" />
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: '10px 0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Poids</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{fitness.weight}kg</div>
                <Zap size={14} color="#10b981" />
              </div>
            </div>
          </div>
        </div>

        {/* Events */}
        <div style={S.card}>
          <div style={S.cardTitle}>📅 Prochains événements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, borderLeft: `3px solid ${ev.color}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{ev.date} à {ev.time}</div>
                </div>
                <span style={{ ...S.badge(ev.color), fontSize: '0.65rem' }}>{ev.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div style={S.card}>
          <div style={S.cardTitle}>🎯 Objectifs du mois</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {goals.slice(0, 4).map(g => (
              <div key={g.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: 500 }}>{g.title}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: g.color }}>
                    {g.unit === '%' ? `${g.progress}%` : `${g.progress}/${g.target} ${g.unit}`}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${g.unit === '%' ? g.progress : (g.progress / g.target) * 100}%`,
                    background: g.color, borderRadius: 999,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sport Activity */}
      <div style={{ ...S.row, gridTemplateColumns: '2fr 1fr' }}>
        <div style={S.card}>
          <div style={S.cardTitle}>🏋️ Activité sportive — semaine</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={fitness.weeklyActivity} barSize={24}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v) => [`${v} kcal`, 'Calories']}
              />
              <Bar dataKey="calories" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>📖 Matières en cours</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {study.subjects.map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{s.name}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.color }}>{s.progress}%</span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ height: '100%', width: `${s.progress}%`, background: s.color, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
