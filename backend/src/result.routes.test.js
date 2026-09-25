import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { ResultService } from './modules/results/result.service.js';
import { StudentIdentityService } from './modules/student-access/student-identity.service.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }] = await Promise.all([import('./app.js')]);
const PROFILE_ID = '00000000-0000-4000-8000-000000000001';
const AUTH_USER_ID = '00000000-0000-4000-8000-000000000002';
const uniqueViolationError = () => Object.assign(new Error('duplicate key'), { code: '23505' });
class FakeResultRepository {
    rows = [];
    /** Successful writes only — a constraint-violated insert creates no row. */
    insertCalls = 0;
    async findByClientEventId(clientEventId) {
        return this.rows.find((row) => row.clientEventId === clientEventId);
    }
    async insert(record) {
        if (this.rows.some((row) => row.clientEventId === record.clientEventId)) {
            throw uniqueViolationError();
        }
        this.insertCalls += 1;
        const inserted = {
            ...record,
            id: `result-${this.insertCalls}`,
            syncedAt: new Date(),
            questionBankVersion: record.questionBankVersion ?? null,
            blueprintVersion: record.blueprintVersion ?? null,
            wrongQuestionIds: record.wrongQuestionIds ?? [],
        };
        this.rows.push(inserted);
        return inserted;
    }
}
const resolvedIdentity = (authUserId, accessStatus) => {
    const profile = {
        id: PROFILE_ID,
        studentId: 'PRN001',
        name: 'Sync Student',
        email: null,
        mobile: null,
        instituteId: 'INST001',
        batchId: 'BATCH001',
        photoPath: null,
        courseInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const access = {
        id: '00000000-0000-4000-8000-000000000003',
        studentProfileId: PROFILE_ID,
        authUserId,
        status: accessStatus,
        accessGrantedAt: new Date(),
        accessExpiryAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    return { profile, access };
};
const startFixture = ({ roles = ['STUDENT'], repository = new FakeResultRepository(), accessStatus = 'ACTIVE', } = {}) => {
    const tokenVerifier = {
        verify: async (accessToken) => {
            if (accessToken !== 'verified-token') {
                throw new Error('Invalid token');
            }
            return { authUserId: AUTH_USER_ID, roles };
        },
    };
    const studentIdentityService = new StudentIdentityService(async (authUserId) => authUserId === AUTH_USER_ID ? resolvedIdentity(authUserId, accessStatus) : undefined);
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
        studentIdentityService,
        resultService: new ResultService(repository),
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    return once(server, 'listening').then(() => {
        const address = server.address();
        return {
            url: `http://127.0.0.1:${address.port}`,
            close: async () => {
                server.close();
                await once(server, 'close');
            },
        };
    });
};
const validPayload = {
    clientEventId: '5f0d3c8e-9b2a-4c1d-8e7f-6a5b4c3d2e1f',
    clientStudentId: 'PRN001',
    testId: 'TEST-001',
    mode: 'EXAM',
    questionBankVersion: 'qb-2026.1',
    blueprintVersion: 'bp-2026.1',
    totalQuestions: 25,
    correctCount: 20,
    wrongCount: 5,
    score: 80,
    wrongQuestionIds: ['Q1832', 'Q2451', 'Q0912', 'Q0777', 'Q1234'],
    completedAt: '2026-08-26T10:00:00.000Z',
};
const postSync = async (url, body, authenticated = true) => fetch(`${url}/api/v1/results/sync`, {
    method: 'POST',
    headers: {
        ...(authenticated ? { authorization: 'Bearer verified-token' } : {}),
        'content-type': 'application/json',
    },
    body: JSON.stringify(body),
});
test('result sync requires authentication', async () => {
    const fixture = await startFixture();
    try {
        const response = await postSync(fixture.url, validPayload, false);
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error.code, 'AUTHENTICATION_ERROR');
    }
    finally {
        await fixture.close();
    }
});
test('result sync rejects non-student roles', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ roles: ['ADMIN'], repository });
    try {
        const response = await postSync(fixture.url, validPayload);
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, 'AUTHORIZATION_ERROR');
        assert.equal(repository.insertCalls, 0);
    }
    finally {
        await fixture.close();
    }
});
test('the first write returns the created result with a fresh acknowledgement', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ repository });
    try {
        const response = await postSync(fixture.url, validPayload);
        assert.equal(response.status, 200);
        const body = (await response.json());
        assert.equal(body.success, true);
        assert.equal(body.data.alreadySynced, false);
        assert.equal(body.data.result.clientEventId, validPayload.clientEventId);
        // Ownership is stamped from the verified identity, not the payload.
        assert.equal(body.data.result.studentProfileId, PROFILE_ID);
        assert.equal(body.data.result.authUserId, AUTH_USER_ID);
        assert.deepEqual(body.data.result.wrongQuestionIds, validPayload.wrongQuestionIds);
        assert.equal(repository.insertCalls, 1);
    }
    finally {
        await fixture.close();
    }
});
test('a duplicate retry is an idempotent no-op', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ repository });
    try {
        const first = await postSync(fixture.url, validPayload);
        const retry = await postSync(fixture.url, validPayload);
        assert.equal(first.status, 200);
        assert.equal(retry.status, 200);
        const firstBody = (await first.json());
        const retryBody = (await retry.json());
        assert.equal(firstBody.data.alreadySynced, false);
        assert.equal(retryBody.data.alreadySynced, true);
        assert.equal(retryBody.data.result.id, firstBody.data.result.id);
        assert.equal(repository.insertCalls, 1);
    }
    finally {
        await fixture.close();
    }
});
test('a mismatched advisory student id is rejected before any write', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ repository });
    try {
        const response = await postSync(fixture.url, { ...validPayload, clientStudentId: 'PRN999' });
        assert.equal(response.status, 403);
        const body = (await response.json());
        assert.equal(body.error.code, 'IDENTITY_MISMATCH');
        assert.match(body.error.message, /PRN999/);
        assert.equal(repository.insertCalls, 0);
    }
    finally {
        await fixture.close();
    }
});
test('counts that exceed or disagree with the total fail validation', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ repository });
    try {
        for (const payload of [
            { ...validPayload, correctCount: 30 },
            { ...validPayload, correctCount: -1 },
            { ...validPayload, correctCount: 15, wrongCount: 15 },
            { ...validPayload, wrongQuestionIds: ['Q1832'] },
        ]) {
            const response = await postSync(fixture.url, payload);
            assert.equal(response.status, 400);
            assert.equal((await response.json()).error.code, 'VALIDATION_ERROR', `payload ${JSON.stringify(payload)} should be rejected`);
        }
        assert.equal(repository.insertCalls, 0);
    }
    finally {
        await fixture.close();
    }
});
test('inactive student access cannot submit results', async () => {
    const repository = new FakeResultRepository();
    const fixture = await startFixture({ repository, accessStatus: 'REVOKED' });
    try {
        const response = await postSync(fixture.url, validPayload);
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, 'STUDENT_ACCESS_INACTIVE');
        assert.equal(repository.insertCalls, 0);
    }
    finally {
        await fixture.close();
    }
});
