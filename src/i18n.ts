import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ka from './locales/ka.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

const stored = typeof window !== 'undefined' ? window.localStorage.getItem('restaurantos.language') : null;
const guessed = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2).toLowerCase() : 'ka';
const initialLanguage = ['ka', 'en', 'ru'].includes(stored ?? '')
  ? stored!
  : ['ka', 'en', 'ru'].includes(guessed) ? guessed : 'ka';

void i18n.use(initReactI18next).init({
  resources: {
    ka: { translation: ka },
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: ['ka', 'en', 'ru'],
  interpolation: { escapeValue: false },
});

export default i18n;
