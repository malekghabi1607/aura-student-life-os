import { useState, useEffect } from 'react';
import { Languages, Plus, Trash2, X, Check, RotateCcw, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'aura_languages';
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };

const LANG_FLAGS = {
  'Anglais': '🇬🇧', 'Espagnol': '🇪🇸', 'Français': '🇫🇷', 'Allemand': '🇩🇪',
  'Italien': '🇮🇹', 'Portugais': '🇵🇹', 'Arabe': '🇸🇦', 'Japonais': '🇯🇵',
  'Chinois': '🇨🇳', 'Russe': '🇷🇺', 'Coréen': '🇰🇷', 'Autre': '🌍',
};
const LEVELS = ['Débutant', 'Élémentaire', 'Intermédiaire', 'Avancé', 'Courant'];
const LEVEL_COLORS = ['#64748b', '#4361ee', '#f59e0b', '#10b981', '#7c3aed'];

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { languages: [], vocab: [] }; }
  catch { return { languages: [], vocab: [] }; }
}

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLang, setSelectedLang] = useState(null);
  const [showLangForm, setShowLangForm] = useState(false);
  const [showVocabForm, setShowVocabForm] = useState(false);
  const [langForm, setLangForm] = useState({ name: 'Anglais', level: 'Débutant', dailyGoal: 15 });
  const [vocabForm, setVocabForm] = useState({ word: '', translation: '', language: '', example: '' });

  // Flashcard state
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcMode, setFcMode] = useState('all');

  useEffect(() => {
    const data = loadData();
    setLanguages(data.languages || []);
    setVocab(data.vocab || []);
    if (data.languages?.length > 0 && !selectedLang) {
      setSelectedLang(data.languages[0].id);
    }
  }, []);

  function persist(l, v) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ languages: l, vocab: v }));
  }

  function createLanguage(e) {
    e.preventDefault();
    const lang = { id: Date.now(), ...langForm, progress: 0, wordsLearned: 0, streak: 0, addedAt: new Date().toISOString() };
    const updated = [...languages, lang];
    setLanguages(updated);
    persist(updated, vocab);
    setSelectedLang(lang.id);
    setShowLangForm(false);
    setLangForm({ name: 'Anglais', level: 'Débutant', dailyGoal: 15 });
  }

  function deleteLang(id) {
    const updated = languages.filter(l => l.id !== id);
    const updatedVocab = vocab.filter(v => v.language !== languages.find(l => l.id === id)?.name);
    setLanguages(updated);
    setVocab(updatedVocab);
    persist(updated, updatedVocab);
    if (selectedLang === id) setSelectedLang(updated[0]?.id || null);
  }

  function createVocab(e) {
    e.preventDefault();
    const lang = languages.find(l => l.id === selectedLang);
    if (!vocabForm.word || !vocabForm.translation) return;
    const item = { id: Date.now(), ...vocabForm, language: lang?.name || vocabForm.language, known: false, addedAt: new Date().toISOString() };
    const updatedVocab = [...vocab, item];
    const updatedLangs = languages.map(l =>
      l.id === selectedLang ? { ...l, wordsLearned: updatedVocab.filter(v => v.language === l.name).length } : l
    );
    setVocab(updatedVocab);
    setLanguages(updatedLangs);
    persist(updatedLangs, updatedVocab);
    setVocabForm(f => ({ ...f, word: '', translation: '', example: '' }));
    setShowVocabForm(false);
  }

  function toggleKnown(id) {
    const updatedVocab = vocab.map(v => v.id === id ? { ...v, known: !v.known } : v);
    setVocab(updatedVocab);
    persist(languages, updatedVocab);
  }

  function deleteVocab(id) {
    const updatedVocab = vocab.filter(v => v.id !== id);
    setVocab(updatedVocab);
    persist(languages, updatedVocab);
  }

  const activeLang = languages.find(l => l.id === selectedLang);
  const langVocab = activeLang ? vocab.filter(v => v.language === activeLang.name) : [];
  const fcVocab = fcMode === 'unknown' ? langVocab.filter(v => !v.known) : langVocab;
  const currentCard = fcVocab[fcIndex % Math.max(fcVocab.length, 1)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Languages size={24} color="#06b6d4" /> Langues
        </div>
        <button onClick={() => setShowLangForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
          <Plus size={15} /> Nouvelle langue
        </button>
      </div>

      {languages.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌍</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#64748b' }}>Aucune langue</div>
          <div style={{ fontSize: '0.82rem', marginTop: 6 }}>Commencez par ajouter une langue à apprendre</div>
          <button onClick={() => setShowLangForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', color: 'white', borderRadius: 12, padding: '10px 20px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, margin: '16px auto 0' }}>
            <Plus size={15} /> Ajouter une langue
          </button>
        </div>
      ) : (
        <>
          {/* Language selector */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {languages.map(lang => {
              const levelColor = LEVEL_COLORS[LEVELS.indexOf(lang.level)] || '#64748b';
              return (
                <button key={lang.id} onClick={() => setSelectedLang(lang.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderRadius: 14, border: `2px solid ${selectedLang === lang.id ? levelColor : 'rgba(255,255,255,0.08)'}`, background: selectedLang === lang.id ? levelColor + '18' : 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                  <span style={{ fontSize: '1.4rem' }}>{LANG_FLAGS[lang.name] || '🌍'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9' }}>{lang.name}</div>
                    <div style={{ fontSize: '0.65rem', color: levelColor, fontWeight: 600 }}>{lang.level} · {vocab.filter(v => v.language === lang.name).length} mots</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteLang(lang.id); }}
                    style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: '#ef4444', marginLeft: 4 }}>
                    <Trash2 size={11} />
                  </button>
                </button>
              );
            })}
          </div>

          {activeLang && (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4 }}>
                {[{ key: 'vocab', label: '📖 Vocabulaire' }, { key: 'flashcards', label: '🃏 Flashcards' }].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    style={{ flex: 1, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, background: activeTab === t.key ? 'rgba(67,97,238,0.2)' : 'transparent', color: activeTab === t.key ? '#4361ee' : '#64748b', transition: 'all 0.15s' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Vocab tab */}
              {activeTab === 'vocab' && (
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Vocabulaire {activeLang.name} ({langVocab.length} mots — {langVocab.filter(v => v.known).length} connus)
                    </div>
                    <button onClick={() => { setVocabForm(f => ({ ...f, language: activeLang.name })); setShowVocabForm(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(67,97,238,0.15)', border: '1px solid rgba(67,97,238,0.3)', color: '#4361ee', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Plus size={13} /> Ajouter un mot
                    </button>
                  </div>

                  {langVocab.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: '0.85rem' }}>
                      Aucun mot pour le moment. Ajoutez votre premier mot !
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10 }}>
                      {langVocab.map(item => (
                        <div key={item.id} style={{ padding: '12px 14px', background: item.known ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${item.known ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>{item.word}</div>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{item.translation}</div>
                              {item.example && <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 4, fontStyle: 'italic' }}>«{item.example}»</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => toggleKnown(item.id)}
                                style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${item.known ? '#10b981' : 'rgba(255,255,255,0.2)'}`, background: item.known ? '#10b981' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.known && <Check size={12} color="white" strokeWidth={3} />}
                              </button>
                              <button onClick={() => deleteVocab(item.id)}
                                style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Flashcards tab */}
              {activeTab === 'flashcards' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ key: 'all', label: 'Tous' }, { key: 'unknown', label: 'Non connus' }].map(m => (
                      <button key={m.key} onClick={() => { setFcMode(m.key); setFcIndex(0); setFcFlipped(false); }}
                        style={{ padding: '6px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: fcMode === m.key ? '#4361ee' : 'rgba(255,255,255,0.06)', color: fcMode === m.key ? 'white' : '#64748b' }}>
                        {m.label} ({m.key === 'all' ? langVocab.length : langVocab.filter(v => !v.known).length})
                      </button>
                    ))}
                  </div>

                  {fcVocab.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '40px', color: '#475569' }}>
                      {langVocab.length === 0 ? 'Ajoutez des mots pour utiliser les flashcards' : '🎉 Tous les mots sont connus !'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {(fcIndex % fcVocab.length) + 1} / {fcVocab.length}
                      </div>

                      {/* Card */}
                      <div
                        onClick={() => setFcFlipped(f => !f)}
                        style={{ width: '100%', maxWidth: 480, minHeight: 200, ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s', background: fcFlipped ? 'rgba(67,97,238,0.12)' : 'rgba(255,255,255,0.04)', borderColor: fcFlipped ? 'rgba(67,97,238,0.3)' : 'rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {fcFlipped ? 'Traduction' : 'Mot'}
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f1f5f9', textAlign: 'center' }}>
                          {fcFlipped ? currentCard?.translation : currentCard?.word}
                        </div>
                        {fcFlipped && currentCard?.example && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>«{currentCard.example}»</div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#475569' }}>Cliquer pour retourner</div>
                      </div>

                      {/* Controls */}
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={() => { setFcIndex(i => (i - 1 + fcVocab.length) % fcVocab.length); setFcFlipped(false); }}
                          style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          ←
                        </button>
                        <button onClick={() => { toggleKnown(currentCard.id); setFcIndex(i => (i + 1) % fcVocab.length); setFcFlipped(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                          <Check size={15} /> Connu
                        </button>
                        <button onClick={() => { setFcIndex(i => (i + 1) % fcVocab.length); setFcFlipped(false); }}
                          style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Language form modal */}
      {showLangForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouvelle langue</div>
              <button onClick={() => setShowLangForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <form onSubmit={createLanguage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Langue</label>
                <select value={langForm.name} onChange={e => setLangForm(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '100%', background: '#2a2a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none' }}>
                  {Object.keys(LANG_FLAGS).map(l => <option key={l} value={l}>{LANG_FLAGS[l]} {l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6, display: 'block' }}>Niveau actuel</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {LEVELS.map((l, i) => (
                    <button key={l} type="button" onClick={() => setLangForm(f => ({ ...f, level: l }))}
                      style={{ padding: '6px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: langForm.level === l ? LEVEL_COLORS[i] : 'rgba(255,255,255,0.06)', color: langForm.level === l ? 'white' : '#64748b' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowLangForm(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vocab form modal */}
      {showVocabForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Nouveau mot</div>
              <button onClick={() => setShowVocabForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
            </div>
            <form onSubmit={createVocab} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Mot *</label>
                  <input value={vocabForm.word} onChange={e => setVocabForm(f => ({ ...f, word: e.target.value }))} required autoFocus
                    placeholder={`En ${activeLang?.name}`}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Traduction *</label>
                  <input value={vocabForm.translation} onChange={e => setVocabForm(f => ({ ...f, translation: e.target.value }))} required
                    placeholder="En français"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4, display: 'block' }}>Exemple (optionnel)</label>
                <input value={vocabForm.example} onChange={e => setVocabForm(f => ({ ...f, example: e.target.value }))}
                  placeholder="Exemple d'utilisation"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowVocabForm(false)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Annuler
                </button>
                <button type="submit"
                  style={{ flex: 1, background: 'linear-gradient(135deg,#4361ee,#7c3aed)', border: 'none', borderRadius: 12, padding: '11px', cursor: 'pointer', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
