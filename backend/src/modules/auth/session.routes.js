import { Router } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';

export const createSessionRouter = ({
    tokenVerifier,
    sessionStore,
    studentIdentityService,
}) => {
    const router = Router();
    const authenticate = createAuthenticationMiddleware(tokenVerifier, sessionStore, studentIdentityService);

    /**
     * POST /api/v1/auth/session
     * Exchanges a verified Supabase JWT Bearer token for an opaque server-managed
     * session stored in PostgreSQL, and issues an HttpOnly SameSite cookie.
     */
    router.post('/session', authenticate, async (request, response, next) => {
        try {
            if (!request.auth) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Valid authentication token is required.');
            }

            let resolvedStudent = null;
            if (studentIdentityService && request.auth.authUserId) {
                try {
                    resolvedStudent = await studentIdentityService.resolve(
                        request.auth.authUserId,
                        request.auth.email
                    );
                } catch (_) {}
            }

            if (resolvedStudent?.access?.status === 'REVOKED') {
                throw new ApiError(403, 'STUDENT_ACCESS_REVOKED', 'Access revoked, contact administrator.');
            }

            const roles = [...(request.auth.roles || [])];
            if (resolvedStudent?.access?.status === 'ACTIVE' && !roles.includes('STUDENT')) {
                roles.push('STUDENT');
            }

            const identity = {
                ...request.auth,
                roles,
                name: resolvedStudent?.profile?.name ?? request.auth.name,
                studentId: resolvedStudent?.profile?.studentId ?? request.auth.studentId,
                batchId: resolvedStudent?.profile?.batchId ?? null,
                batchName: resolvedStudent?.batchName ?? null,
                accessStatus: resolvedStudent?.access?.status ?? null,
            };

            const clientType = (request.body?.clientType || 'STUDENT_WEB').toString().trim();
            const ipAddress = request.ip || request.socket?.remoteAddress || null;
            const userAgent = request.header('user-agent') || null;

            const { rawToken } = await sessionStore.createSession({
                authUserId: request.auth.authUserId,
                studentProfileId: resolvedStudent?.profile?.id || null,
                studentId: resolvedStudent?.profile?.studentId || null,
                identity,
                clientType,
                ipAddress,
                userAgent,
            });

            response.setSessionCookie?.(rawToken);

            response.status(200).json(successResponse({ identity }));
        } catch (error) {
            next(error);
        }
    });

    /**
     * GET /api/v1/auth/session
     * Verifies the active HttpOnly session cookie and returns the student identity.
     */
    router.get('/session', authenticate, async (request, response, next) => {
        try {
            if (!request.auth) {
                throw new ApiError(401, 'AUTHENTICATION_ERROR', 'No active session found.');
            }

            response.status(200).json(successResponse({ identity: request.auth }));
        } catch (error) {
            next(error);
        }
    });

    /**
     * POST /api/v1/auth/logout
     * Revokes the active session in PostgreSQL and clears the session cookie.
     */
    router.post('/logout', async (request, response, next) => {
        try {
            // Optional session / bearer lookup to identify which session to revoke
            let rawSessionToken;
            if (request.cookies) {
                for (const name of ['__Host-student_session', 'student_session', 'nuc_session']) {
                    if (request.cookies[name]) {
                        rawSessionToken = request.cookies[name];
                        break;
                    }
                }
            }

            if (rawSessionToken && sessionStore) {
                try {
                    const session = await sessionStore.findSessionByToken(rawSessionToken);
                    if (session?.id) {
                        await sessionStore.revokeSession(session.id, 'USER_LOGOUT');
                    }
                } catch (_) {}
            }

            response.clearSessionCookie?.();
            response.status(200).json(successResponse({ message: 'Logged out successfully.' }));
        } catch (error) {
            next(error);
        }
    });

    return router;
};
