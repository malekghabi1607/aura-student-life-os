import { useState, useEffect } from 'react';
import { Library, Plus, Trash2, X, Star, BookOpen, Check } from 'lucide-react';

const STORAGE_KEY = 'aura_readings';
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };

const STATUSES = [
  { key: 'reading', label: 'En cours', color: '#4361ee', emoji: '📖' },
  { key: 'to_read', label: 'À lire', color: '#64748b', emoji: '📚' },
  { key: 'done', label: 'Terminé', color: '#10b981', emoji: '✅' },
  { key: 'paused', label: 'En pause', color: '#f59e0b', emoji: '⏸️' },
];

const GENRES = ['Roman', 'Développement personnel', 'Science-fiction', 'Biographie', 'Philosophie', 'Informatique', 'Histoire', 'Autre'];

const EMPTY_FORM = { title: '', author: '', genre: 'Roman', status: 'to_read', totalPages: '', currentPage: '', rating: 0, notes: '', cover: '' };

function loadBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: n <= value ? '#f59e0b' : 'rgba(255,255,255,0.15)', fontSize: '1.1rem' }}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReadingsPage() {
  const [books, setBooks] = useState(loadBooks);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  function persist(updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function openCreate() {
    setEditBook(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(book) {
    setEditBook(book);
    setForm({ ...book, totalPages: book.totalPages || '', currentPage: book.currentPage || '' });
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      ...form,
      totalPages: form.totalPages ? Number(form.totalPages) : null,
      currentPage: form.currentPage ? Number(form.currentPage) : null,
      updatedAt: new Date().toISOString(),
    };
    let updated;
    if (editBook) {
      updated = books.map(b => b.id === editBook.id ? { ...b, ...payload } : b);
    } else {
      updated = [...books, { ...payload, id: Date.now(), addedAt: new Date().toISOString() }];
    }
    setBooks(updated);
    persist(updated);
    setShowForm(false);
  }

  function deleteBook(id) {
    const updated = books.filter(b => b.id !== id);
    setBooks(updated);
    persist(updated);
  }

  function updateProgress(book, currentPage) {
    const updated = books.map(b =>
      b.id === book.id
        ? { ...b, currentPage: Number(currentPage), status: Number(currentPage) >= b.totalPages ? 'done' : b.status, updatedAt: new Date().toISOString() }
        : b
    );
    setBooks(updated);
    persist(updated);
  }

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter);

  const stats = {
    total: books.length,
    done: books.filter(b => b.status === 'done').length,
    reading: books.filter(b => b.status === 'reading').length,
    pages: books.reduce((a, b) => a + (b.currentPage || 0), 0),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Library size={24} color="#a855f7" /> Lectures
        </div>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Ajouter un livre
        </button>
      </div>

      {/* Stats */}
      {books.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            { label: 'Total livres', val: stats.total, color: '#4361ee' },
            { label: 'Terminés', val: stats.done, color: '#10b981' },
            { label: 'En cours', val: stats.reading, color: '#f59e0b' },
            { label: 'Pages lues', val: stats.pages.toLocaleString(), color: '#a855f7' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: 18 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setFilter('all')} style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: filter === 'all' ? '#4361ee' : 'rgba(255,255,255,0.06)', color: filter === 'all' ? 'white' : '#64748b' }}>
          Tous ({books.length})
        </button>
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)} style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: filter === s.key ? s.color : 'rgba(255,255,255,0.06)', color: filter === s.key ? 'white' : '#64748b' }}>
            {s.emoji} {s.label} ({books.filter(b => b.status === s.key).length})
          </button>
        ))}
      </div>

      {/* Books grid */}
      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>
            {books.length === 0 ? 'Votre bibliothèque est vide' : 'Aucun livre dans cette catégorie'}
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>
            {books.length === 0 ? 'Ajoutez vos premières lectures !' : ''}
          </div>
          {books.length === 0 && (
            <button onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, margin: '16px auto 0' }}>
              <Plus size={15} /> Ajouter un livre
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(book => {
            const status = STATUSES.find(s => s.key === book.status) || STATUSES[1];
            const pct = book.totalPages && book.currentPage ? Math.round((book.currentPage / book.totalPages) * 100) : null;
            return (
              <div key={book.id} style={{ ...card, position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => openEdit(book)}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: status.color }} />
                <div style={{ display: 'flex', gap: 14 }}>
                  {/* Cover placeholder */}
                  <div style={{ width: 56, height: 80, borderRadius: 8, background: `linear-gradient(135deg, ${status.color}44, ${status.color}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.8rem' }}>
                    {status.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</div>
                    {book.author && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 6 }}>{book.author}</div>}
                    <div style={{ fontSize: '0.65rem', background: status.color + '22', color: status.color, borderRadius: 999, padding: '2px 8px', display: 'inline-block', fontWeight: 700, marginBottom: 8 }}>
                      {status.emoji} {status.label}
                    </div>
                    {book.genre && <div style={{ fontSize: '0.65rem', color: '#475569' }}>{book.genre}</div>}
                    {book.rating > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: 4 }}>{'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}</div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteBook(book.id); }}
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '5px 6px', cursor: 'pointer', color: '#ef4444', alignSelf: 'flex-start' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {pct !== null && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{book.currentPage} / {book.totalPages} pages</span>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: status.color }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: status.color, borderRadius: 999, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>{editBook ? 'Modifier le livre' : 'Ajouter un livre'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus
                  placeholder="Titre du livre"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Auteur</label>
                  <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                    placeholder="Nom de l'auteur"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Genre</label>
                  <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                    style={{ width: '100%', background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }}>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Statut</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUSES.map(s => (
                    <button key={s.key} type="button" onClick={() => setForm(f => ({ ...f, status: s.key }))}
                      style={{ padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: form.status === s.key ? s.color : 'rgba(255,255,255,0.06)', color: form.status === s.key ? 'white' : '#64748b' }}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Total pages</label>
                  <input type="number" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))} min={1}
                    placeholder="Ex: 350"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Page actuelle</label>
                  <input type="number" value={form.currentPage} onChange={e => setForm(f => ({ ...f, currentPage: e.target.value }))} min={0}
                    placeholder="Ex: 120"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Note</label>
                <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Notes personnelles</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Vos impressions, extraits marquants..."
                  rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, background: 'linear-gradient(135deg,#a855f7,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  {editBook ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
