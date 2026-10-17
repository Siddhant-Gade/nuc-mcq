import { asc, eq, sql } from 'drizzle-orm';
import { batches, studentProfiles } from '../../database/schema/index.js';
export class DrizzleBatchRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        const rows = await this.database
            .select({
            batch: batches,
            enrolledCount: sql `count(${studentProfiles.id})::int`,
        })
            .from(batches)
            .leftJoin(studentProfiles, eq(studentProfiles.batchId, batches.batchId))
            .groupBy(batches.batchId)
            .orderBy(asc(batches.createdAt));
        return rows.map(({ batch, enrolledCount }) => ({
            ...batch,
            enrolledCount: Number(enrolledCount ?? 0),
        }));
    }
    async findById(batchId) {
        const [row] = await this.database
            .select({ batch: batches })
            .from(batches)
            .where(eq(batches.batchId, batchId))
            .limit(1);
        if (!row) return undefined;
        return row.batch;
    }
    async countAssignedStudents(batchId) {
        const [row] = await this.database
            .select({ assigned: sql `count(*)::int` })
            .from(studentProfiles)
            .where(eq(studentProfiles.batchId, batchId));
        return Number(row?.assigned ?? 0);
    }
    async create(input) {
        const [batch] = await this.database.insert(batches).values(input).returning();
        if (batch === undefined) {
            throw new Error('Batch insert did not return a record.');
        }
        return batch;
    }
    async remove(batchId) {
        return this.database.transaction(async (tx) => {
            await tx
                .update(studentProfiles)
                .set({ batchId: 'Unassigned', updatedAt: new Date() })
                .where(eq(studentProfiles.batchId, batchId));
            const [batch] = await tx.delete(batches).where(eq(batches.batchId, batchId)).returning();
            return batch;
        });
    }
    async unassignStudents(batchId) {
        return this.database
            .update(studentProfiles)
            .set({ batchId: 'Unassigned', updatedAt: new Date() })
            .where(eq(studentProfiles.batchId, batchId))
            .returning();
    }
}
