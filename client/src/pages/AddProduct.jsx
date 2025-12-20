import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mic, Camera, Languages, Wand2, ArrowRight } from 'lucide-react';
import { productsApi, aiApi } from '../api/client';
import { Button, Input, Select, Alert, Card, CardBody } from '../components/ui';
import { Container } from '../components/layout';
import { VoiceInput } from '../components/VoiceInput';
import { ImageInput } from '../components/ImageInput';

const CATEGORIES = [
  { value: 'Grocery', label: '🛒 Grocery' },
  { value: 'Clothing', label: '👕 Clothing' },
  { value: 'Handicraft', label: '🎨 Handicraft' },
  { value: 'Electronics', label: '📱 Electronics' },
  { value: 'Other', label: '📦 Other' }
];

const LANGUAGES = [
  { value: 'English', label: '🇬🇧 English' },
  { value: 'Hindi', label: '🇮🇳 हिंदी (Hindi)' },
  { value: 'Tamil', label: '🇮🇳 தமிழ் (Tamil)' },
  { value: 'Telugu', label: '🇮🇳 తెలుగు (Telugu)' },
  { value: 'Kannada', label: '🇮🇳 ಕನ್ನಡ (Kannada)' },
  { value: 'Bengali', label: '🇮🇳 বাংলা (Bengali)' }
];

const INPUT_MODES = {
  VOICE: 'voice',
  TEXT: 'text',
  CAMERA: 'camera'
};

