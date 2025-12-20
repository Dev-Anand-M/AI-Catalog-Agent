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

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('🎤 Listening... Say "update price to 500" or "change category to clothing"');
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      const lowerTranscript = transcript.toLowerCase();
      setVoiceFeedback(`Heard: "${transcript}" - Processing...`);

      // Check for "save" or "save changes" command
      if (lowerTranscript.includes('save') || lowerTranscript.includes('done') || lowerTranscript.includes('finish')) {
        setVoiceFeedback('💾 Saving changes...');
        setLoading(true);
        try {
          const productData = { ...formData, price: parseFloat(formData.price) };
          await productsApi.update(id, productData);
          setVoiceFeedback('✅ Saved! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 500);
          return;
        } catch (err) {
          setLoading(false);
          setVoiceFeedback('❌ Save failed. Please try again.');
          setError('Failed to save. Please try again.');
          return;
        }
      }

      // Check for "cancel" or "go back" command
      if (lowerTranscript.includes('cancel') || lowerTranscript.includes('go back') || lowerTranscript.includes('back')) {
        setVoiceFeedback('↩️ Going back...');
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

        if (action === 'update' && field && value !== null && confidence > 0.5) {
          const updatedData = {
            ...formData,
            [field]: field === 'price' ? value.toString() : value
          };
          
          setFormData(updatedData);
          setSuccess(`✅ Updated ${field} to "${value}". Say "save" to save changes.`);
          setVoiceFeedback(`✅ ${field} = "${value}". Say "save" to save.`);
        } else {
          setVoiceFeedback('Could not understand. Try: "update price to 500", "save", or "cancel"');
        }
      } catch (err) {
        console.error('Voice update error:', err);
        setVoiceFeedback('Failed to process voice command. Please try again.');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceFeedback('Voice recognition error. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (err) {
      setVoiceFeedback('Could not start voice recognition.');
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
