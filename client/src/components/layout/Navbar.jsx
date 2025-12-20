import { Link, useNavigate } from 'react-router-dom';
import { Store, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui';
import { LanguageSelector } from '../LanguageSelector';

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Store className="w-8 h-8 text-primary-500" />
              <span className="text-xl font-bold text-gray-900">Digital Catalog</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
            <Link 
              to="/demo" 
              className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              {t('nav_demo')}
            </Link>
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {t('nav_dashboard')}
                </Link>
                <span className="text-gray-500 text-sm">Hi, {user.name}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1" />
                  {t('nav_logout')}
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">{t('nav_login')}</Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm">{t('nav_signup')}</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-primary-600 min-w-[44px] min-h-[44px]"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100">
          <div className="px-4 py-3 space-y-3">
            <Link 
              to="/demo" 
              className="block text-gray-600 hover:text-primary-600 py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav_demo')}
            </Link>
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className="block text-gray-600 hover:text-primary-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav_dashboard')}
                </Link>
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="block w-full text-left text-gray-600 hover:text-primary-600 py-2"
                >
                  {t('nav_logout')}
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="block text-gray-600 hover:text-primary-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav_login')}
                </Link>
                <Link 
                  to="/signup" 
                  className="block text-primary-600 font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav_signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
