import pool from '../config/database.js';

const schema = `
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_image_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_icon_color VARCHAR(7) DEFAULT '#8b5cf6',
  ADD COLUMN IF NOT EXISTS bio VARCHAR(180);
`;

async function runMigration() {
  try {
    console.log('Starting user profile fields migration...');

    await pool.query(schema);

    console.log('✓ User profile fields migration completed successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
