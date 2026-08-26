import { createServer } from 'node:http';

import { env } from './config/env.js';
import { createApp } from './app.js';
import { closeDatabaseConnection, database } from './database/client.js';
import { SupabaseJwtVerifier } from './modules/auth/auth-token-verifier.js';
import { DrizzleStudentRepository } from './modules/students/student.repository.js';
import { StudentService } from './modules/students/student.service.js';

const tokenVerifier = new SupabaseJwtVerifier({
  issuer: env.SUPABASE_JWT_ISSUER,
  audience: env.SUPABASE_JWT_AUDIENCE,
});
const studentService = new StudentService(new DrizzleStudentRepository(database));
const app = createApp({
  allowedCorsOrigins: env.CORS_ORIGINS,
  tokenVerifier,
  studentService,
});
const server = createServer(app);
let isShuttingDown = false;

server.listen(env.PORT, () => {
  console.info(`Backend listening on port ${env.PORT} (${env.NODE_ENV}).`);
});

server.once('error', (error) => {
  console.error('Backend startup failed.', error);
  process.exitCode = 1;
});

const shutdown = (signal: string): void => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.info(`Received ${signal}; shutting down.`);
  server.close(() => {
    void closeDatabaseConnection()
      .catch((error: unknown) => {
        console.error('Failed to close the database connection.', error);
        process.exitCode = 1;
      })
      .finally(() => {
        process.exit();
      });
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
