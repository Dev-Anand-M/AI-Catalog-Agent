// Central category registry — translated names + icon glyphs + color coding.
// Designed for low-literacy users: every category is identifiable by its ICON and COLOR
// even if the text cannot be read.

export const CATEGORIES = [
  {
    value: 'Clothing',
    icon: '👗',
    color: 'bg-purple-50 text-purple-800 border-purple-200',
    colorActive: 'bg-purple-600 border-purple-600',
    label: { en: 'Clothing', hi: 'कपड़े', ta: 'ஆடைகள்', te: 'బట్టలు', kn: 'ಬಟ್ಟೆ', bn: 'কাপড়' }
  },
  {
    value: 'Grocery',
    icon: '🛒',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
    colorActive: 'bg-amber-600 border-amber-600',
    label: { en: 'Grocery', hi: 'किराना', ta: 'மளிகை', te: 'కిరాణా', kn: 'ಸಾಮಗ್ರಿ', bn: 'মুদি' }
  },
  {
    value: 'Handicraft',
    icon: '🏺',
    color: 'bg-orange-50 text-orange-800 border-orange-200',
    colorActive: 'bg-orange-600 border-orange-600',
    label: { en: 'Handicraft', hi: 'हस्तशिल्प', ta: 'கைவினை', te: 'చేతిపనులు', kn: 'ಕೈಚಿತ್ರ', bn: 'হস্তশিল্প' }
  },
  {
    value: 'Jewelry',
    icon: '💍',
    color: 'bg-pink-50 text-pink-800 border-pink-200',
    colorActive: 'bg-pink-600 border-pink-600',
    label: { en: 'Jewelry', hi: 'आभूषण', ta: 'நகை', te: 'ఆభరణాలు', kn: 'ಆಭರಣ', bn: 'গহনা' }
  },
  {
    value: 'Electronics',
    icon: '📱',
    color: 'bg-blue-50 text-blue-800 border-blue-200',
    colorActive: 'bg-blue-600 border-blue-600',
    label: { en: 'Electronics', hi: 'इलेक्ट्रॉनिक्स', ta: 'மின்னணுவியல்', te: 'ఎలక్ట్రానిక్స్', kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', bn: 'ইলেকট্রনিক্স' }
  },
  {
    value: 'Footwear',
    icon: '👞',
    color: 'bg-teal-50 text-teal-800 border-teal-200',
    colorActive: 'bg-teal-600 border-teal-600',
    label: { en: 'Footwear', hi: 'जूते', ta: 'காலணி', te: 'చెప్పులు', kn: 'ಪಾದರಕ್ಷೆ', bn: 'জুতা' }
  },
  {
    value: 'Home & Kitchen',
    icon: '🍳',
    color: 'bg-lime-50 text-lime-800 border-lime-200',
    colorActive: 'bg-lime-600 border-lime-600',
    label: { en: 'Home & Kitchen', hi: 'घर और रसोई', ta: 'வீடு & சமையல்', te: 'ఇంటి & వంట', kn: 'ಮನೆ & ಅಡುಗೆ', bn: 'ঘর ও রান্না' }
  },
  {
    value: 'Other',
    icon: '📦',
    color: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    colorActive: 'bg-zinc-700 border-zinc-700',
    label: { en: 'Other', hi: 'अन्य', ta: 'மற்றவை', te: 'ఇతర', kn: 'ಇತರೆ', bn: 'অন্যান্য' }
  }
];

// Legacy aliases seen in seed data
const ALIASES = {
  'Handicrafts': 'Handicraft',
  'handicraft': 'Handicraft',
  'clothing': 'Clothing',
  'grocery': 'Grocery',
  'electronics': 'Electronics',
  'footwear': 'Footwear',
  'jewellery': 'Jewelry',
  'jewelry': 'Jewelry'
};

const findByValue = (value) => {
  const canonical = ALIASES[value] || value;
  return CATEGORIES.find(c => c.value === canonical || c.value === value);
};

/** Get translated display name for a category value */
export function getCategoryLabel(value, lang = 'en') {
  const cat = findByValue(value);
  if (!cat) return value || '';
  return cat.label[lang] || cat.label.en || value;
}

/** Get icon emoji for a category value */
export function getCategoryIcon(value) {
  const cat = findByValue(value);
  return cat?.icon || '📦';
}

/** Get tailwind color classes for a category value */
export function getCategoryColor(value) {
  const cat = findByValue(value);
  return cat?.color || 'bg-zinc-100 text-zinc-800 border-zinc-300';
}

/** Get full option list for Select dropdowns, translated */
export function getCategoryOptions(lang = 'en') {
  return CATEGORIES.map(c => ({
    value: c.value,
    label: `${c.icon}  ${c.label[lang] || c.label.en}`
  }));
}

export default CATEGORIES;
