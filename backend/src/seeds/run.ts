import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runSeeds() {
  console.log('🌱 Running database seeds...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Read and execute init.sql
    const initSql = fs.readFileSync(
      path.join(__dirname, '../../seeds/init.sql'),
      'utf-8'
    );

    await client.query(initSql);

    await client.query('COMMIT');
    console.log('✅ Seeds completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds().catch((err) => {
  console.error(err);
  process.exit(1);
});
