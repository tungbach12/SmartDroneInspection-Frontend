import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import FmdGoodOutlined from '@mui/icons-material/FmdGoodOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { inspectionApi } from '../api/inspectionApi';
import type {
  EvidenceItem,
  ReinspectionVerificationItem,
} from '../api/inspectionApi';

export interface TargetFlightShotListProps {
  inspectionId: string;
  sourceInspectionId?: string | null | undefined;
  items: ReinspectionVerificationItem[];
  evidenceList?: EvidenceItem[];
  mode: 'flight-guidance' | 'evidence-assignment';
  onLinkEvidence?: (
    verificationId: string,
    evidenceId: string,
  ) => Promise<unknown>;
  readOnly?: boolean;
}

export function TargetFlightShotList({
  inspectionId,
  sourceInspectionId,
  items,
  evidenceList = [],
  mode,
  onLinkEvidence,
  readOnly = false,
}: TargetFlightShotListProps) {
  const { t } = useLocale();
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  const linkedCount = items.filter((it) => Boolean(it.newEvidenceId)).length;
  const allLinked = linkedCount === items.length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        mb: 2.5,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          mb: 2,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              bgcolor: 'action.selected',
              color: 'text.primary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MyLocationRounded sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                {mode === 'flight-guidance'
                  ? t('Target Flight Locations')
                  : t('Target Re-capture Checklist')}
              </Typography>
              <Chip
                label={t('Re-inspection')}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 20 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.84rem' }}>
              {mode === 'flight-guidance'
                ? t('Review target defect locations and capture requirements before initiating the flight session.')
                : t('Match fresh flight captures to each repaired defect location before proceeding to verification.')}
            </Typography>
          </Box>
        </Stack>

        {mode === 'evidence-assignment' && (
          <Chip
            icon={allLinked ? <CheckCircleOutlineRounded fontSize="small" /> : <HourglassEmptyRounded fontSize="small" />}
            label={`${linkedCount}/${items.length} ${t('Captured & Linked')}`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        )}
      </Stack>

      {/* Targets List */}
      <Stack spacing={1.75}>
        {items.map((item, index) => (
          <TargetShotItemCard
            key={item.id}
            index={index}
            item={item}
            inspectionId={inspectionId}
            sourceInspectionId={sourceInspectionId}
            evidenceList={evidenceList}
            mode={mode}
            onLinkEvidence={onLinkEvidence}
            readOnly={readOnly}
          />
        ))}
      </Stack>

      {/* Footer in Evidence Mode */}
      {mode === 'evidence-assignment' && (
        <Box
          sx={{
            mt: 2,
            pt: 1.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.84rem' }}>
            {allLinked
              ? t('All targets have linked captures')
              : t('Some targets are still awaiting captures')}
          </Typography>

          <Button
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => navigate('../findings')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              px: 2,
              py: 0.6,
              boxShadow: 'none',
            }}
          >
            {t('Proceed to Defect Verification')}
          </Button>
        </Box>
      )}
    </Paper>
  );
}

function TargetShotItemCard({
  index,
  item,
  inspectionId,
  sourceInspectionId,
  evidenceList,
  mode,
  onLinkEvidence,
  readOnly,
}: {
  index: number;
  item: ReinspectionVerificationItem;
  inspectionId: string;
  sourceInspectionId?: string | null | undefined;
  evidenceList: EvidenceItem[];
  mode: 'flight-guidance' | 'evidence-assignment';
  onLinkEvidence?: (
    (verificationId: string, evidenceId: string) => Promise<unknown>
  ) | undefined;
  readOnly?: boolean | undefined;
}) {
  const { t } = useLocale();
  const [selectedEvId, setSelectedEvId] = useState<string>(item.newEvidenceId ?? '');
  const [linking, setLinking] = useState(false);

  const handleSelectEvidence = async (newEvId: string) => {
    setSelectedEvId(newEvId);
    if (!onLinkEvidence) return;
    setLinking(true);
    try {
      await onLinkEvidence(item.id, newEvId);
    } finally {
      setLinking(false);
    }
  };

  const isLinked = Boolean(item.newEvidenceId || selectedEvId);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        bgcolor: 'background.default',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 1.75 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          {/* Target Metadata & Original Snapshot */}
          <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
            {/* Original Defect Image Thumbnail */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '8px',
                overflow: 'hidden',
                bgcolor: '#000000',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              {item.sourceEvidenceId ? (
                <AuthenticatedImage
                  src={inspectionApi.evidenceContentUrl(
                    sourceInspectionId ?? inspectionId,
                    item.sourceEvidenceId,
                  )}
                  alt="Original Defect"
                  maxHeight={80}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>
                  {t('No photo')}
                </Typography>
              )}
            </Box>

            {/* Target Details */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  #{index + 1}
                </Typography>
                {item.sourceSeverity && (
                  <Chip
                    label={item.sourceSeverity}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                  />
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {item.sourceDefectLabel ?? t('Target Defect')}
                </Typography>
              </Stack>

              {/* Location & GPS Info */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                  <FmdGoodOutlined sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {item.sourceLocationDescription || t('Asset location')}
                  </Typography>
                </Box>

                {item.sourceLatitude != null && item.sourceLongitude != null && (
                  <Chip
                    label={`GPS: ${Number(item.sourceLatitude).toFixed(5)}, ${Number(item.sourceLongitude).toFixed(5)}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.68rem' }}
                  />
                )}
              </Stack>

              {/* Technical notes from initial inspection */}
              {item.sourceTechnicalNotes && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    display: 'block',
                    mt: 0.5,
                    fontStyle: 'italic',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 450,
                  }}
                >
                  {item.sourceTechnicalNotes}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Action or Linking Controls */}
          {mode === 'flight-guidance' ? (
            <Box
              sx={{
                p: 1.25,
                bgcolor: 'background.paper',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                maxWidth: 300,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', display: 'block' }}>
                {t('Pilot Flight Guidance')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.78rem' }}>
                {t('Fly drone to close proximity of this target location to capture clear post-repair evidence.')}
              </Typography>
            </Box>
          ) : (
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: { xs: '100%', md: 240 } }}>
              <TextField
                select
                size="small"
                fullWidth
                disabled={readOnly || linking}
                label={t('Link flight capture')}
                value={selectedEvId}
                onChange={(e) => handleSelectEvidence(e.target.value)}
                slotProps={{ input: { sx: { borderRadius: '6px', fontSize: '0.84rem' } } }}
              >
                <MenuItem value="">
                  <em>{t('None')}</em>
                </MenuItem>
                {evidenceList.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id} sx={{ fontSize: '0.84rem' }}>
                    {ev.fileName}
                  </MenuItem>
                ))}
              </TextField>

              <Chip
                icon={isLinked ? <CheckCircleOutlineRounded fontSize="small" /> : <HourglassEmptyRounded fontSize="small" />}
                label={isLinked ? t('Captured & Linked') : t('Awaiting capture link')}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600, height: 24, fontSize: '0.72rem', flexShrink: 0 }}
              />
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
