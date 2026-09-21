import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, SellerRoute } from './components/ProtectedRoute';
import { Navbar, Footer } from './components/layout';
import { VoiceCommandButton } from './components/VoiceCommandButton';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { RequestAccess } from './pages/RequestAccess';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { AddProduct } from './pages/AddProduct';
import { EditProduct } from './pages/EditProduct';
import { Demo } from './pages/Demo';
import { ExportCatalog } from './pages/ExportCatalog';
import { PaymentSettings } from './pages/PaymentSettings';
import { PublicCatalog } from './pages/PublicCatalog';
import { Audit } from './pages/Audit';
import { Admin } from './pages/Admin';

function App() {
  const location = useLocation();
  const { pathname } = location;
  const isPublicStorefront = pathname.startsWith('/catalog/');
  const mainRef = useRef(null);

  // Route changes are instant, so the browser keeps the old scroll offset: you
  // used to land halfway down a long catalog when opening a product, which
  // reads as a rendering glitch. Jump to the top instead (bypassing the global
  // `scroll-behavior: smooth` so it does not fight the page transition).
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  // Replay the entrance animation on navigation. Toggling a class on the
  // existing node keeps component state and in-flight requests alive, which a
  // keyed wrapper would have thrown away. The animation is disabled by the
  // `prefers-reduced-motion` block in index.css.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    el.classList.remove('page-enter');
    void el.offsetWidth; // force a reflow so the animation can restart
    el.classList.add('page-enter');
    return undefined;
  }, [pathname]);

  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-zinc-50">
          {!isPublicStorefront && <Navbar />}
          {!isPublicStorefront && <VoiceCommandButton />}
          <main ref={mainRef} className="flex-1">
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            {/* Onboarding is invitation-only. The old /signup URL still exists in
                bookmarks and shared links, so it forwards instead of 404-ing. */}
            <Route path="/signup" element={<Navigate to="/request-access" replace />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/catalog/:userId" element={<PublicCatalog />} />
            {/* Merchant-only pages: an admin is redirected to the console. */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <SellerRoute>
                    <Dashboard />
                  </SellerRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products/new" 
              element={
                <ProtectedRoute>
                  <SellerRoute>
                    <AddProduct />
                  </SellerRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/products/:id/edit" 
              element={
                <ProtectedRoute>
                  <SellerRoute>
                    <EditProduct />
                  </SellerRoute>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/export" 
              element={
                <ProtectedRoute>
                  <ExportCatalog />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payment" 
              element={
                <ProtectedRoute>
                  <SellerRoute>
                    <PaymentSettings />
                  </SellerRoute>
                </ProtectedRoute>
              } 
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/audit" 
              element={
                <ProtectedRoute>
                  <Audit />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } 
            />
          </Routes>
          </main>
          {/* Buyers on a merchant's public storefront must not get the merchant
              app footer — its links drop them into someone else's dashboard. */}
          {!isPublicStorefront && <Footer />}
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
