import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

test('server.js initializes without ReferenceError and starts HTTP listener', async () => {
    const testPort = '3098';
    const child = spawn(process.execPath, ['src/server.js'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: testPort,
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres',
            SUPABASE_JWT_ISSUER: 'https://project.example.supabase.co/auth/v1',
            SUPABASE_JWT_AUDIENCE: 'authenticated',
            SUPER_ADMIN_EMAIL: 'newuniquesupabase@gmail.com',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdoutData = '';
    let stderrData = '';
    child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
    });

    try {
        // Wait up to 5 seconds for the server to log listening status
        const started = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Server startup timed out.\nSTDOUT:\n${stdoutData}\nSTDERR:\n${stderrData}`));
            }, 5000);

            child.stdout.on('data', () => {
                if (stdoutData.includes(`Backend listening on 0.0.0.0:${testPort}`)) {
                    clearTimeout(timeout);
                    resolve(true);
                }
            });

            child.on('exit', (code) => {
                clearTimeout(timeout);
                reject(new Error(`Server process exited prematurely with code ${code}.\nSTDOUT:\n${stdoutData}\nSTDERR:\n${stderrData}`));
            });
        });

        assert.ok(started, 'Server should have emitted listening message');
        assert.ok(!stderrData.includes('ReferenceError'), 'stderr should not contain ReferenceError');
        assert.ok(!stderrData.includes('batchRepository is not defined'), 'stderr should not contain batchRepository error');

        // Confirm endpoint responsiveness
        const healthRes = await fetch(`http://127.0.0.1:${testPort}/health`);
        assert.equal(healthRes.status, 200);
        const healthBody = await healthRes.json();
        assert.deepEqual(healthBody, { success: true, data: { status: 'healthy' } });
    } finally {
        child.kill('SIGTERM');
        await new Promise((resolve) => {
            child.on('exit', () => resolve(true));
            // Fallback forced termination if needed
            setTimeout(() => {
                try {
                    child.kill('SIGKILL');
                } catch (_) {}
                resolve(true);
            }, 2000);
        });
    }
});
