export type LeaderboardMode = 'local' | 'online';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  wins: number;
  /** Highest score achieved in one 3-minute match */
  bestScore: number;
  gamesPlayed: number;
}

export interface YourLeaderboardStats {
  bestScore: number;
  wins: number;
  gamesPlayed: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  you?: YourLeaderboardStats | null;
}

export interface RecordGameResponse {
  ok: boolean;
  bestScore: number;
}

export interface RecordGamePayload {
  score: number;
  won: boolean;
  mode: LeaderboardMode;
}
