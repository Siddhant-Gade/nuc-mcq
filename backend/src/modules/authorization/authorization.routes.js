import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
import { AuthorizationRequestController } from './authorization.controller.js';
import { authorizationRequestIdParamsSchema } from './authorization.schema.js';
export const createAuthorizationRequestRouter = (service, tokenVerifier, resolveStudent, findByPrn) => {
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
