import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { DashboardController } from './dashboard.controller.js';
export const createDashboardRouter = (service, tokenVerifier) => {
    const router = Router();
    const controller = new DashboardController(service);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    router.get('/stats', authenticate, requireRoles('ADMIN'), controller.getStats);
    router.get('/analytics', authenticate, requireRoles('ADMIN'), controller.getStudentAnalytics);
    return router;
};
