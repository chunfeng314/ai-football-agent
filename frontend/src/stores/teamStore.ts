import { create } from 'zustand';
import client from '../api/client';
import type { SquadPlayer, FixtureEntry } from '../types';

interface TeamState {
  squad: SquadPlayer[];
  fixtures: FixtureEntry[];
  loading: boolean;
  error: string | null;

  loadSquad: (teamId: number) => Promise<void>;
  loadFixtures: (teamId: number, season?: number, last?: number) => Promise<void>;
}

export const useTeamStore = create<TeamState>((set) => ({
  squad: [],
  fixtures: [],
  loading: false,
  error: null,

  loadSquad: async (teamId: number) => {
    set({ loading: true, error: null, squad: [], fixtures: [] });
    try {
      const res = await client.get(`/teams/${teamId}`);
      set({ squad: res.data.data.squad || [], loading: false });
    } catch {
      set({ error: '加载失败', loading: false });
    }
  },

  loadFixtures: async (teamId: number, season = 2024, last = 10) => {
    try {
      const res = await client.get(`/teams/${teamId}/fixtures?season=${season}&last=${last}`);
      set({ fixtures: res.data.data || [] });
    } catch {
      // silent
    }
  },
}));
