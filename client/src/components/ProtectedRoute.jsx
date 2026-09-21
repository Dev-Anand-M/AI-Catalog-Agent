import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Accounts created by our onboarding team start on a temporary password. Enforced here
  // as well as after sign-in so closing the tab and returning can't skip it.
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return children;
}

/**
 * The inverse guard: merchant-only surfaces. An administrator runs no store of
 * their own, so the catalog, the product form and the payment setup are not for
 * them — they are shown the console instead of a seller tool with nothing in it.
 * Enforced on the route, not just on the links that point here, because direct
 * URLs and old bookmarks would otherwise still land an admin on seller tooling.
 */
export function SellerRoute({ children }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}
