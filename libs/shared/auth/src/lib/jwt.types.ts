export interface JwtAccessPayload {
  userId: string;
  username: string;
}

export interface JwtRefreshPayload {
  userId: string;
  username: string;
  tokenType: 'refresh';
}
