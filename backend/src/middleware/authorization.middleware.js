import { ApiError } from '../utils/api-error.js';
export const requireRoles = (...allowedRoles) => {
    return (request, _response, next) => {
        const authenticatedRoles = request.auth?.roles ?? [];
        const isAuthorized = allowedRoles.some((role) => authenticatedRoles.includes(role));
        if (!isAuthorized) {
            next(new ApiError(403, 'AUTHORIZATION_ERROR', 'You are not authorized to access this resource.'));
            return;
        }
        next();
    };
};
