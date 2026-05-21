import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export default function TransactionModal({ isOpen, onClose, onSubmit, transaction, categories }) {
  const { currency } = useCurrency();
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    date: new Date().toISOString().substring(0, 10),
    notes: '',
    categoryId: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description || '',
        amount: transaction.amount || '',
        type: transaction.type || 'EXPENSE',
        date: transaction.date?.substring(0, 10) || new Date().toISOString().substring(0, 10),
        notes: transaction.notes || '',
        categoryId: transaction.categoryId || '',
      });
    } else {
      setForm({
        description: '',
        amount: '',
        type: 'EXPENSE',
        date: new Date().toISOString().substring(0, 10),
        notes: '',
        categoryId: '',
      });
    }
    setErrors({});
  }, [transaction, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.description.trim()) e.description = 'Description requise';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'Montant invalide';
    if (!form.date) e.date = 'Date requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      categoryId: form.categoryId ? parseInt(form.categoryId) : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="modal-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
            {transaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type toggle */}
          <div className="form-group">
            <label className="form-label">Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={`btn ${form.type === 'EXPENSE' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setForm({ ...form, type: 'EXPENSE' })}
              >
                Dépense
              </button>
              <button
                type="button"
                className={`btn ${form.type === 'INCOME' ? 'btn-success' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setForm({ ...form, type: 'INCOME' })}
              >
                Revenu
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-desc">Description</label>
            <input
              id="tx-desc"
              className="form-input"
              placeholder="Ex: Courses supermarché"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
          </div>

          {/* Amount + Date */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="tx-amount">Montant ({currency.symbol})</label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="tx-date">Date</label>
              <input
                id="tx-date"
                type="date"
                className="form-input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-category">Catégorie</label>
            <select
              id="tx-category"
              className="form-select"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">— Sans catégorie —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="tx-notes">Notes (optionnel)</label>
            <textarea
              id="tx-notes"
              className="form-textarea"
              rows="2"
              placeholder="Ajouter des détails..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {transaction ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