export function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [inputMode, setInputMode] = useState(INPUT_MODES.TEXT);
  const [promptText, setPromptText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [step, setStep] = useState(1); // 1: Input, 2: Review & Edit
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    language: 'English',
    imageUrl: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setPromptText(transcript);
  };

  const handleImageCapture = async (imageData) => {
    setCapturedImage(imageData);
    setFormData(prev => ({ ...prev, imageUrl: imageData }));
    
    // Auto-analyze image with AI
    if (imageData) {
      setGenerating(true);
      setSuccess('🔍 AI is analyzing your product image...');
      try {
        const response = await aiApi.analyzeImage({
          imageData,
          description: promptText || '' // Include any text description for better results
        });
        
        if (response.data) {
          setFormData(prev => ({
            ...prev,
            name: response.data.suggestedName || prev.name,
            description: response.data.suggestedDescription || prev.description,
            category: response.data.suggestedCategory || prev.category,
            price: response.data.suggestedPrice?.toString() || prev.price,
            imageUrl: imageData
          }));
          setSuccess('✨ AI analyzed your image! Review the suggested details below.');
          setStep(2);
        }
      } catch (err) {
        console.error('Image analysis error:', err);
        setError('Could not analyze image. Please add a description manually.');
      } finally {
        setGenerating(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      setError('Please describe your product first using voice or text');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Map language names to codes for spoken language
      const langCodeMap = {
        'English': 'en', 'Hindi': 'hi', 'Tamil': 'ta',
        'Telugu': 'te', 'Kannada': 'kn', 'Bengali': 'bn'
      };
      
      const response = await aiApi.generateProduct({
        promptText,
        language: 'English', // Always generate in English for seller platforms
        spokenLanguage: langCodeMap[formData.language] || 'en'
      });
      
      setFormData(prev => ({
        ...prev,
        name: response.data.name,
        description: response.data.description,
        category: response.data.category,
        price: response.data.suggestedPrice?.toString() || '',
        language: 'English' // Set to English since description is in English
      }));
      
      setSuccess('✨ AI generated English product listing from your voice input! Review and edit below.');
      setStep(2);
    } catch (err) {
      setError('Failed to generate product details. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

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
      
      await productsApi.create(productData);
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-8">
      <Container>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Product</h1>
            <p className="text-gray-600">
              Use voice, text, or camera to create your product listing
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Describe</span>
            </div>
            <ArrowRight className="w-6 h-6 mx-4 text-gray-300" />
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Review & Save</span>
            </div>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />}
          {success && <Alert type="success" message={success} className="mb-6" onClose={() => setSuccess('')} />}

          {/* Step 1: Input Mode Selection & Description */}
          {step === 1 && (
            <Card className="mb-6">
              <CardBody className="p-6">
                {/* Language Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Languages className="w-4 h-4 inline mr-2" />
                    Select Your Language
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, language: lang.value }))}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          formData.language === lang.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Mode Tabs */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you like to describe your product?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInputMode(INPUT_MODES.VOICE)}
                      className={`flex-1 p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        inputMode === INPUT_MODES.VOICE
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Mic className={`w-8 h-8 ${inputMode === INPUT_MODES.VOICE ? 'text-primary-500' : 'text-gray-400'}`} />
                      <span className="font-medium">Voice</span>
                      <span className="text-xs text-gray-500">Speak to describe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode(INPUT_MODES.TEXT)}
                      className={`flex-1 p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        inputMode === INPUT_MODES.TEXT
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Wand2 className={`w-8 h-8 ${inputMode === INPUT_MODES.TEXT ? 'text-primary-500' : 'text-gray-400'}`} />
                      <span className="font-medium">Text</span>
                      <span className="text-xs text-gray-500">Type description</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode(INPUT_MODES.CAMERA)}
                      className={`flex-1 p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                        inputMode === INPUT_MODES.CAMERA
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Camera className={`w-8 h-8 ${inputMode === INPUT_MODES.CAMERA ? 'text-primary-500' : 'text-gray-400'}`} />
                      <span className="font-medium">Camera</span>
                      <span className="text-xs text-gray-500">Take a photo</span>
                    </button>
                  </div>
                </div>

                {/* Voice Input */}
                {inputMode === INPUT_MODES.VOICE && (
                  <div className="mb-6">
                    <VoiceInput
                      language={formData.language}
                      onTranscript={handleVoiceTranscript}
                      placeholder={`Speak in ${formData.language} to describe your product...`}
                    />
                  </div>
                )}

                {/* Text Input */}
                {inputMode === INPUT_MODES.TEXT && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe your product
                    </label>
                    <textarea
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder={`E.g., "Handmade cotton saree with traditional block print design from Rajasthan, perfect for festivals..."`}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px]"
                    />
                  </div>
                )}

                {/* Camera/Upload Input */}
                {inputMode === INPUT_MODES.CAMERA && (
                  <div className="mb-6">
                    <ImageInput
                      onImageSelect={handleImageCapture}
                      currentImage={capturedImage}
                    />
                    {capturedImage && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Add a description for better AI results
                        </label>
                        <textarea
                          value={promptText}
                          onChange={(e) => setPromptText(e.target.value)}
                          placeholder="Describe what's in the photo..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  type="button"
                  variant="accent"
                  onClick={handleGenerate}
                  disabled={generating || !promptText.trim()}
                  className="w-full py-4 text-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {generating ? 'AI is generating...' : 'Generate Product Details with AI'}
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Step 2: Review & Edit Form */}
          {step === 2 && (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Review & Edit Details</h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep(1)}
                  >
                    ← Back to Input
                  </Button>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Image Preview */}
                  {capturedImage && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Image
                      </label>
                      <img
                        src={capturedImage}
                        alt="Product"
                        className="w-full max-w-md rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <Input
                    label="Product Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    error={fieldErrors.name}
                    required
                  />

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe your product"
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
                      label="Category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      options={CATEGORIES}
                      placeholder="Select category"
                      error={fieldErrors.category}
                      required
                    />

                    <Select
                      label="Language"
                      name="language"
                      value={formData.language}
                      onChange={handleChange}
                      options={LANGUAGES}
                      error={fieldErrors.language}
                      required
                    />
                  </div>

                  <Input
                    label="Price (₹)"
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    error={fieldErrors.price}
                    required
                  />

                  <div className="flex gap-4 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Adding Product...' : '✓ Add Product to Catalog'}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>💡 Tip: Describe your product in detail for better AI-generated listings</p>
            <p className="mt-1">Supports voice input in Hindi, Tamil, Telugu, Kannada, and Bengali</p>
          </div>
        </div>
      </Container>
    </div>
  );
}
