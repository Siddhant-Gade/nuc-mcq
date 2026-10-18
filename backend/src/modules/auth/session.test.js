import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import crypto from 'node:crypto';

process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';

const [{ createApp }] = await Promise.all([import('../../app.js')]);
const { hashToken } = await import('../../database/session-store.js');

class MockSessionStore {
    sessions = new Map();

    async createSession({
        authUserId,
        studentProfileId = null,
        studentId = null,
        identity,
        clientType = 'STUDENT_WEB',
        ipAddress = null,
        userAgent = null,
    }) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
        const absoluteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const session = {
            id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            tokenHash,
            authUserId,
            studentProfileId,
            studentId,
            clientType,
            identity,
            createdAt: now,
            lastActivityAt: now,
            expiresAt,
            absoluteExpiresAt,
            revokedAt: null,
            revokedReason: null,
            ipAddress,
            userAgent,
        };

        this.sessions.set(tokenHash, session);
        return { rawToken, session };
    }

    async findSessionByToken(rawToken) {
        if (!rawToken) return null;
        return this.findSessionByTokenHash(hashToken(rawToken));
    }

    async findSessionByTokenHash(tokenHash) {
        return this.sessions.get(tokenHash) || null;
    }

    async touchSessionActivity(sessionId) {
        for (const session of this.sessions.values()) {
            if (session.id === sessionId) {
                const now = new Date();
                session.lastActivityAt = now;
                const newExp = now.getTime() + 30 * 60 * 1000;
                session.expiresAt = new Date(Math.min(newExp, session.absoluteExpiresAt.getTime()));
                break;
            }
        }
    }

    async revokeSession(sessionId, reason = 'LOGOUT') {
        for (const session of this.sessions.values()) {
            if (session.id === sessionId) {
                session.revokedAt = new Date();
                session.revokedReason = reason;
                break;
            }
        }
    }

    async revokeAllUserSessions(authUserId, reason = 'ADMIN_REVOKED') {
        for (const session of this.sessions.values()) {
            if (session.authUserId === authUserId) {
                session.revokedAt = new Date();
                session.revokedReason = reason;
            }
        }
    }
}

const verifiedTokenVerifier = {
    verify: async (accessToken) => {
        if (accessToken !== 'verified-token') {
            throw new Error('Invalid token');
        }
        return {
            authUserId: '00000000-0000-4000-8000-000000000001',
            email: 'student@example.com',
            roles: ['STUDENT'],
            name: 'Test Student',
        };
    },
};

const createMockStudentIdentityService = (accessStatus = 'ACTIVE') => ({
    resolve: async (authUserId, email) => ({
        profile: {
            id: 'prof-001',
            studentId: 'PRN12345',
            name: 'Test Student',
            email: email || 'student@example.com',
            batchId: 'BATCH01',
        },
        access: {
            status: accessStatus,
            suspensionReason: accessStatus === 'SUSPENDED' ? 'Misconduct during assessment' : null,
        },
        batchName: 'Morning Batch A',
    }),
    requireActive: async (authUserId, email) => {
        if (accessStatus === 'REVOKED') {
            const err = new Error('Access revoked, contact administrator.');
            err.statusCode = 403;
            err.code = 'STUDENT_ACCESS_REVOKED';
            throw err;
        }
        return {
            profile: { id: 'prof-001', studentId: 'PRN12345' },
            access: { status: accessStatus },
        };
    },
});

const startTestFixture = async ({
    sessionStore = new MockSessionStore(),
    studentIdentityService = createMockStudentIdentityService('ACTIVE'),
    allowedCorsOrigins = ['http://localhost:5173', 'http://localhost:5174'],
} = {}) => {
    const app = createApp({
        allowedCorsOrigins,
        tokenVerifier: verifiedTokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
        studentIdentityService,
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
        sessionStore,
    });

    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');

    return {
        url: `http://127.0.0.1:${address.port}`,
        sessionStore,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};

test('POST /api/v1/auth/session exchanges Bearer token for session cookie and identity', async () => {
    const fixture = await startTestFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer verified-token',
                'content-type': 'application/json',
                origin: 'http://localhost:5173',
            },
            body: JSON.stringify({ clientType: 'STUDENT_WEB' }),
        });

        assert.equal(response.status, 200);
        const data = await response.json();
        assert.equal(data.success, true);
        assert.equal(data.data.identity.studentId, 'PRN12345');
        assert.equal(data.data.identity.accessStatus, 'ACTIVE');

        // Check Set-Cookie header
        const setCookie = response.headers.get('set-cookie');
        assert.ok(setCookie, 'Set-Cookie header must be present');
        assert.ok(setCookie.includes('HttpOnly'), 'Cookie must have HttpOnly');
        assert.ok(setCookie.includes('SameSite=Lax'), 'Cookie must have SameSite=Lax');
        assert.ok(setCookie.includes('Path=/'), 'Cookie must have Path=/');
    } finally {
        await fixture.close();
    }
});

