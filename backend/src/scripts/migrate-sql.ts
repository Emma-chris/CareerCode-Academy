import { query } from '../config/db';
import fs from 'fs';
import path from 'path';

// Applies only the idempotent migrations/*.sql files in filename order.
// Unlike src/migrate.ts this does NOT rebuild the base schema or sync learning paths.

async function migrateSql() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('Migrations directory not found at:', migrationsDir);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} SQL migration files. Applying in order...`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await query(sql);
      console.log(`✓ ${file}`);
    } catch (err: any) {
      console.error(`✗ ${file}:`, err.message || err);
      process.exit(1);
    }
  }

  console.log('\nVerifying career pipeline objects...');
  const tables = [
    'job_applications',
    'projects',
    'portfolio_items',
    'guided_enrollments',
    'guided_loop_entries',
    'daily_checkins',
  ];
  for (const t of tables) {
    const res = await query('SELECT to_regclass($1) AS exists', [t]);
    console.log(`${t}: ${res.rows[0].exists ? 'OK' : 'MISSING'}`);
  }

  const columns = [
    ['jobs', 'skills'],
    ['internships', 'skills'],
    ['users', 'username'],
    ['users', 'portfolio_public'],
  ];
  for (const [table, column] of columns) {
    const res = await query(
      `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    console.log(`${table}.${column}: ${res.rows[0].n > 0 ? 'OK' : 'MISSING'}`);
  }

  console.log('Migration run complete.');
  process.exit(0);
}

migrateSql();