import { useState, useCallback, useRef } from 'react';

const LANGUAGE_CODES = {
  'English': 'en-IN',
  'Hindi': 'hi-IN',
  'Tamil': 'ta-IN',
  'Telugu': 'te-IN',
  'Kannada': 'kn-IN',
  'Bengali': 'bn-IN'
};

export function useVoiceInput(language = 'English') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    setError('');
    
    if (!isSupported) {
      setError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = LANGUAGE_CODES[language] || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      console.log('🎤 Starting speech recognition with language:', recognition.lang);

      recognition.onstart = () => {
        setIsListening(true);
        setError('');
        console.log('✅ Voice recognition started successfully');
      };

      recognition.onresult = (event) => {
        console.log('🗣️ Speech detected:', event.results);
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          console.log('📝 Transcript:', text, 'isFinal:', event.results[i].isFinal);
          if (event.results[i].isFinal) {
            finalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        if (finalTranscript) {
          console.log('✅ Final transcript:', finalTranscript);
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error, event);
        let errorMessage = 'Voice recognition error. ';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone permission in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please connect a microphone.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            errorMessage += event.error;
        }
        
        setError(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('🛑 Voice recognition ended');
      };

      recognitionRef.current = recognition;
      recognition.start();
      console.log('🚀 Recognition.start() called');
    } catch (err) {
      console.error('💥 Failed to start voice recognition:', err);
      setError('Failed to start voice recognition. Please try again.');
      setIsListening(false);
    }
  }, [language, isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError('');
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  };
}
