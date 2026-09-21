import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/client';
import { Alert } from '../components/ui';

/**
 * Every account our onboarding team provisions starts on a temporary password, so this
 * page is the first thing that merchant sees. Keeping it a full page (rather than a
 * modal) means it can't be dismissed or accidentally skipped.
 */
export function ChangePassword() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const isFirstTime = !!user?.mustChangePassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (formData.newPassword !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: t('password_mismatch', 'Passwords do not match') });
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      updateUser({ mustChangePassword: false });
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1400);
    } catch (err) {
      const details = err.response?.data?.details;
      if (details) {
        setFieldErrors(details);
      }
      setError(err.response?.data?.error || t('error_generic', 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-10 sm:py-16 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-blue-100/60 blur-[110px]"></div>
        <div className="absolute -bottom-32 -left-24 w-[400px] h-[300px] rounded-full bg-emerald-100/50 blur-[100px]"></div>
      </div>

      <div className="relative w-full max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-950 text-white mb-5 shadow-lg ring-1 ring-zinc-800">
            <KeyRound className="w-7 h-7 stroke-[2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight font-heading">
            {t('change_password_title', 'Choose your own password')}
          </h1>
          <p className="text-zinc-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            {isFirstTime
              ? t('change_password_first_time', 'You signed in with a temporary password. Set your own so only you can open your store.')
              : t('change_password_subtitle', 'Update the password you use to sign in to your store workspace.')}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] p-6 sm:p-8">
          {done ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-950 font-heading">
                {t('change_password_done', 'Password updated')}
              </h2>
              <p className="text-sm text-zinc-500 mt-2">
                {t('change_password_redirect', 'Taking you to your catalog…')}
              </p>
              <span className="mt-4 inline-block w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></span>
            </div>
          ) : (
            <>
              {error && <Alert type="error" message={error} className="mb-6" />}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                    {t('current_password', 'Current password')}
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className={`input ${fieldErrors.currentPassword ? 'input-error' : ''}`}
                  />
                  {fieldErrors.currentPassword && <p className="field-error">{fieldErrors.currentPassword}</p>}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                    {t('new_password', 'New password')}
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder={t('password_rule', 'At least 8 characters, with a letter and a number')}
                    required
                    autoComplete="new-password"
                    className={`input ${fieldErrors.newPassword ? 'input-error' : ''}`}
                  />
                  {fieldErrors.newPassword && <p className="field-error">{fieldErrors.newPassword}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                    {t('confirm_password', 'Confirm new password')}
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder={t('confirm_password_placeholder', 'Repeat your new password')}
                    required
                    autoComplete="new-password"
                    className={`input ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
                  />
                  {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-60 mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>{t('change_password_btn', 'Update password')}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {!isFirstTime && (
                <div className="border-t border-zinc-100 mt-6 pt-5 text-center text-sm text-zinc-500">
                  <Link to="/dashboard" className="text-zinc-950 hover:text-zinc-700 font-semibold underline-offset-2 hover:underline">
                    {t('back_to_catalog', 'Back to my catalog')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('password_never_shared', 'We can never see your password — it is stored only as a hash')}</span>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
