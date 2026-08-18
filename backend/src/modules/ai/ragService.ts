import type { ChildRow } from '../children/children.service';
import * as childrenService from '../children/children.service';
import * as embeddingService from './embeddingService';
import * as vectorSearchService from './vectorSearchService';
import * as groqService from './groqService';
import * as geminiService from './geminiService';
import * as sessionContextService from './sessionContextService';
import * as therapyEmbeddingStorage from './therapyEmbeddingStorage';
import * as analyticsService from '../analytics/analytics.service';

const DEFAULT_TOP_K = 5;
const OPERATIONS_LOOKBACK_DAYS = 30;
const MAX_OPERATIONS_THERAPISTS = 50;
const MAX_OPERATIONS_BLOCK_CHARS = 4000;

function formatTherapistAnalyticsForAI(rows: analyticsService.TherapistAnalytics[], windowLabel: string): string {
  if (rows.length === 0) return `Therapist performance (${windowLabel}): no therapists found.`;
  const top = [...rows].sort((a, b) => b.sessionsTotal - a.sessionsTotal).slice(0, MAX_OPERATIONS_THERAPISTS);
  const line = (t: analyticsService.TherapistAnalytics): string =>
    `- ${t.fullName}: sessions=${t.sessionsTotal} (completed=${t.sessionsCompleted}, cancelled=${t.sessionsCancelled}, pending=${t.sessionsPending}, approved=${t.sessionsApproved}), ` +
    `utilization=${t.utilizationPct != null ? `${t.utilizationPct}%` : 'n/a'}, ` +
    `documentation=${t.documentationCompletionPct != null ? `${t.documentationCompletionPct}%` : 'n/a'}, ` +
    `avgDuration=${t.avgSessionDurationMinutes != null ? `${t.avgSessionDurationMinutes}min` : 'n/a'}, ` +
    `childrenAssigned=${t.childrenAssigned}, goalsUpdated=${t.goalsUpdatedPct != null ? `${t.goalsUpdatedPct}%` : 'n/a'}, ` +
    `parentFeedback=${t.parentFeedbackAvg != null ? `${t.parentFeedbackAvg}/5 (${t.parentFeedbackCount} ratings)` : 'no ratings'}`;
  return `Therapist performance (${windowLabel}):\n` + top.map(line).join('\n');
}

function formatClinicSummaryForAI(summary: analyticsService.ClinicSummary, windowLabel: string): string {
  const revenue = (summary.revenueCents / 100).toFixed(2);
  return (
    `Clinic summary (${windowLabel}):\n` +
    `- Total appointments: ${summary.totalAppointments}\n` +
    `- Completed sessions: ${summary.totalSessionsCompleted}\n` +
    `- Cancellations: ${summary.totalCancellations}\n` +
    `- Revenue (paid invoices): ${revenue} ${summary.currency}\n` +
    `- Active children: ${summary.childrenActive}`
  );
}

function formatMissingNotesForAI(rows: analyticsService.MissingNotesSession[]): string | null {
  if (rows.length === 0) return null;
  const sample = rows.slice(0, 10);
  return (
    `Sessions missing notes/documentation (showing ${sample.length} of ${rows.length}):\n` +
    sample
      .map((s) => `- ${s.childName}, ${s.sessionDate}${s.therapistName ? `, therapist: ${s.therapistName}` : ''}`)
      .join('\n')
  );
}

function formatStaleGoalsForAI(rows: analyticsService.StaleGoalChild[]): string | null {
  if (rows.length === 0) return null;
  const sample = rows.slice(0, 10);
  return (
    `Children with no recent goal-related progress in the last ${OPERATIONS_LOOKBACK_DAYS} days (showing ${sample.length} of ${rows.length}):\n` +
    sample.map((c) => `- ${c.childName} (therapist: ${c.therapistName || 'unassigned'})`).join('\n')
  );
}

/**
 * Build the clinic operations summary block for global-mode chat. Admin and therapist roles both get
 * therapist-level performance data (matching their existing symmetric clinic-wide child visibility);
 * only admin gets financial data, matching the billing module's own admin-only gating. Two windows
 * (last 30 days + all-time) are included so relative questions like "this month" have some grounding —
 * this is not true date-range NLU, just a best-effort recency hint.
 */
