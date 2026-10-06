export interface TokenRate {
  organizationId?: string | null;
  organizationName?: string | null;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  custom: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
}

export interface TokenRateRequest {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
}

export interface BillingRates {
  defaultRate: TokenRate;
  organizationRates: TokenRate[];
}

export interface DailyCost {
  day: string;
  requests: number;
  tokens: number;
  costUzs: number;
}

export interface Invoice {
  organizationId: string;
  organizationName: string;
  month: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUzs: number;
  currentRate: TokenRate;
  days: DailyCost[];
}

export interface OrganizationBillingRow {
  organizationId: string;
  organizationName: string;
  requests: number;
  totalTokens: number;
  costUzs: number;
  customRate: boolean;
}
