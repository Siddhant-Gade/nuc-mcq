import { createServer } from 'node:http';
import { sql } from 'drizzle-orm';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabaseConnection, database } from './database/client.js';
import { SupabaseJwtVerifier } from './modules/auth/auth-token-verifier.js';
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
import { DrizzleSessionStore } from './database/session-store.js';

// Initialize Firebase Admin SDK eagerly on startup
getFirebaseAdmin();

const sessionStore = new DrizzleSessionStore(database);

/**
 * Idempotent startup migration: creates tables and indexes if they were never
 * applied to the production database.
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
        // Log but don't crash — the rest of the backend must stay operational.
        console.error('[startup] broadcast_read migration failed (non-fatal):', err?.message ?? err);
    }

    try {
        await sessionStore.ensureTable();
        console.info('[startup] auth_sessions table migration: OK');
    } catch (err) {
        console.error('[startup] auth_sessions migration failed (non-fatal):', err?.message ?? err);
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
studentService.notificationService = notificationService;
studentService.pushService = pushNotificationService;
studentService.invalidateIdentityCache = invalidateIdentityCache;
studentService.supportEmail = env.ADMIN_SUPPORT_EMAIL;
studentIdentityService.deviceTokenRepository = deviceTokenRepository;
const studyMaterialService = new StudyMaterialService(new DrizzleStudyMaterialRepository(database), supabaseStudyMaterialStorage, notificationService);
authorizationRequestService.pushService = pushNotificationService;
authorizationRequestService.invalidateIdentityCache = invalidateIdentityCache;
authorizationRequestService.studentRepository = studentRepository;
authorizationRequestService.batchRepository = batchRepository;
studyMaterialService.pushService = pushNotificationService;
broadcastService.pushService = pushNotificationService;
const app = createApp({
    allowedCorsOrigins: env.CORS_ORIGINS,
    tokenVerifier,
    studentService,
    batchService,
    authorizationRequestService,
    dashboardService,
    studentIdentityService,
    resultService,
    broadcastService,
    notificationService,
    studyMaterialService,
    sessionStore,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
    supportEmail: env.ADMIN_SUPPORT_EMAIL,
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
