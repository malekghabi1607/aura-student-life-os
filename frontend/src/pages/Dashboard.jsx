import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, CalendarDays,
  ArrowUpRight, ArrowDownRight, ArrowUpDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { statsAPI, transactionAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';

const PIE_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4',
  '#f97316', '#84cc16', '#14b8a6', '#a855f7',
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { format } = useCurrency();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [statsRes, txRes] = await Promise.all([
        statsAPI.getDashboard(),
        transactionAPI.getAll(),
      ]);
      setStats(statsRes.data);
      setRecentTx(txRes.data.slice(0, 5));
    } catch (err) {
      toast.error('Erreur lors du chargement des statistiques');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Tableau de bord</h2>
          <p>Vue d'ensemble de vos finances</p>
        </div>
        <div className="stats-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
        <div className="charts-grid">
          <div className="skeleton" style={{ height: 360, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 360, borderRadius: 16 }} />
        </div>
        <div className="skeleton" style={{ height: 280, borderRadius: 16, marginTop: 24 }} />
      </div>
    );
  }

  const monthlyData = stats?.monthlyTrends?.map(t => ({
    month: t.month,
    Revenus: parseFloat(t.income) || 0,
    Dépenses: parseFloat(t.expense) || 0,
  })) || [];

  const expensePieData = stats?.expensesByCategory?.map(c => ({
    name: c.category,
    value: parseFloat(c.amount) || 0,
  })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <p style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.85rem' }}>{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color, fontSize: '0.82rem', margin: '2px 0' }}>
            {entry.name}: {format(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Tableau de bord</h2>
        <p>Vue d'ensemble de vos finances personnelles</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="stats-grid">
        <div className="stat-card income">
          <div className="stat-card-icon">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-label">Revenus totaux</div>
          <div className="stat-card-value">{format(stats?.totalIncome)}</div>
          <div className="stat-card-sub">
            <ArrowUpRight size={14} style={{ verticalAlign: -2 }} /> Ce mois: {format(stats?.monthIncome)}
          </div>
        </div>

        <div className="stat-card expense">
          <div className="stat-card-icon">
            <TrendingDown size={22} />
          </div>
          <div className="stat-card-label">Dépenses totales</div>
          <div className="stat-card-value">{format(stats?.totalExpense)}</div>
          <div className="stat-card-sub">
            <ArrowDownRight size={14} style={{ verticalAlign: -2 }} /> Ce mois: {format(stats?.monthExpense)}
          </div>
        </div>

        <div className="stat-card balance">
          <div className="stat-card-icon">
            <Wallet size={22} />
          </div>
          <div className="stat-card-label">Solde total</div>
          <div className="stat-card-value">{format(stats?.balance)}</div>
        </div>

        <div className="stat-card month">
          <div className="stat-card-icon">
            <CalendarDays size={22} />
          </div>
          <div className="stat-card-label">Solde du mois</div>
          <div className="stat-card-value">{format(stats?.monthBalance)}</div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="charts-grid">
        {/* Bar chart — Monthly trend */}
        <div className="chart-card">
          <h3 className="card-title">📊 Tendance mensuelle</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Revenus" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Dépenses" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-muted">Aucune donnée pour le moment</p>
            </div>
          )}
        </div>

        {/* Pie chart — Expenses by category */}
        <div className="chart-card">
          <h3 className="card-title">🥧 Dépenses par catégorie</h3>
          {expensePieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {expensePieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => format(value)}
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p className="text-muted">Ajoutez des dépenses pour voir le graphique</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="chart-card" style={{ marginTop: 0 }}>
        <div className="card-header">
          <h3 className="card-title">🕒 Transactions récentes</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/transactions')}
            style={{ fontSize: '0.78rem', color: 'var(--primary-400)' }}
          >
            Voir tout →
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 20px' }}>
            <div className="empty-state-icon"><ArrowUpDown size={24} /></div>
            <p className="text-muted">Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 4px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {/* Type indicator */}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: tx.type === 'INCOME' ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                  color: tx.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                }}>
                  {tx.type === 'INCOME' ? '↑' : '↓'}
                </div>

                {/* Description & category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.description}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {tx.categoryName || 'Sans catégorie'} · {formatDate(tx.date)}
                  </div>
                </div>

                {/* Amount */}
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  color: tx.type === 'INCOME' ? 'var(--accent-green)' : 'var(--accent-red)',
                  whiteSpace: 'nowrap',
                }}>
                  {tx.type === 'INCOME' ? '+' : '-'}{format(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
