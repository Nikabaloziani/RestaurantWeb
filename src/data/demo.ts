import type { OrderStatus, ReservationStatus, TableStatus } from '../types';

// Fictional data only. Do not describe these as live restaurant results.
export const weeklyRevenue = [
  { day: 'mon', revenue: 540, orders: 17 },
  { day: 'tue', revenue: 690, orders: 21 },
  { day: 'wed', revenue: 510, orders: 15 },
  { day: 'thu', revenue: 860, orders: 24 },
  { day: 'fri', revenue: 740, orders: 19 },
  { day: 'sat', revenue: 1010, orders: 28 },
  { day: 'sun', revenue: 470, orders: 14 },
];

export type DemoOrder = { id: string; table: number; amount: number; status: OrderStatus; time: string; items: number };
export const orders: DemoOrder[] = [
  { id: '#1042', table: 12, amount: 96, status: 'completed', time: '14:25', items: 4 },
  { id: '#1041', table: 3, amount: 54, status: 'preparing', time: '14:18', items: 2 },
  { id: '#1040', table: 7, amount: 132, status: 'pending', time: '14:11', items: 5 },
  { id: '#1039', table: 1, amount: 68, status: 'completed', time: '13:52', items: 3 },
  { id: '#1038', table: 9, amount: 44, status: 'completed', time: '13:36', items: 2 },
  { id: '#1037', table: 5, amount: 78, status: 'preparing', time: '13:23', items: 3 },
  { id: '#1036', table: 4, amount: 110, status: 'completed', time: '12:58', items: 4 },
];

export type DemoTable = { id: number; seats: number; status: TableStatus; zone: string };
export const tables: DemoTable[] = [
  { id: 1, seats: 2, status: 'occupied', zone: 'inside' },
  { id: 2, seats: 4, status: 'available', zone: 'inside' },
  { id: 3, seats: 4, status: 'occupied', zone: 'inside' },
  { id: 4, seats: 6, status: 'reserved', zone: 'inside' },
  { id: 5, seats: 2, status: 'available', zone: 'terrace' },
  { id: 6, seats: 4, status: 'occupied', zone: 'terrace' },
  { id: 7, seats: 4, status: 'reserved', zone: 'terrace' },
  { id: 8, seats: 6, status: 'available', zone: 'terrace' },
  { id: 9, seats: 2, status: 'available', zone: 'inside' },
  { id: 10, seats: 4, status: 'occupied', zone: 'inside' },
  { id: 11, seats: 2, status: 'reserved', zone: 'inside' },
  { id: 12, seats: 4, status: 'available', zone: 'terrace' },
];

export type DemoReservation = { id: string; customer: string; time: string; guests: number; table: number; status: ReservationStatus };
export const reservations: DemoReservation[] = [
  { id: 'R-102', customer: 'Nino Beridze', time: '18:00', guests: 4, table: 4, status: 'confirmed' },
  { id: 'R-103', customer: 'Giorgi K.', time: '18:30', guests: 2, table: 11, status: 'pending' },
  { id: 'R-104', customer: 'Anna Petrova', time: '19:00', guests: 4, table: 7, status: 'confirmed' },
  { id: 'R-105', customer: 'David Smith', time: '20:00', guests: 6, table: 8, status: 'cancelled' },
  { id: 'R-106', customer: 'Mariam L.', time: '20:30', guests: 2, table: 5, status: 'confirmed' },
];

export type DemoProduct = { id: number; ka: string; en: string; ru: string; category: 'mains' | 'starters' | 'drinks' | 'desserts'; price: number; available: boolean; emoji: string; ordered: number };
export const products: DemoProduct[] = [
  { id: 1, ka: 'ხაჭაპური', en: 'Khachapuri', ru: 'Хачапури', category: 'mains', price: 24, available: true, emoji: '🧀', ordered: 46 },
  { id: 2, ka: 'ხინკალი', en: 'Khinkali', ru: 'Хинкали', category: 'mains', price: 18, available: true, emoji: '🥟', ordered: 38 },
  { id: 3, ka: 'მწვადი', en: 'Mtsvadi', ru: 'Шашлык', category: 'mains', price: 32, available: true, emoji: '🍢', ordered: 29 },
  { id: 4, ka: 'ქართული სალათი', en: 'Georgian salad', ru: 'Грузинский салат', category: 'starters', price: 16, available: true, emoji: '🥗', ordered: 23 },
  { id: 5, ka: 'ლიმონათი', en: 'Lemonade', ru: 'Лимонад', category: 'drinks', price: 8, available: true, emoji: '🍋', ordered: 21 },
  { id: 6, ka: 'შოკოლადის ნამცხვარი', en: 'Chocolate cake', ru: 'Шоколадный торт', category: 'desserts', price: 14, available: false, emoji: '🍰', ordered: 12 },
];
