import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { aiApi, productsApi } from '../api/client';

// Command patterns - includes pure languages + mixed (Hinglish, Tanglish, etc.)
const commands = {
  dashboard: [
    // English
    'dashboard', 'catalog', 'products', 'my products', 'show products', 'show my items',
    // Hindi + Hinglish
    'डैशबोर्ड', 'सूची', 'मेरे उत्पाद', 'mera dashboard', 'products dikhao', 'meri list', 'suchi dikhao',
    // Tamil + Tanglish
    'டாஷ்போர்டு', 'பட்டியல்', 'dashboard kaatu', 'en products', 'enna products', 'list kaatu',
    // Telugu + Tenglish
    'డాష్‌బోర్డ్', 'జాబితా', 'naa products', 'dashboard chupinchu', 'list chupinchu',
    // Kannada + Kanglish
    'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'ಪಟ್ಟಿ', 'nanna products', 'dashboard togo', 'list togo',
    // Bengali + Benglish
    'ড্যাশবোর্ড', 'তালিকা', 'amar products', 'dashboard dekhao', 'list dekhao'
  ],
  addProduct: [
    // English
    'add', 'new', 'create', 'add product', 'new product', 'add item', 'create listing',
    // Hindi + Hinglish
    'जोड़ो', 'नया', 'उत्पाद जोड़ो', 'naya product', 'product add karo', 'naya item', 'add karo',
    // Tamil + Tanglish
    'சேர்', 'புதிய', 'pudhu product', 'product seru', 'add pannu', 'new item seru',
    // Telugu + Tenglish
    'జోడించు', 'కొత్త', 'kotha product', 'product add cheyyi', 'new item pettandi',
    // Kannada + Kanglish
    'ಸೇರಿಸು', 'ಹೊಸ', 'hosa product', 'product add maadu', 'new item haaku',
    // Bengali + Benglish
    'যোগ করো', 'নতুন', 'notun product', 'product add koro', 'new item dao'
  ],
  export: [
    // English
    'export', 'publish', 'share', 'upload', 'seller', 'amazon', 'flipkart',
    // Hindi + Hinglish
    'निर्यात', 'एक्सपोर्ट', 'export karo', 'publish karo', 'amazon pe daalo', 'flipkart upload',
    // Tamil + Tanglish
    'ஏற்றுமதி', 'export pannu', 'publish pannu', 'amazon la podu', 'share pannu',
    // Telugu + Tenglish
    'ఎగుమతి', 'export cheyyi', 'publish cheyyi', 'amazon lo pettandi', 'share cheyyi',
    // Kannada + Kanglish
    'ರಫ್ತು', 'export maadu', 'publish maadu', 'amazon ge haaku', 'share maadu',
    // Bengali + Benglish
    'রপ্তানি', 'export koro', 'publish koro', 'amazon e deo', 'share koro'
  ],
  payment: [
    // English
    'payment', 'bank', 'upi', 'money', 'account', 'gpay', 'phonepe', 'paytm',
    // Hindi + Hinglish
    'भुगतान', 'पेमेंट', 'बैंक', 'payment settings', 'bank details', 'upi id', 'paisa',
    // Tamil + Tanglish
    'கட்டணம்', 'payment settings', 'bank details podu', 'upi set pannu', 'panam',
    // Telugu + Tenglish
    'చెల్లింపు', 'payment settings', 'bank details ivvu', 'upi pettandi', 'dabbu',
    // Kannada + Kanglish
    'ಪಾವತಿ', 'payment settings', 'bank details kodu', 'upi haaku', 'duddu',
    // Bengali + Benglish
    'পেমেন্ট', 'payment settings', 'bank details dao', 'upi set koro', 'taka'
  ],
  home: [
    'home', 'main', 'start', 'beginning',
    'होम', 'home jao', 'ghar',
    'முகப்பு', 'home po', 'home ku po',
    'హోమ్', 'home ki vellu', 'intiki',
    'ಹೋಮ್', 'home ge hogu', 'mane',
    'হোম', 'home jao', 'bari'
  ],
  login: [
    'login', 'sign in', 'signin',
    'लॉगिन', 'login karo', 'sign in karo',
    'உள்நுழை', 'login pannu',
    'లాగిన్', 'login cheyyi',
    'ಲಾಗಿನ್', 'login maadu',
    'লগইন', 'login koro'
  ],
  logout: [
    'logout', 'log out', 'sign out', 'signout', 'exit',
    'लॉगआउट', 'logout karo', 'bahar jao',
    'வெளியேறு', 'logout pannu', 'veliya po',
    'లాగౌట్', 'logout cheyyi', 'bayataki',
    'ಲಾಗೌಟ್', 'logout maadu', 'horage hogu',
    'লগআউট', 'logout koro', 'baire jao'
  ],
  demo: [
    'demo', 'example', 'sample', 'try', 'test',
    'डेमो', 'demo dikhao', 'example dikhao',
    'டெமோ', 'demo kaatu', 'example kaatu',
    'డెమో', 'demo chupinchu',
    'ಡೆಮೊ', 'demo togo',
    'ডেমো', 'demo dekhao'
  ],
  help: [
    'help', 'commands', 'what can i say', 'options',
    'मदद', 'help karo', 'kya bol sakta', 'madad',
    'உதவி', 'help pannu', 'enna solrathu',
    'సహాయం', 'help cheyyi', 'emi cheppali',
    'ಸಹಾಯ', 'help maadu', 'enu helali',
    'সাহায্য', 'help koro', 'ki bolbo'
  ],
  readPage: [
    'read', 'read page', 'what is this', 'describe', 'tell me', 'explain this',
    'पढ़ो', 'page padho', 'ye kya hai', 'batao', 'samjhao',
    'படி', 'page padi', 'idhu enna', 'sollu', 'explain pannu',
    'చదవండి', 'page chaduvandi', 'idi emiti', 'cheppandi',
    'ಓದಿ', 'page odi', 'idu enu', 'helu',
    'পড়ো', 'page poro', 'eta ki', 'bolo'
  ],
};

