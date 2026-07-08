import { create } from 'zustand';
import client from '../api/client';
import type { PlayerStats } from '../types';

interface PlayerState {
  playerData: PlayerStats | null;
  loading: boolean;
  error: string | null;

  loadPlayer: (playerId: number, season?: number) => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  playerData: null,
  loading: false,
  error: null,

  loadPlayer: async (playerId: number, season = 2024) => {
    set({ loading: true, error: null });
    try {
      const res = await client.get(`/players/${playerId}?season=${season}`);
      set({ playerData: res.data.data, loading: false });
    } catch {
      set({ error: '加载失败', loading: false });
    }
  },
}));
