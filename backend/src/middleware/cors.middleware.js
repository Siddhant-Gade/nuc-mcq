export const createCorsMiddleware = (allowedOrigins) => {
    const allowedOriginSet = new Set(allowedOrigins);
    return (request, response, next) => {
        const origin = request.header('origin');
        if (origin !== undefined && allowedOriginSet.has(origin)) {
            response.setHeader('Access-Control-Allow-Origin', origin);
            response.setHeader('Access-Control-Allow-Credentials', 'true');
            response.setHeader('Vary', 'Origin');
            response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
            response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,X-Requested-With,X-CSRF-Token');
        }
        if (request.method === 'OPTIONS') {
            response.sendStatus(204);
            return;
        }
        next();
    };
};
