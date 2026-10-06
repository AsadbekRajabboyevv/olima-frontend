export type UserRole = 'SUPER_ADMIN' | 'ORG_ADMIN';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenExpiresAt?: string | null;
  username: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  enabled: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  organizationId?: string;
}
