import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { database } from '../../database/client.js';
import { questions } from '../../database/schema/index.js';
import { ApiError } from '../../utils/api-error.js';
export class QuestionBankService {
    db;
    constructor(db = database) {
        this.db = db;
    }
    async uploadBulk(items, uploadedBy, replaceAll = true, instituteId = 'INST001', version = '2.0.0') {
        if (!Array.isArray(items) || items.length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Question list must contain at least one question item.');
        }
        const preparedRows = items.map((item, idx) => {
            const section = (item.section || 'General').trim();
            const questionEn = (item.question_en || item.questionText || item.questionEn || '').trim();
            const optAEn = (item.opt_a_en || item.optAEn || '').trim();
            const optBEn = (item.opt_b_en || item.optBEn || '').trim();
            const optCEn = (item.opt_c_en || item.optCEn || '').trim();
            const optDEn = (item.opt_d_en || item.optDEn || '').trim();
            if (!questionEn) {
                throw new ApiError(400, 'VALIDATION_ERROR', `Row #${idx + 1} is missing question text.`);
            }
            const finalOptA = optAEn || 'Option A';
            const finalOptB = optBEn || 'Option B';
            const finalOptC = optCEn || 'Option C';
            const finalOptD = optDEn || 'Option D';
            let correctIdx = 0;
            if (typeof item.correct_index === 'number') {
                correctIdx = item.correct_index;
            }
            else if (typeof item.correctIndex === 'number') {
                correctIdx = item.correctIndex;
            }
            else if (item.correct_option || item.correctOption) {
                const optLetter = (item.correct_option || item.correctOption || 'A').trim().toUpperCase();
                if (optLetter === 'B')
                    correctIdx = 1;
                else if (optLetter === 'C')
                    correctIdx = 2;
                else if (optLetter === 'D')
                    correctIdx = 3;
                else
                    correctIdx = 0;
            }
            const optLetters = ['A', 'B', 'C', 'D'];
            const correctOptLetter = optLetters[correctIdx] || 'A';
            const optionsArray = [finalOptA, finalOptB, finalOptC, finalOptD];
            const correctAnswer = item.correct_answer || item.correctAnswer || optionsArray[correctIdx] || finalOptA;
            const isValidUuid = uploadedBy &&
                /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uploadedBy);
            return {
                sr: typeof item.sr === 'number' ? item.sr : idx + 1,
                section,
                questionEn,
                optAEn: finalOptA,
                optBEn: finalOptB,
                optCEn: finalOptC,
                optDEn: finalOptD,
                correctOption: correctOptLetter,
                correctIndex: correctIdx,
                correctAnswer,
                explanationEn: (item.explanation_en || item.explanation || item.explanationEn || '').trim() || null,
                questionMr: (item.question_mr || item.questionMr || '').trim() || null,
                optAMr: (item.opt_a_mr || item.optAMr || '').trim() || null,
                optBMr: (item.opt_b_mr || item.optBMr || '').trim() || null,
                optCMr: (item.opt_c_mr || item.optCMr || '').trim() || null,
                optDMr: (item.opt_d_mr || item.optDMr || '').trim() || null,
                explanationMr: (item.explanation_mr || item.explanationMr || '').trim() || null,
                questionHi: (item.question_hi || item.questionHi || '').trim() || null,
                optAHi: (item.opt_a_hi || item.optAHi || '').trim() || null,
                optBHi: (item.opt_b_hi || item.optBHi || '').trim() || null,
                optCHi: (item.opt_c_hi || item.optCHi || '').trim() || null,
                optDHi: (item.opt_d_hi || item.optDHi || '').trim() || null,
                explanationHi: (item.explanation_hi || item.explanationHi || '').trim() || null,
                instituteId,
                version,
                uploadedBy: isValidUuid ? uploadedBy : null,
            };
        });
        if (replaceAll) {
            await this.db.delete(questions).where(eq(questions.instituteId, instituteId));
        }
        const batchSize = 100;
        for (let i = 0; i < preparedRows.length; i += batchSize) {
            const chunk = preparedRows.slice(i, i + batchSize);
            await this.db.insert(questions).values(chunk);
        }
        const summary = await this.getSummary(instituteId);
        return { insertedCount: preparedRows.length, summary };
    }
    async getSummary(instituteId = 'INST001') {
        const rows = await this.db
            .select({
            section: questions.section,
            count: sql `count(*)::int`,
            maxUpdatedAt: sql `max(${questions.updatedAt})::text`,
            version: sql `max(${questions.version})::text`,
        })
            .from(questions)
            .where(eq(questions.instituteId, instituteId))
            .groupBy(questions.section);
        let total = 0;
        const topicCounts = {};
        let lastUpdated = null;
        let version = '2.0.0';
        for (const r of rows) {
            total += r.count;
            topicCounts[r.section] = r.count;
            if (r.maxUpdatedAt && (!lastUpdated || r.maxUpdatedAt > lastUpdated)) {
                lastUpdated = r.maxUpdatedAt;
            }
            if (r.version) {
                version = r.version;
            }
        }
        return {
            totalQuestions: total,
            version,
            lastUpdated,
            topicCounts,
        };
    }
    async listQuestions(instituteId = 'INST001', section, search, limit = 50, offset = 0) {
        let query = this.db.select().from(questions).where(eq(questions.instituteId, instituteId)).$dynamic();
        if (section && section !== 'ALL') {
            query = query.where(eq(questions.section, section));
        }
        if (search && search.trim()) {
            const q = `%${search.trim()}%`;
            query = query.where(or(ilike(questions.questionEn, q), ilike(questions.section, q), ilike(questions.explanationEn, q)));
        }
        const allMatched = await query.orderBy(questions.sr, desc(questions.createdAt)).limit(limit).offset(offset);
        const countRes = await this.db
            .select({ count: sql `count(*)::int` })
            .from(questions)
            .where(eq(questions.instituteId, instituteId));
        const mapped = allMatched.map((r) => this.toView(r));
        return { questions: mapped, total: countRes[0]?.count ?? 0 };
    }
    async getQuestionById(id, instituteId = 'INST001') {
        const [row] = await this.db
            .select()
            .from(questions)
            .where(and(eq(questions.id, id), eq(questions.instituteId, instituteId)))
            .limit(1);
        if (!row) {
            throw new ApiError(404, 'NOT_FOUND', 'Question not found.');
        }
        return this.toView(row);
    }
    async createQuestion(input, uploadedBy, instituteId = 'INST001') {
        const section = (input.section || input.topic || '').trim();
        const questionEn = (input.question_en || input.questionEn || input.questionText || '').trim();
        const optAEn = (input.opt_a_en || input.optAEn || '').trim();
        const optBEn = (input.opt_b_en || input.optBEn || '').trim();
        const optCEn = (input.opt_c_en || input.optCEn || '').trim();
        const optDEn = (input.opt_d_en || input.optDEn || '').trim();

        if (!section) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Topic/Section is required.');
        }
        if (!questionEn) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Question text (English) is required.');
        }
        if (!optAEn || !optBEn || !optCEn || !optDEn) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'All four options (A, B, C, D) are required.');
        }

        let correctIdx = 0;
        if (typeof input.correct_index === 'number' && input.correct_index >= 0 && input.correct_index <= 3) {
            correctIdx = input.correct_index;
        } else if (typeof input.correctIndex === 'number' && input.correctIndex >= 0 && input.correctIndex <= 3) {
            correctIdx = input.correctIndex;
        } else if (input.correct_option || input.correctOption) {
            const letter = (input.correct_option || input.correctOption || 'A').toString().trim().toUpperCase();
            if (letter === 'B' || letter === '1') correctIdx = 1;
            else if (letter === 'C' || letter === '2') correctIdx = 2;
            else if (letter === 'D' || letter === '3') correctIdx = 3;
            else correctIdx = 0;
        }

        const optLetters = ['A', 'B', 'C', 'D'];
        const correctOptLetter = optLetters[correctIdx] || 'A';
        const optionsArray = [optAEn, optBEn, optCEn, optDEn];
        const correctAnswer = (input.correct_answer || input.correctAnswer || optionsArray[correctIdx] || optAEn).trim();

        let nextSr = input.sr;
        if (typeof nextSr !== 'number') {
            const maxSrRes = await this.db
                .select({ maxSr: sql`COALESCE(MAX(${questions.sr}), 0)::int` })
                .from(questions)
                .where(eq(questions.instituteId, instituteId));
            nextSr = (maxSrRes[0]?.maxSr ?? 0) + 1;
        }

        const isValidUuid = uploadedBy &&
            /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uploadedBy);

        const row = {
            sr: nextSr,
            section,
            questionEn,
            optAEn,
            optBEn,
            optCEn,
            optDEn,
            correctOption: correctOptLetter,
            correctIndex: correctIdx,
            correctAnswer,
            explanationEn: (input.explanation_en || input.explanationEn || input.explanation || '').trim() || null,
            questionMr: (input.question_mr || input.questionMr || '').trim() || null,
            optAMr: (input.opt_a_mr || input.optAMr || '').trim() || null,
            optBMr: (input.opt_b_mr || input.optBMr || '').trim() || null,
            optCMr: (input.opt_c_mr || input.optCMr || '').trim() || null,
            optDMr: (input.opt_d_mr || input.optDMr || '').trim() || null,
            explanationMr: (input.explanation_mr || input.explanationMr || '').trim() || null,
            questionHi: (input.question_hi || input.questionHi || '').trim() || null,
            optAHi: (input.opt_a_hi || input.optAHi || '').trim() || null,
            optBHi: (input.opt_b_hi || input.optBHi || '').trim() || null,
            optCHi: (input.opt_c_hi || input.optCHi || '').trim() || null,
            optDHi: (input.opt_d_hi || input.optDHi || '').trim() || null,
            explanationHi: (input.explanation_hi || input.explanationHi || '').trim() || null,
            instituteId,
            version: input.version || '2.0.0',
            uploadedBy: isValidUuid ? uploadedBy : null,
        };

        const [created] = await this.db.insert(questions).values(row).returning();
        if (!created) {
            throw new Error('Failed to create question.');
        }
        return this.toView(created);
    }
    async updateQuestion(id, input, instituteId = 'INST001') {
        const [existing] = await this.db
            .select()
            .from(questions)
            .where(and(eq(questions.id, id), eq(questions.instituteId, instituteId)))
            .limit(1);

        if (!existing) {
            throw new ApiError(404, 'NOT_FOUND', 'Question not found.');
        }

        const updates = {};
        if (input.section !== undefined) updates.section = input.section.trim();
        if (input.questionEn !== undefined) updates.questionEn = input.questionEn.trim();
        if (input.question_en !== undefined) updates.questionEn = input.question_en.trim();
        if (input.optAEn !== undefined) updates.optAEn = input.optAEn.trim();
        if (input.opt_a_en !== undefined) updates.optAEn = input.opt_a_en.trim();
        if (input.optBEn !== undefined) updates.optBEn = input.optBEn.trim();
        if (input.opt_b_en !== undefined) updates.optBEn = input.opt_b_en.trim();
        if (input.optCEn !== undefined) updates.optCEn = input.optCEn.trim();
        if (input.opt_c_en !== undefined) updates.optCEn = input.opt_c_en.trim();
        if (input.optDEn !== undefined) updates.optDEn = input.optDEn.trim();
        if (input.opt_d_en !== undefined) updates.optDEn = input.opt_d_en.trim();

        const optA = updates.optAEn ?? existing.optAEn;
        const optB = updates.optBEn ?? existing.optBEn;
        const optC = updates.optCEn ?? existing.optCEn;
        const optD = updates.optDEn ?? existing.optDEn;
        const opts = [optA, optB, optC, optD];

        if (input.correct_option !== undefined || input.correctOption !== undefined || input.correct_index !== undefined || input.correctIndex !== undefined) {
            let correctIdx = existing.correctIndex;
            if (typeof input.correct_index === 'number' && input.correct_index >= 0 && input.correct_index <= 3) {
                correctIdx = input.correct_index;
            } else if (typeof input.correctIndex === 'number' && input.correctIndex >= 0 && input.correctIndex <= 3) {
                correctIdx = input.correctIndex;
            } else {
                const optLetter = (input.correct_option || input.correctOption || 'A').toString().trim().toUpperCase();
                if (optLetter === 'B' || optLetter === '1') correctIdx = 1;
                else if (optLetter === 'C' || optLetter === '2') correctIdx = 2;
                else if (optLetter === 'D' || optLetter === '3') correctIdx = 3;
                else correctIdx = 0;
            }
            const optLetters = ['A', 'B', 'C', 'D'];
            updates.correctIndex = correctIdx;
            updates.correctOption = optLetters[correctIdx] || 'A';
            updates.correctAnswer = (input.correct_answer || input.correctAnswer || opts[correctIdx] || optA).trim();
        } else if (updates.optAEn !== undefined || updates.optBEn !== undefined || updates.optCEn !== undefined || updates.optDEn !== undefined) {
            updates.correctAnswer = opts[existing.correctIndex] || optA;
        }

        if (input.explanation_en !== undefined || input.explanationEn !== undefined || input.explanation !== undefined) {
            const exp = (input.explanation_en ?? input.explanationEn ?? input.explanation ?? '').trim();
            updates.explanationEn = exp || null;
        }

        if (input.question_mr !== undefined || input.questionMr !== undefined) updates.questionMr = (input.question_mr ?? input.questionMr ?? '').trim() || null;
        if (input.opt_a_mr !== undefined || input.optAMr !== undefined) updates.optAMr = (input.opt_a_mr ?? input.optAMr ?? '').trim() || null;
        if (input.opt_b_mr !== undefined || input.optBMr !== undefined) updates.optBMr = (input.opt_b_mr ?? input.optBMr ?? '').trim() || null;
        if (input.opt_c_mr !== undefined || input.optCMr !== undefined) updates.optCMr = (input.opt_c_mr ?? input.optCMr ?? '').trim() || null;
        if (input.opt_d_mr !== undefined || input.optDMr !== undefined) updates.optDMr = (input.opt_d_mr ?? input.optDMr ?? '').trim() || null;
        if (input.explanation_mr !== undefined || input.explanationMr !== undefined) updates.explanationMr = (input.explanation_mr ?? input.explanationMr ?? '').trim() || null;

        if (input.question_hi !== undefined || input.questionHi !== undefined) updates.questionHi = (input.question_hi ?? input.questionHi ?? '').trim() || null;
        if (input.opt_a_hi !== undefined || input.optAHi !== undefined) updates.optAHi = (input.opt_a_hi ?? input.optAHi ?? '').trim() || null;
        if (input.opt_b_hi !== undefined || input.optBHi !== undefined) updates.optBHi = (input.opt_b_hi ?? input.optBHi ?? '').trim() || null;
        if (input.opt_c_hi !== undefined || input.optCHi !== undefined) updates.optCHi = (input.opt_c_hi ?? input.optCHi ?? '').trim() || null;
        if (input.opt_d_hi !== undefined || input.optDHi !== undefined) updates.optDHi = (input.opt_d_hi ?? input.optDHi ?? '').trim() || null;
        if (input.explanation_hi !== undefined || input.explanationHi !== undefined) updates.explanationHi = (input.explanation_hi ?? input.explanationHi ?? '').trim() || null;

        updates.updatedAt = new Date();

        const [updated] = await this.db
            .update(questions)
            .set(updates)
            .where(and(eq(questions.id, id), eq(questions.instituteId, instituteId)))
            .returning();

        return this.toView(updated);
    }
    async deleteQuestion(id, instituteId = 'INST001') {
        const [existing] = await this.db
            .select()
            .from(questions)
            .where(and(eq(questions.id, id), eq(questions.instituteId, instituteId)))
            .limit(1);

        if (!existing) {
            throw new ApiError(404, 'NOT_FOUND', 'Question not found.');
        }

        await this.db
            .delete(questions)
            .where(and(eq(questions.id, id), eq(questions.instituteId, instituteId)));

        return { deleted: true, id };
    }
    async listAllForStudent(instituteId = 'INST001') {
        const rows = await this.db
            .select()
            .from(questions)
            .where(eq(questions.instituteId, instituteId))
            .orderBy(questions.sr, questions.createdAt);
        return rows.map((r) => this.toView(r));
    }
    async clearQuestions(instituteId = 'INST001') {
        await this.db.delete(questions).where(eq(questions.instituteId, instituteId));
    }
    toView(row) {
        return {
            id: row.id,
            sr: row.sr,
            section: row.section,
            question_en: row.questionEn,
            opt_a_en: row.optAEn,
            opt_b_en: row.optBEn,
            opt_c_en: row.optCEn,
            opt_d_en: row.optDEn,
            correct_option: row.correctOption || 'A',
            correct_index: row.correctIndex,
            correct_answer: row.correctAnswer,
            explanation_en: row.explanationEn,
            question_mr: row.questionMr,
            opt_a_mr: row.optAMr,
            opt_b_mr: row.optBMr,
            opt_c_mr: row.optCMr,
            opt_d_mr: row.optDMr,
            explanation_mr: row.explanationMr,
            question_hi: row.questionHi,
            opt_a_hi: row.optAHi,
            opt_b_hi: row.optBHi,
            opt_c_hi: row.optCHi,
            opt_d_hi: row.optDHi,
            explanation_hi: row.explanationHi,
            institute_id: row.instituteId,
            version: row.version,
            created_at: row.createdAt.toISOString(),
            updated_at: row.updatedAt.toISOString(),
        };
    }
}