// Patterns for "open product" command
const openProductPatterns = [
  'open', 'edit', 'show', 'view', 'go to',
  'खोलो', 'kholo', 'dikhao', 'edit karo',
  'திற', 'thira', 'kaatu', 'edit pannu',
  'తెరవండి', 'teravandi', 'chupinchu', 'edit cheyyi',
  'ತೆರೆ', 'tere', 'togo', 'edit maadu',
  'খোলো', 'kholo', 'dekhao', 'edit koro'
];

// Question patterns - includes mixed language
const questionPatterns = [
  // English
  'explain', 'what', 'how', 'why', 'tell', 'describe', 'meaning',
  // Hinglish
  'समझाओ', 'क्या', 'कैसे', 'बताओ', 'kya hai', 'kaise', 'kyun', 'batao', 'samjhao',
  // Tanglish
  'விளக்கு', 'என்ன', 'எப்படி', 'enna', 'eppadi', 'yenna', 'sollu',
  // Tenglish
  'వివరించు', 'ఏమిటి', 'ఎలా', 'emiti', 'ela', 'cheppandi',
  // Kanglish
  'ವಿವರಿಸಿ', 'ಏನು', 'ಹೇಗೆ', 'enu', 'hege', 'helu',
  // Benglish
  'ব্যাখ্যা', 'কি', 'কিভাবে', 'ki', 'kivabe', 'bolo'
];

const speechLangCodes = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN',
  te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN'
};


