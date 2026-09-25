import { asc, eq, sql } from 'drizzle-orm';
import { batches, studentProfiles, teachers } from '../../database/schema/index.js';
export class DrizzleBatchRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        const rows = await this.database
            .select({
            batch: batches,
            teacherName: teachers.name,
            enrolledCount: sql `count(${studentProfiles.id})::int`,
        })
            .from(batches)
            .leftJoin(studentProfiles, eq(studentProfiles.batchId, batches.batchId))
            .leftJoin(teachers, eq(batches.teacherId, teachers.id))
            .groupBy(batches.batchId, teachers.name)
            .orderBy(asc(batches.createdAt));
        return rows.map(({ batch, teacherName, enrolledCount }) => ({
            ...batch,
            teacherName: teacherName ?? null,
            enrolledCount: Number(enrolledCount ?? 0),
        }));
    }
    async findById(batchId) {
        const [row] = await this.database
            .select({ batch: batches, teacherName: teachers.name })
            .from(batches)
            .leftJoin(teachers, eq(batches.teacherId, teachers.id))
            .where(eq(batches.batchId, batchId))
            .limit(1);
        if (!row) return undefined;
        return { ...row.batch, teacherName: row.teacherName ?? null };
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
        const [batch] = await this.database.delete(batches).where(eq(batches.batchId, batchId)).returning();
        return batch;
    }
    async updateTeacher(batchId, teacherId) {
        await this.database.update(batches).set({ teacherId, updatedAt: new Date() }).where(eq(batches.batchId, batchId));
    }
}
