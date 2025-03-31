-- Add share_id column to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS share_id TEXT UNIQUE;

-- Create index for faster lookups on share_id
CREATE INDEX IF NOT EXISTS idx_files_share_id ON files(share_id); 