/*
 * Frontend Referral Flow Test Script using Puppeteer
 * ------------------------------------------------
 * To run this test:
 * 1. Install Puppeteer: npm install puppeteer
 * 2. Make sure the application is running at http://localhost:3000
 * 3. Run: node test-frontend-flow.js
 */

import puppeteer from 'puppeteer';
import crypto from 'crypto';

// Helper to generate random data
const generateRandomUser = () => {
  const username = 'test_' + Math.random().toString(36).substring(2, 10);
  const password = crypto.randomBytes(8).toString('hex');
  return { username, password };
};

/**
 * Test the referral flow:
 * 1. User1 logs in and gets their referral link
 * 2. User2 clicks the referral link and registers
 * 3. System stores the referral code
 * 4. User2 earns credits, which are shared with User1
 * 5. Check User1's credits and notifications
 */
async function testReferralFlow() {
  console.log('Starting frontend referral flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    slowMo: 100 // Slow down operations for better visibility
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Create User1 (referrer)
    const referrer = generateRandomUser();
    console.log('Creating referrer user:', referrer.username);
    
    // Go to registration page
    await page.goto('http://localhost:3000/auth');
    await page.waitForSelector('input[name="username"]');
    
    // Fill out and submit registration form for User1
    await page.click('a[href="/auth?mode=register"]');
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', referrer.username);
    await page.type('input[name="password"]', referrer.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-container');
    console.log('Referrer registered successfully');
    
    // Get referral link from dashboard
    const referralLinkElement = await page.$('.referral-link-text');
    const referralLink = await page.evaluate(el => el.textContent, referralLinkElement);
    console.log('Referral link:', referralLink);
    
    // Log out User1
    await page.click('.logout-button');
    await page.waitForSelector('a[href="/auth"]');
    
    // Create User2 (referred)
    const referred = generateRandomUser();
    console.log('\nCreating referred user:', referred.username);
    
    // User2 clicks the referral link
    await page.goto(referralLink);
    
    // Should redirect to registration page with referral code in URL
    await page.waitForSelector('input[name="username"]');
    
    // Fill out and submit registration form for User2
    await page.type('input[name="username"]', referred.username);
    await page.type('input[name="password"]', referred.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-container');
    console.log('Referred user registered successfully');
    
    // Log out User2
    await page.click('.logout-button');
    await page.waitForSelector('a[href="/auth"]');
    
    // Log back in as User1 to check credits
    console.log('\nLogging back in as referrer to check credits');
    await page.goto('http://localhost:3000/auth');
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', referrer.username);
    await page.type('input[name="password"]', referrer.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-container');
    
    // Check credits
    const creditsElement = await page.$('.credits-display');
    const credits = await page.evaluate(el => el.textContent, creditsElement);
    console.log('Referrer credits after referral:', credits);
    
    // Check notifications
    await page.click('.notifications-button');
    await page.waitForSelector('.notification-item');
    
    const notifications = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.notification-item'))
        .map(item => item.textContent);
    });
    
    console.log('Notifications:', notifications);
    console.log('\nFrontend referral flow test completed successfully');
    
  } catch (error) {
    console.error('Frontend test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
// Comment out the following line if you don't want to run the test automatically
// await testReferralFlow();

// Print test flow instead
console.log('=== FRONTEND FLOW TEST ===\n');
console.log('NOTE: This test requires the application to be running at http://localhost:3000\n');
console.log('This is a conceptual demonstration of how to test the referral flow in the browser');
console.log('It demonstrates the flow but is not expected to run without proper setup\n');
console.log('Test flow demonstration:');
console.log('1. Register User1 (referrer)');
console.log('2. Get referral link from User1\'s dashboard');
console.log('3. User2 (referred) clicks the referral link and registers');
console.log('4. System stores the referral code during registration');
console.log('5. Login as User1 to check if credits were received');
console.log('6. Check notifications for credit sharing events');
console.log('\nWhen the app is running, uncomment the testReferralFlow() call to execute the actual test.'); 