import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import './ConfirmDialog.css';

// An in-app replacement for window.confirm: the question, Cancel and OK, over a blurred table.
// Escape or a click outside cancels; Enter confirms (OK has focus when it opens).
export default function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }) {
  const { t } = useLanguage();
  const okRef = useRef(null);

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Rendered into <body> so no transformed ancestor clips the fixed backdrop
  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true"
        aria-describedby="confirm-dialog-message" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-dialog-message" className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-button cancel" onClick={onCancel}>{t('cancel')}</button>
          <button ref={okRef} className="confirm-dialog-button ok" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
