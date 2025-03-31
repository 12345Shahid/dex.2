// test-setup.js
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createServer } from 'http';
import { URLSearchParams } from 'url';

dotenv.config();

const API_URL = 'http://localhost:8080/api';

// Create a simple server to capture cookies from redirects
function createRedirectCaptureServer(port = 3000) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      console.log('Redirect received:', req.url);
      console.log('Headers:', req.headers);
      
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Captured redirect');
      
      server.close(() => {
        console.log('Redirect capture server closed');
        resolve(req.headers.cookie);
      });
    });
    
    server.listen(port, () => {
      console.log(`Redirect capture server listening on port ${port}`);
    });
    
    return server;
  });
}

async function setupTestUser() {
  try {
    console.log('🔧 Setting up test user account...');
    
    const userData = {
      username: 'testuser',
      password: 'testpassword',
      email: 'test@example.com'
    };
    
    // First try direct form submit approach
    console.log('Trying form-based login...');
    const formData = new URLSearchParams();
    formData.append('username', userData.username);
    formData.append('password', userData.password);
    
    const formResponse = await fetch(`http://localhost:8080/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    console.log('Form login status:', formResponse.status);
    console.log('Form login headers:', formResponse.headers.raw());
    
    // Try JSON approach
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: userData.username,
        password: userData.password
      }),
      redirect: 'manual'
    });
    
    // Try to extract and print cookie info for debugging
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Cookie info:', cookies);
    console.log('Login status:', loginResponse.status);
    console.log('Login headers:', loginResponse.headers.raw());
    
    if (loginResponse.status === 302) {
      const redirectUrl = loginResponse.headers.get('location');
      console.log('Redirect URL:', redirectUrl);
      
      // Try following the redirect to get the cookie
      if (redirectUrl) {
        console.log('Following redirect...');
        const fullRedirectUrl = redirectUrl.startsWith('/') 
          ? `http://localhost:8080${redirectUrl}` 
          : redirectUrl;
          
        const redirectResponse = await fetch(fullRedirectUrl, {
          redirect: 'manual'
        });
        
        console.log('Redirect response status:', redirectResponse.status);
        console.log('Redirect response headers:', redirectResponse.headers.raw());
        
        if (redirectResponse.status === 302) {
          const secondRedirectUrl = redirectResponse.headers.get('location');
          console.log('Second redirect URL:', secondRedirectUrl);
        }
      }
    }
    
    // Check if we can access a protected endpoint
    console.log('Checking if we can access protected endpoints...');
    const testResponse = await fetch(`${API_URL}/files`, {
      headers: {
        Cookie: cookies || ''
      }
    });
    
    console.log('Test response status:', testResponse.status);
    
    if (testResponse.ok) {
      console.log('✅ Successfully accessed protected endpoint');
      return true;
    }
    
    // If login failed, try to register the user
    console.log('📝 Creating new test user...');
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData),
      redirect: 'manual'
    });
    
    // Try to extract and print cookie info for debugging
    const registerCookies = registerResponse.headers.get('set-cookie');
    console.log('🍪 Register cookie info:', registerCookies);
    console.log('Register status:', registerResponse.status);
    console.log('Register headers:', registerResponse.headers.raw());
    
    if (registerResponse.status === 302 || registerResponse.ok) {
      console.log('✅ Test user created successfully');
      return true;
    } else {
      throw new Error(`Failed to create test user: ${registerResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Setup Failed:', error.message);
    console.error(error);
    return false;
  }
}

// Run the setup
setupTestUser().then(success => {
  if (success) {
    console.log('🚀 Setup completed successfully!');
  } else {
    console.log('❌ Setup failed, please check the errors above.');
    process.exit(1);
  }
}); 