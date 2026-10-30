// Rich product metadata (confirmation state, cost breakdown, attributes, tags,
// media, status) has no dedicated columns, so it is stored inside the product
// description as an HTML comment. Every read path must unpack it, otherwise the
// raw `<!--META:{...}-->` blob shows up in the API response — which is exactly
// what buyers used to see on the public storefront.

// Unpack a stored product row into the shape the API returns.
function formatProductRecord(product) {
  if (!product) return product;
  let cleanDesc = product.description || '';
  let meta = {};

  const metaMatch = cleanDesc.match(/<!--META:([\s\S]*?)-->/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]);
      cleanDesc = cleanDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
    } catch (e) {
      console.error('Failed to parse product metadata:', e.message);
    }
  }

  return {
    ...product,
    description: cleanDesc,
    confirmationState: meta.confirmationState || product.confirmationState || 'seller_confirmed',
    status: meta.status || product.status || 'active',
    attributes: meta.attributes || product.attributes || {},
    tags: meta.tags || product.tags || [product.category, product.language].filter(Boolean),
    costBreakdown: meta.costBreakdown || product.costBreakdown || null,
    media: meta.media || (product.imageUrl ? [product.imageUrl] : [])
  };
}

// Pack a product payload back into a storable row.
function serializeProductRecord(data) {
  const { confirmationState, costBreakdown, attributes, tags, media, status, description, ...rest } = data;
  const hasMeta = confirmationState || costBreakdown || attributes || tags || media || status;

  let finalDesc = (description || '').trim();
  if (hasMeta) {
    finalDesc = finalDesc.replace(/<!--META:[\s\S]*?-->/, '').trim();
    const meta = {
      confirmationState: confirmationState || 'seller_confirmed',
      status: status || 'active',
      attributes: attributes || {},
      tags: tags || [],
      costBreakdown: costBreakdown || null,
      media: media || []
    };
    finalDesc = `${finalDesc}\n<!--META:${JSON.stringify(meta)}-->`;
  }

  return {
    ...rest,
    description: finalDesc
  };
}

module.exports = { formatProductRecord, serializeProductRecord };
