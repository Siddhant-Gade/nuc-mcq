import type { ErrorRequestHandler } from 'express';
import { z } from 'zod';

import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { errorResponse } from '../utils/api-response.js';

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, next): void => {
  void next;

  if (error instanceof ApiError) {
    response.status(error.statusCode).json(errorResponse(error.code, error.message));
    return;
  }

  if (error instanceof z.ZodError) {
    response.status(400).json(errorResponse('VALIDATION_ERROR', 'Request validation failed.'));
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json(errorResponse('VALIDATION_ERROR', 'Request body must be valid JSON.'));
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled request error', error);
  }

  response.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected server error occurred.'));
};
