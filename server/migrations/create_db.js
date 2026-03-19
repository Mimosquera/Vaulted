import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function createDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default postgres db first
  });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const dbName = process.env.DB_NAME || 'collection_app';

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rows.length > 0) {
      console.log(`✓ Database '${dbName}' already exists`);
    } else {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database '${dbName}' created successfully`);
    }

    await client.end();
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
}

createDatabase();
