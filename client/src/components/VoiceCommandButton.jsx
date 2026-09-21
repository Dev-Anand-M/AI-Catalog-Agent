import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Sparkles, X } from 'lucide-react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useAssistantActions } from '../hooks/useAssistantActions';
import { useLanguage } from '../context/LanguageContext';
import { CentralAssistantModal } from './CentralAssistantModal';
import { ImageStudioModal } from './ImageStudioModal';
import { PricingCalculatorModal } from './PricingCalculatorModal';
import { productsApi } from '../api/client';

/**
 * The floating voice/AI dock. It is the only assistant available on pages that
 * do not mount their own (everything except the dashboard), so it owns a real
 * action handler — "Confirm & apply" used to have nothing behind it here.
 */
export function VoiceCommandButton() {
  const {
    isListening,
    lastCommand,
    feedback,
    startListening,
    stopListening,
    isSupported,
    clearFeedback,
  } = useVoiceCommands();

  const { language, t } = useLanguage();
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [autoHideTimer, setAutoHideTimer] = useState(null);

  const {
    handleAssistantAction,
    pricingSeed,
    closePricing,
    imageJob,
    closeImage,
    applyEnhancedImage
  } = useAssistantActions({ products });

  // The orchestrator needs the catalog to resolve "change the price of the blue
  // saree" and to find a photo to enhance, so load it when the panel opens.
  const loadProducts = useCallback(() => {
    productsApi.list()
      .then((res) => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (isAssistantOpen) loadProducts();
  }, [isAssistantOpen, loadProducts]);

  // Auto-show feedback when it changes
  useEffect(() => {
    if (feedback) {
      setShowFeedback(true);
      if (autoHideTimer) clearTimeout(autoHideTimer);

      const isStatusMessage = feedback.includes('Listening') || feedback.includes('Thinking') ||
                              feedback.includes('கேட்கிறது') || feedback.includes('सुन रहे');

      if (!isStatusMessage) {
        const timer = setTimeout(() => {
          setShowFeedback(false);
        }, 8000);
        setAutoHideTimer(timer);
      }
    }
    return () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
    };
  }, [feedback]);

  const dismissFeedback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setShowFeedback(false);
    if (clearFeedback) clearFeedback();
  };

  const handleMicClick = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {/* Toast Feedback */}
      {showFeedback && feedback && (
        <div
          onClick={dismissFeedback}
          className="bg-zinc-900/95 backdrop-blur-md text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl max-w-[22rem] border border-zinc-800 flex items-start justify-between gap-3 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
        >
          <div>
            <p className="leading-snug">{feedback}</p>
            {lastCommand && (
              <p className="text-[10px] text-zinc-400 mt-1">Heard: "{lastCommand}"</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismissFeedback(); }}
            className="text-zinc-400 hover:text-white mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unified Floating Action Dock */}
      <div className="flex items-center bg-white/95 backdrop-blur-md border border-zinc-200 shadow-xl rounded-full p-1 gap-1">
        {/* Central Assistant Trigger */}
        <button
          onClick={() => setIsAssistantOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 transition-colors"
          title={t('central_assistant_title', 'AI Copilot')}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">{t('central_assistant_title', 'AI Copilot')}</span>
        </button>

        <div className="w-px h-4 bg-zinc-200"></div>

        {/* Voice Trigger Button — speaks in the language chosen in the navbar */}
        <button
          onClick={handleMicClick}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
              : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-xs'
          }`}
          title={isListening
            ? t('stop', 'Stop')
            : `${t('tap_to_speak', 'Tap to speak')} · ${language.toUpperCase()}`}
        >
          {isSupported ? (
            <Mic className="w-4 h-4 stroke-[2.2]" />
          ) : (
            <MicOff className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Central AI Assistant Modal — wired to real actions */}
      <CentralAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onActionConfirmed={handleAssistantAction}
        existingProducts={products}
      />

      {/* Tools the assistant can open on the seller's behalf */}
      {pricingSeed && (
        <PricingCalculatorModal
          isOpen
          onClose={closePricing}
          productName={pricingSeed.productName}
          category={pricingSeed.category}
          initialCosts={pricingSeed}
        />
      )}

      {imageJob && (
        <ImageStudioModal
          isOpen
          onClose={closeImage}
          image={imageJob.src}
          onAccept={(enhanced) => { applyEnhancedImage(enhanced); closeImage(); }}
        />
      )}
    </div>
  );
}
