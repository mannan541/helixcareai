import type { SessionRow } from '../sessions/sessions.service';

/**
 * Build searchable text from a session for RAG embeddings.
 * Includes structured metrics so AI can answer performance questions even when notes are empty.
 */
export function buildSessionEmbeddingText(session: {
  session_date: string;
  duration_minutes?: number | null;
  notes_text?: string | null;
  structured_metrics?: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  const date = session.session_date?.trim();
  if (date) parts.push(`Session date: ${date}`);

  const duration = session.duration_minutes;
  if (duration != null && duration > 0) parts.push(`Duration: ${duration} minutes`);

  const metrics = session.structured_metrics ?? {};
  const therapyTitle = metrics.therapyTitle;
  if (therapyTitle != null && String(therapyTitle).trim()) {
    parts.push(`Therapy type: ${therapyTitle}`);
  }
  const metricLines: string[] = [];
  for (const [key, value] of Object.entries(metrics)) {
    if (key === 'therapyTitle' || value == null || String(value).trim() === '') continue;
    metricLines.push(`${key}: ${value}`);
  }
  if (metricLines.length > 0) {
    parts.push('Session metrics:\n' + metricLines.join('\n'));
  }

  const notes = session.notes_text?.trim();
  if (notes) parts.push('Therapist notes:\n' + notes);

  return parts.join('\n\n').trim();
}

export function buildEmbeddingTextFromSessionRow(session: SessionRow): string {
  return buildSessionEmbeddingText({
    session_date: session.session_date,
    duration_minutes: session.duration_minutes,
    notes_text: session.notes_text,
    structured_metrics: session.structured_metrics,
  });
}
