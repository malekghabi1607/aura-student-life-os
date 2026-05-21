import { X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3 className="modal-title">{title || 'Confirmer'}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
          {message || 'Êtes-vous sûr de vouloir continuer ?'}
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
