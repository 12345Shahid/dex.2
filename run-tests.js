// run-tests.js
// @ts-check
// Run with: node run-tests.js
import { execSync } from 'child_process';

/**
 * Runs the test setup and then all test files in sequence
 */
async function runTests() {
  console.log('===========================================================');
  console.log('🚀 Starting Project Planner Pro tests');
  console.log('===========================================================');
  
  try {
    console.log('\n📋 Setting up test user...');
    execSync('node test-setup.js', { stdio: 'inherit' });

    console.log('\n📋 Running File Management Tests...');
    execSync('node test-file-management.js', { stdio: 'inherit' });
    
    console.log('\n📋 Running Chat History Tests...');
    execSync('node test-chat-history.js', { stdio: 'inherit' });
    
    console.log('\n===========================================================');
    console.log('✅ All tests completed successfully!');
    console.log('===========================================================');
  } catch (error) {
    console.error('\n===========================================================');
    console.error('❌ Tests failed, please check the error messages above.');
    console.error('===========================================================');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
}); 