import { api } from './client';

export type ResourceCategory =
  | 'pdf'
  | 'worksheet'
  | 'visual_schedule'
  | 'flashcard'
  | 'social_story';

export type TherapyResource = {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  fileUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  content: string | null;
  hasFile?: boolean;
  tags: string[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  creatorName?: string | null;
  assignmentId?: string;
  assignmentNotes?: string | null;
  assignedAt?: string;
  assignerName?: string | null;
};

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  pdf: 'PDFs',
  worksheet: 'Worksheets',
  visual_schedule: 'Visual Schedules',
  flashcard: 'Flashcards',
  social_story: 'Social Stories',
};

export const CATEGORY_ICONS: Record<ResourceCategory, string> = {
  pdf: '📕',
  worksheet: '📄',
  visual_schedule: '📆',
  flashcard: '🃏',
  social_story: '📖',
};

export async function listResourceCategories(): Promise<{ id: ResourceCategory; label: string }[]> {
  const { data } = await api.get<{ categories: { id: ResourceCategory; label: string }[] }>(
    '/api/resources/categories'
  );
  return data.categories;
}

export async function listResources(params?: {
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ resources: TherapyResource[]; total: number }> {
  const { data } = await api.get<{ resources: TherapyResource[]; total: number }>('/api/resources', { params });
  return data;
}

export async function getResource(id: string): Promise<{
  resource: TherapyResource;
  assignments: { id: string; childId: string; childName: string; assignedAt: string; notes: string | null }[];
}> {
  const { data } = await api.get(`/api/resources/${id}`);
  return data;
}

export async function createResource(input: {
  title: string;
  description?: string;
  category: ResourceCategory;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  content?: string;
  tags?: string[];
}): Promise<TherapyResource> {
  const { data } = await api.post<{ resource: TherapyResource }>('/api/resources', input);
  return data.resource;
}

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function createResourceWithFile(
  input: {
    title: string;
    description?: string;
    category: ResourceCategory;
    content?: string;
  },
  file?: File | null
): Promise<TherapyResource> {
  if (file && file.size > MAX_FILE_BYTES) {
    throw new Error('File is too large. Maximum upload size is 4 MB.');
  }
  if (!file && !input.content?.trim()) {
    throw new Error('Provide a file upload or text content for this resource.');
  }
  if (file) {
    const form = new FormData();
    form.append('title', input.title);
    form.append('category', input.category);
    if (input.description) form.append('description', input.description);
    if (input.content?.trim()) form.append('content', input.content.trim());
    form.append('file', file);
    const { data } = await api.post<{ resource: TherapyResource }>('/api/resources/upload', form);
    return data.resource;
  }
  return createResource(input);
}

export async function updateResourceWithFile(
  id: string,
  input: {
    title: string;
    description?: string;
    category: ResourceCategory;
    content?: string;
  },
  file?: File | null
): Promise<TherapyResource> {
  if (file && file.size > MAX_FILE_BYTES) {
    throw new Error('File is too large. Maximum upload size is 4 MB.');
  }
  if (file) {
    const form = new FormData();
    form.append('title', input.title);
    form.append('category', input.category);
    form.append('description', input.description ?? '');
    form.append('content', input.content?.trim() ?? '');
    form.append('file', file);
    const { data } = await api.patch<{ resource: TherapyResource }>(`/api/resources/${id}/upload`, form);
    return data.resource;
  }
  const { data } = await api.patch<{ resource: TherapyResource }>(`/api/resources/${id}`, {
    title: input.title,
    description: input.description ?? '',
    category: input.category,
    content: input.content?.trim() ?? '',
  });
  return data.resource;
}

export async function deleteResource(id: string): Promise<void> {
  await api.delete(`/api/resources/${id}`);
}

export async function assignResource(resourceId: string, childId: string, notes?: string): Promise<void> {
  await api.post(`/api/resources/${resourceId}/assign`, { childId, notes });
}

export async function unassignResource(assignmentId: string): Promise<void> {
  await api.delete(`/api/resources/assignments/${assignmentId}`);
}

export async function listChildResources(childId: string): Promise<TherapyResource[]> {
  const { data } = await api.get<{ resources: TherapyResource[] }>(`/api/resources/child/${childId}`);
  return data.resources;
}

/** Load full file URL when list responses omit embedded file data. */
export async function resolveResourceFile(r: TherapyResource): Promise<TherapyResource> {
  if (r.fileUrl || !r.hasFile) return r;
  const { resource } = await getResource(r.id);
  return resource;
}
