import { createRemoteJWKSet, jwtVerify } from 'jose';

export const applicationRoles = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
export type ApplicationRole = (typeof applicationRoles)[number];

export type AuthenticatedIdentity = {
  authUserId: string;
  email?: string;
  roles: ApplicationRole[];
};

export interface AuthTokenVerifier {
  verify(accessToken: string): Promise<AuthenticatedIdentity>;
}

type SupabaseJwtVerifierOptions = {
  issuer: string;
  audience: string;
};

const getVerifiedRoles = (appMetadata: unknown): ApplicationRole[] => {
  if (appMetadata === null || typeof appMetadata !== 'object') {
    return [];
  }

  const role = (appMetadata as Record<string, unknown>).role;
  return applicationRoles.includes(role as ApplicationRole) ? [role as ApplicationRole] : [];
};

export class SupabaseJwtVerifier implements AuthTokenVerifier {
  private readonly jwks;
  private readonly issuer: string;
  private readonly audience: string;

  public constructor({ issuer, audience }: SupabaseJwtVerifierOptions) {
    this.issuer = issuer;
    this.audience = audience;
    this.jwks = createRemoteJWKSet(new URL(`${issuer.replace(/\/$/, '')}/.well-known/jwks.json`));
  }

  public async verify(accessToken: string): Promise<AuthenticatedIdentity> {
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
