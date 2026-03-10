import { Request, Response } from 'express';
import * as authService from './auth.service';
import { signToken } from './auth.service';
import * as childrenService from '../children/children.service';
import * as sessionsService from '../sessions/sessions.service';
import * as notificationsEmit from '../notifications/notifications.emit';
import * as auditService from '../audit/audit.service';
import * as appointmentsService from '../appointments/appointments.service';

export async function listTherapists(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const search = (req.query.q as string)?.trim() || undefined;
  const { users, total } = await authService.findUsers({
    role: 'therapist',
    limit,
    offset,
    search,
  });
  const isParent = req.user!.role === 'parent';
  res.json({
    users: users.map((u) => {
      const base: Record<string, unknown> = { id: u.id, email: u.email, fullName: u.full_name, role: u.role, title: u.title };
      if (!isParent || u.show_mobile_to_parents) base.mobileNumber = u.mobile_number ?? undefined;
      else base.mobileNumber = undefined;
      return base;
    }),
    total,
    limit,
    offset,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, fullName, role } = req.body as {
    email: string;
    password: string;
    fullName: string;
    role: string;
  };
  const existing = await authService.findUserByEmail(email);
  if (existing) {
    // If the email belongs to a user that is not currently active (disabled or soft-deleted), reactivate that account instead of failing.
    if (!existing.is_active || existing.deleted_at || existing.disabled_at) {
      await authService.reactivateUserForSignup(existing.id);
      await auditService
        .log({
          action: 'user_reactivated_via_signup',
          userId: existing.id,
          adminId: null,
          details: { email: existing.email },
        })
        .catch((err) => console.error('[audit] user_reactivated_via_signup failed:', err));

      res.status(200).json({
        user: {
          id: existing.id,
          email: existing.email,
          fullName: existing.full_name,
          role: existing.role,
          title: existing.title,
        },
        message:
          'We found an existing account for this email and are reactivating it. You can sign in once your account is approved.',
      });
      return;
    }
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const user = await authService.createUser(email, password, fullName, role, undefined, false);
  notificationsEmit.notifyAdminsOfSignupRequest({
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  }).catch((err) => console.error('[notifications] notifyAdminsOfSignupRequest failed:', err));
  res.status(201).json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
    message: 'Account created. You cannot sign in until an admin approves your account.',
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await authService.findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (user.deleted_at) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (user.disabled_at) {
    res.status(403).json({ error: 'Your account has been disabled. Contact support.' });
    return;
  }
  const valid = await authService.verifyPassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  // Admin accounts can always sign in; others require approval
  if (!user.approved_at && user.role !== 'admin') {
    res.status(403).json({ error: 'Account pending approval. An admin must approve your account before you can sign in.' });
    return;
  }
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const fullUser = await authService.findUserById(user.id);
  const u = fullUser ?? user;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      title: u.title,
      mobileNumber: u.mobile_number ?? undefined,
      showMobileToParents: u.role === 'therapist' ? u.show_mobile_to_parents : undefined,
    },
    token,
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const user = await authService.findUserById(req.user.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      title: user.title,
      mobileNumber: user.mobile_number ?? undefined,
      showMobileToParents: user.role === 'therapist' ? user.show_mobile_to_parents : undefined,
    },
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { fullName, password, currentPassword, mobileNumber, showMobileToParents } = req.body as {
    fullName?: string;
    password?: string;
    currentPassword?: string;
    mobileNumber?: string | null;
    showMobileToParents?: boolean;
  };
  const newPassword = password && password.length > 0 ? password : undefined;
  if (newPassword && req.user.role !== 'admin') {
    if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.length === 0) {
      res.status(400).json({ error: 'Current password is required to set a new password' });
      return;
    }
    const valid = await authService.verifyUserPassword(req.user.userId, currentPassword);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
  }
  const updates: Parameters<typeof authService.updateUser>[1] = {
    fullName: fullName?.trim(),
    password: newPassword,
  };
  if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber === '' ? null : (mobileNumber as string)?.trim() || null;
  if (req.user.role === 'therapist' && showMobileToParents !== undefined) updates.showMobileToParents = showMobileToParents === true;
  const updated = await authService.updateUser(req.user.userId, updates);
  if (!updated) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
      title: updated.title,
      mobileNumber: updated.mobile_number ?? undefined,
      showMobileToParents: updated.role === 'therapist' ? updated.show_mobile_to_parents : undefined,
    },
  });
}

/** Dashboard counts for therapist/parent: children count and sessions count (role-specific). */
export async function getDashboardCounts(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { userId, role } = req.user;
  const { total: children } = await childrenService.findByUserId(userId, role, { limit: 1, offset: 0 });
  let sessions = 0;
  if (role === 'therapist') {
    sessions = await sessionsService.countByTherapistId(userId);
  } else if (role === 'parent') {
    sessions = await sessionsService.countForParentUserId(userId);
  }

  // Appointment counts
  const totalAppointments = await appointmentsService.count(
    role === 'therapist' ? { therapistId: userId } : { parentId: userId }
  );
  const pendingAppointments = await appointmentsService.count({
    status: 'pending',
    ...(role === 'therapist' ? { therapistId: userId } : { parentId: userId })
  });

  res.json({ children, sessions, totalAppointments, pendingAppointments });
}
