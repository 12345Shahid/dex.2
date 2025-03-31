-- Create the add_credits function that's missing
CREATE OR REPLACE FUNCTION add_credits(user_id INTEGER, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET credits = credits + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql; 