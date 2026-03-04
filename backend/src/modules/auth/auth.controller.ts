import { Request, Response } from 'express';
import * as authService from './auth.service';
import { signToken } from './auth.service';

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
  res.status(201).json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role }, token });
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
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
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
  res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
}
