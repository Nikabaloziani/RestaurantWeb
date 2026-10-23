import { Cloud, Globe2, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { apiBaseUrl } from '../api/client';

export default function Settings() {
  const { t } = useTranslation();
  return <div><PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')}/>
    <div className="grid max-w-4xl gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Globe2 size={20}/></div><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{t('settings.languageTitle')}</h2><p className="mt-1 mb-4 text-sm text-slate-500">{t('settings.languageDesc')}</p><LanguageSwitcher/></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-3 text-violet-600"><Cloud size={20}/></div><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{t('settings.platformTitle')}</h2><p className="mt-1 text-sm text-slate-500">{t(apiBaseUrl?'settings.apiConfigured':'settings.apiNotConnected')}</p>{apiBaseUrl&&<div className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><span className="mr-2 font-semibold">{t('settings.apiBase')}:</span>{apiBaseUrl}</div>}</div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-600"><LockKeyhole size={20}/></div><div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">{t('settings.nextStep')}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{t('settings.nextStepDesc')}</p><p className="mt-3 text-xs text-slate-500">{t('settings.ownerHint')}</p></div></div></section>
    </div>
  </div>;
}
