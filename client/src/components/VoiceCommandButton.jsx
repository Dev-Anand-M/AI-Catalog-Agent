import { useState } from 'react';
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
  } = useVoiceCommands();
  
  const { language } = useLanguage();
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Quick actions for tap navigation
  const quickActions = [
    { action: 'dashboard', label: '📊 Dashboard' },
    { action: 'addProduct', label: '➕ Add Product' },
    { action: 'export', label: '📤 Export' },
    { action: 'payment', label: '💳 Payment' },
    { action: 'readPage', label: '🔊 Read Page' },
    { action: 'help', label: '❓ Help' },
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
            <p className="text-xs opacity-75 mt-1">Heard: "{lastCommand}"</p>
          )}
        </div>
      )}

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="bg-white rounded-xl shadow-2xl p-4 w-64 border">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
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
            <h3 className="font-semibold text-gray-900">Voice Commands</h3>
            <button 
              onClick={() => setShowHelp(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-teal-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-teal-800 font-medium">
              Tap the mic button, then speak your command
            </p>
          </div>

          <p className="text-xs font-medium text-gray-500 mb-2">Say things like:</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>• "Dashboard" or "Show my products"</p>
            <p>• "Add product" or "Create new"</p>
            <p>• <strong>"Open [product name]"</strong> - opens that product</p>
            <p>• "Export" or "Publish catalog"</p>
            <p>• "Payment" or "Bank details"</p>
            <p>• "Read page" or "What is this"</p>
          </div>
          
          <p className="text-xs text-gray-400 mt-3">
            Works in English & Hindi
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
        {isListening ? '🎤 Listening...' : '🎤 Tap mic to speak'}
      </span>
    </div>
  );
}
