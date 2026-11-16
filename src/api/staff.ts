import { apiBaseUrl, apiRequest } from './client';

export type StaffRole = 2 | 3 | 4; // Manager, Waiter, Cashier
export type StaffMember = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: number;
  joinedAt: string;
};
export type StaffOverview = {
  restaurantId: string;
  organizationId: string;
  usedEmployees: number;
  maxEmployees: number;
  members: StaffMember[];
};
export type StaffInvitation = {
  id: string;
  email: string;
  role: StaffRole;
  expiresAt: string;
};
export type CreatedStaffInvitation = StaffInvitation & { token: string };

async function staffRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

function base(restaurantId: string): string {
  if (!restaurantId.trim()) throw new Error('Select a restaurant first.');
  return `/api/staff/restaurants/${encodeURIComponent(restaurantId)}`;
}

export const getStaffOverview = (token: string, restaurantId: string, signal?: AbortSignal) =>
  staffRequest<StaffOverview>(token, base(restaurantId), { signal });
export const getStaffInvitations = (token: string, restaurantId: string, signal?: AbortSignal) =>
  staffRequest<StaffInvitation[]>(token, `${base(restaurantId)}/invitations`, { signal });
export const inviteStaff = (token: string, restaurantId: string, email: string, role: StaffRole) =>
  staffRequest<CreatedStaffInvitation>(token, `${base(restaurantId)}/invitations`, {
    method: 'POST', body: JSON.stringify({ email, role }),
  });
export const revokeStaffInvitation = (token: string, restaurantId: string, invitationId: string) =>
  staffRequest<void>(token, `${base(restaurantId)}/invitations/${encodeURIComponent(invitationId)}`, {
    method: 'DELETE',
  });
export const acceptStaffInvite = (token: string, inviteToken: string) =>
  apiRequest<StaffMember>('/api/staff/invitations/accept', token, {
    method: 'POST', body: JSON.stringify({ token: inviteToken }),
  });
export const changeStaffRole = (token: string, restaurantId: string, userId: string, role: StaffRole) =>
  staffRequest<StaffMember>(token, `${base(restaurantId)}/members/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH', body: JSON.stringify({ role }),
  });
export const removeStaff = (token: string, restaurantId: string, userId: string) =>
  staffRequest<void>(token, `${base(restaurantId)}/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
