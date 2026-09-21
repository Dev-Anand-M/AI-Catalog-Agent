import { Store, Mail, Heart, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export function Footer() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  return (
    <footer className="bg-white border-t border-zinc-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-zinc-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Store className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-950 tracking-tight font-heading">
                Catalog<span className="text-blue-600">AI</span>
              </span>
              <p className="text-xs text-zinc-500">
                {t('footer_tagline') || 'Enterprise Digital Catalog Agent for modern retailers and artisans.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-600 font-medium">
            <Link to="/" className="hover:text-zinc-950 transition-colors">
              {t('nav_home') || 'Home'}
            </Link>
            <Link to="/demo" className="hover:text-zinc-950 transition-colors">
              {t('demo_catalog') || 'Interactive Demo'}
            </Link>
            {/* "Catalog Studio" is the seller's own catalog — an administrator
                gets the console link instead of a redirect loop. */}
            <Link to={isAdmin ? '/admin' : '/dashboard'} className="hover:text-zinc-950 transition-colors flex items-center gap-1">
              {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />}
              {isAdmin ? (t('admin_title') || 'Admin Portal') : (t('nav_dashboard') || 'Catalog Studio')}
            </Link>
            <a 
              href="mailto:p3ace.2.life@gmail.com" 
              className="hover:text-zinc-950 transition-colors flex items-center gap-1"
            >
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              {t('contact_us') || 'Support'}
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 text-xs text-zinc-500">
          <p>© 2026 CatalogAI Studio. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span>Engineered by</span>
            <span className="font-semibold text-zinc-800">Dev Anand, Hemanth & Dhanushree</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
