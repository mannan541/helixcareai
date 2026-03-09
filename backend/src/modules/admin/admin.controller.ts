import { Request, Response } from 'express';
import { queryOne } from '../../config/database';
import * as authService from '../auth/auth.service';
import * as auditService from '../audit/audit.service';
import * as childrenService from '../children/children.service';

const DEFAULT_PASSWORD = '12345678';

export async function getDashboardCounts(req: Request, res: Response): Promise<void> {
  const row = await queryOne<{
    children: string;
    therapists: string;
    parents: string;
    admins: string;
    total_users: string;
    pending_users: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM children WHERE deleted_at IS NULL) AS children,
      (SELECT COUNT(*)::text FROM users WHERE role = 'therapist' AND deleted_at IS NULL) AS therapists,
      (SELECT COUNT(*)::text FROM users WHERE role = 'parent' AND deleted_at IS NULL) AS parents,
      (SELECT COUNT(*)::text FROM users WHERE role = 'admin' AND deleted_at IS NULL) AS admins,
      (SELECT COUNT(*)::text FROM users WHERE deleted_at IS NULL) AS total_users,
      (SELECT COUNT(*)::text FROM users WHERE deleted_at IS NULL AND approved_at IS NULL) AS pending_users`
  );
  if (!row) {
    res.json({ children: 0, therapists: 0, parents: 0, admins: 0, totalUsers: 0, pendingUsers: 0 });
    return;
  }
  res.json({
    children: parseInt(row.children, 10) || 0,
    therapists: parseInt(row.therapists, 10) || 0,
    parents: parseInt(row.parents, 10) || 0,
    admins: parseInt(row.admins, 10) || 0,
    totalUsers: parseInt(row.total_users, 10) || 0,
    pendingUsers: parseInt(row.pending_users, 10) || 0,
  });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const { email, fullName, role, title, childIds } = req.body as {
    email: string;
    fullName: string;
    role: string;
    title?: string | null;
    childIds?: string[];
  };
  if (!['therapist', 'parent'].includes(role)) {
    res.status(400).json({ error: 'Role must be therapist or parent' });
    return;
  }
  const existing = await authService.findUserByEmail(email);
  if (existing) {
    // If this email belongs to a user that is not currently active (disabled or soft-deleted), reactivate them instead of failing.
    if (!existing.is_active || existing.deleted_at || existing.disabled_at) {
      await authService.reactivateUserForSignup(existing.id);
      // Ensure the account is approved so they can sign in immediately.
      if (!existing.approved_at) {
        await authService.approveUser(existing.id);
      }
      if (role === 'parent' && childIds && Array.isArray(childIds) && childIds.length > 0) {
        await childrenService.assignChildrenToUser(childIds, existing.id);
      }
      await auditService
        .log({
          action: 'user_reactivated_by_admin',
          userId: existing.id,
          adminId: req.user!.userId,
          details: { email: existing.email, fullName: existing.full_name, role: existing.role },
        })
        .catch((err) => console.error('[audit] user_reactivated_by_admin failed:', err));

      res.status(200).json({
        user: { id: existing.id, email: existing.email, fullName: existing.full_name, role: existing.role, title: existing.title },
        message: 'Existing account for this email was reactivated. The user can sign in again.',
      });
      return;
    }
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const titleToSet = (role === 'therapist' || role === 'parent') ? (title ?? null) : null;
  const user = await authService.createUser(email, DEFAULT_PASSWORD, fullName, role, titleToSet, true);
  if (role === 'parent' && childIds && Array.isArray(childIds) && childIds.length > 0) {
    await childrenService.assignChildrenToUser(childIds, user.id);
  }
  res.status(201).json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
    message: 'User created with default password 12345678. They can sign in immediately (no approval required).',
  });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const toIsoOrString = (v: string | Date | null | undefined): string | null =>
    v == null ? null : (v as unknown) instanceof Date ? (v as Date).toISOString() : String(v);
  const payload: { id: string; email: string; fullName: string; role: string; title: string | null; approvedAt?: string | null; disabledAt?: string | null; childIds?: string[]; mobileNumber?: string | null; showMobileToParents?: boolean } = {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    title: user.title,
    approvedAt: toIsoOrString(user.approved_at),
    disabledAt: toIsoOrString(user.disabled_at),
    mobileNumber: user.mobile_number ?? undefined,
    showMobileToParents: user.role === 'therapist' ? user.show_mobile_to_parents : undefined,
  };
  if (user.role === 'parent') {
    payload.childIds = await childrenService.getChildIdsByUserId(id);
  }
  res.json({ user: payload });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { fullName, title, password, childIds, mobileNumber, showMobileToParents } = req.body as {
    fullName?: string;
    title?: string | null;
    password?: string;
    childIds?: string[];
    mobileNumber?: string | null;
    showMobileToParents?: boolean;
  };
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updateData: Parameters<typeof authService.updateUser>[1] = {
    fullName: fullName?.trim(),
    title: title !== undefined ? (title === null || title === '' ? null : String(title).trim()) : undefined,
    password: password && password.length > 0 ? password : undefined,
  };
  if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber === null || mobileNumber === '' ? null : String(mobileNumber).trim() || null;
  if (user.role === 'therapist' && showMobileToParents !== undefined) updateData.showMobileToParents = showMobileToParents === true;
  const updated = await authService.updateUser(id, updateData);
  const userToReturn = updated ?? user;
  if (!updated && !(user.role === 'parent' && childIds !== undefined && Array.isArray(childIds))) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  if (userToReturn.role === 'parent' && childIds !== undefined && Array.isArray(childIds)) {
    const validIds = childIds.filter((c): c is string => typeof c === 'string' && /^[0-9a-f-]{36}$/i.test(c));
    await childrenService.setParentChildren(userToReturn.id, validIds);
  }
  res.json({
    user: {
      id: userToReturn.id,
      email: userToReturn.email,
      fullName: userToReturn.full_name,
      role: userToReturn.role,
      title: userToReturn.title,
      mobileNumber: userToReturn.mobile_number ?? undefined,
      showMobileToParents: userToReturn.role === 'therapist' ? userToReturn.show_mobile_to_parents : undefined,
    },
  });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const role = req.query.role as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const search = (req.query.q as string)?.trim() || undefined;
  const pending = req.query.pending === 'true' || req.query.pending === '1';
  const archived = req.query.archived === 'true' || req.query.archived === '1';
  const sortBy = (req.query.sortBy as string)?.trim() || undefined;
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' as const : 'asc' as const;
  const toIsoOrString = (v: string | Date | null | undefined): string | null =>
    v == null ? null : (v as unknown) instanceof Date ? (v as Date).toISOString() : String(v);
  const { users, total } = archived
    ? await authService.findUsersArchived({ role, limit, offset, search, sortBy, sortOrder })
    : await authService.findUsers({ role, limit, offset, search, approved: pending ? false : undefined, sortBy, sortOrder });
  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      title: u.title,
      approvedAt: toIsoOrString(u.approved_at),
      disabledAt: toIsoOrString(u.disabled_at),
      deletedAt: toIsoOrString(u.deleted_at),
      mobileNumber: u.mobile_number ?? undefined,
      showMobileToParents: u.role === 'therapist' ? u.show_mobile_to_parents : undefined,
    })),
    total,
    limit,
    offset,
  });
}

export async function disableUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  if (id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot disable your own account' });
    return;
  }
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updated = await authService.disableUser(id);
  if (!updated) {
    res.status(400).json({ error: 'User is already disabled or not found' });
    return;
  }
  await auditService.log({
    action: 'user_disabled',
    userId: id,
    adminId: req.user!.userId,
    details: { email: user.email, fullName: user.full_name, role: user.role },
  }).catch((err) => console.error('[audit] log user_disabled failed:', err));
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title, disabledAt: new Date().toISOString() },
    message: 'User disabled. They cannot sign in and will be logged out on next request.',
  });
}

export async function enableUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const user = await authService.findUserByIdIncludingDeleted(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (user.deleted_at) {
    await authService.reactivateUserForSignup(id);
    await authService.approveUser(id);
    await auditService
      .log({
        action: 'user_reactivated_by_admin',
        userId: id,
        adminId: req.user!.userId,
        details: { email: user.email, fullName: user.full_name, role: user.role },
      })
      .catch((err) => console.error('[audit] user_reactivated_by_admin failed:', err));
    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title, disabledAt: null, deletedAt: null },
      message: 'User reactivated. They can sign in again.',
    });
    return;
  }
  if (user.disabled_at) {
    const updated = await authService.enableUser(id);
    if (!updated) {
      res.status(400).json({ error: 'User is not disabled or not found' });
      return;
    }
    res.json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title, disabledAt: null },
      message: 'User re-enabled. They can sign in again.',
    });
    return;
  }
  res.status(400).json({ error: 'User is not disabled or deleted' });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  if (id === req.user!.userId) {
    res.status(400).json({ error: 'You cannot delete your own account' });
    return;
  }
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updated = await authService.deleteUser(id, req.user!.userId);
  if (!updated) {
    res.status(400).json({ error: 'User not found or already deleted' });
    return;
  }
  await auditService.log({
    action: 'user_deleted',
    userId: id,
    adminId: req.user!.userId,
    details: { email: user.email, fullName: user.full_name, role: user.role },
  }).catch((err) => console.error('[audit] log user_deleted failed:', err));
  res.json({
    message: 'User deleted. They cannot sign in and will be logged out on next request.',
  });
}

export async function approveUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updated = await authService.approveUser(id);
  if (!updated) {
    res.status(400).json({ error: 'User is already approved or not found' });
    return;
  }
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
    message: 'User approved. They can now sign in.',
  });
}
