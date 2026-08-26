import { Router } from 'express';

import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import type { AuthTokenVerifier } from '../auth/auth-token-verifier.js';
import { BatchController } from './batch.controller.js';
import { batchIdParamsSchema, createBatchSchema } from './batch.schema.js';
import type { BatchService } from './batch.service.js';

export const createBatchRouter = (service: BatchService, tokenVerifier: AuthTokenVerifier): Router => {
  const router = Router();
  const controller = new BatchController(service);
  const authenticate = createAuthenticationMiddleware(tokenVerifier);
  const authorizeAdmin = requireRoles('ADMIN');

  router.use(authenticate, authorizeAdmin);

  router.get('/', controller.list);
  router.get('/active', controller.listActive);
  router.post('/', validateRequest({ body: createBatchSchema }), controller.create);
  router.delete('/:batchId', validateRequest({ params: batchIdParamsSchema }), controller.remove);

  return router;
};
