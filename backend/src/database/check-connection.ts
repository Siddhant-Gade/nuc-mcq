import { closeDatabaseConnection, verifyDatabaseConnection } from './client.js';

const main = async (): Promise<void> => {
  try {
    await verifyDatabaseConnection();
    console.info('PostgreSQL connection verified.');
  } finally {
    await closeDatabaseConnection();
  }
};

void main().catch((error: unknown) => {
  console.error('PostgreSQL connection verification failed.', error);
  process.exitCode = 1;
});
