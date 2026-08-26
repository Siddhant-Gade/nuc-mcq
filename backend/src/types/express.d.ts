import type { AuthenticatedIdentity } from '../modules/auth/auth-token-verifier.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedIdentity;
    }
  }
}

export {};
