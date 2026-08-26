import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema/index.js';
import { authorizationRequests, batches, studentAccess, studentProfiles } from '../../database/schema/index.js';
import type { DashboardStats } from './dashboard.types.js';

type Database = NodePgDatabase<typeof schema>;

export interface DashboardRepository {
  getStats(): Promise<DashboardStats>;
}

export class DrizzleDashboardRepository implements DashboardRepository {
  public constructor(private readonly database: Database) {}

  /**
   * All figures are computed inside PostgreSQL — no table is ever loaded
   * into Node just to be counted.
   *
   * Batch ACTIVE/FULL follow the same derived rule as the batches module:
   * stored INACTIVE wins, otherwise a batch is FULL when its aggregated
   * enrollment reaches capacity, otherwise ACTIVE.
   */
  public async getStats(): Promise<DashboardStats> {
    const [accessRow] = await this.database
      .select({
        totalStudents: sql<number>`count(*)::int`,
        activeStudents: sql<number>`count(*) filter (where ${studentAccess.status} = 'ACTIVE')::int`,
      })
      .from(studentProfiles)
      .leftJoin(studentAccess, eq(studentAccess.studentProfileId, studentProfiles.id));

    const [requestRow] = await this.database
      .select({
        pendingAuthorizations: sql<number>`count(*) filter (where ${authorizationRequests.status} = 'PENDING')::int`,
      })
      .from(authorizationRequests);

    // One grouped subquery computes per-batch enrollment; the outer select
    // classifies each batch once instead of loading rows into Node.
    const enrollmentSubquery = this.database
      .select({
        batchId: batches.batchId,
        status: batches.status,
        capacity: batches.capacity,
        enrolled: sql<number>`count(${studentProfiles.id})::int`.as('enrolled'),
      })
      .from(batches)
      .leftJoin(studentProfiles, sql`${studentProfiles.batchId} = ${batches.batchId}`)
      .groupBy(batches.batchId)
      .as('batch_enrollment');

    const [batchRow] = await this.database
      .select({
        totalBatches: sql<number>`count(*)::int`,
        activeBatches: sql<number>`count(*) filter (where ${enrollmentSubquery.status} = 'ACTIVE' and ${enrollmentSubquery.enrolled} < ${enrollmentSubquery.capacity})::int`,
        fullBatches: sql<number>`count(*) filter (where ${enrollmentSubquery.status} <> 'INACTIVE' and ${enrollmentSubquery.enrolled} >= ${enrollmentSubquery.capacity})::int`,
      })
      .from(enrollmentSubquery);

    return {
      totalStudents: accessRow?.totalStudents ?? 0,
      activeStudents: accessRow?.activeStudents ?? 0,
      pendingAuthorizations: requestRow?.pendingAuthorizations ?? 0,
      totalBatches: batchRow?.totalBatches ?? 0,
      activeBatches: batchRow?.activeBatches ?? 0,
      fullBatches: batchRow?.fullBatches ?? 0,
    };
  }
}
