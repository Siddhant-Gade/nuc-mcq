import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
import { BroadcastController } from './broadcast.controller.js';
import { createBroadcastSchema, updateBroadcastSchema } from './broadcast.schema.js';
/** Admin-only CRUD + publish surface under /api/v1/broadcasts. */
export const createBroadcastAdminRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new BroadcastController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const requireAdmin = [authenticate, requireRoles('ADMIN')];
    router.get('/', ...requireAdmin, controller.list);
    router.post('/', ...requireAdmin, validateRequest({ body: createBroadcastSchema }), controller.create);
    router.get('/:id', ...requireAdmin, 
    // UUID validation happens in the service lookup; keep params strict here.
    controller.getById);
    router.patch('/:id', ...requireAdmin, validateRequest({ body: updateBroadcastSchema }), controller.update);
    router.post('/:id/publish', ...requireAdmin, controller.publish);
    router.delete('/:id', ...requireAdmin, controller.remove);
    return router;
};
/**
 * Phase 12 student visibility: PUBLISHED broadcasts for ALL students or the
 * caller's own batch. Identity comes only from the verified token via
 * `requireActive` (unmapped identities / non-ACTIVE access rejected).
 */
export const createStudentBroadcastRouter = (service, tokenVerifier, requireActiveStudent) => {
    const router = Router();
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const requireStudent = [authenticate, requireRoles('STUDENT')];

    router.get('/', ...requireStudent, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            const email = request.auth?.email;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            const identity = await requireActiveStudent(authUserId, email);
            const broadcastsForStudent = await service.listForStudent(identity.profile.batchId, authUserId);
            response.status(200).json(successResponse(broadcastsForStudent));
        }
        catch (error) {
            next(error);
        }
    });

    router.get('/unread-count', ...requireStudent, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            const email = request.auth?.email;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            const identity = await requireActiveStudent(authUserId, email);
            const count = await service.unreadCount(identity.profile.batchId, authUserId);
            response.status(200).json(successResponse({ count }));
        } catch (error) {
            next(error);
        }
    });

    const handleMarkRead = async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            const email = request.auth?.email;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            await requireActiveStudent(authUserId, email);
            const result = await service.markRead(request.params.id, authUserId);
            response.status(200).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    };
    router.patch('/:id/read', ...requireStudent, handleMarkRead);
    router.post('/:id/read', ...requireStudent, handleMarkRead);

    router.post('/read-all', ...requireStudent, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            const email = request.auth?.email;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            const identity = await requireActiveStudent(authUserId, email);
            const result = await service.markAllRead(identity.profile.batchId, authUserId);
            response.status(200).json(successResponse(result));
        } catch (error) {
            next(error);
        }
    });

    return router;
};
