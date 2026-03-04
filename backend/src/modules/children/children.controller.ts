import { Request, Response } from 'express';
import * as childrenService from './children.service';

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const children = await childrenService.findByUserId(req.user.userId, req.user.role);
  res.json({
    children: children.map((c) => ({
      id: c.id,
      userId: c.user_id,
      firstName: c.first_name,
      lastName: c.last_name,
      dateOfBirth: c.date_of_birth,
      notes: c.notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  res.json({
    child: {
      id: child.id,
      userId: child.user_id,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: child.date_of_birth,
      notes: child.notes,
      createdAt: child.created_at,
      updatedAt: child.updated_at,
    },
  });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { firstName, lastName, dateOfBirth, notes } = req.body;
  const child = await childrenService.create(req.user.userId, {
    firstName,
    lastName,
    dateOfBirth,
    notes,
  });
  res.status(201).json({
    child: {
      id: child.id,
      userId: child.user_id,
      firstName: child.first_name,
      lastName: child.last_name,
      dateOfBirth: child.date_of_birth,
      notes: child.notes,
      createdAt: child.created_at,
      updatedAt: child.updated_at,
    },
  });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  const { firstName, lastName, dateOfBirth, notes } = req.body;
  const updated = await childrenService.update(id, {
    firstName,
    lastName,
    dateOfBirth,
    notes,
  });
  if (!updated) {
    res.status(500).json({ error: 'Update failed' });
    return;
  }
  res.json({
    child: {
      id: updated.id,
      userId: updated.user_id,
      firstName: updated.first_name,
      lastName: updated.last_name,
      dateOfBirth: updated.date_of_birth,
      notes: updated.notes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const child = await childrenService.findById(id);
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  if (!childrenService.canAccessChild(child.user_id, req.user!.userId, req.user!.role)) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }
  await childrenService.remove(id);
  res.status(204).send();
}
