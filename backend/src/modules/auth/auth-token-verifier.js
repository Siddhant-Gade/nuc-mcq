import { createRemoteJWKSet, jwtVerify } from 'jose';
export const applicationRoles = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'];
const getVerifiedRoles = (appMetadata) => {
    if (appMetadata === null || typeof appMetadata !== 'object') {
        return [];
    }
    const role = appMetadata.role;
    return applicationRoles.includes(role) ? [role] : [];
};
export class SupabaseJwtVerifier {
    jwks;
    issuer;
    audience;
    constructor({ issuer, audience }) {
        this.issuer = issuer;
        this.audience = audience;
        this.jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`));
    }
    async verify(accessToken) {
        const { payload } = await jwtVerify(accessToken, this.jwks, {
            issuer: this.issuer,
            audience: this.audience,
        });
        if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
            throw new Error('Verified token does not contain a subject.');
        }
        return {
            authUserId: payload.sub,
            roles: getVerifiedRoles(payload.app_metadata),
            ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
        };
    }
}
