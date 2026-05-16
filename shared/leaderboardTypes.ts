export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  wins: number;
  totalPoints: number;
  gamesPlayed: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
}

export interface RecordGamePayload {
  score: number;
  won: boolean;
}
