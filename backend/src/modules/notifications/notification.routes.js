import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { NotificationController } from './notification.controller.js';
import { notificationIdParamsSchema } from './notification.schema.js';
/**
 * Phase 14: user-scoped notification operations backing the navbar. Every
 * route derives the recipient exclusively from the verified token; any
 * authenticated role may manage only its own rows.
 */
export const createNotificationRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new NotificationController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const withIdentity = [authenticate];
    router.get('/', ...withIdentity, controller.list);
    router.get('/unread-count', ...withIdentity, controller.unreadCount);
    router.post('/read-all', ...withIdentity, controller.markAllRead);
    router.patch('/:id/read', ...withIdentity, validateRequest({ params: notificationIdParamsSchema }), controller.markRead);

    // Admin manual push dispatch endpoint
    router.post('/admin-push', authenticate, async (request, response, next) => {
        try {
            const roles = request.auth?.roles || [];
            if (!roles.includes('ADMIN')) {
                return response.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin role required.' } });
            }
            const { targetType, targetBatchId, targetAuthUserIds, title, body, type, materialId, actionRoute } = request.body || {};
            if (!title || !body) {
                return response.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title and body are required.' } });
            }
            if (service.pushService) {
                const outcome = await service.pushService.sendPush({
                    targetType: targetType || 'ALL',
                    targetBatchId,
                    targetAuthUserIds,
                    title,
                    body,
                    type: type || 'ANNOUNCEMENT',
                    materialId,
                    actionRoute,
                });
                return response.status(200).json({ success: true, data: outcome });
            }
            response.status(200).json({ success: true, data: { sentCount: 0, message: 'Push service not configured.' } });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
