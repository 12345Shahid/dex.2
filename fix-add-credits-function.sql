-- Create or replace the add_credits function
CREATE OR REPLACE FUNCTION add_credits(user_id INTEGER, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  -- Log the attempt in the server logs
  RAISE NOTICE 'Adding % credits to user %', amount, user_id;

  -- Update the user's credits
  UPDATE users 
  SET credits = credits + amount 
  WHERE id = user_id;

  -- Log success
  RAISE NOTICE 'Credits updated successfully for user %', user_id;
END;
$$ LANGUAGE plpgsql; 