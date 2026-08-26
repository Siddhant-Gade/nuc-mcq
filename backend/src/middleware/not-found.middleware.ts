import type { NextFunction, Request, Response } from 'express';

import { ApiError } from '../utils/api-error.js';

export const notFoundMiddleware = (request: Request, _response: Response, next: NextFunction): void => {
  next(new ApiError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found.`));
};
