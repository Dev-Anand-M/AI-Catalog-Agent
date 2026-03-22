import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, 
  Share2, 
  CheckCircle, 
  FileSpreadsheet,
  MessageCircle,
  ShoppingBag,
  Store,
  Globe,
  Copy,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { productsApi, aiApi } from '../api/client';
import api from '../api/client';
import { Button, Alert, Card, CardBody } from '../components/ui';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  {
    id: 'amazon',
    name: 'Amazon Seller Central',
    icon: ShoppingBag,
    color: 'bg-orange-500',
    description: 'Export for Amazon India marketplace',
    format: 'Amazon Flat File (.xlsx)',
    status: 'ready'
  },
  {
    id: 'flipkart',
    name: 'Flipkart Seller Hub',
    icon: Store,
    color: 'bg-blue-600',
    description: 'Export for Flipkart marketplace',
    format: 'Flipkart Bulk Upload (.csv)',
    status: 'ready'
  },
  {
    id: 'google',
    name: 'Google Merchant Center',
    icon: Globe,
    color: 'bg-red-500',
    description: 'For Google Shopping ads',
    format: 'Google Product Feed (.csv)',
    status: 'ready'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: MessageCircle,
    color: 'bg-green-500',
    description: 'Share catalog on WhatsApp',
    format: 'WhatsApp Catalog Format',
    status: 'ready'
  },
  {
    id: 'csv',
    name: 'Generic CSV',
    icon: FileSpreadsheet,
    color: 'bg-gray-600',
    description: 'Universal spreadsheet format',
    format: 'CSV File (.csv)',
    status: 'ready'
  }
];

