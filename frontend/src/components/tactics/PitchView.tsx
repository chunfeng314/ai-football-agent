import { Box, Typography, Avatar, Chip } from '@mui/material';
import type { SquadPlayer } from '../../types';

// 阵型定义：name → 11 个位置的 (x%, y%) 坐标
export const FORMATIONS: Record<string, { name: string; slots: { id: string; label: string; x: number; y: number }[] }> = {
  '4-3-3': {
    name: '4-3-3',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rb', label: 'RB', x: 82, y: 70 },
      { id: 'rcb', label: 'CB', x: 62, y: 70 },
      { id: 'lcb', label: 'CB', x: 38, y: 70 },
      { id: 'lb', label: 'LB', x: 18, y: 70 },
      { id: 'rcm', label: 'CM', x: 65, y: 48 },
      { id: 'cdm', label: 'CM', x: 50, y: 52 },
      { id: 'lcm', label: 'CM', x: 35, y: 48 },
      { id: 'rw', label: 'RW', x: 82, y: 26 },
      { id: 'st', label: 'ST', x: 50, y: 18 },
      { id: 'lw', label: 'LW', x: 18, y: 26 },
    ],
  },
  '4-4-2': {
    name: '4-4-2',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rb', label: 'RB', x: 82, y: 70 },
      { id: 'rcb', label: 'CB', x: 62, y: 70 },
      { id: 'lcb', label: 'CB', x: 38, y: 70 },
      { id: 'lb', label: 'LB', x: 18, y: 70 },
      { id: 'rm', label: 'RM', x: 82, y: 46 },
      { id: 'rcm', label: 'CM', x: 62, y: 50 },
      { id: 'lcm', label: 'CM', x: 38, y: 50 },
      { id: 'lm', label: 'LM', x: 18, y: 46 },
      { id: 'rst', label: 'ST', x: 60, y: 18 },
      { id: 'lst', label: 'ST', x: 40, y: 18 },
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rb', label: 'RB', x: 82, y: 70 },
      { id: 'rcb', label: 'CB', x: 62, y: 70 },
      { id: 'lcb', label: 'CB', x: 38, y: 70 },
      { id: 'lb', label: 'LB', x: 18, y: 70 },
      { id: 'rdm', label: 'CDM', x: 60, y: 55 },
      { id: 'ldm', label: 'CDM', x: 40, y: 55 },
      { id: 'ram', label: 'CAM', x: 78, y: 36 },
      { id: 'cam', label: 'CAM', x: 50, y: 34 },
      { id: 'lam', label: 'CAM', x: 22, y: 36 },
      { id: 'st', label: 'ST', x: 50, y: 15 },
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rcb', label: 'CB', x: 72, y: 72 },
      { id: 'cb', label: 'CB', x: 50, y: 74 },
      { id: 'lcb', label: 'CB', x: 28, y: 72 },
      { id: 'rwb', label: 'RWB', x: 85, y: 48 },
      { id: 'rcm', label: 'CM', x: 64, y: 52 },
      { id: 'lcm', label: 'CM', x: 36, y: 52 },
      { id: 'lwb', label: 'LWB', x: 15, y: 48 },
      { id: 'cam', label: 'AM', x: 50, y: 32 },
      { id: 'rst', label: 'ST', x: 62, y: 14 },
      { id: 'lst', label: 'ST', x: 38, y: 14 },
    ],
  },
  '3-4-3': {
    name: '3-4-3',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rcb', label: 'CB', x: 72, y: 72 },
      { id: 'cb', label: 'CB', x: 50, y: 74 },
      { id: 'lcb', label: 'CB', x: 28, y: 72 },
      { id: 'rm', label: 'RM', x: 82, y: 50 },
      { id: 'rcm', label: 'CM', x: 62, y: 52 },
      { id: 'lcm', label: 'CM', x: 38, y: 52 },
      { id: 'lm', label: 'LM', x: 18, y: 50 },
      { id: 'rw', label: 'RW', x: 78, y: 22 },
      { id: 'st', label: 'ST', x: 50, y: 14 },
      { id: 'lw', label: 'LW', x: 22, y: 22 },
    ],
  },
  '5-3-2': {
    name: '5-3-2',
    slots: [
      { id: 'gk', label: 'GK', x: 50, y: 90 },
      { id: 'rwb', label: 'RWB', x: 85, y: 72 },
      { id: 'rcb', label: 'CB', x: 68, y: 74 },
      { id: 'cb', label: 'CB', x: 50, y: 78 },
      { id: 'lcb', label: 'CB', x: 32, y: 74 },
      { id: 'lwb', label: 'LWB', x: 15, y: 72 },
      { id: 'rcm', label: 'CM', x: 64, y: 50 },
      { id: 'cm', label: 'CM', x: 50, y: 52 },
      { id: 'lcm', label: 'CM', x: 36, y: 50 },
      { id: 'rst', label: 'ST', x: 62, y: 18 },
      { id: 'lst', label: 'ST', x: 38, y: 18 },
    ],
  },
};

