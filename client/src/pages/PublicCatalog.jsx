import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Store, 
  Package, 
  Share2, 
  Smartphone, 
  QrCode, 
  X, 
  MessageCircle, 
  ShoppingBag,
  Search,
  CheckCircle2,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { catalogApi } from '../api/client';
import { Container } from '../components/layout';
import { Alert, Button } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryLabel, getCategoryIcon, getCategoryColor, CATEGORIES } from '../lib/categories';
import { LanguageSelector } from '../components/LanguageSelector';

export function PublicCatalog() {
  const { userId } = useParams();
  const { t, language } = useLanguage();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    loadCatalog();
  }, [userId]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const response = await catalogApi.get(userId);
      const data = response.data;
      
      setCatalog({
        seller: data.seller || data.user || { name: 'Artisan Store' },
        products: data.products || [],
        payment: data.payment || null
      });
    } catch (err) {
      setError(err.response?.data?.error || t('catalog_not_found'));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${catalog?.seller?.name || 'Artisan'}'s Catalog`,
          text: 'Check out these handcrafted products and order directly!',
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleContactSeller = (product) => {
    const sellerName = catalog?.seller?.name || 'Seller';
    const message = `Namaste ${sellerName}! I found this product in your digital catalog:\n\n*${product.name}*\nCategory: ${product.category}\nPrice: ₹${product.price}\n\nI would like to place an order. Please let me know availability and delivery details!`;
    
    // Check if phone number exists in UPI or payment settings
    const upiList = catalog?.payment?.upi || [];
    const firstUpi = upiList[0];
    const phoneMatch = firstUpi?.upiId?.match(/^(\d{10})/);
    const phoneNumber = phoneMatch ? phoneMatch[1] : '';

    const whatsappUrl = phoneNumber 
      ? `https://wa.me/91${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">{t('loading') || 'Loading catalog storefront...'}</p>
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <Container>
          <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <Package className="w-16 h-16 mx-auto text-slate-400 stroke-[1.5]" />
            <h1 className="text-xl font-bold text-slate-900">{t('catalog_not_found')}</h1>
            <p className="text-slate-500 text-sm">{error || t('catalog_unavailable')}</p>
          </div>
        </Container>
      </div>
    );
  }

  // Build category list from known categories present in the catalog
  const categories = ['ALL', ...CATEGORIES.map(c => c.value).filter(v => catalog.products.some(p => p.category === v || p.category === (v === 'Handicraft' ? 'Handicrafts' : v)))];
  // Also include any unknown categories present in products
  for (const p of catalog.products) {
    if (p.category && !categories.includes(p.category)) categories.push(p.category);
  }

  const filteredProducts = catalog.products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 pb-16">
      {/* Language Bar for Storefront Customers */}
      <div className="bg-white border-b border-zinc-200/80 py-2.5 px-4 shadow-2xs">
        <Container className="flex items-center justify-center">
          <LanguageSelector variant="buttons" />
        </Container>
      </div>

      {/* Storefront Hero Banner */}
      <div className="bg-white border-b border-zinc-200/80 py-8 px-4 shadow-2xs">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-900 text-white rounded-xl shadow-xs mb-1">
              <Store className="w-6 h-6 stroke-[2]" />
            </div>
            
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('verified_merchant')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">{catalog.seller.name || t('seller_name') || 'Artisan Store'}</h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-lg mx-auto">
                {t('browse_catalog_desc')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="btn-secondary text-xs font-medium py-1.5 px-3 min-h-[38px] flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                {copied ? (t('link_copied') || '✓ Link Copied!') : t('share_storefront')}
              </button>

              {catalog.payment && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200/80 text-zinc-900 text-xs font-medium rounded-lg border border-zinc-200/80 flex items-center gap-1.5 transition-colors min-h-[38px]"
                >
                  <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
                  {t('view_payment_options')}
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Catalog Search & Category Filters */}
      <Container className="py-6">
        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 mb-6 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_products')}
                className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 min-h-[38px] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  {cat === 'ALL' ? (
                    <>{t('all_categories')}</>
                  ) : (
                    <>
                      <span aria-hidden="true">{getCategoryIcon(cat)}</span>
                      {getCategoryLabel(cat, language)}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-zinc-200/80 rounded-xl p-12 text-center space-y-3 shadow-2xs">
            <ShoppingBag className="w-10 h-10 text-zinc-300 mx-auto stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-zinc-900">{t('no_products_found')}</h3>
            <p className="text-zinc-500 text-xs">{t('no_products_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="merchant-card overflow-hidden flex flex-col justify-between hover:border-zinc-300 transition-all cursor-pointer group"
                onClick={() => setSelectedProduct(product)}
              >
                <div>
                  <div className="relative aspect-square bg-zinc-100 border-b border-zinc-200/80 overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-xs">
                        <ShoppingBag className="w-7 h-7 mb-1 stroke-[1.5] text-zinc-300" />
                        {t('handcrafted_item')}
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm border px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-2xs ${getCategoryColor(product.category)}`}>
                      <span aria-hidden="true">{getCategoryIcon(product.category)}</span>
                      {getCategoryLabel(product.category, language)}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <h3 className="text-sm font-semibold text-zinc-950 tracking-tight line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-lg font-bold text-zinc-950 font-mono">
                        ₹{parseFloat(product.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 pt-0 space-y-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactSeller(product);
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 shadow-xs transition-colors min-h-[38px]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {t('order_via_whatsapp')}
                  </button>

                  {/* Buyers who would rather check out on the Shopify storefront
                      get a real link. Shown only for products the seller has
                      actually synced, so the button never leads to a 404. */}
                  {product.shopifyUrl && (
                    <a
                      href={product.shopifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors min-h-[38px]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {t('open_in_shopify', 'Open in Shopify')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-overlay-inner">
          <div className="modal-panel max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">{selectedProduct.name}</h3>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="aspect-square w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-12 h-12 m-auto text-slate-300 mt-20" />
                )}
              </div>

              <div>
                <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${getCategoryColor(selectedProduct.category)}`}>
                  <span aria-hidden="true">{getCategoryIcon(selectedProduct.category)}</span>
                  {getCategoryLabel(selectedProduct.category, language)}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name}</h2>
                <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">₹{parseFloat(selectedProduct.price).toFixed(2)}</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-500">{t('description')}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{selectedProduct.description}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="btn-secondary text-xs px-4"
              >
                {t('cancel')}
              </button>
              {selectedProduct.shopifyUrl && (
                <a
                  href={selectedProduct.shopifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs px-4"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                  {t('open_in_shopify', 'Open in Shopify')}
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleContactSeller(selectedProduct)}
                className="flex-1 btn-success text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                {t('order_via_whatsapp')}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Payment Information Modal — the panel is free to grow past the viewport;
          the overlay scrolls, so the whole UPI list stays reachable. */}
      {showPaymentModal && catalog.payment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-overlay-inner">
          <div
            className="modal-panel max-w-md p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                {t('payment_info_modal')}
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {catalog.payment.qr && (
              <div className="text-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs font-semibold text-slate-600 mb-2">{t('scan_pay') || 'Scan QR to Pay via Any UPI App'}</p>
                <img src={catalog.payment.qr} alt="UPI QR" className="w-44 h-44 mx-auto object-contain bg-white p-2 rounded-lg border border-slate-200" />
              </div>
            )}

            {catalog.payment.upi && catalog.payment.upi.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600 uppercase">{t('upi')}</span>
                {catalog.payment.upi.map((u, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold font-mono text-slate-900">{u.upiId}</span>
                    <span className="text-slate-500">{u.name || 'Merchant'}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="w-full btn-secondary text-xs"
            >
              {t('cancel')}
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
