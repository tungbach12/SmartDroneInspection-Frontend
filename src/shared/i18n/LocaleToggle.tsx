import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useLocale } from './LocaleProvider';

export function LocaleToggle() {
  const { locale, setLocale, t } = useLocale();
  return (
    <FormControl size="small" sx={{ minWidth: 132 }}>
      <InputLabel id="language-select-label">{t('Language')}</InputLabel>
      <Select
        labelId="language-select-label"
        id="language-select"
        value={locale}
        label={t('Language')}
        onChange={(event) => setLocale(event.target.value === 'vi' ? 'vi' : 'en')}
        inputProps={{ 'aria-label': t('Language') }}
        sx={{ bgcolor: 'background.paper' }}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="vi">Tiếng Việt</MenuItem>
      </Select>
    </FormControl>
  );
}
