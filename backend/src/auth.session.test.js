import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';

process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';

const [{ createApp }, { SessionService }, { StudentService }, { ApiError }] = await Promise.all([
    import('./app.js'),
    import('./modules/auth/session.service.js'),
    import('./modules/students/student.service.js'),
    import('./utils/api-error.js'),
]);

class MockStudentRepo {
    students = [];
    accessRecords = [];
    sequence = 0;

    nextId() {
        this.sequence += 1;
        return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`;
    }

    async findById(id) {
        return this.students.find(s => s.id === id);
    }

    async findByStudentId(studentId) {
        const s = this.students.find(st => st.studentId === studentId);
        if (!s) return undefined;
        const access = this.accessRecords.find(a => a.studentProfileId === s.id);
        return { profile: s, access };
    }

    async findAccessByStudentId(studentProfileId) {
        return this.accessRecords.find(a => a.studentProfileId === studentProfileId);
    }

    async updateAccessStatus(id, status, metadata = {}) {
        const access = this.accessRecords.find(a => a.studentProfileId === id);
        if (access) {
            access.status = status;
            if (status === 'SUSPENDED') {
                access.suspendedAt = new Date();
                access.suspendedBy = metadata.suspendedBy;
                access.suspensionReason = metadata.reason;
            } else if (status === 'ACTIVE') {
                access.suspendedAt = null;
                access.suspendedBy = null;
                access.suspensionReason = null;
            }
        }
        return access;
    }

    async create(input) {
        if (this.students.some(s => s.studentId === input.studentId)) {
            const err = new Error('duplicate key');
            err.code = '23505';
            err.detail = 'Key (student_id)=(...) already exists';
            throw err;
        }
        if (input.email && this.students.some(s => s.email === input.email)) {
            const err = new Error('duplicate key');
            err.code = '23505';
            err.detail = 'Key (email)=(...) already exists';
            throw err;
        }
        const s = { id: this.nextId(), ...input, createdAt: new Date() };
        this.students.push(s);
        const a = {
            id: this.nextId(),
            studentProfileId: s.id,
            authUserId: `auth-${s.id}`,
            status: 'PENDING',
        };
        this.accessRecords.push(a);
        return { ...s, accessStatus: a.status };
    }
}

const createTestFixture = async (options = {}) => {
    const sessionService = options.sessionService ?? new SessionService(null, { idleTimeoutMs: 1000, absoluteTimeoutMs: 5000 });
    const studentRepo = options.studentRepo ?? new MockStudentRepo();
    const studentService = new StudentService(studentRepo, sessionService);

    const tokenVerifier = {
        async verify(token) {
            if (token === 'invalid-jwt') {
                throw new Error('Invalid JWT');
            }
            if (token === 'admin-jwt') {
                return { authUserId: 'admin-user-id', roles: ['ADMIN'], email: 'admin@example.com' };
            }
            if (token === 'student-jwt') {
                return { authUserId: 'student-user-id', roles: ['STUDENT'], email: 'student@example.com' };
            }
            return { authUserId: 'unknown-user-id', roles: [] };
        },
    };

    const studentIdentityService = {
        async resolve(authUserId) {
            const access = studentRepo.accessRecords.find(a => a.authUserId === authUserId);
            if (!access) return undefined;
            const profile = studentRepo.students.find(s => s.id === access.studentProfileId);
            return { profile, access };
        },
        async requireActive(authUserId) {
            const access = studentRepo.accessRecords.find(a => a.authUserId === authUserId);
            if (!access) throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student linked');
            if (access.status === 'SUSPENDED') {
                throw new ApiError(403, 'STUDENT_ACCESS_SUSPENDED', access.suspensionReason || 'Access suspended');
            }
            if (access.status !== 'ACTIVE') {
                throw new ApiError(403, 'STUDENT_ACCESS_INACTIVE', 'Access not active');
            }
            const profile = studentRepo.students.find(s => s.id === access.studentProfileId);
            return { profile, access };
        },
    };

    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173', 'http://localhost:5174'],
        tokenVerifier,
        sessionService,
        studentService,
        studentIdentityService,
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });

    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address();

    return {
        url: `http://127.0.0.1:${port}`,
        sessionService,
        studentService,
        studentRepo,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};

test('POST /api/v1/auth/session: valid Supabase JWT creates browser session and sets HttpOnly cookie', async () => {
    const fixture = await createTestFixture();
    try {
        const res = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer admin-jwt',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ clientType: 'ADMIN_WEB' }),
        });

        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.ok(body.data.identity);
        assert.equal(body.data.identity.authUserId, 'admin-user-id');
        assert.ok(body.data.expiresAt);
        // Raw token must never be in the response body!
        assert.equal(body.data.token, undefined);

        // Check Set-Cookie header
        const setCookie = res.headers.get('set-cookie');
        assert.ok(setCookie, 'Set-Cookie header should be present');
        assert.match(setCookie, /nuc_session=/);
        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Lax/i);
        assert.match(setCookie, /Path=\//);
    } finally {
        await fixture.close();
    }
});

