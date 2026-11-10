import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import PercentRounded from '@mui/icons-material/PercentRounded';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useInspectionFinanceSettings,
  useUpdateInspectionFinanceSettings,
} from '../hooks/useInspectionFinance';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function PlatformFinanceSettingsPage() {
  const { formatNumber, t } = useLocale();
  const settingsQuery = useInspectionFinanceSettings();
  const updateSettings = useUpdateInspectionFinanceSettings();

  const [formValues, setFormValues] = useState<{
    commissionRate: string;
    vatRate: string;
    tncnRate: string;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const commissionRate =
    formValues !== null
      ? formValues.commissionRate
      : settingsQuery.data?.commissionRate != null
        ? String(settingsQuery.data.commissionRate)
        : '';

  const vatRate =
    formValues !== null
      ? formValues.vatRate
      : settingsQuery.data?.vatRate != null
        ? String(settingsQuery.data.vatRate)
        : '';

  const tncnRate =
    formValues !== null
      ? formValues.tncnRate
      : settingsQuery.data?.tncnRate != null
        ? String(settingsQuery.data.tncnRate)
        : '';

  const isRateOutOfRange = (value: string) => {
    if (value.trim() === '') return false;
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed < 0 || parsed > 100;
  };
  const commInvalid = isRateOutOfRange(commissionRate);
  const vatInvalid = isRateOutOfRange(vatRate);
  const tncnInvalid = isRateOutOfRange(tncnRate);

  const commNum = Number(commissionRate) || 0;
  const vatNum = Number(vatRate) || 0;
  const tncnNum = Number(tncnRate) || 0;

  // Real calculation preview on a standard 10,000,000 VND base contract
  const sampleBase = 10_000_000;
  const sampleVat = Math.round((sampleBase * vatNum) / 100);
  const sampleCustomerTotal = sampleBase + sampleVat;
  const samplePlatformFee = Math.round((sampleBase * commNum) / 100);
  const sampleInspectorGross = Math.max(0, sampleBase - samplePlatformFee);
  const sampleTncn = Math.round((sampleInspectorGross * tncnNum) / 100);
  const sampleInspectorNet = Math.max(0, sampleInspectorGross - sampleTncn);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setValidationError(null);
    const comm = Number(commissionRate);
    const vat = Number(vatRate);
    const tncn = Number(tncnRate);
    if (
      commissionRate.trim() === '' ||
      vatRate.trim() === '' ||
      tncnRate.trim() === '' ||
      isNaN(comm) ||
      comm < 0 ||
      comm > 100 ||
      isNaN(vat) ||
      vat < 0 ||
      vat > 100 ||
      isNaN(tncn) ||
      tncn < 0 ||
      tncn > 100
    ) {
      setValidationError(t('Rates must be valid numbers between 0% and 100%.'));
      return;
    }

    await updateSettings.mutateAsync({
      commissionRate: comm,
      vatRate: vat,
      tncnRate: tncn,
    });
    setFormValues({
      commissionRate: String(comm),
      vatRate: String(vat),
      tncnRate: String(tncn),
    });
    setSaveSuccess(true);
  };

  return (
    <Box className="workspace-page" sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title={t('Inspection Finance Settings')}
        breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: t('Finance settings') }]}
      />

      <QueryState
        isLoading={settingsQuery.isLoading}
        error={settingsQuery.error}
        onRetry={() => void settingsQuery.refetch()}
      >
        <Stack spacing={3}>
          {saveSuccess && (
            <Alert severity="success" onClose={() => setSaveSuccess(false)}>
              {t('Finance settings updated successfully.')}
            </Alert>
          )}

          {validationError && (
            <Alert severity="error" onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}

          {updateSettings.isError && (
            <Alert severity="error">
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : t('Failed to update finance settings.')}
            </Alert>
          )}

          {/* Top 3 Real Rate Summary Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '10px', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                <PercentRounded color="primary" fontSize="small" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('Platform Commission')}
                </Typography>
              </Stack>
              <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {commNum}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Applied on pre-VAT service base')}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '10px', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                <AccountBalanceOutlined color="info" fontSize="small" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('VAT Rate')}
                </Typography>
              </Stack>
              <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {vatNum}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Added to customer invoice total')}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '10px', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}>
                <PaidOutlined color="success" fontSize="small" />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  {t('PIT Withholding (TNCN)')}
                </Typography>
              </Stack>
              <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {tncnNum}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Withheld from partner inspector payout')}
              </Typography>
            </Paper>
          </Box>

          {/* 2-Column Split: Rate Configuration Form + Live Settlement Breakdown */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.15fr 1fr' },
              gap: 2.5,
              alignItems: 'stretch',
            }}
          >
            <Card variant="outlined" sx={{ borderRadius: '10px' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', mb: 2 }}>
                  {t('Settlement Rate Configuration')}
                </Typography>
                <form noValidate onSubmit={handleSave}>
                  <Stack spacing={2.25}>
                    <TextField
                      label={t('Commission Rate (%)')}
                      value={commissionRate}
                      error={commInvalid}
                      helperText={commInvalid ? t('Must be between 0% and 100%.') : undefined}
                      onChange={(e) => {
                        setValidationError(null);
                        setFormValues({
                          commissionRate: e.target.value,
                          vatRate,
                          tncnRate,
                        });
                      }}
                      fullWidth
                      required
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    />

                    <TextField
                      label={t('VAT Rate (%)')}
                      value={vatRate}
                      error={vatInvalid}
                      helperText={vatInvalid ? t('Must be between 0% and 100%.') : undefined}
                      onChange={(e) => {
                        setValidationError(null);
                        setFormValues({
                          commissionRate,
                          vatRate: e.target.value,
                          tncnRate,
                        });
                      }}
                      fullWidth
                      required
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    />

                    <TextField
                      label={t('TNCN Rate (%)')}
                      value={tncnRate}
                      error={tncnInvalid}
                      helperText={tncnInvalid ? t('Must be between 0% and 100%.') : undefined}
                      onChange={(e) => {
                        setValidationError(null);
                        setFormValues({
                          commissionRate,
                          vatRate,
                          tncnRate: e.target.value,
                        });
                      }}
                      fullWidth
                      required
                      size="small"
                      type="number"
                      slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    />

                    <Box sx={{ pt: 0.5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={updateSettings.isPending}
                        sx={{ textTransform: 'none', fontWeight: 650, px: 3, borderRadius: '8px' }}
                      >
                        {updateSettings.isPending ? t('Saving…') : t('Save Rates')}
                      </Button>
                    </Box>
                  </Stack>
                </form>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: '10px', bgcolor: 'background.paper' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                  {t('Sample Settlement Breakdown (10,000,000 ₫ Base)')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  {t('Live settlement simulation using configured rates')}
                </Typography>

                <Stack spacing={1.25}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Pre-tax service base')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleBase)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('VAT')} ({vatNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      + {formatNumber(sampleVat)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('Customer total (PayOS)')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleCustomerTotal)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Platform commission fee')} ({commNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', fontVariantNumeric: 'tabular-nums' }}>
                      - {formatNumber(samplePlatformFee)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('PIT withholding (TNCN)')} ({tncnNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                      - {formatNumber(sampleTncn)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('Partner inspector net payout')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleInspectorNet)} ₫
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </QueryState>
    </Box>
  );
}