const responses = {
  en: {
    dashboard: 'Opening dashboard', addProduct: 'Opening add product',
    export: 'Opening export', payment: 'Opening payment',
    home: 'Going home', login: 'Opening login', logout: 'Logging out',
    demo: 'Opening demo', help: 'Say: dashboard, add, export, payment, read',
    readPage: 'Reading...', thinking: 'Thinking...',
    notRecognized: 'Did not understand', listening: 'Listening...',
  },
  hi: {
    dashboard: 'डैशबोर्ड खोल रहे हैं', addProduct: 'उत्पाद जोड़ रहे हैं',
    export: 'निर्यात खोल रहे हैं', payment: 'भुगतान खोल रहे हैं',
    home: 'होम जा रहे हैं', login: 'लॉगिन खोल रहे हैं', logout: 'लॉगआउट',
    demo: 'डेमो खोल रहे हैं', help: 'बोलें: डैशबोर्ड, जोड़ो, निर्यात, भुगतान',
    readPage: 'पढ़ रहे हैं...', thinking: 'सोच रहे हैं...',
    notRecognized: 'समझ नहीं आया', listening: 'सुन रहे हैं...',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு திறக்கிறது', addProduct: 'பொருள் சேர்க்கிறது',
    export: 'ஏற்றுமதி திறக்கிறது', payment: 'கட்டணம் திறக்கிறது',
    home: 'முகப்பு செல்கிறது', login: 'உள்நுழைவு', logout: 'வெளியேறுகிறது',
    demo: 'டெமோ திறக்கிறது', help: 'சொல்லுங்கள்: டாஷ்போர்டு, சேர், ஏற்றுமதி',
    readPage: 'படிக்கிறது...', thinking: 'யோசிக்கிறது...',
    notRecognized: 'புரியவில்லை', listening: 'கேட்கிறது...',
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్ తెరుస్తోంది', addProduct: 'ఉత్పత్తి జోడిస్తోంది',
    export: 'ఎగుమతి తెరుస్తోంది', payment: 'చెల్లింపు తెరుస్తోంది',
    home: 'హోమ్ వెళ్తోంది', login: 'లాగిన్', logout: 'లాగౌట్',
    demo: 'డెమో తెరుస్తోంది', help: 'చెప్పండి: డాష్‌బోర్డ్, జోడించు, ఎగుమతి',
    readPage: 'చదువుతోంది...', thinking: 'ఆలోచిస్తోంది...',
    notRecognized: 'అర్థం కాలేదు', listening: 'వింటోంది...',
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯುತ್ತಿದೆ', addProduct: 'ಉತ್ಪನ್ನ ಸೇರಿಸುತ್ತಿದೆ',
    export: 'ರಫ್ತು ತೆರೆಯುತ್ತಿದೆ', payment: 'ಪಾವತಿ ತೆರೆಯುತ್ತಿದೆ',
    home: 'ಮುಖಪುಟಕ್ಕೆ', login: 'ಲಾಗಿನ್', logout: 'ಲಾಗೌಟ್',
    demo: 'ಡೆಮೊ ತೆರೆಯುತ್ತಿದೆ', help: 'ಹೇಳಿ: ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಸೇರಿಸು, ರಫ್ತು',
    readPage: 'ಓದುತ್ತಿದೆ...', thinking: 'ಯೋಚಿಸುತ್ತಿದೆ...',
    notRecognized: 'ಅರ್ಥವಾಗಲಿಲ್ಲ', listening: 'ಕೇಳುತ್ತಿದೆ...',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড খুলছে', addProduct: 'পণ্য যোগ করছে',
    export: 'রপ্তানি খুলছে', payment: 'পেমেন্ট খুলছে',
    home: 'হোম যাচ্ছে', login: 'লগইন', logout: 'লগআউট',
    demo: 'ডেমো খুলছে', help: 'বলুন: ড্যাশবোর্ড, যোগ করো, রপ্তানি',
    readPage: 'পড়ছে...', thinking: 'ভাবছে...',
    notRecognized: 'বুঝতে পারিনি', listening: 'শুনছে...',
  },
};

