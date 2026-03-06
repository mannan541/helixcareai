import { Request, Response } from 'express';
import * as authService from './auth.service';
import { signToken } from './auth.service';

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
  res.json({
    users: users.map((u) => ({ id: u.id, email: u.email, fullName: u.full_name, role: u.role, title: u.title })),
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
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const user = await authService.createUser(email, password, fullName, role);
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  res.status(201).json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title }, token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await authService.findUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const valid = await authService.verifyPassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  res.json({
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title },
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
  res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, title: user.title } });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { fullName, password } = req.body as { fullName?: string; password?: string };
  const updated = await authService.updateUser(req.user.userId, {
    fullName: fullName?.trim(),
    password: password && password.length > 0 ? password : undefined,
  });
  if (!updated) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }
  res.json({ user: { id: updated.id, email: updated.email, fullName: updated.full_name, role: updated.role, title: updated.title } });
}
