import pool from './database.js';

export const initDatabase = async () => {
  try {
    // Check if images table has url column
    const tableCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='images' AND column_name='url'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('Adding url column to images table...');
      await pool.query(`
        ALTER TABLE images
        ADD COLUMN url TEXT,
        ADD COLUMN original_filename TEXT,
        ADD COLUMN mime_type TEXT,
        ADD COLUMN size INTEGER
      `);
      console.log('✓ Database schema updated');
    } else {
      console.log('✓ Database schema is up to date');
    }
  } catch (err) {
    console.error('Database initialization error:', err);
    // Don't exit - the app can still run with the old schema
  }
};

export default initDatabase;
