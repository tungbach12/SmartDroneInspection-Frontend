import { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useInspectionRating, useUpsertInspectionRating } from '../hooks/useInspectorRatings';
import type { InspectorRatingItem, InspectorRatingProfile } from '../api/ratingApi';
import { InspectorRatingSummaryBadge } from './InspectorRatingSummaryBadge';

const CRITERIA_LABELS: Record<string, string> = {
  evidenceQuality: 'Evidence & report',
  communication: 'Communication',
  professionalism: 'Professionalism',
  sopAndSafety: 'SOP & safety',
  technicalAccuracy: 'Technical accuracy',
  timeliness: 'Timeliness',
};

function getRemainingEditLabel(editableUntil: string | null, t: (k: string) => string): string | null {
  if (!editableUntil) return null;
  const ms = new Date(editableUntil).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days <= 1 ? t('Editable today') : `${t('Editable')} · ${days}d`;
}

function getInitials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IN';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
}

export interface InspectorRatingDialogProps {
  open: boolean;
  onClose: () => void;
  inspectionId: string;
  inspectorName?: string | null;
  actorRole: 'CUSTOMER' | 'MANAGER';
  expectedCriteriaKeys: string[];
  existingRating?: InspectorRatingItem | null;
}

export function InspectorRatingDialog({
  open,
  onClose,
  inspectionId,
  inspectorName,
  actorRole,
  expectedCriteriaKeys,
  existingRating,
}: InspectorRatingDialogProps) {
  const { t } = useLocale();
  const upsert = useUpsertInspectionRating(inspectionId);
  const criteriaKeys =
    expectedCriteriaKeys.length > 0
      ? expectedCriteriaKeys
      : actorRole === 'MANAGER'
        ? ['sopAndSafety', 'technicalAccuracy', 'timeliness']
        : ['evidenceQuality', 'communication', 'professionalism'];

  const [overallScore, setOverallScore] = useState<number>(
    existingRating?.overallScore ?? 5,
  );
  const [criterionScores, setCriterionScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const key of criteriaKeys) {
      initial[key] = existingRating?.criterionScores?.[key] ?? 5;
    }
    return initial;
  });
  const [comment, setComment] = useState<string>(existingRating?.comment ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate(
      {
        overallScore,
        criterionScores,
        comment: comment.trim() || null,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '14px' } } }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pr: 5, pb: 1 }}>
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, display: 'block' }}>
            {existingRating ? t('Update Inspector Rating') : t('Rate Inspector')}
          </Typography>
          {inspectorName && (
            <Typography variant="caption" color="text.secondary">
              {inspectorName}
            </Typography>
          )}
          <IconButton aria-label={t('Close')} onClick={onClose} size="small" sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t('Overall')}
              </Typography>
              <Rating
                name="overall-rating"
                value={overallScore}
                onChange={(_, val) => {
                  if (val && val >= 1) setOverallScore(val);
                }}
                size="large"
              />
            </Stack>

            <Divider />

            <Stack spacing={1.25}>
              {criteriaKeys.map((key) => (
                <Stack key={key} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t(CRITERIA_LABELS[key] ?? key)}
                  </Typography>
                  <Rating
                    name={`criterion-${key}`}
                    size="small"
                    value={criterionScores[key] ?? 5}
                    onChange={(_, val) => {
                      if (val && val >= 1) {
                        setCriterionScores((prev) => ({ ...prev, [key]: val }));
                      }
                    }}
                  />
                </Stack>
              ))}
            </Stack>

            <TextField
              label={t('Comment (optional)')}
              placeholder={t('Brief note...')}
              multiline
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={upsert.isPending}
            sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px' }}
          >
            {upsert.isPending ? t('Saving…') : existingRating ? t('Save changes') : t('Submit rating')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

interface InspectorRatingPromptCardProps {
  inspectionId: string;
}

export function InspectorRatingPromptCard({ inspectionId }: InspectorRatingPromptCardProps) {
  const { t } = useLocale();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: bundle, isLoading } = useInspectionRating(inspectionId);

  if (isLoading || !bundle || !bundle.inspectorId) {
    return null;
  }

  const writableRole = bundle.actorRole === 'MANAGER' ? 'MANAGER' : bundle.actorRole === 'CUSTOMER' ? 'CUSTOMER' : null;
  const myRating = bundle.myRating;
  const canOpenDialog = Boolean(writableRole && bundle.canRate);
  const editLabel = myRating?.editable ? getRemainingEditLabel(bundle.editableUntil, t) : null;

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: '10px',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar sx={{ width: 38, height: 38, fontSize: '0.8rem', fontWeight: 700, bgcolor: 'primary.main' }}>
            {getInitials(bundle.inspectorName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                {bundle.inspectorName || t('Inspector')}
              </Typography>
              <InspectorRatingSummaryBadge
                averageRating={bundle.inspectorAverageRating}
                ratingCount={bundle.inspectorRatingCount}
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25, flexWrap: 'wrap' }}>
              {myRating ? (
                <>
                  <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                    <StarRoundedIcon sx={{ fontSize: 15, color: '#f59e0b' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t('Your rating')}: {myRating.overallScore}/5
                    </Typography>
                  </Stack>
                  {editLabel && (
                    <Typography variant="caption" color="text.secondary">
                      · {editLabel}
                    </Typography>
                  )}
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {t('Rate inspection performance')}
                </Typography>
              )}
              {bundle.actorRole === 'MANAGER' && bundle.customerRating && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${t('Customer')}: ${bundle.customerRating.overallScore}★`}
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>

        {canOpenDialog && writableRole && (
          <Button
            variant={myRating ? 'outlined' : 'contained'}
            size="small"
            startIcon={myRating ? <EditOutlinedIcon fontSize="small" /> : <StarRoundedIcon fontSize="small" />}
            onClick={() => setDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', flexShrink: 0 }}
          >
            {myRating ? t('Edit rating') : t('Rate Inspector')}
          </Button>
        )}
      </Paper>

      {dialogOpen && writableRole && (
        <InspectorRatingDialog
          key={`${inspectionId}-${myRating?.updatedAt ?? 'new'}`}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          inspectionId={inspectionId}
          inspectorName={bundle.inspectorName}
          actorRole={writableRole}
          expectedCriteriaKeys={bundle.expectedCriteriaKeys}
          existingRating={myRating}
        />
      )}
    </>
  );
}

interface InspectorRatingsBreakdownPanelProps {
  profile: InspectorRatingProfile;
}

export function InspectorRatingsBreakdownPanel({ profile }: InspectorRatingsBreakdownPanelProps) {
  const { t, formatDate } = useLocale();
  const { summary, ratings, historyVisible } = profile;

  const customerCriteria = Object.entries(summary.customerCriteriaAverages ?? {});
  const managerCriteria = Object.entries(summary.managerCriteriaAverages ?? {});

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
          <Typography variant="caption" color="text.secondary">
            {t('Overall')}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
            <StarRoundedIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {summary.averageRating != null ? summary.averageRating.toFixed(1) : '—'}
            </Typography>
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
          <Typography variant="caption" color="text.secondary">
            {t('Customer')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
            {summary.customerAverageRating != null ? `${summary.customerAverageRating.toFixed(1)}★` : '—'}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
          <Typography variant="caption" color="text.secondary">
            {t('Manager')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
            {summary.managerAverageRating != null ? `${summary.managerAverageRating.toFixed(1)}★` : '—'}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
          <Typography variant="caption" color="text.secondary">
            {t('Reviews')}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
            {summary.ratingCount}
          </Typography>
        </Paper>
      </Box>

      {(customerCriteria.length > 0 || managerCriteria.length > 0) && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          {customerCriteria.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                {t('Customer criteria')}
              </Typography>
              <Stack spacing={0.75}>
                {customerCriteria.map(([key, score]) => (
                  <Box key={key}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption">{t(CRITERIA_LABELS[key] ?? key)}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{score.toFixed(1)}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(score / 5) * 100} sx={{ height: 5, borderRadius: 999 }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
          {managerCriteria.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                {t('Manager criteria')}
              </Typography>
              <Stack spacing={0.75}>
                {managerCriteria.map(([key, score]) => (
                  <Box key={key}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography variant="caption">{t(CRITERIA_LABELS[key] ?? key)}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{score.toFixed(1)}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(score / 5) * 100} color="secondary" sx={{ height: 5, borderRadius: 999 }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}
        </Box>
      )}

      {historyVisible && (
        <Stack spacing={1}>
          {ratings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('No ratings yet')}
            </Typography>
          ) : (
            ratings.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {item.raterName || t(item.raterRole === 'MANAGER' ? 'Manager' : 'Customer')}
                    </Typography>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={t(item.raterRole === 'MANAGER' ? 'Manager' : 'Customer')}
                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                    />
                    {item.assetName && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        · {item.assetName}
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <Rating value={item.overallScore} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(new Date(item.updatedAt))}
                    </Typography>
                  </Stack>
                </Stack>
                {item.comment && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    {item.comment}
                  </Typography>
                )}
              </Paper>
            ))
          )}
        </Stack>
      )}
    </Stack>
  );
}
