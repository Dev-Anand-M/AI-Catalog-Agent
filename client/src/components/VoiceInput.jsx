import { useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useLanguage } from '../context/LanguageContext';
import { Button, Alert } from './ui';

const LANG_NAMES = {
  'en-IN': 'English',
  'hi-IN': 'हिन्दी',
  'ta-IN': 'தமிழ்',
  'te-IN': 'తెలుగు',
  'kn-IN': 'ಕನ್ನಡ',
  'bn-IN': 'বাংলা',
  'en': 'English',
  'hi': 'हिन्दी',
  'ta': 'தமிழ்',
  'te': 'తెలుగు',
  'kn': 'ಕನ್ನಡ',
  'bn': 'বাংলা'
};

export function VoiceInput({ language, onTranscript, placeholder, className = '' }) {
  const { t } = useLanguage();
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  } = useVoiceInput(language);

  const langLabel = LANG_NAMES[language] || language;

  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!isSupported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-bold text-xs">Voice input not supported in this browser</span>
        </div>
        <p className="text-xs text-amber-700 mt-1">
          Please use Chrome, Edge, or Safari browser for voice features.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voice Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
            isListening 
              ? 'bg-rose-600 hover:bg-rose-700 animate-pulse ring-4 ring-rose-200' 
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg'
          } text-white`}
          aria-label={isListening ? 'Stop listening' : 'Start speaking'}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 sm:w-10 sm:h-10" />
          ) : (
            <Mic className="w-8 h-8 sm:w-10 sm:h-10" />
          )}
        </button>
        
        <div className="text-center">
          {isListening ? (
            <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-xs">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>{t('listening_text') || 'Listening...'} ({langLabel})</span>
            </div>
          ) : (
            <p className="text-slate-600 text-xs font-semibold">
              {t('tap_to_start')} <span className="font-bold text-emerald-700">{langLabel}</span>
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className={`bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200 text-left ${className}`}>
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
              {t('product_description_input') || 'Voice Transcript'}
            </span>
            <button
              type="button"
              onClick={resetTranscript}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
            >
              {t('cancel') || 'Clear'}
            </button>
          </div>
          <p className="text-zinc-900 text-sm font-medium leading-relaxed">{transcript}</p>
        </div>
      )}

      {/* Help Text */}
      {!transcript && !isListening && !error && (
        <p className="text-xs text-slate-500 text-center max-w-sm mx-auto">
          {placeholder || `${t('click_mic_describe')} (${langLabel})`}
        </p>
      )}
    </div>
  );
}
