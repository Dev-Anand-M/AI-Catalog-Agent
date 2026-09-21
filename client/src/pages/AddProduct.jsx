import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Upload, 
  X, 
  Languages, 
  Keyboard, 
  Mic, 
  CheckCircle2, 
  ShoppingBag, 
  Tag, 
  Share2,
  Calculator,
  ImageIcon,
  ShieldCheck,
  Clock,
  Check,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Container, Alert } from '../components/ui';
import { VoiceInput } from '../components/VoiceInput';
import { RegionalKeyboard } from '../components/RegionalKeyboard';
import { productsApi, aiApi, auditApi } from '../api/client';
import { getCategoryOptions } from '../lib/categories';
import { ImageStudioModal } from '../components/ImageStudioModal';
import { PricingCalculatorModal } from '../components/PricingCalculatorModal';

const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)', native: 'English' },
  { value: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { value: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { value: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { value: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { value: 'bn-IN', label: 'Bengali', native: 'বাংলা' }
];

// Categories are provided translated (with icon glyphs) via lib/categories
const CATEGORIES = [];

export function AddProduct() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const categoryOptions = getCategoryOptions(language.startsWith('en') ? 'en' : language);

  const [step, setStep] = useState(1);
  const [promptText, setPromptText] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  // Modals state
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Clothing',
    price: '',
    language: 'hi-IN',
    imageUrl: '',
    confirmationState: 'seller_confirmed',
    costBreakdown: null
  });

  const textareaRef = useRef(null);

  const handleVoiceTranscript = (transcript) => {
    setPromptText(prev => prev ? `${prev} ${transcript}` : transcript);
  };

  const handleKeyboardChar = (char) => {
    setPromptText(prev => prev + char);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImage(reader.result);
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProductImage(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleStudioAccept = (enhancedImg) => {
    setProductImage(enhancedImg);
    setFormData(prev => ({ ...prev, imageUrl: enhancedImg }));
    setSuccess('Enhanced studio image applied to product!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePricingApply = (pricingData) => {
    setFormData(prev => ({
      ...prev,
      price: String(pricingData.price),
      costBreakdown: pricingData.costBreakdown
    }));
    setSuccess(`Dynamic price of ₹${pricingData.price} applied with fair margin!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      setError(t('error_enter_description') || 'Please describe your product using voice or text');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const response = await aiApi.generateProduct({
        promptText: promptText,
        language: formData.language
      });

      const data = response.data;

      setFormData(prev => ({
        ...prev,
        name: data.name || '',
        description: data.description || '',
        category: data.category || 'Clothing',
        price: data.suggestedPrice || data.price ? String(data.suggestedPrice || data.price) : '499',
        imageUrl: productImage || prev.imageUrl || '',
        confirmationState: 'ai_suggested' // Mark as AI suggested initially
      }));

      setStep(2);
      setSuccess('AI suggested listing generated. Please review and confirm below.');
    } catch (err) {
      console.error('Generation error:', err);
      setFormData(prev => ({
        ...prev,
        name: promptText.slice(0, 40),
        description: promptText,
        category: 'Other',
        price: '499',
        confirmationState: 'needs_review'
      }));
      setStep(2);
    } finally {
      setGenerating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = t('error_name_required') || 'Product name is required';
    if (!formData.description.trim()) errors.description = t('error_desc_required') || 'Description is required';
    if (!formData.category) errors.category = t('error_category_required') || 'Category is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = t('error_price_required') || 'Valid price is required';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      await productsApi.create({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        language: formData.language,
        imageUrl: formData.imageUrl || null,
        confirmationState: formData.confirmationState || 'seller_confirmed',
        costBreakdown: formData.costBreakdown
      });

      setSuccess('Product verified and saved to catalog!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.error || t('error_generic') || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-zinc-200 py-3.5 px-4 sticky top-16 z-30 shadow-2xs">
        <Container className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{t('add_new_product') || 'Add New Product'}</h1>
              <p className="text-xs text-zinc-500 font-medium">Step {step} of 2: {step === 1 ? t('step_voice_desc') : t('step_review_desc')}</p>
            </div>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                step === 1 
                  ? 'bg-zinc-900 text-white shadow-xs' 
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {t('step_voice_input')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (promptText.trim()) handleGenerate();
                else setStep(2);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                step === 2 
                  ? 'bg-zinc-900 text-white shadow-xs' 
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {t('step_review_confirm')}
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {error && <Alert type="error" message={error} className="mb-4" onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} className="mb-4" onClose={() => setSuccess('')} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {step === 1 ? (
              <div className="merchant-card p-5 space-y-5">
                {/* Language Picker */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-zinc-700" />
                    {t('select_language') || 'Language Spoken'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, language: lang.value }))}
                        className={`p-2.5 rounded-md border text-left transition-all min-h-[44px] ${
                          formData.language === lang.value
                            ? 'border-zinc-900 bg-zinc-900 text-white font-medium shadow-2xs'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div className="font-semibold text-xs">{lang.native}</div>
                        <div className={`text-[10px] ${formData.language === lang.value ? 'text-zinc-300' : 'text-zinc-500'}`}>{lang.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Input Section */}
                <div className="bg-zinc-50/70 border border-zinc-200/80 p-5 rounded-lg text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">{t('tap_mic_speak')}</span>
                  </div>
                  <VoiceInput onTranscript={handleVoiceTranscript} language={formData.language} />
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    {t('voice_tip')}
                  </p>
                </div>

                {/* Description Input Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      {t('product_description_input') || 'Product Description (Voice Transcript / Text)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKeyboard(!showKeyboard)}
                      className="text-xs text-zinc-700 hover:text-zinc-900 flex items-center gap-1 font-medium hover:underline"
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      {showKeyboard ? t('hide_keyboard') || 'Hide Keyboard' : t('show_keyboard') || 'Regional Keyboard'}
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Speak into microphone or type your product details here..."
                    rows={4}
                    className="w-full p-3 bg-white border border-zinc-200 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  />
                </div>

                {showKeyboard && (
                  <RegionalKeyboard language={formData.language} onCharClick={handleKeyboardChar} />
                )}

                {/* Photo Upload Section & Studio Action */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                      {t('product_image_optional') || 'Product Photo (Optional)'}
                    </label>
                    {productImage && (
                      <button
                        type="button"
                        onClick={() => setIsStudioOpen(true)}
                        className="text-xs font-medium text-zinc-800 hover:text-zinc-900 flex items-center gap-1 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                        Enhance in AI Studio
                      </button>
                    )}
                  </div>

                  {productImage ? (
                    <div className="relative inline-block border border-zinc-200 rounded-lg bg-white p-2">
                      <img src={productImage} alt="Product preview" className="h-36 w-36 object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-zinc-900 text-white p-1 rounded-full text-xs shadow-xs hover:bg-zinc-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 p-6 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                      <span className="text-xs font-semibold text-zinc-800">{t('upload_photo') || 'Upload Product Photo'}</span>
                      <span className="text-[11px] text-zinc-400 mt-0.5">PNG, JPG, WebP up to 10MB</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating || !promptText.trim()}
                  className="w-full btn-primary py-2.5 text-sm font-semibold shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-1.5 text-zinc-300" />
                  {generating ? (t('generating_details') || 'Creating Smart Listing...') : (t('generate_details') || 'Generate Product Listing')}
                </button>
              </div>
            ) : (
              /* Step 2 Form Review */
              <form onSubmit={handleSubmit} className="merchant-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                  <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {t('step_review_desc')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline font-medium"
                  >
                    {t('back_to_voice')}
                  </button>
                </div>

                {/* Trust Status Selector */}
                <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-md space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 block">{t('seller_verification_state')}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, confirmationState: 'seller_confirmed' }))}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                        formData.confirmationState === 'seller_confirmed'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> ✓ {t('confirmed_items')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, confirmationState: 'needs_review' }))}
                      className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                        formData.confirmationState === 'needs_review'
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {t('needs_review_items')}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">{t('product_name')}</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter clear, professional title"
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                    required
                  />
                  {fieldErrors.name && <p className="text-xs text-rose-600 mt-1">{fieldErrors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">{t('category')}</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                      required
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">{t('price_label')} (₹)</label>
                      <button
                        type="button"
                        onClick={() => setIsPricingOpen(true)}
                        className="text-xs font-medium text-zinc-700 hover:text-zinc-900 flex items-center gap-1 hover:underline"
                      >
                        <Calculator className="w-3.5 h-3.5 text-zinc-500" />
                        {t('pricing_calculator')}
                      </button>
                    </div>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="e.g. 850"
                      step="0.01"
                      min="0"
                      className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm font-semibold font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 min-h-[40px]"
                      required
                    />
                    {fieldErrors.price && <p className="text-xs text-rose-600 mt-1">{fieldErrors.price}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">{t('product_description_input')}</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Product features, dimensions, material..."
                    rows={4}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm text-zinc-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                    required
                  />
                  {fieldErrors.description && <p className="text-xs text-rose-600 mt-1">{fieldErrors.description}</p>}
                </div>

                {/* Photo & Image Studio Action in Step 2 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">{t('product_image_optional')}</label>
                    {productImage && (
                      <button
                        type="button"
                        onClick={() => setIsStudioOpen(true)}
                        className="text-xs font-medium text-zinc-800 hover:text-zinc-900 flex items-center gap-1 bg-zinc-100 px-2 py-1 rounded-md border border-zinc-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                        {t('enhance_ai_studio')}
                      </button>
                    )}
                  </div>
                  {productImage ? (
                    <div className="relative inline-block border border-zinc-200 rounded-md bg-zinc-50 p-2">
                      <img src={productImage} alt="Product" className="h-24 w-24 object-cover rounded" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-zinc-900 text-white p-1 rounded-full text-xs hover:bg-zinc-800 shadow-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 p-3.5 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs font-medium text-zinc-700">{t('upload_photo')}</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary text-xs px-4"
                  >
                    {t('back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                  >
                    {loading ? t('saving_to_catalog') : (t('add_to_catalog') || '✓ Save to Catalog')}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Right Column: Customer Card Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="merchant-card p-4 sticky top-28">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-100">
                <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-700" />
                  {t('live_buyer_preview')}
                </h3>
                <span className="badge-confirmed text-[10px]">
                  {t('real_preview')}
                </span>
              </div>

              {/* Customer E-Commerce Card */}
              <div className="bg-white border border-zinc-200/90 rounded-lg overflow-hidden shadow-2xs">
                <div className="relative aspect-square w-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                      <ShoppingBag className="w-8 h-8 mb-1 stroke-[1.5] text-zinc-300" />
                      <span className="text-xs font-medium">{t('add_photo_preview')}</span>
                    </div>
                  )}
                  {formData.category && (
                    <span className="absolute top-2.5 left-2.5 bg-white/95 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded text-[11px] font-medium">
                      {formData.category}
                    </span>
                  )}
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-medium ${
                    formData.confirmationState === 'seller_confirmed' ? 'badge-confirmed' : 'badge-review'
                  }`}>
                    {formData.confirmationState === 'seller_confirmed' ? t('verified_by_seller') : (t('review_badge') || 'Needs Review')}
                  </span>
                </div>

                <div className="p-3.5 space-y-2">
                  <h4 className="text-sm font-semibold text-zinc-900 tracking-tight leading-snug line-clamp-2">
                    {formData.name || t('sample_product_title')}
                  </h4>

                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                    {formData.description || t('sample_product_desc')}
                  </p>

                  <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl font-bold text-zinc-900 font-mono">
                      ₹{formData.price || '0.00'}
                    </span>
                  </div>

                  {/* Buyer WhatsApp Order Action */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-zinc-900 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 shadow-2xs opacity-95 cursor-default"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {t('order_via_whatsapp')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Image Studio Modal */}
      <ImageStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        image={productImage}
        onAccept={handleStudioAccept}
      />

      {/* Pricing Calculator Modal */}
      <PricingCalculatorModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        productName={formData.name}
        category={formData.category}
        currentPrice={formData.price}
        onApplyPricing={handlePricingApply}
      />
    </div>
  );
}
