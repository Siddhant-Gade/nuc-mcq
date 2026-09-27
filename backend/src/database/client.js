import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema/index.js';
const isProduction = env.NODE_ENV === 'production';
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isProduction && !env.DATABASE_URL.includes('localhost')
        ? { rejectUnauthorized: false }
        : undefined,
});
export const database = drizzle({ client: pool, schema });
export const verifyDatabaseConnection = async () => {
    await pool.query('select 1');
};
export const closeDatabaseConnection = async () => {
    await pool.end();
};
