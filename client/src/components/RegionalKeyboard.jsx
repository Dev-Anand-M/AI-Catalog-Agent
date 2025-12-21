import { useState } from 'react';
import { X, Keyboard } from 'lucide-react';

// Character maps for Indian languages
const KEYBOARD_LAYOUTS = {
  Tamil: {
    vowels: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
    consonants: ['க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன'],
    modifiers: ['ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'],
    numbers: ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯'],
    common: ['ஸ', 'ஷ', 'ஜ', 'ஹ', 'க்ஷ', 'ஸ்ரீ']
  },
  Hindi: {
    vowels: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'],
    consonants: ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ', 'ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श', 'ष', 'स', 'ह'],
    modifiers: ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', '्', 'ं', 'ः'],
    numbers: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
    common: ['क्ष', 'त्र', 'ज्ञ', 'श्र', 'ॐ', '₹']
  },
  Telugu: {
    vowels: ['అ', 'ఆ', 'ఇ', 'ఈ', 'ఉ', 'ఊ', 'ఋ', 'ఎ', 'ఏ', 'ఐ', 'ఒ', 'ఓ', 'ఔ'],
    consonants: ['క', 'ఖ', 'గ', 'ఘ', 'ఙ', 'చ', 'ఛ', 'జ', 'ఝ', 'ఞ', 'ట', 'ఠ', 'డ', 'ఢ', 'ణ', 'త', 'థ', 'ద', 'ధ', 'న', 'ప', 'ఫ', 'బ', 'భ', 'మ', 'య', 'ర', 'ల', 'వ', 'శ', 'ష', 'స', 'హ', 'ళ', 'క్ష', 'ఱ'],
    modifiers: ['ా', 'ి', 'ీ', 'ు', 'ూ', 'ృ', 'ె', 'ే', 'ై', 'ొ', 'ో', 'ౌ', '్', 'ం', 'ః'],
    numbers: ['౦', '౧', '౨', '౩', '౪', '౫', '౬', '౭', '౮', '౯'],
    common: ['క్ష', 'జ్ఞ', '₹']
  },
  Kannada: {
    vowels: ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಋ', 'ಎ', 'ಏ', 'ಐ', 'ಒ', 'ಓ', 'ಔ'],
    consonants: ['ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ', 'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ', 'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ', 'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ', 'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ', 'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ', 'ಳ'],
    modifiers: ['ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', '್', 'ಂ', 'ಃ'],
    numbers: ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'],
    common: ['ಕ್ಷ', 'ಜ್ಞ', '₹']
  },
  Bengali: {
    vowels: ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'],
    consonants: ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ', 'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ', 'স', 'হ', 'ড়', 'ঢ়', 'য়'],
    modifiers: ['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ', '্', 'ং', 'ঃ', 'ঁ'],
    numbers: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
    common: ['ক্ষ', 'জ্ঞ', '৳', '₹']
  }
};

const CATEGORY_LABELS = {
  en: { vowels: 'Vowels', consonants: 'Consonants', modifiers: 'Modifiers', numbers: 'Numbers', common: 'Common' },
  ta: { vowels: 'உயிர்', consonants: 'மெய்', modifiers: 'உயிர்மெய்', numbers: 'எண்கள்', common: 'பொதுவான' },
  hi: { vowels: 'स्वर', consonants: 'व्यंजन', modifiers: 'मात्राएं', numbers: 'अंक', common: 'सामान्य' },
  te: { vowels: 'అచ్చులు', consonants: 'హల్లులు', modifiers: 'గుణింతాలు', numbers: 'సంఖ్యలు', common: 'సాధారణ' },
  kn: { vowels: 'ಸ್ವರಗಳು', consonants: 'ವ್ಯಂಜನಗಳು', modifiers: 'ಒತ್ತಕ್ಷರಗಳು', numbers: 'ಸಂಖ್ಯೆಗಳು', common: 'ಸಾಮಾನ್ಯ' },
  bn: { vowels: 'স্বরবর্ণ', consonants: 'ব্যঞ্জনবর্ণ', modifiers: 'কার', numbers: 'সংখ্যা', common: 'সাধারণ' }
};

export function RegionalKeyboard({ language, onCharacter, onClose }) {
  const [activeCategory, setActiveCategory] = useState('consonants');
  
  // Map language names to codes
  const langCodeMap = {
    'Tamil': 'ta', 'Hindi': 'hi', 'Telugu': 'te', 'Kannada': 'kn', 'Bengali': 'bn'
  };
  
  const langCode = langCodeMap[language] || 'en';
  const layout = KEYBOARD_LAYOUTS[language];
  const labels = CATEGORY_LABELS[langCode] || CATEGORY_LABELS.en;
  
  if (!layout) {
    return null; // No keyboard for English
  }

  const categories = [
    { id: 'vowels', label: labels.vowels },
    { id: 'consonants', label: labels.consonants },
    { id: 'modifiers', label: labels.modifiers },
    { id: 'numbers', label: labels.numbers },
    { id: 'common', label: labels.common }
  ];

  const handleKeyPress = (char) => {
    onCharacter(char);
  };

  return (
    <div className="bg-white border-2 border-primary-200 rounded-xl shadow-lg p-3 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary-500" />
          <span className="font-medium text-gray-700">{language} Keyboard</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
        {layout[activeCategory]?.map((char, idx) => (
          <button
            key={idx}
            onClick={() => handleKeyPress(char)}
            className="w-10 h-10 flex items-center justify-center text-lg font-medium bg-gray-50 hover:bg-primary-100 hover:text-primary-700 rounded-lg border border-gray-200 transition-all active:scale-95"
          >
            {char}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 mt-3 pt-2 border-t">
        <button
          onClick={() => handleKeyPress(' ')}
          className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-600 transition-colors"
        >
          Space
        </button>
        <button
          onClick={() => onCharacter('BACKSPACE')}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium text-red-600 transition-colors"
        >
          ⌫ Delete
        </button>
      </div>
    </div>
  );
}
