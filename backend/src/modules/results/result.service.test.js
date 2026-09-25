import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { ResultService } from './result.service.js';
const IDENTITY = {
    profileId: '00000000-0000-4000-8000-000000000001',
    authUserId: '00000000-0000-4000-8000-000000000002',
    studentId: 'PRN001',
};
const baseInput = {
    clientEventId: 'event-1',
    testId: 'TEST-001',
    mode: 'EXAM',
    totalQuestions: 25,
    correctCount: 20,
    wrongCount: 5,
    score: 80,
    wrongQuestionIds: ['Q1832', 'Q2451', 'Q0912', 'Q0777', 'Q1234'],
    completedAt: new Date('2026-08-26T10:00:00.000Z'),
};
const uniqueViolationError = () => Object.assign(new Error('duplicate key value violates unique constraint "test_result_client_event_id_unique"'), { code: '23505' });
class FakeResultRepository {
    rows = [];
    /** Successful writes only — a constraint-violated insert creates no row. */
    insertCalls = 0;
    failNextInsertWithUniqueViolation = false;
    async findByClientEventId(clientEventId) {
        return this.rows.find((row) => row.clientEventId === clientEventId);
    }
    async insert(record) {
        if (this.failNextInsertWithUniqueViolation || this.rows.some((row) => row.clientEventId === record.clientEventId)) {
            throw uniqueViolationError();
        }
        this.insertCalls += 1;
        const inserted = { ...record, id: `result-${this.insertCalls}`, syncedAt: new Date() };
        this.rows.push(inserted);
        return inserted;
    }
}
test('the first sync stores a server-owned result and reports a fresh acknowledgement', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    const outcome = await service.sync(IDENTITY, baseInput);
    assert.equal(outcome.alreadySynced, false);
    assert.equal(outcome.result.studentProfileId, IDENTITY.profileId);
    assert.equal(outcome.result.authUserId, IDENTITY.authUserId);
    assert.equal(outcome.result.clientEventId, 'event-1');
    assert.equal(outcome.result.totalQuestions, 25);
    assert.equal(outcome.result.correctCount, 20);
    assert.equal(outcome.result.wrongCount, 5);
    assert.deepEqual(outcome.result.wrongQuestionIds, ['Q1832', 'Q2451', 'Q0912', 'Q0777', 'Q1234']);
    assert.equal(outcome.result.questionBankVersion, null);
    assert.equal(outcome.result.blueprintVersion, null);
    assert.equal(repository.insertCalls, 1);
});
test('a duplicate retry replays the stored result without writing again', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    const first = await service.sync(IDENTITY, baseInput);
    // The fake repository also enforces uniqueness, emulating the racing-retry path.
    const replay = await service.sync(IDENTITY, baseInput);
    assert.equal(first.alreadySynced, false);
    assert.equal(replay.alreadySynced, true);
    assert.equal(replay.result.id, first.result.id);
    assert.equal(replay.result.clientEventId, first.result.clientEventId);
    assert.equal(repository.insertCalls, 1);
    assert.equal(repository.rows.length, 1);
});
test('a lost insert race replays the already-stored record instead of failing', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    await service.sync(IDENTITY, baseInput);
    // Simulate the constraint firing even though the application-level lookup
    // happens only after the violation — e.g. two near-simultaneous retries.
    repository.failNextInsertWithUniqueViolation = true;
    const replay = await service.sync(IDENTITY, baseInput);
    assert.equal(replay.alreadySynced, true);
    assert.equal(replay.result.id, 'result-1');
});
test('a wrapped driver violation (DrizzleQueryError.cause) still replays', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    await service.sync(IDENTITY, baseInput);
    // Real drivers wrap pg errors (drizzle-orm → DrizzleQueryError → cause.code).
    repository.insert = async () => {
        throw Object.assign(new Error('insert failed'), {
            cause: Object.assign(new Error('duplicate key'), { code: '23505' }),
        });
    };
    const replay = await service.sync(IDENTITY, baseInput);
    assert.equal(replay.alreadySynced, true);
    assert.equal(replay.result.id, 'result-1');
});
test('an advisory client student id that disagrees with the verified identity is rejected', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    await assert.rejects(service.sync(IDENTITY, { ...baseInput, clientStudentId: 'PRN999' }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'IDENTITY_MISMATCH');
        return true;
    });
    assert.equal(repository.insertCalls, 0);
});
test('a unique violation without a matching stored row rethrows', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    repository.rows.push({
        ...baseInput,
        id: 'phantom-marker',
        syncedAt: new Date(),
        clientEventId: 'other-event',
        studentProfileId: IDENTITY.profileId,
        authUserId: IDENTITY.authUserId,
    });
    repository.failNextInsertWithUniqueViolation = true;
    await assert.rejects(service.sync(IDENTITY, baseInput), (error) => {
        assert.equal(error.code, '23505');
        return true;
    });
});
test('non-uniqueness failures propagate untouched', async () => {
    const repository = new FakeResultRepository();
    const service = new ResultService(repository);
    repository.insert = async () => {
        throw new Error('connection refused');
    };
    await assert.rejects(service.sync(IDENTITY, baseInput), /connection refused/);
});
