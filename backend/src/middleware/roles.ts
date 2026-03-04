import { Request, Response, NextFunction } from 'express';

const ROLES = ['admin', 'therapist', 'parent'] as const;
export type Role = (typeof ROLES)[number];

export function requireRoles(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (allowed.includes(req.user.role as Role)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRoles('admin')(req, res, next);
}
