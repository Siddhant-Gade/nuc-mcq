import { createServer } from 'node:http';
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
import { DrizzleTeacherRepository } from './modules/teachers/teacher.repository.js';
import { TeacherService } from './modules/teachers/teacher.service.js';
import { getFirebaseAdmin } from './config/firebase.js';

// Initialize Firebase Admin SDK eagerly on startup
getFirebaseAdmin();
const baseTokenVerifier = new SupabaseJwtVerifier({
    issuer: env.SUPABASE_JWT_ISSUER,
    audience: env.SUPABASE_JWT_AUDIENCE,
});
const studentRepository = new DrizzleStudentRepository(database);
const studentService = new StudentService(studentRepository);
const batchService = new BatchService(new DrizzleBatchRepository(database));
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
const teacherService = new TeacherService(new DrizzleTeacherRepository(database));
batchService.teacherService = teacherService;
const notificationService = new NotificationService(new DrizzleNotificationRepository(database));
notificationService.pushService = pushNotificationService;
studentIdentityService.deviceTokenRepository = deviceTokenRepository;
const studyMaterialService = new StudyMaterialService(new DrizzleStudyMaterialRepository(database), supabaseStudyMaterialStorage, notificationService);
authorizationRequestService.pushService = pushNotificationService;
authorizationRequestService.invalidateIdentityCache = invalidateIdentityCache;
authorizationRequestService.studentRepository = studentRepository;
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
    teacherService,
});
const server = createServer(app);
let isShuttingDown = false;
server.listen(env.PORT, '0.0.0.0', () => {
    console.info(`Backend listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV}).`);
});
server.once('error', (error) => {
    console.error('Backend startup failed.', error);
    process.exitCode = 1;
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
