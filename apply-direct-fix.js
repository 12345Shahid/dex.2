// Script to apply the credit function fix directly using pg
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

// Database connection string
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Create Postgres client
const { Pool } = pg;
const pool = new Pool({
  connectionString: databaseUrl,
});

async function applyFix() {
  let client;
  
  try {
    console.log('Applying credit function fix...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'fix-credit-function.sql'), 'utf8');
    
    // Get client from pool
    client = await pool.connect();
    
    // Execute the SQL directly
    await client.query(sqlContent);
    
    console.log('Credit function fix applied successfully!');
    return true;
  } catch (error) {
    console.error('Failed to apply fix:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the function
applyFix().then(success => {
  if (success) {
    console.log('Fix completed successfully');
    process.exit(0);
  } else {
    console.error('Fix failed');
    process.exit(1);
  }
}); 