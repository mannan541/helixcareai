import { Request, Response } from 'express';
import { queryOne } from '../../config/database';
import * as authService from '../auth/auth.service';
import * as childrenService from '../children/children.service';

const DEFAULT_PASSWORD = '12345678';

export async function getDashboardCounts(req: Request, res: Response): Promise<void> {
  const row = await queryOne<{
    children: string;
    therapists: string;
    parents: string;
    admins: string;
    total_users: string;
  }>(
    `SELECT
      (SELECT COUNT(*)::text FROM children WHERE deleted_at IS NULL) AS children,
      (SELECT COUNT(*)::text FROM users WHERE role = 'therapist' AND deleted_at IS NULL) AS therapists,
      (SELECT COUNT(*)::text FROM users WHERE role = 'parent' AND deleted_at IS NULL) AS parents,
      (SELECT COUNT(*)::text FROM users WHERE role = 'admin' AND deleted_at IS NULL) AS admins,
      (SELECT COUNT(*)::text FROM users WHERE deleted_at IS NULL) AS total_users`
  );
  if (!row) {
    res.json({ children: 0, therapists: 0, parents: 0, admins: 0, totalUsers: 0 });
    return;
  }
  res.json({
    children: parseInt(row.children, 10) || 0,
    therapists: parseInt(row.therapists, 10) || 0,
    parents: parseInt(row.parents, 10) || 0,
    admins: parseInt(row.admins, 10) || 0,
    totalUsers: parseInt(row.total_users, 10) || 0,
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
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const titleToSet = (role === 'therapist' || role === 'parent') ? (title ?? null) : null;
  const user = await authService.createUser(email, DEFAULT_PASSWORD, fullName, role, titleToSet);
  if (role === 'parent' && childIds && Array.isArray(childIds) && childIds.length > 0) {
    await childrenService.assignChildrenToUser(childIds, user.id);
  }
  res.status(201).json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
    message: 'User created with default password 12345678',
  });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { fullName, title, password } = req.body as { fullName?: string; title?: string | null; password?: string };
  const user = await authService.findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const updated = await authService.updateUser(id, {
    fullName: fullName?.trim(),
    title: title !== undefined ? (title === null || title === '' ? null : String(title).trim()) : undefined,
    password: password && password.length > 0 ? password : undefined,
  });
  if (!updated) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  res.json({
    user: { id: updated.id, email: updated.email, fullName: updated.full_name, role: updated.role, title: updated.title },
  });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const role = req.query.role as string | undefined;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
  const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
  const search = (req.query.q as string)?.trim() || undefined;
  const { users, total } = await authService.findUsers({ role, limit, offset, search });
  res.json({
    users: users.map((u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, title: u.title })),
    total,
    limit,
    offset,
  });
}
