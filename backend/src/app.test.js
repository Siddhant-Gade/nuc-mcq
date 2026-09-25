import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }] = await Promise.all([import('./app.js')]);
const verifiedTokenVerifier = {
    verify: async (accessToken) => {
        if (accessToken !== 'verified-token') {
            throw new Error('Invalid token');
        }
        return { authUserId: 'verified-user-id', email: 'verified@example.com', roles: ['STUDENT'] };
    },
};
const startFixture = async (tokenVerifier = verifiedTokenVerifier) => {
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
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
    assert.ok(address !== null && typeof address !== 'string');
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};
test('health is public and returns the standard healthy response', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/health`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: { status: 'healthy' } });
    }
    finally {
        await fixture.close();
    }
});
test('unknown routes return a structured 404 response', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/does-not-exist`);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Route GET /does-not-exist was not found.' },
        });
    }
    finally {
        await fixture.close();
    }
});
test('allowed browser origins receive CORS headers', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/health`, {
            headers: { origin: 'http://localhost:5173' },
        });
        assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    }
    finally {
        await fixture.close();
    }
});
test('auth me rejects a missing token', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/auth/me`);
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication token is required.' },
        });
    }
    finally {
        await fixture.close();
    }
});
test('auth me returns only the verified identity', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/auth/me?authUserId=impersonated-user-id`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true,
            data: {
                identity: {
                    authUserId: 'verified-user-id',
                    email: 'verified@example.com',
                    roles: ['STUDENT'],
                    batchId: null,
                    batchName: null,
                },
            },
        });
    }
    finally {
        await fixture.close();
    }
});
test('admin access is authenticated and role protected', async () => {
    const roleVerifier = {
        verify: async (accessToken) => {
            if (accessToken === 'student-token') {
                return { authUserId: 'student-id', roles: ['STUDENT'] };
            }
            if (accessToken === 'admin-token') {
                return { authUserId: 'admin-id', roles: ['ADMIN'] };
            }
            throw new Error('Invalid token');
        },
    };
    const fixture = await startFixture(roleVerifier);
    try {
        const unauthenticated = await fetch(`${fixture.url}/api/v1/admin/access-check`);
        assert.equal(unauthenticated.status, 401);
        const unauthorized = await fetch(`${fixture.url}/api/v1/admin/access-check`, {
            headers: { authorization: 'Bearer student-token' },
        });
        assert.equal(unauthorized.status, 403);
        assert.deepEqual(await unauthorized.json(), {
            success: false,
            error: {
                code: 'AUTHORIZATION_ERROR',
                message: 'You are not authorized to access this resource.',
            },
        });
        const authorized = await fetch(`${fixture.url}/api/v1/admin/access-check`, {
            headers: { authorization: 'Bearer admin-token' },
        });
        assert.equal(authorized.status, 200);
        assert.deepEqual(await authorized.json(), {
            success: true,
            data: { message: 'Admin access confirmed.' },
        });
    }
    finally {
        await fixture.close();
    }
});
