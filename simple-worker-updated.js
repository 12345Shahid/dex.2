export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API endpoint to verify the worker is running
    if (url.pathname === '/api/status') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'Worker is running',
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // For API requests, handle them directly (this is where you'd add your backend logic)
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({
        message: 'API endpoint - replace with actual implementation',
        endpoint: url.pathname
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    // For frontend requests, we'll point to a public demo site for now
    // In a real implementation, you would deploy your frontend to Cloudflare Pages
    // and update this URL to point to your Pages domain
    try {
      // This is a temporary solution - use your actual Pages URL when available
      return fetch('https://project-planner-frontend.pages.dev' + url.pathname + url.search);
    } catch (error) {
      return new Response(`Error: ${error.message}`, {
        status: 500
      });
    }
  }
};