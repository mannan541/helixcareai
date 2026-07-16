/** Session clinical metrics: therapists score 1–5; stored as 0–10 for charts and parent reports. */

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

export type SessionMetricKey = (typeof ALL_SESSION_METRIC_KEYS)[number];

export const SESSION_META_KEYS = new Set([
  'therapyTitle',
  'timeSlot',
  'parentSummary',
  'progressUpdate',
  'homeRecommendations',
]);

export const PICKER_SCALE = [
  { score: 1, label: 'Very Poor', meaning: 'Significant difficulty' },
  { score: 2, label: 'Below Expected', meaning: 'Needs substantial support' },
  { score: 3, label: 'Average', meaning: 'Moderate performance' },
  { score: 4, label: 'Good', meaning: 'Meeting expectations' },
  { score: 5, label: 'Excellent', meaning: 'Consistently demonstrated' },
] as const;

type MetricDef = {
  label: string;
  description: string;
  levels: Record<1 | 2 | 3 | 4 | 5, string>;
};

export const METRIC_DEFS: Record<SessionMetricKey, MetricDef> = {
  engagement: {
    label: 'Engagement',
    description: 'How actively the child participated in the session.',
    levels: {
      1: 'Refused activities, frequently disengaged',
      2: 'Participated only with constant prompting',
      3: 'Participated in most activities with some prompting',
      4: 'Engaged throughout with minimal prompting',
      5: 'Fully engaged and self-motivated',
    },
  },
  focus: {
    label: 'Focus',
    description: 'Ability to maintain attention on tasks.',
    levels: {
      1: 'Unable to stay on task',
      2: 'Frequent redirection required',
      3: 'Moderate focus with occasional redirection',
      4: 'Good attention span',
      5: 'Sustained focus throughout activities',
    },
  },
  communication: {
    label: 'Communication',
    description: 'Verbal and non-verbal communication during the session.',
    levels: {
      1: 'Very limited communication',
      2: 'Rare responses or significant support needed',
      3: 'Basic communication with support',
      4: 'Effective communication in most situations',
      5: 'Consistent and independent communication',
    },
  },
  followingInstructions: {
    label: 'Following Instructions',
    description: 'Ability to understand and follow directions.',
    levels: {
      1: 'Did not follow instructions',
      2: 'Followed with repeated prompting',
      3: 'Followed simple instructions with support',
      4: 'Followed multi-step instructions with minimal help',
      5: 'Followed instructions independently',
    },
  },
  socialInteraction: {
    label: 'Social Interaction',
    description: 'Interaction with therapist or peers during activities.',
    levels: {
      1: 'Avoided social interaction',
      2: 'Minimal interaction, needed encouragement',
      3: 'Some reciprocal interaction',
      4: 'Positive interaction in structured activities',
      5: 'Initiated and sustained social interaction',
    },
  },
  emotionalRegulation: {
    label: 'Emotional Regulation',
    description: 'Managing emotions and recovering from frustration.',
    levels: {
      1: 'Frequent dysregulation, long recovery',
      2: 'Often upset, needed significant co-regulation',
      3: 'Some frustration, calmed with support',
      4: 'Generally regulated with brief support',
      5: 'Well-regulated throughout the session',
    },
  },
  taskCompletion: {
    label: 'Task Completion',
    description: 'Finishing assigned activities or therapy tasks.',
    levels: {
      1: 'Unable to complete tasks',
      2: 'Completed fragments with heavy support',
      3: 'Completed some tasks with support',
      4: 'Completed most tasks with minimal help',
      5: 'Completed tasks independently',
    },
  },
  eyeContact: {
    label: 'Eye Contact',
    description: 'Appropriate eye contact during interaction (ASD).',
    levels: {
      1: 'Avoided eye contact entirely',
      2: 'Brief or inconsistent eye contact',
      3: 'Some eye contact with prompting',
      4: 'Good eye contact in structured moments',
      5: 'Consistent, appropriate eye contact',
    },
  },
  impulseControl: {
    label: 'Impulse Control',
    description: 'Waiting turn, inhibiting impulsive responses (ADHD).',
    levels: {
      1: 'Impulsive throughout session',
      2: 'Frequent impulsive behaviour',
      3: 'Some impulsivity, improved with reminders',
      4: 'Good control with occasional reminders',
      5: 'Consistent impulse control',
    },
  },
  transitionHandling: {
    label: 'Transition Handling',
    description: 'Moving between activities or leaving tasks.',
    levels: {
      1: 'Very difficult transitions, high distress',
      2: 'Resisted most transitions',
      3: 'Transitions with support and warnings',
      4: 'Smooth transitions with minimal support',
      5: 'Independent, flexible transitions',
    },
  },
  independence: {
    label: 'Independence',
    description: 'Working and participating without hand-over-hand support.',
    levels: {
      1: 'Fully dependent on adult support',
      2: 'Required continuous assistance',
      3: 'Partial independence with prompting',
      4: 'Mostly independent with occasional help',
      5: 'Highly independent throughout',
    },
  },
};

