import type { Page } from '../types';

/** RestaurantUser.Role, not the global ASP.NET Identity role. */
export type RestaurantRole = 'owner' | 'manager' | 'waiter' | 'cashier' | 'unknown';

export function restaurantRoleOf(value: unknown): RestaurantRole {
  if (value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'owner')) return 'owner';
  if (value === 2 || value === '2' || (typeof value === 'string' && value.toLowerCase() === 'manager')) return 'manager';
  if (value === 3 || value === '3' || (typeof value === 'string' && value.toLowerCase() === 'waiter')) return 'waiter';
  if (value === 4 || value === '4' || (typeof value === 'string' && value.toLowerCase() === 'cashier')) return 'cashier';
  return 'unknown'; // Never default to admin privileges.
}

const permittedPages: Record<RestaurantRole, readonly Page[]> = {
  owner: ['dashboard', 'orders', 'tables', 'reservations', 'products', 'analytics', 'staff', 'settings'],
  manager: ['dashboard', 'orders', 'tables', 'reservations', 'products', 'analytics', 'settings'],
  waiter: ['dashboard', 'orders', 'tables', 'reservations', 'settings'],
  cashier: ['dashboard', 'orders', 'tables', 'settings'],
  unknown: ['dashboard'],
};

export function canOpenPage(role: RestaurantRole, page: Page): boolean {
  return permittedPages[role].includes(page);
}

export function localizedRestaurantRole(role: RestaurantRole, language: string): string {
  const locale = language.split('-')[0];
  const translations: Record<string, Record<RestaurantRole, string>> = {
    ka: { owner: 'მფლობელი', manager: 'მენეჯერი', waiter: 'მიმტანი', cashier: 'მოლარე', unknown: 'უცნობი როლი' },
    en: { owner: 'Owner', manager: 'Manager', waiter: 'Waiter', cashier: 'Cashier', unknown: 'Unknown role' },
    ru: { owner: 'Владелец', manager: 'Менеджер', waiter: 'Официант', cashier: 'Кассир', unknown: 'Неизвестная роль' },
  };
  return (translations[locale] ?? translations.en)[role];
}
