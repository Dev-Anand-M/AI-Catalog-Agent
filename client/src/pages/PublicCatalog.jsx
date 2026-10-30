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
  CreditCard,
  Building2,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import { catalogApi } from '../api/client';
import { Container } from '../components/layout';
import { Alert, Button } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { getCategoryLabel, CategoryIcon, getCategoryColor, CATEGORIES } from '../lib/categories';
import { LanguageSelector } from '../components/LanguageSelector';

export function cleanDescription(desc) {
  if (!desc || typeof desc !== 'string') return '';
  return desc.replace(/<!--META:[\s\S]*?-->/g, '').trim();
}

export function PublicCatalog() {
  const { userId } = useParams();
  const { t, language } = useLanguage();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState('upi');
  const [copiedPaymentField, setCopiedPaymentField] = useState(null);
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
      
      const rawPayment = data.payment || data.paymentSettings || null;
      const normalizedPayment = rawPayment ? {
        upi: rawPayment.upi || rawPayment.upiData || [],
        bank: rawPayment.bank || rawPayment.bankAccount || null,
        qr: rawPayment.qr || rawPayment.qrCodeUrl || null,
        phone: rawPayment.phone || rawPayment.phoneNumber || null
      } : null;

      const rawProducts = Array.isArray(data.products) ? data.products : [];
      const cleanProducts = rawProducts.map(p => ({
        ...p,
        description: cleanDescription(p.description)
      }));

      setCatalog({
        seller: data.seller || data.user || { name: 'Artisan Store' },
        products: cleanProducts,
        payment: normalizedPayment
      });

      if (normalizedPayment?.upi && normalizedPayment.upi.length > 0) {
        setPaymentTab('upi');
      } else if (normalizedPayment?.qr) {
        setPaymentTab('qr');
      } else if (normalizedPayment?.bank) {
        setPaymentTab('bank');
      }
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
    
    // Prefer the seller's saved WhatsApp number; fall back to a 10-digit UPI
    // handle for stores that never filled the phone field in.
    const savedPhone = (catalog?.payment?.phone || '').replace(/\D/g, '');
    const upiDigits = (catalog?.payment?.upi || [])[0]?.upiId?.match(/^(\d{10})/)?.[1] || '';
    const rawPhone = savedPhone || upiDigits;
    // A bare 10-digit number is an Indian local number; wa.me wants the prefix.
    const phoneNumber = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
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
    <div className="min-h-screen bg-gray-50/50 text-gray-900 pb-16">
      {/* Language Bar for Storefront Customers */}
      <div className="bg-white border-b border-gray-200/80 py-2.5 px-4 shadow-2xs">
        <Container className="flex items-center justify-center">
          <LanguageSelector variant="buttons" />
        </Container>
      </div>

      {/* Storefront Hero Banner */}
      <div className="bg-white border-b border-gray-200/80 py-8 px-4 shadow-2xs">
        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-xl shadow-xs mb-1">
              <Store className="w-6 h-6 stroke-[2]" />
            </div>
            
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {t('verified_merchant')}
                </span>
                {(catalog?.seller?.name?.includes('Ramesh') || catalog?.seller?.id === 'demo-artisan-1' || catalog?.seller?.id === 1 || String(catalog?.seller?.id) === '1') && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Platform Showcase Storefront
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{catalog.seller.name || t('seller_name') || 'Artisan Store'}</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-lg mx-auto">
                {t('browse_catalog_desc')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleShare}
                className="btn-secondary text-xs font-medium py-1.5 px-3 min-h-[38px] flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-gray-500" />
                {copied ? (t('link_copied') || '✓ Link Copied!') : t('share_storefront')}
              </button>

              {catalog.payment && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 text-gray-900 text-xs font-medium rounded-lg border border-gray-200/80 flex items-center gap-1.5 transition-colors min-h-[38px]"
                >
                  <CreditCard className="w-3.5 h-3.5 text-gray-600" />
                  {t('view_payment_options')}
                </button>
              )}
            </div>
          </div>
        </Container>
      </div>

      {/* Catalog Search & Category Filters */}
      <Container className="py-6">
        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 mb-6 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_products')}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[38px] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    selectedCategory === cat
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {cat === 'ALL' ? (
                    <>{t('all_categories')}</>
                  ) : (
                    <>{getCategoryLabel(cat, language)}</>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200/80 rounded-xl p-12 text-center space-y-3 shadow-2xs">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-gray-900">{t('no_products_found')}</h3>
            <p className="text-gray-500 text-xs">{t('no_products_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="merchant-card overflow-hidden flex flex-col justify-between cursor-pointer group"
                onClick={() => setSelectedProduct(product)}
              >
                <div>
                  <div className="relative aspect-square bg-gray-100 border-b border-gray-200/80 overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-[1.04]" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                        <ShoppingBag className="w-7 h-7 mb-1 stroke-[1.5] text-gray-300" />
                        {t('handcrafted_item')}
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm border px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs ${getCategoryColor(product.category)}`}>
                      {getCategoryLabel(product.category, language)}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <h3 className="text-sm font-semibold text-gray-900 tracking-tight line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {cleanDescription(product.description)}
                    </p>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-lg font-bold text-gray-900 font-mono">
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
                    className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-all min-h-[38px] hover:shadow-[0_8px_18px_-10px_rgba(13,148,136,0.7)]"
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
                      className="w-full py-2 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-emerald-800 border border-emerald-200 font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors min-h-[38px]"
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
                className="icon-btn p-1.5"
                aria-label={t('close', 'Close')}
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
                  <CategoryIcon category={selectedProduct.category} className="w-3.5 h-3.5" />
                  {getCategoryLabel(selectedProduct.category, language)}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedProduct.name}</h2>
                <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">₹{parseFloat(selectedProduct.price).toFixed(2)}</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">{t('description')}</span>
                <p className="text-xs text-slate-700 leading-relaxed">{cleanDescription(selectedProduct.description)}</p>
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
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleContactSeller(selectedProduct)}
                className="flex-1 btn-success text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                {t('order_via_whatsapp')}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Payment Information Modal */}
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
                  {t('payment_info_modal') || 'Payment Options'}
                </h3>
                <button 
                  onClick={() => setShowPaymentModal(false)} 
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  aria-label={t('close', 'Close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPaymentTab('upi')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    paymentTab === 'upi'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>UPI & QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentTab('bank')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    paymentTab === 'bank'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Bank Transfer</span>
                </button>
              </div>

              {/* TAB 1: UPI & QR Code */}
              {paymentTab === 'upi' && (
                <div className="space-y-3.5">
                  {catalog.payment.upi && catalog.payment.upi.length > 0 ? (
                    <>
                      {/* Auto-Generated QR Code for Primary UPI */}
                      {(() => {
                        const primaryUpi = catalog.payment.upi[0];
                        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=${primaryUpi.upiId}&pn=${encodeURIComponent(primaryUpi.name || catalog.seller.name || 'Merchant')}&cu=INR`)}`;
                        return (
                          <div className="text-center p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2.5">
                            <div className="w-44 h-44 mx-auto bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-center">
                              <img
                                src={qrSrc}
                                alt="UPI Payment QR"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-slate-800">Scan to Pay via Any UPI App</p>
                              <p className="text-[11px] text-slate-500">Google Pay • PhonePe • Paytm • BHIM • Banking UPI</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* UPI Handles list with Copy & Pay in App */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">UPI Handles</span>
                        {catalog.payment.upi.map((u, i) => (
                          <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold font-mono text-slate-900 block truncate">{u.upiId}</span>
                              <span className="text-[11px] text-slate-500 block truncate">{u.name || catalog.seller.name || 'Merchant'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.upiId);
                                  setCopiedPaymentField(`upi-${i}`);
                                  setTimeout(() => setCopiedPaymentField(null), 2000);
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium rounded-lg text-xs flex items-center gap-1 transition-colors"
                              >
                                {copiedPaymentField === `upi-${i}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                              <a
                                href={`upi://pay?pa=${encodeURIComponent(u.upiId)}&pn=${encodeURIComponent(u.name || catalog.seller.name || 'Merchant')}&cu=INR`}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors"
                              >
                                Pay
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                      No UPI ID configured by merchant.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Bank Transfer */}
              {paymentTab === 'bank' && (
                <div className="space-y-3">
                  {catalog.payment.bank && (catalog.payment.bank.accountNumber || catalog.payment.bank.ifsc || catalog.payment.bank.accountName || catalog.payment.bank.bankName) ? (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                      {catalog.payment.bank.bankName && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                          <span className="text-slate-500 font-medium">Bank Name</span>
                          <span className="font-semibold text-slate-900">{catalog.payment.bank.bankName}</span>
                        </div>
                      )}
                      {catalog.payment.bank.accountName && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                          <span className="text-slate-500 font-medium">Account Name</span>
                          <span className="font-semibold text-slate-900">{catalog.payment.bank.accountName}</span>
                        </div>
                      )}
                      {catalog.payment.bank.accountNumber && (
                        <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                          <span className="text-slate-500 font-medium">Account Number</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">{catalog.payment.bank.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(catalog.payment.bank.accountNumber);
                                setCopiedPaymentField('acc');
                                setTimeout(() => setCopiedPaymentField(null), 2000);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                              title="Copy Account Number"
                            >
                              {copiedPaymentField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                      {catalog.payment.bank.ifsc && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">IFSC Code</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 uppercase">{catalog.payment.bank.ifsc}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(catalog.payment.bank.ifsc);
                                setCopiedPaymentField('ifsc');
                                setTimeout(() => setCopiedPaymentField(null), 2000);
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                              title="Copy IFSC Code"
                            >
                              {copiedPaymentField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                      No bank transfer details configured by merchant.
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-full btn-secondary text-xs"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
