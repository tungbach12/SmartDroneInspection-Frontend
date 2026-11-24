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
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useInspectionRating,
  useRatingCriteriaCatalog,
  useUpsertInspectionRating,
} from '../hooks/useInspectorRatings';
import type {
  InspectorRatingItem,
  InspectorRatingProfile,
  RatingCriterionDefinition,
} from '../api/ratingApi';
import { InspectorRatingSummaryBadge } from './InspectorRatingSummaryBadge';

const CRITERIA_LABELS: Record<string, string> = {
  evidenceQuality: 'Evidence & report',
  communication: 'Communication',
  professionalism: 'Professionalism',
  sopAndSafety: 'SOP & safety',
  technicalAccuracy: 'Technical accuracy',
  timeliness: 'Timeliness',
};

function resolveCriterionLabel(
  code: string,
  definitions: readonly RatingCriterionDefinition[] | undefined,
  locale: string,
  t: (k: string) => string,
  role?: 'CUSTOMER' | 'MANAGER',
): string {
  const match = definitions?.find(
    (def) => def.code === code && (!role || def.raterRole === role),
  ) ?? definitions?.find((def) => def.code === code);
  if (match) {
    return locale === 'vi' ? match.labelVi : match.labelEn;
  }
  return t(CRITERIA_LABELS[code] ?? code);
}

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
  expectedCriteria?: RatingCriterionDefinition[];
  existingRating?: InspectorRatingItem | null;
}

export function InspectorRatingDialog({
  open,
  onClose,
  inspectionId,
  inspectorName,
  actorRole,
  expectedCriteriaKeys,
  expectedCriteria,
  existingRating,
}: InspectorRatingDialogProps) {
  const { locale, t } = useLocale();
  const upsert = useUpsertInspectionRating(inspectionId);
  const criteriaKeys =
    expectedCriteria && expectedCriteria.length > 0
      ? expectedCriteria.map((c) => c.code)
      : expectedCriteriaKeys.length > 0
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
              {criteriaKeys.map((key) => {
                const def = expectedCriteria?.find((c) => c.code === key);
                const hint = def
                  ? locale === 'vi'
                    ? def.descriptionVi
                    : def.descriptionEn
                  : null;
                return (
                  <Stack key={key} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" color="text.secondary">
                        {resolveCriterionLabel(key, expectedCriteria, locale, t, actorRole)}
                      </Typography>
                      {hint && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', lineHeight: 1.25 }}>
                          {hint}
                        </Typography>
                      )}
                    </Box>
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
                );
              })}
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
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
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
          <Avatar
            src={bundle.inspectorAvatarUrl ?? undefined}
            alt={bundle.inspectorName || t('Inspector')}
            onClick={bundle.inspectorAvatarUrl ? () => setAvatarPreviewOpen(true) : undefined}
            sx={{
              width: 40,
              height: 40,
              fontSize: '0.8rem',
              fontWeight: 700,
              bgcolor: 'primary.main',
              cursor: bundle.inspectorAvatarUrl ? 'pointer' : 'default',
            }}
          >
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
          {...(bundle.expectedCriteria ? { expectedCriteria: bundle.expectedCriteria } : {})}
          existingRating={myRating}
        />
      )}

      {avatarPreviewOpen && bundle.inspectorAvatarUrl && (
        <Dialog open onClose={() => setAvatarPreviewOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ pr: 5, fontWeight: 700 }}>
            {bundle.inspectorName || t('Inspector')}
            <IconButton
              aria-label={t('Close')}
              onClick={() => setAvatarPreviewOpen(false)}
              size="small"
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ textAlign: 'center', p: 2 }}>
            <Box
              component="img"
              src={bundle.inspectorAvatarUrl}
              alt={bundle.inspectorName || t('Inspector')}
              sx={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '10px', objectFit: 'contain' }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface InspectorRatingsBreakdownPanelProps {
  profile: InspectorRatingProfile;
  portalBase?: '/operations' | '/manager' | '/admin';
  onNavigate?: (path: string) => void;
}

