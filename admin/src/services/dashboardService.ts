import type { DashboardStats } from '../types';
import { mockStudents, mockAccess, mockAuthRequests, mockBatches } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await delay(300);
  const activeAccess = mockAccess.filter((a) => a.status === 'ACTIVE');
  const pendingAuth = mockAuthRequests.filter((r) => r.status === 'PENDING');
  const activeBatches = mockBatches.filter((b) => b.status === 'ACTIVE');
  const fullBatches = mockBatches.filter((b) => b.status === 'FULL');

  return {
    totalStudents: mockStudents.length,
    activeStudents: activeAccess.length,
    pendingAuthorizations: pendingAuth.length,
    totalBatches: mockBatches.length,
    activeBatches: activeBatches.length,
    fullBatches: fullBatches.length,
  };
}
