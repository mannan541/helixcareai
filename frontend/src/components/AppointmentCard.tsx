import type { ReactNode } from 'react';
import type { Appointment } from '../api/types';
import { Card, StatusBadge } from './ui';
import { formatDate, formatTime } from '../utils/format';

export default function AppointmentCard({
  appointment: a,
  actions,
}: {
  appointment: Appointment;
  actions?: ReactNode;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {formatDate(a.appointment_date)} • {formatTime(a.start_time)} – {formatTime(a.end_time)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          Child: {a._child_first_name} {a._child_last_name}
          {a._therapist_full_name && (
            <>
              {' '}• Therapist: {a._therapist_full_name}
              {a._therapist_title ? ` (${a._therapist_title})` : ''}
            </>
          )}
        </p>
        {a.session_logged_by_name && (
          <p className="mt-0.5 text-xs text-green-700">Session logged by {a.session_logged_by_name}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        {actions}
      </div>
    </Card>
  );
}
