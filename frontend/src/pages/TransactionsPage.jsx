import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Pencil, Trash2, ArrowUpDown,
  Filter, FileSpreadsheet, FileText, X
} from 'lucide-react';
import { transactionAPI, categoryAPI, statsAPI } from '../services/api';
import { formatDate, downloadBlob } from '../utils/helpers';
import { useCurrency } from '../context/CurrencyContext';
import TransactionModal from '../components/TransactionModal';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Delete confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [filterType, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType) params.type = filterType;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const [txRes, catRes] = await Promise.all([
        transactionAPI.getAll(params),
        categoryAPI.getAll(),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const visibleTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.description?.toLowerCase().includes(q) ||
        tx.categoryName?.toLowerCase().includes(q) ||
        tx.notes?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  const clearFilters = () => {
    setFilterType('');
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  const hasActiveFilters = filterType || startDate || endDate || search;

  const handleCreate = async (data) => {
    try {
      await transactionAPI.create(data);
      toast.success('Transaction ajoutée ✓');
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await transactionAPI.update(editingTx.id, data);
      toast.success('Transaction modifiée ✓');
      setModalOpen(false);
      setEditingTx(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
    }
  };

  const handleDelete = async () => {
    try {
      await transactionAPI.delete(deletingId);
      toast.success('Transaction supprimée');
      setConfirmOpen(false);
      setDeletingId(null);
      loadData();
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExportExcel = async () => {
    try {
      const { data } = await statsAPI.exportExcel();
      downloadBlob(data, `transactions-${new Date().toISOString().substring(0,10)}.xlsx`);
      toast.success('Export Excel téléchargé ✓');
    } catch {
      toast.error("Erreur d'export Excel");
    }
  };

  const handleExportPdf = async () => {
    try {
      const { data } = await statsAPI.exportPdf();
      downloadBlob(data, `transactions-${new Date().toISOString().substring(0,10)}.pdf`);
      toast.success('Export PDF téléchargé ✓');
    } catch {
      toast.error("Erreur d'export PDF");
    }
  };

  const openEdit = (tx) => {
    setEditingTx(tx);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingTx(null);
    setModalOpen(true);
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Transactions</h2>
        <p>Gérez vos revenus et dépenses</p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <button className="btn btn-primary" onClick={openCreate} id="btn-add-transaction">
          <Plus size={18} /> Nouvelle transaction
        </button>

        <div className="toolbar-spacer" />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, width: 200 }}
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-select"
            style={{ width: 150, padding: '8px 32px 8px 12px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            id="filter-type"
          >
            <option value="">Tout afficher</option>
            <option value="INCOME">Revenus</option>
            <option value="EXPENSE">Dépenses</option>
          </select>
        </div>

        {/* Date range */}
        <input
          type="date"
          className="form-input"
          style={{ width: 148 }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Date de début"
        />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
        <input
          type="date"
          className="form-input"
          style={{ width: 148 }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="Date de fin"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters} title="Effacer les filtres">
            <X size={15} /> Effacer
          </button>
        )}

        {/* Export */}
        <div className="export-group">
          <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} title="Export Excel">
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportPdf} title="Export PDF">
            <FileText size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="skeleton" style={{ height: 52, marginBottom: 4, borderRadius: 8 }} />
          ))}
        </div>
      ) : visibleTransactions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <ArrowUpDown size={28} />
            </div>
            {transactions.length === 0 ? (
              <>
                <h3>Aucune transaction</h3>
                <p>Commencez par ajouter vos revenus et dépenses pour suivre votre budget.</p>
                <button className="btn btn-primary mt-4" onClick={openCreate}>
                  <Plus size={18} /> Ajouter une transaction
                </button>
              </>
            ) : (
              <>
                <h3>Aucun résultat</h3>
                <p>Aucune transaction ne correspond à vos filtres.</p>
                <button className="btn btn-secondary mt-4" onClick={clearFilters}>
                  <X size={15} /> Effacer les filtres
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Montant</th>
                <th style={{ textAlign: 'center', width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {formatDate(tx.date)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {tx.description}
                    </div>
                    {tx.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {tx.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    {tx.categoryName ? (
                      <span className="category-tag">
                        <span
                          className="category-dot"
                          style={{ backgroundColor: tx.categoryColor || '#6366f1' }}
                        />
                        {tx.categoryName}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                      {tx.type === 'INCOME' ? '↑ Revenu' : '↓ Dépense'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                    <span className={tx.type === 'INCOME' ? 'text-green' : 'text-red'}>
                      {tx.type === 'INCOME' ? '+' : '-'}{format(tx.amount)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => openEdit(tx)}
                        title="Modifier"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={() => { setDeletingId(tx.id); setConfirmOpen(true); }}
                        title="Supprimer"
                        style={{ color: 'var(--accent-red)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTx(null); }}
        onSubmit={editingTx ? handleUpdate : handleCreate}
        transaction={editingTx}
        categories={categories}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer la transaction"
        message="Cette action est irréversible. Voulez-vous vraiment supprimer cette transaction ?"
      />
    </div>
  );
}
