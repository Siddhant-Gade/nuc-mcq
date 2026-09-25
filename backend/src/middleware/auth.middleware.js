import { ApiError } from '../utils/api-error.js';
const getBearerToken = (authorizationHeader) => {
    if (authorizationHeader === undefined) {
        return undefined;
    }
    const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim());
    return match?.[1]?.trim() || undefined;
};
export const createAuthenticationMiddleware = (tokenVerifier) => {
    return async (request, _response, next) => {
        const accessToken = getBearerToken(request.header('authorization'));
        if (accessToken === undefined) {
            next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
            return;
        }
        try {
            request.auth = await tokenVerifier.verify(accessToken);
            next();
        }
        catch {
            next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is invalid or expired.'));
        }
    };
};
