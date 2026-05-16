import type { LeaderboardMode } from './leaderboardTypes';

export interface AdminModeStats {
  mode: LeaderboardMode;
  players: number;
  gamesPlayed: number;
  wins: number;
  totalPoints: number;
}

export interface AdminDailyCount {
  date: string;
  count: number;
}

export interface AdminDailyGames {
  date: string;
  local: number;
  online: number;
}

export interface AdminTopPlayer {
  username: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  totalPoints: number;
}

export interface AdminRecentGame {
  playedAt: number;
  username: string;
  displayName: string;
  mode: LeaderboardMode;
  score: number;
  won: boolean;
}

export interface AdminMetrics {
  generatedAt: number;
  storage: 'postgres' | 'file';
  liveRooms: number;
  overview: {
    totalUsers: number;
    totalGames: number;
    totalWins: number;
    averageScore: number;
    activeSessions: number;
  };
  byMode: AdminModeStats[];
  signupsByDay: AdminDailyCount[];
  gamesByDay: AdminDailyGames[];
  topPlayers: AdminTopPlayer[];
  recentGames: AdminRecentGame[];
}
