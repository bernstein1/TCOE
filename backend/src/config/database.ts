import { Pool, PoolClient, QueryResult, QueryResultRow } from '@neondatabase/serverless';
import { config } from './env';
import { logger } from '../utils/logger';

// Use Neon's serverless driver
export const pool = new Pool({
  connectionString: config.database.url,
  max: 1, // Keep max low for serverless, though Neon driver handles this gracefully via HTTP
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: true, // Neon requires SSL
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', err);
  // Do not exit process in serverless; just log. The environment will recycle if needed.
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
  return result;
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  let lastQuery: string | null = null;

  // @ts-ignore - Override query to track last query
  client.query = (text: string, values?: unknown[]) => {
    lastQuery = text;
    return originalQuery(text, values);
  };

  client.release = () => {
    client.query = originalQuery;
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
