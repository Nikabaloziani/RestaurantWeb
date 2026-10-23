import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Lang } from '../types';

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { i18n, t } = useTranslation();
  return (
    <label className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${dark ? 'border-white/15 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-700 shadow-sm'}`}>
      <Globe2 size={16} aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className="min-w-0 cursor-pointer bg-transparent outline-none"
        value={i18n.resolvedLanguage?.slice(0, 2) ?? 'ka'}
        onChange={(event) => {
          const language = event.target.value as Lang;
          window.localStorage.setItem('restaurantos.language', language);
          void i18n.changeLanguage(language);
          document.documentElement.lang = language;
        }}
      >
        <option value="ka" className="text-slate-900">🇬🇪 KA</option>
        <option value="en" className="text-slate-900">🇬🇧 EN</option>
        <option value="ru" className="text-slate-900">🇷🇺 RU</option>
      </select>
    </label>
  );
}
