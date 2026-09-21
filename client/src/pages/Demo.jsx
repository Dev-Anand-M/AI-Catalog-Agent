import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Package, Share2, MessageCircle, ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';
import { demoApi } from '../api/client';
import { Button, Alert } from '../components/ui';
import { Container } from '../components/layout';
import { useAuth } from '../context/AuthContext';

export function Demo() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect logged-in users to dashboard
    if (user) {
      navigate('/dashboard');
      return;
    }
    fetchDemoProducts();
  }, [user, navigate]);

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

  // Don't render if user is logged in (will redirect)
  if (user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <Container>
        {/* Header */}
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-zinc-900 text-white rounded-xl shadow-xs mb-3">
            <Store className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-1" /> Demo Storefront
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight mb-2">Sample Merchant Storefront</h1>
          <p className="text-zinc-500 text-sm sm:text-base">
            This is an example of what buyers see when you share your catalog link on WhatsApp or social media.
          </p>
        </div>

        {error && (
          <Alert type="error" message={error} className="mb-6" />
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-emerald-50 border border-emerald-200 rounded-2xl p-8 max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Ready to build your digital store?
          </h2>
          <p className="text-slate-600 text-sm mb-5">
            Request access and our onboarding team will set up your catalog with you — voice AI in your own language.
          </p>            <Link to="/request-access" className="inline-flex items-center gap-2">
            <Button variant="primary" size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-6 text-sm font-semibold shadow-xs">
              <span>Request Access</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <div className="merchant-card overflow-hidden flex flex-col justify-between group">
      <div>
        <div className="relative aspect-square bg-zinc-100 border-b border-zinc-200/80 overflow-hidden">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
              <Package className="w-8 h-8 stroke-[1.5] text-zinc-300 mb-1" />
              <span className="text-xs font-medium">No image</span>
            </div>
          )}
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-medium shadow-2xs">
            {product.category}
          </span>
        </div>
        <div className="p-3.5 space-y-1.5">
          <h3 className="text-sm font-semibold text-zinc-950 tracking-tight truncate">{product.name}</h3>
          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{product.description}</p>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-lg font-bold text-zinc-950 font-mono">₹{Number(product.price).toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="p-3.5 pt-0">
        <div className="flex items-center gap-1.5 pt-2.5 border-t border-zinc-100">
          <a
            href={`https://wa.me/?text=Namaste,%20I%20want%20to%20order%20${encodeURIComponent(product.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs rounded-md flex items-center justify-center gap-1.5 transition-colors min-h-[36px]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Order via WhatsApp
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Share product"
          >
            <Share2 className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
