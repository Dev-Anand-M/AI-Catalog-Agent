import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Share2, 
  CheckCircle2, 
  FileSpreadsheet,
  MessageCircle, 
  ShoppingBag, 
  Store, 
  Globe, 
  Copy, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { productsApi, auditApi, shopifyApi, adminApi } from '../api/client';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

/**
 * The multi-channel hub for an administrator.
 *
 * The seller version of this page is a set of actions — copy *my* storefront
 * link, broadcast *my* catalog on WhatsApp, push *my* products to Shopify. An
 * administrator has none of those things, so the same URL used to hand them a
 * wall of buttons that would each act on an empty account. This is the platform
 * view: what the channels are, whether they are wired up, and which sellers are
 * live on them.
 */
function PlatformChannelHub() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [shopifyStatus, setShopifyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.sellers().catch(() => ({ data: [] })),
      adminApi.stats().catch(() => ({ data: null })),
      adminApi.products().catch(() => ({ data: [] })),
      shopifyApi.getStatus().catch(() => ({ data: null }))
    ]).then(([sellersRes, statsRes, productsRes, shopifyRes]) => {
      if (cancelled) return;
      setSellers(Array.isArray(sellersRes.data) ? sellersRes.data : []);
      setStats(statsRes.data || null);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setShopifyStatus(shopifyRes.data || null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const linkedCount = products.filter(p => p.shopifyUrl).length;

  const downloadPlatformCsv = () => {
    setExporting(true);
    const headers = ['ID', 'Product', 'Seller', 'Seller Email', 'Category', 'Price (INR)', 'Shopify URL', 'State'];
    const rows = products.map(p => [
      p.id,
      `"${String(p.name || '').replace(/"/g, '""')}"`,
      `"${String(p.sellerName || '').replace(/"/g, '""')}"`,
      p.sellerEmail || '',
      p.category || '',
      p.price ?? '',
      p.shopifyUrl || '',
      p.confirmationState || 'seller_confirmed'
    ]);
    const blob = new Blob([[headers.join(','), ...rows.map(r => r.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `platform_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    auditApi.record({ action: 'EXPORT_CSV', entityType: 'EXPORT', details: { scope: 'platform', productCount: products.length } }).catch(() => {});
    setTimeout(() => setExporting(false), 800);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      <div className="bg-white border-b border-zinc-200 py-5 px-4 shadow-2xs">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-950 text-amber-400">
                  <ShieldCheck className="w-3 h-3" />
                  {t('admin_channels_badge', 'Platform Channels')}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{t('admin_channels_title', 'Channel Integrations')}</h1>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">{t('admin_channels_sub', 'Every storefront and marketplace this platform is wired into. Sellers manage their own channels — this is the platform view.')}</p>
            </div>
            <button type="button" onClick={() => navigate('/admin?tab=overview')} className="btn-secondary text-xs font-medium py-2 px-3.5 self-start">
              {t('admin_title', 'Admin Portal')}
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-6 space-y-6">
        {/* Platform counts — the numbers an administrator can act on */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-enterprise p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_stat_sellers', 'Active Sellers')}</p>
            <p className="text-2xl font-bold text-zinc-950 font-heading mt-1">{stats?.sellers ?? '—'}</p>
          </div>
          <div className="card-enterprise p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_channels_products', 'Products platform-wide')}</p>
            <p className="text-2xl font-bold text-zinc-950 font-heading mt-1">{stats?.products ?? '—'}</p>
          </div>
          <div className="card-enterprise p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_channels_shopify_linked', 'Linked to Shopify')}</p>
            <p className="text-2xl font-bold text-zinc-950 font-heading mt-1">{loading ? '—' : linkedCount}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-zinc-700" />
            {t('export_platforms_title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shopify — configured by the platform, driven by each seller */}
            <div className="merchant-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {shopifyStatus?.mode === 'live' ? t('admin_channels_live', 'Live Store') : t('admin_channels_connected', 'Connected')}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">{t('shopify_storefront', 'Shopify Storefront')}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{t('admin_channels_shopify_note', 'Configured platform-wide. Sellers publish their own verified catalogs — administrators do not sync on their behalf.')}</p>
                <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1 font-mono bg-zinc-50 p-1.5 rounded border border-zinc-200/80">
                  <Store className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{shopifyStatus?.storeDomain || 'digital-catalog-agent.myshopify.com'}</span>
                </div>
              </div>
            </div>

            {/* Data export — read-only, the whole platform */}
            <div className="merchant-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="badge-ai text-[10px]">CSV / Excel</span>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">{t('admin_channels_export', 'Export platform catalog')}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">{t('admin_channels_export_desc', 'Download every product across all sellers as CSV, with its owner and Shopify link.')}</p>
              </div>
              <div className="pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={downloadPlatformCsv}
                  disabled={exporting || loading || products.length === 0}
                  className="w-full btn-primary text-xs font-medium flex items-center justify-center gap-1.5 min-h-[40px] disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting ? t('generating_details') : t('download_csv')}
                </button>
              </div>
            </div>

            {/* Storefront directory — the admin counterpart of "copy my link" */}
            <div className="merchant-card p-5 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm">{t('admin_channels_storefronts', 'Seller storefronts')}</h3>
                    <p className="text-xs text-zinc-500">{t('admin_channels_storefronts_sub', 'Every seller publishes a public catalog that buyers can open and order from.')}</p>
                  </div>
                </div>
                <button type="button" onClick={() => navigate('/admin?tab=sellers')} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  {t('admin_channels_open_sellers', 'Manage sellers')}
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('loading')}
                </div>
              ) : sellers.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">{t('admin_channels_no_sellers', 'No sellers have been onboarded yet.')}</p>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-lg overflow-hidden">
                  {sellers.slice(0, 8).map((seller) => (
                    <div key={seller.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{seller.name || seller.email}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{seller.email}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-zinc-500 font-medium">
                          {seller.productCount ?? 0} {t('products_count', 'products')}
                        </span>
                        <a
                          href={`/catalog/${seller.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                          title={t('admin_channels_view_storefront', 'Open this seller\'s public storefront')}
                        >
                          {t('admin_channels_view_storefront', 'Storefront')}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace readiness is a platform concern, not a checklist for one seller */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-zinc-600" />
              {t('admin_channels_gov_title', 'Government & Marketplace Channels')}
            </h2>
            <span className="text-[11px] text-zinc-500 font-medium">{t('admin_channels_readiness', 'Platform readiness')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-zinc-200/90 rounded-lg p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 text-xs">ONDC (Open Network for Digital Commerce)</span>
                <span className="badge-review text-[10px]">{t('admin_channels_planned', 'Planned Integration')}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{t('admin_channels_ondc_desc', 'Listing sellers on the open protocol network that reaches buyers across Paytm, Magicpin and pincode-level demand.')}</p>
              <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-200/80">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase block">{t('admin_channels_checklist', 'Platform Readiness')}</span>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('admin_channels_ready_format', 'Digital Product Record Format Ready')}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-400" /> {t('admin_channels_todo_adapter', 'ONDC Network Participant (SNP) adapter')}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-400" /> {t('admin_channels_todo_logistics', 'Pincode logistics provider integration')}
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/90 rounded-lg p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 text-xs">GeM (Government e-Marketplace)</span>
                <span className="badge-review text-[10px]">{t('admin_channels_planned', 'Planned Integration')}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{t('admin_channels_gem_desc', 'Connecting sellers to public sector units and government procurement offices.')}</p>
              <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-200/80">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase block">{t('admin_channels_checklist', 'Platform Readiness')}</span>
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('admin_channels_ready_taxonomy', 'Reusable Product Title & Category Taxonomy')}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-400" /> {t('admin_channels_todo_kyc', 'GeM seller ID & PAN validation')}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                  <Clock className="w-3 h-3 text-zinc-400" /> {t('admin_channels_todo_hsn', 'HSN / SAC code harmonization')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}


export function ExportCatalog() {
  const { isAdmin } = useAuth();
  // Two genuinely different pages share one route: the seller's channel actions,
  // and the platform view an administrator needs to see. Splitting them at the
  // top keeps either component's hooks unconditional.
  return isAdmin ? <PlatformChannelHub /> : <SellerChannelHub />;
}

function SellerChannelHub() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [shopifySync, setShopifySync] = useState({ loading: false, result: null, data: null, error: null });
  const [shopifyStatus, setShopifyStatus] = useState(null);

  const shareLink = `${window.location.origin}/catalog/${user?.id || 1}`;

  useEffect(() => {
    fetchProducts();
    shopifyApi.getStatus()
      .then(res => setShopifyStatus(res.data))
      .catch(() => {});
  }, [user]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.list();
      setProducts(response.data || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyWhatsAppBroadcast = () => {
    const header = `📦 *${user?.name || 'Artisan Store'} - Product Catalog*\n\nExplore our latest handcrafted collection available for direct order:\n\n`;
    const items = products.slice(0, 10).map((p, i) => `${i + 1}. *${p.name}* - ₹${p.price}\n   _${p.description.slice(0, 70)}..._`).join('\n\n');
    const footer = `\n\n🔗 *Full Catalog & Direct Orders:* ${shareLink}\n💬 Reply to this message to order directly!`;
    
    navigator.clipboard.writeText(header + items + footer);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  const downloadCSV = () => {
    setExporting('csv');
    const headers = ['ID', 'Product Name', 'Category', 'Price (INR)', 'Language', 'Status', 'Verification State'];
    const rows = products.map(p => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.price,
      p.language || 'English',
      p.status || 'Active',
      p.confirmationState || 'seller_confirmed'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `catalog_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    auditApi.record({ action: 'EXPORT_CSV', entityType: 'EXPORT', details: { productCount: products.length } }).catch(() => {});

    setTimeout(() => setExporting(null), 800);
  };

  const syncToShopify = async () => {
    setShopifySync({ loading: true, result: null, data: null, error: null });
    try {
      const response = await shopifyApi.sync();
      setShopifySync({ 
        loading: false, 
        result: response.data?.message || 'Shopify storefront synchronized successfully.',
        data: response.data,
        error: null 
      });
      fetchProducts();
    } catch (err) {
      setShopifySync({ 
        loading: false, 
        result: null, 
        data: null,
        error: err.response?.data?.error || 'Shopify synchronization failed.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 py-5 px-4 shadow-2xs">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-confirmed text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Multi-Channel Hub
                </span>
              </div>
              <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">{t('export_channels_title')}</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t('export_channels_sub')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-3 py-1 bg-zinc-100 rounded-md text-zinc-700 border border-zinc-200">
                {products.length} {t('products_count') || 'Products Ready'}
              </span>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        <div className="space-y-6">
          {/* Active Channels Section */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-700" />
              {t('export_platforms_title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Channel 1: Public Digital Storefront */}
              <div className="merchant-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <span className="badge-confirmed text-[10px]">
                      {t('live_storefront_active')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm">{t('store_preview_title')}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                      {t('browse_catalog_desc')}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  <div className="p-2 bg-zinc-50 border border-zinc-200/80 rounded-md text-[11px] font-mono text-zinc-600 truncate">
                    {shareLink}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="btn-secondary text-xs flex-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? (t('link_copied') || 'Copied!') : (t('share_storefront') || 'Copy Link')}
                    </button>
                    <a
                      href={shareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5"
                    >
                      {t('preview_storefront')} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Channel 2: WhatsApp B2B & Broadcast Orders */}
              <div className="merchant-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="badge-confirmed text-[10px]">
                      {t('whatsapp_orders')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm">{t('whatsapp_orders')}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                      {t('whatsapp_broadcast_desc')}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={copyWhatsAppBroadcast}
                    className="w-full btn-success text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {copiedMsg ? '✓ ' + (t('link_copied') || 'Copied!') : t('copy_whatsapp_broadcast')}
                  </button>
                </div>
              </div>

              {/* Channel 3: Shopify Storefront Integration */}
              <div className="merchant-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {shopifyStatus?.mode === 'live' ? 'Live Store' : 'Connected'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-1.5">
                      {t('shopify_storefront', 'Shopify Storefront')}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                      Sync your verified catalog directly to your Shopify store. Products receive live links and variant pricing.
                    </p>
                    <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1 font-mono bg-zinc-50 p-1.5 rounded border border-zinc-200/80 truncate">
                      <Store className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{shopifyStatus?.storeDomain || 'digital-catalog-agent.myshopify.com'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                  {shopifySync.result && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{typeof shopifySync.result === 'string' ? shopifySync.result : 'Synchronized successfully.'}</span>
                      </div>
                      {Array.isArray(shopifySync.data?.products) && shopifySync.data.products.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-emerald-200/60 max-h-32 overflow-y-auto">
                          {shopifySync.data.products.slice(0, 3).map(p => (
                            <div key={p.id} className="flex items-center justify-between text-[11px] text-emerald-800">
                              <span className="truncate max-w-[140px] font-medium">{p.name}</span>
                              <a
                                href={p.shopifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-emerald-700 hover:underline font-semibold"
                              >
                                View <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {shopifySync.error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                      {shopifySync.error}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={syncToShopify}
                    disabled={shopifySync.loading}
                    className="w-full btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px] bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    {shopifySync.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    {shopifySync.loading ? t('syncing_now', 'Syncing…') : t('sync_to_shopify', 'Sync to Shopify')}
                  </button>
                </div>
              </div>

              {/* Channel 4: Generic CSV & Spreadsheet Feed */}
              <div className="merchant-card p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <span className="badge-ai text-[10px]">
                      CSV / Excel
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 text-sm">{t('download_csv')}</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                      {t('export_csv_desc')}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={downloadCSV}
                    disabled={exporting === 'csv'}
                    className="w-full btn-primary text-xs font-medium flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exporting === 'csv' ? t('generating_details') : t('download_csv')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Planned Marketplaces & Government Channels */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-zinc-600" />
                Government & Marketplace Channels
              </h2>
              <span className="text-[11px] text-zinc-500 font-medium">Compliance Readiness</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ONDC Channel Card */}
              <div className="bg-white border border-zinc-200/90 rounded-lg p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 text-xs">ONDC (Open Network for Digital Commerce)</span>
                  <span className="badge-review text-[10px]">
                    Planned Integration
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Direct listing on the open protocol network connecting buyers from Paytm, Magicpin, and pincode-level buyers.
                </p>
                <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-200/80">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Seller Onboarding Checklist:</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Digital Product Record Format Ready
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                    <Clock className="w-3 h-3 text-zinc-400" /> ONDC Seller Network Participant (SNP) Adapter
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                    <Clock className="w-3 h-3 text-zinc-400" /> Pincode Logistics Provider Integration
                  </div>
                </div>
              </div>

              {/* GeM Channel Card */}
              <div className="bg-white border border-zinc-200/90 rounded-lg p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 text-xs">GeM (Government e-Marketplace)</span>
                  <span className="badge-review text-[10px]">
                    Planned Integration
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Supply handmade and artisan products directly to public sector units and government procurement offices.
                </p>
                <div className="space-y-1 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-md border border-zinc-200/80">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Seller Onboarding Checklist:</span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Reusable Product Title & Category Taxonomy
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                    <Clock className="w-3 h-3 text-zinc-400" /> GeM Primary Seller ID & PAN Validation
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                    <Clock className="w-3 h-3 text-zinc-400" /> HSN / SAC Code Harmonization
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
