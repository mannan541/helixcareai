import * as authService from '../auth/auth.service';
import * as childrenService from '../children/children.service';
import * as sessionsService from '../sessions/sessions.service';
import * as notificationsService from './notifications.service';

/** Call after a new user registers (pending approval). Notifies all admins. */
export async function notifyAdminsOfSignupRequest(data: {
  email: string;
  fullName: string;
  role: string;
}): Promise<void> {
  const adminIds = await authService.getAdminUserIds();
  if (adminIds.length === 0) return;
  const title = 'New account approval requested';
  const body = `${data.fullName} (${data.email}) has requested access as ${data.role}. Please approve or reject in Pending approvals.`;
  await notificationsService.createForUsers(
    adminIds,
    'signup_pending_approval',
    title,
    body,
    { email: data.email, fullName: data.fullName, role: data.role }
  );
}

/** Call after a session is created. Notifies parent; if created by admin, also notifies therapist. */
export async function notifySessionLogged(data: {
  sessionId: string;
  childId: string;
  childName: string;
  sessionDate: string;
  createdByUserId: string;
  createdByRole: string;
  therapistId: string | null;
}): Promise<void> {
  const child = await childrenService.findById(data.childId);
  if (!child) return;

  const sessionTitle = `New session logged for ${data.childName}`;
  const sessionBody = `A session was logged for ${data.childName} on ${data.sessionDate}.`;
  const meta = { sessionId: data.sessionId, childId: data.childId, sessionDate: data.sessionDate };

  // Notify parent (child owner)
  await notificationsService.create(
    child.user_id,
    'session_logged_for_parent',
    sessionTitle,
    sessionBody,
    meta
  );

  // If admin logged the session and a therapist is assigned, notify therapist
  if (data.createdByRole === 'admin' && data.therapistId && data.therapistId !== child.user_id) {
    await notificationsService.create(
      data.therapistId,
      'session_logged_by_admin',
      'Admin logged a session',
      `An admin has logged a session for ${data.childName} on ${data.sessionDate}.`,
      meta
    );
  }
}

/** Call when a parent adds a note/comment on a session. Notifies the session's therapist and all admins. */
export async function notifyParentCommentOnSession(data: {
  sessionId: string;
  parentName: string;
  commentSnippet: string;
}): Promise<void> {
  const session = await sessionsService.findById(data.sessionId);
  if (!session) return;

  const child = await childrenService.findById(session.child_id);
  const childName = child ? `${child.first_name} ${child.last_name}`.trim() || 'Child' : 'Child';
  const title = 'Parent added a note on a session';
  const body = `${data.parentName} added a note on the session for ${childName}: "${data.commentSnippet.slice(0, 100)}${data.commentSnippet.length > 100 ? '…' : ''}"`;

  // Notify the session's therapist (if any and not the same as parent)
  if (session.therapist_id) {
    await notificationsService.create(
      session.therapist_id,
      'parent_comment_on_session',
      title,
      body,
      { sessionId: data.sessionId, childId: session.child_id }
    );
  }

  // Notify all admins (skip therapist if already notified above so they don't get two)
  const adminIds = await authService.getAdminUserIds();
  const adminIdsToNotify = session.therapist_id
    ? adminIds.filter((uid) => uid !== session.therapist_id)
    : adminIds;
  if (adminIdsToNotify.length > 0) {
    await notificationsService.createForUsers(
      adminIdsToNotify,
      'parent_comment_on_session',
      title,
      body,
      { sessionId: data.sessionId, childId: session.child_id }
    );
  }
}

/** Call when a therapist or admin adds a note/comment on a session. Notifies the child's parent. */
export async function notifyStaffCommentOnSession(data: {
  sessionId: string;
  authorName: string;
  authorRole: 'therapist' | 'admin';
  commentSnippet: string;
}): Promise<void> {
  const session = await sessionsService.findById(data.sessionId);
  if (!session) return;

  const child = await childrenService.findById(session.child_id);
  if (!child) return;

  const childName = `${child.first_name} ${child.last_name}`.trim() || 'your child';
  const title = data.authorRole === 'admin' ? 'Admin added a note on a session' : 'Therapist added a note on a session';
  const body = `${data.authorName} added a note on the session for ${childName}: "${data.commentSnippet.slice(0, 100)}${data.commentSnippet.length > 100 ? '…' : ''}"`;

  await notificationsService.create(
    child.user_id,
    'staff_comment_on_session',
    title,
    body,
    { sessionId: data.sessionId, childId: session.child_id }
  );
}
