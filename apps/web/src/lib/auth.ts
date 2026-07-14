import { apiClient } from './api';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  role: string;
  tenant_id: string | null;
}

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
  tenant_code?: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', input);
  return response.data;
}

export async function register(input: {
  tenant_code: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/register', input);
  return response.data;
}

export function hasToken(): boolean {
  return Boolean(localStorage.getItem('haycargo:token'));
}