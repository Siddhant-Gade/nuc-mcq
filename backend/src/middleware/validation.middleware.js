import { ApiError } from '../utils/api-error.js';
export const validateRequest = (schemas) => {
    return (request, response, next) => {
        const validated = {};
        for (const [location, schema] of Object.entries(schemas)) {
            if (schema === undefined) {
                continue;
            }
            const parsed = schema.safeParse(request[location]);
            if (!parsed.success) {
                next(new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.'));
                return;
            }
            validated[location] = parsed.data;
        }
        response.locals.validated = validated;
        next();
    };
};
