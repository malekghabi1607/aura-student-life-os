import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CATEGORY_COLORS } from '../utils/helpers';

export default function CategoryModal({ isOpen, onClose, onSubmit, category }) {
  const [form, setForm] = useState({
    name: '',
    color: CATEGORY_COLORS[0],
    icon: '',
    description: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        color: category.color || CATEGORY_COLORS[0],
        icon: category.icon || '',
        description: category.description || '',
      });
    } else {
      setForm({
        name: '',
        color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
        icon: '',
        description: '',
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Nom de catégorie requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="modal-title" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
            {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="cat-name">Nom</label>
            <input
              id="cat-name"
              className="form-input"
              placeholder="Ex: Alimentation, Transport..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="form-label">Couleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: color,
                    border: form.color === color ? '3px solid white' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 150ms ease',
                    transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: form.color === color ? `0 0 12px ${color}66` : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="cat-desc">Description (optionnel)</label>
            <textarea
              id="cat-desc"
              className="form-textarea"
              rows="2"
              placeholder="Décrivez cette catégorie..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              {category ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
