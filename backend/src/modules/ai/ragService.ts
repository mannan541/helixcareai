import type { ChildRow } from '../children/children.service';
import * as childrenService from '../children/children.service';
import * as embeddingService from './embeddingService';
import * as vectorSearchService from './vectorSearchService';
import * as ollamaService from './ollamaService';
import * as groqService from './groqService';
import * as geminiService from './geminiService';

const DEFAULT_TOP_K = 5;

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

  const child = await childrenService.findById(childId);
  const childProfile = child ? formatChildProfileForAI(child) : '';

  let context = '';
  try {
    const embedding = await embeddingService.generateEmbedding(trimmedQuestion);
    const notes = await vectorSearchService.findRelevantNotes(childId, embedding, topK);
    context = notes.length > 0 ? notes.join('\n\n---\n\n') : '';
  } catch (_e) {
    // Embedding service unreachable (e.g. on Vercel without Python service): answer from child profile only
    context = '';
  }

  const llmOptions = { childProfile: childProfile || undefined };

  // Groq (primary) → Gemini (fallback) → Ollama (local)
  const tryGroq = () => groqService.askLLM(trimmedQuestion, context, llmOptions);
  const tryGemini = () => geminiService.askLLM(trimmedQuestion, context, llmOptions);
  const tryOllama = () => ollamaService.askLLM(trimmedQuestion, context, llmOptions);

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
        try {
          return await tryGemini();
        } catch {
          return await tryOllama();
        }
      }
      return await tryOllama();
    }
  }
  if (geminiService.isConfigured()) {
    try {
      return await tryGemini();
    } catch {
      return await tryOllama();
    }
  }
  return await tryOllama();
}
/**
 * RAG: global assistant for all accessible children.
 */
export async function askGlobalAssistant(
  childIds: string[],
  question: string,
  options: { topK?: number } = {}
): Promise<string> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) throw new Error('Question cannot be empty');
  if (!childIds.length) return 'I don\'t see any children profiles to talk about.';

  const topK = options.topK ?? DEFAULT_TOP_K;

  // Gathering summaries for better global overview
  const children = await Promise.all(childIds.map(id => childrenService.findById(id)));
  const childrenContext = children.filter(Boolean).map(c => `- ${c!.first_name} ${c!.last_name} (${c!.status ?? 'active'}, diag: ${c!.diagnosis_type ?? 'none'})`).join('\n');

  let context = 'Summary of accessible children:\n' + childrenContext + '\n\n';
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

  const llmOptions = { childProfile: 'Global Assistant Mode: Answering based on all managed children and clinic data.' };

  const tryGroq = () => groqService.askLLM(trimmedQuestion, context, llmOptions);
  const tryGemini = () => geminiService.askLLM(trimmedQuestion, context, llmOptions);
  const tryOllama = () => ollamaService.askLLM(trimmedQuestion, context, llmOptions);

  if (groqService.isConfigured()) {
    try { return await tryGroq(); } catch {
      if (geminiService.isConfigured()) { try { return await tryGemini(); } catch { return await tryOllama(); } }
      return await tryOllama();
    }
  }
  if (geminiService.isConfigured()) {
    try { return await tryGemini(); } catch { return await tryOllama(); }
  }
  return await tryOllama();
}
