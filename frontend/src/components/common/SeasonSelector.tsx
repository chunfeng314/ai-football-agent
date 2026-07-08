import { FormControl, Select, MenuItem } from '@mui/material';
import { useSeasonStore } from '../../stores/dashboardStore';

const SEASONS = [2024, 2023, 2022, 2021, 2020];

export function SeasonSelector() {
  const { season, setSeason } = useSeasonStore();
  return (
    <FormControl size="small" sx={{ minWidth: 100 }}>
      <Select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
        {SEASONS.map((s) => (
          <MenuItem key={s} value={s}>{s}/{s + 1}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
