import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { TeacherController } from './teacher.controller.js';
import { createTeacherSchema, updateTeacherSchema, teacherIdParamsSchema } from './teacher.schema.js';
export const createTeacherAdminRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new TeacherController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const requireAdmin = [authenticate, requireRoles('ADMIN')];
    router.get('/', ...requireAdmin, controller.list);
    router.post('/', ...requireAdmin, validateRequest({ body: createTeacherSchema }), controller.create);
    router.get('/:id', ...requireAdmin, validateRequest({ params: teacherIdParamsSchema }), controller.getById);
    router.patch('/:id', ...requireAdmin, validateRequest({ params: teacherIdParamsSchema, body: updateTeacherSchema }), controller.update);
    router.delete('/:id', ...requireAdmin, validateRequest({ params: teacherIdParamsSchema }), controller.remove);
    return router;
};
