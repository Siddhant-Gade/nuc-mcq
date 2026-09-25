import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { BatchController } from './batch.controller.js';
import { batchIdParamsSchema, createBatchSchema } from './batch.schema.js';
import { successResponse } from '../../utils/api-response.js';
export const createBatchRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new BatchController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const authorizeAdmin = requireRoles('ADMIN');
    router.use(authenticate, authorizeAdmin);
    router.get('/', controller.list);
    router.get('/active', controller.listActive);
    router.post('/', validateRequest({ body: createBatchSchema }), controller.create);
    router.delete('/:batchId', validateRequest({ params: batchIdParamsSchema }), controller.remove);
    router.patch('/:batchId/teacher', async (request, response, next) => {
        try {
            const { batchId } = request.params;
            const { teacherId } = request.body;
            const result = await service.assignTeacher(batchId, teacherId ?? null);
            response.status(200).json(successResponse(result));
        } catch (error) { next(error); }
    });
    return router;
};
