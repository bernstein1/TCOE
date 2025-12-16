import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function resetPassword() {
    console.log('🔄 Resetting admin password...');

    const email = 'admin@acme.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Generated hash for '${password}': ${hashedPassword}`);

    const client = await pool.connect();

    try {
        const res = await client.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id',
            [hashedPassword, email]
        );

        if (res.rowCount === 0) {
            console.error('❌ User not found!');
        } else {
            console.log('✅ Password updated successfully!');
        }
    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

resetPassword().catch(console.error);
