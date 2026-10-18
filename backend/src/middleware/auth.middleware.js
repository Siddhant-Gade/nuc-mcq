import { ApiError } from '../utils/api-error.js';
import {
    SESSION_COOKIE_NAME_DEV,
    SESSION_COOKIE_NAME_PROD,
    SESSION_COOKIE_NAMES,
} from '../config/session.config.js';

const getBearerToken = (authorizationHeader) => {
    if (authorizationHeader === undefined) {
        return undefined;
    }
    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    return match?.[1]?.trim() || undefined;
};

export const createAuthenticationMiddleware = (
    tokenVerifier,
    sessionStore,
    studentIdentityService
) => {
    const store = sessionStore || tokenVerifier?.sessionStore;
    const identityService = studentIdentityService || tokenVerifier?.studentIdentityService;

    return async (request, response, next) => {
        // 1. Try Cookie-based Session Authentication
        let rawSessionToken;
        if (request.cookies) {
            for (const name of SESSION_COOKIE_NAMES) {
                if (request.cookies[name]) {
                    rawSessionToken = request.cookies[name];
                    break;
                }
            }
        }

        if (rawSessionToken && store) {
            try {
                const session = await store.findSessionByToken(rawSessionToken);

                if (!session) {
                    response.clearSessionCookie?.();
                    return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session is invalid or has expired.'));
                }

                if (session.revokedAt) {
                    response.clearSessionCookie?.();
                    return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session has been revoked.'));
                }

                const now = new Date();

                // Idle timeout check (30 minutes)
                if (now > new Date(session.expiresAt)) {
                    await store.revokeSession(session.id, 'IDLE_TIMEOUT').catch(() => {});
                    response.clearSessionCookie?.();
                    return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session expired due to inactivity. Please sign in again.'));
                }

                // Absolute lifetime check (7 days)
                if (now > new Date(session.absoluteExpiresAt)) {
                    await store.revokeSession(session.id, 'ABSOLUTE_TIMEOUT').catch(() => {});
                    response.clearSessionCookie?.();
                    return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session expired. Please sign in again.'));
                }

                // Live student access status check
                let resolvedStudent = null;
                if (identityService && session.authUserId) {
                    try {
                        resolvedStudent = await identityService.resolve(session.authUserId, session.identity?.email);
                    } catch (_) {}

                    if (resolvedStudent) {
                        if (resolvedStudent.access?.status === 'REVOKED') {
                            await store.revokeSession(session.id, 'STUDENT_ACCESS_REVOKED').catch(() => {});
                            response.clearSessionCookie?.();
                            return next(new ApiError(403, 'STUDENT_ACCESS_REVOKED', 'Access revoked, contact administrator.'));
                        }

                        if (resolvedStudent.access?.status === 'SUSPENDED') {
                            return next(new ApiError(403, 'STUDENT_ACCESS_SUSPENDED', resolvedStudent.access.suspensionReason || 'Student access has been suspended by the administrator.'));
                        }
                    }
                }

                // Refresh idle activity if > 60 seconds since last activity
                const lastActivityMs = new Date(session.lastActivityAt).getTime();
                if (now.getTime() - lastActivityMs > 60_000) {
                    store.touchSessionActivity(session.id).catch(() => {});
                }

                // Build authenticated request identity
                const identity = { ...(session.identity || {}) };
                if (resolvedStudent) {
                    identity.name = resolvedStudent.profile?.name ?? identity.name;
                    identity.studentId = resolvedStudent.profile?.studentId ?? identity.studentId;
                    identity.batchId = resolvedStudent.profile?.batchId ?? identity.batchId;
                    identity.batchName = resolvedStudent.batchName ?? identity.batchName;
                    identity.accessStatus = resolvedStudent.access?.status ?? identity.accessStatus;

                    const roles = Array.isArray(identity.roles) ? [...identity.roles] : [];
                    if (resolvedStudent.access?.status === 'ACTIVE' && !roles.includes('STUDENT')) {
                        roles.push('STUDENT');
                    } else if (resolvedStudent.access?.status !== 'ACTIVE') {
                        const sIdx = roles.indexOf('STUDENT');
                        if (sIdx !== -1) roles.splice(sIdx, 1);
                    }
                    identity.roles = roles;
                }

                request.auth = identity;
                request.session = session;
                request.authType = 'cookie';
                return next();
            } catch (err) {
                return next(err);
            }
        }

        // 2. Fallback to Bearer Token Authentication (Mobile App & Admin Web)
        const accessToken = getBearerToken(request.header('authorization'));
        if (accessToken === undefined) {
            return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
        }

        try {
            const identity = await tokenVerifier.verify(accessToken);
            request.auth = identity;
            request.authType = 'bearer';
            return next();
        } catch {
            return next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is invalid or expired.'));
        }
    };
};
