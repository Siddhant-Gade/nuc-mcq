import type { Broadcast } from '../types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockBroadcasts: Broadcast[] = [
  {
    id: 'b1',
    title: 'Mid-term Exam Schedule',
    message: 'The mid-term examinations for all batches will commence from 15th September 2026. Please check your respective batch schedules on the notice board.',
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'b2',
    title: 'Holiday Notice — 15th August',
    message: 'The institute will remain closed on 15th August 2026 on account of Independence Day. Regular classes will resume on 16th August.',
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: 'b3',
    title: 'Campus Maintenance Notice',
    message: 'Scheduled maintenance work will be carried out in Block B during the weekend. Students are advised to use Block A computer labs.',
    status: 'DRAFT',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    publishedAt: null,
  },
];

export async function getBroadcasts(): Promise<Broadcast[]> {
  await delay(300);
  return mockBroadcasts.map((b) => ({ ...b }));
}

export async function getBroadcastById(id: string): Promise<Broadcast | undefined> {
  await delay(200);
  const b = mockBroadcasts.find((b) => b.id === id);
  return b ? { ...b } : undefined;
}

export async function createBroadcast(data: Omit<Broadcast, 'id' | 'createdAt' | 'publishedAt'>): Promise<Broadcast> {
  await delay(400);
  const item: Broadcast = {
    ...data,
    id: 'b' + Date.now(),
    createdAt: new Date().toISOString(),
    publishedAt: null,
  };
  mockBroadcasts.push(item);
  return { ...item };
}

export async function updateBroadcast(id: string, data: Partial<Pick<Broadcast, 'title' | 'message' | 'status'>>): Promise<Broadcast> {
  await delay(300);
  const idx = mockBroadcasts.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Broadcast not found');
  const existing = mockBroadcasts[idx];
  if (data.title !== undefined) existing.title = data.title;
  if (data.message !== undefined) existing.message = data.message;
  if (data.status !== undefined) {
    existing.status = data.status;
    if (data.status === 'PUBLISHED' && !existing.publishedAt) {
      existing.publishedAt = new Date().toISOString();
    }
  }
  mockBroadcasts[idx] = existing;
  return { ...existing };
}

export async function publishBroadcast(id: string): Promise<Broadcast> {
  await delay(400);
  const idx = mockBroadcasts.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error('Broadcast not found');
  mockBroadcasts[idx].status = 'PUBLISHED';
  mockBroadcasts[idx].publishedAt = new Date().toISOString();
  return { ...mockBroadcasts[idx] };
}

export async function deleteBroadcast(id: string): Promise<void> {
  await delay(300);
  const idx = mockBroadcasts.findIndex((b) => b.id === id);
  if (idx !== -1) mockBroadcasts.splice(idx, 1);
}