test('POST /api/v1/auth/session: invalid JWT is rejected with 401', async () => {
    const fixture = await createTestFixture();
    try {
        const res = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer invalid-jwt',
            },
        });
        assert.equal(res.status, 401);
    } finally {
        await fixture.close();
    }
});

test('GET /api/v1/auth/session: authenticates with valid session cookie', async () => {
    const fixture = await createTestFixture();
    try {
        // Step 1: create session
        const loginRes = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: { authorization: 'Bearer admin-jwt' },
        });
        const cookieHeader = loginRes.headers.get('set-cookie');
        const cookieVal = cookieHeader.split(';')[0];

        // Step 2: call GET /api/v1/auth/session with cookie
        const res = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: { cookie: cookieVal },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(body.data.identity.authUserId, 'admin-user-id');
    } finally {
        await fixture.close();
    }
});

test('GET /api/v1/auth/session: returns 401 when no session cookie or token is provided', async () => {
    const fixture = await createTestFixture();
    try {
        const res = await fetch(`${fixture.url}/api/v1/auth/session`);
        assert.equal(res.status, 401);
    } finally {
        await fixture.close();
    }
});

test('Protected endpoint: falls back to Bearer JWT when cookie is absent (Flutter support)', async () => {
    const fixture = await createTestFixture();
    try {
        const res = await fetch(`${fixture.url}/api/v1/admin/access-check`, {
            headers: { authorization: 'Bearer admin-jwt' },
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
    } finally {
        await fixture.close();
    }
});

test('POST /api/v1/auth/logout: revokes session and clears nuc_session cookie', async () => {
    const fixture = await createTestFixture();
    try {
        // 1. Create session
        const loginRes = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: { authorization: 'Bearer admin-jwt' },
        });
        const cookieVal = loginRes.headers.get('set-cookie').split(';')[0];

        // 2. Logout
        const logoutRes = await fetch(`${fixture.url}/api/v1/auth/logout`, {
            method: 'POST',
            headers: { cookie: cookieVal },
        });
        assert.equal(logoutRes.status, 200);
        const logoutCookie = logoutRes.headers.get('set-cookie');
        assert.ok(logoutCookie.includes('nuc_session=;'));

        // 3. Verify old session cookie is rejected
        const sessionCheck = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: { cookie: cookieVal },
        });
        assert.equal(sessionCheck.status, 401);
    } finally {
        await fixture.close();
    }
});

test('Student suspension: Admin can suspend student, revokes active browser sessions, and blocks access with 403', async () => {
    const fixture = await createTestFixture();
    try {
        // 1. Seed a student
        const student = await fixture.studentRepo.create({
            studentId: 'STU999',
            name: 'Test Student',
            instituteId: 'INST001',
            batchId: 'BATCH01',
            email: 'stu999@example.com',
        });
        // Activate student
        await fixture.studentRepo.updateAccessStatus(student.id, 'ACTIVE');

        // 2. Student logs in and gets a session
        const studentSession = await fixture.sessionService.createSession({
            authUserId: `auth-${student.id}`,
            clientType: 'STUDENT_WEB',
            identity: {
                authUserId: `auth-${student.id}`,
                roles: ['STUDENT'],
                studentId: 'STU999',
            },
        });

        // 3. Admin suspends student
        const suspendRes = await fetch(`${fixture.url}/api/v1/students/${student.id}/suspend`, {
            method: 'PATCH',
            headers: {
                authorization: 'Bearer admin-jwt',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ reason: 'Academic policy violation' }),
        });
        assert.equal(suspendRes.status, 200);
        const suspendBody = await suspendRes.json();
        assert.equal(suspendBody.data.accessStatus, 'SUSPENDED');
        assert.equal(suspendBody.data.suspensionReason, 'Academic policy violation');

        // 4. Verify student browser session was revoked!
        const validateStudent = await fixture.sessionService.validateSession(studentSession.rawToken);
        assert.equal(validateStudent, null, 'Active browser session should be revoked upon suspension');

        // 5. Restore student
        const restoreRes = await fetch(`${fixture.url}/api/v1/students/${student.id}/restore`, {
            method: 'PATCH',
            headers: { authorization: 'Bearer admin-jwt' },
        });
        assert.equal(restoreRes.status, 200);
        const restoreBody = await restoreRes.json();
        assert.equal(restoreBody.data.accessStatus, 'ACTIVE');
    } finally {
        await fixture.close();
    }
});

