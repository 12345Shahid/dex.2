// API endpoint test script
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Initialize environment variables
dotenv.config();

// Base URL for API requests
const API_URL = 'http://localhost:8080/api';

// Helper to generate random data
const generateRandomData = () => {
  const username = 'test_' + Math.random().toString(36).substring(2, 10);
  const password = crypto.randomBytes(8).toString('hex');
  return { username, password };
};

// Test registration with referral
async function testRegistrationWithReferral() {
  try {
    console.log('Testing registration with referral...');
    
    // 1. Register first user (referrer)
    const referrer = generateRandomData();
    console.log('Creating referrer user:', referrer.username);
    
    const referrerRes = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(referrer)
    });
    
    if (!referrerRes.ok) {
      throw new Error(`Failed to register referrer: ${await referrerRes.text()}`);
    }
    
    const referrerData = await referrerRes.json();
    console.log('Referrer created with ID:', referrerData.id);
    console.log('Referral code:', referrerData.referralCode);
    
    // 2. Register second user with referral code
    const referred = generateRandomData();
    console.log('\nCreating referred user:', referred.username);
    
    const referredRes = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...referred,
        referrer: referrerData.referralCode
      })
    });
    
    if (!referredRes.ok) {
      throw new Error(`Failed to register referred user: ${await referredRes.text()}`);
    }
    
    const referredData = await referredRes.json();
    console.log('Referred user created with ID:', referredData.id);
    
    // 3. Login as referrer to check credits
    console.log('\nLogging in as referrer to check credits...');
    
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: referrer.username,
        password: referrer.password
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Failed to login as referrer: ${await loginRes.text()}`);
    }
    
    const loginData = await loginRes.json();
    console.log('Referrer credits after referral:', loginData.credits);
    
    // 4. Get referral credits count
    console.log('\nChecking referral credits count...');
    
    // Create a cookie jar for the session
    const cookies = loginRes.headers.get('set-cookie');
    
    const referralCreditsRes = await fetch(`${API_URL}/user/referral-credits`, {
      headers: { 
        'Cookie': cookies 
      }
    });
    
    if (!referralCreditsRes.ok) {
      throw new Error(`Failed to get referral credits: ${await referralCreditsRes.text()}`);
    }
    
    const referralCreditsData = await referralCreditsRes.json();
    console.log('Referral credits count:', referralCreditsData.count);
    
    // 5. Check notifications
    console.log('\nChecking notifications...');
    
    const notificationsRes = await fetch(`${API_URL}/notifications`, {
      headers: { 
        'Cookie': cookies 
      }
    });
    
    if (!notificationsRes.ok) {
      throw new Error(`Failed to get notifications: ${await notificationsRes.text()}`);
    }
    
    const notifications = await notificationsRes.json();
    console.log('Notifications:', notifications);
    
    return true;
  } catch (error) {
    console.error('API test failed:', error.message);
    return false;
  }
}

// Run the tests
console.log('=== API ENDPOINT TESTS ===\n');
console.log('NOTE: These tests require the server to be running at http://localhost:8080\n');
console.log('This is a demonstration script that shows how the API endpoints would be tested');
console.log('It demonstrates the flow but is not expected to successfully run without adaptation\n');

// Uncomment to run the actual test if server is running
// const success = await testRegistrationWithReferral();
// console.log(success ? '\nTests completed successfully!' : '\nTests failed!');

// Instead, just print the test flow
console.log('Test flow demonstration:');
console.log('1. Register first user (referrer)');
console.log('2. Register second user with referrer\'s referral code');
console.log('3. Login as referrer to check if credits were received');
console.log('4. Check referral credits count endpoint');
console.log('5. Check notifications endpoint for credit sharing events');
console.log('\nWhen the server is running, uncomment the testRegistrationWithReferral() call to execute the actual test.'); 