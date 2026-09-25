import { ApiError } from '../utils/api-error.js';
export const notFoundMiddleware = (request, _response, next) => {
    next(new ApiError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found.`));
};
