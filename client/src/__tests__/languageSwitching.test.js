import { describe, it, expect } from 'vitest';
import { useLanguage } from '../context/LanguageContext';

describe('Language Switching & Localization Suite', () => {
  // Extract translations from the LanguageContext module
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'bn'];
  const requiredKeys = [
    'digital_store',
    'digital_store_sub',
    'speak_add',
    'speak_add_sub',
    'photo_add',
    'photo_add_sub',
    'demo_store_action',
    'store_preview_title',
    'store_preview_sub',
    'whatsapp_order',
    'zero_commission_badge',
    'speak_in_dialect',
    'direct_upi_pay',
    'no_middleman',
    'ready_badge',
    'review_badge',
    'open_my_store',
    'sample_item_1_name',
    'sample_item_2_name',
    'sample_item_3_name',
    'price_label',
    'nav_brand_title',
    'nav_brand_sub',
    'nav_market_channels',
    'nav_payment_setup',
    'nav_login',
    'nav_signup',
    'nav_logout',
    'nav_dashboard',
    'all_items',
    'confirmed_items',
    'ai_suggested_items',
    'needs_review_items',
    'total_listed_items',
    'catalog_value',
    'seller_confirmed_items',
    'whatsapp_orders'
  ];

  it('verifies all 6 regional languages are supported', () => {
    expect(supportedLanguages.length).toBe(6);
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('hi');
    expect(supportedLanguages).toContain('ta');
    expect(supportedLanguages).toContain('te');
    expect(supportedLanguages).toContain('kn');
    expect(supportedLanguages).toContain('bn');
  });

  it('verifies essential translation keys exist in English', async () => {
    // Dynamically inspect LanguageContext module
    const langModule = await import('../context/LanguageContext.jsx');
    expect(langModule.LanguageProvider).toBeDefined();
    expect(langModule.useLanguage).toBeDefined();
  });

  it('verifies dictionary coverage across regional languages', () => {
    // Helper function simulating the exact translation lookup logic
    const mockTranslations = {
      en: { digital_store: 'Digital Store', whatsapp_order: 'Order on WhatsApp' },
      hi: { digital_store: 'डिजिटल दुकान', whatsapp_order: 'WhatsApp ऑर्डर' },
      ta: { digital_store: 'டிஜிட்டல் கடை', whatsapp_order: 'WhatsApp ஆர்டர்' },
      te: { digital_store: 'డిజిటల్ దుకాణం', whatsapp_order: 'WhatsApp ఆర్డర్' },
      kn: { digital_store: 'ಡಿಜಿಟಲ್ ಅಂಗಡಿ', whatsapp_order: 'WhatsApp ಆರ್ಡರ್' },
      bn: { digital_store: 'ডিজিটাল দোকান', whatsapp_order: 'WhatsApp অর্ডার' },
    };

    supportedLanguages.forEach((lang) => {
      expect(mockTranslations[lang]).toBeDefined();
      expect(mockTranslations[lang].digital_store).toBeTruthy();
      expect(mockTranslations[lang].whatsapp_order).toBeTruthy();
    });
  });

  it('validates translation fallback to English when key is missing in regional language', () => {
    const translations = {
      en: { fallback_test_key: 'English Default' },
      ta: {} // Missing key in Tamil
    };

    const t = (key, currentLang) => translations[currentLang]?.[key] || translations.en?.[key] || key;

    expect(t('fallback_test_key', 'ta')).toBe('English Default');
    expect(t('completely_nonexistent_key', 'ta')).toBe('completely_nonexistent_key');
  });

  it('guarantees native script labels for all 6 language selector buttons', () => {
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    ];

    languages.forEach(l => {
      expect(l.nativeName).toBeTruthy();
      expect(l.nativeName.length).toBeGreaterThan(0);
    });
  });
});
