/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_BASE_URL?: string;
  readonly VITE_JIRA_EMAIL?: string;
  readonly VITE_JIRA_API_TOKEN?: string;
  readonly VITE_SERVERLESS_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
