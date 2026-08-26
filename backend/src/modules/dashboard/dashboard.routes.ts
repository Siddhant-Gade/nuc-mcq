import { Router } from 'express';

import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import type { AuthTokenVerifier } from '../auth/auth-token-verifier.js';
import { DashboardController } from './dashboard.controller.js';
import type { DashboardService } from './dashboard.service.js';

export const createDashboardRouter = (service: DashboardService, tokenVerifier: AuthTokenVerifier): Router => {
  const router = Router();
  const controller = new DashboardController(service);
  const authenticate = createAuthenticationMiddleware(tokenVerifier);

  router.get('/stats', authenticate, requireRoles('ADMIN'), controller.getStats);

  return router;
};
