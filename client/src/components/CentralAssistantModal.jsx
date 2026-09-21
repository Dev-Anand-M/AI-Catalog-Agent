import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Store, 
  Tag, 
  Calculator, 
  Image as ImageIcon,
  Loader2,
  Volume2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { aiApi } from '../api/client';

export function CentralAssistantModal({ 
  isOpen, 
  onClose, 
  onActionConfirmed, 
  existingProducts = [] 
}) {
  const { language, t } = useLanguage();
  const { isAdmin } = useAuth();
  // The same dock serves both roles, but they have nothing to say to each other:
  // an administrator's vocabulary is console sections and platform numbers, a
  // seller's is products and prices. Showing the wrong examples makes the panel
  // look broken rather than limited.
  const samples = isAdmin
    ? [
        t('admin_assistant_sample_1', 'Show sellers'),
        t('admin_assistant_sample_2', 'How many sellers and products do we have?'),
        t('admin_assistant_sample_3', 'Open access requests'),
        t('admin_assistant_sample_4', 'Open the activity log')
      ]
    : [
        t('assistant_sample_1', 'Add blue silk saree for 1800'),
        t('assistant_sample_2', 'Calculate price for wooden toy'),
        t('assistant_sample_3', 'Enhance product photo'),
        t('assistant_sample_4', 'Open commerce channels')
      ];
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [draftData, setDraftData] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setProposal(null);
      setError('');
      setPrompt('');
      setBusy(false);
      setResult(null);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    }
  }, [isOpen]);

  const handleStartListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError(t('assistant_unsupported_voice', 'Voice recognition is not supported in this browser.'));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const langMap = {
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'bn': 'bn-IN',
      'en': 'en-IN'
    };
    recognition.lang = langMap[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(transcript);
      processOrchestrator(transcript);
    };

    recognition.onerror = (e) => {
      console.error('Speech error:', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processOrchestrator = async (textToProcess) => {
    const query = textToProcess || prompt;
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setProposal(null);
    setResult(null);

    try {
      const response = await aiApi.orchestrate({
        promptText: query,
        language,
        existingProducts: existingProducts.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price }))
      });

      const res = response.data;
      setProposal(res);
      setDraftData(res.data || {});

      // Audio feedback confirmation prompt if available
      if ('speechSynthesis' in window && res.confirmationPrompt) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.confirmationPrompt);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Orchestration error:', err);
      setError(t('assistant_error', 'Could not act on that. Please try again, clearly.'));
    } finally {
      setLoading(false);
    }
  };

  // The single place an intent becomes an action. `onActionConfirmed` returns
  // { ok, message } (or a promise of one) so the outcome can be shown AND spoken
  // here instead of the modal silently closing on a no-op.
  const runAction = useCallback(async ({ auto = false } = {}) => {
    if (!proposal || busy) return;
    setBusy(true);
    setResult(null);
    setError('');
    handleStopListening();

    let outcome = {};
    try {
      outcome = (await onActionConfirmed?.({
        intent: proposal.intent,
        actionTitle: proposal.actionTitle,
        data: draftData,
        proposal
      })) || {};
    } catch (err) {
      outcome = { ok: false, message: err?.response?.data?.error };
    }

    const ok = outcome.ok !== false;
    const message = outcome.message || (ok ? t('assistant_done', 'Done') : t('assistant_failed', 'The action could not be completed.'));
    setResult({ ok, message });
    setBusy(false);

    // Navigation, product writes and tool launches are finished business — close
    // and leave the seller on the result. A question is answered in place so the
    // reply stays visible and can be replayed with the speaker.
    const closesItself = proposal.intent !== 'GENERAL_QUERY';
    if (ok && closesItself) {
      setTimeout(() => onClose(), 700);
    }
    return outcome;
  }, [proposal, busy, onActionConfirmed, draftData, t]);

  // Nothing to confirm means nothing to wait for: "go to export", "read this
  // page" and questions should just happen when the proposal comes back.
  const selfRanRef = useRef(null);
  useEffect(() => {
    if (!proposal) {
      selfRanRef.current = null;
      return;
    }
    if (proposal.requiresConfirmation === false && selfRanRef.current !== proposal) {
      selfRanRef.current = proposal;
      runAction({ auto: true });
    }
    // runAction is intentionally not a dependency: it changes when `busy` flips,
    // which must not re-trigger execution of the same proposal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-xl w-full border border-zinc-200/90 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-950 text-sm">{t('central_assistant_title')}</h3>
              <p className="text-[11px] text-zinc-500">
                {isAdmin
                  ? t('admin_assistant_sub', 'Platform assistant — opens console sections and reports live platform numbers')
                  : t('central_assistant_sub')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Voice & Text Input Box */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {t('assistant_prompt_label')}
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processOrchestrator()}
                placeholder={
                  isAdmin
                    ? t('admin_assistant_placeholder', 'Ask about the platform — sellers, requests, logs…')
                    : (t('assistant_placeholder') || 'Ask anything about your catalog...')
                }
                className="w-full pl-3 pr-24 py-2.5 min-h-[42px] bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors placeholder:text-zinc-400"
              />
              <div className="absolute right-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  className={`p-1.5 rounded-md transition-all min-h-[32px] min-w-[32px] flex items-center justify-center ${
                    isListening 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : 'bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start speaking'}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => processOrchestrator()}
                  disabled={loading || !prompt.trim()}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            {isListening && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                {t('listening_speak_now')}
              </p>
            )}
          </div>

          {/* Quick Command Suggestions */}
          {!proposal && !loading && (
            <div className="pt-1">
              <p className="text-[11px] text-zinc-400 mb-2">{t('try_saying_like')}</p>
              <div className="flex flex-wrap gap-1.5">
                {samples.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(sample);
                      processOrchestrator(sample);
                    }}
                    className="text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md border border-zinc-200/80 transition-colors"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Working on it */}
          {busy && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              <span>{t('assistant_thinking', 'Understanding your instruction…')}</span>
            </div>
          )}

          {/* Outcome of the action that just ran */}
          {result && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
              result.ok
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {result.ok
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="flex-1">{result.message}</span>
              <button
                type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(String(result.message).replace(/[*_#`]/g, ''));
                  window.speechSynthesis.speak(utterance);
                }}
                className="p-1 text-current/70 hover:opacity-70 shrink-0"
                title={t('listen', 'Listen')}
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Structured Proposal & Confirmation View */}
          {proposal && (
            <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="badge-ai text-[11px]">
                  <Sparkles className="w-3 h-3" />
                  {t('assistant_intent', 'Intent')}: {proposal.intent}
                </span>
                {proposal.requiresConfirmation && (
                  <span className="badge-review text-[11px]">
                    {t('assistant_needs_confirm', 'Confirmation required')}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-zinc-950 text-sm">{proposal.actionTitle}</h4>
                <p className="text-xs text-zinc-600 mt-0.5">{proposal.explanation}</p>
              </div>

              {/* Editable Fields if Creating or Updating */}
              {proposal.intent === 'CREATE_PRODUCT' && (
                <div className="space-y-2 pt-2 border-t border-zinc-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t('product_name')}</label>
                      <input
                        type="text"
                        value={draftData.name || ''}
                        onChange={(e) => setDraftData({ ...draftData, name: e.target.value })}
                        className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t('price_label')} (₹)</label>
                      <input
                        type="number"
                        value={draftData.price || ''}
                        onChange={(e) => setDraftData({ ...draftData, price: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-bold text-zinc-950 px-2.5 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{t('category')}</label>
                    <input
                      type="text"
                      value={draftData.category || ''}
                      onChange={(e) => setDraftData({ ...draftData, category: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              )}

              {proposal.intent === 'UPDATE_PRODUCT' && (
                <div className="p-2.5 bg-white rounded-md border border-zinc-200 space-y-1 text-xs">
                  <p className="font-semibold text-zinc-800">Updating: {draftData.name || 'Catalog Item'}</p>
                  {draftData.price && (
                    <p className="text-emerald-700 font-bold">New Proposed Price: ₹{draftData.price}</p>
                  )}
                </div>
              )}

              {proposal.confirmationPrompt && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs flex items-start gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Confirmation Prompt:</span>
                    <p className="mt-0.5">{proposal.confirmationPrompt}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-md min-h-[36px] transition-colors"
          >
            {t('cancel')}
          </button>
          {proposal && proposal.requiresConfirmation !== false && (
            <button
              type="button"
              onClick={() => runAction()}
              disabled={busy}
              className="btn-primary text-xs font-medium py-1.5 px-3.5 min-h-[36px] flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            >
              {busy
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
              {t('confirm_apply', 'Confirm & apply')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
