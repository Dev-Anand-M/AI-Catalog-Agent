import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Container } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

// Until now an unknown URL rendered an empty <main>: the navbar and footer were
// there but the page itself was blank, with no way back except the browser.
export function NotFound() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center py-16 bg-gray-50">
      <Container>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto ring-1 ring-primary-100">
            <Compass className="w-7 h-7 stroke-[2.2]" />
          </div>
          <p className="mt-6 text-sm font-semibold tracking-[0.2em] text-primary-600">404</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 font-heading">
            {t('page_not_found')}
          </h1>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {t('page_not_found_desc')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('nav_home')}
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm w-full sm:w-auto"
              >
                <LayoutDashboard className="w-4 h-4" />
                {t('nav_dashboard')}
              </Link>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
