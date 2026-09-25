import { closeDatabaseConnection, verifyDatabaseConnection } from './client.js';
const main = async () => {
    try {
        await verifyDatabaseConnection();
        console.info('PostgreSQL connection verified.');
    }
    finally {
        await closeDatabaseConnection();
    }
};
void main().catch((error) => {
    console.error('PostgreSQL connection verification failed.', error);
    process.exitCode = 1;
});
