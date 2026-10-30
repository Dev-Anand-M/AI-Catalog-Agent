import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calculator, 
  X, 
  Check, 
  HelpCircle, 
  TrendingUp, 
  ShieldCheck, 
  IndianRupee,
  Loader2,
  Info
} from 'lucide-react';
import { aiApi } from '../api/client';

export function PricingCalculatorModal({
  isOpen,
  onClose,
  productName = '',
  category = 'Other',
  currentPrice = '',
  onApplyPricing,
  // Costs the AI Copilot already extracted from what the seller said, so a voice
  // command like "material 300, labour 200, suggest a price" lands pre-filled
  // instead of making them retype the numbers.
  initialCosts = null
}) {
  const [materialCost, setMaterialCost] = useState(String(initialCosts?.materialCost ?? '200'));
  const [labourCost, setLabourCost] = useState(String(initialCosts?.labourCost ?? '150'));
  const [packagingCost, setPackagingCost] = useState(String(initialCosts?.packagingCost ?? '30'));
  const [otherCost, setOtherCost] = useState(String(initialCosts?.otherCost ?? '20'));
  const [desiredMarginPct, setDesiredMarginPct] = useState(initialCosts?.desiredMarginPct ?? 25);

  const [pricingResult, setPricingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      calculatePrice();
    }
  }, [isOpen, materialCost, labourCost, packagingCost, otherCost, desiredMarginPct]);

  const calculatePrice = async () => {
    setLoading(true);

    try {
      const response = await aiApi.calculatePricing({
        materialCost,
        labourCost,
        packagingCost,
        otherCost,
        desiredMarginPct,
        category,
        productName
      });

      setPricingResult(response.data);
    } catch (err) {
      console.warn('Backend pricing calculation failed, using local formula:', err.message);
      // Local formula fallback
      const mat = parseFloat(materialCost) || 0;
      const lab = parseFloat(labourCost) || 0;
      const pkg = parseFloat(packagingCost) || 0;
      const oth = parseFloat(otherCost) || 0;
      const total = mat + lab + pkg + oth || 200;
      const profit = Math.round(total * (desiredMarginPct / 100));
      const rec = total + profit;
      setPricingResult({
        recommendedPrice: rec,
        priceRange: { min: Math.round(total * 1.1), max: Math.round(total * 1.45) },
        costBreakdown: {
          materialCost: mat,
          labourCost: lab,
          packagingCost: pkg,
          otherCost: oth,
          totalCost: total,
          profitAmount: profit,
          marginPct: desiredMarginPct
        },
        explanation: `With ₹${total} in total production cost, a ${desiredMarginPct}% margin yields ₹${profit} per unit. This keeps your listing competitively priced while safeguarding your craft earnings.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (pricingResult && onApplyPricing) {
      onApplyPricing({
        price: pricingResult.recommendedPrice,
        costBreakdown: pricingResult.costBreakdown,
        explanation: pricingResult.explanation
      });
    }
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const totalCost = (parseFloat(materialCost) || 0) + 
                    (parseFloat(labourCost) || 0) + 
                    (parseFloat(packagingCost) || 0) + 
                    (parseFloat(otherCost) || 0);

  return createPortal(
    <div 
      className="modal-overlay !z-[9999]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-overlay-inner py-6 sm:py-10">
        <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-tight">Explainable Dynamic Pricing</h3>
                <p className="text-xs text-slate-500 mt-0.5">Cost-plus fair pricing calculator for artisans & retailers</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Inputs Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-normal text-slate-700">Enter Your Direct Costs</span>
              <span className="text-xs font-medium text-slate-500">
                Total Direct Cost: <b className="font-mono text-slate-900">₹{totalCost}</b>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col justify-end">
                <label className="text-[11px] font-semibold text-gray-600 h-7 flex items-end mb-1.5">
                  Raw Materials
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(e.target.value)}
                    className="w-full text-sm font-semibold pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[42px]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[11px] font-semibold text-gray-600 h-7 flex items-end mb-1.5">
                  Artisan Labour
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    className="w-full text-sm font-semibold pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[42px]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[11px] font-semibold text-gray-600 h-7 flex items-end mb-1.5">
                  Packaging
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(e.target.value)}
                    className="w-full text-sm font-semibold pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[42px]"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <label className="text-[11px] font-semibold text-gray-600 h-7 flex items-end mb-1.5">
                  Other / Freight
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 select-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    className="w-full text-sm font-semibold pl-7 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[42px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desired Margin Slider */}
          <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700">Desired Profit Margin:</span>
              <span className="font-extrabold text-primary-700 font-mono text-sm">{desiredMarginPct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={desiredMarginPct}
              onChange={(e) => setDesiredMarginPct(parseInt(e.target.value))}
              className="w-full accent-primary-600 cursor-pointer h-2 bg-gray-200 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>10% (High Volume)</span>
              <span>25% (Balanced Retail)</span>
              <span>60% (Artisan Premium)</span>
            </div>
          </div>

          {/* Dynamic Result Display Card */}
          {pricingResult && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/60 pb-3">
                <div>
                  <span className="text-xs font-bold text-emerald-800 tracking-normal block">
                    Recommended Selling Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-900 font-mono">
                      ₹{pricingResult.recommendedPrice}
                    </span>
                    <span className="text-xs text-emerald-700 font-semibold">
                      (+₹{pricingResult.costBreakdown?.profitAmount} profit / unit)
                    </span>
                  </div>
                </div>

                <div className="sm:text-right bg-emerald-100/70 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
                  <span className="text-[11px] font-medium text-gray-500 block">Viable Market Range</span>
                  <span className="text-sm font-bold text-gray-800 font-mono mt-0.5 block">
                    ₹{pricingResult.priceRange?.min} — ₹{pricingResult.priceRange?.max}
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-gray-600">Cost composition</span>
                <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${(pricingResult.costBreakdown?.materialCost / (pricingResult.recommendedPrice || 1)) * 100}%` }}
                    className="bg-primary-600 h-full"
                    title="Materials"
                  />
                  <div 
                    style={{ width: `${(pricingResult.costBreakdown?.labourCost / (pricingResult.recommendedPrice || 1)) * 100}%` }}
                    className="bg-indigo-500 h-full"
                    title="Labour"
                  />
                  <div 
                    style={{ width: `${(pricingResult.costBreakdown?.packagingCost / (pricingResult.recommendedPrice || 1)) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title="Packaging"
                  />
                  <div 
                    style={{ width: `${(pricingResult.costBreakdown?.profitAmount / (pricingResult.recommendedPrice || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title="Net Margin"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 pt-1.5">
                  <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-100 px-2 py-1.5 rounded-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0"></span>
                    <span className="truncate">Materials: <b className="text-gray-900 font-mono">₹{pricingResult.costBreakdown?.materialCost}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-100 px-2 py-1.5 rounded-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                    <span className="truncate">Labour: <b className="text-gray-900 font-mono">₹{pricingResult.costBreakdown?.labourCost}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-100 px-2 py-1.5 rounded-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="truncate">Packaging: <b className="text-gray-900 font-mono">₹{pricingResult.costBreakdown?.packagingCost}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 border border-emerald-200 px-2 py-1.5 rounded-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate text-emerald-800">Margin: <b className="text-emerald-950 font-mono">₹{pricingResult.costBreakdown?.profitAmount}</b></span>
                  </div>
                </div>
              </div>

              {/* Explainability Callout */}
              <div className="p-3 bg-white/80 border border-emerald-200 rounded-lg text-xs text-gray-700 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>{pricingResult.explanation}</p>
              </div>

              {/* Trust Disclaimer */}
              <p className="text-[11px] text-gray-500 italic flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                This recommendation is for seller guidance. You remain the final authority on product pricing.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl min-h-[44px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!pricingResult}
            className="px-5 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl min-h-[44px] shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            Apply ₹{pricingResult?.recommendedPrice || 0} to Product
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
