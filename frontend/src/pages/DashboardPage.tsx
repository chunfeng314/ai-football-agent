import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Box,
  FormControl, InputLabel, Select, MenuItem, Chip,
} from '@mui/material';
import { useDashboardStore, useSeasonStore } from '../stores/dashboardStore';
import { SeasonSelector } from '../components/common/SeasonSelector';

const LEAGUES = [
  { id: 39, name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 英超' },
  { id: 140, name: '🇪🇸 西甲' },
  { id: 78, name: '🇩🇪 德甲' },
  { id: 135, name: '🇮🇹 意甲' },
  { id: 61, name: '🇫🇷 法甲' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { league, standings, topScorers, loading, error, loadDashboard } = useDashboardStore();
  const { season, setSeason } = useSeasonStore();
  const [leagueId, setLeagueId] = useState(39);

  useEffect(() => {
    loadDashboard(leagueId, season);
  }, [leagueId, season]);

  if (loading) return <Box className="flex justify-center py-16"><CircularProgress /></Box>;
  if (error) return <Container className="py-8"><Typography color="error">{error}</Typography></Container>;

  const champion = standings[0];
  const topScorer = topScorers[0];

  return (
    <Container maxWidth="xl" className="py-6">
      {/* 联赛选择器 */}
      <Box className="flex items-center gap-4 mb-4">
        <Typography variant="h4" className="font-bold">
          联赛仪表盘
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select value={leagueId} onChange={(e) => setLeagueId(Number(e.target.value))}>
            {LEAGUES.map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <SeasonSelector />
      </Box>

      {/* KPI 卡片 */}
      <Grid container spacing={3} className="mb-6">
        <Grid item xs={6} md={3}>
          <Paper className="p-4 text-center">
            <Typography variant="caption" color="text.secondary">🏆 冠军</Typography>
            <Typography variant="h6" className="font-bold">{champion?.team.name || '-'}</Typography>
            <Typography variant="body2">{champion?.points || '-'} 分</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-4 text-center">
            <Typography variant="caption" color="text.secondary">⚽ 金靴</Typography>
            <Typography variant="h6" className="font-bold">{topScorer?.player.name || '-'}</Typography>
            <Typography variant="body2">{topScorer?.statistics?.[0]?.goals.total || '-'} 球</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-4 text-center">
            <Typography variant="caption" color="text.secondary">🎯 助攻王</Typography>
            <Typography variant="h6" className="font-bold">
              {topScorers.length > 0
                ? [...topScorers].sort((a, b) => (b.statistics?.[0]?.goals.assists || 0) - (a.statistics?.[0]?.goals.assists || 0))[0]?.player.name
                : '-'}
            </Typography>
            <Typography variant="body2">
              {topScorers.length > 0
                ? [...topScorers].sort((a, b) => (b.statistics?.[0]?.goals.assists || 0) - (a.statistics?.[0]?.goals.assists || 0))[0]?.statistics?.[0]?.goals.assists
                : '-'} 助攻
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper className="p-4 text-center">
            <Typography variant="caption" color="text.secondary">📊 赛果</Typography>
            <Typography variant="h6" className="font-bold">
              {(() => {
                const totalGoals = standings.reduce((sum, e) => sum + (e.goalsFor || 0), 0);
                const totalGames = standings.reduce((sum, e) => sum + (e.played || 0), 0);
                return totalGames > 0 ? (totalGoals / (totalGames / 2)).toFixed(1) : '-';
              })()}
            </Typography>
            <Typography variant="body2">场均进球</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 积分榜 */}
      <Paper className="mb-6">
        <Typography variant="h6" className="p-4 pb-2 font-bold">📋 积分榜</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>球队</TableCell>
                <TableCell align="center">场</TableCell>
                <TableCell align="center">胜</TableCell>
                <TableCell align="center">平</TableCell>
                <TableCell align="center">负</TableCell>
                <TableCell align="center">进球</TableCell>
                <TableCell align="center">失球</TableCell>
                <TableCell align="center">净胜</TableCell>
                <TableCell align="center"><strong>积分</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((entry) => (
                <TableRow
                  key={entry.team.id}
                  hover
                  onClick={() => navigate(`/team/${entry.team.id}`)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: entry.rank <= 4 ? '#e8f5e9' : entry.rank >= 18 ? '#ffebee' : 'inherit',
                  }}
                >
                  <TableCell>{entry.rank}</TableCell>
                  <TableCell>
                    <Box className="flex items-center gap-2">
                      <img src={entry.team.logo} alt="" style={{ width: 24, height: 24 }} />
                      {entry.team.name}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{entry.played}</TableCell>
                  <TableCell align="center">{entry.win}</TableCell>
                  <TableCell align="center">{entry.draw}</TableCell>
                  <TableCell align="center">{entry.lose}</TableCell>
                  <TableCell align="center">{entry.goalsFor}</TableCell>
                  <TableCell align="center">{entry.goalsAgainst}</TableCell>
                  <TableCell align="center">{entry.goalsDiff}</TableCell>
                  <TableCell align="center"><strong>{entry.points}</strong></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 射手榜 */}
      <Paper>
        <Typography variant="h6" className="p-4 pb-2 font-bold">🎯 射手榜</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>球员</TableCell>
                <TableCell>球队</TableCell>
                <TableCell align="center">进球</TableCell>
                <TableCell align="center">助攻</TableCell>
                <TableCell align="center">出场</TableCell>
                <TableCell align="center">评分</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topScorers.slice(0, 20).map((entry, i) => (
                <TableRow
                  key={entry.player.id}
                  hover
                  onClick={() => navigate(`/player/${entry.player.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Box className="flex items-center gap-2">
                      <img src={entry.player.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      {entry.player.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box className="flex items-center gap-1">
                      <img src={entry.statistics?.[0]?.team.logo} alt="" style={{ width: 20, height: 20 }} />
                      {entry.statistics?.[0]?.team.name}
                    </Box>
                  </TableCell>
                  <TableCell align="center"><strong>{entry.statistics?.[0]?.goals.total}</strong></TableCell>
                  <TableCell align="center">{entry.statistics?.[0]?.goals.assists}</TableCell>
                  <TableCell align="center">{entry.statistics?.[0]?.games.appearences}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={entry.statistics?.[0]?.games.rating || '-'}
                      size="small"
                      color={
                        parseFloat(entry.statistics?.[0]?.games.rating || '0') >= 7.5 ? 'success' :
                        parseFloat(entry.statistics?.[0]?.games.rating || '0') >= 6.5 ? 'primary' : 'default'
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
