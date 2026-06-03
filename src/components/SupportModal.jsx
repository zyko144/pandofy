import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, MessageCircle, Mail, ChevronRight } from 'lucide-react';

const SUPPORT_EMAIL = 'steamappspro@gmail.com';

const CATEGORIES = [
  { id: 'bug', icon: '🐛', label: 'Signaler un bug' },
  { id: 'feature', icon: '✨', label: 'Suggérer une fonctionnalité' },
  { id: 'account', icon: '👤', label: 'Problème de compte' },
  { id: 'payment', icon: '💳', label: 'Problème de paiement' },
  { id: 'other', icon: '💬', label: 'Autre question' },
];

export default function SupportModal() {
  const { showSupportModal, setShowSupportModal, user } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');

  if (!showSupportModal) return null;

  const handleClose = () => { setShowSupportModal(false); setStep(1); setCategory(null); setMessage(''); };

  const handleSend = () => {
    if (!message.trim()) return;
    const subject = encodeURIComponent(`[Pandofy Support] ${category?.label || 'Message'}`);
    const body = encodeURIComponent(`Utilisateur: ${user?.username || 'Non connecté'}\nCatégorie: ${category?.label}\n\nMessage:\n${message}`);
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    if (window.electronAPI?.openExternalLink) {
      window.electronAPI.openExternalLink(mailto);
    } else {
      window.open(mailto, '_blank');
    }
    handleClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <button className="modal-close-btn" onClick={handleClose}><X size={20} /></button>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', padding: 12, borderRadius: '50%', background: 'rgba(255,102,0,0.1)', marginBottom: 12 }}>
            <MessageCircle size={28} color="#FF6600" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>Support Pandofy</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>On répond dans les 24h !</p>
        </div>

        {step === 1 ? (
          <>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Sélectionne une catégorie :</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat); setStep(2); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{cat.label}</span>
                  </div>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </button>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: 'rgba(255,102,0,0.05)', border: '1px solid rgba(255,102,0,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={16} color="#FF6600" />
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{SUPPORT_EMAIL}</span>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 16 }}>
              ← {category?.icon} {category?.label}
            </button>
            <div className="modal-form-group">
              <label className="modal-label">Votre message</label>
              <textarea className="modal-input" placeholder="Décrivez votre problème en détail..." value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
            </div>
            <button onClick={handleSend} disabled={!message.trim()} className="btn-primary modal-submit-btn"
              style={{ opacity: !message.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Mail size={16} /> Envoyer par email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
