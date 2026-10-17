import { createServer } from 'node:http';
import { sql } from 'drizzle-orm';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabaseConnection, database } from './database/client.js';
import { SupabaseJwtVerifier } from './modules/auth/auth-token-verifier.js';
import { SessionService } from './modules/auth/session.service.js';
import { DrizzleStudentRepository } from './modules/students/student.repository.js';
import { StudentService } from './modules/students/student.service.js';
import { DrizzleBatchRepository } from './modules/batches/batch.repository.js';
import { BatchService } from './modules/batches/batch.service.js';
import { DrizzleAuthorizationRequestRepository } from './modules/authorization/authorization.repository.js';
import { AuthorizationRequestService } from './modules/authorization/authorization.service.js';
import { DrizzleDashboardRepository } from './modules/dashboard/dashboard.repository.js';
import { DashboardService } from './modules/dashboard/dashboard.service.js';
import { StudentIdentityService } from './modules/student-access/student-identity.service.js';
import { DrizzleBroadcastRepository } from './modules/broadcasts/broadcast.repository.js';
import { BroadcastService } from './modules/broadcasts/broadcast.service.js';
import { DrizzleNotificationRepository } from './modules/notifications/notification.repository.js';
import { NotificationService } from './modules/notifications/notification.service.js';
import { DrizzleStudyMaterialRepository } from './modules/study-materials/study-material.repository.js';
import { supabaseStudyMaterialStorage, StudyMaterialService } from './modules/study-materials/study-material.service.js';
import { DrizzleResultRepository } from './modules/results/result.repository.js';
import { ResultService } from './modules/results/result.service.js';
import { DrizzleDeviceTokenRepository } from './database/device-token.repository.js';
import { PushNotificationService } from './modules/notifications/push-notification.service.js';
import { getFirebaseAdmin } from './config/firebase.js';

// Initialize Firebase Admin SDK eagerly on startup
getFirebaseAdmin();

/**
 * Idempotent startup migration: creates the broadcast_read table and its
 * indexes if they were never applied to the production database.
 * Safe to run on every cold start — all statements use IF NOT EXISTS.
 */
async function runStartupMigrations() {
    try {
        await database.execute(sql`
            CREATE TABLE IF NOT EXISTS broadcast_read (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                broadcast_id UUID NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
                auth_user_id UUID NOT NULL,
                read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE UNIQUE INDEX IF NOT EXISTS broadcast_read_user_broadcast_idx
                ON broadcast_read (auth_user_id, broadcast_id);
            CREATE INDEX IF NOT EXISTS broadcast_read_user_idx
                ON broadcast_read (auth_user_id);
        `);
        console.info('[startup] broadcast_read table migration: OK');
    } catch (err) {
        console.error('[startup] broadcast_read migration failed (non-fatal):', err?.message ?? err);
    }

    try {
        try {
            await database.execute(sql`ALTER TYPE student_access_status ADD VALUE IF NOT EXISTS 'SUSPENDED';`);
        } catch (_) {}
        await database.execute(sql`
            ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
            ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspended_by UUID;
            ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
        `);
        console.info('[startup] student_access suspension fields migration: OK');
    } catch (err) {
        console.error('[startup] student_access suspension fields migration failed (non-fatal):', err?.message ?? err);
    }

    try {
        await database.execute(sql`
            CREATE TABLE IF NOT EXISTS auth_session (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                auth_user_id UUID NOT NULL,
                client_type VARCHAR(20) NOT NULL,
                identity JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ NULL,
                user_agent TEXT NULL,
                ip_address VARCHAR(45) NULL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_hash_idx ON auth_session (token_hash);
            CREATE INDEX IF NOT EXISTS auth_session_auth_user_idx ON auth_session (auth_user_id);
            CREATE INDEX IF NOT EXISTS auth_session_expires_at_idx ON auth_session (expires_at);
            CREATE INDEX IF NOT EXISTS auth_session_revoked_at_idx ON auth_session (revoked_at);
        `);
        console.info('[startup] auth_session table migration: OK');
    } catch (err) {
        console.error('[startup] auth_session table migration failed (non-fatal):', err?.message ?? err);
    }
}

