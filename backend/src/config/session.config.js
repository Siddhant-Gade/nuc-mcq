export const SESSION_IDLE_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (for testing)
export const SESSION_ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SESSION_COOKIE_NAME_PROD = '__Host-student_session';
export const SESSION_COOKIE_NAME_DEV = 'student_session';
export const SESSION_COOKIE_NAMES = [
    SESSION_COOKIE_NAME_PROD,
    SESSION_COOKIE_NAME_DEV,
    'nuc_session',
];

/**
 * Returns options for Set-Cookie header.
 * In production, __Host- prefix requires Secure=true, Path=/, and no Domain attribute.
 */
export const getSessionCookieOptions = (isProduction) => ({
    httpOnly: true,
    secure: Boolean(isProduction),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_ABSOLUTE_LIFETIME_MS / 1000), // Max-Age in seconds
});

/**
 * Returns options to clear session cookies.
 */
export const getClearCookieOptions = (isProduction) => ({
    httpOnly: true,
    secure: Boolean(isProduction),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
});
