import { create } from 'zustand';
import client from '../api/client';

export interface MyPlayer {
  id: number;
  name: string;
  position: string;
  number: number;
  team: string;
  teamId: number;
  photo: string;
}

export interface GoalEvent {
  minute: number;
  scorer: string;
  team: 'home' | 'away';
  assist: string | null;
}

export interface MatchResult {
  home_score: number;
  away_score: number;
  goals: GoalEvent[];
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  summary: string;
}

interface MyTeamState {
  squad: MyPlayer[];
  matchResult: MatchResult | null;
  simulating: boolean;

  addPlayer: (player: MyPlayer) => void;
  removePlayer: (playerId: number) => void;
  clearSquad: () => void;
  simulateMatch: (opponentTeamId: number, opponentTeamName: string) => Promise<void>;
}

// 从 localStorage 加载
function loadSquad(): MyPlayer[] {
  try {
    const raw = localStorage.getItem('myteam_squad');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSquad(squad: MyPlayer[]) {
  try {
    localStorage.setItem('myteam_squad', JSON.stringify(squad));
  } catch { /* ignore */ }
}

export const useMyTeamStore = create<MyTeamState>((set, get) => ({
  squad: loadSquad(),
  matchResult: null,
  simulating: false,

  addPlayer: (player: MyPlayer) => {
    const current = get().squad;
    if (current.length >= 23) return;  // 最多23人
    if (current.find((p) => p.id === player.id)) return;  // 已存在
    const newSquad = [...current, player];
    saveSquad(newSquad);
    set({ squad: newSquad });
  },

  removePlayer: (playerId: number) => {
    const newSquad = get().squad.filter((p) => p.id !== playerId);
    saveSquad(newSquad);
    set({ squad: newSquad });
  },

  clearSquad: () => {
    saveSquad([]);
    set({ squad: [], matchResult: null });
  },

  simulateMatch: async (opponentTeamId: number, opponentTeamName: string) => {
    const squad = get().squad;
    if (squad.length < 7) return;

    set({ simulating: true, matchResult: null });
    try {
      const res = await client.post('/match/simulate', {
        my_team: squad.map((p) => ({
          id: p.id,
          name: p.name,
          position: p.position,
          number: p.number,
          team: p.team,
        })),
        opponent_team_id: opponentTeamId,
        opponent_team_name: opponentTeamName,
      });
      set({ matchResult: res.data.data, simulating: false });
    } catch {
      set({ simulating: false });
    }
  },
}));
