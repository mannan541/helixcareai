import { useEffect, useState } from 'react';
import { listNotifications, markAllRead, markRead } from '../api/notifications';
import type { AppNotification } from '../api/types';
import { errorMessage } from '../api/client';
import { Card, Spinner, ErrorMessage, EmptyState, PageTitle, btnSecondary } from '../components/ui';
import BackButton from '../components/BackButton';
import { formatDateTime } from '../utils/format';

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async (unread = unreadOnly) => {
    setLoading(true);
    setError('');
    try {
      const { notifications } = await listNotifications({ unreadOnly: unread });
      setItems(notifications);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMarkAll = async () => {
    await markAllRead();
    load();
  };

  return (
    <div>
      <PageTitle
        back={<BackButton />}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  load(e.target.checked);
                }}
              />
              Unread only
            </label>
            <button className={btnSecondary} onClick={onMarkAll}>
              Mark all read
            </button>
          </>
        }
      >
        Notifications
      </PageTitle>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => load()} />
      ) : items.length === 0 ? (
        <EmptyState>No notifications</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition hover:shadow ${n.readAt ? 'opacity-70' : 'border-primary/40'}`}
            >
              <button
                className="block w-full text-left"
                onClick={async () => {
                  if (!n.readAt) {
                    try {
                      await markRead(n.id);
                      setItems((prev) =>
                        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
                      );
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {!n.readAt && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />}
                      {n.title}
                    </p>
                    {n.body && <p className="mt-1 text-sm text-slate-600">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
