import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeQuery(sql) {
  try {
    console.log('Executing SQL:', sql);
    
    // Execute raw SQL query
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('SQL Error:', error);
      return false;
    }
    
    console.log('SQL executed successfully:', data);
    return true;
  } catch (err) {
    console.error('Failed to execute SQL:', err);
    return false;
  }
}

async function applyFix() {
  try {
    console.log('Applying credit function fix...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(__dirname, 'fix-add-credits-function.sql'), 'utf8');
    
    // Apply the SQL fix
    const success = await executeQuery(sqlContent);
    
    if (success) {
      console.log('Credit function fix applied successfully!');
    } else {
      console.error('Failed to apply credit function fix.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error applying fix:', error);
    process.exit(1);
  }
}

// Run the function
applyFix(); 