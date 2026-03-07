import type { ChildRow } from '../children/children.service';
import * as childrenService from '../children/children.service';
import * as embeddingService from './embeddingService';
import * as vectorSearchService from './vectorSearchService';
import * as ollamaService from './ollamaService';

const DEFAULT_TOP_K = 5;

/**
 * Format child record as a text profile for the AI so it can answer questions about
 * the child's details, diagnosis, status, therapies, etc.
 */
function formatChildProfileForAI(c: ChildRow): string {
  const line = (label: string, value: unknown) =>
    value != null && String(value).trim() !== '' ? `${label}: ${value}` : null;
  const lines: string[] = [];
  const firstName = (c.first_name ?? '').trim();
  const lastName = (c.last_name ?? '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || '—';
  lines.push(line('Full name', fullName));
  lines.push(line('Child code', c.child_code));
  lines.push(line('Joining date', c.created_at));
  lines.push(line('Current status', c.status));
  lines.push(line('Date of birth', c.date_of_birth));
  lines.push(line('Gender', c.gender));
  lines.push(line('Diagnosis', c.diagnosis));
  lines.push(line('Diagnosis type', c.diagnosis_type));
  lines.push(line('Autism level', c.autism_level));
  lines.push(line('Diagnosis date', c.diagnosis_date));
  lines.push(line('Referred by', c.referred_by));
  lines.push(line('Primary language', c.primary_language));
  lines.push(line('Communication type', c.communication_type));
  lines.push(line('IQ level', c.iq_level));
  lines.push(line('Developmental age', c.developmental_age));
  lines.push(line('Sensory sensitivity', c.sensory_sensitivity));
  lines.push(line('Behavioral notes', c.behavioral_notes));
  lines.push(line('Medical conditions', c.medical_conditions));
  lines.push(line('Medications', c.medications));
  lines.push(line('Allergies', c.allergies));
  lines.push(line('Therapy start date', c.therapy_start_date));
  lines.push(line('Therapy status', c.therapy_status));
  lines.push(line('Sessions per week', c.sessions_per_week));
  lines.push(line('Communication score', c.communication_score));
  lines.push(line('Social score', c.social_score));
  lines.push(line('Behavioral score', c.behavioral_score));
  lines.push(line('Cognitive score', c.cognitive_score));
  lines.push(line('Motor skill score', c.motor_skill_score));
  lines.push(line('General notes', c.notes));
  return lines.filter(Boolean).join('\n');
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

  const embedding = await embeddingService.generateEmbedding(trimmedQuestion);
  const notes = await vectorSearchService.findRelevantNotes(childId, embedding, topK);
  const context = notes.length > 0 ? notes.join('\n\n---\n\n') : '';

  const answer = await ollamaService.askLLM(trimmedQuestion, context, {
    childProfile: childProfile || undefined,
  });
  return answer;
}
