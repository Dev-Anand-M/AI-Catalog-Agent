import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, aiApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

// Where the orchestrator's `destination` values point, for a seller.
const ROUTE_BY_DESTINATION = {
  dashboard: '/dashboard',
  catalog: '/dashboard',
  products: '/products/new',
  product: '/products/new',
  export: '/export',
  channels: '/export',
  shopify: '/export',
  payment: '/payment',
  settings: '/payment',
  admin: '/admin'
};

// …and for an administrator, whose destinations are console sections. Anything
// seller-shaped that slips through resolves to the console rather than dropping
// an admin onto a product form.
const ADMIN_ROUTE_BY_DESTINATION = {
  admin: '/admin',
  overview: '/admin',
  dashboard: '/admin',
  platform: '/admin',
  sellers: '/admin?tab=sellers',
  merchants: '/admin?tab=sellers',
  access: '/admin?tab=access',
  requests: '/admin?tab=access',
  ai: '/admin?tab=ai',
  providers: '/admin?tab=ai',
  audit: '/admin?tab=audit',
  log: '/admin?tab=audit',
  activity: '/admin?tab=audit',
  channels: '/export',
  export: '/export',
  shopify: '/export'
};

// An administrator owns no catalog, so these intents must never execute for one.
const SELLER_ONLY_INTENTS = ['CREATE_PRODUCT', 'UPDATE_PRODUCT', 'CALCULATE_PRICING', 'ENHANCE_IMAGE'];

const speechLangCodes = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN',
  te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN'
};

/**
 * Runs what the AI Copilot proposed.
 *
 * The assistant used to be a dead end: `/ai/orchestrate` returned a structured
 * proposal, the modal rendered it beautifully, and "Confirm & apply" called an
 * `onActionConfirmed` prop that the global dock never passed — so the button
 * silently closed the dialog and did nothing. Behaviour now lives here, once,
 * so every entry point (floating dock, dashboard, future voice-only mode) can
 * actually create, update, navigate and open tools.
 *
 * Returns `{ ok, message }` so the caller can show and speak the outcome.
 * Intents that need a modal (pricing, image studio) are surfaced as state for
 * the host component to render.
 */
