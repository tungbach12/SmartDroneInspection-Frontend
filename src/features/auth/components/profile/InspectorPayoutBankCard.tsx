import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import { findVietQrBank } from '@/shared/constants/vietQrBanks';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { VietQrBankAutocomplete } from '@/shared/ui/VietQrBankAutocomplete';
import {
  getAuthErrorMessage,
  updatePayoutBankDetails,
} from '../../api/authApi';
import { useAuthStore, type AuthUser } from '../../store/authStore';

function resolveBankCode(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return findVietQrBank(value)?.code ?? '';
}

export interface InspectorPayoutBankCardProps {
  compact?: boolean | undefined;
  onSaved?: ((updated: AuthUser) => void) | undefined;
}

export function InspectorPayoutBankCard({
  compact = false,
  onSaved,
}: InspectorPayoutBankCardProps = {}) {
  const { locale, t } = useLocale();
  const user = useAuthStore((state) => state.user);

  const [bankName, setBankName] = useState(() => resolveBankCode(user?.payoutBankName));
  const [accountNumber, setAccountNumber] = useState(user?.payoutBankAccountNumber ?? '');
  const [accountHolder, setAccountHolder] = useState(user?.payoutBankAccountHolder ?? '');
  const [bankBranch, setBankBranch] = useState(user?.payoutBankBranch ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setBankName(resolveBankCode(user?.payoutBankName));
    setAccountNumber(user?.payoutBankAccountNumber ?? '');
    setAccountHolder(user?.payoutBankAccountHolder ?? '');
    setBankBranch(user?.payoutBankBranch ?? '');
  }, [
    user?.payoutBankName,
    user?.payoutBankAccountNumber,
    user?.payoutBankAccountHolder,
    user?.payoutBankBranch,
  ]);

  const hasSavedBankDetails = Boolean(
    user?.payoutBankName?.trim() &&
      user?.payoutBankAccountNumber?.trim() &&
      user?.payoutBankAccountHolder?.trim(),
  );
  const isFormComplete = Boolean(
    bankName.trim() && accountNumber.trim() && accountHolder.trim(),
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!isFormComplete) {
      setError(
        locale === 'vi'
          ? 'Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản.'
          : 'Bank name, account number, and account holder name are required.',
      );
      return;
    }

    setPending(true);
    try {
      const updated = await updatePayoutBankDetails({
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim(),
        bankBranch: bankBranch.trim() || undefined,
      });
      useAuthStore.getState().setUser(updated);
      setSuccess(
        locale === 'vi'
          ? 'Đã lưu thông tin tài khoản nhận chi trả.'
          : 'Payout bank account details saved.',
      );
      onSaved?.(updated);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Box
      sx={
        compact
          ? undefined
          : {
              p: { xs: 2, sm: 3 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              bgcolor: 'background.paper',
            }
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
              <AccountBalanceOutlined sx={{ fontSize: 22, color: 'primary.main', mt: 0.25 }} />
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                  {t('Payout bank account')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                  {t(
                    'Enter your bank account so the Platform Manager can transfer your inspection payout.',
                  )}
                </Typography>
              </Box>
            </Stack>
            <Chip
              size="small"
              color={hasSavedBankDetails ? 'success' : 'warning'}
              variant="outlined"
              label={
                hasSavedBankDetails
                  ? t('Bank account configured')
                  : t('Required before payout')
              }
              sx={{ fontWeight: 600, borderRadius: '6px', flexShrink: 0 }}
            />
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess(null)} sx={{ borderRadius: '8px' }}>
              {success}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <VietQrBankAutocomplete
              value={bankName}
              onChange={(code) => setBankName(code)}
              label={t('Bank name')}
              required
              size="small"
            />
            <TextField
              label={t('Bank account number')}
              required
              size="small"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 0071001234567"
              slotProps={{ htmlInput: { maxLength: 64 } }}
              fullWidth
            />
            <TextField
              label={t('Account holder name')}
              required
              size="small"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="e.g. PHAM VAN BAY"
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
            <TextField
              label={t('Branch (optional)')}
              size="small"
              value={bankBranch}
              onChange={(e) => setBankBranch(e.target.value)}
              placeholder={locale === 'vi' ? 'VD: Chi nhánh Sài Gòn' : 'e.g. Saigon Branch'}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
          </Box>

          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            {hasSavedBankDetails && (
              <Button
                type="button"
                variant="outlined"
                disabled={pending}
                onClick={() => {
                  setBankName(resolveBankCode(user?.payoutBankName));
                  setAccountNumber(user?.payoutBankAccountNumber ?? '');
                  setAccountHolder(user?.payoutBankAccountHolder ?? '');
                  setBankBranch(user?.payoutBankBranch ?? '');
                  setError(null);
                  setSuccess(null);
                }}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {t('Reset')}
              </Button>
            )}
            <LoadingButton
              type="submit"
              variant="contained"
              loading={pending}
              disabled={!isFormComplete}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              {pending ? t('Saving…') : t('Save payout bank details')}
            </LoadingButton>
          </Stack>
        </Stack>
      </form>
    </Box>
  );
}
