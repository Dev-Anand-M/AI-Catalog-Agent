import { Store, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Store className="w-6 h-6 text-primary-400" />
              <span className="text-lg font-bold text-white">Digital Catalog</span>
            </div>
            <p className="text-sm text-gray-400">
              Helping small retailers and artisans create digital product catalogs 
              in their local language using AI and voice.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-primary-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/demo" className="text-sm hover:text-primary-400 transition-colors">
                  Demo Catalog
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-sm hover:text-primary-400 transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:p3ace.2" 
                  className="text-sm hover:text-primary-400 transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  p3ace.2.life@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by 
            <span className="text-white font-medium">Dev Anand, Hemanth & Dhanushree</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
