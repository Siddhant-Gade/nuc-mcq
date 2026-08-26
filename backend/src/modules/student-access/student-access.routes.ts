import { Router } from 'express';

import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
import type { AuthTokenVerifier } from '../auth/auth-token-verifier.js';
import type { StudentIdentityService } from './student-identity.service.js';

/**
 * Phase 10 student-facing surface. Identity is ALWAYS derived from the
 * verified token; no client-supplied student id is ever trusted.
 */
export const createStudentAccessRouter = (
  identityService: StudentIdentityService,
  tokenVerifier: AuthTokenVerifier,
): Router => {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(tokenVerifier);

  router.get('/me', authenticate, async (request, response, next) => {
    try {
      const authUserId = request.auth?.authUserId;
      if (authUserId === undefined) {
        throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
      }

      // Only identities linked by admin approval resolve to a student.
      const resolved =
        (await identityService.resolve(authUserId)) ??
        (() => {
          throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student profile is linked to this account.');
        })();

      response.status(200).json(
        successResponse({
          profile: resolved.profile,
          accessStatus: resolved.access.status,
          accessGrantedAt: resolved.access.accessGrantedAt,
          accessExpiryAt: resolved.access.accessExpiryAt,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
};