const baseTokenVerifier = new SupabaseJwtVerifier({
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
});
const studentRepository = new DrizzleStudentRepository(database);
const studentService = new StudentService(studentRepository);
const batchRepository = new DrizzleBatchRepository(database);
const batchService = new BatchService(batchRepository);
const authorizationRequestService = new AuthorizationRequestService(new DrizzleAuthorizationRequestRepository(database));
const dashboardService = new DashboardService(new DrizzleDashboardRepository(database));
const studentIdentityService = new StudentIdentityService((authUserId) => studentRepository.findByAuthUserId(authUserId), (email) => studentRepository.findByEmail(email), (studentId) => studentRepository.findByStudentId(studentId));
// Per-user identity cache (5 s TTL) — eliminates 1–2 DB queries per request
const identityCache = new Map();
const IDENTITY_CACHE_TTL = 5_000;
const invalidateIdentityCache = (authUserId) => identityCache.delete(authUserId);

const tokenVerifier = {
    async verify(accessToken) {
        const identity = await baseTokenVerifier.verify(accessToken);
        const baseRoles = identity.roles.filter((r) => r !== 'STUDENT');

        // Designate institute Super Admin — configured via SUPER_ADMIN_EMAIL env var.
        if (identity.email && identity.email.toLowerCase() === env.SUPER_ADMIN_EMAIL.toLowerCase()) {
            if (!baseRoles.includes('ADMIN')) baseRoles.push('ADMIN');
            if (!baseRoles.includes('SUPER_ADMIN')) baseRoles.push('SUPER_ADMIN');
        }

        const cached = identityCache.get(identity.authUserId);
        if (cached && Date.now() - cached.ts < IDENTITY_CACHE_TTL) {
            identity.roles = cached.roles;
            return identity;
        }

        try {
            const student = await studentIdentityService.resolve(identity.authUserId, identity.email);
            if (student && student.access.status === 'ACTIVE') {
                identity.roles = [...baseRoles, 'STUDENT'];
            } else {
                identity.roles = baseRoles;
            }
            if (identityCache.size >= 5000) {
                const oldestKey = identityCache.keys().next().value;
                if (oldestKey) identityCache.delete(oldestKey);
            }
            identityCache.set(identity.authUserId, { roles: identity.roles, ts: Date.now() });
        }
        catch {
            identity.roles = baseRoles;
        }
        return identity;
    },
};
const deviceTokenRepository = new DrizzleDeviceTokenRepository(database);
const pushNotificationService = new PushNotificationService(deviceTokenRepository);
const resultService = new ResultService(new DrizzleResultRepository(database));
const broadcastService = new BroadcastService(new DrizzleBroadcastRepository(database));
const notificationService = new NotificationService(new DrizzleNotificationRepository(database));
notificationService.pushService = pushNotificationService;
studentIdentityService.deviceTokenRepository = deviceTokenRepository;
const studyMaterialService = new StudyMaterialService(new DrizzleStudyMaterialRepository(database), supabaseStudyMaterialStorage, notificationService);
authorizationRequestService.pushService = pushNotificationService;
authorizationRequestService.invalidateIdentityCache = invalidateIdentityCache;
authorizationRequestService.studentRepository = studentRepository;
authorizationRequestService.batchRepository = batchRepository;
studyMaterialService.pushService = pushNotificationService;
broadcastService.pushService = pushNotificationService;
const sessionService = new SessionService(database);
const app = createApp({
    allowedCorsOrigins: env.CORS_ORIGINS,
    tokenVerifier,
    sessionService,
    studentService,
    batchService,
    authorizationRequestService,
    dashboardService,
    studentIdentityService,
    resultService,
    broadcastService,
    notificationService,
    studyMaterialService,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
});
const server = createServer(app);
// Close connections that have been idle or hung for more than 35 s (slightly above
// the 30 s middleware timeout so the JSON error response reaches the client first).
server.timeout = 35_000;
server.keepAliveTimeout = 65_000; // Must exceed ALB/Render's 60 s idle timeout.
let isShuttingDown = false;

// Run idempotent startup migrations, then start accepting traffic.
void runStartupMigrations().then(() => {
    server.listen(env.PORT, '0.0.0.0', () => {
        console.info(`Backend listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV}).`);
    });
    server.once('error', (error) => {
        console.error('Backend startup failed.', error);
        process.exitCode = 1;
    });
});
const shutdown = (signal) => {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    console.info(`Received ${signal}; shutting down.`);
    server.close(() => {
        void closeDatabaseConnection()
            .catch((error) => {
            console.error('Failed to close the database connection.', error);
            process.exitCode = 1;
        })
            .finally(() => {
            process.exit();
        });
    });
};
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