export function useAssistantActions({ products = [] } = {}) {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { isAdmin } = useAuth();
  const [pricingSeed, setPricingSeed] = useState(null);
  const [imageJob, setImageJob] = useState(null);

  // Anything that changes the catalog tells the pages to refetch, so a product
  // created by voice shows up without a manual reload.
  const refreshCatalog = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('catalog:refresh'));
    }
  };

  const speak = useCallback((text) => {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, ''));
    utterance.lang = speechLangCodes[language] || 'en-IN';
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const prefix = utterance.lang.split('-')[0];
    const voice = voices.find(v => v.lang === utterance.lang) || voices.find(v => v.lang.startsWith(prefix));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const handle = useCallback(async (action) => {
    const { intent, data = {} } = action || {};

    // The orchestrator asks an administrator about the platform, not about
    // products — but a stale proposal, a hand-typed command or a future intent
    // must still not write into an account that has no store.
    if (isAdmin && SELLER_ONLY_INTENTS.includes(intent)) {
      const message = t('admin_assistant_seller_only', 'Administrators do not manage products. Sign in as a seller to add or edit catalog items.');
      speak(message);
      return { ok: false, message };
    }

    switch (intent) {
      case 'CREATE_PRODUCT': {
        if (!data.name) return { ok: false, message: t('assistant_failed', 'The action could not be completed.') };
        try {
          const response = await productsApi.create({
            name: data.name,
            description: data.description || 'Listed with the AI Copilot',
            category: data.category || 'Other',
            price: parseFloat(data.price) || 0,
            language: 'en-IN',
            confirmationState: 'seller_confirmed'
          });
          refreshCatalog();
          return {
            ok: true,
            message: `${t('assistant_created', 'Created product')}: ${response.data?.name || data.name}`
          };
        } catch (err) {
          return { ok: false, message: err.response?.data?.error || t('assistant_failed', 'The action could not be completed.') };
        }
      }

      case 'UPDATE_PRODUCT': {
        const id = data.matchedProductId;
        if (!id) return { ok: false, message: t('assistant_failed', 'The action could not be completed.') };
        try {
          const patch = { confirmationState: 'seller_confirmed' };
          if (data.name) patch.name = data.name;
          if (data.category) patch.category = data.category;
          if (data.price != null && data.price !== '') patch.price = parseFloat(data.price);
          const response = await productsApi.update(id, patch);
          refreshCatalog();
          return {
            ok: true,
            message: `${t('assistant_updated', 'Updated product')}: ${response.data?.name || data.name || `#${id}`}`
          };
        } catch (err) {
          return { ok: false, message: err.response?.data?.error || t('assistant_failed', 'The action could not be completed.') };
        }
      }

      case 'CALCULATE_PRICING': {
        setPricingSeed({
          productName: data.name || '',
          category: data.category || 'Other',
          materialCost: data.materialCost ?? 200,
          labourCost: data.labourCost ?? 150,
          packagingCost: data.packagingCost ?? 30,
          desiredMarginPct: data.desiredMarginPct ?? 25
        });
        const message = `${t('assistant_opening', 'Opening')}: ${t('export_channels_title', 'Pricing calculator')}`;
        speak(message);
        return { ok: true, message };
      }

      case 'ENHANCE_IMAGE': {
        // The studio needs a photo to work on. Prefer one already in the catalog
        // rather than making the user re-upload through a voice command.
        const target = products.find(p => p.imageUrl);
        if (!target) {
          navigate('/products/new');
          const message = t('assistant_pick_photo', 'Add a photo first — opening the product form.');
          speak(message);
          return { ok: true, message };
        }
        setImageJob({ src: target.imageUrl, productId: target.id, name: target.name });
        const message = `${t('assistant_opening', 'Opening')}: ${t('card_vision_cta', 'AI Image Studio')}`;
        speak(message);
        return { ok: true, message };
      }

      case 'NAVIGATE': {
        const raw = String(data.destination || 'dashboard').toLowerCase().split('/')[0].trim();
        const path = isAdmin
          ? (ADMIN_ROUTE_BY_DESTINATION[raw] || '/admin')
          : (ROUTE_BY_DESTINATION[raw] || '/dashboard');
        navigate(path);
        const message = `${t('assistant_opening', 'Opening')}: ${raw}`;
        speak(message);
        return { ok: true, message };
      }

      case 'READ_PAGE': {
        try {
          const content = document.body.innerText.substring(0, 2000);
          const page = window.location.pathname.split('/').pop() || 'home';
          const response = await aiApi.readPage({ pageContent: content, pageName: page, language });
          const summary = response.data?.summary || '';
          speak(summary);
          return { ok: true, message: summary };
        } catch {
          return { ok: false, message: t('assistant_failed', 'The action could not be completed.') };
        }
      }

      case 'GENERAL_QUERY': {
        const answer = data.answer || t('assistant_failed', 'The action could not be completed.');
        speak(answer);
        return { ok: true, message: answer };
      }

      default:
        return { ok: false, message: t('assistant_failed', 'The action could not be completed.') };
    }
  }, [navigate, products, speak, t, language, isAdmin]);

  // Accepting an enhanced photo writes it back to the product it came from.
  const applyEnhancedImage = useCallback(async (imageUrl) => {
    if (!imageJob?.productId || !imageUrl) return { ok: false };
    try {
      await productsApi.update(imageJob.productId, { imageUrl });
      refreshCatalog();
      return { ok: true, message: t('assistant_updated', 'Updated product') };
    } catch {
      return { ok: false };
    }
  }, [imageJob, t]);

  return {
    handleAssistantAction: handle,
    speak,
    pricingSeed,
    closePricing: () => setPricingSeed(null),
    imageJob,
    closeImage: () => setImageJob(null),
    applyEnhancedImage
  };
}
