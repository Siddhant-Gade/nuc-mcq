import express from 'express';
import { createAuthenticationMiddleware } from './middleware/auth.middleware.js';
import { requireRoles } from './middleware/authorization.middleware.js';
import { createCorsMiddleware } from './middleware/cors.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { ApiError } from './utils/api-error.js';
import { successResponse } from './utils/api-response.js';
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
import { createTeacherAdminRouter } from './modules/teachers/teacher.routes.js';
export const createApp = ({ allowedCorsOrigins, tokenVerifier, studentService, batchService, authorizationRequestService, dashboardService, studentIdentityService, resultService, broadcastService, notificationService, studyMaterialService, teacherService }) => {
    const app = express();
    app.use(createCorsMiddleware(allowedCorsOrigins));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
    app.get('/api/v1/auth/me', authenticationMiddleware, async (request, response, next) => {
        if (request.auth === undefined) {
            next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
            return;
        }
        const roles = [...request.auth.roles];
        // Designated institute Super Admin email
        const SUPER_ADMIN_EMAIL = 'newuniquesupabase@gmail.com';
        if (request.auth.email && request.auth.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
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
            },
        }));
    });
    app.get('/api/v1/admin/access-check', authenticationMiddleware, requireRoles('ADMIN'), (_request, response) => {
        response.status(200).json(successResponse({ message: 'Admin access confirmed.' }));
    });
    app.use('/api/v1/teachers', createTeacherAdminRouter(teacherService, tokenVerifier));
    app.use('/api/v1/students', createStudentRouter(studentService, tokenVerifier));
    app.use('/api/v1/batches', createBatchRouter(batchService, tokenVerifier));
    app.use('/api/v1/authorization-requests', createAuthorizationRequestRouter(
        authorizationRequestService,
        tokenVerifier,
        (authUserId, email) => studentIdentityService.resolve?.(authUserId, email),
        (prn) => studentIdentityService.findByStudentId?.(prn)
    ));
    app.use('/api/v1/dashboard', createDashboardRouter(dashboardService, tokenVerifier));
    const requireActiveStudent = (authUserId, email) => studentIdentityService.requireActive(authUserId, email);
    app.use('/api/v1/student', createStudentAccessRouter(studentIdentityService, tokenVerifier));
    app.use('/api/v1/results', createResultRouter(resultService, tokenVerifier, (authUserId) => studentIdentityService.requireActive(authUserId)));
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
