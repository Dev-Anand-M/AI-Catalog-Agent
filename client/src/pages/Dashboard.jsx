import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Store, 
  Share2, 
  Search, 
  ShoppingBag, 
  Eye, 
  TrendingUp, 
  CheckCircle2, 
  MessageSquare, 
  ExternalLink,
  Sparkles,
  Filter,
  Check,
  AlertCircle,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Layers,
  History,
  RefreshCw,
  Loader2,
  RotateCcw,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Container, Alert } from '../components/ui';
import { productsApi, auditApi, demoApi } from '../api/client';
import { CentralAssistantModal } from '../components/CentralAssistantModal';
import { useShopifySync } from '../hooks/useShopifySync';
import { getCategoryLabel, CategoryIcon, getCategoryColor } from '../lib/categories';

export function Dashboard() {
  const { user, isAdmin } = useAuth();
  const { t, language } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [resettingDemo, setResettingDemo] = useState(false);

  const isDemoArtisan = user?.email === 'demo@store.com' || user?.id === 'demo-artisan-1' || String(user?.id) === '1' || user?.name?.includes('Ramesh');
  const isProtectedProduct = (productOrId) => {
    if (!productOrId) return false;
    const id = typeof productOrId === 'object' ? productOrId.id : productOrId;
    const name = typeof productOrId === 'object' 
      ? (productOrId.name || '').toLowerCase() 
      : ((products.find(p => String(p.id) === String(id))?.name || '').toLowerCase());
    const protectedIds = ['prod-1', 'prod-2', 'prod-3', '1', '2', '3', '42', '43', '44', '45', '46', '47', 42, 43, 44, 45, 46, 47];
    if (protectedIds.includes(String(id)) || protectedIds.includes(id)) return true;
    if (name && (
      name.includes('terracotta chai kulhad') ||
      name.includes('pure khadi handloom') ||
      name.includes('sheesham wooden bowl') ||
      name.includes('jaipur blue pottery') ||
      name.includes('brass pooja diya') ||
      name.includes('jute braided market tote')
    )) return true;
    return false;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'seller_confirmed' | 'ai_suggested' | 'needs_review'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Publish to Shopify — available here, on each product, and on the Channels page.
  // (It used to exist only inside one card on the Channels page.)
  const applyShopifyUpdates = useCallback((synced) => {
    setProducts(prev => prev.map(p => {
      const hit = synced.find(s => String(s.id) === String(p.id));
      return hit
        ? { ...p, shopifyUrl: hit.shopifyUrl, shopifyProductId: hit.shopifyProductId }
        : p;
    }));
  }, []);

  const {
    sync: syncShopify,
    result: shopifyResult,
    syncing: shopifySyncing,
    syncingId: shopifySyncingId,
    error: shopifyError
  } = useShopifySync({ onSynced: applyShopifyUpdates });

  const handleSyncAllToShopify = () => syncShopify();
  const handleSyncProductToShopify = (product) => syncShopify({ productIds: [product.id], productId: product.id });

  useEffect(() => {
    fetchProducts();
  }, []);

  // A product created or edited by the floating AI Copilot (or by voice) has no
  // way to reach this component's state, so it announces itself instead of
  // leaving a stale list on screen until the next manual reload.
  useEffect(() => {
    const onCatalogChanged = () => fetchProducts();
    window.addEventListener('catalog:refresh', onCatalogChanged);
    return () => window.removeEventListener('catalog:refresh', onCatalogChanged);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll();
      setProducts(response.data || []);
    } catch (err) {
      console.error('Fetch products error:', err);
      setError(t('error_generic') || 'Failed to load catalog products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (isProtectedProduct(id)) {
      setError('Core showcase products are protected against deletion so other evaluators can experience the full catalog. You can create and delete new test items, or click "Restore Showcase Defaults" to reset.');
      return;
    }
    if (!window.confirm(t('confirm_delete') || 'Are you sure you want to delete this product?')) return;

    setDeleteId(id);
    try {
      await productsApi.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete product error:', err);
      setError(err.response?.data?.error || t('error_generic') || 'Could not delete product');
    } finally {
      setDeleteId(null);
    }
  };

  const handleResetDemoCatalog = async () => {
    if (!window.confirm('Restore Ramesh Kumar\'s catalog and payment settings back to the pristine showcase defaults? This will remove newly added test items and reset default products.')) {
      return;
    }
    setResettingDemo(true);
    setError('');
    setSuccess('');
    try {
      await demoApi.reset();
      await fetchProducts();
      setSuccess('Showcase catalog and payment details have been restored to defaults!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Failed to reset demo catalog:', err);
      setError('Failed to restore showcase defaults. Please try again.');
    } finally {
      setResettingDemo(false);
    }
  };

  const toggleConfirmStatus = async (product) => {
    const nextState = product.confirmationState === 'seller_confirmed' ? 'needs_review' : 'seller_confirmed';
    try {
      const res = await productsApi.update(product.id, {
        confirmationState: nextState
      });
      const updated = res?.data || {};
      setProducts(prev => prev.map(p => p.id === product.id ? { 
        ...p, 
        confirmationState: nextState,
        ...(updated.shopifyUrl ? { shopifyUrl: updated.shopifyUrl, shopifyProductId: updated.shopifyProductId } : {})
      } : p));

      // If changed to confirmed and doesn't have a Shopify link yet, auto-sync it!
      if (nextState === 'seller_confirmed' && !product.shopifyUrl && !updated.shopifyUrl) {
        shopifyApi.sync([product.id]).then(syncRes => {
          const syncedItem = syncRes.data?.products?.find(sp => sp.id === product.id || String(sp.id) === String(product.id));
          if (syncedItem?.shopifyUrl) {
            setProducts(prev => prev.map(p => p.id === product.id ? {
              ...p,
              shopifyUrl: syncedItem.shopifyUrl,
              shopifyProductId: syncedItem.shopifyProductId
            } : p));
          }
        }).catch(e => console.warn('Shopify sync on confirmation failed:', e.message));
      }
    } catch (err) {
      console.error('Failed to update confirmation status:', err);
    }
  };

  const handleAssistantAction = async (action) => {
    if (action.intent === 'CREATE_PRODUCT' && action.data) {
      try {
        const response = await productsApi.create({
          name: action.data.name || 'New Product',
          description: action.data.description || 'Quality product listing',
          category: action.data.category || 'Other',
          price: parseFloat(action.data.price) || 499,
          language: 'en-IN',
          confirmationState: 'seller_confirmed'
        });
        setProducts(prev => [response.data, ...prev]);
      } catch (err) {
        console.error('Assistant creation failed:', err);
      }
    } else if (action.intent === 'UPDATE_PRODUCT' && action.data?.matchedProductId) {
      try {
        const updateData = {};
        if (action.data.price) updateData.price = parseFloat(action.data.price);
        if (action.data.name) updateData.name = action.data.name;
        updateData.confirmationState = 'seller_confirmed';
        
        await productsApi.update(action.data.matchedProductId, updateData);
        fetchProducts();
      } catch (err) {
        console.error('Assistant update failed:', err);
      }
    }
  };

  const shareCatalogUrl = `${window.location.origin}/catalog/${user?.id || 1}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareCatalogUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesStatus = statusFilter === 'ALL' || (product.confirmationState || 'seller_confirmed') === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalValue = products.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  const confirmedCount = products.filter(p => (p.confirmationState || 'seller_confirmed') === 'seller_confirmed').length;
  const categoriesList = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 pb-16">
      {/* Seller Header */}
      <div className="bg-white border-b border-gray-200/80 py-6 px-4 shadow-2xs">
        <Container>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200/80 whitespace-nowrap">
                  {isAdmin ? 'System Administrator' : t('merchant_panel')}
                </span>
                <span className="badge-confirmed text-[11px] font-medium flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle2 className="w-3 h-3" /> {isAdmin ? 'Global Catalog View' : t('live_storefront_active')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                {isAdmin ? 'Platform Catalog Overview' : t('my_catalog')}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {isAdmin ? 'Read-only view of products across merchants. Access administrative tools in the Admin Portal.' : t('digital_store_sub')}
              </p>
            </div>

            {/* Two columns on phones, one aligned row from `sm` up. A wrapping
                flex row used to leave a ragged staircase of buttons here, and
                every label was a different height because each hard-coded its
                own padding. `.btn` now owns the metrics and the four Shopify
                entry points were reduced to the two that mean something. */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {isAdmin ? (
                <>
                  {/* No "Sync to Shopify" / "Add Product" / "Share catalog" here:
                      an administrator does not sell, so those actions moved out
                      of reach. Platform tooling — including the one Activity Log —
                      lives inside the console. */}
                  <Link to="/admin" className="btn btn-primary text-xs px-3.5 col-span-2 sm:col-span-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary-400" />
                    Admin Portal
                  </Link>
                  <Link to="/export" className="btn btn-secondary text-xs px-3.5">
                    <Layers className="w-3.5 h-3.5" />
                    {t('nav_commerce_hub', 'Commerce Hub')}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/products/new" className="btn btn-primary text-xs px-3.5 col-span-2 sm:col-span-1 sm:order-last">
                    <Plus className="w-3.5 h-3.5" />
                    {t('add_new_product', 'Add Product')}
                  </Link>

                  <button
                    type="button"
                    onClick={handleSyncAllToShopify}
                    disabled={shopifySyncing || products.length === 0}
                    className="btn btn-secondary text-xs px-3.5"
                    title={t('sync_all_to_shopify', 'Sync All to Shopify')}
                  >
                    {shopifySyncing && !shopifySyncingId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />}
                    {t('sync_to_shopify', 'Sync to Shopify')}
                  </button>

                  <Link to="/export" className="btn btn-secondary text-xs px-3.5">
                    <Layers className="w-3.5 h-3.5 text-gray-500" />
                    {t('channels_and_shopify', 'Shopify & Channels')}
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsAssistantOpen(true)}
                    className="btn btn-secondary text-xs px-3.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-gray-600" />
                    {t('ask_assistant')}
                  </button>

                  <button
                    type="button"
                    onClick={copyShareLink}
                    className="btn btn-secondary text-xs px-3.5 col-span-2 sm:col-span-1"
                  >
                    <Share2 className="w-3.5 h-3.5 text-gray-500" />
                    {copiedLink ? t('link_copied') : t('share_catalog_link')}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Analytics strip. Each card is a column so the label sits on top and
              the figure is pinned to the bottom edge — without `mt-auto` the
              four value rows floated at different heights because the labels
              wrap to one, two or three lines depending on language. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
            <div className="stat-tile bg-white border border-gray-200/80 p-4 rounded-xl shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-2 text-gray-500 mb-2">
                <span className="text-xs font-medium leading-snug min-w-0">{t('total_listed_items')}</span>
                <ShoppingBag className="stat-icon w-4 h-4 text-gray-400 shrink-0" />
              </div>
              <p className="num mt-auto text-2xl font-bold text-gray-900 font-mono">{products.length}</p>
            </div>

            <div className="stat-tile bg-white border border-gray-200/80 p-4 rounded-xl shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-2 text-gray-500 mb-2">
                <span className="text-xs font-medium leading-snug min-w-0">{t('catalog_value')}</span>
                <TrendingUp className="stat-icon w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              {/* Long catalog values used to widen the card and break the grid. */}
              <p
                className="num mt-auto text-2xl font-bold text-emerald-700 font-mono truncate"
                title={`₹${totalValue.toFixed(2)}`}
              >
                ₹{totalValue.toFixed(2)}
              </p>
            </div>

            <div className="stat-tile bg-white border border-gray-200/80 p-4 rounded-xl shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-2 text-gray-500 mb-2">
                <span className="text-xs font-medium leading-snug min-w-0">{t('seller_confirmed_items')}</span>
                <CheckCircle2 className="stat-icon w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <p className="num mt-auto text-2xl font-bold text-gray-900 font-mono">
                {confirmedCount}<span className="text-gray-300 font-normal"> / </span>{products.length}
              </p>
            </div>

            <div className="stat-tile bg-white border border-gray-200/80 p-4 rounded-xl shadow-2xs flex flex-col">
              <div className="flex items-start justify-between gap-2 text-gray-500 mb-2">
                <span className="text-xs font-medium leading-snug min-w-0">{t('store_preview_title')}</span>
                <MessageSquare className="stat-icon w-4 h-4 text-emerald-600 shrink-0" />
              </div>
              <a
                href={shareCatalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="arrow-link mt-auto text-xs font-semibold text-gray-900 hover:text-emerald-700 min-h-[32px]"
              >
                {t('preview_storefront')} <ExternalLink className="w-3 h-3 text-gray-400" />
              </a>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {isAdmin && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white border border-primary-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/15 text-white border border-white/25 shrink-0 mt-0.5 sm:mt-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">Administrator Environment Active</h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-gray-900">ADMIN</span>
                </div>
                <p className="text-xs text-primary-100 mt-0.5">
                  You are signed in with administrative access. Seller management, AI agent models, and platform audit logs are available in the Admin Portal.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Link
                to="/admin"
                className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Portal
              </Link>
            </div>
          </div>
        )}

        {isDemoArtisan && !isAdmin && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-800 border border-amber-300/60 shrink-0 mt-0.5 sm:mt-0">
                <Sparkles className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-amber-950">Showcase Demonstration Store (Ramesh Kumar)</h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300/80">LIVE PREVIEW</span>
                </div>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed max-w-2xl">
                  This is a public showcase account for evaluators and guests. Core artisanal items are protected from deletion. You can freely test adding new products, voice generation, and dynamic pricing. Click <strong>Restore Showcase Defaults</strong> anytime to reset the store.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetDemoCatalog}
                disabled={resettingDemo}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-amber-100/70 text-xs font-semibold text-amber-900 border border-amber-300 shadow-2xs transition-all flex items-center gap-1.5 min-h-[36px] disabled:opacity-50"
                title="Restore Ramesh Kumar's default products and payment settings"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${resettingDemo ? 'animate-spin' : ''}`} />
                {resettingDemo ? 'Restoring...' : 'Restore Showcase Defaults'}
              </button>
            </div>
          </div>
        )}

        {success && (
          <Alert type="success" message={success} className="mb-6" onClose={() => setSuccess('')} />
        )}

        {error && (
          <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />
        )}

        {/* Shopify sync feedback — same surface whether one product or the whole catalog */}
        {shopifyError && (
          <Alert type="error" message={shopifyError} className="mb-6" />
        )}
        {shopifyResult && !shopifyError && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {shopifyResult.syncedCount != null
                  ? `${t('shopify_synced_ok', 'Synced to Shopify')} — ${shopifyResult.syncedCount}`
                  : (shopifyResult.message || t('shopify_synced_ok', 'Synced to Shopify'))}
              </span>
            </div>
            {Array.isArray(shopifyResult.products) && shopifyResult.products.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {shopifyResult.products.slice(0, 6).map(p => (
                  <a
                    key={p.id}
                    href={p.shopifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-white border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors max-w-[220px]"
                  >
                    <span className="truncate">{p.name}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters & Control Bar */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-3.5 mb-6 space-y-3 shadow-2xs">
          {/* Top Row: Search and Status Badges */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[38px] transition-colors"
              />
            </div>

            {/* Confirmation State Tabs (Clean Segmented Pills) */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs border border-gray-200/80' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('all_items')} ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('seller_confirmed')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
                  statusFilter === 'seller_confirmed' ? 'bg-white text-emerald-800 shadow-2xs border border-gray-200/80' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Check className="w-3 h-3 text-emerald-600" /> {t('confirmed_items')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ai_suggested')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
                  statusFilter === 'ai_suggested' ? 'bg-white text-gray-900 shadow-2xs border border-gray-200/80' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-gray-600" /> {t('ai_suggested_items')}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('needs_review')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-1 ${
                  statusFilter === 'needs_review' ? 'bg-white text-amber-800 shadow-2xs border border-gray-200/80' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-600" /> {t('needs_review_items')}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-400 hover:text-gray-700'}`}
                title="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-[11px] font-medium text-gray-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> {t('category')}:
            </span>
            {categoriesList.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {cat === 'ALL' ? (
                  <>{t('all_items')}</>
                ) : (
                  <>
                    <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                    {getCategoryLabel(cat, language)}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid or Table */}
        {loading ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">{t('loading_catalog')}</span>
            {/* Skeleton cards mirror the real card's geometry, so the grid does
                not jump in height the moment products arrive. Previously this
                was a single line of text in a tall box. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="merchant-card overflow-hidden">
                  <div className="skeleton aspect-square !rounded-none" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="skeleton h-3.5 w-3/4" />
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-3 w-2/3" />
                    <div className="skeleton h-6 w-24" />
                  </div>
                  <div className="p-3.5 pt-0">
                    <div className="flex items-center gap-1.5 pt-2.5 border-t border-gray-100">
                      <div className="skeleton h-9 flex-1" />
                      <div className="skeleton h-9 w-9" />
                      <div className="skeleton h-9 w-9" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-gray-200/80 rounded-xl p-12 text-center space-y-4 shadow-2xs">
            <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-gray-900">{t('no_products_filter')}</h3>
            <p className="text-gray-500 text-xs max-w-sm mx-auto">
              {t('no_products_filter_sub')}
            </p>
            {!isAdmin && (
              <Link to="/products/new" className="btn btn-primary text-xs px-4">
                <Plus className="w-3.5 h-3.5" />
                {t('add_first') || 'Add New Product'}
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const confState = product.confirmationState || 'seller_confirmed';
              const confLabel = confState === 'seller_confirmed'
                ? `✓ ${t('confirmed_items')}`
                : confState === 'ai_suggested' ? t('ai_suggested_items') : t('needs_review_items');
              const confClass = confState === 'seller_confirmed'
                ? 'badge-confirmed'
                : confState === 'ai_suggested' ? 'badge-ai' : 'badge-review';
              return (
                <div key={product.id} className="merchant-card overflow-hidden flex flex-col justify-between group">
                  <div>
                    {/* Image & Status Tag */}
                    <div className="relative aspect-square bg-gray-100 border-b border-gray-200/80 overflow-hidden">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover group-hover:scale-[1.04]" 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs font-medium">
                          <ShoppingBag className="w-7 h-7 mb-1 stroke-[1.5] text-gray-300" />
                          {t('no_image')}
                        </div>
                      )}
                      <span className={`absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 backdrop-blur-sm border px-2 py-0.5 rounded-md text-[10px] font-semibold shadow-2xs ${getCategoryColor(product.category)}`}>
                        {getCategoryLabel(product.category, language)}
                      </span>
                      
                      {/* Confirmation Badge — administrators read the platform,
                          they do not own these products, so the badge is not a
                          control for them. */}
                      {isAdmin ? (
                        <span className={`absolute top-2 right-2 shadow-2xs ${confClass}`}>{confLabel}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleConfirmStatus(product)}
                          title={t('toggle_confirm_state', 'Click to toggle confirmation state')}
                          className={`absolute top-2 right-2 transition-all shadow-2xs ${confClass}`}
                        >
                          {confLabel}
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-sm font-semibold text-gray-900 tracking-tight truncate" title={product.name}>
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                      <div className="flex items-baseline justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-gray-900 font-mono">
                            ₹{parseFloat(product.price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-medium">{t('whatsapp_order')}</span>
                        </div>
                        {product.shopifyUrl && (
                          <a
                            href={product.shopifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="View on Shopify Storefront"
                          >
                            Shopify <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions — seller-only. An admin has nothing to edit, sync or
                      delete here; the card stays a read-only record of what the
                      merchant published. */}
                  {!isAdmin && (
                  <div className="p-3.5 pt-0">
                    <div className="flex items-center gap-1.5 pt-2.5 border-t border-gray-100">
                      <Link to={`/products/${product.id}/edit`} className="flex-1">
                        <button type="button" className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-xs rounded-md border border-gray-200 flex items-center justify-center gap-1 transition-colors min-h-[36px]">
                          <Pencil className="w-3 h-3 text-gray-500" />
                          {t('edit')}
                        </button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleSyncProductToShopify(product)}
                        disabled={shopifySyncingId === product.id}
                        className={`p-1.5 border rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-50 ${
                          product.shopifyUrl
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-gray-400 border-gray-200 hover:text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={product.shopifyUrl
                          ? t('shopify_synced_ok', 'Synced to Shopify — sync again')
                          : t('sync_to_shopify', 'Sync to Shopify')}
                      >
                        {shopifySyncingId === product.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RefreshCw className="w-3.5 h-3.5" />}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        disabled={deleteId === product.id}
                        className={`p-1.5 border border-gray-200 rounded-md transition-colors disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center ${
                          isProtectedProduct(product.id)
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={isProtectedProduct(product.id) ? "Core showcase product (protected from deletion)" : t('delete')}
                      >
                        {isProtectedProduct(product.id) ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold tracking-normal text-[11px]">
                  <tr>
                    <th className="p-3.5">{t('product_name')}</th>
                    <th className="p-3.5">{t('category')}</th>
                    <th className="p-3.5">{t('price_label')}</th>
                    <th className="p-3.5">{t('status_label')}</th>
                    <th className="p-3.5 text-right">{t('actions_label')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(product => {
                    const confState = product.confirmationState || 'seller_confirmed';
                    return (
                      <tr key={product.id} className="row-hover transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200/80 overflow-hidden shrink-0">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-gray-400 m-auto mt-2" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block text-xs">{product.name}</span>
                            <span className="text-gray-400 text-[11px] truncate max-w-xs block">{product.description}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[11px] font-semibold ${getCategoryColor(product.category)}`}>
                            <CategoryIcon category={product.category} className="w-3 h-3" />
                            {getCategoryLabel(product.category, language)}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold font-mono text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>₹{parseFloat(product.price).toFixed(2)}</span>
                            {product.shopifyUrl && (
                              <a
                                href={product.shopifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-normal text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                                title="View on Shopify Storefront"
                              >
                                Shopify <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {isAdmin ? (
                            <span className={confState === 'seller_confirmed' ? 'badge-confirmed' : confState === 'ai_suggested' ? 'badge-ai' : 'badge-review'}>
                              {confState === 'seller_confirmed' ? `✓ ${t('confirmed_items')}` : confState === 'ai_suggested' ? t('ai_suggested_items') : t('needs_review_items')}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleConfirmStatus(product)}
                              className={confState === 'seller_confirmed' ? 'badge-confirmed' : confState === 'ai_suggested' ? 'badge-ai' : 'badge-review'}
                            >
                              {confState === 'seller_confirmed' ? `✓ ${t('confirmed_items')}` : confState === 'ai_suggested' ? t('ai_suggested_items') : t('needs_review_items')}
                            </button>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {isAdmin ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <Link to={`/products/${product.id}/edit`}>
                              <button type="button" className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-md border border-gray-200 transition-colors text-xs">
                                {t('edit')}
                              </button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleSyncProductToShopify(product)}
                              disabled={shopifySyncingId === product.id}
                              className={`p-1.5 border rounded-md transition-colors disabled:opacity-50 ${
                                product.shopifyUrl
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                  : 'text-gray-400 border-gray-200 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={t('sync_to_shopify', 'Sync to Shopify')}
                            >
                              {shopifySyncingId === product.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <RefreshCw className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product.id)}
                              className={`p-1 rounded-md transition-colors ${
                                isProtectedProduct(product.id)
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-gray-400 hover:text-rose-600'
                              }`}
                              title={isProtectedProduct(product.id) ? "Core showcase product (protected from deletion)" : t('delete')}
                            >
                              {isProtectedProduct(product.id) ? (
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>

      {/* Central AI Assistant Modal */}
      <CentralAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onActionConfirmed={handleAssistantAction}
        existingProducts={products}
      />
    </div>
  );
}
