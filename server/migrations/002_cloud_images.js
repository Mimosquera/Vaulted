import pool from '../config/database.js';

const schema = `
-- Rename old BYTEA table for 30-day safety period
ALTER TABLE IF EXISTS images RENAME TO images_v1;

-- Create new images table with URL storage for cloud-based images
CREATE TABLE IF NOT EXISTS images (
  id VARCHAR(36) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  original_filename VARCHAR(255),
  mime_type VARCHAR(50),
  size INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
`;

async function runMigration() {
  try {
    console.log('Starting cloud images migration...');

    await pool.query(schema);

    console.log('✓ Cloud images migration completed successfully');
    console.log('Note: Old images table renamed to images_v1 for safety. Drop after 30 days if needed.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
