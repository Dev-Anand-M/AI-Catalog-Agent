import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Store, Package, Share2, Smartphone, QrCode, X, MessageCircle } from 'lucide-react';
import { catalogApi } from '../api/client';
import { Container } from '../components/layout';
import { Card, CardBody, Alert, Button } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_ICONS = {
  Grocery: '🛒',
  Clothing: '👕',
  Handicraft: '🎨',
  Electronics: '📱',
  Other: '📦'
};

export function PublicCatalog() {
  const { userId } = useParams();
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadCatalog();
  }, [userId]);

  const loadCatalog = async () => {
    try {
      const response = await catalogApi.get(userId);
      const data = response.data;
      
      // Map API response to component format
      setCatalog({
        seller: data.user,
        products: data.products || [],
        payment: data.paymentSettings ? {
          upi: data.paymentSettings.upiData || [],
          bank: data.paymentSettings.bankAccount || null,
          qr: data.paymentSettings.qrCodeUrl || null,
          phoneNumber: data.paymentSettings.phoneNumber || null
        } : null
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Catalog not found');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${catalog.seller.name}'s Catalog`,
          text: 'Check out this product catalog!',
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
    const message = `Hi ${catalog.seller.name}! I'm interested in:\n\n📦 ${product.name}\n💰 Price: ₹${product.price}\n\nIs this available?`;
    const phoneNumber = catalog.payment?.phoneNumber;
    
    // If phone number exists, use it; otherwise open WhatsApp without number
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Container>
          <div className="text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('catalog_not_found')}</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-8">
      <Container>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Store className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{catalog.seller.name}</h1>
          <p className="text-gray-600 mb-4">{catalog.products.length} {t('products_available')}</p>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? t('link_copied') : t('share_catalog')}
          </Button>
        </div>

        {/* Products Grid */}
        {catalog.products.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t('no_products_catalog')}</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.products.map(product => (
              <Card 
                key={product.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openProductDetail(product)}
              >
                <CardBody className="p-4">
                  {product.imageUrl && (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                    <span className="text-2xl">{CATEGORY_ICONS[product.category] || '📦'}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary-600">₹{product.price}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{product.category}</span>
                  </div>
                  <p className="text-xs text-primary-500 mt-2 text-center">{t('tap_view_details')}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={closeProductDetail}>
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
                <h2 className="text-lg font-semibold text-gray-900">{t('product_details')}</h2>
                <button onClick={closeProductDetail} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-4">
                {selectedProduct.imageUrl && (
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.name}
                    className="w-full h-64 object-cover rounded-xl mb-4"
                  />
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h3>
                  <span className="text-3xl">{CATEGORY_ICONS[selectedProduct.category] || '📦'}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-bold text-primary-600">₹{selectedProduct.price}</span>
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                    {selectedProduct.category}
                  </span>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">{t('description')}</h4>
                  <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                </div>
                
                {/* Seller Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('sold_by')}</p>
                      <p className="font-semibold text-gray-900">{catalog.seller.name}</p>
                    </div>
                  </div>
                </div>
                
                {/* Contact Button */}
                <Button 
                  variant="primary" 
                  className="w-full py-4 text-lg bg-green-500 hover:bg-green-600"
                  onClick={() => handleContactSeller(selectedProduct)}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  {t('contact_whatsapp')}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  {t('whatsapp_note')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Info */}
        {catalog.payment && (catalog.payment.upi?.length > 0 || catalog.payment.qr || catalog.payment.bank) && (
          <Card className="mt-8">
            <CardBody className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">💳 {t('payment_options')}</h2>
              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                {/* UPI IDs */}
                {catalog.payment.upi?.length > 0 && catalog.payment.upi.some(u => u.upiId) && (
                  <div className="text-center">
                    <Smartphone className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">{t('pay_via_upi')}</p>
                    {catalog.payment.upi.filter(u => u.upiId).map((upi, idx) => (
                      <div key={idx} className="bg-primary-50 px-4 py-2 rounded-lg mb-2">
                        <p className="font-mono font-semibold text-primary-700">{upi.upiId}</p>
                        {upi.name && <p className="text-xs text-gray-500">{upi.name}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Bank Account */}
                {catalog.payment.bank && catalog.payment.bank.accountNumber && (
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto bg-primary-500 rounded-full flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-bold">🏦</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{t('bank_transfer') || 'Bank Transfer'}</p>
                    <div className="bg-primary-50 px-4 py-3 rounded-lg text-left">
                      {catalog.payment.bank.accountName && (
                        <p className="text-sm"><span className="text-gray-500">Name:</span> <span className="font-semibold">{catalog.payment.bank.accountName}</span></p>
                      )}
                      <p className="text-sm"><span className="text-gray-500">A/C:</span> <span className="font-mono font-semibold">{catalog.payment.bank.accountNumber}</span></p>
                      {catalog.payment.bank.ifsc && (
                        <p className="text-sm"><span className="text-gray-500">IFSC:</span> <span className="font-mono font-semibold">{catalog.payment.bank.ifsc}</span></p>
                      )}
                      {catalog.payment.bank.bankName && (
                        <p className="text-sm"><span className="text-gray-500">Bank:</span> <span className="font-semibold">{catalog.payment.bank.bankName}</span></p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* QR Code */}
                {catalog.payment.qr && (
                  <div className="text-center">
                    <QrCode className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">{t('scan_to_pay')}</p>
                    <img 
                      src={catalog.payment.qr} 
                      alt="Payment QR Code" 
                      className="w-40 h-40 mx-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>{t('powered_by')}</p>
          <p className="mt-1">{t('create_own_catalog')} <a href="/" className="text-primary-600 hover:underline">digitalcatalog.app</a></p>
        </div>
      </Container>
    </div>
  );
}
