// test-chat-history.js
// @ts-check
// Requires Node.js v14+ with --experimental-modules or Node.js v16+
// Run with: node test-chat-history.js
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { debugFetch, createTestCookie } from './test-helpers.js';

dotenv.config();

const API_URL = 'http://localhost:8080/api';
let authCookie = '';

// Helper function to generate unique content
const generateRandomContent = () => `Test message ${uuidv4().substring(0, 8)}`;

// Main test function
async function testChatHistory() {
  try {
    console.log('🔍 Starting Chat History System Tests');
    
    // Step 1: Login first to get authenticated
    await login();
    
    // If login failed to set the auth cookie, use a fake one for development/testing
    if (!authCookie) {
      console.log('⚠️ Using fake development auth cookie');
      authCookie = createTestCookie();
    }
    
    // Step 2: Create a new chat (simulate chat)
    const chatId = await testCreateChat();
    
    // Step 3: Retrieve chat history
    await testGetChatHistory();
    
    // Step 4: Test favoriting a chat history item
    await testToggleFavorite(chatId);
    
    // Step 5: Get favorite chat history items
    await testGetFavoriteChatHistory();
    
    console.log('✅ All Chat History System Tests Passed!');
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
    const checkResponse = await debugFetch(`${API_URL}/chat/history`, {
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

async function testCreateChat() {
  const messageContent = generateRandomContent();
  console.log(`📝 Creating chat with content: ${messageContent}`);
  
  const chatData = {
    prompt: `Tell me about ${messageContent}`
  };
  
  const response = await debugFetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify(chatData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create chat: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('✅ Chat created successfully');
  
  // Now get the chat history to find the ID of the chat we just created
  const historyResponse = await debugFetch(`${API_URL}/chat/history`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!historyResponse.ok) {
    throw new Error(`Failed to get chat history: ${historyResponse.status}`);
  }
  
  const history = await historyResponse.json();
  
  if (history.length === 0) {
    throw new Error('Chat history is empty after creating a chat');
  }
  
  // Get the most recent chat (it should be the one we just created)
  const chatId = history[0].id;
  console.log(`✅ Retrieved chat ID: ${chatId}`);
  
  return chatId;
}

async function testGetChatHistory() {
  console.log('📝 Getting all chat history items');
  
  const response = await debugFetch(`${API_URL}/chat/history`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get chat history: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ Retrieved ${data.length} chat history items`);
  
  // Verify the response is an array
  if (!Array.isArray(data)) {
    throw new Error('Chat history response is not an array');
  }
  
  // Check that items have the required properties
  if (data.length > 0) {
    const item = data[0];
    if (!item.id || !item.created_at || item.user_message === undefined) {
      throw new Error('Chat history item is missing required properties');
    }
  }
  
  return data;
}

async function testToggleFavorite(chatId) {
  console.log(`📝 Toggling favorite status for chat ID: ${chatId}`);
  
  // First set to favorite
  let response = await debugFetch(`${API_URL}/chat/${chatId}/favorite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ isFavorite: true })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to set favorite: ${response.status}`);
  }
  
  console.log('✅ Chat marked as favorite');
  
  // Now get favorites to verify it was added
  response = await debugFetch(`${API_URL}/chat/favorites`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get favorites: ${response.status}`);
  }
  
  let data = await response.json();
  let found = data.some(item => item.id === chatId);
  
  if (!found) {
    throw new Error('Chat is not found in favorites after setting');
  }
  
  // Now toggle to unfavorite
  response = await debugFetch(`${API_URL}/chat/${chatId}/favorite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ isFavorite: false })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unset favorite: ${response.status}`);
  }
  
  console.log('✅ Chat unmarked as favorite');
  
  // Verify it's not in favorites anymore
  response = await debugFetch(`${API_URL}/chat/favorites`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get favorites: ${response.status}`);
  }
  
  data = await response.json();
  found = data.some(item => item.id === chatId);
  
  if (found) {
    throw new Error('Chat is still found in favorites after unsetting');
  }
  
  // Set it back to favorite for later tests
  response = await debugFetch(`${API_URL}/chat/${chatId}/favorite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ isFavorite: true })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reset favorite: ${response.status}`);
  }
}

async function testGetFavoriteChatHistory() {
  console.log('📝 Getting favorite chat history items');
  
  const response = await debugFetch(`${API_URL}/chat/favorites`, {
    method: 'GET',
    headers: {
      'Cookie': authCookie
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get favorite chat history: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`✅ Retrieved ${data.length} favorite chat history items`);
  
  // Verify the response is an array
  if (!Array.isArray(data)) {
    throw new Error('Favorite chat history response is not an array');
  }
  
  return data;
}

// Run the tests
testChatHistory().catch(console.error); 