import { describe, it, expect } from 'vitest';

describe('Merchant Catalog Operations Suite', () => {
  const sampleProducts = [
    {
      id: 'prod-1',
      name: 'Terracotta Chai Kulhad',
      category: 'Handicrafts',
      description: 'Handmade clay tea cups with earthy fragrance',
      price: 170,
      confirmationState: 'seller_confirmed'
    },
    {
      id: 'prod-2',
      name: 'Pure Khadi Kurta',
      category: 'Clothing',
      description: 'Handspun indigo cotton kurta',
      price: 860,
      confirmationState: 'seller_confirmed'
    },
    {
      id: 'prod-3',
      name: 'Wooden Carved Bowl',
      category: 'Home & Kitchen',
      description: 'Polished sheesham wood bowl',
      price: 470,
      confirmationState: 'needs_review'
    }
  ];

  it('generates properly formatted WhatsApp ordering URL with price and item name', () => {
    const phoneNumber = '+919876543210';
    const product = sampleProducts[0];
    const message = `Namaste! I would like to order *${product.name}* (Price: ₹${product.price}) from your catalog.`;
    const encoded = encodeURIComponent(message);
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

    expect(url).toContain('https://wa.me/919876543210?text=');
    expect(url).toContain('Terracotta%20Chai%20Kulhad');
    expect(url).toContain('%E2%82%B9170'); // ₹ encoded
  });

  it('filters products correctly by search query across name and description', () => {
    const query = 'indigo';
    const filtered = sampleProducts.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Pure Khadi Kurta');
  });

  it('filters products by confirmation state', () => {
    const confirmed = sampleProducts.filter(p => p.confirmationState === 'seller_confirmed');
    const needsReview = sampleProducts.filter(p => p.confirmationState === 'needs_review');

    expect(confirmed.length).toBe(2);
    expect(needsReview.length).toBe(1);
  });

  it('computes total inventory value and confirmed counts accurately', () => {
    const totalValue = sampleProducts.reduce((acc, p) => acc + p.price, 0);
    const confirmedCount = sampleProducts.filter(p => p.confirmationState === 'seller_confirmed').length;

    expect(totalValue).toBe(170 + 860 + 470); // 1500
    expect(confirmedCount).toBe(2);
  });

  it('toggles product confirmation state between seller_confirmed and needs_review', () => {
    const toggle = (state) => state === 'seller_confirmed' ? 'needs_review' : 'seller_confirmed';

    expect(toggle('seller_confirmed')).toBe('needs_review');
    expect(toggle('needs_review')).toBe('seller_confirmed');
    expect(toggle('ai_suggested')).toBe('seller_confirmed');
  });

  it('calculates cost-plus pricing with transparent margin', () => {
    const rawMaterial = 120;
    const labor = 80;
    const packaging = 25;
    const marginPercent = 30; // 30%

    const cost = rawMaterial + labor + packaging; // 225
    const margin = Math.round((cost * marginPercent) / 100); // 67.5 -> 68
    const price = cost + margin; // 293

    expect(cost).toBe(225);
    expect(margin).toBe(68);
    expect(price).toBe(293);
  });
});
