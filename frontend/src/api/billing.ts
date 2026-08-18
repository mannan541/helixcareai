import { api } from './client';

export type TherapyPackage = {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  intervalMonths: number;
  priceCents: number;
  sessionsIncluded: number | null;
  currency: string;
  isActive: boolean;
};

export type Invoice = {
  id: string;
  childId: string;
  invoiceNumber: string;
  title: string;
  invoiceType: string;
  amountCents: number;
  currency: string;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  childName?: string;
  childCode?: string | null;
  notes?: string | null;
  sessionId?: string | null;
  packageId?: string | null;
  planId?: string | null;
  packageName?: string | null;
  planName?: string | null;
  sessionDate?: string | null;
  sessionDurationMinutes?: number | null;
};

export type ChildPackageAssignment = {
  id: string;
  childId: string;
  childName?: string;
  packageId: string;
  packageName?: string;
  sessionsTotal: number;
  sessionsRemaining: number;
  amountCents: number;
  currency: string;
  status: string;
  purchasedAt: string;
  expiresAt: string | null;
};

export type ChildSubscriptionAssignment = {
  id: string;
  childId: string;
  childName?: string;
  planId: string;
  planName?: string;
  amountCents: number;
  currency: string;
  status: string;
  startedAt: string;
  nextBillingDate: string | null;
};

export type InvoicePayment = {
  id: string;
  amountCents: number;
  paymentMethod: string | null;
  reference: string | null;
  paidAt: string;
};

export type ChildBillingAccount = {
  childId: string;
  childName: string;
  childCode: string | null;
  outstandingCents: number;
  paidCents: number;
  currency: string;
  activePackages: {
    id: string;
    packageName: string;
    sessionsRemaining: number;
    sessionsTotal: number;
    status: string;
  }[];
  activeSubscriptions: {
    id: string;
    planName: string;
    nextBillingDate: string | null;
    status: string;
    amountCents: number;
  }[];
  invoices: Invoice[];
};

export async function getParentBilling(): Promise<{
  accounts: ChildBillingAccount[];
  totalOutstandingCents: number;
  totalPaidCents: number;
}> {
  const { data } = await api.get('/api/billing/my-account');
  return data;
}

export async function getChildBilling(childId: string): Promise<ChildBillingAccount> {
  const { data } = await api.get(`/api/billing/child/${childId}`);
  return data.account;
}

export async function getOutstanding(params?: { from?: string; to?: string; childId?: string }): Promise<{
  outstanding: { childId: string; childName: string; outstandingCents: number; currency: string; invoiceCount: number }[];
  totalOutstandingCents: number;
}> {
  const { data } = await api.get('/api/billing/outstanding', { params });
  return data;
}

export async function listPackages(): Promise<TherapyPackage[]> {
  const { data } = await api.get<{ packages: TherapyPackage[] }>('/api/billing/packages');
  return data.packages;
}

export async function createPackage(input: {
  name: string;
  description?: string;
  sessionCount: number;
  priceCents: number;
}): Promise<TherapyPackage> {
  const { data } = await api.post<{ package: TherapyPackage }>('/api/billing/packages', input);
  return data.package;
}

export async function updatePackage(id: string, input: Partial<TherapyPackage>): Promise<TherapyPackage> {
  const { data } = await api.patch<{ package: TherapyPackage }>(`/api/billing/packages/${id}`, {
    name: input.name,
    description: input.description,
    sessionCount: input.sessionCount,
    priceCents: input.priceCents,
    isActive: input.isActive,
  });
  return data.package;
}

export async function deletePackage(id: string): Promise<void> {
  await api.delete(`/api/billing/packages/${id}`);
}

export async function listChildPackages(childId?: string): Promise<ChildPackageAssignment[]> {
  const { data } = await api.get<{ childPackages: ChildPackageAssignment[] }>('/api/billing/child-packages', {
    params: { childId },
  });
  return data.childPackages;
}

export async function updateChildPackage(
  id: string,
  input: Partial<{ sessionsTotal: number; sessionsRemaining: number; amountCents: number; status: string; expiresAt: string | null }>
): Promise<ChildPackageAssignment> {
  const { data } = await api.patch<{ childPackage: ChildPackageAssignment }>(`/api/billing/child-packages/${id}`, input);
  return data.childPackage;
}

