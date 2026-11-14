import { useCallback, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { classifyDroneByMtow } from '@/features/assets/utils/droneClassification';
import { usePartnerCapabilities } from '../hooks/useContracts';
import type { PartnerCandidate, PartnerCandidateCheck } from '../api/contractApi';

export function isSelectablePartnerCandidate(candidate: PartnerCandidate): boolean {
  return candidate.eligibility === 'PASS' && candidate.capabilityFit === 'MATCH';
}

export function getInspectorInitials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  if (!first) return 'IN';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  const lastToken = /^\d+$/.test(last) ? last : (last[0] ?? '');
  return `${first[0] ?? ''}${lastToken}`.slice(0, 3).toUpperCase();
}

function getDroneImageSrc(droneId: string): string {
  return `/drone-registration-applications/drones/${droneId}/image?index=0`;
}

function formatDroneTierSummary(
  model: string | null | undefined,
  locale: string,
): { shortLabel: string; licenseLabel: string } {
  const tier = classifyDroneByMtow(model);
  if (locale === 'vi') {
    return {
      shortLabel: tier.shortLabel,
      licenseLabel: tier.requiredLicenseLabel,
    };
  }
  const shortEn = tier.shortLabel.replace(/^Loại\s+/i, 'Category ');
  const licenseEn =
    tier.requiredLicenseClass === 'CLASS_B'
      ? 'Class B license required (>= 2 kg)'
      : tier.requiredLicenseClass === 'CLASS_A'
        ? 'Class A or B license (< 2 kg)'
        : 'Verify MTOW & license class';
  return {
    shortLabel: shortEn,
    licenseLabel: licenseEn,
  };
}

function getPrimaryBlockerReason(candidate: PartnerCandidate, t: (key: string) => string): string {
  const failedGate = candidate.hardGates.find((check) => check.status === 'FAIL');
  if (failedGate) return t(failedGate.explanation);
  const mismatchedCap = candidate.capabilityChecks.find((check) => check.status === 'MISMATCH');
  if (mismatchedCap) return t(mismatchedCap.explanation);
  const unknownGate = candidate.hardGates.find((check) => check.status === 'UNKNOWN');
  if (unknownGate) return t(unknownGate.explanation);
  const unknownCap = candidate.capabilityChecks.find((check) => check.status === 'UNKNOWN');
  if (unknownCap) return t(unknownCap.explanation);
  return t('Requires verification before assignment.');
}

function statusChipColor(
  status: PartnerCandidateCheck['status'],
): 'success' | 'error' | 'warning' {
  if (status === 'PASS' || status === 'MATCH') return 'success';
  if (status === 'FAIL' || status === 'MISMATCH') return 'error';
  return 'warning';
}

interface InspectorCandidateGroup {
  inspectorId: string;
  inspectorName: string;
  inspectorAvatarUrl: string | null;
  items: PartnerCandidate[];
}

function groupByInspector(items: PartnerCandidate[]): InspectorCandidateGroup[] {
  const groups = new Map<string, InspectorCandidateGroup>();
  for (const item of items) {
    const existing = groups.get(item.inspectorId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.inspectorId, {
        inspectorId: item.inspectorId,
        inspectorName: item.inspectorName,
        inspectorAvatarUrl: item.inspectorAvatarUrl,
        items: [item],
      });
    }
  }
  return Array.from(groups.values());
}

type EligibilityFilter = 'ELIGIBLE_ONLY' | 'ALL_EVALUATED';
type AltitudeFilter = 'ALL' | 'COVERS_STRUCTURE' | 'MINIMUM_CEILING';

interface CandidateFilters {
  query: string;
  eligibility: EligibilityFilter;
  altitude: AltitudeFilter;
  minimumCeilingMeters: string;
  capabilityCode: string;
}

export const DEFAULT_FILTERS: CandidateFilters = {
  query: '',
  eligibility: 'ELIGIBLE_ONLY',
  altitude: 'ALL',
  minimumCeilingMeters: '',
  capabilityCode: 'ALL',
};

