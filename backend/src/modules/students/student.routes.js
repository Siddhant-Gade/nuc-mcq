import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { StudentController } from './student.controller.js';
import { createStudentSchema, studentIdParamsSchema, updateStudentSchema, updateStudentStatusSchema, } from './student.schema.js';

export const createStudentRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new StudentController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const authorizeAdmin = requireRoles('ADMIN');
    router.use(authenticate, authorizeAdmin);
    router.get('/', controller.list);
    router.post('/', validateRequest({ body: createStudentSchema }), controller.create);
    router.get('/:id', validateRequest({ params: studentIdParamsSchema }), controller.getById);
    router.patch('/:id', validateRequest({ params: studentIdParamsSchema, body: updateStudentSchema }), controller.update);
    router.get('/:id/access', validateRequest({ params: studentIdParamsSchema }), controller.getAccess);
    router.get('/:id/performance', validateRequest({ params: studentIdParamsSchema }), controller.getPerformance);
    router.patch('/:id/access-status', validateRequest({ params: studentIdParamsSchema, body: updateStudentStatusSchema }), controller.updateAccessStatus);
    router.patch('/:id/suspend', validateRequest({ params: studentIdParamsSchema }), controller.suspend);
    router.patch('/:id/restore', validateRequest({ params: studentIdParamsSchema }), controller.restore);
    router.delete('/:id', validateRequest({ params: studentIdParamsSchema }), controller.delete);
    return router;
};
