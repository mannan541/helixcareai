import { Request, Response } from 'express';
import * as authService from '../auth/auth.service';
import * as childrenService from '../children/children.service';

const DEFAULT_PASSWORD = '12345678';

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
  const titleToSet = role === 'therapist' ? (title ?? null) : null;
  const user = await authService.createUser(email, DEFAULT_PASSWORD, fullName, role, titleToSet);
  if (role === 'parent' && childIds && Array.isArray(childIds) && childIds.length > 0) {
    await childrenService.assignChildrenToUser(childIds, user.id);
  }
  res.status(201).json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
    message: 'User created with default password 12345678',
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
