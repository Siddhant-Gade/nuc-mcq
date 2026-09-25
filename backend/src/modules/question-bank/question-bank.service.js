import { eq, desc, sql, ilike, or } from 'drizzle-orm';
import { database } from '../../database/client.js';
import { questions } from '../../database/schema/index.js';
import { ApiError } from '../../utils/api-error.js';
export class QuestionBankService {
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
            await database.delete(questions).where(eq(questions.instituteId, instituteId));
        }
        const batchSize = 100;
        for (let i = 0; i < preparedRows.length; i += batchSize) {
            const chunk = preparedRows.slice(i, i + batchSize);
            await database.insert(questions).values(chunk);
        }
        const summary = await this.getSummary(instituteId);
        return { insertedCount: preparedRows.length, summary };
    }
    async getSummary(instituteId = 'INST001') {
        const rows = await database
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
        let query = database.select().from(questions).where(eq(questions.instituteId, instituteId)).$dynamic();
        if (section && section !== 'ALL') {
            query = query.where(eq(questions.section, section));
        }
        if (search && search.trim()) {
            const q = `%${search.trim()}%`;
            query = query.where(or(ilike(questions.questionEn, q), ilike(questions.section, q), ilike(questions.explanationEn, q)));
        }
        const allMatched = await query.orderBy(questions.sr, desc(questions.createdAt)).limit(limit).offset(offset);
        const countRes = await database
            .select({ count: sql `count(*)::int` })
            .from(questions)
            .where(eq(questions.instituteId, instituteId));
        const mapped = allMatched.map((r) => this.toView(r));
        return { questions: mapped, total: countRes[0]?.count ?? 0 };
    }
    async listAllForStudent(instituteId = 'INST001') {
        const rows = await database
            .select()
            .from(questions)
            .where(eq(questions.instituteId, instituteId))
            .orderBy(questions.sr, questions.createdAt);
        return rows.map((r) => this.toView(r));
    }
    async clearQuestions(instituteId = 'INST001') {
        await database.delete(questions).where(eq(questions.instituteId, instituteId));
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
