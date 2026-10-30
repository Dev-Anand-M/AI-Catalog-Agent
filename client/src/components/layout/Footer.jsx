import { Store, Mail, Heart, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function Footer() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  return (
    <footer className="bg-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Store className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight font-heading">
                Catalog<span className="text-primary-400">AI</span>
              </span>
              <p className="text-xs text-gray-400">
                {t('footer_tagline') || 'Enterprise Digital Catalog Agent for modern retailers and artisans.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-gray-400 font-medium">
            <Link to="/" className="footer-link hover:text-primary-400">
              {t('nav_home') || 'Home'}
            </Link>
            <Link to="/demo" className="footer-link hover:text-primary-400">
              {t('demo_catalog') || 'Interactive Demo'}
            </Link>
            {/* "Catalog Studio" is the seller's own catalog — an administrator
                gets the console link instead of a redirect loop. */}
            <Link to={isAdmin ? '/admin' : '/dashboard'} className="footer-link hover:text-primary-400 flex items-center gap-1">
              {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />}
              {isAdmin ? (t('admin_title') || 'Admin Portal') : (t('nav_dashboard') || 'Catalog Studio')}
            </Link>
            <a 
              href="mailto:p3ace.2.life@gmail.com" 
              className="footer-link hover:text-primary-400 flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5 text-gray-500" />
              {t('contact_us') || 'Support'}
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 text-xs text-gray-500">
          <p>© 2026 CatalogAI Studio. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span>Engineered by</span>
            <span className="font-semibold text-gray-300">Dev Anand, Hemanth & Dhanushree</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
