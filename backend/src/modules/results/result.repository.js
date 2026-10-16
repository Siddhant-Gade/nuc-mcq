import { desc, eq, sql } from 'drizzle-orm';
import { testResults, studentProfiles, batches } from '../../database/schema/index.js';
export class DrizzleResultRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async findByClientEventId(clientEventId) {
        const [record] = await this.database
            .select()
            .from(testResults)
            .where(eq(testResults.clientEventId, clientEventId))
            .limit(1);
        return record;
    }
    async findByStudentProfileId(studentProfileId) {
        const records = await this.database
            .select()
            .from(testResults)
            .where(eq(testResults.studentProfileId, studentProfileId))
            .orderBy(desc(testResults.completedAt));
        return records;
    }
    async insert(record) {
        // A unique violation (23505) on client_event_id is deliberately allowed to
        // bubble: ResultService converts it into an idempotent replay of the
        // already-stored result.
        const [inserted] = await this.database.insert(testResults).values(record).returning();
        if (inserted === undefined) {
            throw new Error('Test result insert did not return a record.');
        }
        return inserted;
    }
    async getLeaderboard({ batchId, instituteId, currentStudentProfileId, limit = 10 } = {}) {
        let whereClause;
        if (batchId) {
            whereClause = eq(studentProfiles.batchId, batchId);
        } else if (instituteId) {
            whereClause = eq(studentProfiles.instituteId, instituteId);
        }

        const query = this.database
            .select({
                studentProfileId: studentProfiles.id,
                name: studentProfiles.name,
                studentId: studentProfiles.studentId,
                batchId: studentProfiles.batchId,
                batchName: batches.batchName,
                totalTests: sql`count(${testResults.id})::int`,
                totalQuestions: sql`coalesce(sum(${testResults.totalQuestions}), 0)::int`,
                totalCorrect: sql`coalesce(sum(${testResults.correctCount}), 0)::int`,
                accuracy: sql`coalesce(round((sum(${testResults.correctCount})::numeric / nullif(sum(${testResults.totalQuestions}), 0) * 100)::numeric, 1), 0)::float`,
                avgScore: sql`coalesce(round(avg((${testResults.score} / nullif(${testResults.totalQuestions}, 0)::float) * 100)::numeric, 1), 0)::float`,
            })
            .from(studentProfiles)
            .leftJoin(testResults, eq(testResults.studentProfileId, studentProfiles.id))
            .leftJoin(batches, eq(batches.batchId, studentProfiles.batchId));

        if (whereClause) {
            query.where(whereClause);
        }

        const rows = await query
            .groupBy(studentProfiles.id, studentProfiles.name, studentProfiles.studentId, studentProfiles.batchId, batches.batchName)
            .orderBy(
                desc(sql`accuracy`),
                desc(sql`totalTests`),
                studentProfiles.createdAt
            )
            .limit(limit);

        return rows.map((r, index) => {
            const rank = index + 1;
            const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
            const initial = (r.name || 'S').trim().charAt(0).toUpperCase();
            return {
                rank,
                badge,
                studentProfileId: r.studentProfileId,
                name: r.name,
                studentId: r.studentId,
                initial,
                score: Math.round(r.accuracy),
                accuracy: r.accuracy,
                totalTests: r.totalTests,
                batchName: r.batchName,
                isCurrent: currentStudentProfileId ? r.studentProfileId === currentStudentProfileId : false,
            };
        });
    }
}
