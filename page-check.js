// page-check.js
// Simple utility to check if the front-end pages are available
import fetch from 'node-fetch';
import { setTimeout } from "timers/promises";

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Pages to check
const PAGES = [
  // Public pages
  { 
    url: '/',
    description: 'Home page',
    requiresAuth: false
  },
  { 
    url: '/login',
    description: 'Login page',
    requiresAuth: false
  },
  { 
    url: '/register',
    description: 'Register page',
    requiresAuth: false
  },
  { 
    url: '/contact',
    description: 'Contact page',
    requiresAuth: false
  },
  
  // Authenticated pages
  { 
    url: '/dashboard',
    description: 'Dashboard page',
    requiresAuth: true
  },
  { 
    url: '/files',
    description: 'Files page',
    requiresAuth: true
  },
  { 
    url: '/history',
    description: 'Chat history page',
    requiresAuth: true
  },
  {
    url: '/profile',
    description: 'Profile page',
    requiresAuth: true
  }
];

// Print a formatted heading
function printHeading(text) {
  console.log(`\n${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}${text}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.blue}======================================${COLORS.reset}\n`);
}

// Print a formatted result
function printResult(status, page, message) {
  let color;
  let prefix;
  
  switch (status) {
    case "OK":
      color = COLORS.green;
      prefix = "✓";
      break;
    case "WARN":
      color = COLORS.yellow;
      prefix = "!";
      break;
    case "ERROR":
      color = COLORS.red;
      prefix = "✗";
      break;
    default:
      color = COLORS.reset;
      prefix = "-";
  }
  
  console.log(`[${prefix}${status}] ${page.url} - ${page.description}`);
  if (message) {
    console.log(`  ${message}`);
  }
}

// Check server status
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:8080/');
    if (response.ok) {
      console.log(`${COLORS.green}✓ Server is running${COLORS.reset}`);
      return true;
    } else {
      console.log(`${COLORS.red}✗ Server returning errors${COLORS.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${COLORS.red}✗ Server not running or not reachable${COLORS.reset}`);
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

// Main function to check all pages
async function checkPages() {
  printHeading('FRONT-END PAGE AVAILABILITY CHECK');
  
  // First check if the server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    return;
  }
  
  // Results tracking
  const results = {
    success: 0,
    warning: 0,
    error: 0,
    total: PAGES.length
  };
  
  // Check each page
  for (const page of PAGES) {
    try {
      const response = await fetch(`http://localhost:8080${page.url}`, {
        redirect: 'manual' // Don't follow redirects automatically
      });
      
      if (page.requiresAuth) {
        // Special check for protected routes
        // We need to check if it contains client-side redirect logic
        if (response.status === 200) {
          const html = await response.text();
          
          // Look for React redirect component, useAuth hook, or other auth patterns
          if (
            html.includes('<ProtectedRoute') || 
            html.includes('useAuth') || 
            html.includes('isAuthenticated') ||
            html.includes('Redirect to="/auth"') ||
            html.includes('location.pathname = "/auth"') ||
            html.includes('navigate("/auth")') ||
            html.includes('Redirect to=/auth')
          ) {
            printResult("OK", page, "Protected page has authentication checks");
            results.success++;
          } else {
            printResult("WARN", page, "Protected page may not have proper authentication checks");
            results.warning++;
          }
        } 
        else if (response.status === 302 && 
                (response.headers.get('location')?.includes('/auth') || 
                 response.headers.get('location')?.includes('/login'))) {
          printResult("OK", page, "Protected page correctly redirects to auth");
          results.success++;
        } 
        else {
          printResult("WARN", page, `Protected page returns unexpected status: ${response.status}`);
          results.warning++;
        }
      } 
      // For public pages, check they're accessible
      else {
        if (response.status === 200) {
          printResult("OK", page, "Public page accessible");
          results.success++;
        } else {
          printResult("ERROR", page, `Public page returns status: ${response.status}`);
          results.error++;
        }
      }
    } catch (error) {
      printResult("ERROR", page, `Error checking page: ${error.message}`);
      results.error++;
    }
  }
  
  // Print summary
  printHeading('SUMMARY');
  
  const successPercent = (results.success / results.total * 100).toFixed(1);
  const warningPercent = (results.warning / results.total * 100).toFixed(1);
  const errorPercent = (results.error / results.total * 100).toFixed(1);
  
  console.log(`Successful: ${results.success}/${results.total} (${successPercent}%)`);
  console.log(`Warnings: ${results.warning}/${results.total} (${warningPercent}%)`);
  console.log(`Errors: ${results.error}/${results.total} (${errorPercent}%)`);
  
  if (results.success === results.total) {
    console.log(`\n${COLORS.green}${COLORS.bold}All front-end pages are available and properly secured.${COLORS.reset}`);
  } else if (results.error === 0) {
    console.log(`\n${COLORS.yellow}${COLORS.bold}Front-end pages are available but some have unexpected behavior.${COLORS.reset}`);
  } else {
    console.log(`\n${COLORS.red}${COLORS.bold}Some front-end pages are not working correctly.${COLORS.reset}`);
  }
}

// Run the check
checkPages().catch(error => {
  console.error(`${COLORS.red}${COLORS.bold}FATAL ERROR: ${error.message}${COLORS.reset}`);
  process.exit(1);
}); 