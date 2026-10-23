import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export default function EmptyState() {
  const { t } = useTranslation();
  return <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-16 text-center text-slate-500"><SearchX size={26} className="text-slate-400"/><p className="text-sm">{t('common.noResults')}</p></div>;
}
