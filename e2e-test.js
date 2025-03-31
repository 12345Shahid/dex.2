import fetch from 'node-fetch';
import { randomBytes } from 'crypto';

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Base URL for the server
const BASE_URL = 'http://localhost:8080';

// Print a formatted heading
function printHeading(text) {
  console.log(`\n${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}${text}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}\n`);
}

// Print a step
function printStep(number, description) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}Step ${number}: ${description}${COLORS.reset}`);
}

// Print a result
function printResult(success, message) {
  if (success) {
    console.log(`${COLORS.green}✓ ${message}${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}✗ ${message}${COLORS.reset}`);
  }
}

// Check if the server is running
async function checkServerStatus() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      printResult(true, 'Server is running');
      return true;
    } else {
      printResult(false, `Server is returning errors: ${response.status}`);
      return false;
    }
  } catch (error) {
    printResult(false, `Server is not running or not reachable: ${error.message}`);
    return false;
  }
}

// Generate random credentials
function generateCredentials() {
  const randomString = randomBytes(8).toString('hex');
  return {
    username: `test_user_${randomString}`,
    password: `password_${randomString}`,
    email: `test_${randomString}@example.com`
  };
}

// Main end-to-end test function
async function runE2ETest() {
  printHeading('END-TO-END AUTHENTICATION TEST');
  
  // Check if server is running
  if (!await checkServerStatus()) {
    return;
  }
  
  const credentials = generateCredentials();
  let cookies = '';
  let authSuccess = false;
  
  // Step 1: Register a new user
  printStep(1, 'Register a new user');
  try {
    const registerResponse = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
        email: credentials.email
      })
    });
    
    if (registerResponse.ok) {
      // Store cookies for subsequent requests
      const setCookies = registerResponse.headers.raw()['set-cookie'];
      if (setCookies) {
        cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
      }
      
      printResult(true, `User ${credentials.username} registered successfully`);
      
      // Check if we got auth cookies
      if (cookies && cookies.includes('connect.sid')) {
        printResult(true, 'Authentication cookies received');
      } else {
        printResult(false, 'No authentication cookies received');
      }
    } else {
      const errorText = await registerResponse.text();
      printResult(false, `Registration failed: ${registerResponse.status} - ${errorText}`);
    }
  } catch (error) {
    printResult(false, `Registration request failed: ${error.message}`);
  }
  
  // Step 2: Login with the new user
  printStep(2, 'Login with registered user');
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password
      })
    });
    
    if (loginResponse.ok) {
      // Update cookies for subsequent requests
      const setCookies = loginResponse.headers.raw()['set-cookie'];
      if (setCookies) {
        cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
      }
      
      printResult(true, 'Login successful');
      authSuccess = true;
      
      // Check if we got auth cookies
      if (cookies && cookies.includes('connect.sid')) {
        printResult(true, 'Authentication cookies received');
      } else {
        printResult(false, 'No authentication cookies received');
      }
    } else {
      const errorText = await loginResponse.text();
      printResult(false, `Login failed: ${loginResponse.status} - ${errorText}`);
    }
  } catch (error) {
    printResult(false, `Login request failed: ${error.message}`);
  }
  
  // Step 3: Check user info to verify authentication
  if (authSuccess) {
    printStep(3, 'Verify user authentication');
    try {
      const userInfoResponse = await fetch(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': cookies
        }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        printResult(true, `Authenticated as: ${userInfo.username}`);
      } else {
        const errorText = await userInfoResponse.text();
        printResult(false, `Failed to get user info: ${userInfoResponse.status} - ${errorText}`);
      }
    } catch (error) {
      printResult(false, `User info request failed: ${error.message}`);
    }
  }
  
  // Step 4: Access protected routes
  if (authSuccess) {
    printStep(4, 'Access protected routes with authentication');
    
    const protectedRoutes = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/files', name: 'Files' },
      { path: '/history', name: 'History' },
      { path: '/profile', name: 'Profile' }
    ];
    
    for (const route of protectedRoutes) {
      try {
        const response = await fetch(`${BASE_URL}${route.path}`, {
          headers: {
            'Cookie': cookies
          }
        });
        
        if (response.ok) {
          const html = await response.text();
          // Check for signs of successful access (this is a simple check)
          if (html.includes('logout') || html.includes('sign out') || !html.includes('Redirect to="/auth"')) {
            printResult(true, `${route.name} accessible with authentication`);
          } else {
            printResult(false, `${route.name} redirects to login despite being authenticated`);
          }
        } else {
          printResult(false, `${route.name} returned error: ${response.status}`);
        }
      } catch (error) {
        printResult(false, `Error accessing ${route.name}: ${error.message}`);
      }
    }
  }
  
  // Step 5: Test API endpoints requiring auth
  if (authSuccess) {
    printStep(5, 'Test API endpoints requiring authentication');
    
    const apiEndpoints = [
      { path: '/api/files', name: 'Files API' },
      { path: '/api/chat/history', name: 'Chat History API' }
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`${BASE_URL}${endpoint.path}`, {
          headers: {
            'Cookie': cookies
          }
        });
        
        if (response.ok) {
          printResult(true, `${endpoint.name} accessible with authentication`);
        } else if (response.status === 401) {
          printResult(false, `${endpoint.name} returned unauthorized despite having auth cookies`);
        } else {
          printResult(false, `${endpoint.name} returned error: ${response.status}`);
        }
      } catch (error) {
        printResult(false, `Error accessing ${endpoint.name}: ${error.message}`);
      }
    }
  }
  
  // Step 6: Logout
  if (authSuccess) {
    printStep(6, 'Test logout functionality');
    
    try {
      const logoutResponse = await fetch(`${BASE_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Cookie': cookies
        }
      });
      
      if (logoutResponse.ok) {
        printResult(true, 'Logout successful');
        
        // Try accessing a protected route after logout
        printStep(7, 'Verify routes are protected after logout');
        
        const response = await fetch(`${BASE_URL}/dashboard`, {
          headers: {
            'Cookie': cookies
          },
          redirect: 'manual'
        });
        
        if (response.status === 302 || 
           (response.ok && response.text().then(html => html.includes('Redirect to="/auth"')))) {
          printResult(true, 'Protected routes redirect to login after logout');
        } else {
          printResult(false, 'Protected routes still accessible after logout');
        }
      } else {
        printResult(false, `Logout failed: ${logoutResponse.status}`);
      }
    } catch (error) {
      printResult(false, `Logout request failed: ${error.message}`);
    }
  }
  
  // Print summary
  printHeading('TEST SUMMARY');
  
  if (authSuccess) {
    console.log(`${COLORS.green}${COLORS.bold}✓ Authentication system appears to be working correctly!${COLORS.reset}`);
    console.log(`Test user: ${credentials.username}`);
  } else {
    console.log(`${COLORS.red}${COLORS.bold}✗ Authentication system test failed!${COLORS.reset}`);
    console.log('Review the errors above to identify issues with authentication flow.');
  }
}

// Run the test
runE2ETest().catch(error => {
  console.error(`${COLORS.red}FATAL ERROR: ${error.message}${COLORS.reset}`);
  process.exit(1);
}); 