export const cookieParserMiddleware = (req, _res, next) => {
    const cookieHeader = req.headers.cookie;
    req.cookies = {};
    if (cookieHeader) {
        const parts = cookieHeader.split(';');
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.slice(0, equalIndex).trim();
                const val = trimmed.slice(equalIndex + 1).trim();
                try {
                    req.cookies[key] = decodeURIComponent(val);
                } catch {
                    req.cookies[key] = val;
                }
            }
        }
    }
    next();
};
