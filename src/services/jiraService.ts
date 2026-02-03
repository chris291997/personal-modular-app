import { JiraTicket, TaskFilter } from '../types';

// Read from environment variables (set in .env.local for local dev, or Vercel dashboard for production)
const JIRA_BASE_URL = import.meta.env.VITE_JIRA_BASE_URL || 'https://datafiedusa.atlassian.net';
const JIRA_API_TOKEN = import.meta.env.VITE_JIRA_API_TOKEN || '';
const JIRA_EMAIL = import.meta.env.VITE_JIRA_EMAIL || '';

// CORS Proxy Configuration
// Option 1: Use a public CORS proxy (not recommended for production, but works for testing)
// Set to null to disable, or use a proxy URL like: 'https://cors-anywhere.herokuapp.com/'
// WARNING: Public proxies can see your API token - use at your own risk!
const CORS_PROXY_URL: string | null = null;

// Option 2: Use your own serverless function (recommended)
// Deploy the function in api/jira-proxy.ts to Vercel/Netlify
// Then set this to your function URL, e.g.: 'https://your-app.vercel.app/api/jira-proxy'
const SERVERLESS_PROXY_URL: string | null = null;

const getAuthHeader = () => {
  const credentials = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`);
  return `Basic ${credentials}`;
};

export const searchTickets = async (filter: TaskFilter): Promise<JiraTicket[]> => {
  try {
    // Build JQL query based on filter
    const jqlParts: string[] = [];
    
    if (filter.includeMentions || filter.includeAssigned || filter.includeComments) {
      const conditions: string[] = [];
      if (filter.includeMentions) {
        conditions.push('mentions(currentUser())');
      }
      if (filter.includeAssigned) {
        conditions.push('assignee was currentUser()');
      }
      if (filter.includeComments) {
        conditions.push('commenter = currentUser()');
      }
      jqlParts.push(`(${conditions.join(' OR ')})`);
    }
    
    // Date range filter
    const startDateStr = filter.startDate.toISOString().split('T')[0];
    const endDateStr = filter.endDate.toISOString().split('T')[0];
    jqlParts.push(`updated >= "${startDateStr}" AND updated <= "${endDateStr}"`);
    
    const jql = jqlParts.join(' AND ');
    
    // Build the API URL
    let apiUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=id,key,summary,status,assignee,created,updated`;
    
    // Use serverless proxy if configured (recommended)
    if (SERVERLESS_PROXY_URL) {
      apiUrl = `${SERVERLESS_PROXY_URL}?url=${encodeURIComponent(apiUrl)}`;
    }
    // Use CORS proxy if configured (fallback, less secure)
    else if (CORS_PROXY_URL) {
      apiUrl = `${CORS_PROXY_URL}${apiUrl}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return data.issues.map((issue: {
      id: string;
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        assignee?: { displayName: string };
        created: string;
        updated: string;
      };
    }) => ({
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary,
      status: issue.fields.status.name,
      url: `${JIRA_BASE_URL}/browse/${issue.key}`,
      assignee: issue.fields.assignee?.displayName,
      created: new Date(issue.fields.created),
      updated: new Date(issue.fields.updated),
    })) as JiraTicket[];
  } catch (error: unknown) {
    console.error('Error fetching Jira tickets:', error);
    
    // Check for CORS error
    const err = error as Error;
    if (err.message?.includes('Failed to fetch') || err.message?.includes('CORS') || err.name === 'TypeError') {
      const corsError = new Error('CORS_ERROR');
      corsError.message = 'Cannot connect to Jira API directly from browser due to CORS restrictions. Please use manual entry to add tickets.';
      throw corsError;
    }
    
    throw error;
  }
};

export const getTicket = async (ticketKey: string): Promise<JiraTicket | null> => {
  try {
    let apiUrl = `${JIRA_BASE_URL}/rest/api/3/issue/${ticketKey}?fields=id,key,summary,status,assignee,created,updated`;
    
    // Use serverless proxy if configured
    if (SERVERLESS_PROXY_URL) {
      apiUrl = `${SERVERLESS_PROXY_URL}?url=${encodeURIComponent(apiUrl)}`;
    }
    // Use CORS proxy if configured
    else if (CORS_PROXY_URL) {
      apiUrl = `${CORS_PROXY_URL}${apiUrl}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`);
    }
    
    const issue = await response.json() as {
      id: string;
      key: string;
      fields: {
        summary: string;
        status: { name: string };
        assignee?: { displayName: string };
        created: string;
        updated: string;
      };
    };
    
    return {
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary,
      status: issue.fields.status.name,
      url: `${JIRA_BASE_URL}/browse/${issue.key}`,
      assignee: issue.fields.assignee?.displayName,
      created: new Date(issue.fields.created),
      updated: new Date(issue.fields.updated),
    };
  } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    throw error;
  }
};
