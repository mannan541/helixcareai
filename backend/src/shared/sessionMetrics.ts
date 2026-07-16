export const CORE_SESSION_METRICS = ['engagement', 'focus', 'communication'] as const;

export const ADDITIONAL_SESSION_METRICS = [
  'followingInstructions',
  'socialInteraction',
  'emotionalRegulation',
  'taskCompletion',
  'eyeContact',
  'impulseControl',
  'transitionHandling',
  'independence',
] as const;

export const ALL_SESSION_METRIC_KEYS = [...CORE_SESSION_METRICS, ...ADDITIONAL_SESSION_METRICS] as const;

export const SESSION_META_KEYS = new Set([
  'therapyTitle',
  'timeSlot',
  'parentSummary',
  'progressUpdate',
  'homeRecommendations',
]);

export function metricNum(metrics: Record<string, unknown>, key: string): number | null {
  const v = metrics[key];
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n)));
}

export function extractSessionMetrics(metrics: Record<string, unknown>): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const key of ALL_SESSION_METRIC_KEYS) {
    out[key] = metricNum(metrics, key);
  }
  return out;
}
