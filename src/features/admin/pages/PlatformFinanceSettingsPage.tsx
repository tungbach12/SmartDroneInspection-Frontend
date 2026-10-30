import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
} from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useInspectionFinanceSettings,
  useUpdateInspectionFinanceSettings,
} from '../hooks/useInspectionFinance';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function PlatformFinanceSettingsPage() {
  const { t } = useLocale();
  const settingsQuery = useInspectionFinanceSettings();
  const updateSettings = useUpdateInspectionFinanceSettings();

  const [formValues, setFormValues] = useState<{
    commissionRate: string;
    vatRate: string;
    tncnRate: string;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    const comm = Number(commissionRate);
    const vat = Number(vatRate);
    const tncn = Number(tncnRate);
    if (isNaN(comm) || comm < 0 || comm > 100) return;
    if (isNaN(vat) || vat < 0 || vat > 100) return;
    if (isNaN(tncn) || tncn < 0 || tncn > 100) return;

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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000, mx: 'auto' }}>
      <PageHeader
        title={t('Inspection Finance Settings')}
        subtitle={t('Admin-only settlement rates for drone inspection service contracts.')}
      />

      <QueryState
        isLoading={settingsQuery.isLoading}
        error={settingsQuery.error}
        onRetry={() => void settingsQuery.refetch()}
      >
        <Stack spacing={3}>
          {saveSuccess && (
            <Alert severity="success" onClose={() => setSaveSuccess(false)}>
              {t('Finance settings updated successfully. Applied to future signed services.')}
            </Alert>
          )}

          {updateSettings.isError && (
            <Alert severity="error">
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : t('Failed to update finance settings.')}
            </Alert>
          )}

          <Alert severity="info" sx={{ borderRadius: '12px' }}>
            {settingsQuery.data?.accountingDisclaimer ||
              t(
                'Rates must be approved by accounting/legal. Changes do not alter already accepted quotes.',
              )}
          </Alert>

          <Card variant="outlined" sx={{ borderRadius: '16px' }}>
            <CardContent>
              <form onSubmit={handleSave}>
                <Stack spacing={2.5}>
                  <TextField
                    label={t('Commission Rate (%)')}
                    value={commissionRate}
                    onChange={(e) =>
                      setFormValues({
                        commissionRate: e.target.value,
                        vatRate,
                        tncnRate,
                      })
                    }
                    fullWidth
                    required
                    type="number"
                    slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    helperText={t('Platform commission on pre-VAT service base.')}
                  />

                  <TextField
                    label={t('VAT Rate (%)')}
                    value={vatRate}
                    onChange={(e) =>
                      setFormValues({
                        commissionRate,
                        vatRate: e.target.value,
                        tncnRate,
                      })
                    }
                    fullWidth
                    required
                    type="number"
                    slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    helperText={t('VAT included in customer total.')}
                  />

                  <TextField
                    label={t('TNCN Rate (%)')}
                    value={tncnRate}
                    onChange={(e) =>
                      setFormValues({
                        commissionRate,
                        vatRate,
                        tncnRate: e.target.value,
                      })
                    }
                    fullWidth
                    required
                    type="number"
                    slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
                    helperText={t('PIT withholding on Inspector gross payout.')}
                  />

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateSettings.isPending}
                      sx={{ textTransform: 'none', px: 3 }}
                    >
                      {updateSettings.isPending ? t('Saving…') : t('Save Rates')}
                    </Button>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Stack>
      </QueryState>
    </Box>
  );
}
