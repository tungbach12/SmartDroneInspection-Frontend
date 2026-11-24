import { useMemo } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  findVietQrBank,
  VIETQR_BANKS,
  type VietQrBank,
} from '@/shared/constants/vietQrBanks';

export interface VietQrBankAutocompleteProps {
  value: string;
  onChange: (bankCode: string) => void;
  label?: string | undefined;
  placeholder?: string | undefined;
  size?: 'small' | 'medium' | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  fullWidth?: boolean | undefined;
}

function formatOptionLabel(bank: VietQrBank): string {
  return bank.shortName.toUpperCase() === bank.code.toUpperCase()
    ? bank.shortName
    : `${bank.shortName} (${bank.code})`;
}

/**
 * Searchable selector locked to standardized VietQR / SePay bank codes so payout QR codes
 * never fail due to free-text bank typos or whitespace.
 */
export function VietQrBankAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  size = 'medium',
  required = false,
  disabled = false,
  fullWidth = true,
}: VietQrBankAutocompleteProps) {
  const { locale, t } = useLocale();
  const selectedBank = useMemo(() => findVietQrBank(value), [value]);

  return (
    <Autocomplete<VietQrBank, false, false, false>
      options={VIETQR_BANKS}
      value={selectedBank}
      disabled={disabled}
      fullWidth={fullWidth}
      openOnFocus
      autoHighlight
      onChange={(_event, nextBank) => onChange(nextBank?.code ?? '')}
      isOptionEqualToValue={(option, current) => option.code === current.code}
      getOptionLabel={formatOptionLabel}
      filterOptions={(options, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return options;
        return options.filter(
          (bank) =>
            bank.code.toLowerCase().includes(query) ||
            bank.shortName.toLowerCase().includes(query) ||
            bank.name.toLowerCase().includes(query) ||
            Boolean(bank.aliases?.some((alias) => alias.toLowerCase().includes(query))),
        );
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box
            component="li"
            key={key}
            {...optionProps}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important', py: 0.75 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box
                component="span"
                sx={{
                  px: 0.75,
                  py: 0.15,
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  bgcolor: 'action.selected',
                  color: 'text.primary',
                  flexShrink: 0,
                }}
              >
                {option.code}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {option.shortName}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.15 }}>
              {option.name}
            </Typography>
          </Box>
        );
      }}
      noOptionsText={
        locale === 'vi'
          ? 'Không tìm thấy ngân hàng VietQR phù hợp'
          : 'No matching VietQR bank found'
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label ?? t('Bank name')}
          required={required}
          size={size}
          placeholder={
            placeholder ??
            (locale === 'vi'
              ? 'Chọn ngân hàng (Vietcombank, MBBank, TPBank...)'
              : 'Select bank (Vietcombank, MBBank, TPBank...)')
          }
        />
      )}
    />
  );
}
