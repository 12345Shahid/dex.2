-- Fix the schema issues with the database
-- Run this in the Supabase SQL editor to fix the missing columns

-- 1. Add parent_id column to folders table if it doesn't exist
ALTER TABLE folders
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES folders(id);

-- 2. Add is_favorite column to files table if it doesn't exist
ALTER TABLE files
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- 3. Create index for faster queries on favorites
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(user_id, is_favorite);

-- 4. Create a function to update an existing password to the secure format
-- This can be run manually for specific users or from the application code
CREATE OR REPLACE FUNCTION secure_user_password(
  p_user_id INTEGER,
  p_password TEXT
) RETURNS TEXT AS $$
DECLARE
  salt TEXT;
  hashed TEXT;
  secure_password TEXT;
BEGIN
  -- Generate a random salt
  salt := encode(gen_random_bytes(16), 'hex');
  
  -- Generate scrypt hash (using digest as a simplified version)
  -- Note: In production, use scrypt directly if available
  hashed := encode(digest(p_password || salt, 'sha256'), 'hex');
  
  -- Format as hash.salt
  secure_password := hashed || '.' || salt;
  
  -- Update the user's password
  UPDATE users 
  SET password = secure_password
  WHERE id = p_user_id;
  
  RETURN secure_password;
END;
$$ LANGUAGE plpgsql; 