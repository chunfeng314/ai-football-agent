import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Paper, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, Chip, CircularProgress, Box, FormControl, Select, MenuItem,
} from '@mui/material';
import { useTeamStore } from '../stores/teamStore';
import { useDashboardStore, useSeasonStore } from '../stores/dashboardStore';
import { SeasonSelector } from '../components/common/SeasonSelector';

const LEAGUES = [
  { id: 39, name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 英超' },
  { id: 140, name: '🇪🇸 西甲' },
  { id: 78, name: '🇩🇪 德甲' },
  { id: 135, name: '🇮🇹 意甲' },
  { id: 61, name: '🇫🇷 法甲' },
];

const POSITION_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'error' | 'default'> = {
  Goalkeeper: 'success',
  Defender: 'primary',
  Midfielder: 'warning',
  Attacker: 'error',
};

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { squad, fixtures, loading, error, loadSquad, loadFixtures } = useTeamStore();
  const { teams, loadDashboard } = useDashboardStore();
  const { season } = useSeasonStore();
  const [leagueId, setLeagueId] = useState(39);

  useEffect(() => {
    loadDashboard(leagueId, season);
  }, [leagueId, season]);

  useEffect(() => {
    if (id) {
      loadSquad(Number(id));
      loadFixtures(Number(id), season, 5);
    }
  }, [id, season]);

  const teamId = Number(id || 40);

  return (
    <Container maxWidth="xl" className="py-6">
      {/* 选择器 */}
      <Box className="flex items-center gap-3 mb-4 flex-wrap">
        <Typography variant="h4" className="font-bold">球队分析</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select value={leagueId} onChange={(e) => setLeagueId(Number(e.target.value))}>
            {LEAGUES.map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <SeasonSelector />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select value={teamId} onChange={(e) => navigate(`/team/${e.target.value}`)}>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box className="flex items-center gap-2">
                  <img src={t.logo} alt="" style={{ width: 22, height: 22 }} />
                  {t.name}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && <Box className="flex justify-center py-16"><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && !error && (
        <Grid container spacing={3}>
          {/* 阵容列表 */}
          <Grid item xs={12} md={8}>
            <Paper>
              <Typography variant="h6" className="p-4 pb-2 font-bold">
                阵容 ({squad.length}人)
              </Typography>
              <List>
                {squad.map((player) => (
                  <ListItem
                    key={player.id}
                    onClick={() => navigate(`/player/${player.id}`)}
                    sx={{ cursor: 'pointer' }}
                    className="hover:bg-gray-50"
                  >
                    <ListItemAvatar>
                      <Avatar src={player.photo} alt={player.name} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={`#${player.number} ${player.name}`}
                      secondary={`${player.nationality} · ${player.age}岁`}
                    />
                    <Chip
                      label={player.position}
                      size="small"
                      color={POSITION_COLORS[player.position] || 'default'}
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* 近期赛程 */}
          <Grid item xs={12} md={4}>
            <Paper className="p-4">
              <Typography variant="h6" className="mb-3 font-bold">近期赛程</Typography>
              {fixtures.map((f) => (
                <Box key={f.fixture.id} className="mb-3 p-2 border rounded">
                  <Typography variant="caption" color="text.secondary">
                    {f.fixture.date?.split('T')[0]} · {f.league.round}
                  </Typography>
                  <Typography variant="body2" className="font-bold">
                    {f.teams.home.name} {f.goals.home} - {f.goals.away} {f.teams.away.name}
                  </Typography>
                </Box>
              ))}
              {fixtures.length === 0 && (
                <Typography variant="body2" color="text.secondary">暂无赛程</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