interface PitchViewProps {
  formation: string;
  startingXI: Record<string, SquadPlayer | null>;
  onSlotClick: (slotId: string) => void;
  onRemovePlayer: (slotId: string) => void;
}

export function PitchView({ formation, startingXI, onSlotClick, onRemovePlayer }: PitchViewProps) {
  const fm = FORMATIONS[formation] || FORMATIONS['4-3-3'];

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 520,
        background: 'linear-gradient(180deg, #2d8a3e 0%, #3a9e4d 25%, #4ab85a 50%, #3a9e4d 75%, #2d8a3e 100%)',
        borderRadius: 2,
        overflow: 'hidden',
        border: '2px solid #fff',
        boxShadow: '0 0 30px rgba(0,0,0,0.3)',
      }}
    >
      {/* 球场线条 */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* 中圈 */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="0.5" fill="rgba(255,255,255,0.5)" />
        {/* 中线 */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.5)" strokeWidth="0.3" />
        {/* 禁区 */}
        <rect x="20" y="75" width="60" height="25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" rx="1" />
        <rect x="20" y="0" width="60" height="25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.3" rx="1" />
        {/* 小禁区 */}
        <rect x="35" y="80" width="30" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" rx="1" />
        <rect x="35" y="5" width="30" height="15" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.2" rx="1" />
        {/* 点球点 */}
        <circle cx="50" cy="85" r="0.4" fill="rgba(255,255,255,0.5)" />
        <circle cx="50" cy="15" r="0.4" fill="rgba(255,255,255,0.5)" />
      </svg>

      {/* 球员位置 */}
      {fm.slots.map((slot) => {
        const player = startingXI[slot.id];
        return (
          <Box
            key={slot.id}
            sx={{
              position: 'absolute',
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': { transform: 'translate(-50%, -50%) scale(1.08)' },
            }}
            onClick={player ? () => onRemovePlayer(slot.id) : () => onSlotClick(slot.id)}
          >
            {player ? (
              <Box sx={{ textAlign: 'center' }}>
                <Avatar
                  src={player.photo}
                  sx={{
                    width: 40,
                    height: 40,
                    mx: 'auto',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#fff',
                    fontWeight: 700,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    mt: 0.3,
                    fontSize: 10,
                    maxWidth: 70,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {player.name.split(' ').pop()}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  border: '2px dashed rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600 }}>
                  {slot.label}
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/** 判断球员是否适合某个位置 */
export function isPlayerFitForSlot(player: SquadPlayer, slotLabel: string): boolean {
  const pos = player.position?.toLowerCase() || '';
  const slot = slotLabel.toLowerCase();

  // GK
  if (slot === 'gk') return pos.includes('goalkeeper');

  // 后卫
  if (['rb', 'lb', 'rwb', 'lwb'].includes(slot)) return pos.includes('defender') || pos.includes('back');
  if (['rcb', 'lcb', 'cb'].includes(slot)) return pos.includes('defender') || pos.includes('back');

  // 中场
  if (['rcm', 'lcm', 'cm', 'cdm', 'rdm', 'ldm', 'rm', 'lm'].includes(slot))
    return pos.includes('midfielder');

  // 前腰
  if (['cam', 'ram', 'lam'].includes(slot))
    return pos.includes('midfielder') || pos.includes('attacker');

  // 前锋/边锋
  if (['st', 'rst', 'lst'].includes(slot)) return pos.includes('attacker');
  if (['rw', 'lw'].includes(slot))
    return pos.includes('attacker') || pos.includes('midfielder');

  return true;
}
