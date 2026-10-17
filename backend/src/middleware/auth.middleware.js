import { ApiError } from '../utils/api-error.js';

const getBearerToken = (authorizationHeader) => {
    if (authorizationHeader === undefined) {
        return undefined;
    }
    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    return match?.[1]?.trim() || undefined;
};

export const createAuthenticationMiddleware = (tokenVerifier, sessionService) => {
    return async (request, _response, next) => {
        const effectiveSessionService = sessionService ?? tokenVerifier?.sessionService;

        // 1. Check for nuc_session cookie first
        const sessionCookie = request.cookies?.nuc_session;
        if (sessionCookie) {
            if (!effectiveSessionService) {
                next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session verification service is unavailable.'));
                return;
            }
            try {
                const session = await effectiveSessionService.validateSession(sessionCookie);
                if (!session) {
                    next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Session has expired or is invalid. Please sign in again.'));
                    return;
                }
                request.auth = session.identity;
                request.sessionRecord = session;
                next();
                return;
            } catch {
                next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Failed to validate session.'));
                return;
            }
        }

        // 2. If no cookie, fall back to Authorization: Bearer <JWT> (required for Flutter mobile)
        const accessToken = getBearerToken(request.header('authorization'));
        if (accessToken !== undefined) {
            try {
                request.auth = await tokenVerifier.verify(accessToken);
                next();
                return;
            } catch {
                next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is invalid or expired.'));
                return;
            }
        }

        // 3. Neither session cookie nor bearer token provided
        next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
    };
};
