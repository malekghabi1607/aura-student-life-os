import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { categoryAPI } from '../services/api';
import CategoryModal from '../components/CategoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const { data } = await categoryAPI.getAll();
      setCategories(data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (data) => {
    try { await categoryAPI.create(data); toast.success('Catégorie créée ✓'); setModalOpen(false); loadCategories(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleUpdate = async (data) => {
    try { await categoryAPI.update(editingCat.id, data); toast.success('Modifiée ✓'); setModalOpen(false); setEditingCat(null); loadCategories(); }
    catch (err) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDelete = async () => {
    try { await categoryAPI.delete(deletingId); toast.success('Supprimée'); setConfirmOpen(false); setDeletingId(null); loadCategories(); }
    catch (err) { toast.error(err.response?.data?.message || 'Impossible — transactions existantes'); }
  };

  return (
    <div className="animate-in">
      <div className="page-header"><h2>Catégories</h2><p>Organisez vos transactions par catégorie</p></div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => { setEditingCat(null); setModalOpen(true); }}>
          <Plus size={18} /> Nouvelle catégorie
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Tag size={28} /></div>
            <h3>Aucune catégorie</h3>
            <p>Créez des catégories pour organiser vos transactions</p>
            <button className="btn btn-primary mt-4" onClick={() => setModalOpen(true)}><Plus size={18} /> Créer</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {categories.map((cat) => (
            <div key={cat.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cat.color || '#6366f1', borderRadius: '16px 16px 0 0' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cat.color || '#6366f1'}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cat.color || '#6366f1', fontWeight: 700, fontSize: '1.1rem' }}>
                    {cat.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{cat.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{cat.transactionCount} transaction{cat.transactionCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setEditingCat(cat); setModalOpen(true); }}><Pencil size={15} /></button>
                  <button className="btn btn-ghost btn-icon" style={{ color: 'var(--accent-red)' }} onClick={() => { setDeletingId(cat.id); setConfirmOpen(true); }}><Trash2 size={15} /></button>
                </div>
              </div>
              {cat.description && <p style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cat.description}</p>}
            </div>
          ))}
        </div>
      )}

      <CategoryModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingCat(null); }} onSubmit={editingCat ? handleUpdate : handleCreate} category={editingCat} />
      <ConfirmDialog isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleDelete} title="Supprimer la catégorie" message="Impossible si des transactions existent." />
    </div>
  );
}
