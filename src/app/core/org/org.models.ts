export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  enabled: boolean;
  widgetKey?: string;
  widgetGreeting?: string | null;
  widgetGreetingEnabled?: boolean;
  webSearchEnabled?: boolean;
  monthlyTokenQuota?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationUsage {
  organizationId: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  monthlyQuota: number;
}

export interface AssistantSettings {
  webSearchEnabled: boolean;
  webSearchAvailable: boolean;
}
