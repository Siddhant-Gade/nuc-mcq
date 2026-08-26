/**
 * Matches the admin UI's DashboardStats type exactly (admin/src/types/index.ts).
 */
export type DashboardStats = {
  totalStudents: number;
  activeStudents: number;
  pendingAuthorizations: number;
  totalBatches: number;
  activeBatches: number;
  fullBatches: number;
};
