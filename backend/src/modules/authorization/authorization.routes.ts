import { Router } from 'express';

import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import type { AuthTokenVerifier } from '../auth/auth-token-verifier.js';
import { AuthorizationRequestController } from './authorization.controller.js';
import { authorizationRequestIdParamsSchema } from './authorization.schema.js';
import type { AuthorizationRequestService } from './authorization.service.js';

export const createAuthorizationRequestRouter = (
  service: AuthorizationRequestService,
  tokenVerifier: AuthTokenVerifier,
): Router => {
  const router = Router();
  const controller = new AuthorizationRequestController(service);
  const authenticate = createAuthenticationMiddleware(tokenVerifier);
  const authorizeAdmin = requireRoles('ADMIN');

  router.use(authenticate, authorizeAdmin);

  // Literal routes are registered before the /:id route.
  router.get('/', controller.list);
  router.get('/pending', controller.listPending);
  router.get('/:id', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.getById);
  router.post('/:id/approve', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.approve);
  router.post('/:id/reject', validateRequest({ params: authorizationRequestIdParamsSchema }), controller.reject);

  return router;
};
