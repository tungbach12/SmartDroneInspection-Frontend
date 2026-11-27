import { Alert, Typography } from '@mui/material';
import type { ReinspectionVerificationItem } from '../api/inspectionApi';
import { summarizeVerdictExpiry } from '../lib/verdictExpiry';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface VerdictExpiryBannerProps {
  verifications: ReinspectionVerificationItem[] | null | undefined;
  /**
   * 'staff' (default) warns Inspector/Manager that authoring, submission and publication are
   * blocked by `RESOLUTION_EXPIRED`. 'customer' surfaces the expiry warning on the Customer web
   * deliverable with parity to the Customer mobile app.
   */
  audience?: 'staff' | 'customer';
}

/**
 * Surfaces expired and soon-to-expire (<14 days) RESOLVED re-inspection verdicts.
 * The backend blocks authoring, submission, approval, and publication with `RESOLUTION_EXPIRED`
 * once any RESOLVED verdict lapses.
 */
export function VerdictExpiryBanner({
  verifications,
  audience = 'staff',
}: VerdictExpiryBannerProps) {
  const { t, formatDateTime } = useLocale();
  const { expired, expiringSoon } = summarizeVerdictExpiry(verifications);

  if (expired.length > 0) {
    const earliest = expired
      .map((item) => item.validUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    const message =
      audience === 'customer'
        ? t(
            '{count} RESOLVED re-inspection verdict(s) have expired. Schedule a new re-inspection if updated defect verification is needed.',
          )
        : t(
            '{count} RESOLVED re-inspection verdict(s) have expired. Re-verify those defects with fresh evidence before authoring, submitting or publishing this report.',
          );
    return (
      <Alert severity="error" sx={{ borderRadius: '8px' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {message.replace('{count}', String(expired.length))}
        </Typography>
        {earliest && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
            {t('Earliest expiry').concat(`: ${formatDateTime(earliest)}`)}
          </Typography>
        )}
      </Alert>
    );
  }

  if (expiringSoon.length > 0) {
    const next = expiringSoon
      .map((item) => item.validUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    const message =
      audience === 'customer'
        ? t('{count} RESOLVED re-inspection verdict(s) expire within 14 days.')
        : t(
            '{count} RESOLVED re-inspection verdict(s) expire within 14 days. Complete and publish this report before then, or re-verify the defects.',
          );
    return (
      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
        {message
          .replace('{count}', String(expiringSoon.length))
          .concat(next ? ` ${t('Next expiry').concat(`: ${formatDateTime(next)}`)}` : '')}
      </Alert>
    );
  }

  return null;
}