export function candidateMatchesFilters(
  candidate: PartnerCandidate,
  filters: CandidateFilters,
): boolean {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    candidate.inspectorName.toLowerCase().includes(normalizedQuery) ||
    (candidate.droneModel ?? '').toLowerCase().includes(normalizedQuery) ||
    candidate.droneSerialNumber.toLowerCase().includes(normalizedQuery);
  const matchesEligibility =
    filters.eligibility === 'ALL_EVALUATED' || isSelectablePartnerCandidate(candidate);

  const droneCeiling = candidate.droneMaxAltitudeMeters;
  const structureHeight = candidate.structureHeightMeters;
  const minimumCeiling = Number(filters.minimumCeilingMeters);
  const matchesAltitude =
    filters.altitude === 'ALL' ||
    (filters.altitude === 'COVERS_STRUCTURE' &&
      droneCeiling != null &&
      structureHeight != null &&
      droneCeiling >= structureHeight) ||
    (filters.altitude === 'MINIMUM_CEILING' &&
      Number.isFinite(minimumCeiling) &&
      minimumCeiling >= 0 &&
      droneCeiling != null &&
      droneCeiling >= minimumCeiling);
  const matchesCapability =
    filters.capabilityCode === 'ALL' || candidate.droneFeatureCodes.includes(filters.capabilityCode);

  return matchesQuery && matchesEligibility && matchesAltitude && matchesCapability;
}

export function filtersHaveAdvancedSelection(filters: CandidateFilters): boolean {
  return filters.altitude !== 'ALL' || filters.capabilityCode !== 'ALL';
}

const pairKey = (candidate: PartnerCandidate) => `${candidate.inspectorId}:${candidate.droneId}`;

function formatAltitudeSummary(candidate: PartnerCandidate, t: (key: string) => string): string {
  const parts: string[] = [];
  if (candidate.droneMaxAltitudeMeters != null) {
    parts.push(`${t('Drone ceiling')} ${candidate.droneMaxAltitudeMeters} m`);
  }
  if (candidate.structureHeightMeters != null) {
    parts.push(`${t('Structure')} ${candidate.structureHeightMeters} m`);
  }
  return parts.join(' · ');
}

function disclaimerText(candidates: PartnerCandidate[]): string | null {
  return candidates[0]?.disclaimer ?? null;
}

