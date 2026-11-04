export type Page =
  | 'dashboard'
  | 'orders'
  | 'tables'
  | 'reservations'
  | 'products'
  | 'analytics'
  | 'staff'
  | 'settings';

export type Lang = 'ka' | 'en' | 'ru';
export type OrderStatus = 'completed' | 'preparing' | 'pending';
export type TableStatus = 'available' | 'occupied' | 'reserved';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';
