// Internationalization (i18n) Module for Landing Bomb
// Supports English and Chinese

const STORAGE_KEY = 'landing_bomb_language';

// Supported languages
const SUPPORTED_LANGUAGES = ['zh', 'en'];
const DEFAULT_LANGUAGE = 'zh';

// Current language
let currentLanguage = DEFAULT_LANGUAGE;

// Translations data
const translations = {
  zh: {},
  en: {}
};

// Load translations from files
function loadTranslations() {
  try {
    const zhModule = require('./locales/zh.js');
    const enModule = require('./locales/en.js');
    
    translations.zh = zhModule.zh || {};
    translations.en = enModule.en || {};
    
    console.log('i18n: Translations loaded successfully');
  } catch (e) {
    console.error('i18n: Failed to load translations:', e);
  }
}

// Get stored language preference
function getStoredLanguage() {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
  } catch {
    console.log('i18n: No stored language preference');
  }
  
  // Try to detect from system
  try {
    const systemInfo = wx.getSystemInfoSync();
    const lang = systemInfo.language;
    if (lang && lang.startsWith('en')) {
      return 'en';
    }
  } catch {
    // Use default
  }
  
  return DEFAULT_LANGUAGE;
}

// Save language preference
function saveLanguagePreference(lang) {
  try {
    wx.setStorageSync(STORAGE_KEY, lang);
  } catch (e) {
    console.error('i18n: Failed to save language preference:', e);
  }
}

// Initialize i18n module
function init() {
  currentLanguage = getStoredLanguage();
  loadTranslations();
  console.log(`i18n: Initialized with language "${currentLanguage}"`);
}

// Set current language
function setLanguage(lang) {
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    currentLanguage = lang;
    saveLanguagePreference(lang);
    console.log(`i18n: Language changed to "${lang}"`);
    return true;
  }
  return false;
}

// Get current language
function getLanguage() {
  return currentLanguage;
}

// Get all supported languages
function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

// Translate a key
// Supports interpolation: t('hello', { name: 'World' })
function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to default language
      value = translations[DEFAULT_LANGUAGE];
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          return key; // Return key as fallback
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Replace placeholders
  return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
    return params[paramKey] !== undefined ? params[paramKey] : match;
  });
}

// Translate with pluralization support
// tPlural('items', count, { count: 5 })
function tPlural(key, count, params = {}) {
  const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
  return t(pluralKey, { ...params, count });
}

// Format number with locale
function formatNumber(num, options = {}) {
  return num.toLocaleString(currentLanguage === 'zh' ? 'zh-CN' : 'en-US', options);
}

// Initialize on module load
init();

module.exports = {
  t,
  tPlural,
  setLanguage,
  getLanguage,
  getSupportedLanguages,
  formatNumber
};
