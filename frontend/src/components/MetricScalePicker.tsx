import {
  METRIC_DEFS,
  PICKER_SCALE,
  pickerStars,
  type SessionMetricKey,
} from '../utils/sessionMetrics';

type Props = {
  metricKey: SessionMetricKey;
  value: number | '';
  onChange: (picker: number | '') => void;
  optional?: boolean;
};

export default function MetricScalePicker({ metricKey, value, onChange, optional }: Props) {
  const def = METRIC_DEFS[metricKey];
  const selected = value === '' ? null : Number(value);
  const levelText = selected != null ? def.levels[selected as 1 | 2 | 3 | 4 | 5] : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">
            {def.label}
            {optional && <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">{def.description}</p>
        </div>
        {selected != null && (
          <span className="shrink-0 text-amber-500" title={`${selected}/5`}>
            {pickerStars(selected)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PICKER_SCALE.map((s) => (
          <button
            key={s.score}
            type="button"
            title={`${s.score} — ${s.label}: ${def.levels[s.score as 1 | 2 | 3 | 4 | 5]}`}
            onClick={() => onChange(selected === s.score && optional ? '' : s.score)}
            className={`rounded-lg border px-2 py-1.5 text-left text-xs transition ${
              selected === s.score
                ? 'border-primary bg-primary text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary/50'
            }`}
          >
            <span className="block font-bold">{s.score}</span>
            <span className={`block ${selected === s.score ? 'text-white/90' : 'text-slate-500'}`}>{s.label}</span>
          </button>
        ))}
        {optional && selected != null && (
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => onChange('')}
          >
            Clear
          </button>
        )}
      </div>

      {levelText && (
        <p className="mt-2 rounded bg-white px-2 py-1.5 text-xs text-slate-700">
          <span className="font-semibold">Selected: </span>
          {levelText}
          <span className="ml-2 text-slate-400">(stored as {(selected ?? 3) * 2}/10)</span>
        </p>
      )}
    </div>
  );
}

export function MetricScaleLegend() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
      <p className="font-semibold text-slate-800">Scoring guide (1–5 scale)</p>
      <p className="mt-1">Therapists rate each area 1–5 after the session. Scores are stored as 0–10 for progress charts and parent reports.</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {PICKER_SCALE.map((s) => (
          <li key={s.score}>
            <b>{s.score}</b> — {s.label}: {s.meaning}
          </li>
        ))}
      </ul>
    </div>
  );
}
