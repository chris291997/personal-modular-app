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

    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return response.status(500).json({ error: 'Server configuration error' });
    }

    // Create auth header
    const credentials = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const authHeader = `Basic ${credentials}`;

    // Forward the request to Jira
    const jiraResponse = await fetch(jiraUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!jiraResponse.ok) {
      return response.status(jiraResponse.status).json({
        error: `Jira API error: ${jiraResponse.status} ${jiraResponse.statusText}`,
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
