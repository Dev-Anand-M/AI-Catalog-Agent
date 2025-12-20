import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, Package } from 'lucide-react';
import { demoApi } from '../api/client';
import { Button, Alert, Card, CardBody } from '../components/ui';
import { Container } from '../components/layout';

export function Demo() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDemoProducts();
  }, []);

  const fetchDemoProducts = async () => {
    try {
      const response = await demoApi.getProducts();
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load demo products. Please try again.');
    } finally {
      setLoading(false);
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Store className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Demo Catalog</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            This is a demo catalog view that small retailers can share with their customers. 
            Create your own catalog by signing up!
          </p>
        </div>

        {error && (
          <Alert type="error" message={error} className="mb-6" />
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-primary-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to create your own catalog?
          </h2>
          <p className="text-gray-600 mb-6">
            Sign up now and start adding your products in minutes
          </p>
          <Link to="/signup">
            <Button variant="primary" size="lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <Card className="h-full">
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-gray-300" />
        )}
      </div>
      <CardBody>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
            {product.category}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
            {product.language}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
        <p className="text-xl font-bold text-primary-600">₹{product.price.toFixed(2)}</p>
      </CardBody>
    </Card>
  );
}
