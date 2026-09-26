import { and, desc, eq, sql } from 'drizzle-orm';
import { authorizationRequests, studentAccess, studentProfiles } from '../../database/schema/index.js';
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
const toView = (row) => ({
    ...row,
    studentName: row.studentName ?? 'Unknown student',
    studentId: row.studentId ?? '',
    prn: row.studentId ?? '',
});
export class DrizzleAuthorizationRequestRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        const rows = await this.database
            .select(viewSelection)
            .from(authorizationRequests)
            .leftJoin(studentProfiles, eq(studentProfiles.id, authorizationRequests.studentProfileId))
            .orderBy(desc(authorizationRequests.requestedAt));
        return rows.map(toView);
    }
    async listByStatus(status) {
        const rows = await this.database
            .select(viewSelection)
            .from(authorizationRequests)
            .leftJoin(studentProfiles, eq(studentProfiles.id, authorizationRequests.studentProfileId))
            .where(eq(authorizationRequests.status, status))
            .orderBy(desc(authorizationRequests.requestedAt));
        return rows.map(toView);
    }
    async findById(id) {
        const [record] = await this.database
            .select()
            .from(authorizationRequests)
            .where(eq(authorizationRequests.id, id))
            .limit(1);
        return record;
    }
    async findPendingByAuthUserId(authUserId) {
        const [record] = await this.database
            .select()
            .from(authorizationRequests)
            .where(and(eq(authorizationRequests.authUserId, authUserId), eq(authorizationRequests.status, 'PENDING')))
            .orderBy(desc(authorizationRequests.requestedAt))
            .limit(1);
        return record;
    }
    async findPendingByStudentProfileId(studentProfileId) {
        const [record] = await this.database
            .select()
            .from(authorizationRequests)
            .where(and(eq(authorizationRequests.studentProfileId, studentProfileId), eq(authorizationRequests.status, 'PENDING')))
            .orderBy(desc(authorizationRequests.requestedAt))
            .limit(1);
        return record;
    }
    async updateAuthUserId(id, authUserId) {
        await this.database
            .update(authorizationRequests)
            .set({ authUserId })
            .where(eq(authorizationRequests.id, id));
    }
    /** Targeted view query by ID — avoids fetching all rows. */
    async findViewById(id) {
        const [row] = await this.database
            .select(viewSelection)
            .from(authorizationRequests)
            .leftJoin(studentProfiles, eq(studentProfiles.id, authorizationRequests.studentProfileId))
            .where(eq(authorizationRequests.id, id))
            .limit(1);
        return row ? toView(row) : undefined;
    }
    async create(studentProfileId, authUserId) {
        const [record] = await this.database
            .insert(authorizationRequests)
            .values({ studentProfileId, authUserId })
            .returning();
        if (record === undefined) {
            throw new Error('Authorization request insert did not return a record.');
        }
        return record;
    }
    async approve(id, reviewedBy) {
        return this.database.transaction(async (transaction) => {
            // Status guard is part of the UPDATE: only a PENDING request transitions.
            const [updated] = await transaction
                .update(authorizationRequests)
                .set({ status: 'APPROVED', reviewedAt: sql `now()`, reviewedBy })
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
                accessGrantedAt: sql `now()`,
                updatedAt: sql `now()`,
            })
                .where(eq(studentAccess.studentProfileId, updated.studentProfileId))
                .returning();
            if (updated.authUserId) {
                try {
                    await transaction.execute(sql `
            UPDATE auth.users
            SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "STUDENT"}'::jsonb
            WHERE id = ${updated.authUserId}::uuid;
          `);
                }
                catch { }
            }
            return { record: updated, accessUpdated: access !== undefined };
        });
    }
    async reject(id, reviewedBy) {
        return this.database.transaction(async (transaction) => {
            const [updated] = await transaction
                .update(authorizationRequests)
                .set({ status: 'REJECTED', reviewedAt: sql`now()`, reviewedBy })
                .where(and(eq(authorizationRequests.id, id), eq(authorizationRequests.status, 'PENDING')))
                .returning();
            if (updated === undefined) {
                return undefined;
            }
            await transaction
                .update(studentAccess)
                .set({
                    status: 'REVOKED',
                    revokedAt: sql`now()`,
                    updatedAt: sql`now()`,
                })
                .where(eq(studentAccess.studentProfileId, updated.studentProfileId));
            if (updated.authUserId) {
                try {
                    await transaction.execute(sql`
                        UPDATE auth.users
                        SET raw_app_meta_data = (raw_app_meta_data - 'role')
                        WHERE id = ${updated.authUserId}::uuid;
                    `);
                } catch { }
            }
            return updated;
        });
    }
}
