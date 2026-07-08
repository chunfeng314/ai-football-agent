import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Paper, Box, CircularProgress,
  Table, TableBody, TableCell, TableRow, FormControl, Select, MenuItem, Avatar,
} from '@mui/material';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { usePlayerStore } from '../stores/playerStore';
import { useDashboardStore, useSeasonStore } from '../stores/dashboardStore';
import { useTeamStore } from '../stores/teamStore';
import { SeasonSelector } from '../components/common/SeasonSelector';
import { TransfersTimeline } from '../components/player/TransfersTimeline';
import type { SquadPlayer } from '../types';

const LEAGUES = [
  { id: 39, name: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 英超' },
  { id: 140, name: '🇪🇸 西甲' },
  { id: 78, name: '🇩🇪 德甲' },
  { id: 135, name: '🇮🇹 意甲' },
  { id: 61, name: '🇫🇷 法甲' },
];

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playerData, loading, error, loadPlayer } = usePlayerStore();
  const { teams, loadDashboard } = useDashboardStore();
  const { squad, loadSquad } = useTeamStore();
  const { season } = useSeasonStore();
  const [leagueId, setLeagueId] = useState(39);
  const [teamId, setTeamId] = useState<number | ''>('');
  const playerId = Number(id || 306);

  useEffect(() => {
    loadDashboard(leagueId, season);
  }, [leagueId, season]);

  useEffect(() => {
    if (teamId) {
      loadSquad(Number(teamId));
    }
  }, [teamId]);

  useEffect(() => {
    if (id) {
      loadPlayer(Number(id), season);
    }
  }, [id, season]);

  const { player, statistics } = playerData || {};
  const stats = statistics?.[0];

  const radarData = stats ? [
    { subject: '进球', value: Math.min((stats.goals?.total || 0) * 5, 100) },
    { subject: '助攻', value: Math.min((stats.goals?.assists || 0) * 5, 100) },
    { subject: '传球%', value: parseInt(stats.passes?.accuracy || '0') },
    { subject: '射正', value: Math.min((stats.shots?.on || 0) * 3, 100) },
    { subject: '盘带%', value: Math.min(((stats.dribbles?.success || 0) / Math.max(stats.dribbles?.attempts || 1, 1)) * 100, 100) },
    { subject: '对抗%', value: Math.min(((stats.duels?.won || 0) / Math.max(stats.duels?.total || 1, 1)) * 100, 100) },
  ] : [];

  return (
    <Container maxWidth="xl" className="py-6">
      {/* 选择器 */}
      <Box className="flex items-center gap-3 mb-4 flex-wrap">
        <Typography variant="h4" className="font-bold">球员详情</Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select value={leagueId} onChange={(e) => { setLeagueId(Number(e.target.value)); setTeamId(''); }}>
            {LEAGUES.map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <SeasonSelector />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={teamId}
            onChange={(e) => setTeamId(Number(e.target.value))}
            displayEmpty
          >
            <MenuItem value="" disabled>选择球队</MenuItem>
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
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={playerId}
            onChange={(e) => navigate(`/player/${e.target.value}`)}
            disabled={!teamId || squad.length === 0}
          >
            {squad.map((p: SquadPlayer) => (
              <MenuItem key={p.id} value={p.id}>
                <Box className="flex items-center gap-2">
                  <Avatar src={p.photo} sx={{ width: 24, height: 24 }} />
                  #{p.number} {p.name} · {p.position}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading && <Box className="flex justify-center py-16"><CircularProgress /></Box>}
      {error && <Typography color="error">{error}</Typography>}

      {!loading && playerData && (
        <>
          {/* 球员基本信息 */}
          <Paper className="p-4 mb-6">
            <Box className="flex items-center gap-4">
              <img src={player?.photo} alt={player?.name} style={{ width: 80, height: 80, borderRadius: '50%' }} />
              <Box>
                <Typography variant="h4" className="font-bold">{player?.name}</Typography>
                <Typography variant="body1" color="text.secondary">
                  {stats?.team?.name} · {stats?.games?.position} · {player?.nationality} · {player?.age}岁
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  身高: {player?.height} · 体重: {player?.weight}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Grid container spacing={3}>
            {/* 雷达图 */}
            <Grid item xs={12} md={6}>
              <Paper className="p-4">
                <Typography variant="h6" className="mb-3 font-bold">能力雷达</Typography>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name={player?.name} dataKey="value" stroke="#1a73e8" fill="#1a73e8" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography color="text.secondary">暂无足够数据</Typography>
                )}
              </Paper>
            </Grid>

            {/* 赛季统计 */}
            <Grid item xs={12} md={6}>
              <Paper className="p-4">
                <Typography variant="h6" className="mb-3 font-bold">赛季统计</Typography>
                {stats ? (
                  <Table size="small">
                    <TableBody>
                      <TableRow><TableCell>出场</TableCell><TableCell><strong>{stats.games?.appearences}</strong> 场（首发 {stats.games?.lineups} · {stats.games?.minutes} 分钟）</TableCell></TableRow>
                      <TableRow><TableCell>评分</TableCell><TableCell><strong>{stats.games?.rating}</strong></TableCell></TableRow>
                      <TableRow><TableCell>进球</TableCell><TableCell><strong>{stats.goals?.total}</strong>（点球 {stats.goals?.penalty || 0}）</TableCell></TableRow>
                      <TableRow><TableCell>助攻</TableCell><TableCell><strong>{stats.goals?.assists}</strong></TableCell></TableRow>
                      <TableRow><TableCell>射门/射正</TableCell><TableCell>{stats.shots?.total || 0} / {stats.shots?.on || 0}</TableCell></TableRow>
                      <TableRow><TableCell>传球准确率</TableCell><TableCell>{stats.passes?.accuracy || '-'}%（关键传球 {stats.passes?.key || 0}）</TableCell></TableRow>
                      <TableRow><TableCell>盘带</TableCell><TableCell>{stats.dribbles?.success || 0} / {stats.dribbles?.attempts || 0}</TableCell></TableRow>
                      <TableRow><TableCell>抢断/拦截</TableCell><TableCell>{stats.tackles?.total || 0} / {stats.tackles?.interceptions || 0}</TableCell></TableRow>
                      <TableRow><TableCell>对抗赢得</TableCell><TableCell>{stats.duels?.won || 0} / {stats.duels?.total || 0}</TableCell></TableRow>
                      <TableRow><TableCell>犯规/被犯规</TableCell><TableCell>{stats.fouls?.committed || 0} / {stats.fouls?.drawn || 0}</TableCell></TableRow>
                      <TableRow><TableCell>黄牌/红牌</TableCell><TableCell>{stats.cards?.yellow || 0} / {stats.cards?.red || 0}</TableCell></TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <Typography color="text.secondary">暂无统计数据</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* 转会历史 */}
          <Box className="mt-3">
            <TransfersTimeline playerId={playerId} />
          </Box>
        </>
      )}

      {!loading && !playerData && (
        <Typography color="text.secondary" className="text-center mt-16">
          👈 选择一支球队和一个球员查看详细数据
        </Typography>
      )}
    </Container>
  );
}
