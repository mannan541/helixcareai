import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import * as authService from '../modules/auth/auth.service';

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const canAccess = await authService.userCanAccess(decoded.userId);
    if (!canAccess) {
      res.status(401).json({ error: 'Account is disabled or deleted. You have been logged out.' });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), env.JWT_SECRET) as JwtPayload;
      req.user = decoded;
    } catch {
      // ignore
    }
  }
  next();
}
