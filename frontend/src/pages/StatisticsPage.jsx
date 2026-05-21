import { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { statsAPI } from '../services/api';
import { downloadBlob } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16'];

export default function StatisticsPage() {
  const { format } = useCurrency();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    statsAPI.getDashboard().then(r => setStats(r.data)).catch(() => toast.error('Erreur')).finally(() => setLoading(false));
  }, []);

  const exportExcel = async () => {
    try { const { data } = await statsAPI.exportExcel(); downloadBlob(data, `transactions.xlsx`); toast.success('Excel ✓'); }
    catch { toast.error('Erreur export'); }
  };

  const exportPdf = async () => {
    try { const { data } = await statsAPI.exportPdf(); downloadBlob(data, `transactions.pdf`); toast.success('PDF ✓'); }
    catch { toast.error('Erreur export'); }
  };

  if (loading) return (
    <div className="animate-in">
      <div className="page-header"><h2>Statistiques</h2></div>
      <div className="charts-grid">
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    </div>
  );

  const areaData = stats?.monthlyTrends?.map(t => ({ month: t.month, Revenus: parseFloat(t.income)||0, Dépenses: parseFloat(t.expense)||0, Solde: (parseFloat(t.income)||0) - (parseFloat(t.expense)||0) })) || [];
  const expPie = stats?.expensesByCategory?.map(c => ({ name: c.category, value: parseFloat(c.amount)||0 })) || [];
  const incPie = stats?.incomeByCategory?.map(c => ({ name: c.category, value: parseFloat(c.amount)||0 })) || [];

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '12px 16px', boxShadow: 'var(--shadow-lg)' }}>
        <p style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.85rem' }}>{label}</p>
        {payload.map((e, i) => <p key={i} style={{ color: e.color, fontSize: '0.82rem' }}>{e.name}: {format(e.value)}</p>)}
      </div>
    );
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Statistiques</h2>
        <p>Analyse détaillée de votre budget</p>
      </div>

      {/* Export buttons */}
      <div className="toolbar">
        <BarChart3 size={18} style={{ color: 'var(--primary-400)' }} />
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Rapports</span>
        <div className="toolbar-spacer" />
        <button className="btn btn-secondary btn-sm" onClick={exportExcel}><FileSpreadsheet size={16} /> Export Excel</button>
        <button className="btn btn-secondary btn-sm" onClick={exportPdf}><FileText size={16} /> Export PDF</button>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL REVENUS</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-green)' }}>{format(stats?.totalIncome)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>TOTAL DÉPENSES</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-red)' }}>{format(stats?.totalExpense)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>SOLDE</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary-400)' }}>{format(stats?.balance)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Area chart */}
        <div className="chart-card">
          <h3 className="card-title">📈 Évolution mensuelle</h3>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Revenus" stroke="#10b981" fill="url(#gIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" fill="url(#gExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: 40 }}><p className="text-muted">Pas de données</p></div>}
        </div>

        {/* Expense pie */}
        <div className="chart-card">
          <h3 className="card-title">🥧 Dépenses par catégorie</h3>
          {expPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expPie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                  {expPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => format(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: 40 }}><p className="text-muted">Pas de données</p></div>}
        </div>
      </div>

      {/* Income pie full width */}
      {incPie.length > 0 && (
        <div className="chart-card" style={{ marginTop: 24 }}>
          <h3 className="card-title">💰 Revenus par catégorie</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={incPie} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                {incPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => format(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
