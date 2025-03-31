import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check your environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Adding is_favorite column to files table...');
  
  try {
    // Check if column exists first
    const { data: columnExists, error: checkError } = await supabase
      .from('files')
      .select('is_favorite')
      .limit(1)
      .maybeSingle();
    
    if (checkError && checkError.code === '42703') {
      // Column doesn't exist, so add it
      // Using raw SQL through RPC (requires the SQL function to be already created in the database)
      const { error } = await supabase
        .rpc('run_sql', { 
          sql: 'ALTER TABLE files ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;' 
        });

      if (error) {
        console.error('Migration failed:', error);
        return false;
      }
      
      console.log('Successfully added is_favorite column to files table');
      return true;
    } else if (checkError) {
      console.error('Error checking column existence:', checkError);
      return false;
    } else {
      console.log('Column is_favorite already exists, skipping migration');
      return true;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Run the migration
runMigration()
  .then(success => {
    if (success) {
      console.log('Migration completed successfully');
    } else {
      console.log('Migration failed');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  }); 