export function isSessionMetricKey(key: string): key is SessionMetricKey {
  return (ALL_SESSION_METRIC_KEYS as readonly string[]).includes(key);
}

export function sessionMetricLabel(key: string): string {
  if (isSessionMetricKey(key)) return METRIC_DEFS[key].label;
  return key ? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()) : key;
}

export function normalizeStoredScore(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n)));
}

/** Therapist 1–5 picker → 0–10 stored value */
export function toStoredScore(picker: number): number {
  return Math.min(10, Math.max(2, picker * 2));
}

/** Stored 0–10 → therapist 1–5 picker */
export function fromStoredToPicker(stored: unknown): number {
  const n = normalizeStoredScore(stored);
  if (n == null) return 3;
  return Math.min(5, Math.max(1, Math.round(n / 2)));
}

export function formatMetricForParent(stored: unknown): string {
  const n = normalizeStoredScore(stored);
  if (n == null) return '—';
  return `${n}/10`;
}

export function formatMetricForTherapist(stored: unknown): string {
  const n = normalizeStoredScore(stored);
  if (n == null) return '—';
  const pick = fromStoredToPicker(n);
  const level = PICKER_SCALE.find((s) => s.score === pick);
  return `${pick}/5 · ${n}/10${level ? ` (${level.label})` : ''}`;
}

export function formatMetricDisplay(stored: unknown, audience: 'parent' | 'therapist' | 'admin'): string {
  if (audience === 'parent') return formatMetricForParent(stored);
  return formatMetricForTherapist(stored);
}

export function pickerStars(picker: number): string {
  const p = Math.min(5, Math.max(1, picker));
  return '★'.repeat(p) + '☆'.repeat(5 - p);
}

export function getSessionMetricEntries(
  metrics: Record<string, unknown>
): Array<{ key: SessionMetricKey; stored: number }> {
  const entries: Array<{ key: SessionMetricKey; stored: number }> = [];
  for (const key of ALL_SESSION_METRIC_KEYS) {
    const stored = normalizeStoredScore(metrics[key]);
    if (stored != null) entries.push({ key, stored });
  }
  return entries;
}

export function loadPickerValuesFromMetrics(metrics: Record<string, unknown>): Record<string, number | ''> {
  const values: Record<string, number | ''> = {};
  for (const key of CORE_SESSION_METRICS) {
    values[key] = metrics[key] != null ? fromStoredToPicker(metrics[key]) : 3;
  }
  for (const key of ADDITIONAL_SESSION_METRICS) {
    values[key] = metrics[key] != null ? fromStoredToPicker(metrics[key]) : '';
  }
  return values;
}

export function buildStoredMetricsFromPickers(
  pickers: Record<string, number | ''>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, pick] of Object.entries(pickers)) {
    if (pick === '' || pick == null) continue;
    if (!isSessionMetricKey(key)) continue;
    out[key] = toStoredScore(Number(pick));
  }
  return out;
}

export const METRIC_CHART_COLORS: Partial<Record<SessionMetricKey, string>> = {
  engagement: '#2563eb',
  focus: '#16a34a',
  communication: '#d97706',
  followingInstructions: '#7c3aed',
  socialInteraction: '#db2777',
  emotionalRegulation: '#0891b2',
  taskCompletion: '#65a30d',
  eyeContact: '#ea580c',
  impulseControl: '#4f46e5',
  transitionHandling: '#0d9488',
  independence: '#ca8a04',
};