async function buildOperationsSummary(role: string): Promise<string | null> {
  if (role === 'parent') return null;
  try {
    const today = new Date();
    const toStr = today.toISOString().slice(0, 10);
    const fromStr = new Date(today.getTime() - OPERATIONS_LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10);

    const [recentTherapists, allTimeTherapists, missingNotes, staleGoals] = await Promise.all([
      analyticsService.getTherapistAnalytics({ from: fromStr, to: toStr }),
      analyticsService.getTherapistAnalytics({}),
      analyticsService.getSessionsMissingNotes({ limit: 10 }),
      analyticsService.getStaleGoalChildren({}),
    ]);

    let block = `Today's date: ${toStr}\n\n`;
    block += formatTherapistAnalyticsForAI(recentTherapists, `last ${OPERATIONS_LOOKBACK_DAYS} days`);
    block += '\n\n' + formatTherapistAnalyticsForAI(allTimeTherapists, 'all-time');
    const missingBlock = formatMissingNotesForAI(missingNotes);
    if (missingBlock) block += '\n\n' + missingBlock;
    const staleBlock = formatStaleGoalsForAI(staleGoals);
    if (staleBlock) block += '\n\n' + staleBlock;

    if (role === 'admin') {
      const [recentClinic, allTimeClinic] = await Promise.all([
        analyticsService.getClinicSummary({ from: fromStr, to: toStr }),
        analyticsService.getClinicSummary({}),
      ]);
      block += '\n\n' + formatClinicSummaryForAI(recentClinic, `last ${OPERATIONS_LOOKBACK_DAYS} days`);
      block += '\n\n' + formatClinicSummaryForAI(allTimeClinic, 'all-time');
    }

    if (block.length > MAX_OPERATIONS_BLOCK_CHARS) {
      block = block.slice(0, MAX_OPERATIONS_BLOCK_CHARS) + '\n[...truncated for length]';
    }
    return block;
  } catch (err) {
    console.error('[ragService] buildOperationsSummary failed:', err);
    return null;
  }
}

/**
 * Format child record as a text profile for the AI so it can answer questions about
 * the child's details, diagnosis, status, therapies, etc.
 */
function formatChildProfileForAI(c: ChildRow): string {
  const line = (label: string, value: string | null | undefined | unknown): string | null =>
    value != null && String(value).trim() !== '' ? `${label}: ${value}` : null;
  const lines: (string | null)[] = [];
  const firstName = (c.first_name ?? '').trim();
  const lastName = (c.last_name ?? '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '—';
  lines.push(line('Full name', fullName));
  lines.push(line('Child code', c.child_code ?? null));
  lines.push(line('Joining date', c.created_at ?? null));
  lines.push(line('Current status', c.status ?? null));
  lines.push(line('Date of birth', c.date_of_birth ?? null));
  lines.push(line('Gender', c.gender ?? null));
  lines.push(line('Diagnosis', c.diagnosis ?? null));
  lines.push(line('Diagnosis type', c.diagnosis_type ?? null));
  lines.push(line('Autism level', c.autism_level ?? null));
  lines.push(line('Diagnosis date', c.diagnosis_date ?? null));
  lines.push(line('Referred by', c.referred_by ?? null));
  lines.push(line('Primary language', c.primary_language ?? null));
  lines.push(line('Communication type', c.communication_type ?? null));
  lines.push(line('IQ level', c.iq_level ?? null));
  lines.push(line('Developmental age', c.developmental_age ?? null));
  lines.push(line('Sensory sensitivity', c.sensory_sensitivity ?? null));
  lines.push(line('Behavioral notes', c.behavioral_notes ?? null));
  lines.push(line('Medical conditions', c.medical_conditions ?? null));
  lines.push(line('Medications', c.medications ?? null));
  lines.push(line('Allergies', c.allergies ?? null));
  lines.push(line('Therapy start date', c.therapy_start_date ?? null));
  lines.push(line('Therapy status', c.therapy_status ?? null));
  lines.push(line('Sessions per week', c.sessions_per_week ?? null));
  lines.push(line('Communication score', c.communication_score ?? null));
  lines.push(line('Social score', c.social_score ?? null));
  lines.push(line('Behavioral score', c.behavioral_score ?? null));
  lines.push(line('Cognitive score', c.cognitive_score ?? null));
  lines.push(line('Motor skill score', c.motor_skill_score ?? null));
  lines.push(line('General notes', c.notes ?? null));
  return lines.filter((x): x is string => x != null).join('\n');
}

/**
 * RAG: ask the child assistant a question using child profile + therapy notes.
 * 1. Fetch child and build profile text for the AI
 * 2. Generate embedding for the question
 * 3. Retrieve top similar therapy notes from therapy_embeddings
 * 4. Build context from notes
 * 5. Send child profile + context + question to Ollama
 * 6. Return AI answer
 */
export async function askChildAssistant(
  childId: string,
  question: string,
  options: { topK?: number } = {}
): Promise<string> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Question cannot be empty');
  }
  if (!childId) {
    throw new Error('Child ID is required');
  }

  const topK = options.topK ?? DEFAULT_TOP_K;

  // Backfill any sessions not yet in the AI index before answering.
  try {
    await therapyEmbeddingStorage.syncMissingSessionEmbeddings(childId);
  } catch (err) {
    console.error('[ragService] syncMissingSessionEmbeddings failed:', err);
  }

  const child = await childrenService.findById(childId);
  const childProfile = child ? formatChildProfileForAI(child) : '';

  const contextParts: string[] = [];

  try {
    const recent = await sessionContextService.getRecentSessionSummaries(childId, 15);
    if (recent.length > 0) {
      contextParts.push(
        'Recent therapy sessions (newest first):\n' + recent.map((s, i) => `[Session ${i + 1}]\n${s}`).join('\n\n---\n\n')
      );
    }
  } catch (_e) {
    // continue without recent summaries
  }

  try {
    const embedding = await embeddingService.generateEmbedding(trimmedQuestion);
    const notes = await vectorSearchService.findRelevantNotes(childId, embedding, topK);
    if (notes.length > 0) {
      contextParts.push('Relevant session records (semantic search):\n' + notes.join('\n\n---\n\n'));
    }
  } catch (_e) {
    // Embedding service unreachable: still have recent summaries + child profile
  }

  const context = contextParts.join('\n\n==========\n\n');

  const llmOptions = { childProfile: childProfile || undefined };

  const tryGroq = () => groqService.askLLM(trimmedQuestion, context, llmOptions);
  const tryGemini = () => geminiService.askLLM(trimmedQuestion, context, llmOptions);

  const isProduction = process.env.NODE_ENV === 'production';
  const hasCloudLLM = groqService.isConfigured() || geminiService.isConfigured();
  if (isProduction && !hasCloudLLM) {
    const err = new Error(
      'AI chat requires GROQ_API_KEY or GEMINI_API_KEY in production. Add one in Vercel → Project → Settings → Environment Variables.'
    ) as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }

  if (groqService.isConfigured()) {
    try {
      return await tryGroq();
    } catch {
      if (geminiService.isConfigured()) {
        return await tryGemini();
      }
      throw new Error('Groq failed and Gemini is not configured or failed.');
    }
  }
  if (geminiService.isConfigured()) {
    return await tryGemini();
  }
  throw new Error('No cloud AI service (Groq or Gemini) is configured.');
}
/**
 * RAG: global assistant for all accessible children.
 */
