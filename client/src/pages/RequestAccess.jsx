import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Mail,
  Clock3,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { accessRequestApi } from '../api/client';
import { Alert, Select } from '../components/ui';
import { LanguageSelector } from '../components/LanguageSelector';
import { getCategoryOptions } from '../lib/categories';

const FIELD_CLASS = 'input';

/**
 * The only public way onto the platform.
 *
 * Enterprise software doesn't hand out accounts from a marketing page — a human
 * reviews the request, then provisions the store. That also means the merchant is
 * paired with someone who can set them up in their own language.
 */
export function RequestAccess() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    email: '',
    city: '',
    category: '',
    message: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (formData.name.trim().length < 2) {
      errors.name = t('request_name_error', 'Please tell us your name');
    }
    const email = formData.email.trim();
    if (!email) {
      errors.email = t('request_email_required', 'Please enter your email address so we can reach you');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.email = t('request_email_error', 'That email address does not look right');
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await accessRequestApi.submit(formData);
      setSubmitted(response.data);
    } catch (err) {
      if (err.response?.data?.details) {
        setFieldErrors(err.response.data.details);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(t('error_generic', 'Something went wrong. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 relative overflow-hidden py-10 sm:py-16">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-blue-100/60 blur-[110px]"></div>
        <div className="absolute -bottom-32 -right-24 w-[400px] h-[300px] rounded-full bg-emerald-100/50 blur-[100px]"></div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex justify-center">
          <LanguageSelector variant="buttons" />
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-950 text-white mb-5 shadow-lg ring-1 ring-zinc-800">
            <Store className="w-7 h-7 stroke-[2]" />
          </div>
          <span className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              {t('invite_only_badge', 'Invitation-only onboarding')}
            </span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-950 tracking-tight font-heading">
            {t('request_access_title', 'Request access to your store workspace')}
          </h1>
          <p className="text-zinc-500 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
            {t('request_access_subtitle', 'Tell us about your shop. Our onboarding team reviews every request personally and sets up your catalog with you — usually within one working day.')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
          {/* ---------- Form ---------- */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 mb-5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-zinc-950 font-heading">
                  {t('request_received_title', 'Request received')}
                </h2>
                <p className="text-sm text-zinc-500 mt-2.5 max-w-md mx-auto leading-relaxed">
                  {submitted.message || t('request_received_body', 'Our onboarding team will contact you within one working day.')}
                </p>
                {submitted.request?.id && (
                  <p className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2">
                    {t('request_reference', 'Reference')}:{' '}
                    <span className="font-mono font-semibold text-zinc-900">#{submitted.request.id}</span>
                  </p>
                )}
                <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/demo">
                    <button type="button" className="btn-secondary text-xs min-h-[40px]">
                      {t('request_explore_demo', 'Explore the demo store meanwhile')}
                    </button>
                  </Link>
                  <Link to="/login">
                    <button type="button" className="btn-primary text-xs min-h-[40px]">
                      {t('request_go_login', 'I already have an account')}
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {error && <Alert type="error" message={error} className="mb-6" />}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                        {t('request_your_name', 'Your name')}
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={t('request_your_name_placeholder', 'e.g. Ramesh Kumar')}
                        autoComplete="name"
                        className={`${FIELD_CLASS} ${fieldErrors.name ? 'input-error' : ''}`}
                      />
                      {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
                    </div>

                    <div>
                      <label htmlFor="businessName" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                        {t('request_store_name', 'Store or brand name')}
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder={t('request_store_name_placeholder', 'e.g. Lakshmi Handloom Weaves')}
                        autoComplete="organization"
                        className={FIELD_CLASS}
                      />
                      {fieldErrors.businessName && <p className="field-error">{fieldErrors.businessName}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                      {t('request_email', 'Email address')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t('request_email_placeholder', 'name@example.com')}
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`${FIELD_CLASS} ${fieldErrors.email ? 'input-error' : ''}`}
                    />
                    {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="city" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                        {t('request_city', 'City or town')}
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder={t('request_city_placeholder', 'e.g. Coimbatore')}
                        autoComplete="address-level2"
                        className={FIELD_CLASS}
                      />
                    </div>

                    <Select
                      label={t('request_category', 'What do you mainly sell?')}
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      options={getCategoryOptions(language)}
                      placeholder={t('request_category_placeholder', 'Choose a category')}
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
                      {t('request_message', 'Anything we should know?')}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      maxLength={2000}
                      placeholder={t('request_message_placeholder', 'How many products do you sell? Do you already sell on WhatsApp?')}
                      className={`${FIELD_CLASS} resize-y`}
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-60"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        <>
                          <span>{t('request_submit', 'Submit request')}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400 text-center leading-relaxed">
                    {t('request_consent', 'We only use these details to set up your store and contact you about it. No spam, ever.')}
                  </p>
                </form>

                <div className="border-t border-zinc-100 mt-6 pt-5 text-center text-sm text-zinc-500">
                  {t('have_account', 'Already have an account?')}{' '}
                  <Link to="/login" className="text-zinc-950 hover:text-zinc-700 font-semibold underline-offset-2 hover:underline">
                    {t('login_btn', 'Sign In')}
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* ---------- Trust panel ---------- */}
          <aside className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-7 lg:sticky lg:top-24">
            <h2 className="text-sm font-bold text-zinc-950 font-heading mb-5 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              {t('request_what_happens', 'What happens next')}
            </h2>

            <ol className="space-y-5">
              {[
                {
                  icon: Building2,
                  title: t('request_step1_title', 'We review your shop'),
                  body: t('request_step1_body', 'A real person on our onboarding team reads every request.')
                },
                {
                  icon: Mail,
                  title: t('request_step2_title', 'We reach out by email'),
                  body: t('request_step2_body', 'We review your store request and send credentials directly to your email.')
                },
                {
                  icon: CheckCircle2,
                  title: t('request_step3_title', 'Your store goes live'),
                  body: t('request_step3_body', 'We create the account, add your first products, and share the catalog link.')
                }
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3.5">
                  <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center">
                    <step.icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 pt-5 border-t border-zinc-100 flex items-start gap-2.5 text-[11px] text-zinc-500">
              <Clock3 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-zinc-400" />
              <span>{t('request_sla', 'Typical turnaround: one working day, Monday to Saturday.')}</span>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('request_privacy', 'Your details are used for onboarding only')}</span>
        </div>
      </div>
    </div>
  );
}

export default RequestAccess;
