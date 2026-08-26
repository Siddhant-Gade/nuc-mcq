import type { DashboardRepository } from './dashboard.repository.js';
import type { DashboardStats } from './dashboard.types.js';

export class DashboardService {
  public constructor(private readonly repository: DashboardRepository) {}

  public async getStats(): Promise<DashboardStats> {
    return this.repository.getStats();
  }
}
