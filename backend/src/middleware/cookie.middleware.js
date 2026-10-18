import { parse, serialize } from 'cookie';
import {
    getClearCookieOptions,
    getSessionCookieOptions,
    SESSION_COOKIE_NAME_DEV,
    SESSION_COOKIE_NAME_PROD,
    SESSION_COOKIE_NAMES,
} from '../config/session.config.js';

export const createCookieMiddleware = (isProduction = process.env.NODE_ENV === 'production') => {
    return (request, response, next) => {
        // Parse incoming cookies
        const rawCookieHeader = request.header('cookie') || '';
        request.cookies = parse(rawCookieHeader);

        // Helper to append a Set-Cookie header safely
        const appendSetCookie = (cookieStr) => {
            const existing = response.getHeader('Set-Cookie');
            if (!existing) {
                response.setHeader('Set-Cookie', cookieStr);
            } else if (Array.isArray(existing)) {
                response.setHeader('Set-Cookie', [...existing, cookieStr]);
            } else {
                response.setHeader('Set-Cookie', [existing, cookieStr]);
            }
        };

        // Helper to set the authenticated session cookie
        response.setSessionCookie = (rawToken) => {
            const cookieName = isProduction ? SESSION_COOKIE_NAME_PROD : SESSION_COOKIE_NAME_DEV;
            const options = getSessionCookieOptions(isProduction);
            const serialized = serialize(cookieName, rawToken, options);
            appendSetCookie(serialized);
        };

        // Helper to clear all potential session cookie variants
        response.clearSessionCookie = () => {
            for (const name of SESSION_COOKIE_NAMES) {
                // Clear with secure=true and secure=false variants to ensure complete removal across environments
                appendSetCookie(serialize(name, '', getClearCookieOptions(isProduction)));
                if (isProduction) {
                    appendSetCookie(serialize(name, '', getClearCookieOptions(false)));
                }
            }
        };

        next();
    };
};
