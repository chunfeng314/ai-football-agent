import { useEffect, useState } from 'react';
import {
  Container, Typography, Grid, Paper, Box, List, ListItem,
  ListItemAvatar, Avatar, ListItemText, Chip,
  ToggleButtonGroup, ToggleButton, FormControl, Select, MenuItem,
  Badge,
} from '@mui/material';
import { useDashboardStore, useSeasonStore } from '../stores/dashboardStore';
import { useTeamStore } from '../stores/teamStore';
import { PitchView, FORMATIONS, isPlayerFitForSlot } from '../components/tactics/PitchView';
import { SeasonSelector } from '../components/common/SeasonSelector';
import type { SquadPlayer } from '../types';

const LEAGUES = [
  { id: 39, name: '英超' }, { id: 140, name: '西甲' },
  { id: 78, name: '德甲' }, { id: 135, name: '意甲' }, { id: 61, name: '法甲' },
];

export default function TacticsPage() {
  const { teams, loadDashboard } = useDashboardStore();
  const { squad, loadSquad } = useTeamStore();
  const { season } = useSeasonStore();

  const [leagueId, setLeagueId] = useState(39);
  const [teamId, setTeamId] = useState<number>(40);
  const [formation, setFormation] = useState('4-3-3');
  const [startingXI, setStartingXI] = useState<Record<string, SquadPlayer | null>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard(leagueId, season);
  }, [leagueId, season]);

  useEffect(() => {
    if (teamId) loadSquad(teamId);
  }, [teamId]);

  // 切换阵型时清空
  useEffect(() => {
    setStartingXI({});
    setSelectedSlot(null);
  }, [formation, teamId]);

  const handleSlotClick = (slotId: string) => {
    setSelectedSlot(slotId);
  };

  const handleAssignPlayer = (player: SquadPlayer) => {
    if (!selectedSlot) return;
    // 如果已在其他位置，先移除
    const newXI = { ...startingXI };
    Object.keys(newXI).forEach((key) => {
      if (newXI[key]?.id === player.id) newXI[key] = null;
    });
    newXI[selectedSlot] = player;
    setStartingXI(newXI);
    setSelectedSlot(null);
  };

  const handleRemovePlayer = (slotId: string) => {
    setStartingXI((prev) => ({ ...prev, [slotId]: null }));
  };

  const handleAutoFill = () => {
    const fm = FORMATIONS[formation];
    if (!fm) return;
    const newXI: Record<string, SquadPlayer | null> = {};
    const used = new Set<number>();

    fm.slots.forEach((slot) => {
      // 找适合这个位置的球员（未被使用）
      const fit = squad.find(
        (p) => isPlayerFitForSlot(p, slot.label) && !used.has(p.id)
      );
      if (fit) {
        newXI[slot.id] = fit;
        used.add(fit.id);
      } else {
        newXI[slot.id] = null;
      }
    });
    setStartingXI(newXI);
  };

  const handleClearAll = () => {
    setStartingXI({});
    setSelectedSlot(null);
  };

  const assignedCount = Object.values(startingXI).filter(Boolean).length;

  return (
    <Container maxWidth="xl" className="py-6">
      {/* 顶部控制栏 */}
      <Box className="flex items-center gap-3 mb-4 flex-wrap">
        <Typography variant="h4" className="font-bold">战术阵型</Typography>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={leagueId} onChange={(e) => { setLeagueId(Number(e.target.value)); setTeamId(0); }}>
            {LEAGUES.map((l) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={teamId || ''} onChange={(e) => setTeamId(Number(e.target.value))}>
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
        <SeasonSelector />

        <ToggleButtonGroup
          value={formation}
          exclusive
          onChange={(_, v) => v && setFormation(v)}
          size="small"
        >
          {Object.keys(FORMATIONS).map((f) => (
            <ToggleButton key={f} value={f} sx={{ px: 1.5, py: 0.5, fontSize: 13 }}>
              {f}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Chip
          label={`${assignedCount}/11`}
          color={assignedCount === 11 ? 'success' : assignedCount > 0 ? 'primary' : 'default'}
          size="small"
        />

        <Box className="flex gap-1 ml-auto">
          <Chip label="自动填充" size="small" color="primary" variant="outlined" onClick={handleAutoFill} disabled={squad.length === 0} />
          <Chip label="清空" size="small" variant="outlined" onClick={handleClearAll} disabled={assignedCount === 0} />
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* 球场 */}
        <Grid item xs={12} md={8}>
          <Paper className="p-3" sx={{ bgcolor: '#1a1a2e' }}>
            <PitchView
              formation={formation}
              startingXI={startingXI}
              onSlotClick={handleSlotClick}
              onRemovePlayer={handleRemovePlayer}
            />
          </Paper>
          {selectedSlot && (
            <Typography variant="body2" className="mt-2 text-center" color="text.secondary">
              👆 已选中位置 "<strong>{selectedSlot.toUpperCase()}</strong>" — 点击右侧球员放入此位置
            </Typography>
          )}
        </Grid>

        {/* 球员列表 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: 520, overflow: 'auto' }}>
            <Typography variant="subtitle2" className="p-3 pb-2 font-bold">
              球队阵容 ({squad.length}人)
            </Typography>
            {squad.length === 0 && (
              <Typography variant="body2" color="text.secondary" className="text-center mt-4">
                {teamId ? '加载中...' : '👈 选择一支球队'}
              </Typography>
            )}
            <List dense>
              {squad.map((player) => {
                const isAssigned = Object.values(startingXI).some((p) => p?.id === player.id);
                const fitForSlot = selectedSlot
                  ? isPlayerFitForSlot(player, FORMATIONS[formation]?.slots.find((s) => s.id === selectedSlot)?.label || '')
                  : true;

                return (
                  <ListItem
                    key={player.id}
                    onClick={() => selectedSlot && fitForSlot && handleAssignPlayer(player)}
                    sx={{
                      cursor: selectedSlot && fitForSlot ? 'pointer' : 'default',
                      opacity: isAssigned ? 0.4 : fitForSlot || !selectedSlot ? 1 : 0.3,
                      bgcolor: isAssigned ? 'action.selected' : 'inherit',
                      '&:hover': { bgcolor: selectedSlot && fitForSlot ? 'action.hover' : undefined },
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        invisible={!isAssigned}
                        color="success"
                        variant="dot"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar src={player.photo} sx={{ width: 32, height: 32 }} />
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`#${player.number} ${player.name}`}
                      secondary={`${player.nationality} · ${player.age}岁`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: isAssigned ? 600 : 400 }}
                    />
                    <Chip
                      label={player.position}
                      size="small"
                      color={selectedSlot && fitForSlot ? 'primary' : 'default'}
                      variant={selectedSlot && fitForSlot ? 'filled' : 'outlined'}
                      sx={{ fontSize: 11 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
