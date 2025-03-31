import fetch from 'node-fetch';

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Base URL for the server
const BASE_URL = 'http://localhost:8080';

// Print a formatted heading
function printHeading(text) {
  console.log(`\n${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}${text}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}\n`);
}

// Check if the server is running
async function checkServerStatus() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      console.log(`${COLORS.green}✓ Server is running${COLORS.reset}`);
      return true;
    } else {
      console.log(`${COLORS.red}✗ Server is returning errors${COLORS.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${COLORS.red}✗ Server is not running or not reachable${COLORS.reset}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

// Main authentication check function
async function runAuthTest() {
  printHeading("AUTHENTICATION SYSTEM TEST");
  
  // First, check if the server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    return;
  }
  
  console.log("\n1. Testing login page accessibility...");
  try {
    const loginResponse = await fetch(`${BASE_URL}/auth`);
    if (loginResponse.ok) {
      const html = await loginResponse.text();
      if (html.includes('login') || html.includes('Login') || html.includes('Sign in') || html.includes('username') || html.includes('password')) {
        console.log(`${COLORS.green}✓ Login page is accessible and contains login form${COLORS.reset}`);
      } else {
        console.log(`${COLORS.yellow}! Login page is accessible but might not contain a login form${COLORS.reset}`);
      }
    } else {
      console.log(`${COLORS.red}✗ Login page returned error: ${loginResponse.status}${COLORS.reset}`);
    }
  } catch (error) {
    console.log(`${COLORS.red}✗ Error accessing login page: ${error.message}${COLORS.reset}`);
  }
  
  // Test if we get redirected when accessing protected routes
  console.log("\n2. Testing protected routes without authentication...");
  const protectedRoutes = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/files', name: 'Files' },
    { path: '/history', name: 'History' },
    { path: '/profile', name: 'Profile' }
  ];
  
  let redirectCount = 0;
  let authCheckCount = 0;
  let accessibleCount = 0;
  
  for (const route of protectedRoutes) {
    try {
      const response = await fetch(`${BASE_URL}${route.path}`, {
        redirect: 'manual'
      });
      
      // Check for explicit redirects (server-side)
      if (response.status === 302) {
        const location = response.headers.get('location');
        if (location && (location.includes('/auth') || location.includes('/login'))) {
          console.log(`${COLORS.green}✓ ${route.name}: Properly redirects to login${COLORS.reset}`);
          redirectCount++;
          continue;
        }
      }
      
      // For client-side routing, we need to check the content
      if (response.ok) {
        const html = await response.text();
        
        // Check if the content contains authentication markers
        const hasAuthComponent = 
          html.includes('<ProtectedRoute') || 
          html.includes('useAuth') || 
          html.includes('Redirect to="/auth"');
        
        // Check if the content contains protected content markers
        const hasContent = 
          (route.path === '/dashboard' && (html.includes('Dashboard') || html.includes('dashboard-content'))) ||
          (route.path === '/files' && (html.includes('Files') || html.includes('documents'))) ||
          (route.path === '/history' && (html.includes('Chat History') || html.includes('history-list'))) ||
          (route.path === '/profile' && (html.includes('Profile Settings') || html.includes('user-profile')));
        
        if (hasAuthComponent && !hasContent) {
          console.log(`${COLORS.green}✓ ${route.name}: Contains authentication check${COLORS.reset}`);
          authCheckCount++;
        } else if (hasContent) {
          console.log(`${COLORS.red}✗ ${route.name}: Protected content is accessible without auth${COLORS.reset}`);
          accessibleCount++;
        } else {
          console.log(`${COLORS.yellow}! ${route.name}: Returns HTML but auth status inconclusive${COLORS.reset}`);
        }
      } else {
        console.log(`${COLORS.yellow}! ${route.name}: Returned status ${response.status}${COLORS.reset}`);
      }
    } catch (error) {
      console.log(`${COLORS.red}✗ Error checking ${route.name}: ${error.message}${COLORS.reset}`);
    }
  }
  
  // Print summary
  printHeading("AUTHENTICATION TEST SUMMARY");
  
  const total = protectedRoutes.length;
  console.log(`Routes checked: ${total}`);
  console.log(`Routes with server redirects: ${redirectCount}`);
  console.log(`Routes with client-side auth checks: ${authCheckCount}`);
  console.log(`Routes accessible without auth: ${accessibleCount}`);
  
  if (redirectCount + authCheckCount === total) {
    console.log(`\n${COLORS.green}${COLORS.bold}✓ All protected routes are properly secured!${COLORS.reset}`);
  } else if (accessibleCount > 0) {
    console.log(`\n${COLORS.red}${COLORS.bold}✗ Some protected routes are accessible without authentication!${COLORS.reset}`);
  } else {
    console.log(`\n${COLORS.yellow}${COLORS.bold}! Authentication system needs review - some routes have inconclusive checks.${COLORS.reset}`);
  }
}

// Run the test
runAuthTest().catch(error => {
  console.error(`${COLORS.red}FATAL ERROR: ${error.message}${COLORS.reset}`);
  process.exit(1);
}); 