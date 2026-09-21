import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  Upload, 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  ShoppingBag, 
  Tag, 
  Share2, 
  Sparkles, 
  Calculator, 
  Check, 
  Clock 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Container, Alert } from '../components/ui';
import { productsApi, aiApi } from '../api/client';
import { getCategoryOptions } from '../lib/categories';
import { ImageStudioModal } from '../components/ImageStudioModal';
import { PricingCalculatorModal } from '../components/PricingCalculatorModal';

// Categories are provided translated (with icon glyphs) via lib/categories
const CATEGORIES = [];

export function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const categoryOptions = getCategoryOptions(language.startsWith('en') ? 'en' : language);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Modals state
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    language: 'hi-IN',
    imageUrl: '',
    confirmationState: 'seller_confirmed',
    costBreakdown: null
  });

  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getById(id);
      const product = response.data;

      setFormData({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'Clothing',
        price: product.price ? String(product.price) : '',
        language: product.language || 'hi-IN',
        imageUrl: product.imageUrl || '',
        confirmationState: product.confirmationState || 'seller_confirmed',
        costBreakdown: product.costBreakdown || null
      });

      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    } catch (err) {
      console.error('Fetch product error:', err);
      setError(t('error_product_not_found') || 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStudioAccept = (enhancedImg) => {
    setImagePreview(enhancedImg);
    setFormData(prev => ({ ...prev, imageUrl: enhancedImg }));
    setSuccess('Studio enhanced photo updated!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handlePricingApply = (pricingData) => {
    setFormData(prev => ({
      ...prev,
      price: String(pricingData.price),
      costBreakdown: pricingData.costBreakdown
    }));
    setSuccess(`Updated price to ₹${pricingData.price} based on fair margins!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = t('error_name_required') || 'Name is required';
    if (!formData.description.trim()) errors.description = t('error_desc_required') || 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = t('error_price_required') || 'Price must be greater than 0';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setError('');

    try {
      await productsApi.update(id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        price: parseFloat(formData.price),
        language: formData.language,
        imageUrl: formData.imageUrl || null,
        confirmationState: formData.confirmationState || 'seller_confirmed',
        costBreakdown: formData.costBreakdown
      });

      setSuccess('Product changes updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Update product error:', err);
      setError(err.response?.data?.error || t('error_generic') || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500">
        Loading product details...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-zinc-200 py-3.5 px-4 sticky top-16 z-30 shadow-2xs">
        <Container className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{t('edit_product')}</h1>
              <p className="text-xs text-zinc-500 font-mono">#{id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStudioOpen(true)}
              disabled={!formData.imageUrl}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 disabled:opacity-40 border border-zinc-200 rounded-md text-xs font-medium flex items-center gap-1.5 min-h-[36px] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
              {t('enhance_ai_studio') || 'Image Studio'}
            </button>
            <button
              type="button"
              onClick={() => setIsPricingOpen(true)}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 border border-zinc-200 rounded-md text-xs font-medium flex items-center gap-1.5 min-h-[36px] transition-colors"
            >
              <Calculator className="w-3.5 h-3.5 text-zinc-600" />
              Pricing Calculator
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {error && <Alert type="error" message={error} className="mb-4" onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} className="mb-4" onClose={() => setSuccess('')} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Edit Form (7 cols) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="merchant-card p-5 space-y-4">
              {/* Trust Status Selector */}
              <div className="p-3 bg-zinc-50 border border-zinc-200/80 rounded-md space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 block">{t('review_badge')}</span>
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
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> {t('confirmed_items')}
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
                  rows={4}
                  className="w-full p-2.5 bg-white border border-zinc-200 rounded-md text-sm text-zinc-900 leading-relaxed focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900"
                  required
                />
                {fieldErrors.description && <p className="text-xs text-rose-600 mt-1">{fieldErrors.description}</p>}
              </div>

              {/* Photo Upload & Enhancement */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">{t('product_image_optional')}</label>
                  {imagePreview && (
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

                {imagePreview ? (
                  <div className="relative inline-block border border-zinc-200 rounded-md bg-zinc-50 p-2">
                    <img src={imagePreview} alt="Product" className="h-28 w-28 object-cover rounded" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-zinc-900 text-white p-1 rounded-full text-xs hover:bg-zinc-800 shadow-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="border border-dashed border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 p-3.5 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span className="text-xs font-medium text-zinc-700">{t('upload_photo')}</span>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-secondary text-xs px-4"
              >
                {t('cancel') || 'Cancel'}
              </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 py-2 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? (t('saving_text') || 'Updating...') : (t('save_changes') || 'Save Product Changes')}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="merchant-card p-4 sticky top-28">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 border-b border-zinc-100 pb-2.5">
                <ShoppingBag className="w-3.5 h-3.5 text-zinc-700" />
                {t('live_buyer_preview')}
              </h3>

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
                  <h4 className="text-sm font-semibold text-zinc-900 tracking-tight truncate">
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

                  <div className="pt-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full py-2 bg-zinc-900 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 opacity-95 cursor-default"
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
        image={formData.imageUrl}
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
