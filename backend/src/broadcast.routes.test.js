import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { StudentIdentityService } from './modules/student-access/student-identity.service.js';
import { ApiError } from './utils/api-error.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }, { BroadcastService }] = await Promise.all([
    import('./app.js'),
    import('./modules/broadcasts/broadcast.service.js'),
]);
const ADMIN_ID = '00000000-0000-4000-8000-00000000a001';
const broadcastView = (overrides = {}) => ({
    id: 'broadcast-1',
    title: 'Notice',
    message: 'Body',
    status: 'DRAFT',
    audienceType: 'ALL',
    targetBatchIds: [],
    publishedAt: null,
    createdBy: ADMIN_ID,
    createdAt: new Date('2026-08-26T08:00:00Z'),
    updatedAt: new Date('2026-08-26T08:00:00Z'),
    ...overrides,
});
class StubBroadcastService extends BroadcastService {
    views;
    createCalls = [];
    publishCalls = [];
    removeCalls = [];
    constructor(views = [broadcastView()]) {
        super({});
        this.views = views;
    }
    async list() {
        return this.views;
    }
    async getById(id) {
        const view = this.views.find((candidate) => candidate.id === id);
        if (view === undefined) {
            throw new ApiError(404, 'NOT_FOUND', `No broadcast with id ${id} was found.`);
        }
        return view;
    }
    async create(createdByAuthUserId, input) {
        this.createCalls.push({ createdBy: createdByAuthUserId, input });
        return broadcastView({ id: `broadcast-${this.createCalls.length + 1}`, ...input, createdBy: createdByAuthUserId });
    }
    async update() {
        const view = this.views[0];
        if (view === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Nothing stored in stub.');
        }
        return view;
    }
    async publish(id) {
        if (this.publishCalls.includes(id)) {
            throw new ApiError(409, 'CONFLICT', `Broadcast ${id} is already published.`);
        }
        this.publishCalls.push(id);
        return broadcastView({ id, status: 'PUBLISHED', publishedAt: new Date() });
    }
    async remove(id) {
        this.removeCalls.push(id);
    }
    async listForStudent(batchId) {
        return this.views.filter((view) => view.audienceType === 'ALL' || view.targetBatchIds.includes(batchId));
    }
}
const PROFILE_ID = '00000000-0000-4000-8000-00000000b001';
const AUTH_USER_ID = '00000000-0000-4000-8000-00000000b002';
const resolvedStudentIdentity = () => {
    const profile = {
        id: PROFILE_ID,
        studentId: 'PRN001',
        name: 'Broadcast Student',
        email: null,
        mobile: null,
        instituteId: 'INST001',
        batchId: 'BATCH-001',
        photoPath: null,
        courseInfo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    const access = {
        id: '00000000-0000-4000-8000-00000000b003',
        studentProfileId: PROFILE_ID,
        authUserId: AUTH_USER_ID,
        status: 'ACTIVE',
        accessGrantedAt: new Date(),
        accessExpiryAt: null,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    return { profile, access };
};
class StubDashboardService extends DashboardService {
    constructor() {
        super({});
    }
    async getStats() {
        return { totalStudents: 0, activeStudents: 0, pendingAuthorizations: 0, totalBatches: 0, activeBatches: 0, fullBatches: 0 };
    }
}
const verifierForRoles = (roles, authUserId = 'verified-user-id') => ({
    verify: async (accessToken) => {
        if (accessToken !== 'verified-token') {
            throw new Error('Invalid token');
        }
        return { authUserId, roles };
    },
});
const startFixture = ({ roles = ['ADMIN'], service = new StubBroadcastService(), studentIdentityService, authUserId = 'verified-user-id', } = {}) => {
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier: verifierForRoles(roles, authUserId),
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: new StubDashboardService(),
        studentIdentityService: studentIdentityService ?? {},
        resultService: {},
        broadcastService: service,
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    return once(server, 'listening').then(() => {
        const address = server.address();
        return {
            service,
            url: `http://127.0.0.1:${address.port}`,
            close: async () => {
                server.close();
                await once(server, 'close');
            },
        };
    });
};
test('broadcast admin routes require authentication', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/broadcasts`);
        assert.equal(response.status, 401);
    }
    finally {
        await fixture.close();
    }
});
test('broadcast admin routes reject non-admin roles', async () => {
    const fixture = await startFixture({ roles: ['STUDENT'] });
    try {
        const response = await fetch(`${fixture.url}/api/v1/broadcasts`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 403);
    }
    finally {
        await fixture.close();
    }
});
test('creating a broadcast returns 201 and stamps the JWT-derived creator', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/broadcasts`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            // Body-supplied identity must be ignored entirely.
            body: JSON.stringify({
                title: 'Holiday Notice',
                message: 'Closed on the 15th.',
                audienceType: 'BATCH',
                targetBatchIds: ['BATCH-001'],
                createdBy: 'spoofed-admin-id',
            }),
        });
        assert.equal(response.status, 201);
        const body = (await response.json());
        assert.equal(body.data.createdBy, 'verified-user-id');
        assert.deepEqual(body.data.targetBatchIds, ['BATCH-001']);
        assert.equal(fixture.service.createCalls[0]?.createdBy, 'verified-user-id');
    }
    finally {
        await fixture.close();
    }
});
test('a batch-audience broadcast without targets fails validation', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/broadcasts`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            body: JSON.stringify({ title: 'Notice', message: 'Body', audienceType: 'BATCH', targetBatchIds: [] }),
        });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    }
    finally {
        await fixture.close();
    }
});
test('publishing twice conflicts on the second attempt', async () => {
    const fixture = await startFixture();
    try {
        const first = await fetch(`${fixture.url}/api/v1/broadcasts/broadcast-1/publish`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(first.status, 200);
        assert.equal((await first.json()).data.status, 'PUBLISHED');
        const second = await fetch(`${fixture.url}/api/v1/broadcasts/broadcast-1/publish`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(second.status, 409);
        assert.equal((await second.json()).error.code, 'CONFLICT');
    }
    finally {
        await fixture.close();
    }
});
test('deletion is acknowledged and forwarded to the service', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/broadcasts/broadcast-1`, {
            method: 'DELETE',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: { deleted: true } });
        assert.deepEqual(fixture.service.removeCalls, ['broadcast-1']);
    }
    finally {
        await fixture.close();
    }
});
test('the student endpoint requires the STUDENT role and ACTIVE access', async () => {
    const adminBlocked = new StubBroadcastService([broadcastView()]);
    const adminFixture = await startFixture({
        roles: ['ADMIN'],
        service: adminBlocked,
    });
    try {
        // ADMIN role hits requireRoles('STUDENT') → 403 before identity resolution.
        const response = await fetch(`${adminFixture.url}/api/v1/student/broadcasts`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 403);
    }
    finally {
        await adminFixture.close();
    }
});
test('an active student receives only broadcasts for ALL or their own batch', async () => {
    const identityService = new StudentIdentityService(async (authUserId) => authUserId === AUTH_USER_ID ? resolvedStudentIdentity() : undefined);
    const service = new StubBroadcastService([
        broadcastView({ id: 'all-notice', audienceType: 'ALL', targetBatchIds: [] }),
        broadcastView({ id: 'own-batch-notice', audienceType: 'BATCH', targetBatchIds: ['BATCH-001'] }),
        broadcastView({ id: 'other-batch-notice', audienceType: 'BATCH', targetBatchIds: ['BATCH-999'] }),
    ]);
    const fixture = await startFixture({
        roles: ['STUDENT'],
        service,
        studentIdentityService: identityService,
        authUserId: AUTH_USER_ID,
    });
    try {
        const response = await fetch(`${fixture.url}/api/v1/student/broadcasts`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        const body = (await response.json());
        assert.deepEqual(body.data.map((view) => view.id).sort(), ['all-notice', 'own-batch-notice']);
    }
    finally {
        await fixture.close();
    }
});
