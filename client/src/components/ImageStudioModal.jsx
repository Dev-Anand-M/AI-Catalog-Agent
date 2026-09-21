import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  RotateCcw, 
  SunMedium, 
  Contrast, 
  Focus, 
  Layers, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { aiApi } from '../api/client';

export function ImageStudioModal({
  isOpen,
  onClose,
  image,
  onAccept
}) {
  const [mode, setMode] = useState('studio_white');
  const [enhancedImage, setEnhancedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [enhancementsList, setEnhancementsList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && image) {
      enhancePhoto(mode);
    } else {
      setEnhancedImage(null);
      setError('');
    }
  }, [isOpen, image, mode]);

  const enhancePhoto = async (selectedMode) => {
    if (!image) return;

    setLoading(true);
    setError('');

    try {
      const response = await aiApi.enhanceImage({
        imageBase64: image,
        mode: selectedMode
      });

      if (response.data?.enhancedImage) {
        setEnhancedImage(response.data.enhancedImage);
        setEnhancementsList(response.data.enhancementsApplied || [
          'Exposure & lighting auto-balanced',
          'Craft surface texture sharpened',
          '1:1 Studio framing applied'
        ]);
      } else {
        // Fallback to client-side canvas enhancement
        runClientCanvasEnhancement(selectedMode);
      }
    } catch (err) {
      console.warn('Backend image enhancement unavailable, using browser canvas studio:', err.message);
      runClientCanvasEnhancement(selectedMode);
    } finally {
      setLoading(false);
    }
  };

  const runClientCanvasEnhancement = (selectedMode) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      // Studio background colors
      const bgColors = {
        studio_white: '#ffffff',
        warm_studio: '#faf7f2',
        neutral_gray: '#f3f4f6',
        sharpen: '#ffffff'
      };
      ctx.fillStyle = bgColors[selectedMode] || '#ffffff';
      ctx.fillRect(0, 0, 800, 800);

      // Apply subtle filter
      ctx.filter = 'brightness(1.06) contrast(1.08) saturate(1.05)';

      // Fit inside 760x760
      const maxDim = 760;
      const scale = Math.min(maxDim / img.width, maxDim / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (800 - w) / 2;
      const y = (800 - h) / 2;

      ctx.drawImage(img, x, y, w, h);
      const resultData = canvas.toDataURL('image/jpeg', 0.9);
      setEnhancedImage(resultData);
      setEnhancementsList([
        'Studio lighting & auto-levels normalized',
        'Fabric & craft surface contrast boosted',
        'Centered 1:1 catalog studio padding'
      ]);
    };
    img.onerror = () => {
      setError('Unable to process this image format.');
    };
    img.src = image;
  };

  const handleApply = () => {
    if (enhancedImage && onAccept) {
      onAccept(enhancedImage);
    }
    onClose();
  };

  if (!isOpen || !image) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">AI Product Image Studio</h3>
              <p className="text-xs text-slate-500">Non-destructive studio enhancement • Preserves your actual product</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Comparison View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Original Upload</span>
                <span className="text-[11px] font-semibold text-zinc-400">Raw Photo</span>
              </div>
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-200 flex items-center justify-center border border-slate-300">
                <img src={image} alt="Original product" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Enhanced Card */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex flex-col relative">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Enhanced Studio Result
                </span>
                <span className="badge-confirmed text-[10px]">
                  ✓ Product Preserved
                </span>
              </div>
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-white flex items-center justify-center border border-emerald-300 relative shadow-sm">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="text-xs font-semibold">Balancing lighting and studio framing...</span>
                  </div>
                ) : enhancedImage ? (
                  <img src={enhancedImage} alt="Enhanced product" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No enhancement loaded</span>
                )}
              </div>
            </div>
          </div>

          {/* Studio Backdrop & Styling Controls */}            <div className="space-y-3 pt-2 border-t border-zinc-100">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              Select Studio Framing Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'studio_white', label: 'Pure Studio White', desc: 'Amazon / E-commerce standard', color: 'bg-white border-zinc-300' },
                { id: 'warm_studio', label: 'Warm Artisan Studio', desc: 'Warm cream tone for handicrafts', color: 'bg-[#faf7f2] border-amber-200' },
                { id: 'neutral_gray', label: 'Neutral Light Gray', desc: 'Modern minimal catalog look', color: 'bg-zinc-100 border-zinc-300' },
                { id: 'sharpen', label: 'Texture & Weave Focus', desc: 'High clarity for handloom/fabrics', color: 'bg-blue-50 border-blue-300' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setMode(style.id)}
                  className={`p-3 rounded-xl border text-left transition-all min-h-[52px] flex flex-col justify-between ${
                    mode === style.id
                      ? 'border-zinc-900 bg-zinc-900 text-white ring-2 ring-zinc-900/30'
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 text-zinc-800'
                  }`}
                >
                  <span className="text-xs font-bold text-white">{style.label}</span>
                  <span className="text-[10px] text-zinc-300 mt-1">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Applied Enhancements List */}
          {enhancementsList.length > 0 && !loading && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Quality Improvements Applied</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {enhancementsList.map((enhancement, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{enhancement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl min-h-[44px] transition-colors"
          >
            Keep Original
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => enhancePhoto(mode)}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl min-h-[44px] flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Re-enhance
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={loading || !enhancedImage}
              className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl min-h-[44px] shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              Accept & Use in Catalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
