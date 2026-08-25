import type { Batch } from '../types';
import { mockBatches } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getBatches(): Promise<Batch[]> {
  await delay(300);
  return [...mockBatches];
}

export async function getBatchById(id: string): Promise<Batch | undefined> {
  await delay(200);
  return mockBatches.find((b) => b.batchId === id);
}

export async function getActiveBatches(): Promise<Batch[]> {
  await delay(200);
  return mockBatches.filter((b) => b.status === 'ACTIVE');
}

export async function createBatch(data: Omit<Batch, 'createdAt' | 'updatedAt'>): Promise<Batch> {
  await delay(500);
  const batch: Batch = {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockBatches.push(batch);
  return batch;
}

export async function deleteBatch(id: string): Promise<void> {
  await delay(400);
  const idx = mockBatches.findIndex((b) => b.batchId === id);
  if (idx !== -1) mockBatches.splice(idx, 1);
}
