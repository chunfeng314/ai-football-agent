export type Position = 'GK' | 'DR' | 'DC' | 'DL' | 'WBR' | 'WBL' | 'DM' | 'MR' | 'ML' | 'MC' | 'AMR' | 'AML' | 'AMC' | 'ST';

// ===== API-Football 真实数据类型 =====

export interface LeagueInfo {
  id: number;
  name: string;
  country: string;
  logo: string;
  flag: string;
  season: number;
}

export interface TeamBasic {
  id: number;
  name: string;
  logo: string;
  country: string;
  founded: number;
  venue: string;
  capacity: number;
}

export interface StandingEntry {
  rank: number;
  team: TeamBasic;
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string;
}

export interface TopScorerEntry {
  player: {
    id: number;
    name: string;
    photo: string;
  };
  statistics: {
    team: { id: number; name: string; logo: string };
    goals: { total: number; assists: number };
    games: { appearences: number; minutes: number; rating: string };
  }[];
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number;
  number: number;
  position: string;
  photo: string;
  nationality: string;
}

export interface PlayerStats {
  player: {
    id: number;
    name: string;
    age: number;
    nationality: string;
    height: string;
    weight: string;
    photo: string;
  };
  statistics: PlayerSeasonStats[];
}

export interface PlayerSeasonStats {
  team: { id: number; name: string; logo: string };
  league: { id: number; name: string; country: string };
  games: {
    appearences: number;
    lineups: number;
    minutes: number;
    position: string;
    rating: string;
  };
  goals: { total: number; assists: number; penalty: number };
  shots: { total: number; on: number };
  passes: { total: number; key: number; accuracy: string };
  tackles: { total: number; interceptions: number };
  dribbles: { attempts: number; success: number };
  duels: { total: number; won: number };
  fouls: { drawn: number; committed: number };
  cards: { yellow: number; red: number };
}

export interface FixtureEntry {
  fixture: {
    id: number;
    date: string;
  };
  league: { round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number; away: number };
}

// ===== API 统一响应 =====

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

// ===== Agent 聊天类型 =====

export interface KPI {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface DataOverview {
  kpis: KPI[];
  chart_data?: Record<string, unknown>;
}

export interface Recommendation {
  title: string;
  reasoning: string;
  expected_impact: string;
  action_items: string[];
}

export interface FollowUpOption {
  label: string;
  prompt: string;
}

export interface AgentResponse {
  summary: string;
  data_overview: DataOverview;
  deep_analysis: string;
  recommendation: Recommendation;
  alternatives: string[];
  follow_up_options: FollowUpOption[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agentResponse?: AgentResponse;
  timestamp: string;
}

// SSE 事件类型
export interface SSEEvent {
  type: 'thinking' | 'tool_start' | 'tool_end' | 'token' | 'structured' | 'done';
  data: Record<string, unknown>;
}
