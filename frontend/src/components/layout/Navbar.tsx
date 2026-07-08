import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

const NAV_ITEMS = [
  { label: '📊 仪表盘', path: '/dashboard' },
  { label: '⚽ 球队', path: '/team/40' },
  { label: '👤 球员', path: '/player/306' },
  { label: '🎯 战术', path: '/tactics' },
  { label: '🤖 AI 对话', path: '/chat' },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="static" color="primary" elevation={1}>
      <Toolbar>
        <SportsSoccerIcon sx={{ mr: 1 }} />
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, mr: 4, cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          AI 足球分析师
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {NAV_ITEMS.map((item) => {
            const currentPath = '/' + location.pathname.split('/')[1];
            const itemPath = '/' + item.path.split('/')[1];
            const isActive = currentPath === itemPath;
            return (
              <Button
                key={item.path}
                color="inherit"
                onClick={() => navigate(item.path)}
                sx={{
                  fontWeight: isActive ? 700 : 400,
                  borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                  borderRadius: 0,
                  opacity: isActive ? 1 : 0.8,
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
