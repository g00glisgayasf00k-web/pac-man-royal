import type { LeaderboardMode } from './leaderboardTypes.js';

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

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  createdAt: number;
  gamesPlayed: number;
  wins: number;
  totalPoints: number;
  activeSessions: number;
  isAdmin: boolean;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
}

export interface AdminLiveRoomPlayer {
  name: string;
  slot: number;
  isAI: boolean;
}

export interface AdminLiveRoom {
  code: string;
  status: 'lobby' | 'playing' | 'ended';
  private: boolean;
  playerCount: number;
  humanCount: number;
  maxPlayers: number;
  autoStartAt: number | null;
  players: AdminLiveRoomPlayer[];
}

export interface AdminLiveRoomsResponse {
  rooms: AdminLiveRoom[];
}
