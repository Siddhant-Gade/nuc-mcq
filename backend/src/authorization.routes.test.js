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
test('unauthenticated student can submit an authorization request with PRN', async () => {
    const fakeRepo = {
        created: [],
        pendingByProfile: new Map(),
        async findPendingByStudentProfileId(profileId) {
            return this.pendingByProfile.get(profileId);
        },
        async create(studentProfileId, authUserId) {
            const req = { id: 'req-1', studentProfileId, authUserId, status: 'PENDING' };
            this.created.push(req);
            this.pendingByProfile.set(studentProfileId, req);
            return req;
        },
    };
    const authService = new StubAuthorizationRequestService();
    authService.repository = fakeRepo;

    const studentIdentityService = {
        findByStudentId: async (prn) => {
            if (prn === 'PRN001') {
                return {
                    profile: { id: 'prof-1', studentId: 'PRN001', name: 'John Doe' },
                    access: { status: 'PENDING' },
                };
            }
            if (prn === 'PRN_ACTIVE') {
                return {
                    profile: { id: 'prof-2', studentId: 'PRN_ACTIVE', name: 'Active Student' },
                    access: { status: 'ACTIVE' },
                };
            }
            return undefined;
        },
    };

    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier: verifierForRoles(['ADMIN']),
        studentService: {},
        batchService: {},
        authorizationRequestService: authService,
        dashboardService: new StubDashboardService({ totalStudents: 0, activeStudents: 0, pendingAuthorizations: 0, totalBatches: 0, activeBatches: 0, fullBatches: 0 }),
        studentIdentityService,
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}`;

    try {
        // Missing PRN -> 400
        const badRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prn: '' }),
        });
        assert.equal(badRes.status, 400);

        // Unknown PRN -> 404
        const notFoundRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prn: 'UNKNOWN_999' }),
        });
        assert.equal(notFoundRes.status, 404);

        // Already active -> 409
        const activeRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prn: 'PRN_ACTIVE' }),
        });
        assert.equal(activeRes.status, 409);

        // Valid pending student -> 201
        const successRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prn: 'PRN001' }),
        });
        assert.equal(successRes.status, 201);
        const successBody = await successRes.json();
        assert.equal(successBody.data.status, 'PENDING');
        assert.equal(successBody.data.studentName, 'John Doe');

        // Re-requesting -> 200 with alreadyPending
        const dupRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ prn: 'PRN001' }),
        });
        assert.equal(dupRes.status, 200);
        const dupBody = await dupRes.json();
        assert.equal(dupBody.data.alreadyPending, true);
    } finally {
        server.close();
        await once(server, 'close');
    }
});

test('unauthenticated student can submit an authorization request with Gmail / email without PRN', async () => {
    const fakeRepo = {
        created: [],
        pendingByProfile: new Map(),
        async findPendingByStudentProfileId(profileId) {
            return this.pendingByProfile.get(profileId);
        },
        async create(studentProfileId, authUserId) {
            const req = { id: `req-${this.created.length + 1}`, studentProfileId, authUserId, status: 'PENDING' };
            this.created.push(req);
            this.pendingByProfile.set(studentProfileId, req);
            return req;
        },
    };
    const authService = new StubAuthorizationRequestService();
    authService.repository = fakeRepo;

    const studentProfilesMap = new Map();
    studentProfilesMap.set('student@gmail.com', {
        profile: { id: 'prof-email-1', studentId: 'PRN-EM-1', name: 'Existing Student', email: 'student@gmail.com' },
        access: { status: 'PENDING' },
    });
    studentProfilesMap.set('active@gmail.com', {
        profile: { id: 'prof-email-2', studentId: 'PRN-EM-2', name: 'Active Gmail Student', email: 'active@gmail.com' },
        access: { status: 'ACTIVE' },
    });

    const studentIdentityService = {
        findByStudentId: async () => undefined,
        findByEmail: async (email) => studentProfilesMap.get(email.toLowerCase()),
    };

    authService.batchRepository = {
        async list() {
            return [{ batchId: 'BATCH_AUTO_01', name: 'Auto Assigned Batch' }];
        },
    };

    authService.studentRepository = {
        async create(input) {
            const newStudent = { id: `prof-new-${Date.now()}`, ...input };
            studentProfilesMap.set(input.email.toLowerCase(), {
                profile: newStudent,
                access: { status: 'PENDING' },
            });
            return newStudent;
        },
    };

    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier: verifierForRoles(['ADMIN']),
        studentService: {},
        batchService: {},
        authorizationRequestService: authService,
        dashboardService: new StubDashboardService({ totalStudents: 0, activeStudents: 0, pendingAuthorizations: 0, totalBatches: 0, activeBatches: 0, fullBatches: 0 }),
        studentIdentityService,
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}`;

    try {
        // 1. Invalid email format -> 400
        const invalidRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email' }),
        });
        assert.equal(invalidRes.status, 400);

        // 2. Existing profile by email (PENDING) -> 201
        const existingRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'student@gmail.com' }),
        });
        assert.equal(existingRes.status, 201);
        const existingBody = await existingRes.json();
        assert.equal(existingBody.data.status, 'PENDING');
        assert.equal(existingBody.data.studentName, 'Existing Student');
        assert.equal(existingBody.data.email, 'student@gmail.com');

        // 3. Re-submitting existing profile -> 200 with alreadyPending
        const reSubmitRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'student@gmail.com' }),
        });
        assert.equal(reSubmitRes.status, 200);
        const reSubmitBody = await reSubmitRes.json();
        assert.equal(reSubmitBody.data.alreadyPending, true);

        // 4. Already active student -> 409
        const activeRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'active@gmail.com' }),
        });
        assert.equal(activeRes.status, 409);

        // 5. Brand new student without pre-existing profile -> creates pending profile and authorization request (201)
        const brandNewRes = await fetch(`${url}/api/v1/authorization-requests/request`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email: 'newstudent@gmail.com', name: 'New Student' }),
        });
        assert.equal(brandNewRes.status, 201);
        const brandNewBody = await brandNewRes.json();
        assert.equal(brandNewBody.data.status, 'PENDING');
        assert.equal(brandNewBody.data.studentName, 'New Student');
        assert.equal(brandNewBody.data.email, 'newstudent@gmail.com');
        assert.equal(studentProfilesMap.get('newstudent@gmail.com').profile.batchId, 'BATCH_AUTO_01');
    } finally {
        server.close();
        await once(server, 'close');
    }
});
