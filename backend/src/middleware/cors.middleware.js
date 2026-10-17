export const createCorsMiddleware = (allowedOrigins) => {
    const allowedOriginSet = new Set(allowedOrigins);
    return (request, response, next) => {
        const origin = request.header('origin');
        if (origin !== undefined) {
            const isAllowed =
                allowedOriginSet.has(origin) ||
                origin.endsWith('.vercel.app') ||
                origin.endsWith('.onrender.com') ||
                /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

            if (isAllowed) {
                response.setHeader('Access-Control-Allow-Origin', origin);
                response.setHeader('Vary', 'Origin');
                response.setHeader('Access-Control-Allow-Credentials', 'true');
                response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
                response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept,X-Requested-With');
            }
        }
        if (request.method === 'OPTIONS') {
            response.sendStatus(204);
            return;
        }
        next();
    };
};
