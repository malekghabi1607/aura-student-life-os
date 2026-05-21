import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader, Trash2 } from 'lucide-react';
import { askAI } from '../services/openai';

const suggestions = [
  "Explique-moi la relativité",
  "Aide-moi à réviser les maths",
  "Crée un planning de sport",
  "Quels livres lire cet été ?",
  "Comment apprendre une langue rapidement ?",
];

const WELCOME = "Bonjour ! Je suis **Aura IA** 🌟\n\nJe peux vous aider avec n'importe quoi : études, sciences, code, sport, culture, langues, conseils...\n\nPosez-moi votre question !";

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const updated = [...messages, { role: 'user', content: userMsg }];
    setMessages(updated);
    setLoading(true);

    try {
      const reply = await askAI(updated.map(m => ({ role: m.role, content: m.content })));
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `❌ ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function formatContent(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary-500), #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="white" />
            </div>
            Assistant IA Aura
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Posez n'importe quelle question
          </div>
        </div>
        <button onClick={() => setMessages([{ role: 'assistant', content: WELCOME }])} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontSize: '0.8rem' }}>
          <Trash2 size={13} /> Effacer
        </button>
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {suggestions.map(s => (
          <button key={s} onClick={() => send(s)} style={{
            background: 'rgba(var(--primary-rgb, 99,102,241),0.08)', border: '1px solid rgba(var(--primary-rgb, 99,102,241),0.2)',
            color: 'var(--text-muted)', borderRadius: 999, padding: '6px 14px',
            cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb, 99,102,241),0.18)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--primary-rgb, 99,102,241),0.08)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary-500), #7c3aed)' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: msg.role === 'assistant' ? '1px solid rgba(var(--primary-rgb, 99,102,241),0.3)' : 'none',
            }}>
              {msg.role === 'user' ? <User size={16} color="white" /> : <Bot size={16} color="var(--primary-500)" />}
            </div>
            <div style={{
              maxWidth: '75%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary-500), #7c3aed)' : 'rgba(255,255,255,0.05)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
              padding: '12px 16px',
              fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-primary)',
            }}
              dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
            />
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--primary-rgb, 99,102,241),0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="var(--primary-500)" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 18px 18px 18px', padding: '12px 20px' }}>
              <Loader size={16} color="var(--primary-500)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10, padding: '16px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Posez n'importe quelle question..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '0.88rem',
          }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: input.trim() ? 'linear-gradient(135deg, var(--primary-500), #7c3aed)' : 'rgba(255,255,255,0.06)',
          border: 'none', cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}>
          <Send size={15} color={input.trim() ? 'white' : 'var(--text-muted)'} />
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
