import { ApiError } from '../../utils/api-error.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
export class ResultService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    /**
     * Idempotent result sync. `UNIQUE(client_event_id)` is the real guarantee:
     * a retry that loses the insert race replays the already-stored record
     * instead of failing or duplicating. Scores are never recomputed here.
     */
    async sync(identity, input) {
        // The body may carry an advisory student id; it must agree with the
        // token-resolved student — the body itself is never trusted.
        if (input.clientStudentId !== undefined && input.clientStudentId !== identity.studentId) {
            throw new ApiError(403, 'IDENTITY_MISMATCH', `The clientStudentId ${input.clientStudentId} does not match the authenticated student.`);
        }
        const record = {
            clientEventId: input.clientEventId,
            testId: input.testId,
            mode: input.mode,
            questionBankVersion: input.questionBankVersion ?? null,
            blueprintVersion: input.blueprintVersion ?? null,
            totalQuestions: input.totalQuestions,
            correctCount: input.correctCount,
            wrongCount: input.wrongCount,
            score: input.score,
            wrongQuestionIds: input.wrongQuestionIds ?? [],
            completedAt: input.completedAt,
            studentProfileId: identity.profileId,
            authUserId: identity.authUserId,
        };
        try {
            const inserted = await this.repository.insert(record);
            return { result: inserted, alreadySynced: false };
        }
        catch (error) {
            if (!isUniqueViolation(error)) {
                throw error;
            }
            const existing = await this.repository.findByClientEventId(input.clientEventId);
            if (existing === undefined) {
                throw error;
            }
            return { result: existing, alreadySynced: true };
        }
    }
    async getHistory(studentProfileId) {
        return this.repository.findByStudentProfileId(studentProfileId);
    }
}
