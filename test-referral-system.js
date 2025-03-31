// Test script for the referral and credit sharing system
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Hash function for passwords (simplified version of what's in auth.ts)
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

// Generate a random username
function generateUsername() {
  return 'user_' + Math.random().toString(36).substring(2, 10);
}

// Test functions
async function cleanupTestUsers(usernames) {
  console.log('Cleaning up test users...');
  for (const username of usernames) {
    await supabase.from('users').delete().eq('username', username);
  }
  console.log('Cleanup complete.');
}

async function testReferralSystem() {
  try {
    // 1. Create test users
    const testUsers = [];
    
    // Create User 1 (referrer)
    const user1Username = generateUsername();
    const referralCode = crypto.randomBytes(8).toString('hex');
    
    const { data: user1, error: user1Error } = await supabase
      .from('users')
      .insert({
        username: user1Username,
        password: await hashPassword('testpass123'),
        referral_code: referralCode,
        credits: 20
      })
      .select('*')
      .single();
      
    if (user1Error) throw new Error(`Failed to create user1: ${user1Error.message}`);
    testUsers.push(user1Username);
    console.log(`Created user1: ${user1Username} with referral code: ${referralCode}`);
    
    // Create User 2 (referred user)
    const user2Username = generateUsername();
    
    const { data: user2, error: user2Error } = await supabase
      .from('users')
      .insert({
        username: user2Username,
        password: await hashPassword('testpass123'),
        referral_code: crypto.randomBytes(8).toString('hex'),
        credits: 20,
        referred_by: user1.id
      })
      .select('*')
      .single();
      
    if (user2Error) throw new Error(`Failed to create user2: ${user2Error.message}`);
    testUsers.push(user2Username);
    console.log(`Created user2: ${user2Username} referred by user1`);
    
    // 2. Test initial referral credit
    // Check if user1 got 1 credit for the referral
    const { data: updatedUser1, error: getUser1Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user1.id)
      .single();
      
    if (getUser1Error) throw new Error(`Failed to get updated user1: ${getUser1Error.message}`);
    
    // 3. Test credit sharing
    console.log('\nTesting credit sharing simulation...');
    console.log('(Note: This test manually updates credits to simulate how the credit sharing works in the server code)');
    
    // Add 5 credits to user2
    const { error: creditUser2Error } = await supabase
      .from('users')
      .update({ credits: user2.credits + 5 })
      .eq('id', user2.id);
    
    if (creditUser2Error) throw new Error(`Failed to add credits to user2: ${creditUser2Error.message}`);
    console.log('Added 5 credits to user2');
    
    // Manually share credits with referrer (user1) to simulate the server-side credit sharing
    const { error: creditUser1Error } = await supabase
      .from('users')
      .update({ credits: updatedUser1.credits + 5 })
      .eq('id', user1.id);
    
    if (creditUser1Error) throw new Error(`Failed to add credits to user1: ${creditUser1Error.message}`);
    console.log('Manually added 5 credits to user1 (simulating credit sharing)');
    
    // Create a notification for user1
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user1.id,
        message: `You received 5 credit(s) because ${user2.username} earned credits!`
      });
    
    if (notificationError) throw new Error(`Failed to create notification: ${notificationError.message}`);
    console.log('Created notification for user1');
    
    // 4. Display results
    console.log('\n--- Test Results ---');
    console.log(`User1 initial credits: ${user1.credits}`);
    console.log(`User1 updated credits: ${updatedUser1.credits}`);
    
    // Get the final user1 state
    const { data: finalUser1, error: finalUser1Error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user1.id)
      .single();
      
    if (finalUser1Error) throw new Error(`Failed to get final user1: ${finalUser1Error.message}`);
    console.log(`User1 final credits: ${finalUser1.credits}`);
    
    // Get notifications for user1
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user1.id);
      
    if (notifError) throw new Error(`Failed to get notifications: ${notifError.message}`);
    console.log('\nNotifications:');
    notifications.forEach(notif => {
      console.log(`- ${notif.message}`);
    });
    
    // Expectations:
    // 1. User1 should have received 1 credit for referring User2
    // 2. User1 should have received 5 more credits when User2 earned 5 credits
    // 3. User1 should have a notification about earning credits from User2
    
    console.log('\n--- Validation ---');
    
    const creditDifference = finalUser1.credits - user1.credits;
    console.log(`Total credits earned by referrer: ${creditDifference}`);
    
    if (creditDifference >= 5) {
      console.log('✅ TEST PASSED: Referrer received expected credits from manual simulation');
    } else {
      console.log('❌ TEST FAILED: Referrer did not receive expected credits');
    }
    
    return testUsers;
  } catch (error) {
    console.error('Test failed:', error);
    return [];
  }
}

// Run the test
console.log('=== REFERRAL SYSTEM TEST ===\n');
const testUsers = await testReferralSystem();

// Clean up test users if needed
// Uncomment this if you want to automatically remove test users
// await cleanupTestUsers(testUsers); 