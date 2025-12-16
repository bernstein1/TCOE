import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkUser() {
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT * FROM users WHERE email = $1', ['admin@acme.com']);
        console.log(res.rows);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUser().catch(console.error);
