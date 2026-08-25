import type { AuthorizationRequest } from '../types';
import { mockAuthRequests } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getAuthorizationRequests(): Promise<AuthorizationRequest[]> {
  await delay(300);
  return [...mockAuthRequests];
}

export async function getPendingAuthorizationRequests(): Promise<AuthorizationRequest[]> {
  await delay(200);
  return mockAuthRequests.filter((r) => r.status === 'PENDING');
}

export async function getAuthorizationRequestById(id: string): Promise<AuthorizationRequest | undefined> {
  await delay(200);
  return mockAuthRequests.find((r) => r.id === id);
}

export async function approveAuthorizationRequest(id: string): Promise<void> {
  await delay(500);
  const request = mockAuthRequests.find((r) => r.id === id);
  if (request) {
    request.status = 'APPROVED';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = 'admin-001';
  }
}

export async function rejectAuthorizationRequest(id: string): Promise<void> {
  await delay(500);
  const request = mockAuthRequests.find((r) => r.id === id);
  if (request) {
    request.status = 'REJECTED';
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = 'admin-001';
  }
}
