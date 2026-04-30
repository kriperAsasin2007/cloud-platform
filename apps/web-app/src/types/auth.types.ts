export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  exp: number;
  iat: number;
}

export interface AuthUser {
  userId: string;
  username: string;
}
