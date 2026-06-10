import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getChildReport, getChildReportCsv } from '../api/reports';
import { getChild } from '../api/children';
import type { Child, ChildReport } from '../api/types';
import { errorMessage } from '../api/client';
import {
  Card,
  Spinner,
  ErrorMessage,
  PageTitle,
  btnPrimary,
  btnSecondary,
  inputCls,
  Field,
  StatusBadge,
} from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDate, formatTime, toDateInput, todayInput } from '../utils/format';

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-primary' : 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

export default function ChildReportPage() {
  const { childId } = useParams<{ childId: string }>();
  const [child, setChild] = useState<Child | null>(null);
  const defaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInput(d);
  };
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(todayInput());
  const [report, setReport] = useState<ChildReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (childId) getChild(childId).then(setChild).catch(() => {});
  }, [childId]);

  const generate = async () => {
    if (!childId) return;
    setLoading(true);
    setError('');
    try {
      setReport(await getChildReport(childId, from, to));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    if (!childId) return;
    setExporting(true);
    setError('');
    try {
      const csv = await getChildReportCsv(childId, from, to);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = child ? `${child.firstName}_${child.lastName}` : 'child';
      a.download = `report_${name}_${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle back={<BackButton fallback={`/children/${childId}`} />}>
        Report{child ? ` — ${child.firstName} ${child.lastName}` : ''}
      </PageTitle>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <button className={btnPrimary} onClick={generate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate report'}
          </button>
          <button className={btnSecondary} onClick={exportCsv} disabled={exporting}>
            {exporting ? 'Exporting…' : '⬇ Export CSV'}
          </button>
        </div>
      </Card>

      {error && <ErrorMessage error={error} />}
      {loading && <Spinner />}

      {report && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Sessions" value={report.performance.totalSessions} accent />
            <Stat label="Total minutes" value={report.performance.totalMinutes} />
            <Stat
              label="Attendance rate"
              value={report.attendance.attendanceRate != null ? `${report.attendance.attendanceRate}%` : '—'}
              accent
            />
            <Stat label="Scheduled" value={report.attendance.scheduled} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-2 font-bold">Attendance</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p>Scheduled: <b>{report.attendance.scheduled}</b></p>
                <p>Completed: <b className="text-green-700">{report.attendance.completed}</b></p>
                <p>Cancelled: <b className="text-red-600">{report.attendance.cancelled}</b></p>
                <p>Missed: <b className="text-amber-600">{report.attendance.missed}</b></p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-2 font-bold">Performance averages</h2>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {(
                  [
                    ['Engagement', report.performance.avgEngagement, report.performance.trend.engagementChange],
                    ['Focus', report.performance.avgFocus, report.performance.trend.focusChange],
                    ['Communication', report.performance.avgCommunication, report.performance.trend.communicationChange],
                  ] as const
                ).map(([label, avg, change]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-lg font-bold">{avg ?? '—'}</p>
                    {change != null && (
                      <p className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 font-bold">Sessions in period ({report.sessions.length})</h2>
            {report.sessions.length === 0 ? (
              <p className="text-sm text-slate-500">No sessions in this period</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-130 text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Therapy</th>
                      <th className="py-2 pr-3">Duration</th>
                      <th className="py-2 pr-3">Eng.</th>
                      <th className="py-2 pr-3">Focus</th>
                      <th className="py-2 pr-3">Comm.</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sessions.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(s.date)}</td>
                        <td className="py-2 pr-3">{s.therapyTitle ?? '—'}</td>
                        <td className="py-2 pr-3">{s.durationMinutes != null ? `${s.durationMinutes}m` : '—'}</td>
                        <td className="py-2 pr-3">{s.engagement ?? '—'}</td>
                        <td className="py-2 pr-3">{s.focus ?? '—'}</td>
                        <td className="py-2 pr-3">{s.communication ?? '—'}</td>
                        <td className="max-w-60 truncate py-2 text-slate-500">{s.notesPreview ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Appointments in period ({report.appointments.length})</h2>
            {report.appointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments in this period</p>
            ) : (
              <div className="space-y-2">
                {report.appointments.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span>
                      {formatDate(a.date)} • {formatTime(a.startTime)} – {formatTime(a.endTime)}
                      {a.therapistName ? ` • ${a.therapistName}` : ''}
                    </span>
                    <span className="flex items-center gap-2">
                      {a.hasSession && <span className="text-xs text-green-700">session logged</span>}
                      <StatusBadge status={a.status} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
