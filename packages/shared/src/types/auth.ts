import type { UserRole } from '../constants/roles.js';

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cafeId: string | null;
  isActive: boolean;
  permissions?: Record<string, boolean> | null;
}

export interface AuthResponse {
  message: string;
  data: {
    user: UserSummary;
    accessToken: string;
  };
}

export interface CustomerSummary {
  id: string;
  phone: string;
  name: string;
}

