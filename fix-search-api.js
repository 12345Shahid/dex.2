import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import fetch from 'node-fetch';

dotenv.config();

const API_URL = 'http://localhost:8080/api';
let authCookie = null;

// Function to make a fetch request and log details
async function debugFetch(url, options = {}) {
  console.log(`\n🚀 [API Request] ${options.method || 'GET'} ${url}`);
  if (options.headers) console.log(`📋 Headers:`, options.headers);
  if (options.body) console.log(`📦 Body: ${options.body}`);

  const response = await fetch(url, options);
  console.log(`\n📥 [API Response] Status: ${response.status} ${response.statusText}`);
  console.log(`📋 Response Headers:`, response.headers.raw());

  // Clone the response to read the body without consuming it
  const clonedResponse = response.clone();
  
  try {
    const body = await clonedResponse.json();
    console.log(`📦 Response Body (JSON):`, body);
  } catch (e) {
    try {
      const text = await clonedResponse.text();
      console.log(`📦 Response Body (Text): ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
    } catch (e2) {
      console.log(`❌ Could not read response body: ${e2.message}`);
    }
  }

  return response;
}

// Fix the search API route in routes.ts
async function fixSearchAPIRoute() {
  console.log('🔧 Attempting to fix the search API route...');
  
  try {
    const routesFilePath = path.resolve('server/routes.ts');
    
    // Check if file exists
    if (!fs.existsSync(routesFilePath)) {
      console.error(`❌ File not found: ${routesFilePath}`);
      return false;
    }
    
    // Read file content
    let content = fs.readFileSync(routesFilePath, 'utf8');
    
    // Find the search endpoint code
    const searchEndpointRegex = /app\.get\("\/api\/files\/search"[\s\S]+?}\);/;
    const match = content.match(searchEndpointRegex);
    
    if (!match) {
      console.error('❌ Could not find the search endpoint in routes.ts');
      return false;
    }
    
    // Create a new implementation for the search endpoint
    const newSearchEndpoint = `app.get("/api/files/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Get the query parameter, defaulting to empty string if not provided
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    console.log(\`Search query: "\${query}" (\${query ? 'searching' : 'listing all'})\`);

    try {
      // Get both files and folders
      const files = await storage.searchFiles(req.user!.id, query);
      console.log(\`Search results: \${files.length} items found\`);
      res.json(files);
    } catch (error) {
      console.error('File search error:', error);
      res.status(500).json({ message: "Failed to search files" });
    }
  });`;
    
    // Replace the old implementation with the new one
    content = content.replace(searchEndpointRegex, newSearchEndpoint);
    
    // Write the modified content back to the file
    fs.writeFileSync(routesFilePath, content, 'utf8');
    
    console.log('✅ Successfully updated search endpoint in routes.ts');
    
    // Optionally restart the server
    console.log('🔄 Restarting the server...');
    exec('pkill -f "node server" && npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error restarting server: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Server stderr: ${stderr}`);
      }
      console.log(`Server restarted: ${stdout}`);
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error fixing search API route: ${error.message}`);
    return false;
  }
}

// Register a test user and get auth cookie
async function login() {
  console.log('📝 Creating test user and logging in...');
  
  const timestamp = Date.now();
  const testUser = {
    username: `test_user_${timestamp}`,
    password: 'password123',
    email: `test_${timestamp}@example.com`
  };
  
  try {
    const response = await debugFetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (response.ok) {
      // Extract the cookie from the response
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        authCookie = setCookieHeader;
        console.log('✅ Created new test user with authentication cookie');
        return true;
      }
    }
    
    console.log('❌ Failed to create test user and get auth cookie');
    return false;
  } catch (error) {
    console.log(`❌ Error during login: ${error.message}`);
    return false;
  }
}

// Create a test file
async function createTestFile() {
  console.log('📄 Creating a test file...');
  
  try {
    const testFile = {
      name: 'test-file.txt',
      content: 'This is a test file for search API',
      folderId: null
    };
    
    const response = await debugFetch(`${API_URL}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify(testFile)
    });
    
    if (response.ok) {
      console.log('✅ Test file created successfully');
      return true;
    }
    
    console.log('❌ Failed to create test file');
    return false;
  } catch (error) {
    console.log(`❌ Error creating test file: ${error.message}`);
    return false;
  }
}

// Create a test folder
async function createTestFolder() {
  console.log('📁 Creating a test folder...');
  
  try {
    const testFolder = {
      name: 'test-folder'
    };
    
    const response = await debugFetch(`${API_URL}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie
      },
      body: JSON.stringify(testFolder)
    });
    
    if (response.ok) {
      console.log('✅ Test folder created successfully');
      return true;
    }
    
    console.log('❌ Failed to create test folder');
    return false;
  } catch (error) {
    console.log(`❌ Error creating test folder: ${error.message}`);
    return false;
  }
}

// Test the search API endpoint
async function testSearchAPI() {
  console.log('\n🔍 Testing search API endpoint with empty query...');
  
  try {
    const response = await debugFetch(`${API_URL}/files/search`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Search successful: found ${data.length} items`);
      
      // Check what types of items were returned
      const fileCount = data.filter(item => 'content' in item || 'folder_id' in item).length;
      const folderCount = data.filter(item => !('content' in item) && !('folder_id' in item)).length;
      
      console.log(`📂 Files: ${fileCount}, Folders: ${folderCount}`);
      return true;
    } else {
      console.log(`❌ Failed to search: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error searching: ${error.message}`);
    return false;
  }
}

// Test with a specific search query
async function testSearchWithQuery() {
  console.log('\n🔍 Testing search API endpoint with specific query...');
  
  try {
    const response = await debugFetch(`${API_URL}/files/search?q=test`, {
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Search with query 'test' successful: found ${data.length} items`);
      
      // Check what types of items were returned
      const fileCount = data.filter(item => 'content' in item || 'folder_id' in item).length;
      const folderCount = data.filter(item => !('content' in item) && !('folder_id' in item)).length;
      
      console.log(`📂 Files: ${fileCount}, Folders: ${folderCount}`);
      return true;
    } else {
      console.log(`❌ Failed to search with query: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error searching with query: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Starting API search fix and test process');
  
  // Fix the search API route
  const routeFixed = await fixSearchAPIRoute();
  if (!routeFixed) {
    console.log('❌ Failed to fix search API route, stopping tests');
    return;
  }
  
  // Wait for server to restart
  console.log('⏳ Waiting for server to restart...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Login to get auth cookie
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('❌ Failed to login, stopping tests');
    return;
  }
  
  // Create test file and folder
  await createTestFile();
  await createTestFolder();
  
  // Test search API
  await testSearchAPI();
  await testSearchWithQuery();
  
  console.log('\n✅ Test process completed');
}

// Start the test process
runAllTests().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
}); 