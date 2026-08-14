/**
 * Dedeepya Technologies CRM — Production User Seed Script
 * ========================================================
 * Safely upserts the 5 required Dedeepya Technologies users
 * into the PostgreSQL database WITHOUT deleting existing data.
 *
 * Usage (locally with DATABASE_URL set):
 *   DATABASE_URL=<your_render_db_url> node src/utils/seedUsers.js
 *
 * Or run on Render via Shell:
 *   node src/utils/seedUsers.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const poolConfig = {};
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else {
  poolConfig.host     = process.env.PGHOST     || 'localhost';
  poolConfig.port     = parseInt(process.env.PGPORT || '5432', 10);
  poolConfig.user     = process.env.PGUSER     || 'postgres';
  poolConfig.password = process.env.PGPASSWORD || 'postgres';
  poolConfig.database = process.env.PGDATABASE || 'crm_db';
}

const pool = new Pool(poolConfig);

const USERS = [
  { first_name: 'Dedeepya', last_name: 'Yannam', email: 'dedeepya@dedeepyatechnologies.com', role: 'Admin',           manager_email: null,                              phone: '+91 9000000001' },
  { first_name: 'Rahul',    last_name: 'Sharma', email: 'rahul@dedeepyatechnologies.com',    role: 'Sales Manager',   manager_email: 'dedeepya@dedeepyatechnologies.com', phone: '+91 9000000002' },
  { first_name: 'Priya',    last_name: 'Reddy',  email: 'priya@dedeepyatechnologies.com',    role: 'Sales Executive', manager_email: 'rahul@dedeepyatechnologies.com',    phone: '+91 9000000003' },
  { first_name: 'Arjun',    last_name: 'Kumar',  email: 'arjun@dedeepyatechnologies.com',    role: 'Sales Executive', manager_email: 'rahul@dedeepyatechnologies.com',    phone: '+91 9000000004' },
  { first_name: 'Sneha',    last_name: 'Rao',    email: 'sneha@dedeepyatechnologies.com',    role: 'Sales Executive', manager_email: 'rahul@dedeepyatechnologies.com',    phone: '+91 9000000005' },
];

async function seedUsers() {
  const client = await pool.connect();
  console.log('✅ Connected to PostgreSQL database.');

  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('✅ Password hash generated.');

    await client.query('BEGIN');

    for (const u of USERS) {
      // Resolve manager_id from email
      let manager_id = null;
      if (u.manager_email) {
        const mgr = await client.query('SELECT id FROM users WHERE email = $1', [u.manager_email]);
        if (mgr.rows.length > 0) manager_id = mgr.rows[0].id;
      }

      // Upsert user: insert if not exists, update if exists (preserves existing data)
      const result = await client.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, role, manager_id, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (email) DO UPDATE SET
          first_name    = EXCLUDED.first_name,
          last_name     = EXCLUDED.last_name,
          password_hash = EXCLUDED.password_hash,
          role          = EXCLUDED.role,
          manager_id    = EXCLUDED.manager_id,
          phone         = EXCLUDED.phone,
          is_active     = true,
          updated_at    = NOW()
        RETURNING id, first_name, last_name, email, role
      `, [u.first_name, u.last_name, u.email, passwordHash, u.role, manager_id, u.phone]);

      const row = result.rows[0];
      console.log(`  ✅ Upserted: [${row.role}] ${row.first_name} ${row.last_name} <${row.email}> (id=${row.id})`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 All 5 Dedeepya Technologies users seeded successfully!');
    console.log('\nCredentials:');
    USERS.forEach(u => console.log(`  ${u.role.padEnd(16)} | ${u.email.padEnd(45)} | password123`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
