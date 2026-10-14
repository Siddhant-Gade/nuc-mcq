import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
import { AuthorizationRequestController } from './authorization.controller.js';
import { authorizationRequestIdParamsSchema } from './authorization.schema.js';
export const createAuthorizationRequestRouter = (service, tokenVerifier, resolveStudent, findByPrn, findByEmail) => {
    const router = Router();
    const controller = new AuthorizationRequestController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const authorizeAdmin = requireRoles('ADMIN');
    // ── Student self-service (Phase 10, SYSTEM_DESIGN.md §17) ──
    router.post('/mine', authenticate, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            const email = request.auth?.email;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            let identity = await resolveStudent?.(authUserId, email);
            const prn = request.body?.prn ? String(request.body.prn).trim() : undefined;
            if (identity === undefined && prn && findByPrn) {
                identity = await findByPrn(prn);
            }
            if (identity === undefined && email && findByEmail) {
                identity = await findByEmail(email);
            }
            if (identity === undefined && email && service.studentRepository) {
                const generatedPrn = `REQ-${Date.now().toString().slice(-6)}`;
                const studentName = request.auth?.user_metadata?.full_name || email.split('@')[0];
                let batchId = 'BATCH01';
                try {
                    const batches = await service.batchRepository?.list?.();
                    if (batches && batches.length > 0) {
                        batchId = batches[0].batchId;
                    }
                } catch (_) {}
                const student = await service.studentRepository.create({
                    studentId: generatedPrn,
                    name: studentName,
                    email: email,
                    instituteId: 'INST001',
                    batchId: batchId,
                });
                identity = {
                    profile: student,
                    access: { status: 'PENDING' },
                };
            }
            if (identity === undefined) {
                if (prn) {
                    throw new ApiError(404, 'STUDENT_NOT_FOUND', `Student with PRN "${prn}" was not found. Please verify your PRN.`);
                }
                throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student profile is linked to this account.');
            }
            const created = await service.createForCurrentStudent({
                studentProfileId: identity.profile.id,
                authUserId,
                accessStatus: identity.access.status,
            });
            response.status(201).json(successResponse(created));
        }
        catch (error) {
            next(error);
        }
    });
    // ── Student unauthenticated request (for students discovering request option on LoginScreen) ──
    router.post('/request', async (request, response, next) => {
        try {
            const prn = (request.body?.prn ?? '').toString().trim();
            const email = (request.body?.email ?? '').toString().trim().toLowerCase();
            const name = (request.body?.name ?? '').toString().trim();

            if (!prn && !email) {
                throw new ApiError(400, 'VALIDATION_ERROR', 'PRN / Student ID or Gmail address is required.');
            }

            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    throw new ApiError(400, 'VALIDATION_ERROR', 'Please enter a valid Gmail address.');
                }
            }

            let identity;
            if (prn && findByPrn) {
                identity = await findByPrn(prn);
            }
            if (!identity && email && findByEmail) {
                identity = await findByEmail(email);
            }

            if (identity) {
                if (identity.access.status === 'ACTIVE') {
                    throw new ApiError(409, 'CONFLICT', 'Student access is already active. Please sign in directly.');
                }
                if (typeof service.repository.findPendingByStudentProfileId === 'function') {
                    const existing = await service.repository.findPendingByStudentProfileId(identity.profile.id);
                    if (existing) {
                        return response.status(200).json(successResponse({
                            message: 'An authorization request is already pending review.',
                            status: 'PENDING',
                            studentName: identity.profile.name,
                            prn: identity.profile.studentId,
                            email: identity.profile.email,
                            alreadyPending: true,
                        }));
                    }
                }
                const record = await service.repository.create(identity.profile.id, null);
                return response.status(201).json(successResponse({
                    message: 'Authorization request submitted successfully.',
                    status: 'PENDING',
                    studentName: identity.profile.name,
                    prn: identity.profile.studentId,
                    email: identity.profile.email,
                    id: record.id,
                }));
            }

            // Student profile not found by PRN or email.
            if (!email) {
                throw new ApiError(404, 'STUDENT_NOT_FOUND', `Student with PRN "${prn}" was not found. Please check with your institute administrator.`);
            }

            // Student provided an email without a PRN and is not yet in student_profiles.
            if (service.studentRepository) {
                const generatedPrn = `REQ-${Date.now().toString().slice(-6)}`;
                const studentName = name || email.split('@')[0];
                let batchId = 'BATCH01';
                try {
                    const batches = await service.batchRepository?.list?.();
                    if (batches && batches.length > 0) {
                        batchId = batches[0].batchId;
                    }
                } catch (_) {}

                const student = await service.studentRepository.create({
                    studentId: generatedPrn,
                    name: studentName,
                    email: email,
                    instituteId: 'INST001',
                    batchId: batchId,
                });
                const record = await service.repository.create(student.id, null);
                return response.status(201).json(successResponse({
                    message: 'Authorization request submitted successfully. Awaiting administrator approval.',
                    status: 'PENDING',
                    studentName: student.name,
                    prn: student.studentId,
                    email: student.email,
                    id: record.id,
                }));
            }

            throw new ApiError(404, 'STUDENT_NOT_FOUND', `No account found for "${email}". Please contact your administrator.`);
        } catch (error) {
            next(error);
        }
    });

    // ── Admin review surface ──
    router.use(authenticate, authorizeAdmin);
    // Literal routes are registered before the /:id route.
    router.get('/', controller.list);
    router.get('/pending', controller.listPending);
    router.get('/:id', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.getById);
    router.post('/:id/approve', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.approve);
    router.post('/:id/reject', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.reject);
    return router;
};
