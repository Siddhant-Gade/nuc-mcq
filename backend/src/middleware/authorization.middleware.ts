import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ApplicationRole } from '../modules/auth/auth-token-verifier.js';
import { ApiError } from '../utils/api-error.js';

export const requireRoles = (...allowedRoles: ApplicationRole[]): RequestHandler => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const authenticatedRoles = request.auth?.roles ?? [];
    const isAuthorized = allowedRoles.some((role) => authenticatedRoles.includes(role));

    if (!isAuthorized) {
      next(new ApiError(403, 'AUTHORIZATION_ERROR', 'You are not authorized to access this resource.'));
      return;
    }

    next();
  };
};
