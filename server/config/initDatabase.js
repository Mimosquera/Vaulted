import pool from './database.js';

export const initDatabase = async () => {
  try {
    console.log('Initializing database schema...');

    // Check if images table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'images'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create fresh images table
      await pool.query(`
        CREATE TABLE images (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          url TEXT NOT NULL,
          original_filename TEXT,
          mime_type TEXT,
          size INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created new images table');
    } else {
      // Table exists, check and migrate schema
      console.log('Images table exists, checking schema...');

      // Make data column nullable if it exists (old schema migration)
      try {
        await pool.query(`
          ALTER TABLE images ALTER COLUMN data DROP NOT NULL;
        `);
        console.log('✓ Made data column nullable');
      } catch (err) {
        // Column might not exist, that's fine
      }

      // Ensure url column exists and is NOT NULL for new uploads
      try {
        await pool.query(`
          ALTER TABLE images ADD COLUMN url TEXT NOT NULL DEFAULT '';
        `);
        console.log('✓ Added url column');
      } catch (err) {
        // Column might already exist
        if (!err.message.includes('already exists')) {
          console.error('Error adding url column:', err.message);
        }
      }

      // Add other columns if missing
      const otherColumns = [
        { name: 'original_filename', type: 'TEXT' },
        { name: 'mime_type', type: 'TEXT' },
        { name: 'size', type: 'INTEGER' }
      ];

      for (const col of otherColumns) {
        try {
          await pool.query(
            `ALTER TABLE images ADD COLUMN ${col.name} ${col.type};`
          );
          console.log(`✓ Added ${col.name} column`);
        } catch (err) {
          if (!err.message.includes('already exists')) {
            console.error(`Error adding ${col.name}:`, err.message);
          }
        }
      }
    }

    console.log('✓ Database schema initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
};

export default initDatabase;


