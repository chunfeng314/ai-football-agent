import { create } from 'zustand';
import client from '../api/client';
import type { StandingEntry, TopScorerEntry, TeamBasic, LeagueInfo } from '../types';

interface DashboardState {
  league: LeagueInfo | null;
  standings: StandingEntry[];
  topScorers: TopScorerEntry[];
  teams: TeamBasic[];
  loading: boolean;
  error: string | null;

  loadDashboard: (league?: number, season?: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  league: null,
  standings: [],
  topScorers: [],
  teams: [],
  loading: false,
  error: null,

  loadDashboard: async (league = 39, season = 2024) => {
    set({ loading: true, error: null });
    try {
      const res = await client.get(`/dashboard?league=${league}&season=${season}`);
      set({
        league: res.data.data.league,
        standings: res.data.data.standings || [],
        topScorers: res.data.data.top_scorers || [],
        teams: res.data.data.teams || [],
        loading: false,
      });
    } catch {
      set({ error: '加载失败', loading: false });
    }
  },
}));

// 赛季全局状态 — 所有页面共享
interface SeasonState {
  season: number;
  setSeason: (s: number) => void;
}

export const useSeasonStore = create<SeasonState>((set) => ({
  season: 2024,
  setSeason: (s: number) => set({ season: s }),
}));
