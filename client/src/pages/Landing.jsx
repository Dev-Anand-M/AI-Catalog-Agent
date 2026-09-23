import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mic,
  Camera,
  Store,
  ArrowRight,
  MessageCircle,
  Globe,
  Zap,
  Volume2,
  Share2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Container } from '../components/layout';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/LanguageSelector';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';

export function Landing() {
  const { t, language } = useLanguage();
  const { user, login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [isSpeakingIntro, setIsSpeakingIntro] = useState(false);

  // Signed-in users never see the marketing page: render a blank paint and
  // redirect immediately. isAuthenticated is synchronous now (no loading flash).
  useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, navigate]);

  // Authenticated → nothing to render (redirect is in flight, no blink)
  if (isAuthenticated) return null;

  const speakIntro = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeakingIntro) {
      setIsSpeakingIntro(false);
      return;
    }
    const textToSpeak = `${t('digital_store', 'Digital Catalog Studio')}. ${t('digital_store_sub', 'Voice-first inventory and multi-channel commerce studio')}.`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langMap = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN' };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeakingIntro(false);
    utterance.onerror = () => setIsSpeakingIntro(false);
    setIsSpeakingIntro(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleQuickDemo = async () => {
    if (user) {
      navigate('/dashboard');
      return;
    }
    setDemoLoading(true);
    try {
      let response;
      try {
        response = await authApi.login({
          email: 'demo@store.com',
          password: 'Seller1234'
        });
      } catch {
        response = await authApi.login({
          email: 'demo@store.com',
          password: 'password123'
        });
      }
      login(response.data.token, response.data.user);
      navigate('/dashboard');
    } catch (err) {
      navigate('/login');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white overflow-x-hidden">
      {/* ===== Top Language Bar ===== */}
      <div className="bg-white/85 backdrop-blur-md border-b border-zinc-200/70 py-2 sticky top-16 z-30">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
              <Globe className="w-3.5 h-3.5 text-zinc-500" />
              <span>{t('choose_language', 'Available in 6 Regional Languages')}</span>
            </div>
            <div className="w-full sm:w-auto flex justify-center">
              <LanguageSelector variant="buttons" />
            </div>
          </div>
        </Container>
      </div>

      {/* ===== HERO — dark premium with ambient gradient glow ===== */}
      <section className="relative bg-zinc-950 overflow-hidden">
        {/* Ambient gradient orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]"></div>
          <div className="absolute top-1/3 -right-32 w-[500px] h-[400px] rounded-full bg-indigo-500/15 blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-32 w-[500px] h-[400px] rounded-full bg-emerald-500/10 blur-[100px]"></div>
          {/* Fine grid texture */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
              backgroundSize: '56px 56px'
            }}
          ></div>
        </div>

        <Container className="relative">
          <div className="max-w-4xl mx-auto text-center pt-20 pb-24 sm:pt-28 sm:pb-32">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.06] border border-white/10 rounded-full text-xs font-medium text-zinc-300 backdrop-blur-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t('zero_commission_badge')}</span>
              <button
                type="button"
                onClick={speakIntro}
                className="ml-1 pl-2.5 border-l border-white/10 inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                title={t('listen', 'Listen to audio overview')}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeakingIntro ? 'text-blue-400 animate-bounce' : ''}`} />
                <span>{isSpeakingIntro ? (t('playing') || 'Playing...') : (t('listen') || 'Listen')}</span>
              </button>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight font-heading leading-[1.05] mb-7">
              {t('hero_headline_1', 'Your craft. Your store.')} <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                {t('hero_headline_2', 'Zero commission.')}
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg lg:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10 font-light">
              {t('hero_sub', 'Transform handmade goods and retail stock into an enterprise-grade digital catalog in seconds. Voice-activated in regional languages.')}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-lg mx-auto">
              <button
                type="button"
                onClick={handleQuickDemo}
                disabled={demoLoading}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-8 text-sm font-semibold rounded-xl bg-white text-zinc-950 shadow-[0_8px_30px_-6px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_40px_-6px_rgba(255,255,255,0.35)] hover:-translate-y-0.5 transition-all min-h-[50px] disabled:opacity-60"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span>{demoLoading ? (t('loading') || 'Launching...') : (t('try_demo', 'Try Interactive Demo Store'))}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <Link
                to="/request-access"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-8 text-sm font-semibold rounded-xl bg-white/[0.06] text-white border border-white/15 backdrop-blur-sm hover:bg-white/[0.12] hover:-translate-y-0.5 transition-all min-h-[50px]"
              >
                <span>{t('request_access', 'Request Access')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {/* Social Proof / Metrics */}
            <div className="mt-16 pt-10 border-t border-white/[0.08] grid grid-cols-3 gap-5 max-w-2xl mx-auto text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white font-heading">6</p>
                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">{t('metric_languages', 'Indian Languages')}</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white font-heading">0%</p>
                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">{t('metric_commission', 'Sales Commission')}</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white font-heading">{t('metric_direct', 'Direct')}</p>
                <p className="text-[11px] sm:text-xs text-zinc-500 font-medium mt-1 uppercase tracking-wider">{t('metric_upi', 'UPI & WhatsApp')}</p>
              </div>
            </div>
          </div>
        </Container>

        {/* Bottom fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* ===== 3 Feature Pillars ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <Container>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full mb-4">
                <Sparkles className="w-3 h-3" />
                {t('ai_powered', 'AI-Powered')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight font-heading">
                {t('powerful_features', 'Engineered for speed and simplicity')}
              </h2>
              <p className="text-sm sm:text-base text-zinc-500 mt-3 max-w-xl mx-auto">
                {t('features_subtitle', 'Everything you need to run your digital storefront with zero technical barriers.')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 1 — Voice */}
              <Link
                to={user ? "/dashboard" : "/demo"}
                className="card-enterprise p-7 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 ring-1 ring-blue-100 group-hover:ring-blue-200 group-hover:scale-105 transition-all">
                    <Mic className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-950 font-heading mb-2">
                    {t('feature_voice_title', 'Voice-to-Catalog')}
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {t('feature_voice_desc', 'Simply speak in your language. AI drafts full titles, descriptions, and pricing.')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-blue-600 inline-flex items-center gap-1.5 mt-6 group-hover:gap-2.5 transition-all">
                  {t('card_voice_cta', 'Try Voice Copilot')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              {/* Card 2 — Vision */}
              <Link
                to={user ? "/products/new" : "/login"}
                className="card-enterprise p-7 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 ring-1 ring-emerald-100 group-hover:ring-emerald-200 group-hover:scale-105 transition-all">
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-950 font-heading mb-2">
                    {t('feature_photo_title', 'AI Vision Studio')}
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {t('feature_photo_desc', 'Upload a craft photo. AI identifies materials, category, and fair market pricing.')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600 inline-flex items-center gap-1.5 mt-6 group-hover:gap-2.5 transition-all">
                  {t('card_vision_cta', 'Analyze Photo')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              {/* Card 3 — Export */}
              <Link
                to={user ? "/export" : "/login"}
                className="card-enterprise p-7 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5 ring-1 ring-purple-100 group-hover:ring-purple-200 group-hover:scale-105 transition-all">
                    <Share2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-950 font-heading mb-2">
                    {t('nav_market_channels', 'Multi-Channel Export')}
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    {t('feature_share_desc', 'Share your catalog link on WhatsApp, Facebook, or any platform to reach customers.')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-purple-600 inline-flex items-center gap-1.5 mt-6 group-hover:gap-2.5 transition-all">
                  {t('card_export_cta', 'View Channels')} <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== Live Storefront Showcase ===== */}
      <section className="pb-20 sm:pb-28 bg-gradient-to-b from-white to-zinc-50">
        <Container>
          <div className="max-w-5xl mx-auto">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.12)] overflow-hidden">
              {/* Storefront header bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 sm:px-8 py-6 border-b border-zinc-100 bg-gradient-to-r from-zinc-50/80 to-white">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-950 text-white flex items-center justify-center ring-1 ring-zinc-800">
                    <Store className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-zinc-950 font-heading">
                        {t('showcase_store_name', 'Ramesh Handicrafts & Potteries')}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        {t('showcase_verified', 'Verified Seller')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {t('showcase_sub', 'Live shareable buyer storefront · Direct UPI payments enabled')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="btn-primary text-xs font-semibold py-2.5 px-5 shrink-0"
                >
                  <span>{t('explore_catalog', 'Explore Catalog')}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>

              {/* 3 Real Catalog Products */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 sm:p-8">
                {/* Product 1 */}
                <div className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=500&q=80"
                      alt="Terracotta Chai Cups"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-zinc-950/75 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
                      Mitti Pottery
                    </span>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-semibold text-zinc-950 text-sm mb-1 line-clamp-1">
                        Terracotta Chai Kulhad (Set of 6)
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        Handmade clay tea cups with natural earthy aroma. 100% eco-friendly.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-950">₹170</span>
                      <a
                        href="https://wa.me/?text=Namaste,%20I%20want%20to%20order%20Terracotta%20Chai%20Kulhad"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{t('order', 'Order')}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Product 2 */}
                <div className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=500&q=80"
                      alt="Khadi Handloom Kurta"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-zinc-950/75 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
                      Handloom
                    </span>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-semibold text-zinc-950 text-sm mb-1 line-clamp-1">
                        Pure Khadi Handloom Cotton Kurta
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        Comfortable handspun khadi kurta dyed with traditional indigo colors.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-950">₹860</span>
                      <a
                        href="https://wa.me/?text=Namaste,%20I%20want%20to%20order%20Khadi%20Kurta"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{t('order', 'Order')}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Product 3 */}
                <div className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                  <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=500&q=80"
                      alt="Wooden Bowl"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-zinc-950/75 backdrop-blur-sm text-white text-[10px] font-semibold rounded-md">
                      Woodcraft
                    </span>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-semibold text-zinc-950 text-sm mb-1 line-clamp-1">
                        Hand-Carved Sheesham Wooden Bowl
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">
                        Traditional carved bowl polished with organic beeswax for food safety.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text-base font-bold text-zinc-950">₹470</span>
                      <a
                        href="https://wa.me/?text=Namaste,%20I%20want%20to%20order%20Sheesham%20Wooden%20Bowl"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{t('order', 'Order')}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
