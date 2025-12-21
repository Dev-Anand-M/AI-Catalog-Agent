import { useState } from 'react';
import { Mic, MicOff, HelpCircle, X, Navigation } from 'lucide-react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { useLanguage } from '../context/LanguageContext';

// Multi-language labels for quick actions
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
    cmdDashboard: '"Dashboard" or "Show my products"',
    cmdAdd: '"Add product" or "Create new"',
    cmdOpen: '"Open [product name]" - opens that product',
    cmdExport: '"Export" or "Publish catalog"',
    cmdPayment: '"Payment" or "Bank details"',
    cmdRead: '"Read page" or "What is this"',
    worksIn: 'Works in all 6 Indian languages',
    listening: '🎤 Listening...',
    tapToSpeak: '🎤 Tap mic to speak',
    heard: 'Heard',
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
    cmdDashboard: '"डैशबोर्ड" या "मेरे उत्पाद दिखाओ"',
    cmdAdd: '"उत्पाद जोड़ो" या "नया बनाओ"',
    cmdOpen: '"[उत्पाद नाम] खोलो" - वह उत्पाद खोलता है',
    cmdExport: '"निर्यात" या "कैटलॉग प्रकाशित करो"',
    cmdPayment: '"भुगतान" या "बैंक विवरण"',
    cmdRead: '"पेज पढ़ो" या "यह क्या है"',
    worksIn: 'सभी 6 भारतीय भाषाओं में काम करता है',
    listening: '🎤 सुन रहे हैं...',
    tapToSpeak: '🎤 बोलने के लिए टैप करें',
    heard: 'सुना',
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
    tapMic: 'மைக் பட்டனை தட்டி, பேசுங்கள்',
    sayThings: 'இப்படி சொல்லுங்கள்:',
    cmdDashboard: '"டாஷ்போர்டு" அல்லது "என் பொருட்கள் காட்டு"',
    cmdAdd: '"பொருள் சேர்" அல்லது "புதியது உருவாக்கு"',
    cmdOpen: '"[பொருள் பெயர்] திற" - அந்த பொருளை திறக்கும்',
    cmdExport: '"ஏற்றுமதி" அல்லது "கேட்டலாக் வெளியிடு"',
    cmdPayment: '"கட்டணம்" அல்லது "வங்கி விவரங்கள்"',
    cmdRead: '"பக்கம் படி" அல்லது "இது என்ன"',
    worksIn: 'அனைத்து 6 இந்திய மொழிகளிலும் வேலை செய்யும்',
    listening: '🎤 கேட்கிறது...',
    tapToSpeak: '🎤 பேச தட்டவும்',
    heard: 'கேட்டது',
  },
  te: {
    dashboard: '📊 డాష్‌బోర్డ్',
    addProduct: '➕ ఉత్పత్తి జోడించు',
    export: '📤 ఎగుమతి',
    payment: '💳 చెల్లింపు',
    readPage: '🔊 పేజీ చదువు',
    help: '❓ సహాయం',
    quickActions: 'త్వరిత చర్యలు',
    voiceCommands: 'వాయిస్ కమాండ్లు',
    tapMic: 'మైక్ బటన్ నొక్కి, మాట్లాడండి',
    sayThings: 'ఇలా చెప్పండి:',
    cmdDashboard: '"డాష్‌బోర్డ్" లేదా "నా ఉత్పత్తులు చూపించు"',
    cmdAdd: '"ఉత్పత్తి జోడించు" లేదా "కొత్తది సృష్టించు"',
    cmdOpen: '"[ఉత్పత్తి పేరు] తెరువు" - ఆ ఉత్పత్తిని తెరుస్తుంది',
    cmdExport: '"ఎగుమతి" లేదా "కేటలాగ్ ప్రచురించు"',
    cmdPayment: '"చెల్లింపు" లేదా "బ్యాంక్ వివరాలు"',
    cmdRead: '"పేజీ చదువు" లేదా "ఇది ఏమిటి"',
    worksIn: 'అన్ని 6 భారతీయ భాషల్లో పని చేస్తుంది',
    listening: '🎤 వింటోంది...',
    tapToSpeak: '🎤 మాట్లాడటానికి నొక్కండి',
    heard: 'విన్నది',
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
    tapMic: 'ಮೈಕ್ ಬಟನ್ ಒತ್ತಿ, ಮಾತನಾಡಿ',
    sayThings: 'ಹೀಗೆ ಹೇಳಿ:',
    cmdDashboard: '"ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" ಅಥವಾ "ನನ್ನ ಉತ್ಪನ್ನಗಳು ತೋರಿಸಿ"',
    cmdAdd: '"ಉತ್ಪನ್ನ ಸೇರಿಸಿ" ಅಥವಾ "ಹೊಸದು ರಚಿಸಿ"',
    cmdOpen: '"[ಉತ್ಪನ್ನ ಹೆಸರು] ತೆರೆ" - ಆ ಉತ್ಪನ್ನವನ್ನು ತೆರೆಯುತ್ತದೆ',
    cmdExport: '"ರಫ್ತು" ಅಥವಾ "ಕ್ಯಾಟಲಾಗ್ ಪ್ರಕಟಿಸಿ"',
    cmdPayment: '"ಪಾವತಿ" ಅಥವಾ "ಬ್ಯಾಂಕ್ ವಿವರಗಳು"',
    cmdRead: '"ಪುಟ ಓದಿ" ಅಥವಾ "ಇದು ಏನು"',
    worksIn: 'ಎಲ್ಲಾ 6 ಭಾರತೀಯ ಭಾಷೆಗಳಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    listening: '🎤 ಕೇಳುತ್ತಿದೆ...',
    tapToSpeak: '🎤 ಮಾತನಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    heard: 'ಕೇಳಿದ್ದು',
  },
  bn: {
    dashboard: '📊 ড্যাশবোর্ড',
    addProduct: '➕ পণ্য যোগ করুন',
    export: '📤 রপ্তানি',
    payment: '💳 পেমেন্ট',
    readPage: '🔊 পেজ পড়ুন',
    help: '❓ সাহায্য',
    quickActions: 'দ্রুত কার্যক্রম',
    voiceCommands: 'ভয়েস কমান্ড',
    tapMic: 'মাইক বাটন চাপুন, তারপর বলুন',
    sayThings: 'এভাবে বলুন:',
    cmdDashboard: '"ড্যাশবোর্ড" বা "আমার পণ্য দেখাও"',
    cmdAdd: '"পণ্য যোগ করো" বা "নতুন তৈরি করো"',
    cmdOpen: '"[পণ্যের নাম] খোলো" - সেই পণ্য খুলবে',
    cmdExport: '"রপ্তানি" বা "ক্যাটালগ প্রকাশ করো"',
    cmdPayment: '"পেমেন্ট" বা "ব্যাংক বিবরণ"',
    cmdRead: '"পেজ পড়ো" বা "এটা কি"',
    worksIn: 'সব ৬টি ভারতীয় ভাষায় কাজ করে',
    listening: '🎤 শুনছে...',
    tapToSpeak: '🎤 বলতে ট্যাপ করুন',
    heard: 'শুনেছি',
  },
};

export function VoiceCommandButton() {
  const {
    isListening,
    lastCommand,
    feedback,
    startListening,
    stopListening,
    executeCommand,
    isSupported,
  } = useVoiceCommands();
  
  const { language } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Get labels for current language
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
      {feedback && (
        <div className="px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg max-w-xs">
          <p className="text-sm">{feedback}</p>
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
            <p>• {labels.cmdDashboard}</p>
            <p>• {labels.cmdAdd}</p>
            <p>• <strong>{labels.cmdOpen}</strong></p>
            <p>• {labels.cmdExport}</p>
            <p>• {labels.cmdPayment}</p>
            <p>• {labels.cmdRead}</p>
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
