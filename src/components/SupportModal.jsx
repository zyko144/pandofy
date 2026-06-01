import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, MessageCircle, Mail, Bug, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';
import { API_BASE } from '../utils/api';

const CATEGORIES = [
  { id: 'bug', icon: '🐛', label: 'Signaler un bug', color: '#FF4400' },
  { id: 'feature', icon: '✨', label: 'Suggérer une fonctionnalité', color: '#FF6600' },
  { id: 'account', icon: '👤', label: 'Problème de compte', color: '#CC44FF' },
  { id: 'payment', icon: '💳', label: 'Problème de paiement', color: '#00AAFF' },
  { id: 'other', icon: '💬', label: 'Autre question', color: '#AAAAAA' },
];

export default function SupportModal() {
  const { showSupportModal, setShowSupportModal, user } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!showSupportModal) return null;

  const handleClose = () => {
    setShowSupportModal(false);
    setStep(1); setCategory(null); setMessage(''); setSent(false);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Send support message via API (stored in DB as message to cdeveloppeur)
      const token = localStorage.getItem('pandofy_token');
      await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category: category?.label, message: message.trim(), email, username: user?.username || 'anonyme' })
      });
    } catch {}
    setSending(false);
    setSent(true);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <button className="modal-close-btn" onClick={handleClose}><X size={20} /></button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(255,102,0,0.1)', marginBottom: 12 }}>
            <MessageCircle size={28} color="#FF6600" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>Support Pandofy</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>On est là pour vous aider !</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} color="#FF6600" style={{ marginBottom: 12 }} />
            <div style={{ color: '#FF6600', fontWeight: 700, fontSize: '1rem' }}>Message envoyé !</div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 8 }}>L'équipe Pandofy vous répondra dans votre boîte mail Pandofy.</p>
            <button onClick={handleClose} className="btn-primary" style={{ marginTop: 20, padding: '10px 28px', borderRadius: 9999 }}>Fermer</button>
          </div>
        ) : step === 1 ? (
          <>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Sélectionne une catégorie :</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat); setStep(2); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = cat.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{cat.label}</span>
                  </div>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </button>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ marginTop: 20, padding: '14px', borderRadius: 10, background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.1)' }}>
              <div style={{ fontSize: '0.8rem', color: '#FF6600', fontWeight: 700, marginBottom: 8 }}>📬 Contact direct</div>
              <a href="mailto:support@pandofy.app" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>
                <Mail size={12} /> support@pandofy.app
              </a>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← {category?.icon} {category?.label}
            </button>

            {!user && (
              <div className="modal-form-group">
                <label className="modal-label">Votre email</label>
                <input type="email" className="modal-input" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            )}

            <div className="modal-form-group">
              <label className="modal-label">Votre message</label>
              <textarea className="modal-input" placeholder="Décrivez votre problème ou suggestion en détail..." value={message} onChange={e => setMessage(e.target.value)}
                style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>

            <button onClick={handleSend} disabled={sending || !message.trim()} className="btn-primary modal-submit-btn"
              style={{ opacity: sending || !message.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {sending ? 'Envoi...' : '📤 Envoyer'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