export function InspectorRatingsBreakdownPanel({
  profile,
  portalBase,
  onNavigate,
}: InspectorRatingsBreakdownPanelProps) {
  const { locale, t, formatDate } = useLocale();
  const { summary, ratings, historyVisible } = profile;
  const catalogQuery = useRatingCriteriaCatalog(true, !(summary.criteriaDefinitions && summary.criteriaDefinitions.length > 0));
  const criteriaDefinitions: readonly RatingCriterionDefinition[] | undefined =
    summary.criteriaDefinitions && summary.criteriaDefinitions.length > 0
      ? summary.criteriaDefinitions
      : catalogQuery.data;
  const [selectedItem, setSelectedItem] = useState<InspectorRatingItem | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    title: string;
    authenticated?: boolean;
  } | null>(null);

  const customerCriteria = Object.entries(summary.customerCriteriaAverages ?? {});
  const managerCriteria = Object.entries(summary.managerCriteriaAverages ?? {});

  const buildInspectionPath = (inspectionId: string) =>
    portalBase === '/operations'
      ? `/operations/inspections/${inspectionId}/report`
      : `${portalBase ?? '/manager'}/inspections/${inspectionId}/review`;

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
                      <Typography variant="caption">
                        {resolveCriterionLabel(key, criteriaDefinitions, locale, t, 'CUSTOMER')}
                      </Typography>
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
                      <Typography variant="caption">
                        {resolveCriterionLabel(key, criteriaDefinitions, locale, t, 'MANAGER')}
                      </Typography>
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
            ratings.map((item) => {
              const roleLabel = t(item.raterRole === 'MANAGER' ? 'Manager' : 'Customer');
              const assetPhotoPath = item.assetPhotoDocumentId
                ? `/inspections/${item.inspectionId}/asset-photos/${item.assetPhotoDocumentId}/content`
                : null;
              return (
                <Paper
                  key={item.id}
                  variant="outlined"
                  onClick={() => setSelectedItem(item)}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar
                      src={item.raterAvatarUrl ?? undefined}
                      alt={item.raterName || roleLabel}
                      onClick={(e) => {
                        if (!item.raterAvatarUrl) return;
                        e.stopPropagation();
                        setPreviewImage({
                          src: item.raterAvatarUrl,
                          title: item.raterName || roleLabel,
                        });
                      }}
                      sx={{
                        width: 38,
                        height: 38,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        cursor: item.raterAvatarUrl ? 'zoom-in' : 'pointer',
                      }}
                    >
                      {getInitials(item.raterName || roleLabel)}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {item.raterName || roleLabel}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={roleLabel}
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
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {item.comment}
                        </Typography>
                      )}
                    </Box>

                    {assetPhotoPath && (
                      <Box
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage({
                            src: assetPhotoPath,
                            title: item.assetName || t('Asset'),
                            authenticated: true,
                          });
                        }}
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: 1,
                          borderColor: 'divider',
                          flexShrink: 0,
                          cursor: 'zoom-in',
                        }}
                      >
                        <AuthenticatedImage
                          src={assetPhotoPath}
                          alt={item.assetName || t('Asset')}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </Box>
                    )}
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      )}

      {selectedItem && (
        <Dialog
          open
          onClose={() => setSelectedItem(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
        >
          <DialogTitle sx={{ pr: 5 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Avatar
                src={selectedItem.raterAvatarUrl ?? undefined}
                alt={selectedItem.raterName || ''}
                onClick={() => {
                  if (selectedItem.raterAvatarUrl) {
                    setPreviewImage({
                      src: selectedItem.raterAvatarUrl,
                      title:
                        selectedItem.raterName ||
                        t(selectedItem.raterRole === 'MANAGER' ? 'Manager' : 'Customer'),
                    });
                  }
                }}
                sx={{
                  width: 38,
                  height: 38,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: selectedItem.raterAvatarUrl ? 'zoom-in' : 'default',
                }}
              >
                {getInitials(selectedItem.raterName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {selectedItem.raterName ||
                    t(selectedItem.raterRole === 'MANAGER' ? 'Manager' : 'Customer')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(selectedItem.raterRole === 'MANAGER' ? 'Manager' : 'Customer')} ·{' '}
                  {formatDate(new Date(selectedItem.updatedAt))}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              aria-label={t('Close')}
              onClick={() => setSelectedItem(null)}
              size="small"
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={1.75}>
              {selectedItem.assetPhotoDocumentId && (
                <Box
                  onClick={() =>
                    setPreviewImage({
                      src: `/inspections/${selectedItem.inspectionId}/asset-photos/${selectedItem.assetPhotoDocumentId}/content`,
                      title: selectedItem.assetName || t('Asset'),
                      authenticated: true,
                    })
                  }
                  sx={{
                    width: '100%',
                    height: 160,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    cursor: 'zoom-in',
                  }}
                >
                  <AuthenticatedImage
                    src={`/inspections/${selectedItem.inspectionId}/asset-photos/${selectedItem.assetPhotoDocumentId}/content`}
                    alt={selectedItem.assetName || t('Asset')}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              )}

              {selectedItem.assetName && (
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {selectedItem.assetName}
                </Typography>
              )}

              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t('Overall')}
                </Typography>
                <Rating value={selectedItem.overallScore} readOnly size="medium" />
              </Stack>

              <Divider />

              <Stack spacing={0.75}>
                {Object.entries(selectedItem.criterionScores).map(([key, score]) => (
                  <Stack key={key} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {resolveCriterionLabel(key, criteriaDefinitions, locale, t, selectedItem.raterRole)}
                    </Typography>
                    <Rating value={score} readOnly size="small" />
                  </Stack>
                ))}
              </Stack>

              {selectedItem.comment && (
                <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '8px', bgcolor: 'background.default' }}>
                  <Typography variant="body2">{selectedItem.comment}</Typography>
                </Paper>
              )}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.75, justifyContent: onNavigate ? 'space-between' : 'flex-end' }}>
            {onNavigate && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewRoundedIcon fontSize="small" />}
                onClick={() => {
                  const target = buildInspectionPath(selectedItem.inspectionId);
                  setSelectedItem(null);
                  onNavigate(target);
                }}
                sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px' }}
              >
                {t('Open inspection')}
              </Button>
            )}
            <Button onClick={() => setSelectedItem(null)} variant="contained" size="small" sx={{ textTransform: 'none', borderRadius: '8px' }}>
              {t('Close')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {previewImage && (
        <Dialog open onClose={() => setPreviewImage(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pr: 5, fontWeight: 700 }}>
            {previewImage.title}
            <IconButton
              aria-label={t('Close')}
              onClick={() => setPreviewImage(null)}
              size="small"
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ textAlign: 'center', p: 2 }}>
            {previewImage.authenticated ? (
              <AuthenticatedImage
                src={previewImage.src}
                alt={previewImage.title}
                sx={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', objectFit: 'contain' }}
              />
            ) : (
              <Box
                component="img"
                src={previewImage.src}
                alt={previewImage.title}
                sx={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '10px', objectFit: 'contain' }}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </Stack>
  );
}
