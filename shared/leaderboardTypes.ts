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

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export interface RecordGamePayload {
  score: number;
  won: boolean;
  mode: LeaderboardMode;
}
