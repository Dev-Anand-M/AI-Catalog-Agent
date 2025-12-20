import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Store, Package, Share2, Smartphone, QrCode } from 'lucide-react';
import { catalogApi } from '../api/client';
import { Container } from '../components/layout';
import { Card, CardBody, Alert, Button } from '../components/ui';

const CATEGORY_ICONS = {
  Grocery: '🛒',
  Clothing: '👕',
  Handicraft: '🎨',
  Electronics: '📱',
  Other: '📦'
};

export function PublicCatalog() {
  const { userId } = useParams();
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
          qr: data.paymentSettings.qrCodeUrl || null
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Catalog Not Found</h1>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{catalog.seller.name}'s Catalog</h1>
          <p className="text-gray-600 mb-4">{catalog.products.length} products available</p>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? 'Link Copied!' : 'Share Catalog'}
          </Button>
        </div>

        {/* Products Grid */}
        {catalog.products.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No products in this catalog yet.</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.products.map(product => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
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
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Payment Info */}
        {catalog.payment && (catalog.payment.upi?.length > 0 || catalog.payment.qr) && (
          <Card className="mt-8">
            <CardBody className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">💳 Payment Options</h2>
              <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                {/* UPI IDs */}
                {catalog.payment.upi?.length > 0 && (
                  <div className="text-center">
                    <Smartphone className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">Pay via UPI</p>
                    {catalog.payment.upi.map((upi, idx) => (
                      <div key={idx} className="bg-primary-50 px-4 py-2 rounded-lg mb-2">
                        <p className="font-mono font-semibold text-primary-700">{upi.upiId}</p>
                        {upi.name && <p className="text-xs text-gray-500">{upi.name}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* QR Code */}
                {catalog.payment.qr && (
                  <div className="text-center">
                    <QrCode className="w-8 h-8 mx-auto text-primary-500 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">Scan to Pay</p>
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
          <p>Powered by Digital Catalog Agent</p>
          <p className="mt-1">Create your own catalog at <a href="/" className="text-primary-600 hover:underline">digitalcatalog.app</a></p>
        </div>
      </Container>
    </div>
  );
}
