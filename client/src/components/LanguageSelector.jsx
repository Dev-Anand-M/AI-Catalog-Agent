import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export function LanguageSelector({ variant = 'dropdown' }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'buttons') {
    return (
      <div className="inline-flex items-center p-1 bg-zinc-100/90 border border-zinc-200/80 rounded-xl overflow-x-auto max-w-full">
        {languages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-zinc-950 shadow-2xs border border-zinc-200/80 font-bold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
              }`}
            >
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
              <span>{lang.nativeName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-800 transition-colors text-xs font-semibold min-h-[38px]"
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-900">{currentLang.nativeName}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50">
          <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Select Language
          </div>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-zinc-100 flex items-center justify-between transition-colors ${
                language === lang.code ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{lang.nativeName}</span>
                <span className="text-[11px] text-zinc-400">({lang.name})</span>
              </div>
              {language === lang.code && (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
