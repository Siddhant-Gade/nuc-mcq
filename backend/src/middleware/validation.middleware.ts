import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

import { ApiError } from '../utils/api-error.js';

type RequestValidationSchemas = {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
};

type ValidatedRequestData = {
  body?: unknown;
  params?: unknown;
  query?: unknown;
};

export const validateRequest = (schemas: RequestValidationSchemas): RequestHandler => {
  return (request: Request, response: Response, next: NextFunction): void => {
    const validated: ValidatedRequestData = {};

    for (const [location, schema] of Object.entries(schemas)) {
      if (schema === undefined) {
        continue;
      }

      const parsed = schema.safeParse(request[location as keyof Request]);

      if (!parsed.success) {
        next(new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.'));
        return;
      }

      validated[location as keyof ValidatedRequestData] = parsed.data;
    }

    response.locals.validated = validated;
    next();
  };
};
