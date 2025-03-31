# Referral System Test Suite

This directory contains test scripts for verifying the functionality of the referral and credit sharing system.

## Test Files

### 1. Supabase Database Test
- **File**: `test-referral-system.js`
- **Purpose**: Tests the direct database operations for the referral system.
- **Requirements**:
  - Supabase credentials (SUPABASE_URL and SUPABASE_ANON_KEY environment variables)
  - Node.js with ES modules support
- **How to run**:
  ```bash
  node test-referral-system.js
  ```

### 2. API Endpoints Test
- **File**: `test-api-endpoints.js`
- **Purpose**: Tests the API endpoints related to user registration with referrals, credit checking, and notifications.
- **Requirements**:
  - Server running at http://localhost:8080
  - Node.js with ES modules support
- **How to run**:
  ```bash
  node test-api-endpoints.js
  ```
- **Note**: Uncomment the actual test execution at the bottom of the file to run the test.

### 3. Frontend Flow Test
- **File**: `test-frontend-flow.js`
- **Purpose**: Simulates a user referral flow in the browser using Puppeteer.
- **Requirements**:
  - Application running at http://localhost:3000
  - Puppeteer installed: `npm install puppeteer`
  - Node.js with ES modules support
- **How to run**:
  ```bash
  node test-frontend-flow.js
  ```
- **Note**: Uncomment the actual test execution at the bottom of the file to run the test.

## Setup Notes

### Environment Variables
Create a `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Dependencies
Install required dependencies:
```bash
npm install dotenv @supabase/supabase-js node-fetch puppeteer
```

### Supabase Database Functions
To fully implement the credit sharing system in production, you'll need to create two PostgreSQL functions in your Supabase project:

1. `add_credits(user_id INTEGER, amount INTEGER)` - Adds credits to a user
2. A trigger or function to share credits with referrers

Example SQL for the `add_credits` function:
```sql
CREATE OR REPLACE FUNCTION add_credits(user_id INTEGER, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users SET credits = credits + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
```

## Test Cleanup
These tests create test users in your database. You can clean them up by uncommenting the cleanupTestUsers function call at the end of the test-referral-system.js file. 