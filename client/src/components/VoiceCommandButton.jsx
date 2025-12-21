import { useState, useEffect } from 'react';
import { Mic, MicOff, HelpCircle, X, Navigation } from 'lucide-react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useLanguage } from '../context/LanguageContext';

export function VoiceCommandButton() {
  const {
    isListening,
    lastCommand,
    feedback,
    startListening,
    stopListening,
    executeCommand,
    isSupported,
    clearFeedback,
  } = useVoiceCommands();
  
  const { language, t } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState(null);

  // Auto-show feedback when it changes
  useEffect(() => {
    if (feedback) {
      setShowFeedback(true);
      
      // Clear any existing timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
      
      // Don't auto-hide "Listening..." or "Thinking..." messages
      const isStatusMessage = feedback.includes('Listening') || feedback.includes('Thinking') || 
                              feedback.includes('கேட்கிறது') || feedback.includes('सुन रहे') ||
                              feedback.includes('వింటోంది') || feedback.includes('ಕೇಳುತ್ತಿದೆ') ||
                              feedback.includes('শুনছে') || feedback.includes('யோசிக்கிறது');
      
      if (!isStatusMessage) {
        // Calculate read time: ~200 words per minute, minimum 8 seconds, max 25 seconds
        const wordCount = feedback.split(/\s+/).length;
        const readTimeMs = Math.min(Math.max(wordCount * 400, 8000), 25000);
        const timer = setTimeout(() => {
          setShowFeedback(false);
        }, readTimeMs);
        setAutoHideTimer(timer);
      }
    }
    
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [feedback]);

  // Dismiss feedback and stop speech
  const dismissFeedback = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setShowFeedback(false);
    if (clearFeedback) clearFeedback();
  };

  // Strip markdown formatting from text for display
  const stripMarkdown = (text) => {
    if (!text) return text;
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
      .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
      .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
      .replace(/#{1,6}\s*/g, '')           // # headers
      .replace(/`([^`]+)`/g, '$1')         // `code` -> code
      .replace(/- /g, '• ');               // - list -> • list
  };

  // Multi-language quick action labels
  const quickActionLabels = {
    en: {
      dashboard: '📊 Dashboard',
      addProduct: '➕ Add Product',
      export: '📤 Export',
      payment: '💳 Payment',
      readPage: '🔊 Read Page',
      help: '❓ Help',
      quickActions: 'Quick Actions',
      voiceCommands: 'Voice Commands',
      tapMic: 'Tap the mic button, then speak your command',
      sayThings: 'Say things like:',
      worksIn: 'Works in all 6 languages',
      listening: '🎤 Listening...',
      tapToSpeak: '🎤 Tap mic to speak',
      heard: 'Heard'
    },
    hi: {
      dashboard: '📊 डैशबोर्ड',
      addProduct: '➕ उत्पाद जोड़ें',
      export: '📤 निर्यात',
      payment: '💳 भुगतान',
      readPage: '🔊 पेज पढ़ें',
      help: '❓ मदद',
      quickActions: 'त्वरित कार्य',
      voiceCommands: 'वॉइस कमांड',
      tapMic: 'माइक बटन दबाएं, फिर बोलें',
      sayThings: 'ऐसे बोलें:',
      worksIn: 'सभी 6 भाषाओं में काम करता है',
      listening: '🎤 सुन रहे हैं...',
      tapToSpeak: '🎤 बोलने के लिए टैप करें',
      heard: 'सुना'
    },
    ta: {
      dashboard: '📊 டாஷ்போர்டு',
      addProduct: '➕ பொருள் சேர்',
      export: '📤 ஏற்றுமதி',
      payment: '💳 கட்டணம்',
      readPage: '🔊 பக்கம் படி',
      help: '❓ உதவி',
      quickActions: 'விரைவு செயல்கள்',
      voiceCommands: 'குரல் கட்டளைகள்',
      tapMic: 'மைக் பட்டனை தட்டி பேசுங்கள்',
      sayThings: 'இப்படி சொல்லுங்கள்:',
      worksIn: 'அனைத்து 6 மொழிகளிலும் வேலை செய்யும்',
      listening: '🎤 கேட்கிறது...',
      tapToSpeak: '🎤 பேச தட்டுங்கள்',
      heard: 'கேட்டது'
    },
    te: {
      dashboard: '📊 డాష్‌బోర్డ్',
      addProduct: '➕ ఉత్పత్తి జోడించు',
      export: '📤 ఎగుమతి',
      payment: '💳 చెల్లింపు',
      readPage: '🔊 పేజీ చదవండి',
      help: '❓ సహాయం',
      quickActions: 'త్వరిత చర్యలు',
      voiceCommands: 'వాయిస్ కమాండ్లు',
      tapMic: 'మైక్ బటన్ నొక్కి మాట్లాడండి',
      sayThings: 'ఇలా చెప్పండి:',
      worksIn: 'అన్ని 6 భాషల్లో పనిచేస్తుంది',
      listening: '🎤 వింటోంది...',
      tapToSpeak: '🎤 మాట్లాడటానికి నొక్కండి',
      heard: 'విన్నది'
    },
    kn: {
      dashboard: '📊 ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      addProduct: '➕ ಉತ್ಪನ್ನ ಸೇರಿಸಿ',
      export: '📤 ರಫ್ತು',
      payment: '💳 ಪಾವತಿ',
      readPage: '🔊 ಪುಟ ಓದಿ',
      help: '❓ ಸಹಾಯ',
      quickActions: 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು',
      voiceCommands: 'ಧ್ವನಿ ಆದೇಶಗಳು',
      tapMic: 'ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ ಮಾತನಾಡಿ',
      sayThings: 'ಹೀಗೆ ಹೇಳಿ:',
      worksIn: 'ಎಲ್ಲಾ 6 ಭಾಷೆಗಳಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
      listening: '🎤 ಕೇಳುತ್ತಿದೆ...',
      tapToSpeak: '🎤 ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
      heard: 'ಕೇಳಿದ್ದು'
    },
    bn: {
      dashboard: '📊 ড্যাশবোর্ড',
      addProduct: '➕ পণ্য যোগ করুন',
      export: '📤 রপ্তানি',
      payment: '💳 পেমেন্ট',
      readPage: '🔊 পেজ পড়ুন',
      help: '❓ সাহায্য',
      quickActions: 'দ্রুত কার্য',
      voiceCommands: 'ভয়েস কমান্ড',
      tapMic: 'মাইক বাটন চাপুন, তারপর বলুন',
      sayThings: 'এভাবে বলুন:',
      worksIn: 'সব ৬টি ভাষায় কাজ করে',
      listening: '🎤 শুনছে...',
      tapToSpeak: '🎤 বলতে ট্যাপ করুন',
      heard: 'শুনেছে'
    }
  };

  const labels = quickActionLabels[language] || quickActionLabels.en;

  // Quick actions for tap navigation
  const quickActions = [
    { action: 'dashboard', label: labels.dashboard },
    { action: 'addProduct', label: labels.addProduct },
    { action: 'export', label: labels.export },
    { action: 'payment', label: labels.payment },
    { action: 'readPage', label: labels.readPage },
    { action: 'help', label: labels.help },
  ];

  const handleMicClick = () => {
    // Stop any ongoing speech when mic is clicked
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Only hide feedback if it's a response (not status), when starting new listen
    if (!isListening && feedback && !feedback.includes('Listening')) {
      setShowFeedback(false);
      if (clearFeedback) clearFeedback();
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleQuickAction = (action) => {
    executeCommand(action);
    setShowQuickActions(false);
  };

  // Always show the button, even if voice is not supported
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Feedback Toast */}
      {showFeedback && feedback && (
        <div 
          className="px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg max-w-xs cursor-pointer relative group"
          onClick={dismissFeedback}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); dismissFeedback(); }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          <p className="text-sm pr-4">{stripMarkdown(feedback)}</p>
          {lastCommand && (
            <p className="text-xs opacity-75 mt-1">{labels.heard}: "{lastCommand}"</p>
          )}
        </div>
      )}

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="bg-white rounded-xl shadow-2xl p-4 w-64 border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">{labels.quickActions}</h3>
            <button 
              onClick={() => setShowQuickActions(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ action, label }) => (
              <button
                key={action}
                onClick={() => handleQuickAction(action)}
                className="px-3 py-2 bg-gray-100 hover:bg-teal-100 rounded-lg text-sm text-gray-700 hover:text-teal-700 transition-colors text-left"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-white rounded-xl shadow-2xl p-4 w-72 border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">{labels.voiceCommands}</h3>
            <button 
              onClick={() => setShowHelp(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-teal-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-teal-800 font-medium">
              {labels.tapMic}
            </p>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">{labels.sayThings}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>• "{labels.dashboard}"</p>
            <p>• "{labels.addProduct}"</p>
            <p>• "{labels.export}"</p>
            <p>• "{labels.payment}"</p>
            <p>• "{labels.readPage}"</p>
          </div>
          
          <p className="text-xs text-gray-400 mt-3">
            {labels.worksIn}
          </p>
        </div>
      )}

      {/* Button Group */}
      <div className="flex items-center gap-2">
        {/* Quick Actions Button */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border"
          title="Quick Actions"
        >
          <Navigation className="w-5 h-5" />
        </button>

        {/* Help Button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border"
          title="Help"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Main Mic Button */}
        {isSupported ? (
          <button
            onClick={handleMicClick}
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-teal-500 hover:bg-teal-600'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isListening ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
        ) : (
          <button
            onClick={() => setShowQuickActions(true)}
            className="w-14 h-14 bg-gray-400 rounded-full shadow-lg flex items-center justify-center"
            title="Voice not supported - use Quick Actions"
          >
            <MicOff className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Status Label */}
      <span className={`text-xs px-3 py-1 rounded-full shadow ${
        isListening 
          ? 'bg-red-500 text-white' 
          : 'bg-white text-gray-600 border'
      }`}>
        {isListening ? labels.listening : labels.tapToSpeak}
      </span>
    </div>
  );
}
