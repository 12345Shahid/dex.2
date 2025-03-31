// Script to apply the credit function fix
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''; // Need service key for RPC

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    console.log('Applying credit function fix...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'fix-credit-function.sql'), 'utf8');
    
    // Execute the SQL using RPC (requires a Supabase function to run SQL)
    // Alternatively, you can use direct Postgres connection if available
    const { error } = await supabase.rpc('run_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error applying fix:', error);
      return false;
    }
    
    console.log('Credit function fix applied successfully!');
    return true;
  } catch (error) {
    console.error('Failed to apply fix:', error);
    return false;
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