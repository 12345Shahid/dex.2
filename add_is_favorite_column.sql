-- Add is_favorite column to files table
ALTER TABLE files
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Update existing rows to set is_favorite to false
UPDATE files
SET is_favorite = FALSE
WHERE is_favorite IS NULL;

-- Add index for faster queries on favorites
CREATE INDEX IF NOT EXISTS idx_files_is_favorite ON files(user_id, is_favorite);

-- Create a function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_file_favorite(
  p_file_id INTEGER,
  p_is_favorite BOOLEAN
) RETURNS VOID AS $$
BEGIN
  UPDATE files
  SET is_favorite = p_is_favorite
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql; 