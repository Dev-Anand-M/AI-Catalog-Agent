import { useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Button, Alert } from './ui';

export function VoiceInput({ language, onTranscript, placeholder }) {
  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  } = useVoiceInput(language);

  useEffect(() => {
    if (transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Voice input not supported</span>
        </div>
        <p className="text-sm text-yellow-600 mt-1">
          Please use Chrome, Edge, or Safari browser for voice input.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voice Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-primary-500 hover:bg-primary-600'
          } text-white shadow-lg`}
        >
          {isListening ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
        
        <div className="text-center">
          {isListening ? (
            <div className="flex items-center gap-2 text-red-600">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span className="font-medium">Listening in {language}...</span>
            </div>
          ) : (
            <p className="text-gray-600">
              Tap to start speaking in {language}
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
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Voice Input
            </span>
            <button
              type="button"
              onClick={resetTranscript}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear
            </button>
          </div>
          <p className="text-gray-800 text-lg">{transcript}</p>
        </div>
      )}

      {/* Help Text */}
      {!transcript && !isListening && !error && (
        <p className="text-sm text-gray-500 text-center">
          {placeholder || `Click the microphone and describe your product in ${language}`}
        </p>
      )}
    </div>
  );
}
