export type ToolType = 'REST_API' | 'RAG' | 'DATABASE' | 'WORKFLOW';

export interface ToolParameter {
  id?: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface Tool {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: ToolType;
  configuration: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  accessLevel: 'READ' | 'WRITE' | 'SENSITIVE';
  parameters: ToolParameter[];
  createdAt: string;
  updatedAt: string;
}

export type AuthType = 'NONE' | 'BASIC' | 'BEARER' | 'API_KEY' | 'LOGIN' | 'OAUTH2_CLIENT_CREDENTIALS';

export interface AuthSettings {
  tokenPath?: string | null;
  bodyFormat?: 'JSON' | 'FORM' | null;
  usernameField?: string | null;
  passwordField?: string | null;
  extraFields?: Record<string, string> | null;
  tokenJsonPath?: string | null;
  expiresInJsonPath?: string | null;
  tokenTtlSeconds?: number | null;
  headerName?: string | null;
  headerPrefix?: string | null;
  scope?: string | null;
}

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  baseUrl: string;
  authType: AuthType;
  authConfig?: AuthSettings | null;
  hasUsername: boolean;
  hasPassword: boolean;
  hasSecret: boolean;
  enabled: boolean;
  toolCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionRequest {
  name: string;
  description?: string | null;
  baseUrl: string;
  authType: AuthType;
  authConfig?: AuthSettings | null;
  username?: string | null;
  password?: string | null;
  secret?: string | null;
  enabled?: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface Execution {
  id: string;
  organizationId: string;
  conversationId: string;
  toolId: string;
  toolName: string;
  input: string;
  output: string;
  status: string;
  durationMs: number;
  errorMessage?: string | null;
  createdAt: string;
}
