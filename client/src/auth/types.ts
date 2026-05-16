export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}
