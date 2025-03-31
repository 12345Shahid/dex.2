import 'dotenv/config';
import { storage } from './storage';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUser() {
  try {
    console.log("Initializing storage...");
    await storage.init();
    
    // Check if test user already exists
    const username = "testuser";
    console.log(`Checking if user '${username}' exists...`);
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      console.log(`Test user '${username}' already exists with ID: ${existingUser.id}`);
      return;
    }
    
    // Create a new test user with known credentials
    const password = "testpassword";
    console.log(`Hashing password...`);
    const hashedPassword = await hashPassword(password);
    
    // Generate a unique referral code
    const referralCode = randomBytes(8).toString('hex');
    
    // Create user data
    const userData = {
      username,
      password: hashedPassword,
      referral_code: referralCode
    };
    
    console.log(`Creating user with data:`, { 
      username: userData.username, 
      passwordLength: userData.password.length,
      referral_code: userData.referral_code
    });
    
    const user = await storage.createUser(userData);
    console.log(`Created test user '${username}' with ID: ${user.id}`);
    console.log(`Use username: ${username} and password: ${password} to login`);
    
  } catch (error) {
    console.error("Failed to create test user:", error);
  }
}

// Run the function
createTestUser()
  .then(() => {
    console.log("Test user creation process completed");
    process.exit(0);
  })
  .catch(err => {
    console.error("Test user creation failed:", err);
    process.exit(1);
  }); 