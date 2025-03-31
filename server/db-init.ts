import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config();

// Initialize Supabase client for authentication
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Connect to PostgreSQL directly for running migrations
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeSqlFile(filePath: string) {
  try {
    console.log(`Executing SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL directly with PG
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log(`Successfully executed ${filePath}`);
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Failed to execute ${filePath}:`, err);
    return false;
  }
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }
  
  const files = fs.readdirSync(migrationsDir);
  
  for (const file of files) {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      await executeSqlFile(filePath);
    }
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('Migrations completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  }); 