export function useVoiceCommands() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout: authLogout } = useAuth();
  const { language } = useLanguage();
  
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [feedback, setFeedback] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    
    // Strip markdown formatting before speaking
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')       // *italic* -> italic
      .replace(/__([^_]+)__/g, '$1')       // __bold__ -> bold
      .replace(/_([^_]+)_/g, '$1')         // _italic_ -> italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) -> text
      .replace(/#{1,6}\s*/g, '')           // # headers
      .replace(/`([^`]+)`/g, '$1')         // `code` -> code
      .replace(/- /g, ', ');               // - list items -> comma separated
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const langCode = speechLangCodes[language] || 'en-IN';
    utterance.lang = langCode;
    utterance.rate = 0.9;
    
    // Try to find a voice for the selected language
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = langCode.split('-')[0]; // 'hi' from 'hi-IN'
    
    // Find best matching voice
    let voice = voices.find(v => v.lang === langCode) || // Exact match
                voices.find(v => v.lang.startsWith(langPrefix)) || // Language match
                voices.find(v => v.lang.includes('IN')) || // Any Indian voice
                voices[0]; // Fallback
    
    if (voice) {
      utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const isQuestion = useCallback((t) => {
    const text = t.toLowerCase();
    return questionPatterns.some(p => text.includes(p.toLowerCase())) || text.endsWith('?');
  }, []);

  const matchCommand = useCallback((t) => {
    const text = t.toLowerCase().trim();
    for (const [action, patterns] of Object.entries(commands)) {
      for (const p of patterns) {
        if (text.includes(p.toLowerCase())) return action;
      }
    }
    return null;
  }, []);

  // Check if user wants to open a specific product
  const checkOpenProduct = useCallback((text) => {
    const lowerText = text.toLowerCase();
    for (const pattern of openProductPatterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        // Extract product name after the pattern
        const idx = lowerText.indexOf(pattern.toLowerCase());
        const afterPattern = text.substring(idx + pattern.length).trim();
        if (afterPattern.length > 2) {
          return afterPattern;
        }
      }
    }
    return null;
  }, []);

  // Find product by name (fuzzy match)
  const findProductByName = useCallback(async (searchName) => {
    try {
      const response = await productsApi.list();
      const products = response.data;
      const searchLower = searchName.toLowerCase();
      
      // Try exact match first
      let match = products.find(p => p.name.toLowerCase() === searchLower);
      
      // Try partial match
      if (!match) {
        match = products.find(p => p.name.toLowerCase().includes(searchLower));
      }
      
      // Try if search term is in product name
      if (!match) {
        match = products.find(p => searchLower.includes(p.name.toLowerCase()));
      }
      
      // Try word-by-word match
      if (!match) {
        const searchWords = searchLower.split(/\s+/);
        match = products.find(p => {
          const nameWords = p.name.toLowerCase().split(/\s+/);
          return searchWords.some(sw => nameWords.some(nw => nw.includes(sw) || sw.includes(nw)));
        });
      }
      
      return match;
    } catch (e) {
      console.error('Error finding product:', e);
      return null;
    }
  }, []);

  const askAI = useCallback(async (question) => {
    const msgs = responses[language] || responses.en;
    setFeedback(msgs.thinking);
    try {
      const pageName = location.pathname.split('/').pop() || 'home';
      // Get page content for context
      const pageContent = document.body.innerText.substring(0, 1500);
      const res = await aiApi.chat({ 
        message: question, 
        context: pageName, 
        pageContent: pageContent,
        language 
      });
      speak(res.data.response);
      setFeedback(res.data.response);
    } catch (e) {
      speak(msgs.notRecognized);
      setFeedback(msgs.notRecognized);
    }
  }, [location.pathname, language, speak]);

  const executeCommand = useCallback(async (action) => {
    const msgs = responses[language] || responses.en;
    const nav = (path) => setTimeout(() => navigate(path), 300);
    
    speak(msgs[action] || msgs.notRecognized);
    setFeedback(msgs[action] || msgs.notRecognized);
    
    switch (action) {
      case 'dashboard': user ? nav('/dashboard') : navigate('/login'); break;
      case 'addProduct': user ? nav('/products/new') : navigate('/login'); break;
      case 'export': user ? nav('/export') : navigate('/login'); break;
      case 'payment': user ? nav('/payment') : navigate('/login'); break;
      case 'home': nav('/'); break;
      case 'login': nav('/login'); break;
      case 'logout': if (user) { authLogout(); nav('/'); } break;
      case 'demo': nav('/demo'); break;
      case 'help': break;
      case 'readPage':
        try {
          const content = document.body.innerText.substring(0, 2000);
          const page = location.pathname.split('/').pop() || 'home';
          const res = await aiApi.readPage({ pageContent: content, pageName: page, language });
          speak(res.data.summary);
          setFeedback(res.data.summary);
        } catch (e) { speak(msgs.notRecognized); }
        break;
    }
  }, [language, user, authLogout, navigate, speak, location.pathname]);

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = speechLangCodes[language] || 'en-IN';
    r.continuous = false;
    r.interimResults = false;
    
    const msgs = responses[language] || responses.en;
    r.onstart = () => { setIsListening(true); setFeedback(msgs.listening); };
    r.onresult = async (e) => {
      const t = e.results[0][0].transcript;
      setLastCommand(t);
      
      // Check if user wants to open a specific product
      const productName = checkOpenProduct(t);
      if (productName && user) {
        setFeedback(`🔍 Searching for "${productName}"...`);
        const product = await findProductByName(productName);
        if (product) {
          speak(`Opening ${product.name}`);
          setFeedback(`✅ Opening ${product.name}`);
          setTimeout(() => navigate(`/products/${product.id}/edit`), 300);
          return;
        } else {
          speak(`Could not find product ${productName}`);
          setFeedback(`❌ Product "${productName}" not found`);
          return;
        }
      }
      
      if (isQuestion(t)) { await askAI(t); return; }
      let action = matchCommand(t);
      if (!action) {
        try {
          const ai = await aiApi.interpretCommand({ transcript: t, language });
          if (ai.data.action !== 'unknown' && ai.data.confidence > 0.5) action = ai.data.action;
        } catch (e) {}
      }
      action ? executeCommand(action) : await askAI(t);
    };
    r.onerror = () => { setIsListening(false); setFeedback(msgs.notRecognized); };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r;
    try { r.start(); } catch (e) { setFeedback(msgs.notRecognized); }
  }, [isSupported, isListening, language, matchCommand, executeCommand, isQuestion, askAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  return {
    isListening, lastCommand, feedback, startListening, stopListening,
    executeCommand, speak, isSupported,
    isEnabled: true, isAwake: isListening, isWakeWordListening: false,
    toggleVoiceCommands: startListening,
  };
}