function LazyDroneImage({ candidate, maxHeight }: { candidate: PartnerCandidate; maxHeight: number }) {
  const [visible, setVisible] = useState(false);
  const setNode = useCallback((node: HTMLElement | null) => {
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px 120px 0px' },
    );
    observer.observe(node);
  }, []);

  return (
    <Box ref={setNode} sx={{ width: '100%', height: maxHeight, borderRadius: '8px', overflow: 'hidden' }}>
      {visible && candidate.droneHasImage !== false ? (
        <AuthenticatedImage
          src={getDroneImageSrc(candidate.droneId)}
          alt={`${candidate.droneModel ?? 'Drone'} (${candidate.droneSerialNumber})`}
          maxHeight={maxHeight}
          sx={{
            width: '100%',
            height: maxHeight,
            objectFit: 'cover',
            borderRadius: '8px',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: maxHeight,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <FlightOutlinedIcon fontSize="small" />
        </Box>
      )}
    </Box>
  );
}

interface PartnerCandidateResultsProps {
  candidates: PartnerCandidate[] | null;
  loading?: boolean;
  stale?: boolean;
  embedded?: boolean;
  /** `step` renders the selection as its own workspace step instead of an inline panel. */
  variant?: 'panel' | 'step';
  windowSummary?: string;
  requiredCapabilities?: string[];
  selectedInspectorId: string;
  selectedDroneId: string;
  onSelectPair: (candidate: PartnerCandidate) => void;
  onBackToForm?: () => void;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

export function PartnerCandidateResults({
  candidates,
  loading = false,
  stale = false,
  embedded = false,
  variant = 'panel',
  windowSummary,
  requiredCapabilities,
  selectedInspectorId,
  selectedDroneId,
  onSelectPair,
  onBackToForm,
  backLabel,
  title,
  subtitle,
}: PartnerCandidateResultsProps) {
  const { locale, t } = useLocale();
  const capabilities = usePartnerCapabilities();
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const updateFilter = <Key extends keyof CandidateFilters>(key: Key, value: CandidateFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowAdvancedFilters(false);
  };

  if (loading) {
    return (
      <Stack spacing={1.5} aria-label={t('Loading partner candidates')}>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} variant="rectangular" height={220} sx={{ borderRadius: '12px' }} />
        ))}
      </Stack>
    );
  }

  if (!candidates) {
    return null;
  }

  const activeDetailCandidate =
    detailKey != null ? candidates.find((item) => pairKey(item) === detailKey) ?? null : null;

  const allEligibleCandidates = candidates.filter(isSelectablePartnerCandidate);
  const allUnavailableCandidates = candidates.filter(
    (candidate) => !isSelectablePartnerCandidate(candidate),
  );
  const resultCandidates =
    filters.eligibility === 'ALL_EVALUATED' ? candidates : allEligibleCandidates;
  const visibleCandidates = resultCandidates.filter((candidate) =>
    candidateMatchesFilters(candidate, filters),
  );
  const visibleUnavailable = allUnavailableCandidates.filter((candidate) =>
    candidateMatchesFilters(candidate, { ...filters, eligibility: 'ALL_EVALUATED' }),
  );
  const candidateGroups = groupByInspector(visibleCandidates);
  const capabilityOptions = capabilities.data ?? [];

  const advancedFiltersActive = filtersHaveAdvancedSelection(filters);
  const noResultsForFilters = resultCandidates.length > 0 && visibleCandidates.length === 0;

  const isStep = variant === 'step';
  const containerSx = embedded
    ? { bgcolor: 'transparent' }
    : isStep
      ? {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          bgcolor: 'background.paper',
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        }
      : {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '12px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        };
  const activeAdvancedFilterCount = [
    filters.eligibility !== DEFAULT_FILTERS.eligibility,
    filters.altitude !== DEFAULT_FILTERS.altitude,
    filters.minimumCeilingMeters !== DEFAULT_FILTERS.minimumCeilingMeters,
    filters.capabilityCode !== DEFAULT_FILTERS.capabilityCode,
  ].filter(Boolean).length;


  if (activeDetailCandidate) {
    const selectable = isSelectablePartnerCandidate(activeDetailCandidate) && !stale;
    const isSelected =
      selectedInspectorId === activeDetailCandidate.inspectorId &&
      selectedDroneId === activeDetailCandidate.droneId;
    const tier = formatDroneTierSummary(activeDetailCandidate.droneModel, locale);

    return (
      <Box sx={containerSx}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            p: embedded ? 0 : 2,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
          }}
        >
          <Button
            size="small"
            variant="text"
            startIcon={<ArrowBackRoundedIcon fontSize="small" />}
            onClick={() => setDetailKey(null)}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {t('Back to candidates')}
          </Button>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              size="small"
              label={
                isSelectablePartnerCandidate(activeDetailCandidate)
                  ? t('Eligible match')
                  : activeDetailCandidate.eligibility === 'FAIL' ||
                      activeDetailCandidate.capabilityFit === 'MISMATCH'
                    ? t('Not eligible')
                    : t('Needs verification')
              }
              color={
                isSelectablePartnerCandidate(activeDetailCandidate)
                  ? 'success'
                  : activeDetailCandidate.eligibility === 'FAIL' ||
                      activeDetailCandidate.capabilityFit === 'MISMATCH'
                    ? 'error'
                    : 'warning'
              }
              sx={{ fontWeight: 700, borderRadius: '6px' }}
            />
            <Button
              size="small"
              variant={isSelected ? 'outlined' : 'contained'}
              disabled={!selectable}
              onClick={() => {
                onSelectPair(activeDetailCandidate);
                setDetailKey(null);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {isSelected ? t('Selected pair') : t('Select pair')}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ p: embedded ? 0 : { xs: 2, sm: 2.5 }, pt: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
              pb: 2.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Avatar
                src={activeDetailCandidate.inspectorAvatarUrl ?? undefined}
                alt={activeDetailCandidate.inspectorName}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: '#EEF2FF',
                  color: '#3758F9',
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {getInspectorInitials(activeDetailCandidate.inspectorName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {activeDetailCandidate.inspectorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Partner Inspector')}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              {activeDetailCandidate.droneHasImage !== false ? (
                <Box sx={{ width: 128, height: 84, flexShrink: 0 }}>
                  <AuthenticatedImage
                    src={getDroneImageSrc(activeDetailCandidate.droneId)}
                    alt={`${activeDetailCandidate.droneModel} (${activeDetailCandidate.droneSerialNumber})`}
                    maxHeight={84}
                    sx={{
                      width: 128,
                      height: 84,
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 128,
                    height: 84,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                    flexShrink: 0,
                  }}
                >
                  <FlightOutlinedIcon />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {activeDetailCandidate.droneModel}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {activeDetailCandidate.droneSerialNumber} · {tier.shortLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {tier.licenseLabel}
                </Typography>
                {(activeDetailCandidate.droneMaxAltitudeMeters != null ||
                  activeDetailCandidate.structureHeightMeters != null ||
                  activeDetailCandidate.footprintAreaSquareMeters != null) && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {[
                      activeDetailCandidate.droneMaxAltitudeMeters != null
                        ? `${t('Drone max altitude')}: ${activeDetailCandidate.droneMaxAltitudeMeters} m`
                        : null,
                      activeDetailCandidate.structureHeightMeters != null
                        ? `${t('Structure height')}: ${activeDetailCandidate.structureHeightMeters} m`
                        : null,
                      activeDetailCandidate.footprintAreaSquareMeters != null
                        ? `${t('Footprint area')}: ${activeDetailCandidate.footprintAreaSquareMeters} m²`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
              pt: 2.5,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                {t('Eligibility checks')} ({activeDetailCandidate.eligibility})
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {activeDetailCandidate.hardGates.map((check) => (
                  <Stack
                    key={check.code}
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" color="text.primary">
                      {t(check.explanation)}
                    </Typography>
                    <Chip
                      size="small"
                      label={check.status}
                      color={statusChipColor(check.status)}
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                {t('Capability fit')} ({activeDetailCandidate.capabilityFit})
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {activeDetailCandidate.capabilityChecks.map((check) => (
                  <Stack
                    key={check.code}
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {check.code === 'NO_CAPABILITY_REQUIREMENTS'
                          ? t('Standard inspection')
                          : check.code.replaceAll('_', ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(check.explanation)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={check.status}
                      color={statusChipColor(check.status)}
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Box>

          {disclaimerText(candidates) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
            >
              {t(disclaimerText(candidates) ?? '')}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      {title && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            p: embedded ? 0 : { xs: 2, sm: isStep ? 3 : 2 },
            pb: isStep ? 2.25 : 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            alignItems: { sm: 'flex-start' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {onBackToForm && (
              <Button
                size="small"
                variant="text"
                startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                onClick={onBackToForm}
                sx={{
                  ml: -1,
                  mb: 1,
                  px: 1,
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
              >
                {backLabel ?? t('Back')}
              </Button>
            )}
            {title && (
              <Typography
                variant={isStep ? 'h5' : 'h6'}
                component="h2"
                sx={{ fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25 }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, maxWidth: '68ch' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              alignSelf: { xs: 'flex-start', sm: 'center' },
            }}
          >
            {visibleCandidates.length} / {resultCandidates.length} {t('pairs shown')}
          </Typography>
        </Stack>
      )}

      <Box sx={{ p: embedded ? 0 : { xs: 2, sm: isStep ? 3 : 2 }, pt: onBackToForm || title ? (isStep ? 2.5 : 2) : 0 }}>
        {(windowSummary || (requiredCapabilities && requiredCapabilities.length > 0)) && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              mb: isStep ? 2.5 : 2,
              ...(isStep
                ? { pb: 1.75, borderBottom: '1px solid', borderColor: 'divider' }
                : {
                    p: 1.25,
                    borderRadius: '8px',
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                  }),
              alignItems: { sm: 'center' },
              justifyContent: 'space-between',
              flexWrap: 'wrap',
            }}
          >
            {windowSummary && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {t('Evaluated window')}: {windowSummary}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {t('Capabilities')}:
              </Typography>
              {requiredCapabilities && requiredCapabilities.length > 0 ? (
                requiredCapabilities.map((code) => (
                  <Chip
                    key={code}
                    size="small"
                    label={code.replaceAll('_', ' ')}
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                  />
                ))
              ) : (
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {t('Standard inspection')}
                </Typography>
              )}
            </Stack>
          </Stack>
        )}

        {candidates.length > 0 && (
          <Box
            sx={{
              mb: 2,
              ...(isStep
                ? {}
                : {
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                  }),
            }}
          >
            <Box
              sx={{
                p: isStep ? 0 : 1.5,
                pb: isStep ? 1.5 : 1.5,
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 1.5,
                alignItems: { md: 'center' },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={t('Search Inspector, drone model, or serial number...')}
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: 1,
                  maxWidth: { md: 460 },
                  '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' },
                }}
              />
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', gap: 0.5 }}
              >
                <Button
                  size="small"
                  variant="text"
                  startIcon={<TuneRoundedIcon fontSize="small" />}
                  aria-expanded={showAdvancedFilters}
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                  sx={{
                    color: advancedFiltersActive ? 'primary.main' : 'text.secondary',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('Filters')}
                  {activeAdvancedFilterCount > 0 ? ` · ${activeAdvancedFilterCount}` : ''}
                </Button>
                {(filters.query.trim() || advancedFiltersActive) && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={resetFilters}
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    {t('Clear')}
                  </Button>
                )}
              </Stack>
            </Box>

            {showAdvancedFilters && (
              <Box sx={{ px: 1.5, pb: 1.5, pt: 0.25 }}>
                <Box
                  sx={{
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                      lg: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    select
                    size="small"
                    label={t('Eligibility')}
                    value={filters.eligibility}
                    onChange={(event) =>
                      updateFilter('eligibility', event.target.value as EligibilityFilter)
                    }
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  >
                    <MenuItem value="ELIGIBLE_ONLY">{t('Eligible only')}</MenuItem>
                    <MenuItem value="ALL_EVALUATED">{t('All evaluated')}</MenuItem>
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label={t('Altitude')}
                    value={filters.altitude}
                    onChange={(event) =>
                      updateFilter('altitude', event.target.value as AltitudeFilter)
                    }
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  >
                    <MenuItem value="ALL">{t('Any altitude')}</MenuItem>
                    <MenuItem value="COVERS_STRUCTURE">{t('Meets structure height')}</MenuItem>
                    <MenuItem value="MINIMUM_CEILING">{t('Minimum ceiling')}</MenuItem>
                  </TextField>

                  {filters.altitude === 'MINIMUM_CEILING' && (
                    <TextField
                      size="small"
                      type="number"
                      label={t('Minimum ceiling (m)')}
                      value={filters.minimumCeilingMeters}
                      onChange={(event) => updateFilter('minimumCeilingMeters', event.target.value)}
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  )}

                  <TextField
                    select
                    size="small"
                    label={t('Capability')}
                    value={filters.capabilityCode}
                    onChange={(event) => updateFilter('capabilityCode', event.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                  >
                    <MenuItem value="ALL">{t('All capabilities')}</MenuItem>
                    {capabilityOptions.map((option) => (
                      <MenuItem key={option.code} value={option.code}>
                        {locale === 'vi' ? option.nameVi : option.nameEn}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, textAlign: { sm: 'right' }, fontWeight: 600 }}
                >
                  {visibleCandidates.length} / {resultCandidates.length} {t('shown')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {stale && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
            {t('Schedule or capability criteria changed. Re-run partner evaluation before confirming.')}
          </Alert>
        )}

        {candidates.length === 0 ? (
          <EmptyState title={t('No partner pairs registered.')} body="" />
        ) : allEligibleCandidates.length === 0 && filters.eligibility === 'ELIGIBLE_ONLY' ? (
          <EmptyState
            title={t('No eligible partner pairs.')}
            body=""
            {...(allUnavailableCandidates.length > 0 && !showUnavailable
              ? {
                  action: `${t('Show')} ${allUnavailableCandidates.length} ${t('other pairs')}`,
                  onAction: () => setShowUnavailable(true),
                }
              : {})}
          />
        ) : noResultsForFilters ? (
          <EmptyState
            title={t('No partner pairs match.')}
            body=""
            action={t('Clear filters')}
            onAction={resetFilters}
          />
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px',
              bgcolor: 'background.paper',
              overflow: 'hidden',
              '& table': { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
              '& th': {
                px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: 'background.default', color: 'text.secondary', textAlign: 'left',
                fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
              },
              '& .group-row td': { px: 1.5, py: 0.75, borderTop: '1px solid', borderColor: 'divider' },
              '& .group-row:first-child td': { borderTop: 0 },
              '& .pair-row td': { px: 1.5, py: 0.75, borderTop: '1px solid', borderColor: 'divider' },
              '& .pair-row:hover td': { bgcolor: 'action.hover' },
              '& .pair-row[aria-selected="true"] td': { bgcolor: 'action.selected' },
              '& .mobile-details': { display: 'inline-flex' },
              '@media (max-width: 767px)': {
                '& thead': { display: 'none' },
                '& tbody': { display: 'block', width: '100%' },
                '& .group-row': { display: 'block', width: '100%' },
                '& .group-row td': { display: 'block', width: '100%', px: 1.25, py: 1 },
                '& .pair-row': {
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.25,
                  py: 0.75,
                },
                '& .pair-row td': { display: 'block', width: 'auto', px: 0, py: 0, border: 0 },
                '& .pair-row td:first-child': { flex: '1 1 0', minWidth: 0 },
                '& .pair-row .desktop-only': { display: 'none' },
                '& .pair-row .unavailable-pair': { gridColumn: '1 / -1' },
                '& .pair-row .unavailable-pair ~ td': { display: 'none' },
                '& .pair-row .mobile-status': { display: 'inline-flex' },
                '& .pair-row td:last-child': { flex: '0 0 auto' },
                '& .pair-row .mobile-details': { display: 'none' },
              },
            }}
          >
            <table aria-label={t('Eligible partner pairs')}>
              <thead><tr>
                <th style={{ width: '58%' }}>{t('Inspector and drone')}</th>
                <th style={{ width: '18%' }}>{t('Eligibility')}</th>
                <th style={{ width: '10%' }}>{t('Drone tier')}</th>
                <th style={{ width: '14%', textAlign: 'right' }}>{t('Actions')}</th>
              </tr></thead>
              {candidateGroups.map((group) => (
                <tbody key={group.inspectorId}>
                  <tr className="group-row"><td colSpan={4}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Avatar src={group.inspectorAvatarUrl ?? undefined} alt={group.inspectorName}
                        sx={{ width: 30, height: 30, bgcolor: '#EEF2FF', color: '#3758F9', fontWeight: 700, fontSize: '0.6875rem', flexShrink: 0 }}>
                        {getInspectorInitials(group.inspectorName)}
                      </Avatar>
                      <Typography variant="body2" sx={{ minWidth: 0, fontWeight: 700 }} noWrap>{group.inspectorName}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
                        {group.items.length === 1 ? t('1 drone') : `${group.items.length} ${t('drones')}`}
                      </Typography>
                    </Stack>
                  </td></tr>
                  {group.items.map((candidate) => {
                    const selectable = isSelectablePartnerCandidate(candidate);
                    const isSelected = selectable && selectedInspectorId === candidate.inspectorId && selectedDroneId === candidate.droneId;
                    const tier = formatDroneTierSummary(candidate.droneModel, locale);
                    const altitudeSummary = formatAltitudeSummary(candidate, t);
                    return (
                      <tr key={pairKey(candidate)} className="pair-row" aria-selected={isSelected}>
                        <td>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <Box sx={{ width: { xs: 40, sm: 54 }, height: { xs: 36, sm: 42 }, flexShrink: 0 }}>
                              <LazyDroneImage candidate={candidate} maxHeight={42} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
                                {candidate.droneModel ?? t('Partner drone')}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}
                                noWrap
                              >
                                {candidate.droneSerialNumber}
                                {altitudeSummary ? ` · ${altitudeSummary}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </td>
                        <td className="desktop-only">
                          {selectable ? (
                            <Chip
                              size="small"
                              label={t('Eligible match')}
                              color="success"
                              variant="outlined"
                              sx={{
                                height: 22,
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                              }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="error.main"
                              sx={{
                                display: 'block',
                                fontWeight: 600,
                                maxWidth: 220,
                              }}
                              noWrap
                              title={getPrimaryBlockerReason(candidate, t)}
                            >
                              {getPrimaryBlockerReason(candidate, t)}
                            </Typography>
                          )}
                        </td>
                        <td className="desktop-only">
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {(tier.shortLabel.split('(')[0] ?? tier.shortLabel).trim()}
                          </Typography>
                        </td>
                        <td>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
                          >
                            <Button
                              className="mobile-details"
                              size="small"
                              variant="text"
                              aria-label={t('Details')}
                              title={t('Details')}
                              startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                              onClick={() => setDetailKey(pairKey(candidate))}
                              sx={{
                                minWidth: { xs: 34, sm: 0 },
                                px: { xs: 0.5, sm: 0.75 },
                                color: 'text.secondary',
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 0.5 } },
                              }}
                            >
                              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                                {t('Details')}
                              </Box>
                            </Button>
                            <Button
                              size="small"
                              variant={isSelected ? 'contained' : 'outlined'}
                              disabled={stale || !selectable}
                              onClick={() => onSelectPair(candidate)}
                              startIcon={isSelected ? <CheckRoundedIcon fontSize="small" /> : undefined}
                              sx={{
                                minWidth: 72,
                                px: 1,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                              }}
                            >
                              {isSelected ? t('Selected') : t('Select')}
                            </Button>
                          </Stack>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </Box>
        )}

        {filters.eligibility === 'ELIGIBLE_ONLY' && allUnavailableCandidates.length > 0 && (
          <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{
                justifyContent: 'space-between',
                alignItems: { sm: 'center' },
                mb: showUnavailable ? 1.5 : 0,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Unavailable or unverified pairs')}
              </Typography>
              <Button
                size="small"
                variant="text"
                color="inherit"
                endIcon={
                  showUnavailable ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />
                }
                onClick={() => setShowUnavailable((prev) => !prev)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'text.secondary',
                  borderRadius: '8px',
                }}
              >
                {showUnavailable
                  ? `${t('Hide')} ${allUnavailableCandidates.length} ${t('other pairs')}`
                  : `${t('Show')} ${allUnavailableCandidates.length} ${t('other pairs')}`}
              </Button>
            </Stack>

            {showUnavailable && (
              <Stack spacing={0} divider={<Divider flexItem />}>
                {visibleUnavailable.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>
                    {t('No unavailable pairs match these filters.')}
                  </Typography>
                ) : (
                  visibleUnavailable.map((candidate) => {
                    const isBlocked =
                      candidate.eligibility === 'FAIL' || candidate.capabilityFit === 'MISMATCH';
                    const rowDescId = `unavail-desc-${candidate.inspectorId}-${candidate.droneId}`;
                    return (
                      <Stack
                        key={pairKey(candidate)}
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{
                          py: 1.5,
                          px: 1,
                          alignItems: { sm: 'center' },
                          justifyContent: 'space-between',
                          opacity: 0.88,
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{ alignItems: 'center', minWidth: 0 }}
                        >
                          <Avatar
                            src={candidate.inspectorAvatarUrl ?? undefined}
                            alt={candidate.inspectorName}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'action.hover',
                              color: 'text.secondary',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            {getInspectorInitials(candidate.inspectorName)}
                          </Avatar>
                          <Box id={rowDescId} sx={{ minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {candidate.inspectorName} · {candidate.droneModel} (
                                {candidate.droneSerialNumber})
                              </Typography>
                              <Chip
                                size="small"
                                icon={
                                  isBlocked ? (
                                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                  ) : (
                                    <HelpOutlineRoundedIcon sx={{ fontSize: 14 }} />
                                  )
                                }
                                label={isBlocked ? t('Blocked') : t('Unverified')}
                                color={isBlocked ? 'error' : 'warning'}
                                variant="outlined"
                                sx={{
                                  height: 22,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                }}
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {getPrimaryBlockerReason(candidate, t)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Button
                          size="small"
                          variant="text"
                          aria-describedby={rowDescId}
                          startIcon={<VisibilityOutlinedIcon fontSize="small" />}
                          onClick={() => setDetailKey(pairKey(candidate))}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            alignSelf: { xs: 'flex-start', sm: 'center' },
                          }}
                        >
                          {t('Details')}
                        </Button>
                      </Stack>
                    );
                  })
                )}
              </Stack>
            )}
          </Box>
        )}

        {disclaimerText(candidates) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {t(disclaimerText(candidates) ?? '')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Box sx={{ py: 2, px: 1.5, color: 'text.secondary' }}>
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {title}
      </Typography>
      {body && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {body}
        </Typography>
      )}
      {action && onAction && (
        <Button
          size="small"
          variant="outlined"
          onClick={onAction}
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
        >
          {action}
        </Button>
      )}
    </Box>
  );
}