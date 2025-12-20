import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff } from 'lucide-react';
import { productsApi, aiApi } from '../api/client';
import { Button, Input, Select, Alert } from '../components/ui';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';

const CATEGORIES = [
  { value: 'Grocery', label: 'Grocery' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Handicraft', label: 'Handicraft' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Other', label: 'Other' }
];

const LANGUAGES = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Tamil', label: 'Tamil' },
  { value: 'Telugu', label: 'Telugu' },
  { value: 'Kannada', label: 'Kannada' },
  { value: 'Bengali', label: 'Bengali' }
];

const speechLangCodes = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN',
  te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN',
  English: 'en-IN', Hindi: 'hi-IN', Tamil: 'ta-IN',
  Telugu: 'te-IN', Kannada: 'kn-IN', Bengali: 'bn-IN'
};

export function EditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    language: '',
    imageUrl: ''
  });

  const isVoiceSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await productsApi.get(id);
      const product = response.data;
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price.toString(),
        language: product.language,
        imageUrl: product.imageUrl || ''
      });
    } catch (err) {
      setError('Failed to load product. Please try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Auto-save product to database
  const saveProduct = async (updatedData) => {
    try {
      const productData = {
        ...updatedData,
        price: parseFloat(updatedData.price)
      };
      await productsApi.update(id, productData);
      return true;
    } catch (err) {
      console.error('Auto-save error:', err);
      return false;
    }
  };

  // Voice command to update product fields
  const handleVoiceUpdate = useCallback(async () => {
    if (!isVoiceSupported || isListening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = speechLangCodes[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    // Multi-language listening feedback
    const listeningFeedback = {
      en: '🎤 Listening... Say "update price to 500", "save", or "cancel"',
      hi: '🎤 सुन रहे हैं... "कीमत 500 करो", "सेव करो", या "रद्द करो" बोलें',
      ta: '🎤 கேட்கிறது... "விலை 500 செய்", "சேமி", அல்லது "ரத்து" சொல்லுங்கள்',
      te: '🎤 వింటోంది... "ధర 500 చేయి", "సేవ్ చేయి", లేదా "రద్దు చేయి" చెప్పండి',
      kn: '🎤 ಕೇಳುತ್ತಿದೆ... "ಬೆಲೆ 500 ಮಾಡು", "ಸೇವ್ ಮಾಡು", ಅಥವಾ "ರದ್ದು ಮಾಡು" ಹೇಳಿ',
      bn: '🎤 শুনছে... "দাম 500 করো", "সেভ করো", বা "বাতিল করো" বলুন'
    };

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback(listeningFeedback[language] || listeningFeedback.en);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      const lowerTranscript = transcript.toLowerCase();
      
      // Multi-language "Heard" feedback
      const heardFeedback = {
        en: `Heard: "${transcript}" - Processing...`,
        hi: `सुना: "${transcript}" - प्रोसेस हो रहा है...`,
        ta: `கேட்டது: "${transcript}" - செயலாக்குகிறது...`,
        te: `విన్నది: "${transcript}" - ప్రాసెస్ చేస్తోంది...`,
        kn: `ಕೇಳಿದ್ದು: "${transcript}" - ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತಿದೆ...`,
        bn: `শুনেছি: "${transcript}" - প্রসেস করছে...`
      };
      setVoiceFeedback(heardFeedback[language] || heardFeedback.en);

      // Multi-language save commands - check longer phrases first
      const saveCommands = [
        // Longer phrases first (to match before shorter ones)
        'save pannu', 'save podu', 'save karo', 'save kar', 'save cheyyi', 'save cheyyandi', 'save maadu', 'save koro',
        'ho gaya', 'hoye gelo', 'thik ache', 'theek hai', 'mudinjadhu', 'ayyindi', 'aaytu',
        // English
        'save', 'done', 'finish', 'submit', 'confirm',
        // Hindi + Hinglish
        'सेव', 'सहेजो', 'बचाओ', 'khatam',
        // Tamil + Tanglish
        'சேமி', 'சேமிக்க', 'seri', 'seyvi',
        // Telugu + Tenglish
        'సేవ్', 'భద్రపరచు', 'sare',
        // Kannada + Kanglish
        'ಸೇವ್', 'ಉಳಿಸು', 'sari', 'ulisu',
        // Bengali + Benglish
        'সেভ', 'সংরক্ষণ'
      ];

      // Multi-language cancel commands - check longer phrases first
      const cancelCommands = [
        // Longer phrases first (to match before shorter ones)
        'cancel pannu', 'cancel karo', 'cancel cheyyi', 'cancel maadu', 'cancel koro',
        'go back', 'wapas jao', 'back po', 'back vellu', 'back hogu', 'back jao',
        'hinde hogu', 'pechone jao', 'thirumbu', 'venakki',
        // English
        'cancel', 'back', 'exit', 'close',
        // Hindi + Hinglish
        'रद्द', 'वापस', 'peeche', 'band karo',
        // Tamil + Tanglish
        'ரத்து', 'திரும்பு', 'radhu', 'thirimbu',
        // Telugu + Tenglish
        'రద్దు', 'వెనక్కి', 'raddu',
        // Kannada + Kanglish
        'ರದ್ದು', 'ಹಿಂದೆ', 'raddu', 'hinde',
        // Bengali + Benglish
        'বাতিল', 'ফিরে যাও', 'batil', 'fire jao'
      ];

      // Multi-language feedback messages
      const feedbackMessages = {
        en: { saving: '💾 Saving changes...', saved: '✅ Saved! Redirecting...', saveFailed: '❌ Save failed. Please try again.', goingBack: '↩️ Going back...' },
        hi: { saving: '💾 सहेज रहे हैं...', saved: '✅ सहेज लिया! जा रहे हैं...', saveFailed: '❌ सहेजने में विफल। पुनः प्रयास करें।', goingBack: '↩️ वापस जा रहे हैं...' },
        ta: { saving: '💾 சேமிக்கிறது...', saved: '✅ சேமிக்கப்பட்டது! திரும்புகிறது...', saveFailed: '❌ சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.', goingBack: '↩️ திரும்புகிறது...' },
        te: { saving: '💾 సేవ్ చేస్తోంది...', saved: '✅ సేవ్ అయింది! వెళ్తోంది...', saveFailed: '❌ సేవ్ విఫలమైంది. మళ్ళీ ప్రయత్నించండి.', goingBack: '↩️ వెనక్కి వెళ్తోంది...' },
        kn: { saving: '💾 ಉಳಿಸುತ್ತಿದೆ...', saved: '✅ ಉಳಿಸಲಾಗಿದೆ! ಹೋಗುತ್ತಿದೆ...', saveFailed: '❌ ಉಳಿಸಲು ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.', goingBack: '↩️ ಹಿಂದೆ ಹೋಗುತ್ತಿದೆ...' },
        bn: { saving: '💾 সংরক্ষণ করছে...', saved: '✅ সংরক্ষিত! যাচ্ছে...', saveFailed: '❌ সংরক্ষণ ব্যর্থ। আবার চেষ্টা করুন।', goingBack: '↩️ ফিরে যাচ্ছে...' }
      };
      const msgs = feedbackMessages[language] || feedbackMessages.en;

      // Check for save command in any language
      const isSaveCommand = saveCommands.some(cmd => lowerTranscript.includes(cmd.toLowerCase()));
      if (isSaveCommand) {
        setVoiceFeedback(msgs.saving);
        setLoading(true);
        try {
          const productData = { ...formData, price: parseFloat(formData.price) };
          await productsApi.update(id, productData);
          setVoiceFeedback(msgs.saved);
          setTimeout(() => navigate('/dashboard'), 500);
          return;
        } catch (err) {
          setLoading(false);
          setVoiceFeedback(msgs.saveFailed);
          setError('Failed to save. Please try again.');
          return;
        }
      }

      // Check for cancel command in any language
      const isCancelCommand = cancelCommands.some(cmd => lowerTranscript.includes(cmd.toLowerCase()));
      if (isCancelCommand) {
        setVoiceFeedback(msgs.goingBack);
        setTimeout(() => navigate('/dashboard'), 300);
        return;
      }

      try {
        const response = await aiApi.parseVoiceUpdate({
          transcript,
          currentProduct: formData,
          language
        });

        const { action, field, value, confidence } = response.data;

        // Handle save action from API
        if (action === 'save') {
          setVoiceFeedback(msgs.saving);
          setLoading(true);
          try {
            const productData = { ...formData, price: parseFloat(formData.price) };
            await productsApi.update(id, productData);
            setVoiceFeedback(msgs.saved);
            setTimeout(() => navigate('/dashboard'), 500);
            return;
          } catch (err) {
            setLoading(false);
            setVoiceFeedback(msgs.saveFailed);
            setError('Failed to save. Please try again.');
            return;
          }
        }

        // Handle cancel action from API
        if (action === 'cancel') {
          setVoiceFeedback(msgs.goingBack);
          setTimeout(() => navigate('/dashboard'), 300);
          return;
        }

        if (action === 'update' && field && value !== null && confidence > 0.5) {
          const updatedData = {
            ...formData,
            [field]: field === 'price' ? value.toString() : value
          };
          
          setFormData(updatedData);
          
          // Multi-language success feedback
          const successFeedback = {
            en: { updated: `✅ Updated ${field} to "${value}". Say "save" to save.`, short: `✅ ${field} = "${value}". Say "save".` },
            hi: { updated: `✅ ${field} को "${value}" में बदला। "सेव करो" बोलें।`, short: `✅ ${field} = "${value}". "सेव करो" बोलें।` },
            ta: { updated: `✅ ${field} "${value}" ஆக மாற்றப்பட்டது. "சேமி" சொல்லுங்கள்.`, short: `✅ ${field} = "${value}". "சேமி" சொல்லுங்கள்.` },
            te: { updated: `✅ ${field} "${value}" కి మార్చబడింది. "సేవ్ చేయి" చెప్పండి.`, short: `✅ ${field} = "${value}". "సేవ్ చేయి" చెప్పండి.` },
            kn: { updated: `✅ ${field} "${value}" ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. "ಸೇವ್ ಮಾಡು" ಹೇಳಿ.`, short: `✅ ${field} = "${value}". "ಸೇವ್ ಮಾಡು" ಹೇಳಿ.` },
            bn: { updated: `✅ ${field} "${value}" এ পরিবর্তন হয়েছে। "সেভ করো" বলুন।`, short: `✅ ${field} = "${value}". "সেভ করো" বলুন।` }
          };
          const successMsgs = successFeedback[language] || successFeedback.en;
          
          setSuccess(successMsgs.updated);
          setVoiceFeedback(successMsgs.short);
        } else if (action !== 'save' && action !== 'cancel') {
          // Multi-language "not understood" feedback
          const notUnderstoodFeedback = {
            en: 'Could not understand. Try: "update price to 500", "save", or "cancel"',
            hi: 'समझ नहीं आया। कोशिश करें: "कीमत 500 करो", "सेव करो", या "रद्द करो"',
            ta: 'புரியவில்லை. முயற்சிக்கவும்: "விலை 500 செய்", "சேமி", அல்லது "ரத்து"',
            te: 'అర్థం కాలేదు. ప్రయత్నించండి: "ధర 500 చేయి", "సేవ్ చేయి", లేదా "రద్దు చేయి"',
            kn: 'ಅರ್ಥವಾಗಲಿಲ್ಲ. ಪ್ರಯತ್ನಿಸಿ: "ಬೆಲೆ 500 ಮಾಡು", "ಸೇವ್ ಮಾಡು", ಅಥವಾ "ರದ್ದು ಮಾಡು"',
            bn: 'বুঝতে পারিনি। চেষ্টা করুন: "দাম 500 করো", "সেভ করো", বা "বাতিল করো"'
          };
          setVoiceFeedback(notUnderstoodFeedback[language] || notUnderstoodFeedback.en);
        }
      } catch (err) {
        console.error('Voice update error:', err);
        // Multi-language error feedback
        const errorFeedback = {
          en: 'Failed to process voice command. Please try again.',
          hi: 'वॉइस कमांड प्रोसेस करने में विफल। पुनः प्रयास करें।',
          ta: 'குரல் கட்டளையை செயலாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
          te: 'వాయిస్ కమాండ్ ప్రాసెస్ చేయడం విఫలమైంది. మళ్ళీ ప్రయత్నించండి.',
          kn: 'ವಾಯ್ಸ್ ಕಮಾಂಡ್ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ವಿಫಲವಾಗಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
          bn: 'ভয়েস কমান্ড প্রসেস করতে ব্যর্থ। আবার চেষ্টা করুন।'
        };
        setVoiceFeedback(errorFeedback[language] || errorFeedback.en);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      // Multi-language recognition error feedback
      const recognitionErrorFeedback = {
        en: 'Voice recognition error. Please try again.',
        hi: 'वॉइस पहचान त्रुटि। पुनः प्रयास करें।',
        ta: 'குரல் அங்கீகார பிழை. மீண்டும் முயற்சிக்கவும்.',
        te: 'వాయిస్ గుర్తింపు లోపం. మళ్ళీ ప్రయత్నించండి.',
        kn: 'ವಾಯ್ಸ್ ಗುರುತಿಸುವಿಕೆ ದೋಷ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        bn: 'ভয়েস রিকগনিশন ত্রুটি। আবার চেষ্টা করুন।'
      };
      setVoiceFeedback(recognitionErrorFeedback[language] || recognitionErrorFeedback.en);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      // Multi-language start error feedback
      const startErrorFeedback = {
        en: 'Could not start voice recognition.',
        hi: 'वॉइस पहचान शुरू नहीं हो सका।',
        ta: 'குரல் அங்கீகாரத்தை தொடங்க முடியவில்லை.',
        te: 'వాయిస్ గుర్తింపు ప్రారంభించలేకపోయింది.',
        kn: 'ವಾಯ್ಸ್ ಗುರುತಿಸುವಿಕೆ ಪ್ರಾರಂಭಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
        bn: 'ভয়েস রিকগনিশন শুরু করা যায়নি।'
      };
      setVoiceFeedback(startErrorFeedback[language] || startErrorFeedback.en);
    }
  }, [isVoiceSupported, isListening, language, formData, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price)
      };
      
      await productsApi.update(id, productData);
      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.details) {
        setFieldErrors(err.response.data.details);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('edit_product')}</h1>
            
            {/* Voice Update Button */}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={handleVoiceUpdate}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                {isListening ? t('listening_text') : `🎤 ${t('voice_update')}`}
              </button>
            )}
          </div>

          {/* Voice Feedback */}
          {voiceFeedback && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
              {voiceFeedback}
            </div>
          )}

          {error && (
            <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />
          )}
          
          {success && (
            <Alert type="success" message={success} className="mb-6" onClose={() => setSuccess('')} />
          )}

          <div className="bg-white rounded-xl shadow-md p-8">
            {/* Voice Command Help */}
            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-accent-50 rounded-lg border border-primary-100">
              <h3 className="font-semibold text-gray-800 mb-2">🎤 {t('voice_commands')}</h3>
              <p className="text-sm text-gray-600 mb-2">{t('voice_commands_desc')}</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {t('voice_example_price')}</li>
                <li>• {t('voice_example_category')}</li>
                <li>• {t('voice_example_name')}</li>
                <li>• <strong>{t('voice_example_save')}</strong></li>
                <li>• <strong>{t('voice_example_cancel')}</strong></li>
              </ul>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label={t('product_name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t('enter_product_name')}
                error={fieldErrors.name}
                required
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('description')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('describe_your_product')}
                  required
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    fieldErrors.description ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label={t('category')}
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  options={CATEGORIES}
                  placeholder={t('select_category')}
                  error={fieldErrors.category}
                  required
                />

                <Select
                  label={t('language')}
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  options={LANGUAGES}
                  error={fieldErrors.language}
                  required
                />
              </div>

              <Input
                label={`${t('price')} (₹)`}
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder={t('enter_price')}
                error={fieldErrors.price}
                required
              />

              <div className="flex gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? t('saving_text') : t('save_changes')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}