export async function deleteChildPackage(id: string): Promise<void> {
  await api.delete(`/api/billing/child-packages/${id}`);
}

export async function listPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<{ plans: SubscriptionPlan[] }>('/api/billing/plans');
  return data.plans;
}

export async function createPlan(input: {
  name: string;
  description?: string;
  intervalMonths: number;
  priceCents: number;
  sessionsIncluded?: number;
}): Promise<SubscriptionPlan> {
  const { data } = await api.post<{ plan: SubscriptionPlan }>('/api/billing/plans', input);
  return data.plan;
}

export async function updatePlan(id: string, input: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
  const { data } = await api.patch<{ plan: SubscriptionPlan }>(`/api/billing/plans/${id}`, {
    name: input.name,
    description: input.description,
    intervalMonths: input.intervalMonths,
    priceCents: input.priceCents,
    sessionsIncluded: input.sessionsIncluded,
    isActive: input.isActive,
  });
  return data.plan;
}

export async function deletePlan(id: string): Promise<void> {
  await api.delete(`/api/billing/plans/${id}`);
}

export async function listChildSubscriptions(childId?: string): Promise<ChildSubscriptionAssignment[]> {
  const { data } = await api.get<{ childSubscriptions: ChildSubscriptionAssignment[] }>('/api/billing/child-subscriptions', {
    params: { childId },
  });
  return data.childSubscriptions;
}

export async function updateChildSubscription(
  id: string,
  input: Partial<{ amountCents: number; status: string; nextBillingDate: string | null }>
): Promise<ChildSubscriptionAssignment> {
  const { data } = await api.patch<{ childSubscription: ChildSubscriptionAssignment }>(
    `/api/billing/child-subscriptions/${id}`,
    input
  );
  return data.childSubscription;
}

export async function deleteChildSubscription(id: string): Promise<void> {
  await api.delete(`/api/billing/child-subscriptions/${id}`);
}

export async function listInvoices(params?: { childId?: string; status?: string }): Promise<Invoice[]> {
  const { data } = await api.get<{ invoices: Invoice[] }>('/api/billing/invoices', { params });
  return data.invoices;
}

export async function getInvoice(id: string): Promise<{ invoice: Invoice; payments: InvoicePayment[] }> {
  const { data } = await api.get<{ invoice: Invoice; payments: InvoicePayment[] }>(`/api/billing/invoices/${id}`);
  return data;
}

export async function payInvoice(id: string, paymentMethod?: string): Promise<Invoice> {
  const { data } = await api.post<{ invoice: Invoice }>(`/api/billing/invoices/${id}/pay`, { paymentMethod });
  return data.invoice;
}

export async function updateInvoice(
  id: string,
  input: Partial<{ title: string; amountCents: number; dueDate: string | null; notes: string | null }>
): Promise<Invoice> {
  const { data } = await api.patch<{ invoice: Invoice }>(`/api/billing/invoices/${id}`, input);
  return data.invoice;
}

export async function billSession(input: {
  childId: string;
  sessionId: string;
  amountCents?: number;
}): Promise<Invoice> {
  const { data } = await api.post<{ invoice: Invoice }>('/api/billing/session-bill', input);
  return data.invoice;
}

export async function assignPackage(childId: string, packageId: string): Promise<Invoice> {
  const { data } = await api.post<{ invoice?: Invoice }>(`/api/billing/child/${childId}/package`, { packageId });
  if (!data.invoice) throw new Error('Invoice was not created');
  return data.invoice;
}

export async function assignSubscription(childId: string, planId: string, effectiveFrom?: string): Promise<Invoice> {
  const { data } = await api.post<{ invoice: Invoice }>(`/api/billing/child/${childId}/subscription`, {
    planId,
    effectiveFrom: effectiveFrom || undefined,
  });
  return data.invoice;
}

export type SessionBillingStatus = {
  id: string;
  childId: string;
  childName: string;
  sessionDate: string;
  durationMinutes: number | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  amountCents: number | null;
  currency: string | null;
};

export async function listSessionsBillingStatus(childId?: string): Promise<SessionBillingStatus[]> {
  const { data } = await api.get('/api/billing/sessions', { params: { childId } });
  return data.sessions;
}
