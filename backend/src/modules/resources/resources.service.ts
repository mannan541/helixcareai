import { query, queryOne } from '../../config/database';
import { deleteStoredFile } from '../../lib/fileStorage';
import * as childrenService from '../children/children.service';

export const RESOURCE_CATEGORIES = [
  'pdf',
  'worksheet',
  'visual_schedule',
  'flashcard',
  'social_story',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export type TherapyResourceRow = {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  file_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  content: string | null;
  tags: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ResourceWithCreator = TherapyResourceRow & {
  creator_name: string | null;
};

export type ChildAssignmentRow = {
  id: string;
  child_id: string;
  resource_id: string;
  assigned_by: string | null;
  notes: string | null;
  assigned_at: string;
};

export type AssignedResourceRow = TherapyResourceRow & {
  assignment_id: string;
  assignment_notes: string | null;
  assigned_at: string;
  assigner_name: string | null;
};

const MAX_DATA_URL_LENGTH = 7_000_000; // legacy inline uploads only

function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}

export function isValidCategory(c: string): c is ResourceCategory {
  return (RESOURCE_CATEGORIES as readonly string[]).includes(c);
}

export async function listResources(filters: {
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ rows: ResourceWithCreator[]; total: number }> {
  const params: unknown[] = [];
  const where: string[] = [];

  if (filters.category && isValidCategory(filters.category)) {
    params.push(filters.category);
    where.push(`r.category = $${params.length}`);
  }
  if (filters.q?.trim()) {
    params.push(`%${filters.q.trim()}%`);
    where.push(`(r.title ILIKE $${params.length} OR r.description ILIKE $${params.length})`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM therapy_resources r ${whereSql}`,
    params
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  params.push(limit, offset);

  const rows = await query<ResourceWithCreator>(
    `SELECT r.*, u.full_name AS creator_name
     FROM therapy_resources r
     LEFT JOIN users u ON r.created_by = u.id
     ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows, total };
}

export async function findById(id: string): Promise<ResourceWithCreator | null> {
  const rows = await query<ResourceWithCreator>(
    `SELECT r.*, u.full_name AS creator_name
     FROM therapy_resources r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function create(
  userId: string,
  data: {
    title: string;
    description?: string;
    category: ResourceCategory;
    fileUrl?: string;
    fileName?: string;
    mimeType?: string;
    content?: string;
    tags?: string[];
  }
): Promise<TherapyResourceRow> {
  if (data.fileUrl && isDataUrl(data.fileUrl) && data.fileUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('File is too large. Maximum upload size is 4 MB.');
  }
  if (!data.fileUrl?.trim() && !data.content?.trim()) {
    throw new Error('Provide a file upload or text content for this resource.');
  }

  const rows = await query<TherapyResourceRow>(
    `INSERT INTO therapy_resources
       (title, description, category, file_url, file_name, mime_type, content, tags, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.title.trim(),
      data.description?.trim() ?? null,
      data.category,
      data.fileUrl?.trim() ?? null,
      data.fileName?.trim() ?? null,
      data.mimeType?.trim() ?? null,
      data.content?.trim() ?? null,
      data.tags?.length ? data.tags : null,
      userId,
    ]
  );
  return rows[0];
}

export async function update(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    category: ResourceCategory;
    fileUrl: string;
    fileName: string;
    mimeType: string;
    content: string;
    tags: string[];
  }>
): Promise<TherapyResourceRow | null> {
  const existing = await queryOne<TherapyResourceRow>('SELECT * FROM therapy_resources WHERE id = $1', [id]);
  if (!existing) return null;

  if (data.fileUrl && isDataUrl(data.fileUrl) && data.fileUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error('File is too large. Maximum upload size is 4 MB.');
  }

  const rows = await query<TherapyResourceRow>(
    `UPDATE therapy_resources SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       category = COALESCE($4, category),
       file_url = COALESCE($5, file_url),
       file_name = COALESCE($6, file_name),
       mime_type = COALESCE($7, mime_type),
       content = COALESCE($8, content),
       tags = COALESCE($9, tags),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      data.title?.trim(),
      data.description?.trim(),
      data.category,
      data.fileUrl,
      data.fileName,
      data.mimeType,
      data.content,
      data.tags,
    ]
  );
  return rows[0] ?? null;
}

export async function remove(id: string): Promise<boolean> {
  const existing = await queryOne<{ file_url: string | null }>(
    'SELECT file_url FROM therapy_resources WHERE id = $1',
    [id]
  );
  const result = await query('DELETE FROM therapy_resources WHERE id = $1 RETURNING id', [id]);
  if (result.length > 0 && existing?.file_url) {
    await deleteStoredFile(existing.file_url);
  }
  return result.length > 0;
}

export async function assignToChild(
  resourceId: string,
  childId: string,
  userId: string,
  role: string,
  notes?: string
): Promise<ChildAssignmentRow | null> {
  if (role !== 'admin' && role !== 'therapist') return null;
  const resource = await findById(resourceId);
  if (!resource) return null;

  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  const rows = await query<ChildAssignmentRow>(
    `INSERT INTO child_resource_assignments (child_id, resource_id, assigned_by, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (child_id, resource_id) DO UPDATE SET notes = EXCLUDED.notes, assigned_at = NOW(), assigned_by = EXCLUDED.assigned_by
     RETURNING *`,
    [childId, resourceId, userId, notes?.trim() ?? null]
  );
  return rows[0] ?? null;
}

export async function unassign(assignmentId: string, userId: string, role: string): Promise<boolean> {
  if (role !== 'admin' && role !== 'therapist') return false;
  const row = await queryOne<ChildAssignmentRow>(
    'SELECT * FROM child_resource_assignments WHERE id = $1',
    [assignmentId]
  );
  if (!row) return false;
  const child = await childrenService.findById(row.child_id);
  if (!child) return false;
  if (role !== 'admin' && !childrenService.canAccessChild(child.user_id, userId, role)) return false;
  const result = await query('DELETE FROM child_resource_assignments WHERE id = $1 RETURNING id', [assignmentId]);
  return result.length > 0;
}

export async function listForChild(
  childId: string,
  userId: string,
  role: string
): Promise<AssignedResourceRow[] | null> {
  const child = await childrenService.findById(childId);
  if (!child) return null;
  if (!childrenService.canAccessChild(child.user_id, userId, role)) return null;

  return query<AssignedResourceRow>(
    `SELECT r.*, a.id AS assignment_id, a.notes AS assignment_notes, a.assigned_at,
            u.full_name AS assigner_name
     FROM child_resource_assignments a
     JOIN therapy_resources r ON r.id = a.resource_id
     LEFT JOIN users u ON a.assigned_by = u.id
     WHERE a.child_id = $1
     ORDER BY a.assigned_at DESC`,
    [childId]
  );
}

export async function listAssignmentsForResource(resourceId: string): Promise<
  Array<{
    id: string;
    child_id: string;
    child_first_name: string;
    child_last_name: string;
    assigned_at: string;
    notes: string | null;
  }>
> {
  return query(
    `SELECT a.id, a.child_id, c.first_name AS child_first_name, c.last_name AS child_last_name,
            a.assigned_at, a.notes
     FROM child_resource_assignments a
     JOIN children c ON c.id = a.child_id
     WHERE a.resource_id = $1
     ORDER BY a.assigned_at DESC`,
    [resourceId]
  );
}
