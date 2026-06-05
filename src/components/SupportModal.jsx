import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { X, MessageCircle, Mail, ChevronRight, HelpCircle, Send } from 'lucide-react';
import { API_BASE } from '../utils/api';

const SUPPORT_EMAIL = 'steamappspro@gmail.com';

const CATEGORIES = [
  { id: 'bug', icon: '🐛', label: 'Signaler un bug' },
  { id: 'feature', icon: '✨', label: 'Suggérer une fonctionnalité' },
  { id: 'account', icon: '👤', label: 'Problème de compte' },
  { id: 'payment', icon: '💳', label: 'Problème de paiement' },
  { id: 'other', icon: '💬', label: 'Autre question' },
];

const FAQS = [
  {
    q: "Comment importer des musiques depuis YouTube ?",
    a: "Allez dans l'onglet 'Publier un son' du menu (accessible aux artistes/développeurs), renseignez le titre, le genre et collez le lien YouTube valide. Le son apparaîtra immédiatement dans la bibliothèque."
  },
  {
    q: "Comment activer la qualité audio Hi-Fi (320 kbps) ?",
    a: "Rendez-vous dans la section 'Premium', choisissez votre forfait et finalisez la transaction simulée. Votre compte sera mis à niveau instantanément en haute fidélité."
  },
  {
    q: "Pourquoi certains morceaux ne se lancent pas en arrière-plan ?",
    a: "Electron réduit parfois l'utilisation CPU lorsque la fenêtre est fermée ou minimisée. Pandofy intègre des directives système ('disable-background-timer-throttling') pour forcer la lecture fluide en arrière-plan."
  },
  {
    q: "Comment modifier le thème visuel de l'application ?",
    a: "Cliquez sur l'icône de palette 🎨 dans l'en-tête de l'application, ou allez dans 'Paramètres' pour choisir parmi 8 thèmes colorés (violet, bleu, rouge, vert, rose, etc.)."
  }
];

export default function SupportModal() {
  const { showSupportModal, setShowSupportModal, user } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState(user?.displayName || user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [faqExpanded, setFaqExpanded] = useState({});

  useEffect(() => {
    if (showSupportModal && user) {
      setName(user.displayName || user.username || '');
      setEmail(user.email || '');
    }
  }, [showSupportModal, user]);

  if (!showSupportModal) return null;

  const handleClose = () => { 
    setShowSupportModal(false); 
    setStep(1); 
    setCategory(null); 
    setMessage(''); 
  };

  const toggleFaq = (idx) => {
    setFaqExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleSend = async () => {
    if (!message.trim() || !email.trim() || !name.trim()) return;
    
    // 1. Send to local app database inbox
    try {
      const payload = {
        category: category?.label || 'Support',
        message: message,
        email: email,
        username: name
      };
      await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Support DB log error:", err);
    }

    // 2. Open default mail client pre-filled
    const subject = encodeURIComponent(`[Pandofy Support] ${category?.label || 'Message'}`);
    const body = encodeURIComponent(`Nom/Pseudo: ${name}\nE-mail de contact: ${email}\nCatégorie: ${category?.label}\n\nMessage:\n${message}`);
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
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '90vw' }}>
        <button className="modal-close-btn" onClick={handleClose} aria-label="Fermer"><X size={20} /></button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-flex', padding: 10, borderRadius: '50%', background: 'rgba(255,102,0,0.1)', marginBottom: 8 }}>
            <MessageCircle size={24} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#fff' }}>Support Pandofy</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: 4 }}>Centre d'aide & Espace de contact direct</p>
        </div>

        {/* Dual Column Support Layout */}
        <div className="support-dashboard-layout" style={{ display: 'flex', gap: 32, marginTop: 10 }}>
          
          {/* Left Column: Contact Form (50%) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} color="var(--color-primary)" /> Nous contacter
            </h3>
            
            {step === 1 ? (
              <>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem', marginBottom: 12 }}>Sélectionnez le motif de votre demande :</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => { setCategory(cat); setStep(2); }}
                      className="support-category-card"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.02)', cursor: 'pointer', width: '100%', textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.88rem' }}>{cat.label}</span>
                      </div>
                      <ChevronRight size={16} color="var(--color-text-muted)" />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.82rem', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                  ← {category?.icon} {category?.label} (Changer)
                </button>
                
                <div className="modal-form-group" style={{ marginBottom: 0 }}>
                  <label className="modal-label">Nom / Pseudo</label>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder="Votre nom..." 
                    value={name}
                    onChange={e => setName(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="modal-form-group" style={{ marginBottom: 0 }}>
                  <label className="modal-label">Adresse e-mail</label>
                  <input 
                    type="email" 
                    className="modal-input" 
                    placeholder="votre.email@exemple.com..." 
                    value={email}
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="modal-form-group" style={{ marginBottom: 4 }}>
                  <label className="modal-label">Votre message</label>
                  <textarea 
                    className="modal-input" 
                    placeholder="Expliquez en détail..." 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    style={{ minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.4 }} 
                    required
                  />
                </div>
                
                <button onClick={handleSend} disabled={!message.trim() || !email.trim() || !name.trim()} className="btn-primary modal-submit-btn"
                  style={{ width: '100%', opacity: (!message.trim() || !email.trim() || !name.trim()) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Send size={16} /> Envoyer le message
                </button>
              </div>
            )}
          </div>

          {/* Vertical Divider Line */}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* Right Column: FAQ Center (50%) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HelpCircle size={16} color="var(--color-primary)" /> FAQ / Questions fréquentes
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto', paddingRight: 6 }}>
              {FAQS.map((faq, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, transition: 'all 0.2s' }}>
                  <button 
                    onClick={() => toggleFaq(idx)}
                    style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', color: '#fff', fontSize: '0.85rem', fontWeight: 700, textAlign: 'left', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span>{faq.q}</span>
                    <ChevronRight size={14} style={{ transform: faqExpanded[idx] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--color-primary)' }} />
                  </button>
                  {faqExpanded[idx] && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: 8, lineHeight: 1.4, marginBlockEnd: 0 }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
