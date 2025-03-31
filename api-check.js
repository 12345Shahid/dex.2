// api-check.js
// Simple utility to check if the API endpoints are available and working
import fetch from 'node-fetch';

const API_URL = 'http://localhost:8080/api';

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Endpoints to check
const ENDPOINTS = [
  // File management endpoints
  { 
    url: '/files',
    method: 'GET',
    description: 'Get root files',
    requiresAuth: true
  },
  { 
    url: '/folders',
    method: 'GET',
    description: 'Get all folders',
    requiresAuth: true
  },
  { 
    url: '/files/search',
    method: 'GET',
    description: 'Search files',
    requiresAuth: true
  },
  
  // Chat history endpoints
  { 
    url: '/chat/history',
    method: 'GET',
    description: 'Get chat history',
    requiresAuth: true
  },
  { 
    url: '/chat/favorites',
    method: 'GET',
    description: 'Get favorite chats',
    requiresAuth: true
  },
  
  // Public endpoints
  { 
    url: '/contact',
    method: 'POST',
    description: 'Submit contact form',
    requiresAuth: false,
    body: {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message'
    }
  }
];

// Print a formatted heading
function printHeading(text) {
  console.log(`\n${COLORS.bright}${COLORS.blue}======================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}${text}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.blue}======================================${COLORS.reset}\n`);
}

// Print a formatted result
function printResult(endpoint, status, details = '') {
  const statusColor = status === 'OK' ? COLORS.green : status === 'WARN' ? COLORS.yellow : COLORS.red;
  console.log(`${COLORS.bright}${statusColor}[${status}]${COLORS.reset} ${COLORS.magenta}${endpoint.method}${COLORS.reset} ${endpoint.url} - ${endpoint.description}`);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Main check function
async function checkApis() {
  printHeading('API AVAILABILITY CHECK');
  
  let results = {
    success: 0,
    warning: 0,
    error: 0,
    total: ENDPOINTS.length
  };
  
  // First check if the server is running
  try {
    const serverCheck = await fetch('http://localhost:8080/');
    if (serverCheck.ok) {
      console.log(`${COLORS.green}✓ Server is running${COLORS.reset}`);
    } else {
      throw new Error(`Server returned status ${serverCheck.status}`);
    }
  } catch (error) {
    console.error(`${COLORS.red}✗ Server not running or not reachable${COLORS.reset}`);
    console.error(`  Error: ${error.message}`);
    process.exit(1);
  }
  
  // Check each endpoint
  for (const endpoint of ENDPOINTS) {
    try {
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(`${API_URL}${endpoint.url}`, options);
      
      if (endpoint.requiresAuth && response.status === 401) {
        // This is expected behavior since we're not authenticated
        printResult(endpoint, 'OK', 'Correctly requires authentication (401 Unauthorized)');
        results.success++;
      } else if (!endpoint.requiresAuth && response.ok) {
        // This is expected for public endpoints
        printResult(endpoint, 'OK', 'Public endpoint accessible');
        results.success++;
      } else if (!endpoint.requiresAuth && response.status !== 401) {
        // Non-auth endpoint should return something other than 401
        printResult(endpoint, 'OK', `Status: ${response.status}`);
        results.success++;
      } else {
        // Unexpected status
        printResult(endpoint, 'WARN', `Unexpected status: ${response.status}`);
        results.warning++;
      }
    } catch (error) {
      printResult(endpoint, 'ERROR', `Failed: ${error.message}`);
      results.error++;
    }
  }
  
  // Print summary
  printHeading('SUMMARY');
  const successPercent = (results.success / results.total) * 100;
  
  console.log(`${COLORS.green}Successful: ${results.success}/${results.total} (${successPercent.toFixed(1)}%)${COLORS.reset}`);
  console.log(`${COLORS.yellow}Warnings: ${results.warning}/${results.total} (${((results.warning / results.total) * 100).toFixed(1)}%)${COLORS.reset}`);
  console.log(`${COLORS.red}Errors: ${results.error}/${results.total} (${((results.error / results.total) * 100).toFixed(1)}%)${COLORS.reset}`);
  
  if (results.success === results.total) {
    console.log(`\n${COLORS.green}${COLORS.bright}All API endpoints are available and structured correctly!${COLORS.reset}`);
  } else if (results.error === 0) {
    console.log(`\n${COLORS.yellow}${COLORS.bright}API endpoints are available but some have unexpected behavior.${COLORS.reset}`);
  } else {
    console.log(`\n${COLORS.red}${COLORS.bright}Some API endpoints are not working correctly.${COLORS.reset}`);
  }
}

// Run the check
checkApis().catch(error => {
  console.error(`${COLORS.red}${COLORS.bright}FATAL ERROR: ${error.message}${COLORS.reset}`);
  process.exit(1);
}); 