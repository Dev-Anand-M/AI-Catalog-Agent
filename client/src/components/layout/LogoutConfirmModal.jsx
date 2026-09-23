import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function LogoutConfirmModal({ isOpen, onConfirm, onClose }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-overlay !z-[9999]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-overlay-inner">
        <div className="modal-panel max-w-sm w-full p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center ring-1 ring-rose-100 shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-950 font-heading">
              {t('logout_confirm_title', 'Confirm Sign Out')}
            </h3>
            <p className="text-xs text-zinc-500">
              {t('logout_confirm_sub', 'Are you sure you want to exit your store session?')}
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 mt-2 mb-6 leading-relaxed">
          {t('logout_confirm_desc', 'Your catalog, active listings, and payment settings remain saved and secure. You can log back in anytime with your credentials.')}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('nav_logout', 'Log Out')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>,
    document.body
  );
}
