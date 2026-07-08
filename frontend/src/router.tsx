import { RouteObject, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';
import ChatPage from './pages/ChatPage';
import TacticsPage from './pages/TacticsPage';
import MyTeamPage from './pages/MyTeamPage';

export const router: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/team/:id', element: <TeamPage /> },
  { path: '/player/:id', element: <PlayerPage /> },
  { path: '/tactics', element: <TacticsPage /> },
  { path: '/myteam', element: <MyTeamPage /> },
  { path: '/chat', element: <ChatPage /> },
];
