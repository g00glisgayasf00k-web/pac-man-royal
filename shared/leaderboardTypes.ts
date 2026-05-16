export type LeaderboardMode = 'local' | 'online';

export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  wins: number;
  /** Best score in a single 3-minute match */
  bestScore: number;
  /** Sum of points across all matches */
  totalPoints: number;
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
