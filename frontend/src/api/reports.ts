import { api } from './client';
import type { ChildReport } from './types';

export async function getChildReport(childId: string, from: string, to: string): Promise<ChildReport> {
  const { data } = await api.get(`/api/reports/child/${childId}`, {
    params: { from, to, format: 'json' },
  });
  return data.report;
}

export async function getChildReportCsv(childId: string, from: string, to: string): Promise<string> {
  const { data } = await api.get(`/api/reports/child/${childId}`, {
    params: { from, to, format: 'csv' },
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  return data as string;
}
