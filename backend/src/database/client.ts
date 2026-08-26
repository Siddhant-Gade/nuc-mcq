import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const database = drizzle({ client: pool, schema });

export const verifyDatabaseConnection = async (): Promise<void> => {
  await pool.query('select 1');
};

export const closeDatabaseConnection = async (): Promise<void> => {
  await pool.end();
};
