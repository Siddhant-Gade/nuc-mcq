import { ApiError } from '../utils/api-error.js';
import { SESSION_COOKIE_NAMES } from '../config/session.config.js';

export const isAllowedOrigin = (origin, allowedOrigins = []) => {
    if (!origin) return false;
    const allowedSet = new Set(allowedOrigins);
    if (allowedSet.has(origin)) return true;
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) return true;
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    return false;
};

export const createCsrfMiddleware = (allowedOrigins = []) => {
    const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    return (request, _response, next) => {
        // Safe methods do not mutate state
        if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
            return next();
        }

        // Requests bearing an explicit Authorization header are not vulnerable to browser ambient CSRF
        const authHeader = request.header('authorization');
        if (authHeader && /^Bearer\s+/i.test(authHeader.trim())) {
            return next();
        }

        // Check if this request is using a session cookie
        const cookies = request.cookies || {};
        const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) => Boolean(cookies[name]));

        if (!hasSessionCookie) {
            // Unauthenticated state-changing request (e.g. login / public endpoints)
            return next();
        }

        // Origin check for cookie-authenticated requests
        let requestOrigin = request.header('origin');
        if (!requestOrigin) {
            const referer = request.header('referer');
            if (referer) {
                try {
                    requestOrigin = new URL(referer).origin;
                } catch {
                    requestOrigin = undefined;
                }
            }
        }

        if (!requestOrigin || !isAllowedOrigin(requestOrigin, allowedOrigins)) {
            return next(new ApiError(403, 'CSRF_VALIDATION_FAILED', 'Cross-site request forgery validation failed: untrusted or missing origin.'));
        }

        next();
    };
};
