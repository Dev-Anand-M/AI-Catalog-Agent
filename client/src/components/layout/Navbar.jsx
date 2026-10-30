import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, LogOut, Menu, X, Plus, CreditCard, Layers, History, ShieldCheck, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../LanguageSelector';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  // Get user initial
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5 group shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                <Store className="w-4 h-4 stroke-[2.2]" />
              </div>
              {/* Wordmark collapses to the mark below xl: Tamil and Kannada tab
                  labels are markedly wider, and the extra ~90px is what keeps the
                  bar on one line at 1024. */}
              <div className="hidden xl:flex flex-col">
                <span className="text-sm font-bold text-gray-900 tracking-tight leading-none font-heading">
                  Catalog<span className="text-primary-600">AI</span>
                </span>
                <span className="hidden xl:block text-[10px] text-gray-500 font-medium tracking-wide whitespace-nowrap">
                  Smart Merchant Studio
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links. From xl up only: the tabs in Tamil or
                Kannada are ~80px wider than in English, and at 1024 the bar ran
                off the edge and hid the avatar. Below xl the drawer carries them. */}
            {user && (
              <div className="hidden xl:flex items-center space-x-1 pl-4 border-l border-gray-200">
                {isAdmin ? (
                  <>
                    <Link 
                      to="/admin" 
                      className={`nav-tab ${isActive('/admin') ? 'is-active' : ''}`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                      {t('admin_title') || 'Admin Portal'}
                    </Link>

                    {/* No separate log link: there is exactly one log, and it is
                        the Activity Log tab inside the portal. /export is the
                        multi-channel hub, not a Shopify-only action, so it is no
                        longer mislabelled "Sync with Shopify". */}
                    <Link 
                      to="/export" 
                      className={`nav-tab ${isActive('/export') ? 'is-active' : ''}`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {t('nav_commerce_hub', 'Commerce Hub')}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/dashboard" 
                      className={`nav-tab ${isActive('/dashboard') ? 'is-active' : ''}`}
                    >
                      {t('nav_dashboard') || 'Catalog'}
                    </Link>

                  <Link 
                    to="/export" 
                    className={`nav-tab ${isActive('/export') ? 'is-active' : ''}`}
                  >
                    {t('nav_commerce_hub', 'Commerce Hub')}
                  </Link>

                    <Link 
                      to="/payment" 
                      className={`nav-tab ${isActive('/payment') ? 'is-active' : ''}`}
                    >
                      {t('nav_payment_setup') || 'Payments'}
                    </Link>

                    <Link 
                      to="/audit" 
                      className={`nav-tab ${isActive('/audit') ? 'is-active' : ''}`}
                    >
                      <History className="w-3.5 h-3.5" />
                      {t('audit_title') || 'Activity'}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="hidden md:flex items-center space-x-3 shrink-0">
            <LanguageSelector />

            {user ? (
              <div className="flex items-center gap-2 pl-2">
                {!isAdmin && (
                  <>
                    <Link
                      to="/products/new"
                      className="btn btn-primary text-xs px-3"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('add_new_product') || 'Add Product'}
                    </Link>
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 py-1 px-2.5 rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {userInitial}
                    </span>
                    <span className="hidden 2xl:inline max-w-[120px] truncate">{user.name}</span>
                    {isAdmin && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-normal bg-gray-900 text-amber-400">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <Link
                    to="/change-password"
                    className="icon-btn p-1.5"
                    title={t('change_password_title_short', 'Change password')}
                  >
                    <KeyRound className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="icon-btn p-1.5 hover:!text-rose-600 hover:!bg-rose-50 hover:!border-rose-100"
                    title={t('nav_logout') || 'Log Out'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Links styled as buttons: a <button> nested inside a <Link> is
                    invalid HTML, and the inline <a> that wrapped it added
                    descender space — the two never shared a baseline. */}
                <Link to="/login" className="btn btn-ghost text-xs px-3.5">
                  {t('nav_login') || 'Sign In'}
                </Link>
                <Link to="/request-access" className="btn btn-primary text-xs px-3.5">
                  {t('nav_request_access') || 'Request Access'}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex xl:hidden items-center gap-2">
            <div className="md:hidden">
              <LanguageSelector />
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {user ? (
            <>
              <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                    {userInitial}
                  </span>
                  <span className="text-xs font-semibold text-gray-800">{user.name}</span>
                </div>
                {isAdmin ? (
                  <span className="text-[10px] bg-gray-900 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-primary-700">ADMIN</span>
                ) : (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
                )}
              </div>

              {isAdmin ? (
                <>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-semibold text-gray-900 py-2 px-2.5 rounded-lg bg-gray-100"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    {t('admin_title') || 'Admin Portal'}
                  </Link>
                  <Link
                    to="/export"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-800 py-2 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <Layers className="w-4 h-4 text-gray-600" />
                    {t('nav_commerce_hub', 'Commerce Hub')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-800 py-2 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <Store className="w-4 h-4 text-gray-600" />
                    {t('nav_dashboard') || 'Catalog Products'}
                  </Link>
                  <Link
                    to="/products/new"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-white py-2 px-2.5 rounded-lg bg-primary-600 shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    {t('add_new_product') || 'Add New Product'}
                  </Link>
                  <Link
                    to="/export"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-800 py-2 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <Layers className="w-4 h-4 text-gray-600" />
                    {t('nav_commerce_hub', 'Commerce Hub')}
                  </Link>
                  <Link
                    to="/payment"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-800 py-2 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <CreditCard className="w-4 h-4 text-gray-600" />
                    {t('nav_payment_setup') || 'Payment Gateway'}
                  </Link>
                  <Link
                    to="/audit"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-800 py-2 px-2 rounded-lg hover:bg-gray-50"
                  >
                    <History className="w-4 h-4 text-gray-600" />
                    {t('audit_title') || 'Activity Log'}
                  </Link>
                </>
              )}
              <Link
                to="/change-password"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left text-xs font-medium text-gray-700 py-2 px-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-gray-600" />
                {t('change_password_title_short', 'Change password')}
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-xs font-medium text-rose-600 py-2 px-2 rounded-lg hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('nav_logout') || 'Log Out'}
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="btn btn-secondary text-xs w-full">
                {t('nav_login') || 'Sign In'}
              </Link>
              <Link to="/request-access" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary text-xs w-full">
                {t('nav_request_access') || 'Request Access'}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onConfirm={executeLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </nav>
  );
}
