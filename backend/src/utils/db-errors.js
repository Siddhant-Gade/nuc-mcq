/**
 * pg/driver error codes can arrive either directly on the thrown error or
 * nested inside a driver wrapper's `cause` chain (e.g. drizzle-orm wraps
 * driver failures in DrizzleQueryError). Walk the chain defensively.
 */
export function hasPostgresErrorCode(error, code) {
    let current = error;
    let depth = 0;
    while (typeof current === 'object' && current !== null && depth < 5) {
        const candidate = current;
        if (candidate.code === code) {
            return true;
        }
        current = candidate.cause;
        depth += 1;
    }
    return false;
}
export function isUniqueViolation(error) {
    return hasPostgresErrorCode(error, '23505');
}
