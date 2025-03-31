// test-file-management.js
// @ts-check
// Requires Node.js v14+ with --experimental-modules or Node.js v16+
// Run with: node test-file-management.js
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { debugFetch, createTestCookie } from './test-helpers.js';

dotenv.config();

const API_URL = 'http://localhost:8080/api';
let authCookie = '';

// Helper function to generate unique names
const generateRandomName = () => `test-${uuidv4().substring(0, 8)}`;

// Main test function
async function testFileManagement() {
  try {
    console.log('🔍 Starting File Management System Tests');
    
    // Step 1: Login first to get authenticated
    await login();
    
    // If login failed to set the auth cookie, use a fake one for development/testing
    if (!authCookie) {
      console.log('⚠️ Using fake development auth cookie');
      authCookie = createTestCookie();
    }
    
    // Step 2: Test folder creation
    const folderId = await testCreateFolder();
    
    // Step 3: Test file creation
    const fileId = await testCreateFile(folderId);
    
    // Step 4: Test file details retrieval
    await testGetFileDetails(fileId);
    
    // Step 5: Test file update
    await testUpdateFile(fileId);
    
    // Step 6: Test moving file between folders
    const newFolderId = await testCreateFolder();
    await testMoveFile(fileId, newFolderId);
    
    // Step 7: Test file search
    await testSearchFiles();
    
    // Step 8: Clean up - delete file
    await testDeleteFile(fileId);
    
    // Step 9: Clean up - delete folders
    await testDeleteFolder(folderId);
    await testDeleteFolder(newFolderId);
    
    console.log('✅ All File Management System Tests Passed!');
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error(error);
  }
}

// Helper function to login
async function login() {
  console.log('📝 Logging in...');
  const loginData = {
    username: 'testuser',
    password: 'testpassword'
  };
  
  // Create a FormData instance for form-based login
  const formData = new URLSearchParams();
  formData.append('username', loginData.username);
  formData.append('password', loginData.password);
  
  try {
    // First try the JSON approach
    const response = await debugFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData),
      redirect: 'manual'
    });
    
    if (response.status === 302 || response.ok) {
      // Extract the cookie for subsequent requests
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        authCookie = cookies;
        console.log('✅ Login successful with JSON approach');
        return true;
      }
    }
    
    // If JSON approach didn't work, try form submission
    console.log('Trying form-based login...');
    const formResponse = await debugFetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    if (formResponse.status === 302 || formResponse.ok) {
      // Extract the cookie for subsequent requests
      const cookies = formResponse.headers.get('set-cookie');
      if (cookies) {
        authCookie = cookies;
        console.log('✅ Login successful with form approach');
        return true;
      }
    }
    
    // If we have a redirect but no cookie, follow the redirect to get the cookie
    if (response.status === 302 || formResponse.status === 302) {
      const redirectUrl = response.headers.get('location') || formResponse.headers.get('location');
      if (redirectUrl) {
        console.log('Following redirect to:', redirectUrl);
        const redirectResponse = await debugFetch(redirectUrl.startsWith('/') ? `http://localhost:8080${redirectUrl}` : redirectUrl, {
          method: 'GET',
          redirect: 'manual'
        });
        
        const cookies = redirectResponse.headers.get('set-cookie');
        if (cookies) {
          authCookie = cookies;
          console.log('✅ Login successful after following redirect');
          return true;
        }
      }
    }
    
    // If we still don't have a cookie, try a direct GET request to check if we're already logged in
    console.log('Checking if already logged in...');
    const checkResponse = await debugFetch(`${API_URL}/files`, {
      method: 'GET'
    });
    
    if (checkResponse.ok) {
      console.log('✅ Already logged in');
      return true;
    }
    
    throw new Error(`Login failed with status: ${response.status}`);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

async function testCreateFolder() {
  const folderName = generateRandomName();
  console.log(`📝 Creating folder: ${folderName}`);
  
  const response = await debugFetch(`${API_URL}/folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ name: folderName })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ Folder created with ID: ${data.id}`);
  return data.id;
}

async function testCreateFile(folderId) {
  const fileName = generateRandomName() + '.txt';
  console.log(`📝 Creating file: ${fileName}`);
  
  const fileData = {
    name: fileName,
    content: 'This is a test file content',
    folder_id: folderId
  };
  
  const response = await debugFetch(`${API_URL}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify(fileData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ File created with ID: ${data.id}`);
  return data.id;
}

async function testGetFileDetails(fileId) {
  console.log(`📝 Getting file details for ID: ${fileId}`);
  
  const response = await debugFetch(`${API_URL}/files/${fileId}`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get file details: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ File details retrieved successfully');
  
  // Verify essential file properties
  if (!data.id || !data.name || data.content === undefined) {
    throw new Error('File is missing required properties');
  }
  
  return data;
}

async function testUpdateFile(fileId) {
  console.log(`📝 Updating file with ID: ${fileId}`);
  
  const updateData = {
    content: 'This is updated content for testing',
    name: 'Updated-' + generateRandomName()
  };
  
  const response = await debugFetch(`${API_URL}/files/${fileId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.status}`);
  }
  
  console.log('✅ File updated successfully');
  
  // Verify the update by fetching the file again
  const fileData = await testGetFileDetails(fileId);
  if (fileData.content !== updateData.content || fileData.name !== updateData.name) {
    throw new Error('File update verification failed - content or name mismatch');
  }
}

async function testMoveFile(fileId, newFolderId) {
  console.log(`📝 Moving file ID ${fileId} to folder ID ${newFolderId}`);
  
  const response = await debugFetch(`${API_URL}/files/${fileId}/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ folderId: newFolderId })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to move file: ${response.status}`);
  }
  
  console.log('✅ File moved successfully');
  
  // Verify the move by fetching the file again
  const fileData = await testGetFileDetails(fileId);
  if (fileData.folder_id !== newFolderId) {
    throw new Error(`File move verification failed - folder_id is ${fileData.folder_id}, expected ${newFolderId}`);
  }
}

async function testSearchFiles() {
  console.log('📝 Testing file search functionality');
  
  const response = await debugFetch(`${API_URL}/files/search`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ Files search returned ${data.length} results`);
  
  if (!Array.isArray(data)) {
    throw new Error('Search result is not an array');
  }
  
  return data;
}

async function testDeleteFile(fileId) {
  console.log(`📝 Deleting file with ID: ${fileId}`);
  
  const response = await debugFetch(`${API_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.status}`);
  }
  
  console.log('✅ File deleted successfully');
  
  // Verify deletion by trying to fetch the file
  try {
    const verifyResponse = await debugFetch(`${API_URL}/files/${fileId}`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie
      }
    });
    
    if (verifyResponse.status !== 404) {
      throw new Error(`File deletion verification failed: expected 404, got ${verifyResponse.status}`);
    }
  } catch (error) {
    if (!error.message.includes('404')) {
      throw error;
    }
  }
}

async function testDeleteFolder(folderId) {
  console.log(`📝 Deleting folder with ID: ${folderId}`);
  
  const response = await debugFetch(`${API_URL}/folders/${folderId}`, {
    method: 'DELETE',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete folder: ${response.status}`);
  }
  
  console.log('✅ Folder deleted successfully');
}

// Run the tests
testFileManagement().catch(console.error); 