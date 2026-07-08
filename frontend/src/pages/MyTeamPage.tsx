import { useEffect, useState } from 'react';
import {
  Container, Typography, Grid, Paper, Box, List, ListItem,
  ListItemAvatar, Avatar, ListItemText, Chip, Button, TextField,
  FormControl, Select, MenuItem, CircularProgress, IconButton,
  Dialog, DialogTitle, DialogContent, Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import AddIcon from '@mui/icons-material/Add';
import { useMyTeamStore, type MatchResult } from '../stores/myTeamStore';
import { useDashboardStore, useSeasonStore } from '../stores/dashboardStore';
import { useTeamStore } from '../stores/teamStore';
import { SeasonSelector } from '../components/common/SeasonSelector';

const LEAGUES = [
  { id: 39, name: '英超' }, { id: 140, name: '西甲' },
  { id: 78, name: '德甲' }, { id: 135, name: '意甲' }, { id: 61, name: '法甲' },
];

export default function MyTeamPage() {
  const {
    squad, matchResult, simulating,
    addPlayer, removePlayer, clearSquad, simulateMatch,
  } = useMyTeamStore();

  const { teams, loadDashboard } = useDashboardStore();
  const { season } = useSeasonStore();
  const { squad: searchSquad, loadSquad } = useTeamStore();

  const [leagueId, setLeagueId] = useState(39);
  const [searchTeamId, setSearchTeamId] = useState<number | ''>('');
  const [searchText, setSearchText] = useState('');
  const [matchOpen, setMatchOpen] = useState(false);
  const [opponentTeamId, setOpponentTeamId] = useState<number>(40);

  useEffect(() => {
    loadDashboard(leagueId, season);
  }, [leagueId, season]);

  useEffect(() => {
    if (searchTeamId) loadSquad(Number(searchTeamId));
  }, [searchTeamId]);

  // 搜索过滤
  const filteredPlayers = searchSquad.filter((p) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.position?.toLowerCase().includes(q);
  });

  const handleStartMatch = () => {
    const opp = teams.find((t) => t.id === opponentTeamId);
    simulateMatch(opponentTeamId, opp?.name || '对手');
    setMatchOpen(false);
  };

  const posMap: Record<string, number> = {};
  squad.forEach((p) => { posMap[p.position] = (posMap[p.position] || 0) + 1; });

  return (
    <Container maxWidth="xl" className="py-6">
      {/* 页头 */}
      <Box className="flex items-center gap-3 mb-4 flex-wrap">
        <Typography variant="h4" className="font-bold">我的球队</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={leagueId} onChange={(e) => { setLeagueId(Number(e.target.value)); setSearchTeamId(''); }}>
            {LEAGUES.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </Select>
        </FormControl>
        <SeasonSelector />
        <Chip label={`${squad.length}/23 人`} color={squad.length >= 11 ? 'success' : 'primary'} />
        <Box className="ml-auto flex gap-2">
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SportsSoccerIcon />}
            onClick={() => setMatchOpen(true)}
            disabled={squad.length < 7}
          >
            模拟比赛
          </Button>
          <Button size="small" color="inherit" onClick={clearSquad} disabled={squad.length === 0}>
            清空
          </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* 左：球员搜索 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: 520, display: 'flex', flexDirection: 'column' }}>
            <Box className="p-3">
              <Typography variant="subtitle2" className="font-bold mb-2">搜索球员</Typography>
              <Box className="flex gap-2">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select value={searchTeamId} onChange={(e) => setSearchTeamId(Number(e.target.value))} displayEmpty>
                    <MenuItem value="" disabled>选择球队</MenuItem>
                    {teams.map((t) => (
                      <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="搜索姓名/位置..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
            <List dense sx={{ flex: 1, overflow: 'auto' }}>
              {filteredPlayers.map((p) => {
                const alreadyIn = squad.some((sp) => sp.id === p.id);
                return (
                  <ListItem key={p.id} sx={{ opacity: alreadyIn ? 0.4 : 1 }}>
                    <ListItemAvatar>
                      <Avatar src={p.photo} sx={{ width: 30, height: 30 }} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={`#${p.number} ${p.name}`}
                      secondary={`${p.position} · ${p.age}岁`}
                    />
                    <IconButton
                      size="small"
                      color="primary"
                      disabled={alreadyIn || squad.length >= 23}
                      onClick={() => addPlayer({
                        id: p.id,
                        name: p.name,
                        position: p.position,
                        number: p.number,
                        team: teams.find((t) => t.id === searchTeamId)?.name || '',
                        teamId: Number(searchTeamId),
                        photo: p.photo,
                      })}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                );
              })}
              {!searchTeamId && (
                <Typography variant="body2" color="text.secondary" className="text-center mt-4">
                  👆 先选择一支球队
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* 中：我的阵容 */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ height: 520, overflow: 'auto' }}>
            <Typography variant="subtitle2" className="p-3 pb-2 font-bold">
              我的阵容 ({squad.length}/23)
              {squad.length > 0 && <Chip label={`${squad.length >= 7 ? '可比赛' : '至少需要7人'}`} size="small" color={squad.length >= 7 ? 'success' : 'default'} className="ml-2" />}
            </Typography>
            {['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map((pos) => {
              const posPlayers = squad.filter((p) => p.position === pos);
              if (posPlayers.length === 0) return null;
              return (
                <Box key={pos} className="px-3 mb-2">
                  <Typography variant="caption" className="font-bold" color="text.secondary">
                    {pos} ({posPlayers.length})
                  </Typography>
                  {posPlayers.map((p) => (
                    <Box key={p.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                      <Avatar src={p.photo} sx={{ width: 28, height: 28 }} />
                      <Box className="flex-1 min-w-0">
                        <Typography variant="body2" className="font-bold truncate">#{p.number} {p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{p.team}</Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => removePlayer(p.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              );
            })}
            {squad.length === 0 && (
              <Typography variant="body2" color="text.secondary" className="text-center mt-16">
                👈 从左侧搜索球员，点击 + 加入我的球队
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* 右：位置分布 + 最近结果 */}
        <Grid item xs={12} md={3}>
          <Paper className="p-3 mb-2">
            <Typography variant="subtitle2" className="font-bold mb-2">位置分布</Typography>
            {['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'].map((pos) => (
              <Box key={pos} className="flex justify-between mb-1">
                <Typography variant="caption">{pos}</Typography>
                <Typography variant="caption" className="font-bold">{posMap[pos] || 0}</Typography>
              </Box>
            ))}
          </Paper>

          {matchResult && <MatchResultCard result={matchResult} opponentName={teams.find((t) => t.id === opponentTeamId)?.name} />}
        </Grid>
      </Grid>

      {/* 比赛对话框 */}
      <Dialog open={matchOpen} onClose={() => setMatchOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>⚽ 模拟比赛</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="mb-3">
            我的球队 ({squad.length}人) vs 对手球队
          </Typography>
          <FormControl fullWidth>
            <Select value={opponentTeamId} onChange={(e) => setOpponentTeamId(Number(e.target.value))}>
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
          <Box className="flex justify-end gap-2 mt-3">
            <Button onClick={() => setMatchOpen(false)}>取消</Button>
            <Button variant="contained" color="secondary" onClick={handleStartMatch} disabled={simulating}>
              {simulating ? <CircularProgress size={20} /> : '开始比赛'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

/** 比赛结果卡片 */
function MatchResultCard({ result, opponentName }: { result: MatchResult; opponentName?: string }) {
  return (
    <Paper className="p-3">
      <Typography variant="subtitle2" className="font-bold mb-2">比赛结果</Typography>
      <Box className="text-center mb-2">
        <Typography variant="h4" className="font-bold">
          <span style={{ color: '#1a73e8' }}>我的球队 {result.home_score}</span>
          {' - '}
          <span style={{ color: '#e53935' }}>{result.away_score} {opponentName || '对手'}</span>
        </Typography>
      </Box>
      <Box className="flex justify-center gap-4 mb-2">
        <Chip label={`控球率 ${result.possession?.home || 50}%`} size="small" color="primary" variant="outlined" />
        <Chip label={`射门 ${result.shots?.home || 0}`} size="small" variant="outlined" />
        <Chip label={`射门 ${result.shots?.away || 0}`} size="small" color="error" variant="outlined" />
      </Box>
      {result.goals?.length > 0 && (
        <Box className="mb-2">
          <Typography variant="caption" className="font-bold">⚽ 进球事件</Typography>
          {result.goals.map((g, i) => (
            <Typography key={i} variant="caption" className="block">
              {g.minute}' {g.scorer} {g.assist ? `(助攻: ${g.assist})` : ''}
              <Chip label={g.team === 'home' ? '我队' : '对手'} size="small" sx={{ ml: 0.5, height: 16, fontSize: 9 }} />
            </Typography>
          ))}
        </Box>
      )}
      <Typography variant="body2" color="text.secondary">
        {result.summary}
      </Typography>
    </Paper>
  );
}
