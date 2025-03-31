// test-helpers.js
// @ts-check
import fetch from 'node-fetch';

// Enable debug logging
export const DEBUG = true;

/**
 * Wrapper for fetch that logs request and response details for debugging
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function debugFetch(url, options = {}) {
  if (DEBUG) {
    console.log(`\n🚀 [API Request] ${options.method || 'GET'} ${url}`);
    
    if (options.headers) {
      console.log('📋 Headers:', options.headers);
    }
    
    if (options.body) {
      try {
        console.log('📦 Body:', typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      } catch (e) {
        console.log('📦 Body: [Unable to stringify body]');
      }
    }
  }
  
  try {
    const response = await fetch(url, options);
    
    if (DEBUG) {
      console.log(`\n📥 [API Response] Status: ${response.status} ${response.statusText}`);
      console.log('📋 Response Headers:', response.headers.raw());
      
      // Check if we need to clone the response to read the body without consuming it
      if (response.status !== 204) { // No content status doesn't have a body
        // Clone the response so we can still use the original response later
        const clonedResponse = response.clone();
        try {
          const bodyText = await clonedResponse.text();
          try {
            // Try to parse as JSON
            const bodyJson = JSON.parse(bodyText);
            console.log('📦 Response Body (JSON):', bodyJson);
          } catch (e) {
            // If not JSON, show as text
            console.log('📦 Response Body (Text):', bodyText.substring(0, 500) + (bodyText.length > 500 ? '...' : ''));
          }
        } catch (e) {
          console.log('📦 Response Body: [Unable to read body]');
        }
      }
    }
    
    return response;
  } catch (error) {
    if (DEBUG) {
      console.error('❌ Fetch Error:', error);
    }
    throw error;
  }
}

// Export a fake cookie for tests
export const createTestCookie = () => {
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + 1); // expires in 1 day
  
  return `connect.sid=s%3Atest-session-id.someRandomSignature; Path=/; HttpOnly; Expires=${expDate.toUTCString()}`;
}; 