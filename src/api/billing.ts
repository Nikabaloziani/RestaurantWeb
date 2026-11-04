import { apiGet, apiRequest } from './client';

/** Matches RestaurantSERVICE.DTO.Billing.PlanDTO */
export type BillingPlan = {
  code: string;
  name: string;
  monthlyPriceUsd: number;
  maxLocations: number;
  maxEmployees: number;
  reservationsEnabled: boolean;
  basicAnalyticsEnabled: boolean;
  advancedAnalyticsEnabled: boolean;
  qrMenuEnabled: boolean;
  kitchenDisplayEnabled: boolean;
  inventoryEnabled: boolean;
  multiBranchAnalyticsEnabled: boolean;
};

/** Matches RestaurantSERVICE.DTO.Billing.OrganizationDTO */
export type BillingOrganization = {
  id: string;
  name: string;
  locationCount: number;
};

/** Numeric values are defined by RestaurantDATA.Enum.SubscriptionStatus */
export type SubscriptionStatus = 1 | 2 | 3 | 4 | 5;

/** Matches RestaurantSERVICE.DTO.Billing.SubscriptionDTO */
export type BillingSubscription = {
  organizationId: string;
  planCode: string;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  maxLocations: number;
  usedLocations: number;
  maxEmployees: number;
  usedEmployees: number;
  isCurrentlyEntitled: boolean;
};

export function fetchBillingPlans(signal?: AbortSignal) {
  return apiGet<BillingPlan[]>('/api/billing/plans', undefined, signal);
}

export function fetchMyOrganizations(token: string, signal?: AbortSignal) {
  return apiGet<BillingOrganization[]>('/api/billing/organizations/mine', token, signal);
}

export function fetchOrganizationSubscription(
  token: string,
  organizationId: string,
  signal?: AbortSignal,
) {
  return apiGet<BillingSubscription>(
    `/api/billing/organizations/${encodeURIComponent(organizationId)}/subscription`,
    token,
    signal,
  );
}

export function createBillingOrganization(token: string, name: string) {
  return apiRequest<BillingOrganization>('/api/billing/organizations', token, {
    method: 'POST',
    body: JSON.stringify({ name: name.trim() }),
  });
}
