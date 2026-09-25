import { Router } from 'express';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
/**
 * Phase 10 student-facing surface. Identity is ALWAYS derived from the
 * verified token; no client-supplied student id is ever trusted.
 */
export const createStudentAccessRouter = (identityService, tokenVerifier) => {
    const router = Router();
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    router.get('/me', authenticate, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            if (authUserId === undefined) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            // Only identities linked by admin approval resolve to a student.
            const resolved = (await identityService.resolve(authUserId, request.auth?.email)) ??
                (() => {
                    throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student profile is linked to this account.');
                })();
            response.status(200).json(successResponse({
                profile: resolved.profile,
                accessStatus: resolved.access.status,
                accessGrantedAt: resolved.access.accessGrantedAt,
                accessExpiryAt: resolved.access.accessExpiryAt,
            }));
        }
        catch (error) {
            next(error);
        }
    });

    router.post('/fcm-token', authenticate, async (request, response, next) => {
        try {
            const authUserId = request.auth?.authUserId;
            if (!authUserId) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
            }
            const { token, platform } = request.body || {};
            if (!token || typeof token !== 'string') {
                throw new ApiError(400, 'VALIDATION_ERROR', 'FCM token is required.');
            }
            if (identityService.deviceTokenRepository) {
                await identityService.deviceTokenRepository.upsertToken(authUserId, token.trim(), platform || 'android');
            }
            response.status(200).json(successResponse({ registered: true }));
        } catch (error) {
            next(error);
        }
    });

    router.delete('/fcm-token', authenticate, async (request, response, next) => {
        try {
            const { token } = request.body || {};
            if (token && identityService.deviceTokenRepository) {
                await identityService.deviceTokenRepository.deleteToken(token.trim());
            }
            response.status(200).json(successResponse({ unregistered: true }));
        } catch (error) {
            next(error);
        }
    });

    return router;
};