test('GET /api/v1/auth/session retrieves identity via HttpOnly cookie', async () => {
    const fixture = await startTestFixture();
    try {
        // First exchange token for session cookie
        const loginRes = await fetch(`${fixture.url}/api/v1/auth/session`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer verified-token',
                'content-type': 'application/json',
                origin: 'http://localhost:5173',
            },
            body: JSON.stringify({ clientType: 'STUDENT_WEB' }),
        });
        const cookieHeader = loginRes.headers.get('set-cookie');
        assert.ok(cookieHeader);
        const cookieVal = cookieHeader.split(';')[0]; // name=value

        // Now query session using only the cookie (no Bearer token)
        const sessionRes = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: {
                cookie: cookieVal,
            },
        });

        assert.equal(sessionRes.status, 200);
        const body = await sessionRes.json();
        assert.equal(body.success, true);
        assert.equal(body.data.identity.studentId, 'PRN12345');
    } finally {
        await fixture.close();
    }
});

test('Cookie session rejects when idle timeout (30 min) has expired', async () => {
    const sessionStore = new MockSessionStore();
    const fixture = await startTestFixture({ sessionStore });
    try {
        const { rawToken, session } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        // Artificially age the session beyond idle timeout (e.g. 31 minutes ago)
        session.expiresAt = new Date(Date.now() - 60_000);

        const response = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: {
                cookie: `student_session=${rawToken}`,
            },
        });

        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.error.code, 'AUTHENTICATION_ERROR');
        assert.ok(body.error.message.includes('inactivity'));

        // Verify Set-Cookie clears the expired cookie
        const setCookie = response.headers.get('set-cookie');
        assert.ok(setCookie?.includes('Max-Age=0'));
    } finally {
        await fixture.close();
    }
});

test('Cookie session rejects when absolute lifetime (7 days) has expired', async () => {
    const sessionStore = new MockSessionStore();
    const fixture = await startTestFixture({ sessionStore });
    try {
        const { rawToken, session } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        // Artificially age beyond absolute lifetime
        session.absoluteExpiresAt = new Date(Date.now() - 60_000);

        const response = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: {
                cookie: `student_session=${rawToken}`,
            },
        });

        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.error.code, 'AUTHENTICATION_ERROR');
    } finally {
        await fixture.close();
    }
});

test('Revoked session is rejected immediately', async () => {
    const sessionStore = new MockSessionStore();
    const fixture = await startTestFixture({ sessionStore });
    try {
        const { rawToken, session } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        // Revoke session
        await sessionStore.revokeSession(session.id, 'ADMIN_REVOKED');

        const response = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: {
                cookie: `student_session=${rawToken}`,
            },
        });

        assert.equal(response.status, 401);
        const body = await response.json();
        assert.equal(body.error.message, 'Session has been revoked.');
    } finally {
        await fixture.close();
    }
});

test('Student suspension/revocation returns 403: Access revoked, contact administrator.', async () => {
    const sessionStore = new MockSessionStore();
    // Identity service reporting REVOKED status
    const studentIdentityService = createMockStudentIdentityService('REVOKED');
    const fixture = await startTestFixture({ sessionStore, studentIdentityService });
    try {
        const { rawToken } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        const response = await fetch(`${fixture.url}/api/v1/auth/session`, {
            headers: {
                cookie: `student_session=${rawToken}`,
            },
        });

        assert.equal(response.status, 403);
        const body = await response.json();
        assert.equal(body.error.code, 'STUDENT_ACCESS_REVOKED');
        assert.equal(body.error.message, 'Access revoked, contact administrator.');
    } finally {
        await fixture.close();
    }
});

test('POST /api/v1/auth/logout revokes session in DB and clears cookie', async () => {
    const sessionStore = new MockSessionStore();
    const fixture = await startTestFixture({ sessionStore });
    try {
        const { rawToken, session } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        const response = await fetch(`${fixture.url}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
                cookie: `student_session=${rawToken}`,
                origin: 'http://localhost:5173',
            },
        });

        assert.equal(response.status, 200);
        const setCookie = response.headers.get('set-cookie');
        assert.ok(setCookie?.includes('Max-Age=0'));

        // Ensure session in store is marked revoked
        const stored = await sessionStore.findSessionByToken(rawToken);
        assert.ok(stored.revokedAt !== null);
    } finally {
        await fixture.close();
    }
});

test('CSRF blocks untrusted origin on cookie-authenticated state-changing POST', async () => {
    const sessionStore = new MockSessionStore();
    const fixture = await startTestFixture({ sessionStore });
    try {
        const { rawToken } = await sessionStore.createSession({
            authUserId: '00000000-0000-4000-8000-000000000001',
            identity: { studentId: 'PRN12345', roles: ['STUDENT'] },
        });

        const response = await fetch(`${fixture.url}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
                cookie: `student_session=${rawToken}`,
                origin: 'https://malicious-attacker-site.com',
            },
        });

        assert.equal(response.status, 403);
        const body = await response.json();
        assert.equal(body.error.code, 'CSRF_VALIDATION_FAILED');
    } finally {
        await fixture.close();
    }
});

test('Existing routes with Bearer token authentication remain 100% backward-compatible', async () => {
    const fixture = await startTestFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/auth/me`, {
            headers: {
                authorization: 'Bearer verified-token',
            },
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.success, true);
        assert.equal(body.data.identity.authUserId, '00000000-0000-4000-8000-000000000001');
    } finally {
        await fixture.close();
    }
});
