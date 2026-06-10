import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { chatAsk, chatHistory } from '../api/chat';
import { listChildren } from '../api/children';
import type { ChatMessage, Child } from '../api/types';
import { errorMessage } from '../api/client';
import { Spinner, ErrorMessage, inputCls, btnPrimary } from '../components/ui';
import BackButton from '../components/BackButton';

export default function ChatPage() {
  const { childId: routeChildId } = useParams<{ childId?: string }>();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(routeChildId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!routeChildId) {
      listChildren()
        .then(({ children: rows }) => setChildren(rows))
        .catch(() => {});
    }
  }, [routeChildId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    chatHistory(selectedChildId)
      .then(setMessages)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [selectedChildId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || sending) return;
    setQuestion('');
    setError('');
    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const answer = await chatAsk(selectedChildId, q);
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}-a`, role: 'assistant', content: answer, createdAt: new Date().toISOString() },
      ]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {routeChildId && <BackButton fallback={`/children/${routeChildId}`} />}
          <h1 className="text-xl font-bold sm:text-2xl">AI Assistant</h1>
        </div>
        {!routeChildId && (
          <select
            className={`${inputCls} max-w-xs`}
            value={selectedChildId ?? ''}
            onChange={(e) => setSelectedChildId(e.target.value || null)}
          >
            <option value="">All children (global)</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        )}
        {routeChildId && selectedChild && (
          <span className="text-sm text-slate-500">
            About {selectedChild.firstName} {selectedChild.lastName}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <Spinner />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            <span className="text-4xl">💬</span>
            <p className="mt-2 text-sm">
              Ask about therapy progress, session activities, attendance, or recommendations.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-white'
                      : 'rounded-bl-sm bg-slate-100 text-slate-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm text-slate-400">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <div className="mt-2"><ErrorMessage error={error} /></div>}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Ask a question…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className={btnPrimary} disabled={sending || !question.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
