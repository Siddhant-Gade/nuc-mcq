import express, { type Express } from 'express';

import { createAuthenticationMiddleware } from './middleware/auth.middleware.js';
import { requireRoles } from './middleware/authorization.middleware.js';
import { createCorsMiddleware } from './middleware/cors.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import type { AuthTokenVerifier } from './modules/auth/auth-token-verifier.js';
import { ApiError } from './utils/api-error.js';
import { successResponse } from './utils/api-response.js';
import { createStudentRouter } from './modules/students/student.routes.js';
import type { StudentService } from './modules/students/student.service.js';
import { createBatchRouter } from './modules/batches/batch.routes.js';
import type { BatchService } from './modules/batches/batch.service.js';

type AppDependencies = {
  allowedCorsOrigins: readonly string[];
  tokenVerifier: AuthTokenVerifier;
  studentService: StudentService;
  batchService: BatchService;
};

export const createApp = ({ allowedCorsOrigins, tokenVerifier, studentService, batchService }: AppDependencies): Express => {
  const app = express();

  app.use(createCorsMiddleware(allowedCorsOrigins));
  app.use(express.json());

  const authenticationMiddleware = createAuthenticationMiddleware(tokenVerifier);

  app.get('/health', (_request, response) => {
    response.status(200).json(successResponse({ status: 'healthy' }));
  });

  app.get('/api/v1/auth/me', authenticationMiddleware, (request, response, next) => {
    if (request.auth === undefined) {
      next(new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.'));
      return;
    }

    response.status(200).json(successResponse({ identity: request.auth }));
  });

  app.get('/api/v1/admin/access-check', authenticationMiddleware, requireRoles('ADMIN'), (_request, response) => {
    response.status(200).json(successResponse({ message: 'Admin access confirmed.' }));
  });

  app.use('/api/v1/students', createStudentRouter(studentService, tokenVerifier));
  app.use('/api/v1/batches', createBatchRouter(batchService, tokenVerifier));

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
