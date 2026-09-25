import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { ApiError } from './utils/api-error.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }, { AuthorizationRequestService }, { DashboardService }] = await Promise.all([
    import('./app.js'),
    import('./modules/authorization/authorization.service.js'),
    import('./modules/dashboard/dashboard.service.js'),
]);
const REQUEST_ID = '00000000-0000-4000-8000-000000004242';
class StubAuthorizationRequestService extends AuthorizationRequestService {
    approveCalls = [];
    rejectCalls = [];
    constructor() {
        super({});
    }
    async list(_status) {
        void _status;
        return [];
    }
    async getById(id) {
        throw new ApiError(404, 'NOT_FOUND', `No request ${id} in stub.`);
    }
    async approve(id, reviewerAuthUserId) {
        this.approveCalls.push({ id, reviewer: reviewerAuthUserId });
        return {
            id,
            studentProfileId: REQUEST_ID,
            studentName: 'Stub Student',
            studentId: 'PRN001',
            prn: 'PRN001',
            authUserId: null,
            requestedAt: new Date(),
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: reviewerAuthUserId,
        };
    }
    async reject(id, reviewerAuthUserId) {
        this.rejectCalls.push(id);
        return {
            id,
            studentProfileId: REQUEST_ID,
            studentName: 'Stub Student',
            studentId: 'PRN001',
            prn: 'PRN001',
            authUserId: null,
            requestedAt: new Date(),
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: reviewerAuthUserId,
        };
    }
}
class StubDashboardService extends DashboardService {
    stats;
    constructor(stats) {
        super({});
        this.stats = stats;
    }
    async getStats() {
        return this.stats;
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
const startFixture = async (authorizationRequestService, dashboardService, tokenVerifier) => {
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService,
        dashboardService,
        studentIdentityService: {},
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};
const adminFixture = async (dashboardStats = {
    totalStudents: 0,
    activeStudents: 0,
    pendingAuthorizations: 0,
    totalBatches: 0,
    activeBatches: 0,
    fullBatches: 0,
}) => {
    const service = new StubAuthorizationRequestService();
    const fixture = await startFixture(service, new StubDashboardService(dashboardStats), verifierForRoles(['ADMIN']));
    return { service, ...fixture };
};
test('authorization request routes require authentication', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests`);
        assert.equal(response.status, 401);
    }
    finally {
        await fixture.close();
    }
});
test('authorization request routes reject non-admin roles', async () => {
    const service = new StubAuthorizationRequestService();
    const fixture = await startFixture(service, new StubDashboardService({ totalStudents: 0, activeStudents: 0, pendingAuthorizations: 0, totalBatches: 0, activeBatches: 0, fullBatches: 0 }), verifierForRoles(['STUDENT']));
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 403);
        assert.equal(service.approveCalls.length, 0);
    }
    finally {
        await fixture.close();
    }
});
test('the pending list endpoint is available to admins', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests/pending`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: [] });
    }
    finally {
        await fixture.close();
    }
});
test('approval forwards the JWT-derived reviewer identity and ignores any body value', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests/${REQUEST_ID}/approve`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            // Malicious/spoofed identity in the body must be ignored entirely.
            body: JSON.stringify({ reviewedBy: 'someone-else' }),
        });
        assert.equal(response.status, 200);
        assert.deepEqual(fixture.service.approveCalls, [
            { id: REQUEST_ID, reviewer: 'verified-user-id' },
        ]);
    }
    finally {
        await fixture.close();
    }
});
test('rejection also uses the verified identity context', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests/${REQUEST_ID}/reject`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(fixture.service.rejectCalls, [REQUEST_ID]);
    }
    finally {
        await fixture.close();
    }
});
test('a non-UUID request id returns a validation error', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/authorization-requests/not-a-uuid/approve`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    }
    finally {
        await fixture.close();
    }
});
test('dashboard stats require authentication', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/dashboard/stats`);
        assert.equal(response.status, 401);
    }
    finally {
        await fixture.close();
    }
});
test('dashboard stats reject non-admin roles', async () => {
    const service = new StubAuthorizationRequestService();
    const fixture = await startFixture(service, new StubDashboardService({ totalStudents: 0, activeStudents: 0, pendingAuthorizations: 0, totalBatches: 0, activeBatches: 0, fullBatches: 0 }), verifierForRoles(['STUDENT']));
    try {
        const response = await fetch(`${fixture.url}/api/v1/dashboard/stats`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 403);
    }
    finally {
        await fixture.close();
    }
});
test('dashboard stats return the exact admin UI shape for admins', async () => {
    const fixture = await adminFixture({
        totalStudents: 8,
        activeStudents: 4,
        pendingAuthorizations: 2,
        totalBatches: 4,
        activeBatches: 2,
        fullBatches: 1,
    });
    try {
        const response = await fetch(`${fixture.url}/api/v1/dashboard/stats`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true,
            data: {
                totalStudents: 8,
                activeStudents: 4,
                pendingAuthorizations: 2,
                totalBatches: 4,
                activeBatches: 2,
                fullBatches: 1,
            },
        });
    }
    finally {
        await fixture.close();
    }
});
