import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { ResultController } from './result.controller.js';
import { createResultSchema } from './result.schema.js';
export const createResultRouter = (service, tokenVerifier, requireActiveStudent) => {
    const router = Router();
    const controller = new ResultController(service, requireActiveStudent);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const authorizeStudent = requireRoles('STUDENT');
    router.post('/sync', authenticate, authorizeStudent, validateRequest({ body: createResultSchema }), controller.sync);
    return router;
};
