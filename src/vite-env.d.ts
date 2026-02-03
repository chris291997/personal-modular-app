/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_BASE_URL?: string;
  readonly VITE_JIRA_EMAIL?: string;
  readonly VITE_JIRA_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
