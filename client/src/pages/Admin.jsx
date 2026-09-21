import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Package,
  Activity,
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Cpu,
  Clock,
  Mail,
  ShoppingBag,
  ExternalLink,
  Plus,
  UserPlus,
  Copy,
  Check
} from 'lucide-react';
import { Container, Alert } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { adminApi } from '../api/client';
import { ActivityLog } from './Audit';

const PROVIDER_BADGE = {
  gemini: 'bg-blue-50 text-blue-700 border-blue-200',
  openai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  grok: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  sambanova: 'bg-amber-50 text-amber-700 border-amber-200',
  perplexity: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  groq: 'bg-orange-50 text-orange-700 border-orange-200',
  deepseek: 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-zinc-100 text-zinc-500 border-zinc-200'
};

// Tab ids are also the ?tab= values, so "the log" is linkable from the navbar
// and from anywhere else that needs to deep-link into the console.
const TAB_IDS = ['overview', 'access', 'sellers', 'ai', 'audit'];

function formatTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return iso;
  }
}

export function Admin() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [tab, setTab] = useState(TAB_IDS.includes(requestedTab) ? requestedTab : 'overview');
  const tabsRef = useRef(null);
  const activeTabRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [providers, setProviders] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [customModelProvider, setCustomModelProvider] = useState(null);
  const [customModelInput, setCustomModelInput] = useState('');
  const [customModelError, setCustomModelError] = useState('');

  // Onboarding queue
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessCounts, setAccessCounts] = useState({});
  const [approvingId, setApprovingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [provisioned, setProvisioned] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, sellersRes, providersRes, requestsRes] = await Promise.all([
        adminApi.stats(),
        adminApi.sellers(),
        adminApi.aiProviders(),
        adminApi.accessRequests('all').catch(() => ({ data: { requests: [], counts: {} } }))
      ]);
      setStats(statsRes.data);
      setSellers(Array.isArray(sellersRes.data) ? sellersRes.data : []);
      setProviders(providersRes.data);
      setAccessRequests(Array.isArray(requestsRes.data?.requests) ? requestsRes.data.requests : []);
      setAccessCounts(requestsRes.data?.counts || {});
    } catch (err) {
      console.error('Admin load error:', err);
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Keep the URL and the visible tab in step, in BOTH directions: entering via
  // /admin?tab=audit opens the log, switching tabs makes that link shareable, and
  // clicking a navbar deep link while already on /admin still switches the tab.
  useEffect(() => {
    if (requestedTab !== tab) {
      setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (requestedTab && TAB_IDS.includes(requestedTab) && requestedTab !== tab) {
      setTab(requestedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTab]);

  // Bring the active tab into view inside the horizontally scrolling strip
  // without scrolling the page itself (`block: 'nearest'`).
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [tab]);

  const moveProvider = async (index, dir) => {
    if (!providers) return;
    const order = [...providers.precedence];
    const target = index + dir;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    setProviders({ ...providers, precedence: order, usingCustomPrecedence: true });
    try {
      setSavingOrder(true);
      await adminApi.updateAiProviders({ providerOrder: order });
      setToast(t('admin_saved') || 'Configuration saved');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save precedence');
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleProvider = async (id, disabled) => {
    if (!providers) return;
    const currentList = providers.providers.filter(p => p.disabled).map(p => p.id);
    const nextList = disabled
      ? [...new Set([...currentList, id])]
      : currentList.filter(x => x !== id);
    // optimistic update
    setProviders({
      ...providers,
      providers: providers.providers.map(p => p.id === id ? { ...p, disabled } : p)
    });
    try {
      await adminApi.updateAiProviders({ disabledProviders: nextList });
      setToast(t('admin_saved') || 'Configuration saved');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update provider');
      loadAll();
    }
  };

  const setModelOverride = async (id, model) => {
    if (!providers) return;
    const current = {};
    providers.providers.forEach(p => {
      if (p.modelOverride) current[p.id] = p.modelOverride;
    });
    if (model && model.trim()) current[id] = model.trim();
    else delete current[id];
    try {
      await adminApi.updateAiProviders({ providerModels: current });
      setProviders({
        ...providers,
        providers: providers.providers.map(p => p.id === id ? { ...p, modelOverride: model.trim() || null } : p)
      });
      setToast(t('admin_saved') || 'Configuration saved');
      setTimeout(() => setToast(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set model');
    }
  };

  const handleSaveCustomModel = async (provider) => {
    setCustomModelError('');
    if (!customModelInput || !customModelInput.trim()) {
      setCustomModelError('Please enter a custom model name.');
      return;
    }
    const cleanName = customModelInput.trim();
    const lowerName = cleanName.toLowerCase();

    // STRICT REJECTION: Reject if model already exists in standard list
    const isDuplicate = provider.defaultModel.toLowerCase() === lowerName ||
      (Array.isArray(provider.knownModels) && provider.knownModels.some(m => m.toLowerCase() === lowerName));

    if (isDuplicate) {
      setCustomModelError(`Model "${cleanName}" already exists in the standard model list for ${provider.label}. Please select it directly from the dropdown instead.`);
      return;
    }

    try {
      await adminApi.addCustomModel({ providerId: provider.id, modelName: cleanName });
      setProviders({
        ...providers,
        providers: providers.providers.map(p => p.id === provider.id ? { ...p, modelOverride: cleanName } : p)
      });
      setToast(`Custom model "${cleanName}" saved for ${provider.label}`);
      setCustomModelProvider(null);
      setCustomModelInput('');
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setCustomModelError(err.response?.data?.error || 'Failed to save custom model');
    }
  };

  const resetModelToDefault = async (providerId) => {
    await setModelOverride(providerId, '');
  };

  // -------------------------------------------------------------------------
  // Onboarding: approving a request is what actually creates a store account
  // -------------------------------------------------------------------------

  const approveRequest = async (request) => {
    setApprovingId(request.id);
    setError('');
    try {
      const res = await adminApi.approveAccessRequest(request.id);
      setProvisioned({ request, ...res.data });
      setToast(res.data?.message || 'Store account created');
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the store account');
    } finally {
      setApprovingId(null);
    }
  };

  const confirmReject = async (request) => {
    setError('');
    try {
      await adminApi.rejectAccessRequest(request.id, rejectNote);
      setRejectTarget(null);
      setRejectNote('');
      setToast('Request declined');
      setTimeout(() => setToast(''), 2500);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not decline the request');
    }
  };

  const copyCredentials = async () => {
    if (!provisioned?.credentials) return;
    const text = [
      `Store sign-in for ${provisioned.user?.name || ''}`.trim(),
      `Login: ${provisioned.credentials.identifier}`,
      `Temporary password: ${provisioned.credentials.temporaryPassword}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — select the details and copy them manually.');
    }
  };

  const runAiTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.testAi();
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ ok: false, attempts: [{ provider: 'request', ok: false, why: err.response?.data?.error || err.message }] });
    } finally {
      setTesting(false);
    }
  };

  const deleteSeller = async (seller) => {
    if (!window.confirm(`Delete "${seller.name}" (${seller.email}) and ALL their products? This cannot be undone.`)) return;
    try {
      await adminApi.deleteSeller(seller.id);
      setSellers(sellers.filter(s => s.id !== seller.id));
      setToast(t('admin_saved') || 'Seller removed');
      setTimeout(() => setToast(''), 2500);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete seller');
    }
  };

  const TABS = [
    { id: 'overview', label: t('admin_tab_overview') || 'Overview', icon: Activity },
    {
      id: 'access',
      label: t('admin_tab_access') || 'Access Requests',
      icon: UserPlus,
      badge: accessCounts.pending || 0
    },
    { id: 'sellers', label: t('admin_tab_sellers') || 'Sellers', icon: Users },
    { id: 'ai', label: t('admin_tab_ai') || 'AI Providers', icon: Sparkles },
    { id: 'audit', label: t('admin_tab_audit') || 'Activity Log', icon: Eye }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 py-6 px-4">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-950 text-white mb-2">
                <ShieldCheck className="w-3 h-3" />
                {t('admin_badge') || 'Admin Portal'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight font-heading">
                {t('admin_title') || 'Platform Administration'}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {t('admin_subtitle') || 'Oversee sellers, configure AI providers, and audit every platform event.'}
              </p>
            </div>
            <button type="button" onClick={loadAll} className="btn-secondary text-xs font-medium py-2 px-3.5 flex items-center gap-1.5 self-start">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>

          {/* Tabs */}
          {/* The strip scrolls on narrow screens, so a deep link to a tab near the
              end (…?tab=audit) used to open a tab that was off-screen: it looked
              like nothing had happened. Keep the active tab in view. */}
          <div className="flex gap-1 mt-5 overflow-x-auto" ref={tabsRef}>
            {TABS.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                ref={id === tab ? activeTabRef : null}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  tab === id
                    ? 'bg-zinc-950 text-white'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {badge > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    tab === id ? 'bg-amber-400 text-zinc-950' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {error && <Alert type="error" message={error} className="mb-5" onClose={() => setError('')} />}
        {toast && (
          <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {toast}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-zinc-200 rounded-xl p-6">
                <div className="skeleton h-3 w-24 mb-3"></div>
                <div className="skeleton h-8 w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ============ OVERVIEW ============ */}
            {tab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="card-enterprise p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_stat_sellers') || 'Active Sellers'}</p>
                        <p className="text-3xl font-bold text-zinc-950 font-heading mt-1">{stats.sellers}</p>
                      </div>
                      <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
                        <Users className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                  <div className="card-enterprise p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_stat_products') || 'Listed Products'}</p>
                        <p className="text-3xl font-bold text-zinc-950 font-heading mt-1">{stats.products}</p>
                      </div>
                      <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center ring-1 ring-emerald-100">
                        <Package className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                  <div className="card-enterprise p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_stat_events') || 'Audit Events'}</p>
                        <p className="text-3xl font-bold text-zinc-950 font-heading mt-1">{stats.events ?? 0}</p>
                      </div>
                      <span className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center ring-1 ring-purple-100">
                        <Activity className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI health strip */}
                {providers && (
                  <div className="card-enterprise p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-600" />
                        {t('admin_ai_health') || 'AI Provider Health'}
                      </h3>
                      <button
                        type="button"
                        onClick={runAiTest}
                        disabled={testing}
                        className="btn-primary text-[11px] font-semibold py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <Zap className={`w-3 h-3 ${testing ? 'animate-pulse' : ''}`} />
                        {testing ? (t('admin_testing') || 'Testing...') : (t('admin_test_chain') || 'Test Chain')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {providers.providers.map((p, i) => (
                        <div
                          key={p.id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            p.disabled
                              ? 'bg-zinc-50 text-zinc-400 border-zinc-200 line-through'
                              : p.configured
                                ? (PROVIDER_BADGE[p.id] || 'bg-zinc-100 text-zinc-700 border-zinc-200')
                                : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                          }`}
                          title={`${p.id} · ${p.configured ? 'key configured' : 'no API key'} · model: ${p.modelOverride || p.defaultModel}`}
                        >
                          <span className="text-[10px] font-bold text-zinc-400">#{i + 1}</span>
                          {p.label}
                          {p.configured && !p.disabled && <CheckCircle2 className="w-3 h-3" />}
                          {(!p.configured || p.disabled) && <XCircle className="w-3 h-3" />}
                        </div>
                      ))}
                    </div>

                    {/* Test result with WHY */}
                    {testResult && (
                      <div className={`mt-4 rounded-xl border p-4 text-xs space-y-2 ${testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                        <p className="font-bold flex items-center gap-1.5">
                          {testResult.ok ? (
                            <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('admin_test_ok') || `Chain OK — served by ${testResult.provider} (${testResult.model})`}</>
                          ) : (
                            <><XCircle className="w-4 h-4 text-rose-600" /> {t('admin_test_fail') || 'All providers failed'}</>
                          )}
                        </p>
                        {Array.isArray(testResult.attempts) && testResult.attempts.length > 0 && (
                          <ul className="space-y-1 text-zinc-600">
                            {testResult.attempts.map((a, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className={`mt-0.5 ${a.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{a.ok ? '✓' : '✗'}</span>
                                <span>
                                  <strong>{a.provider}</strong>{a.model ? ` (${a.model})` : ''}{a.why ? ` — ${a.why}` : a.ok ? ' — responded OK' : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Shopify Platform Overview */}
                <div className="card-enterprise p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-950">
                            {t('admin_shopify_integration', 'Shopify Enterprise Integration')}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {t('admin_channels_connected', 'Connected')}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {t('admin_active_store', 'Active Store')}: <span className="font-mono font-medium text-zinc-900">digital-catalog-agent.myshopify.com</span> · API 2024-01
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <a
                        href="https://digital-catalog-agent.myshopify.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                      >
                        {t('open_in_shopify', 'Open in Shopify')} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============ ACCESS REQUESTS ============ */}
            {tab === 'access' && (
              <div className="space-y-4">
                {/* One-time credentials — shown immediately after provisioning */}
                {provisioned && (
                  <div className="bg-white border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center ring-1 ring-emerald-200 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-zinc-950">
                          {t('admin_creds_title', 'Store account created')}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                          {t('admin_creds_once', 'Share these details with the merchant now — the temporary password is never shown again, and they will be asked to choose their own on first sign-in.')}
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_creds_login', 'Sign in with')}</p>
                            <p className="text-sm font-semibold text-zinc-900 mt-1 break-all font-mono">
                              {provisioned.credentials?.identifier}
                            </p>
                          </div>
                          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_creds_password', 'Temporary password')}</p>
                            <p className="text-sm font-semibold text-zinc-900 mt-1 font-mono tracking-widest">
                              {provisioned.credentials?.temporaryPassword}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-4">
                          <button
                            type="button"
                            onClick={copyCredentials}
                            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? (t('copied', 'Copied')) : (t('admin_creds_copy', 'Copy details'))}
                          </button>
                          {provisioned.user?.phone && (
                            <a
                              href={`https://wa.me/${(provisioned.user.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Namaste ${provisioned.user?.name || ''}, your CatalogAI store is ready.\nLogin: ${provisioned.credentials?.identifier}\nTemporary password: ${provisioned.credentials?.temporaryPassword}\nPlease change the password after signing in.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                            >
                              {t('admin_creds_whatsapp', 'Send on WhatsApp')}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {provisioned.user?.email && (
                            <a
                              href={`mailto:${provisioned.user.email}?subject=${encodeURIComponent('Your Store Workspace is Ready')}&body=${encodeURIComponent(
                                `Hello ${provisioned.user?.name || ''},\n\nYour store workspace is ready.\nLogin: ${provisioned.credentials?.identifier}\nTemporary password: ${provisioned.credentials?.temporaryPassword}\n\nPlease sign in and set your new password.`
                              )}`}
                              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5"
                            >
                              Send Email
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setProvisioned(null)}
                            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 px-2 py-2"
                          >
                            {t('dismiss', 'Dismiss')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inline decline confirmation (keeps the reason in the audit log) */}
                {rejectTarget && (
                  <div className="bg-white border border-rose-200 rounded-xl p-5">
                    <p className="text-sm font-semibold text-zinc-900">
                      {t('admin_reject_title', 'Decline this request?')}{' '}
                      <span className="text-zinc-500 font-normal">
                        — {rejectTarget.businessName || rejectTarget.name}
                      </span>
                    </p>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder={t('admin_reject_note', 'Optional reason (recorded in the activity log)')}
                      className="input mt-3 resize-y"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => confirmReject(rejectTarget)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        {t('admin_reject_confirm', 'Confirm decline')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRejectTarget(null); setRejectNote(''); }}
                        className="btn-secondary text-xs py-2 px-3.5"
                      >
                        {t('cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      {t('admin_access_queue', 'Onboarding queue')}
                    </p>
                    <span className="text-[11px] font-semibold text-zinc-600">
                      {accessCounts.pending || 0} {t('admin_pending', 'pending')}
                    </span>
                  </div>

                  {accessRequests.length === 0 ? (
                    <div className="p-12 text-center text-sm text-zinc-500">
                      {t('admin_no_requests', 'No access requests yet. Requests submitted from the website land here.')}
                    </div>
                  ) : (
                    <ul className="divide-y divide-zinc-100">
                      {[...accessRequests]
                        .sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1))
                        .map((r) => (
                          <li key={r.id} className="p-4 sm:p-5 hover:bg-zinc-50/60 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-zinc-900 text-sm">
                                    {r.businessName || r.name}
                                  </p>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_BADGE[r.status] || STATUS_BADGE.pending}`}>
                                    {r.status}
                                  </span>
                                  {r.category && (
                                    <span className="text-[11px] font-medium text-zinc-500">{r.category}</span>
                                  )}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                                  <span>{r.name}</span>
                                  {r.phone && <span className="font-mono">{r.phone}</span>}
                                  {r.email && <span>{r.email}</span>}
                                  {r.city && <span>{r.city}</span>}
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(r.createdAt)}
                                  </span>
                                </div>
                                {r.message && (
                                  <p className="text-xs text-zinc-600 mt-2 italic">“{r.message}”</p>
                                )}
                                {r.reviewNote && (
                                  <p className="text-[11px] text-zinc-500 mt-1">
                                    {t('admin_review_note', 'Note')}: {r.reviewNote}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {r.status === 'pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => approveRequest(r)}
                                      disabled={approvingId === r.id}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-60"
                                    >
                                      {approvingId === r.id ? (
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                      ) : (
                                        <UserPlus className="w-3.5 h-3.5" />
                                      )}
                                      {t('admin_approve', 'Approve & create store')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setRejectTarget(r); setRejectNote(''); }}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                                    >
                                      {t('admin_decline', 'Decline')}
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-zinc-400 text-right">
                                    {r.reviewedBy ? `${t('admin_reviewed_by', 'Reviewed by')} ${r.reviewedBy}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ============ SELLERS ============ */}
            {tab === 'sellers' && (
              <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                {sellers.length === 0 ? (
                  <div className="p-12 text-center text-sm text-zinc-500">
                    {t('admin_no_sellers') || 'No sellers registered yet.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-left">
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_col_seller') || 'Seller'}</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_col_products') || 'Products'}</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_col_value') || 'Catalog Value'}</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_col_lang') || 'Language'}</th>
                          <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{t('admin_col_joined') || 'Joined'}</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {sellers.map((s) => (
                          <tr key={s.id} className="hover:bg-zinc-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-full bg-zinc-950 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                  {s.name?.trim().charAt(0).toUpperCase() || 'S'}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-zinc-900 truncate max-w-[180px]">{s.name}</p>
                                  <p className="text-[11px] text-zinc-500 flex items-center gap-1 truncate max-w-[200px]">
                                    <Mail className="w-3 h-3 shrink-0" /> {s.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold">{s.productCount}</td>
                            <td className="px-4 py-3 font-semibold">₹{Number(s.catalogValue || 0).toLocaleString('en-IN')}</td>
                            <td className="px-4 py-3 uppercase text-zinc-600">{s.language || '—'}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{s.createdAt ? formatTime(s.createdAt) : '—'}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => deleteSeller(s)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
                                title={t('admin_delete_seller') || 'Delete seller and all their products'}
                              >
                                <Trash2 className="w-3 h-3" />
                                {t('delete') || 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ============ AI PROVIDERS ============ */}
            {tab === 'ai' && providers && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
                  <strong className="font-bold">{t('admin_ai_how_title') || 'How fallback works:'}</strong>{' '}
                  {t('admin_ai_how_body') || 'Providers are tried top to bottom. If one fails (bad key, quota, outage), the next takes over automatically — and every fallback is recorded to the audit log with the reason. Keys come from server environment variables; here you control order, per-provider model, and on/off state.'}
                </div>

                {providers.providers.map((p, i) => (
                  <div key={p.id} className={`card-enterprise p-5 ${p.disabled ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Position + name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          #{i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-950 text-sm flex items-center gap-2 flex-wrap">
                            {p.label}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                              p.disabled ? 'bg-zinc-100 text-zinc-400 border-zinc-200'
                                : p.configured ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {p.disabled ? (t('admin_disabled') || 'Disabled')
                                : p.configured ? (t('admin_key_ready') || 'Key ready')
                                : (t('admin_no_key') || 'No key in env')}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {t('admin_env_keys') || 'Env'}: {p.envKeys.join(', ')} · {t('admin_default_model') || 'default'}: {p.defaultModel}
                          </p>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Precedence arrows */}
                        <button type="button" onClick={() => moveProvider(i, -1)} disabled={i === 0 || savingOrder}
                          className="p-1.5 rounded-md border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 disabled:opacity-30"
                          title={t('admin_move_up') || 'Higher precedence'}>
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => moveProvider(i, 1)} disabled={i === providers.providers.length - 1 || savingOrder}
                          className="p-1.5 rounded-md border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 disabled:opacity-30"
                          title={t('admin_move_down') || 'Lower precedence'}>
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Model override */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={p.modelOverride || ''}
                            onChange={(e) => setModelOverride(p.id, e.target.value)}
                            className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-w-[200px]"
                            title={t('admin_model_select') || 'Model — default or manual override'}
                          >
                            <option value="">{t('admin_model_default') || `Default (${p.defaultModel})`}</option>
                            {p.knownModels.map(m => (
                              <option key={m} value={m} className={m === p.defaultModel ? 'font-bold' : ''}>{m}</option>
                            ))}
                            {p.modelOverride && !p.knownModels.includes(p.modelOverride) && (
                              <option value={p.modelOverride}>Custom: {p.modelOverride}</option>
                            )}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setCustomModelProvider(p);
                              setCustomModelInput('');
                              setCustomModelError('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-colors"
                            title="Configure custom model name for this agent"
                          >
                            <Plus className="w-3 h-3" /> Custom Model
                          </button>
                        </div>

                        {/* Enable/disable */}
                        <button
                          type="button"
                          onClick={() => toggleProvider(p.id, !p.disabled)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                            p.disabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          {p.disabled ? <><Eye className="w-3 h-3" />{t('admin_enable') || 'Enable'}</> : <><EyeOff className="w-3 h-3" />{t('admin_disable') || 'Disable'}</>}
                        </button>
                      </div>
                    </div>

                    {/* Active Custom Model Indicator */}
                    {p.modelOverride && !p.knownModels.includes(p.modelOverride) && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Cpu className="w-3 h-3 text-purple-600" />
                          Custom Model Override: <span className="font-mono font-bold">{p.modelOverride}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => resetModelToDefault(p.id)}
                          className="text-[11px] text-zinc-500 hover:text-rose-600 underline font-medium"
                        >
                          Reset to default ({p.defaultModel})
                        </button>
                      </div>
                    )}

                    {/* Custom Model Inline Config Drawer */}
                    {customModelProvider?.id === p.id && (
                      <div className="mt-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-bold text-zinc-950">
                              Enter Custom Model Name for {p.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setCustomModelProvider(null); setCustomModelError(''); }}
                            className="text-[11px] text-zinc-400 hover:text-zinc-600 font-medium"
                          >
                            {t('cancel', 'Cancel')}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {t('admin_custom_model_help', 'Enter the exact identifier of the custom model. Models already in the standard list cannot be entered as custom models.')}{' '}
                          <span className="font-mono">{p.knownModels.join(', ')}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customModelInput}
                            onChange={(e) => { setCustomModelInput(e.target.value); setCustomModelError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomModel(p); }}
                            placeholder={`e.g. ${p.id}-v2-custom`}
                            className="flex-1 text-xs border border-zinc-300 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono shadow-2xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveCustomModel(p)}
                            className="btn-primary text-xs font-semibold py-2 px-3.5 whitespace-nowrap shadow-xs"
                          >
                            Save Model
                          </button>
                        </div>
                        {customModelError && (
                          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                            <span>{customModelError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={runAiTest}
                  disabled={testing}
                  className="btn-primary text-xs font-semibold py-2.5 px-5 flex items-center gap-2 disabled:opacity-60"
                >
                  <Zap className={`w-4 h-4 ${testing ? 'animate-pulse' : ''}`} />
                  {testing ? (t('admin_testing') || 'Testing chain...') : (t('admin_test_chain') || 'Test Full Fallback Chain')}
                </button>

                {testResult && (
                  <div className={`rounded-xl border p-4 text-xs space-y-2 ${testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <p className="font-bold flex items-center gap-1.5">
                      {testResult.ok
                        ? <><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t('admin_test_ok') || 'Chain OK'} — {testResult.provider} ({testResult.model})</>
                        : <><XCircle className="w-4 h-4 text-rose-600" /> {t('admin_test_fail') || 'All providers failed'}</>}
                    </p>
                    <ul className="space-y-1 text-zinc-600">
                      {(testResult.attempts || []).map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className={a.ok ? 'text-emerald-600' : 'text-rose-500'}>{a.ok ? '✓' : '✗'}</span>
                          <span><strong>{a.provider}</strong>{a.model ? ` (${a.model})` : ''}{a.why ? ` — ${a.why}` : a.ok ? ' — responded OK' : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ============ ACTIVITY LOG ============ */}
            {/* One log, one implementation. This tab used to render its own
                thinner list of the same audit rows while a separate /audit page
                rendered the rich one — two places to maintain, two things to
                check. Both now mount the same panel. */}
            {tab === 'audit' && (
              <ActivityLog embedded admin />
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default Admin;