export function ExportCatalog() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [exported, setExported] = useState([]);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [shopifySync, setShopifySync] = useState({ loading: false, result: null });

  useEffect(() => {
    fetchProducts();
    // Generate shareable link using actual user ID
    if (user?.id) {
      setShareLink(`${window.location.origin}/catalog/${user.id}`);
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await productsApi.list();
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = (platform) => {
    let headers, rows;

    switch (platform) {
      case 'amazon':
        headers = ['sku', 'product-name', 'product-description', 'listing-price', 'quantity', 'product-category', 'brand-name'];
        rows = products.map((p, i) => [
          `SKU-${p.id}`,
          p.name,
          p.description,
          p.price,
          '10',
          p.category,
          'Local Brand'
        ]);
        break;
      case 'flipkart':
        headers = ['Seller SKU Id', 'Product Name', 'Description', 'MRP', 'Selling Price', 'Category', 'Brand'];
        rows = products.map((p, i) => [
          `FK-${p.id}`,
          p.name,
          p.description,
          p.price * 1.2,
          p.price,
          p.category,
          'Local Brand'
        ]);
        break;
      case 'google':
        headers = ['id', 'title', 'description', 'price', 'availability', 'condition', 'brand', 'google_product_category'];
        rows = products.map((p, i) => [
          `GOOG-${p.id}`,
          p.name,
          p.description,
          `${p.price} INR`,
          'in stock',
          'new',
          'Local Brand',
          p.category
        ]);
        break;
      default:
        headers = ['ID', 'Name', 'Description', 'Category', 'Price', 'Language'];
        rows = products.map(p => [
          p.id,
          p.name,
          p.description,
          p.category,
          p.price,
          p.language
        ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const handleExport = async (platformId) => {
    setExporting(platformId);
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1500));

    const csvContent = generateCSV(platformId);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `catalog-${platformId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(prev => [...prev, platformId]);
    setExporting(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Check out my product catalog!\n\n${products.map(p => `📦 ${p.name} - ₹${p.price}`).join('\n')}\n\nView full catalog: ${shareLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setExported(prev => [...prev, 'whatsapp']);
  };

  const handleShopifySync = async () => {
    setShopifySync({ loading: true, result: null });
    try {
      let totalSynced = 0, totalFailed = 0, totalSkipped = 0;

      // Sync one product at a time to avoid timeouts and duplicates
      for (const product of products) {
        try {
          const response = await api.post('/shopify/sync', { products: [product] });
          totalSynced += response.data.synced || 0;
          totalFailed += response.data.failed || 0;
          totalSkipped += response.data.skipped || 0;
        } catch {
          totalFailed++;
        }
      }

      setShopifySync({ loading: false, result: { synced: totalSynced, failed: totalFailed, skipped: totalSkipped, total: products.length } });
    } catch (err) {
      const errData = err.response?.data?.error;
      const errMsg = typeof errData === 'string' ? errData : (errData?.message || 'Sync failed');
      setShopifySync({ loading: false, result: { error: errMsg } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('publish_title')}
            </h1>
            <p className="text-gray-600">
              {t('publish_subtitle')}
            </p>
          </div>

          {error && <Alert type="error" message={error} className="mb-6" />}

          {/* Product Summary */}
          <Card className="mb-8">
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{t('your_catalog')}</h2>
                  <p className="text-gray-600">{products.length} {t('products_ready')}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  {t('view_products')}
                </Button>
              </div>
            </CardBody>
          </Card>

          {products.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-gray-500 mb-4">{t('no_products')}</p>
                <Button variant="primary" onClick={() => navigate('/products/new')}>
                  {t('add_product')}
                </Button>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* Share Link */}
              <Card className="mb-8 border-2 border-primary-200 bg-primary-50">
                <CardBody>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{t('share_link')}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {t('share_link_desc')}
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                        />
                        <Button
                          variant={copied ? 'primary' : 'outline'}
                          onClick={handleCopyLink}
                          size="sm"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {t('copied')}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              {t('copy')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Shopify Sync */}
              <Card className="mb-8 border-2 border-green-200 bg-green-50">
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">Shopify — Auto Sync</h3>
                      <p className="text-sm text-gray-600">Products are auto-synced to Shopify when added. Click to sync all now.</p>
                      {shopifySync.result && !shopifySync.result.error && (
                        <p className="text-sm text-green-700 mt-1">
                          ✓ Synced {shopifySync.result.synced}/{shopifySync.result.total} products
                          {shopifySync.result.skipped > 0 && ` (${shopifySync.result.skipped} already synced)`}
                          {shopifySync.result.failed > 0 && ` · ${shopifySync.result.failed} failed`}
                        </p>
                      )}
                      {shopifySync.result?.error && (
                        <p className="text-sm text-red-600 mt-1">✗ {shopifySync.result.error}</p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => handleShopifySync()}
                      disabled={shopifySync.loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {shopifySync.loading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" />Sync All</>
                      )}
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Platform Export Options */}
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {t('export_platforms_title')}
              </h2>
              
              <div className="grid gap-4 mb-8">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isExported = exported.includes(platform.id);
                  const isExporting = exporting === platform.id;

                  return (
                    <Card key={platform.id} className={isExported ? 'border-green-300 bg-green-50' : ''}>
                      <CardBody>
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 ${platform.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                            <p className="text-sm text-gray-600">{platform.description}</p>
                            <p className="text-xs text-gray-500 mt-1">Format: {platform.format}</p>
                          </div>
                          <div>
                            {isExported ? (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">{t('exported')}</span>
                              </div>
                            ) : platform.id === 'whatsapp' ? (
                              <Button
                                variant="primary"
                                onClick={handleWhatsAppShare}
                                disabled={isExporting}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                {t('share')}
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                onClick={() => handleExport(platform.id)}
                                disabled={isExporting}
                              >
                                {isExporting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {t('exporting')}
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4 mr-2" />
                                    {t('export')}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>

              {/* Instructions */}
              <Card className="bg-gray-100 border-0">
                <CardBody>
                  <h3 className="font-semibold text-gray-900 mb-3">{t('how_to_upload')}</h3>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">1.</span>
                      {t('step1_export')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">2.</span>
                      {t('step2_login')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">3.</span>
                      {t('step3_bulk')}
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-primary-600">4.</span>
                      {t('step4_upload')}
                    </li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-4">
                    {t('pro_tip')}
                  </p>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
