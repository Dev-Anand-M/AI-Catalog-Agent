import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Pencil, Trash2, Share2, CreditCard, Link as LinkIcon } from 'lucide-react';
import { productsApi } from '../api/client';
import { Button, Alert, Card, CardBody } from '../components/ui';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productsApi.list();
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    setDeleteId(id);
    try {
      await productsApi.delete(id);
      setProducts(products.filter(p => p.id !== id));
    } catch (err) {
      setError('Failed to delete product. Please try again.');
    } finally {
      setDeleteId(null);
    }
  };

  const handleShareCatalog = async () => {
    const catalogUrl = `${window.location.origin}/catalog/${user?.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Product Catalog',
          text: 'Check out my product catalog!',
          url: catalogUrl
        });
      } else {
        await navigator.clipboard.writeText(catalogUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Container>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('my_catalog')}</h1>
            <p className="text-gray-600 mt-1">{products.length} {t('products_count')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleShareCatalog}>
              <LinkIcon className="w-4 h-4 mr-2" />
              {copied ? 'Link Copied!' : 'Share Catalog'}
            </Button>
            <Link to="/payment">
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Payment
              </Button>
            </Link>
            <Link to="/export">
              <Button variant="accent">
                <Share2 className="w-4 h-4 mr-2" />
                {t('publish_platforms')}
              </Button>
            </Link>
            <Link to="/products/new">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                {t('add_product')}
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert type="error" message={error} className="mb-6" onClose={() => setError('')} />
        )}

        {products.length === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <p className="text-gray-500 mb-4">{t('no_products')}</p>
              <Link to="/products/new">
                <Button variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('add_first')}
                </Button>
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <ProductRow 
                key={product.id} 
                product={product} 
                onDelete={handleDelete}
                deleting={deleteId === product.id}
                t={t}
              />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function ProductRow({ product, onDelete, deleting, t }) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
              <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                {product.category}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {product.language}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>
            <p className="text-xl font-bold text-primary-600">₹{product.price.toFixed(2)}</p>
          </div>
          <div className="flex sm:flex-col gap-2">
            <Link to={`/products/${product.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-1" />
                {t('edit')}
              </Button>
            </Link>
            <Button 
              variant="danger" 
              size="sm" 
              onClick={() => onDelete(product.id)}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {deleting ? t('deleting') : t('delete')}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
