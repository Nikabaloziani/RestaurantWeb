import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Table2,
  UtensilsCrossed,
  Utensils,
  X,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Page } from '../types';
import { canOpenPage, type RestaurantRole } from '../auth/restaurantAccess';

export const menu = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'orders', icon: ClipboardList },
  { id: 'tables', icon: Table2 },
  { id: 'reservations', icon: CalendarDays },
  { id: 'products', icon: UtensilsCrossed },
  { id: 'analytics', icon: BarChart3 },
  { id: 'staff', icon: UsersRound },
  { id: 'settings', icon: Settings2 },
] as const;

const staffDefaultLabels: Record<string, string> = {
  ka: 'თანამშრომლები და როლები',
  en: 'Employees & Roles',
  ru: 'Сотрудники и роли',
};

export default function Sidebar({ page, onNavigate, mobileOpen, onClose, restaurantRole }: {
  page: Page;
  restaurantRole: RestaurantRole;
  onNavigate: (next: Page) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const staffLabel = t('nav.staff', {
    defaultValue: staffDefaultLabels[lang] ?? staffDefaultLabels.en,
  });

  const itemClasses = (id: Page) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
      page === id
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/25'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          aria-label={t('header.closeMenu')}
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] shrink-0 flex-col bg-[#0f172a] px-4 pb-5 pt-6 text-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-9 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
              <Utensils size={21} strokeWidth={2.25} aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Restaurant<span className="text-blue-400">OS</span></div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Management platform</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label={t('header.closeMenu')}
          >
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 space-y-1">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-500">{t('sidebar.workspace')}</div>
          {menu.slice(0, 6).filter(item => canOpenPage(restaurantRole, item.id)).map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={page === id ? 'page' : undefined}
              onClick={() => { onNavigate(id); onClose(); }}
              className={itemClasses(id)}
            >
              <Icon size={19} strokeWidth={1.9} className={page === id ? 'text-white' : 'text-slate-400 group-hover:text-white'} aria-hidden="true" />
              <span>{t(`nav.${id}`)}</span>
            </button>
          ))}

          {(canOpenPage(restaurantRole, 'staff') || canOpenPage(restaurantRole, 'settings')) && (
            <div className="mb-2 mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-500">{t('sidebar.management')}</div>
          )}
          {canOpenPage(restaurantRole, 'staff') && <button
            type="button"
            aria-current={page === 'staff' ? 'page' : undefined}
            onClick={() => { onNavigate('staff'); onClose(); }}
            className={itemClasses('staff')}
          >
            <UsersRound size={19} aria-hidden="true" />
            <span>{staffLabel}</span>
          </button>}
          {canOpenPage(restaurantRole, 'settings') && <button
            type="button"
            aria-current={page === 'settings' ? 'page' : undefined}
            onClick={() => { onNavigate('settings'); onClose(); }}
            className={itemClasses('settings')}
          >
            <Settings2 size={19} aria-hidden="true" />
            <span>{t('nav.settings')}</span>
          </button>}
        </nav>

        <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-3.5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="text-blue-400" size={17} />RestaurantOS 2.0</div>
          <p className="text-xs leading-5 text-slate-400">{t('orders.partialLive')}</p>
        </div>
      </aside>
    </>
  );
}