test('CORS: includes Access-Control-Allow-Credentials: true for allowed origins', async () => {
    const fixture = await createTestFixture();
    try {
        const res = await fetch(`${fixture.url}/health`, {
            headers: { origin: 'http://localhost:5173' },
        });
        assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
        assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    } finally {
        await fixture.close();
    }
});

test('Session lifecycle: expired and manually revoked sessions are rejected', async () => {
    const fixture = await createTestFixture();
    try {
        // Create an expired session (ttl = 0s)
        const expired = await fixture.sessionService.createSession({
            authUserId: 'u1',
            clientType: 'ADMIN_WEB',
            identity: { authUserId: 'u1', roles: ['ADMIN'] },
            ttlSeconds: -1,
        });
        const validatedExpired = await fixture.sessionService.validateSession(expired.rawToken);
        assert.equal(validatedExpired, null, 'Expired session should not validate');

        // Create a valid session and revoke it
        const valid = await fixture.sessionService.createSession({
            authUserId: 'u2',
            clientType: 'ADMIN_WEB',
            identity: { authUserId: 'u2', roles: ['ADMIN'] },
            ttlSeconds: 3600,
        });
        await fixture.sessionService.revokeSession(valid.rawToken);
        const validatedRevoked = await fixture.sessionService.validateSession(valid.rawToken);
        assert.equal(validatedRevoked, null, 'Revoked session should not validate');
    } finally {
        await fixture.close();
    }
});

test('Non-admin cannot suspend student (returns 403)', async () => {
    const fixture = await createTestFixture();
    try {
        const student = await fixture.studentRepo.create({
            studentId: 'STU123',
            name: 'Student 123',
            instituteId: 'INST001',
            batchId: 'BATCH01',
        });
        const res = await fetch(`${fixture.url}/api/v1/students/${student.id}/suspend`, {
            method: 'PATCH',
            headers: {
                authorization: 'Bearer student-jwt',
                'content-type': 'application/json',
            },
            body: JSON.stringify({ reason: 'Unauthorized attempt' }),
        });
        assert.equal(res.status, 403);
    } finally {
        await fixture.close();
    }
});

test('Add Student: duplicate PRN and Email are rejected with 409', async () => {
    const fixture = await createTestFixture();
    try {
        const payload1 = {
            studentId: 'STU500',
            name: 'First Student',
            instituteId: 'INST001',
            batchId: 'BATCH01',
            email: 'stu500@example.com',
        };
        const res1 = await fetch(`${fixture.url}/api/v1/students`, {
            method: 'POST',
            headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
            body: JSON.stringify(payload1),
        });
        assert.equal(res1.status, 201);

        // Duplicate PRN
        const resDupPrn = await fetch(`${fixture.url}/api/v1/students`, {
            method: 'POST',
            headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
            body: JSON.stringify({ ...payload1, email: 'other@example.com' }),
        });
        assert.equal(resDupPrn.status, 409);
        const dupPrnBody = await resDupPrn.json();
        assert.equal(dupPrnBody.success, false);
        assert.equal(dupPrnBody.error.code, 'CONFLICT');

        // Duplicate Email
        const resDupEmail = await fetch(`${fixture.url}/api/v1/students`, {
            method: 'POST',
            headers: { authorization: 'Bearer admin-jwt', 'content-type': 'application/json' },
            body: JSON.stringify({ ...payload1, studentId: 'STU501' }),
        });
        assert.equal(resDupEmail.status, 409);
        const dupEmailBody = await resDupEmail.json();
        assert.equal(dupEmailBody.success, false);
        assert.equal(dupEmailBody.error.code, 'CONFLICT');
    } finally {
        await fixture.close();
    }
});

