import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, Zap, ArrowRight, ShieldCheck, AtSign, KeyRound, X, CheckCircle2, Clock, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/client';
import { Alert } from '../components/ui';
import { LanguageSelector } from '../components/LanguageSelector';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();
  const isAdminEmail = (email) => (import.meta.env?.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email || '').toLowerCase());
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNote, setForgotNote] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotResult, setForgotResult] = useState(null);
  const errorKey = useRef(0);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // The single field carries either an email address or a mobile number.
      const response = await authApi.login(formData);
      login(response.data.token, response.data.user);
      const u = response.data.user || {};
      const isAdminUser = u.role === 'admin' || isAdminEmail(u.email);
      // Everyone who is still on a temporary password must set their own before
      // they can use the workspace.
      const target = u.mustChangePassword
        ? '/change-password'
        : (isAdminUser && from === '/dashboard' ? '/admin' : from);
      navigate(target, { replace: true });
    } catch (err) {
      errorKey.current += 1;
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(t('error_generic') || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError('');
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
      navigate(from, { replace: true });
    } catch (err) {
      setError(t('error_generic') || 'Could not log in to demo store.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotResult(null);
    setForgotLoading(true);
    try {
      const res = await authApi.forgotPassword({ identifier: forgotIdentifier, note: forgotNote });
      setForgotResult(res.data);
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Could not find an account with that identifier.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleUseTempPassword = () => {
    if (forgotResult?.identifier) {
      setFormData({
        identifier: forgotResult.identifier,
        password: forgotResult.temporaryPassword || 'Seller1234'
      });
    }
    setShowForgotModal(false);
    setForgotResult(null);
    setForgotError('');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-10 sm:py-16 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-blue-100/60 blur-[110px]"></div>
        <div className="absolute -bottom-32 -right-24 w-[400px] h-[300px] rounded-full bg-emerald-100/50 blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-4">
        {/* Language Selector */}
        <div className="mb-8 flex justify-center">
          <LanguageSelector variant="buttons" />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-950 text-white mb-5 shadow-lg ring-1 ring-zinc-800">
            <Store className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight font-heading">
            {t('login_title', 'Welcome back')}
          </h1>
          <p className="text-zinc-500 text-sm mt-2">
            {t('login_subtitle', 'Sign in to manage your catalog and storefront')}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] p-6 sm:p-8">
          {/* 1-Click Demo */}
          <div className="mb-6 p-4 bg-gradient-to-br from-zinc-50 to-white border border-zinc-200 rounded-xl">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-600 uppercase tracking-[0.12em] mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('quick_instant_entry', '1-Click Instant Demo')}</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={demoLoading || loading}
              className="group w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 min-h-[46px] text-sm disabled:opacity-60"
            >
              <span>{t('quick_demo_store_name', 'Enter Demo Store')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <p className="text-[11px] text-zinc-400 mt-2.5 text-center">
              {t('quick_demo_sub', 'Explore a fully populated store — no credentials needed')}
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center mb-6">
            <div className="flex-grow border-t border-zinc-200"></div>
            <span className="flex-shrink mx-4 text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
              {t('or_login_email', 'or')}
            </span>
            <div className="flex-grow border-t border-zinc-200"></div>
          </div>

          {error && (
            <Alert key={errorKey.current} type="error" message={error} className="mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                {t('email_address', 'Email address')}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                  <AtSign className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  id="identifier"
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder={t('email_placeholder', 'name@example.com')}
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="input pl-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                  {t('password') || 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(true); setForgotResult(null); setForgotError(''); }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  {t('forgot_password', 'Forgot password?')}
                </button>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="group w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>{t('nav_login') || 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-zinc-100 mt-6 pt-5 text-center text-sm text-zinc-500">
            <p>
              {t('dont_have_account', 'No store account yet?')}{' '}
              <Link to="/request-access" className="text-zinc-950 hover:text-zinc-700 font-semibold underline-offset-2 hover:underline">
                {t('request_access', 'Request access')}
              </Link>
            </p>
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              {t('invite_only_note', 'We onboard every store personally — accounts are issued after a short review, not created automatically.')}
            </p>
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('login_trust', 'Encrypted sign-in · Your catalog data stays yours')}</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay !z-[9999]"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowForgotModal(false);
              setForgotResult(null);
              setForgotError('');
              setForgotNote('');
            }
          }}
        >
          <div className="modal-overlay-inner">
            <div className="modal-panel max-w-md w-full p-6 relative">
            <button
              type="button"
              onClick={() => { setShowForgotModal(false); setForgotResult(null); setForgotError(''); setForgotNote(''); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center ring-1 ring-amber-100">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-950 font-heading">
                  Request Password Reset
                </h3>
                <p className="text-xs text-zinc-500">
                  Notify store administrator to issue temporary access credentials
                </p>
              </div>
            </div>

            {forgotError && (
              <div className="mb-4">
                <Alert type="error" message={forgotError} />
              </div>
            )}

            {forgotResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Reset Request Sent to Administrator</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    {forgotResult.message || 'Your password reset request has been received. Your store administrator will verify your identity and share your temporary access credentials via WhatsApp or Email.'}
                  </p>
                  <div className="text-[11px] text-emerald-700 bg-white/80 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span>Status: Pending admin review & credentials issue</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotResult(null); setForgotError(''); setForgotNote(''); }}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Back to Sign In</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                    Registered Email or Phone
                  </label>
                  <input
                    type="text"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="name@example.com or +91 98765 43210"
                    required
                    className="input"
                    autoFocus
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    Enter the phone number or email address registered with your store.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                    Reason or Note <span className="text-zinc-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={forgotNote}
                    onChange={(e) => setForgotNote(e.target.value)}
                    placeholder="e.g. Forgot password, please share new credentials via WhatsApp"
                    className="input text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotResult(null); setForgotError(''); setForgotNote(''); }}
                    className="btn-secondary text-xs py-2 px-3.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{forgotLoading ? 'Submitting...' : 'Send Request to Admin'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>,
        document.body
      )}
    </div>
  );
}
