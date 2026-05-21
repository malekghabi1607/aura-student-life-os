import { useState, useEffect, useRef } from 'react';
import { BookMarked, Plus, Trash2, Search, X, Save } from 'lucide-react';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };

const STORAGE_KEY = 'aura_notes';

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

const TAG_COLORS = ['#4361ee', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export default function NotesPage() {
  const [notes, setNotes] = useState(loadNotes);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTag, setEditTag] = useState('');
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef(null);

  function persist(updated) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function createNote() {
    const note = {
      id: Date.now(),
      title: 'Nouvelle note',
      content: '',
      tag: '',
      color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
      updatedAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    persist(updated);
    selectNote(note);
  }

  function selectNote(note) {
    setSelected(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTag(note.tag || '');
    setSaved(true);
  }

  function scheduleAutoSave(title, content, tag) {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveSelected(title, content, tag), 800);
  }

  function saveSelected(title, content, tag) {
    if (!selected) return;
    const updated = notes.map(n =>
      n.id === selected
        ? { ...n, title: title || 'Sans titre', content, tag, updatedAt: new Date().toISOString() }
        : n
    );
    setNotes(updated);
    persist(updated);
    setSaved(true);
  }

  function deleteNote(id) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    persist(updated);
    if (selected === id) {
      setSelected(null);
      setEditTitle('');
      setEditContent('');
    }
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tag?.toLowerCase().includes(search.toLowerCase())
  );

  const activeNote = notes.find(n => n.id === selected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 80px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookMarked size={24} color="#a855f7" /> Notes
        </div>
        <button
          onClick={createNote}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Nouvelle note
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Sidebar list */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12, padding: 16, overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px 8px 30px', color: '#f1f5f9', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#475569', fontSize: '0.82rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
                {notes.length === 0 ? 'Créez votre première note' : 'Aucun résultat'}
              </div>
            ) : filtered.map(note => (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  background: selected === note.id ? 'rgba(67,97,238,0.15)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${selected === note.id ? 'rgba(67,97,238,0.3)' : 'rgba(255,255,255,0.04)'}`,
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 4, height: 36, borderRadius: 999, background: note.color, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.title || 'Sans titre'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.content ? note.content.substring(0, 50) : 'Note vide'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: 4 }}>
                      {new Date(note.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: 4, cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {note.tag && (
                  <div style={{ marginTop: 8, marginLeft: 12, display: 'inline-block', fontSize: '0.62rem', fontWeight: 700, background: note.color + '22', color: note.color, borderRadius: 999, padding: '2px 8px' }}>
                    {note.tag}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        {activeNote ? (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 0, padding: 28, overflow: 'hidden' }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input
                value={editTitle}
                onChange={e => { setEditTitle(e.target.value); scheduleAutoSave(e.target.value, editContent, editTag); }}
                placeholder="Titre de la note..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9' }}
              />
              <span style={{ fontSize: '0.7rem', color: saved ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Save size={12} /> {saved ? 'Sauvegardé' : 'Sauvegarde...'}
              </span>
            </div>

            {/* Tag */}
            <div style={{ marginBottom: 16 }}>
              <input
                value={editTag}
                onChange={e => { setEditTag(e.target.value); scheduleAutoSave(editTitle, editContent, e.target.value); }}
                placeholder="+ Ajouter un tag..."
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 999, padding: '5px 14px', color: '#94a3b8', fontSize: '0.78rem', outline: 'none', cursor: 'text' }}
              />
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

            {/* Content */}
            <textarea
              value={editContent}
              onChange={e => { setEditContent(e.target.value); scheduleAutoSave(editTitle, e.target.value, editTag); }}
              placeholder="Écrivez votre note ici..."
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
                color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.8, fontFamily: 'inherit',
              }}
            />
          </div>
        ) : (
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: '#475569' }}>
            <div style={{ fontSize: '3rem' }}>📝</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Sélectionnez une note</div>
            <div style={{ fontSize: '0.82rem' }}>ou créez-en une nouvelle</div>
            <button
              onClick={createNote}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, marginTop: 8 }}>
              <Plus size={15} /> Créer une note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
