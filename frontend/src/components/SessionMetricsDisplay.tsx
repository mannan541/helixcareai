import {
  CORE_SESSION_METRICS,
  ADDITIONAL_SESSION_METRICS,
  getSessionMetricEntries,
  formatMetricDisplay,
  sessionMetricLabel,
  METRIC_DEFS,
  fromStoredToPicker,
  pickerStars,
  type SessionMetricKey,
} from '../utils/sessionMetrics';

type Props = {
  metrics: Record<string, unknown>;
  audience: 'parent' | 'therapist' | 'admin';
  /** compact = inline badges; detailed = cards with definitions */
  variant?: 'compact' | 'detailed';
};

export default function SessionMetricsDisplay({ metrics, audience, variant = 'compact' }: Props) {
  const entries = getSessionMetricEntries(metrics);
  if (entries.length === 0) return null;

  const core = entries.filter((e) => (CORE_SESSION_METRICS as readonly string[]).includes(e.key));
  const additional = entries.filter((e) => (ADDITIONAL_SESSION_METRICS as readonly string[]).includes(e.key));

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(({ key, stored }) => (
          <span key={key} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm">
            <span className="text-slate-600">{sessionMetricLabel(key)}</span>:{' '}
            <b>{formatMetricDisplay(stored, audience)}</b>
          </span>
        ))}
      </div>
    );
  }

  const renderGroup = (title: string, group: typeof entries) => {
    if (group.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        {group.map(({ key, stored }) => {
          const pick = fromStoredToPicker(stored);
          const def = METRIC_DEFS[key as SessionMetricKey];
          return (
            <div key={key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{def.label}</p>
                <div className="text-right">
                  {audience === 'parent' ? (
                    <p className="text-lg font-bold text-primary">{formatMetricDisplay(stored, 'parent')}</p>
                  ) : (
                    <>
                      <span className="text-amber-500">{pickerStars(pick)}</span>
                      <p className="text-sm font-bold text-slate-800">{formatMetricDisplay(stored, audience)}</p>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">{def.levels[pick as 1 | 2 | 3 | 4 | 5]}</p>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderGroup('Core metrics', core)}
      {renderGroup('Additional metrics', additional)}
    </div>
  );
}
