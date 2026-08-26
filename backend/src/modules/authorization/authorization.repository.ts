import { and, desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema/index.js';
import { authorizationRequests, studentAccess, studentProfiles } from '../../database/schema/index.js';
import type {
  AuthorizationRequestRecord,
  AuthorizationRequestStatus,
  AuthorizationRequestView,
} from './authorization.types.js';

type Database = NodePgDatabase<typeof schema>;

export interface AuthorizationRequestRepository {
  list(): Promise<AuthorizationRequestView[]>;
  listByStatus(status: AuthorizationRequestStatus): Promise<AuthorizationRequestView[]>;
  findById(id: string): Promise<AuthorizationRequestRecord | undefined>;
  /** Phase 10: finds this identity's own still-pending request, if any. */
  findPendingByAuthUserId(authUserId: string): Promise<AuthorizationRequestRecord | undefined>;
  create(studentProfileId: string, authUserId: string): Promise<AuthorizationRequestRecord>;
  /**
   * Atomic review transition. The status guard lives in the UPDATE's WHERE
   * clause so a concurrent duplicate review can never succeed.
   * Returns undefined when the request does not exist.
   * Returns { accessUpdated: false } when the request was PENDING but the
   * student's access row is missing (data drift) — the request is still
   * marked reviewed to avoid an unreviewable zombie state.
   */
  approve(id: string, reviewedBy: string): Promise<{ record: AuthorizationRequestRecord; accessUpdated: boolean } | undefined>;
  reject(id: string, reviewedBy: string): Promise<AuthorizationRequestRecord | undefined>;
}

const viewSelection = {
  id: authorizationRequests.id,
  studentProfileId: authorizationRequests.studentProfileId,
  studentName: studentProfiles.name,
  studentId: studentProfiles.studentId,
  authUserId: authorizationRequests.authUserId,
  requestedAt: authorizationRequests.requestedAt,
  status: authorizationRequests.status,
  reviewedAt: authorizationRequests.reviewedAt,
  reviewedBy: authorizationRequests.reviewedBy,
};

const toView = (row: {
  id: string;
  studentProfileId: string;
  studentName: string | null;
  studentId: string | null;
  authUserId: string | null;
  requestedAt: Date;
  status: AuthorizationRequestStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
}): AuthorizationRequestView => ({
  ...row,
  studentName: row.studentName ?? 'Unknown student',
  studentId: row.studentId ?? '',
  prn: row.studentId ?? '',
});

export class DrizzleAuthorizationRequestRepository implements AuthorizationRequestRepository {
  public constructor(private readonly database: Database) {}

  public async list(): Promise<AuthorizationRequestView[]> {
    const rows = await this.database
      .select(viewSelection)
      .from(authorizationRequests)
      .leftJoin(studentProfiles, eq(studentProfiles.id, authorizationRequests.studentProfileId))
      .orderBy(desc(authorizationRequests.requestedAt));

    return rows.map(toView);
  }

  public async listByStatus(status: AuthorizationRequestStatus): Promise<AuthorizationRequestView[]> {
    const rows = await this.database
      .select(viewSelection)
      .from(authorizationRequests)
      .leftJoin(studentProfiles, eq(studentProfiles.id, authorizationRequests.studentProfileId))
      .where(eq(authorizationRequests.status, status))
      .orderBy(desc(authorizationRequests.requestedAt));

    return rows.map(toView);
  }

  public async findById(id: string): Promise<AuthorizationRequestRecord | undefined> {
    const [record] = await this.database
      .select()
      .from(authorizationRequests)
      .where(eq(authorizationRequests.id, id))
      .limit(1);
    return record;
  }

  public async findPendingByAuthUserId(authUserId: string): Promise<AuthorizationRequestRecord | undefined> {
    const [record] = await this.database
      .select()
      .from(authorizationRequests)
      .where(
        and(
          eq(authorizationRequests.authUserId, authUserId),
          eq(authorizationRequests.status, 'PENDING'),
        ),
      )
      .orderBy(desc(authorizationRequests.requestedAt))
      .limit(1);
    return record;
  }

  public async create(studentProfileId: string, authUserId: string): Promise<AuthorizationRequestRecord> {
    const [record] = await this.database
      .insert(authorizationRequests)
      .values({ studentProfileId, authUserId })
      .returning();

    if (record === undefined) {
      throw new Error('Authorization request insert did not return a record.');
    }

    return record;
  }

  public async approve(
    id: string,
    reviewedBy: string,
  ): Promise<{ record: AuthorizationRequestRecord; accessUpdated: boolean } | undefined> {
    return this.database.transaction(async (transaction) => {
      // Status guard is part of the UPDATE: only a PENDING request transitions.
      const [updated] = await transaction
        .update(authorizationRequests)
        .set({ status: 'APPROVED', reviewedAt: sql`now()`, reviewedBy })
        .where(and(eq(authorizationRequests.id, id), eq(authorizationRequests.status, 'PENDING')))
        .returning();

      if (updated === undefined) {
        return undefined;
      }

      // Confirmed workflow (SYSTEM_DESIGN.md §17): approval links the auth
      // identity and activates access in the same transaction.
      const [access] = await transaction
        .update(studentAccess)
        .set({
          status: 'ACTIVE',
          authUserId: updated.authUserId,
          accessGrantedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(studentAccess.studentProfileId, updated.studentProfileId))
        .returning();

      return { record: updated, accessUpdated: access !== undefined };
    });
  }

  public async reject(id: string, reviewedBy: string): Promise<AuthorizationRequestRecord | undefined> {
    const [updated] = await this.database
      .update(authorizationRequests)
      .set({ status: 'REJECTED', reviewedAt: sql`now()`, reviewedBy })
      .where(and(eq(authorizationRequests.id, id), eq(authorizationRequests.status, 'PENDING')))
      .returning();

    return updated;
  }
}
