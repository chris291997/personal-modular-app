// Vercel Serverless Function to proxy Jira API requests
// Deploy this to Vercel by placing it in the /api folder
// Then update SERVERLESS_PROXY_URL in src/services/jiraService.ts

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return response.status(200).end();
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Get the Jira URL from query parameter
  const jiraUrl = request.query.url as string;
  
  if (!jiraUrl) {
    return response.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Get credentials from environment variables (more secure)
    const JIRA_EMAIL = process.env.JIRA_EMAIL;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    // Extract base URL from the jiraUrl parameter if not set in env
    const urlObj = new URL(decodeURIComponent(jiraUrl));
    const JIRA_BASE_URL = process.env.JIRA_BASE_URL || `${urlObj.protocol}//${urlObj.host}`;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return response.status(500).json({ 
        error: 'Server configuration error: Missing JIRA_EMAIL or JIRA_API_TOKEN',
        hint: 'Make sure these are set in Vercel dashboard → Settings → Environment Variables',
        hasEmail: !!JIRA_EMAIL,
        hasToken: !!JIRA_API_TOKEN,
        debug: {
          emailLength: JIRA_EMAIL?.length || 0,
          tokenLength: JIRA_API_TOKEN?.length || 0,
          emailFirstChar: JIRA_EMAIL?.[0] || 'N/A',
          tokenFirstChar: JIRA_API_TOKEN?.[0] || 'N/A',
        }
      });
    }

    // Create auth header
    // Important: Jira requires email:token format for Basic auth with API tokens
    const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const authHeader = `Basic ${credentials}`;
    
    // Debug info (safe to log - doesn't expose full token)
    console.log('Auth setup:', {
      email: JIRA_EMAIL,
      emailLength: JIRA_EMAIL.length,
      tokenLength: JIRA_API_TOKEN.length,
      tokenPrefix: JIRA_API_TOKEN.substring(0, 4) + '...',
      baseUrl: JIRA_BASE_URL,
    });

    // Check if the URL contains currentUser() - if so, we need to replace it with actual account ID
    const decodedUrl = decodeURIComponent(jiraUrl);
    if (decodedUrl.includes('currentUser()')) {
      // First, get the current user's account ID
      try {
        const myselfUrl = `${JIRA_BASE_URL}/rest/api/3/myself`;
        console.log('Fetching current user from:', myselfUrl);
        console.log('Using email:', JIRA_EMAIL);
        
        const userResponse = await fetch(myselfUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
          },
        });

         if (!userResponse.ok) {
           const errorText = await userResponse.text();
           let errorData;
           try {
             errorData = JSON.parse(errorText);
           } catch {
             errorData = { error: errorText || userResponse.statusText };
           }
           
           // Log for debugging (check Vercel function logs)
           console.error('Failed to authenticate:', {
             status: userResponse.status,
             statusText: userResponse.statusText,
             error: errorData,
             url: myselfUrl,
             hasEmail: !!JIRA_EMAIL,
             hasToken: !!JIRA_API_TOKEN,
           });
           
           return response.status(userResponse.status).json({
             error: `Failed to get current user: ${userResponse.status} ${userResponse.statusText}`,
             details: errorData,
             hint: userResponse.status === 401 
               ? 'Authentication failed. Check: 1) JIRA_EMAIL matches your Jira login email exactly, 2) JIRA_API_TOKEN is a valid API token (not password), 3) Environment variables are set for Production/Preview/Development, 4) Redeploy after setting variables'
               : 'Unknown error',
             troubleshooting: {
               step1: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
               step2: 'Verify JIRA_EMAIL matches your Jira account email exactly',
               step3: 'Get a new API token from: https://id.atlassian.com/manage-profile/security/api-tokens',
               step4: 'Update JIRA_API_TOKEN with the new token',
               step5: 'Make sure both variables are enabled for Production, Preview, and Development',
               step6: 'Redeploy your project (Deployments → Redeploy)',
             }
           });
         }

        const userData = await userResponse.json();
        const accountId = userData.accountId;
        
        // Replace currentUser() with the actual account ID
        const modifiedUrl = decodedUrl
          .replace(/currentUser\(\)/g, accountId)
          .replace(/mentions\(currentUser\(\)\)/g, `mentions(${accountId})`)
          .replace(/assignee was currentUser\(\)/g, `assignee was ${accountId}`)
          .replace(/commenter = currentUser\(\)/g, `commenter = ${accountId}`);

        // Forward the modified request to Jira
        const jiraResponse = await fetch(modifiedUrl, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!jiraResponse.ok) {
          const errorText = await jiraResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || jiraResponse.statusText };
          }
          
          return response.status(jiraResponse.status).json({
            error: `Jira API error: ${jiraResponse.status} ${jiraResponse.statusText}`,
            details: errorData,
            modifiedUrl: modifiedUrl.substring(0, 200),
          });
        }

        const data = await jiraResponse.json();
        
        // Set CORS headers to allow browser access
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        return response.status(200).json(data);
      } catch (userError: any) {
        return response.status(500).json({
          error: 'Failed to get current user',
          details: userError.message,
        });
      }
    }

    // Forward the request to Jira (no currentUser() replacement needed)
    const jiraResponse = await fetch(jiraUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!jiraResponse.ok) {
      const errorText = await jiraResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || jiraResponse.statusText };
      }
      
      return response.status(jiraResponse.status).json({
        error: `Jira API error: ${jiraResponse.status} ${jiraResponse.statusText}`,
        details: errorData,
        url: jiraUrl.substring(0, 200),
      });
    }

    const data = await jiraResponse.json();

    // Set CORS headers to allow browser access
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return response.status(200).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    return response.status(500).json({ error: error.message || 'Internal server error' });
  }
}
