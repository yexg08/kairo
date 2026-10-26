import { AvatarColor, UserSummary } from './common.model';

export interface RegisterRequest {
  displayName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  email: string;
  displayName: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserSummary;
}

export interface UpdateProfileRequest {
  displayName: string;
  avatarColor: AvatarColor;
}
