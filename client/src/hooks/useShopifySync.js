import { useCallback, useState } from 'react';
import { shopifyApi } from '../api/client';

/**
 * One implementation of "publish to Shopify", shared by every surface that offers it
 * (dashboard bulk sync, per-product sync, and the Channels page).
 *
 * Why this exists: the sync action used to live only inside a single card on the
 * Channels page, so a merchant browsing their catalog had no way to push a product —
 * and the local API never pushed anything automatically, meaning nothing reached
 * Shopify unless that one button was found and pressed.
 *
 * @param {object}   [options]
 * @param {Function} [options.onSynced] - receives the fresh [{ id, shopifyUrl, ... }]
 *                                        rows so the caller can update its list in
 *                                        place instead of refetching.
 */
export function useShopifySync({ onSynced } = {}) {
  const [state, setState] = useState({ loading: false, syncingId: null, error: '' });
  const [result, setResult] = useState(null);

  const sync = useCallback(async ({ productIds, productId = null } = {}) => {
    setState({ loading: true, syncingId: productId, error: '' });
    try {
      const response = await shopifyApi.sync(productIds);
      const data = response.data || {};

      setResult(data);
      if (onSynced && Array.isArray(data.products)) {
        onSynced(data.products);
      }

      setState({ loading: false, syncingId: null, error: '' });
      return data;
    } catch (err) {
      setState({
        loading: false,
        syncingId: null,
        error: err.response?.data?.error || 'Shopify sync failed. Please try again.'
      });
      return null;
    }
  }, [onSynced]);

  const reset = useCallback(() => {
    setState({ loading: false, syncingId: null, error: '' });
    setResult(null);
  }, []);

  return {
    sync,
    reset,
    result,
    syncing: state.loading,
    /** Id of the single product currently syncing, so only its button shows a spinner. */
    syncingId: state.syncingId,
    error: state.error
  };
}

export default useShopifySync;
