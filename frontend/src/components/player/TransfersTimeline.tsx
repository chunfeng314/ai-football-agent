import { useEffect, useState } from 'react';
import { Typography, Paper, Box, Avatar, Chip, Skeleton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import client from '../../api/client';

interface TransferEntry {
  date: string;
  type: string;
  teams: {
    in: { id: number; name: string; logo: string };
    out: { id: number; name: string; logo: string };
  };
  amount: string;
}

interface TransfersTimelineProps {
  playerId: number;
}

export function TransfersTimeline({ playerId }: TransfersTimelineProps) {
  const [transfers, setTransfers] = useState<TransferEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    client.get(`/players/${playerId}/transfers`)
      .then((res) => setTransfers(res.data.data || []))
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <Paper className="p-4">
        <Typography variant="h6" className="mb-3 font-bold">转会历史</Typography>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={56} className="mb-2" />)}
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper className="p-4">
        <Typography variant="h6" className="mb-3 font-bold">转会历史</Typography>
        <Typography variant="body2" color="text.secondary">加载失败，请稍后重试</Typography>
      </Paper>
    );
  }

  if (transfers.length === 0) {
    return (
      <Paper className="p-4">
        <Typography variant="h6" className="mb-3 font-bold">转会历史</Typography>
        <Typography variant="body2" color="text.secondary">
          暂无转会数据（API 限流后明天恢复，缓存后会显示）
        </Typography>
      </Paper>
    );
  }

  const sorted = [...transfers].sort((a, b) => b.date.localeCompare(a.date));

  const formatAmount = (amount: string) => {
    const n = Number(amount);
    if (!n || isNaN(n)) return null;
    if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
    return `€${n}`;
  };

  const getDotColor = (type: string) => {
    if (type === 'Loan') return '#ff9800';
    if (type === 'Free') return '#4caf50';
    return '#1a73e8';
  };

  return (
    <Paper className="p-4">
      <Typography variant="h6" className="mb-3 font-bold">
        转会历史 ({transfers.length} 次)
      </Typography>

      {sorted.map((t, i) => (
        <Box key={i} className="flex mb-0">
          {/* 左侧日期 */}
          <Box className="text-right pr-3" sx={{ minWidth: 90, pt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t.date}
            </Typography>
          </Box>

          {/* 时间线竖线 + 圆点 */}
          <Box className="flex flex-col items-center" sx={{ width: 24 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: getDotColor(t.type),
                border: '2px solid white',
                boxShadow: '0 0 0 2px ' + getDotColor(t.type),
                zIndex: 1,
              }}
            />
            {i < sorted.length - 1 && (
              <Box sx={{ width: 2, flex: 1, bgcolor: '#e0e0e0', minHeight: 24 }} />
            )}
          </Box>

          {/* 右侧内容 */}
          <Box className="pb-3 pl-3 flex-1">
            <Box className="flex items-center gap-2 flex-wrap p-2 bg-gray-50 rounded">
              <Box className="flex items-center gap-1">
                <Avatar src={t.teams.out.logo} sx={{ width: 22, height: 22 }} />
                <Typography variant="body2" className="font-bold">{t.teams.out.name}</Typography>
              </Box>
              <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Box className="flex items-center gap-1">
                <Avatar src={t.teams.in.logo} sx={{ width: 22, height: 22 }} />
                <Typography variant="body2" className="font-bold">{t.teams.in.name}</Typography>
              </Box>
              <Box className="flex gap-1 ml-auto">
                <Chip
                  label={t.type === 'Loan' ? '租借' : t.type === 'Free' ? '免签' : '转会'}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 20 }}
                />
                {formatAmount(t.amount) && (
                  <Chip
                    label={formatAmount(t.amount)}
                    size="small"
                    color="primary"
                    sx={{ fontSize: 10, height: 20 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
