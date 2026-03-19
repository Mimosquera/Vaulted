import pool from './database.js';

export const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Create images table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT,
        original_filename TEXT,
        mime_type TEXT,
        size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✓ Images table created/verified');

    // Check if url column exists, if not add it
    const urlCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='images' AND column_name='url'
    `);

    if (urlCheck.rows.length === 0) {
      console.log('Adding url column to images table...');
      await pool.query(`ALTER TABLE images ADD COLUMN url TEXT`);
      console.log('✓ Added url column');
    }

    // Check and add other columns if needed
    const otherColumns = ['original_filename', 'mime_type', 'size'];
    for (const col of otherColumns) {
      const check = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='images' AND column_name=$1
      `, [col]);

      if (check.rows.length === 0) {
        let columnDef = col === 'size' ? 'INTEGER' : 'TEXT';
        await pool.query(`ALTER TABLE images ADD COLUMN ${col} ${columnDef}`);
        console.log(`✓ Added ${col} column`);
      }
    }

    console.log('✓ Database schema initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
};

export default initDatabase;

