import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  UserPlus,
  CreditCard,
  Globe,
  Download,
  RefreshCw,
  Package,
  Activity,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Search,
  Smartphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Cpu,
  Layers,
  CheckCircle2,
  Code,
  Sparkles
} from 'lucide-react';
import { Container, Alert } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { auditApi, adminApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Action metadata: icon + color + category mapping
const ACTION_META = {
  PRODUCT_CREATE:  { icon: Plus,        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', key: 'audit_product_created', tag: 'Product Added' },
  PRODUCT_UPDATE:  { icon: Pencil,      color: 'bg-blue-50 text-blue-700 border-blue-200',          key: 'audit_product_updated', tag: 'Product Modified' },
  PRODUCT_DELETE:  { icon: Trash2,      color: 'bg-rose-50 text-rose-700 border-rose-200',          key: 'audit_product_deleted', tag: 'Product Removed' },
  LOGIN:           { icon: LogIn,       color: 'bg-zinc-100 text-zinc-700 border-zinc-200',         key: 'audit_login',           tag: 'Session Login' },
  SIGNUP:          { icon: UserPlus,    color: 'bg-purple-50 text-purple-700 border-purple-200',    key: 'audit_signup',          tag: 'Account Registered' },
  PAYMENT_SAVE:    { icon: CreditCard,  color: 'bg-amber-50 text-amber-700 border-amber-200',       key: 'audit_payment_saved',   tag: 'Payment Config' },
  LANGUAGE_CHANGE: { icon: Globe,       color: 'bg-cyan-50 text-cyan-700 border-cyan-200',          key: 'audit_language_changed', tag: 'Language Switch' },
  EXPORT_CSV:      { icon: Download,    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',    key: 'audit_export_csv',      tag: 'Catalog Export' },
  SHOPIFY_SYNC:    { icon: RefreshCw,   color: 'bg-emerald-100 text-emerald-800 border-emerald-300', key: 'audit_shopify_sync',  tag: 'Shopify Sync' },
  AI_RUN: { icon: Sparkles, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', key: null, tag: 'AI Call' },
  AI_PROVIDER_FALLBACK: { icon: AlertTriangle, color: 'bg-amber-50 text-amber-700 border-amber-200', key: null,                   tag: 'AI Fallback' },
  AI_CHAIN_FAILED: { icon: XCircle, color: 'bg-rose-50 text-rose-700 border-rose-200',             key: null,                   tag: 'AI Chain Outage' },
  ADMIN_AI_CONFIG_UPDATE: { icon: Cpu, color: 'bg-blue-50 text-blue-700 border-blue-200',         key: null,                   tag: 'AI Agent Config' },
  ADMIN_DELETE_SELLER: { icon: Trash2, color: 'bg-rose-50 text-rose-700 border-rose-200',         key: null,                   tag: 'Seller Removal' },
  PASSWORD_CHANGE: { icon: ShieldCheck, color: 'bg-blue-50 text-blue-700 border-blue-200',       key: null,                   tag: 'Password Changed' },
  PHONE_LINK:      { icon: Smartphone,  color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       key: null,                   tag: 'Mobile Linked' },
  ACCESS_REQUEST_SUBMIT:  { icon: UserPlus,     color: 'bg-purple-50 text-purple-700 border-purple-200',   key: null,           tag: 'Access Requested' },
  ACCESS_REQUEST_APPROVE: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', key: null,           tag: 'Store Approved' },
  ACCESS_REQUEST_REJECT:  { icon: XCircle,      color: 'bg-rose-50 text-rose-700 border-rose-200',         key: null,           tag: 'Request Declined' }
};

const fallbackMeta = { icon: Activity, color: 'bg-zinc-100 text-zinc-600 border-zinc-200', key: null, tag: 'System Event' };

// Category filter definitions. Labels are translation keys so the filter row
// follows the app language instead of staying English inside a translated page.
const CATEGORIES = [
  { id: 'ALL', labelKey: 'audit_all_activities', fallback: 'All Activities' },
  { id: 'PRODUCTS', labelKey: 'audit_cat_products', fallback: 'Products', actions: ['PRODUCT_CREATE', 'PRODUCT_UPDATE', 'PRODUCT_DELETE'] },
  { id: 'AUTH', labelKey: 'audit_cat_auth', fallback: 'Auth & Access', actions: ['LOGIN', 'SIGNUP', 'PASSWORD_CHANGE', 'PHONE_LINK'] },
  { id: 'ONBOARDING', labelKey: 'audit_cat_onboarding', fallback: 'Onboarding', actions: ['ACCESS_REQUEST_SUBMIT', 'ACCESS_REQUEST_APPROVE', 'ACCESS_REQUEST_REJECT'] },
  { id: 'INTEGRATIONS', labelKey: 'audit_cat_integrations', fallback: 'Shopify & Channels', actions: ['SHOPIFY_SYNC', 'EXPORT_CSV', 'PAYMENT_SAVE', 'LANGUAGE_CHANGE'] },
  { id: 'AI', labelKey: 'audit_cat_ai', fallback: 'AI & System', actions: ['AI_RUN', 'AI_PROVIDER_FALLBACK', 'AI_CHAIN_FAILED', 'ADMIN_AI_CONFIG_UPDATE', 'ADMIN_DELETE_SELLER'] }
];

function formatPreciseTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}

function parseDetails(details) {
  if (!details) return {};
  try {
    return typeof details === 'string' ? JSON.parse(details) : details;
  } catch {
    return { what: String(details) };
  }
}

function getSummaryText(log, obj) {
  if (obj.what) return obj.what;
  if (log.action === 'PRODUCT_CREATE') return `Created product "${obj.name || 'item'}" (${obj.category || 'General'})`;
  if (log.action === 'PRODUCT_UPDATE') return `Updated product "${obj.name || log.entityId}"`;
  if (log.action === 'PRODUCT_DELETE') return `Deleted product #${log.entityId}`;
  if (log.action === 'LOGIN') return 'User successfully signed in to store';
  if (log.action === 'SIGNUP') return 'New merchant account registered';
  if (log.action === 'PASSWORD_CHANGE') return 'Account password changed by the owner';
  if (log.action === 'PHONE_LINK') return `Mobile number linked: ${obj.phone || ''}`;
  if (log.action === 'ACCESS_REQUEST_SUBMIT') return 'A new store requested access to the platform';
  if (log.action === 'ACCESS_REQUEST_APPROVE') return 'Access request approved and store account created';
  if (log.action === 'ACCESS_REQUEST_REJECT') return 'Access request declined';
  if (log.action === 'SHOPIFY_SYNC') return `Synchronized catalog to Shopify (${obj.syncedCount || 1} items)`;
  if (log.action === 'EXPORT_CSV') return `Exported CSV catalog (${obj.productCount || 0} products)`;
  return log.action;
}

/**
 * The one and only activity log.
 *
 * This started life as a standalone seller page while the admin portal grew a
 * second, thinner "Platform Log" tab that read the same rows. Two surfaces, one
 * dataset — so the rich panel lives here and both callers mount it:
 *   • `<ActivityLog />`            — standalone page for a store owner
 *   • `<ActivityLog embedded admin />` — the admin portal's Activity Log tab,
 *                                        fed by the platform-wide endpoint
 */
export function ActivityLog({ embedded = false, admin: adminProp = false }) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  // An admin always gets the platform-wide trail, even on the standalone page.
  const admin = adminProp || isAdmin;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [showRawJson, setShowRawJson] = useState({});

  const loadAudit = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = admin ? await adminApi.audit(300) : await auditApi.list(300);
      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Audit load error:', err);
      setError(err.response?.data?.error || t('error_generic') || 'Failed to load the activity log');
    } finally {
      setLoading(false);
    }
  }, [admin, t]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const cat = CATEGORIES.find(c => c.id === selectedCategory);
        if (cat && !cat.actions.includes(log.action)) {
          return false;
        }
      }

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const obj = parseDetails(log.details);
      const summary = getSummaryText(log, obj).toLowerCase();
      const raw = typeof log.details === 'string' ? log.details.toLowerCase() : JSON.stringify(log.details || {}).toLowerCase();

      return (
        log.action?.toLowerCase().includes(q) ||
        summary.includes(q) ||
        raw.includes(q) ||
        log.entityId?.toLowerCase().includes(q) ||
        log.ip?.toLowerCase().includes(q) ||
        log.actorEmail?.toLowerCase().includes(q)
      );
    });
  }, [logs, selectedCategory, searchQuery]);

  const toggleExpand = (id) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const toggleRawJson = (id, e) => {
    e.stopPropagation();
    setShowRawJson(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const scopeNote = (
    <p className="text-xs text-zinc-500 flex items-start gap-1.5">
      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-zinc-400" />
      <span>
        {admin
          ? t('audit_admin_scope', 'Platform-wide — every merchant and system event, with the actor who caused it.')
          : t('audit_owner_scope', 'Every change made to this store is recorded here automatically.')}
      </span>
    </p>
  );

  const filterBar = (
    <div className="bg-white border border-zinc-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('audit_search_placeholder', 'Search the log by action, product, IP or change details…')}
            className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-colors"
          />
        </div>
        <span className="text-xs text-zinc-500 font-medium whitespace-nowrap self-end md:self-auto">
          {t('audit_showing', 'Showing')} {filteredLogs.length} / {logs.length} {t('audit_entries', 'entries')}
        </span>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200'
            }`}
          >
            {t(cat.labelKey, cat.fallback)}
          </button>
        ))}
      </div>
    </div>
  );

  const listSection = loading ? (
    <div className="space-y-2.5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-3">
          <div className="skeleton w-9 h-9 rounded-full shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-48"></div>
            <div className="skeleton h-2.5 w-32"></div>
          </div>
        </div>
      ))}
    </div>
  ) : filteredLogs.length === 0 ? (
    <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center space-y-3">
      <ShieldCheck className="w-10 h-10 text-zinc-300 mx-auto stroke-[1.5]" />
      <h3 className="text-sm font-semibold text-zinc-900">{t('audit_empty') || 'No activity records match your criteria'}</h3>
      <p className="text-zinc-500 text-xs max-w-sm mx-auto">
        {t('audit_empty_sub', 'Actions like adding products, logging in, or saving payment details will appear here.')}
      </p>
    </div>
  ) : (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
      <ul className="divide-y divide-zinc-100">
        {filteredLogs.map((log) => {
          const logKey = log.id || `${log.createdAt}-${log.action}`;
          const meta = ACTION_META[log.action] || fallbackMeta;
          const Icon = meta.icon;
          const obj = parseDetails(log.details);
          const isExpanded = expandedLogId === logKey;
          const summary = getSummaryText(log, obj);
          const hasChanges = obj.changes && Object.keys(obj.changes).length > 0;

          return (
            <li key={logKey} className="transition-colors hover:bg-zinc-50/70">
              {/* Primary Row Header */}
              <div
                onClick={() => toggleExpand(logKey)}
                className="flex items-start gap-3.5 px-4 sm:px-5 py-3.5 cursor-pointer select-none"
              >
                <span className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center mt-0.5 ${meta.color}`}>
                  <Icon className="w-4 h-4" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold text-zinc-950 font-mono tracking-tight">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                      {meta.tag}
                    </span>
                    {admin && log.actorEmail && (
                      <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded truncate max-w-[200px]">
                        {log.actorName ? `${log.actorName} · ` : ''}{log.actorEmail}
                      </span>
                    )}
                    {log.entityType && (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        [{log.entityType}{log.entityId ? ` #${log.entityId}` : ''}]
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 leading-relaxed font-medium">
                    {summary}
                  </p>
                  {obj.why && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 italic">
                      {t('admin_why', 'Reason')}: {typeof obj.why === 'string' ? obj.why : Array.isArray(obj.why) ? obj.why.join(' | ') : ''}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-3 pt-0.5">
                  <time className="text-[11px] font-mono text-zinc-400 text-right whitespace-nowrap hidden sm:block" dateTime={log.createdAt}>
                    {formatPreciseTime(log.createdAt)}
                  </time>
                  <span className="text-zinc-400 hover:text-zinc-600 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
              </div>

              {/* Detailed Structured Inspector Drawer */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-1 bg-zinc-50/80 border-t border-zinc-100 space-y-3 text-xs">
                  {/* Field Diff Section if changes exist */}
                  {hasChanges && (
                    <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-2 shadow-2xs">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        {t('audit_field_changes', 'Exact field changes')}
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-zinc-100 text-left text-zinc-400 uppercase font-semibold">
                              <th className="py-1 pr-3">{t('audit_col_field', 'Field')}</th>
                              <th className="py-1 pr-3">{t('audit_col_before', 'Previous value')}</th>
                              <th className="py-1">{t('audit_col_after', 'Updated value')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 font-mono">
                            {Object.entries(obj.changes).map(([field, delta]) => (
                              <tr key={field}>
                                <td className="py-1 pr-3 font-semibold text-zinc-700">{field}</td>
                                <td className="py-1 pr-3 text-rose-700 bg-rose-50/60 px-1.5 rounded">{String(delta.from ?? 'none')}</td>
                                <td className="py-1 text-emerald-700 bg-emerald-50/60 px-1.5 rounded">{String(delta.to ?? 'none')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Synced Products if Shopify sync */}
                  {Array.isArray(obj.products) && obj.products.length > 0 && (
                    <div className="bg-white border border-emerald-200 rounded-lg p-3 space-y-2 shadow-2xs">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        {t('audit_shopify_synced', 'Shopify synced products')} ({obj.products.length})
                      </h4>
                      <div className="space-y-1">
                        {obj.products.map(p => (
                          <div key={p.id} className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-zinc-900">{p.name}</span>
                            {p.shopifyUrl && (
                              <a
                                href={p.shopifyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                              >
                                {t('view_on_shopify', 'View on Shopify')} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata Footer: IP, Actor, Payload toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-3 flex-wrap">
                      {log.actorEmail && <span>{t('audit_actor', 'Actor')}: <span className="font-mono text-zinc-700">{log.actorEmail}</span></span>}
                      {log.ip && (
                        <span>IP: <span className="font-mono text-zinc-700">{log.ip}</span></span>
                      )}
                      <span>{t('audit_when', 'When')}: <span className="font-mono text-zinc-700">{formatPreciseTime(log.createdAt)}</span></span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => toggleRawJson(logKey, e)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 underline"
                    >
                      <Code className="w-3 h-3" />
                      {showRawJson[logKey] ? t('audit_hide_raw', 'Hide raw payload') : t('audit_show_raw', 'Inspect raw payload')}
                    </button>
                  </div>

                  {/* Raw JSON viewer */}
                  {showRawJson[logKey] && (
                    <pre className="p-3 bg-zinc-950 text-zinc-200 rounded-lg text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const footerNote = !loading && logs.length > 0 && (
    <p className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
      <Package className="w-3 h-3" />
      {t('audit_note') || 'This log is stored securely and cannot be edited.'}
    </p>
  );

  const body = (
    <>
      {error && (
        <Alert type="error" message={error} className="mb-5" onClose={() => setError('')} />
      )}
      {scopeNote}
      {filterBar}
      {listSection}
      {footerNote}
    </>
  );

  // Embedded inside the admin portal: the portal already owns the page chrome.
  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 py-6 px-4">
        <Container>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-950 text-white">
                  {t('audit_badge') || 'Audit Trail'}
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {logs.length} {t('audit_entries', 'entries')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2.5 font-heading">
                <span className="w-9 h-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center">
                  <History className="w-4.5 h-4.5" />
                </span>
                {t('audit_title') || 'Activity Log'}
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                {t('audit_subtitle') || 'Every change to your store is recorded here automatically.'}
              </p>
            </div>
            <button
              type="button"
              onClick={loadAudit}
              className="btn-secondary text-xs font-semibold py-2 px-3.5 flex items-center gap-1.5 self-start shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>
        </Container>
      </div>

      <Container className="py-6 space-y-4">
        {body}
      </Container>
    </div>
  );
}

/** Standalone route component (store owner's own activity log). */
export function Audit() {
  return <ActivityLog />;
}

export default Audit;