export async function askGlobalAssistant(
  childIds: string[],
  question: string,
  options: { topK?: number; role?: string } = {}
): Promise<string> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) throw new Error('Question cannot be empty');
  if (!childIds.length) return 'I don\'t see any children profiles to talk about.';

  const topK = options.topK ?? DEFAULT_TOP_K;

  try {
    await Promise.all(
      childIds.map((id) => therapyEmbeddingStorage.syncMissingSessionEmbeddings(id))
    );
  } catch (err) {
    console.error('[ragService] global syncMissingSessionEmbeddings failed:', err);
  }

  // Gathering summaries for better global overview
  const children = await Promise.all(childIds.map(id => childrenService.findById(id)));
  const childrenContext = children.filter(Boolean).map(c => `- ${c!.first_name} ${c!.last_name} (${c!.status ?? 'active'}, diag: ${c!.diagnosis_type ?? 'none'})`).join('\n');

  let context = 'Summary of accessible children:\n' + childrenContext + '\n\n';

  try {
    const sessionBlocks: string[] = [];
    for (const id of childIds.slice(0, 5)) {
      const child = children.find((c) => c?.id === id);
      const name = child ? `${child.first_name} ${child.last_name}` : id;
      const recent = await sessionContextService.getRecentSessionSummaries(id, 5);
      if (recent.length > 0) {
        sessionBlocks.push(
          `Recent sessions for ${name}:\n` +
            recent.map((s, i) => `[${i + 1}]\n${s}`).join('\n\n---\n\n')
        );
      }
    }
    if (sessionBlocks.length > 0) {
      context += sessionBlocks.join('\n\n==========\n\n') + '\n\n';
    }
  } catch (_e) {
    // continue
  }

  try {
    const embedding = await embeddingService.generateEmbedding(trimmedQuestion);
    // Find relevant notes across ALL provided child IDs
    const vectorStr = `[${embedding.join(',')}]`;
    const rows = await vectorSearchService.searchAllChildren(childIds, vectorStr, topK);
    if (rows.length > 0) {
      context += 'Relevant session notes:\n' + rows.join('\n---\n');
    }
  } catch (e) {
    // If embedding fails, user still gets answer from children names list
  }

  if (options.role) {
    const operationsSummary = await buildOperationsSummary(options.role);
    if (operationsSummary) {
      context += '\n\n==========\n\n' + operationsSummary;
    }
  }

  const llmOptions = { childProfile: 'Global Assistant Mode: Answering based on all managed children and clinic data.' };

  const tryGroq = () => groqService.askLLM(trimmedQuestion, context, llmOptions);
  const tryGemini = () => geminiService.askLLM(trimmedQuestion, context, llmOptions);

  if (groqService.isConfigured()) {
    try {
      return await tryGroq();
    } catch {
      if (geminiService.isConfigured()) {
        return await tryGemini();
      }
      throw new Error('Groq failed and Gemini is not configured.');
    }
  }
  if (geminiService.isConfigured()) {
    return await tryGemini();
  }
  throw new Error('No cloud AI service configured.');
}
