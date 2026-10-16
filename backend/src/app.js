import express from 'express';
import crypto from 'node:crypto';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createAuthenticationMiddleware } from './middleware/auth.middleware.js';
import { requireRoles } from './middleware/authorization.middleware.js';
import { createCorsMiddleware } from './middleware/cors.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { ApiError } from './utils/api-error.js';
import { errorResponse, successResponse } from './utils/api-response.js';
import { createStudentRouter } from './modules/students/student.routes.js';
import { createBatchRouter } from './modules/batches/batch.routes.js';
import { createAuthorizationRequestRouter } from './modules/authorization/authorization.routes.js';
import { createDashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { createStudentAccessRouter } from './modules/student-access/student-access.routes.js';
import { createBroadcastAdminRouter, createStudentBroadcastRouter, } from './modules/broadcasts/broadcast.routes.js';
import { createResultRouter } from './modules/results/result.routes.js';
import { createNotificationRouter } from './modules/notifications/notification.routes.js';
import { createStudyMaterialAdminRouter, createStudentStudyMaterialRouter, } from './modules/study-materials/study-material.routes.js';
import { createAdminQuestionBankRouter, createStudentQuestionBankRouter, } from './modules/question-bank/question-bank.routes.js';
import { QuestionBankService } from './modules/question-bank/question-bank.service.js';
export const createApp = ({ allowedCorsOrigins, tokenVerifier, studentService, batchService, authorizationRequestService, dashboardService, studentIdentityService, resultService, broadcastService, notificationService, studyMaterialService, superAdminEmail = 'newuniquesupabase@gmail.com' }) => {
    const app = express();
    app.use(helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.use(createCorsMiddleware(allowedCorsOrigins));

    // Request timeout protection (30 seconds)
    app.use((request, response, next) => {
        const timer = setTimeout(() => {
            if (!response.headersSent) {
                response.status(504).json(errorResponse('REQUEST_TIMEOUT', 'The server took too long to respond.'));
            }
        }, 30_000);
        response.on('finish', () => clearTimeout(timer));
        response.on('close', () => clearTimeout(timer));
        next();
    });

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: {
            success: false,
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many authentication attempts. Please try again after 15 minutes.',
            },
        },
    });
    app.use('/api/v1/auth', authLimiter);
    const authenticationMiddleware = createAuthenticationMiddleware(tokenVerifier);
    app.get('/health', (_request, response) => {
        response.status(200).json(successResponse({ status: 'healthy' }));
    });
    app.post('/api/v1/auth/resolve-identifier', async (request, response, next) => {
        try {
            const rawIdentifier = (request.body?.identifier ?? '').toString().trim();
            if (!rawIdentifier) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'PRN or Email is required.');
            }
            const resolved = rawIdentifier.includes('@')
                ? await studentIdentityService.findByEmail(rawIdentifier)
                : await studentIdentityService.findByStudentId(rawIdentifier);
            if (!resolved) {
                throw new ApiError(404, 'STUDENT_NOT_FOUND', `No admitted student found with PRN / Email: "${rawIdentifier}". Please check with your institute administrator.`);
            }
            response.status(200).json(successResponse({
                email: resolved.profile.email,
                studentId: resolved.profile.studentId,
                name: resolved.profile.name,
                accessStatus: resolved.access.status,
            }));
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/api/v1/auth/student-register', async (request, response, next) => {
        try {
            const prn = (request.body?.prn ?? '').toString().trim();
            const password = (request.body?.password ?? '').toString();
            if (!prn) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'PRN / Student ID is required.');
            }
            if (!password || password.length < 6) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters.');
            }
            try {
                const result = await studentService.registerStudentAuth(prn, password);
                response.status(200).json(successResponse({
                    success: true,
                    prn: result.profile.studentId,
                    name: result.profile.name,
                    email: result.profile.email,
                    authEmail: result.authEmail,
                    message: 'Student password set successfully.',
                }));
            }
            catch (err) {
                if (err?.message?.includes('STUDENT_NOT_FOUND')) {
                    throw new ApiError(404, 'STUDENT_NOT_FOUND', `Student with PRN "${prn}" was not found. Please ensure you are admitted by the institute admin.`);
                }
                throw err;
            }
        }
        catch (error) {
            next(error);
        }
    });
    app.post('/api/v1/auth/google-student-auth', async (request, response, next) => {
        try {
            const email = (request.body?.email ?? '').toString().trim().toLowerCase();

            if (!email || !email.includes('@')) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'A valid Google email is required.');
            }

            const student = await studentIdentityService.findByEmail(email);
            if (!student) {
                throw new ApiError(404, 'STUDENT_NOT_ENROLLED', `No admitted student record found with Google email: ${email}. Please contact the institute administrator to enroll.`);
            }

            // Issue auth token for ALL enrolled students regardless of access status.
            // Students with PENDING/INACTIVE access will land on the UnauthorizedScreen
            // (enforced at /auth/me via role resolution), where they can send an access
            // request — which requires a valid Supabase session.

            // Deterministic secure token for Google-authenticated student session
            const authSecret = process.env.SUPABASE_JWT_ISSUER || 'nuc_default_student_auth_seed';
            const studentAuthToken = crypto.createHmac('sha256', authSecret).update(`nuc_student_${email}`).digest('hex');

            await studentService.registerStudentAuth(email, studentAuthToken);

            response.status(200).json(successResponse({
                studentId: student.profile.studentId,
                email: student.profile.email,
                name: student.profile.name,
                authToken: studentAuthToken,
                status: student.access.status,
            }));
        }
        catch (error) {
            next(error);
        }
    });
    app.get('/api/v1/auth/me', authenticationMiddleware, async (request, response, next) => {
        if (request.auth === undefined) {
            next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
            return;
        }
        const roles = [...request.auth.roles];
        // Designated institute Super Admin email
        if (request.auth.email && request.auth.email.toLowerCase() === superAdminEmail.toLowerCase()) {
            if (!roles.includes('SUPER_ADMIN')) roles.push('SUPER_ADMIN');
            if (!roles.includes('ADMIN')) roles.push('ADMIN');
        }
        let resolvedStudent = null;
        try {
            const student = await studentIdentityService.resolve?.(request.auth.authUserId, request.auth.email);
            if (student) {
                resolvedStudent = student;
                if (student.access.status === 'ACTIVE') {
                    if (!roles.includes('STUDENT')) {
                        roles.push('STUDENT');
                    }
                } else {
                    // Student access is not ACTIVE (e.g. PENDING) -> remove premature STUDENT role
                    const studentIdx = roles.indexOf('STUDENT');
                    if (studentIdx !== -1) {
                        roles.splice(studentIdx, 1);
                    }
                }
            }
        }
        catch (_) { }
        response.status(200).json(successResponse({
            identity: {
                ...request.auth,
                roles,
                name: resolvedStudent?.profile?.name ?? request.auth.name,
                studentId: resolvedStudent?.profile?.studentId,
                batchId: resolvedStudent?.profile?.batchId ?? null,
                batchName: resolvedStudent?.batchName ?? null,
                accessStatus: resolvedStudent?.access?.status ?? null,
            },
        }));
    });
    app.get('/api/v1/admin/access-check', authenticationMiddleware, requireRoles('ADMIN'), (_request, response) => {
        response.status(200).json(successResponse({ message: 'Admin access confirmed.' }));
    });
    app.use('/api/v1/students', createStudentRouter(studentService, tokenVerifier));
    app.use('/api/v1/batches', createBatchRouter(batchService, tokenVerifier));
    app.use('/api/v1/authorization-requests', createAuthorizationRequestRouter(
        authorizationRequestService,
        tokenVerifier,
        (authUserId, email) => studentIdentityService.resolve?.(authUserId, email),
        (prn) => studentIdentityService.findByStudentId?.(prn),
        (email) => studentIdentityService.findByEmail?.(email),
    ));
    app.use('/api/v1/dashboard', createDashboardRouter(dashboardService, tokenVerifier));
    const requireActiveStudent = (authUserId, email) => studentIdentityService.requireActive(authUserId, email);
    app.use('/api/v1/student', createStudentAccessRouter(studentIdentityService, tokenVerifier));
    app.use('/api/v1/results', createResultRouter(resultService, tokenVerifier, requireActiveStudent));
    app.use('/api/v1/student/results', createResultRouter(resultService, tokenVerifier, requireActiveStudent));
    app.use('/api/v1/broadcasts', createBroadcastAdminRouter(broadcastService, tokenVerifier));
    app.use('/api/v1/student/broadcasts', createStudentBroadcastRouter(broadcastService, tokenVerifier, requireActiveStudent));
    app.use('/api/v1/notifications', createNotificationRouter(notificationService, tokenVerifier));
    app.use('/api/v1/student/study-materials', createStudentStudyMaterialRouter(studyMaterialService, tokenVerifier, requireActiveStudent));
    app.use('/api/v1/study-materials', createStudyMaterialAdminRouter(studyMaterialService, tokenVerifier, requireActiveStudent));
    const questionBankService = new QuestionBankService();
    app.use('/api/v1/admin/question-bank', createAdminQuestionBankRouter(tokenVerifier, questionBankService));
    app.use('/api/v1/student/question-bank', createStudentQuestionBankRouter(tokenVerifier, studentIdentityService, questionBankService));
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);
    return app;
};
