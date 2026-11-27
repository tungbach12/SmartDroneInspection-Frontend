import { useCallback, useId, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
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
import { InspectorRatingSummaryBadge } from '@/features/inspections/components/InspectorRatingSummaryBadge';

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
  declineCount: number;
  abortCount: number;
  averageRating: number | null;
  ratingCount: number;
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
        declineCount: item.declineCount ?? 0,
        abortCount: item.abortCount ?? 0,
        averageRating: item.averageRating ?? null,
        ratingCount: item.ratingCount ?? 0,
        items: [item],
      });
    }
  }
  return Array.from(groups.values());
}

type EligibilityFilter = 'ELIGIBLE_ONLY' | 'ALL_EVALUATED';
type AltitudeFilter = 'ALL' | 'COVERS_STRUCTURE' | 'MINIMUM_CEILING';
type RatingFilter = 'ALL' | 'RATED_ONLY' | 'MIN_4' | 'MIN_3';
type CandidateSort = 'DEFAULT' | 'RATING_DESC';

interface CandidateFilters {
  query: string;
  eligibility: EligibilityFilter;
  altitude: AltitudeFilter;
  minimumCeilingMeters: string;
  capabilityCode: string;
  minimumRating: RatingFilter;
  sortBy: CandidateSort;
}

export const DEFAULT_FILTERS: CandidateFilters = {
  query: '',
  eligibility: 'ELIGIBLE_ONLY',
  altitude: 'ALL',
  minimumCeilingMeters: '',
  capabilityCode: 'ALL',
  minimumRating: 'ALL',
  sortBy: 'DEFAULT',
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
  const ratingCount = candidate.ratingCount ?? 0;
  const averageRating = candidate.averageRating ?? null;
  const matchesRating =
    filters.minimumRating === 'ALL' ||
    (filters.minimumRating === 'RATED_ONLY' && ratingCount > 0 && averageRating != null) ||
    (filters.minimumRating === 'MIN_4' && ratingCount > 0 && (averageRating ?? 0) >= 4) ||
    (filters.minimumRating === 'MIN_3' && ratingCount > 0 && (averageRating ?? 0) >= 3);

  return (
    matchesQuery &&
    matchesEligibility &&
    matchesAltitude &&
    matchesCapability &&
    matchesRating
  );
}

export function sortPartnerCandidates(
  items: PartnerCandidate[],
  sortBy: CandidateSort,
): PartnerCandidate[] {
  if (sortBy === 'DEFAULT') {
    return items;
  }
  return [...items].sort((left, right) => {
    const leftHasRating = (left.ratingCount ?? 0) > 0 && left.averageRating != null;
    const rightHasRating = (right.ratingCount ?? 0) > 0 && right.averageRating != null;
    if (leftHasRating !== rightHasRating) {
      return leftHasRating ? -1 : 1;
    }
    if (leftHasRating && rightHasRating) {
      const scoreDiff = (right.averageRating ?? 0) - (left.averageRating ?? 0);
      if (Math.abs(scoreDiff) > 0.0001) {
        return scoreDiff;
      }
      const countDiff = (right.ratingCount ?? 0) - (left.ratingCount ?? 0);
      if (countDiff !== 0) {
        return countDiff;
      }
    }
    const nameCompare = left.inspectorName.localeCompare(right.inspectorName);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return left.droneSerialNumber.localeCompare(right.droneSerialNumber);
  });
}

const pairKey = (candidate: PartnerCandidate) => `${candidate.inspectorId}:${candidate.droneId}`;
const CANDIDATES_PER_PAGE = 6;
const UNAVAILABLE_PER_PAGE = 5;

function CandidatePaginationFooter({
  page,
  totalCount,
  pageSize,
  ariaLabel,
  onPageChange,
}: {
  page: number;
  totalCount: number;
  pageSize: number;
  ariaLabel: string;
  onPageChange: (nextPage: number) => void;
}) {
  const { t } = useLocale();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalCount);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 2 },
        py: 1.25,
        borderTop: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
        gap: 1.5,
      }}
    >
      <Typography
        variant="body2"
        aria-live="polite"
        sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
      >
        {`${t('Showing')} ${start}–${end} ${t('of')} ${totalCount}`}
      </Typography>
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={safePage}
          onChange={(_event, nextPage) => onPageChange(nextPage)}
          shape="rounded"
          size="small"
          color="primary"
          siblingCount={0}
          boundaryCount={1}
          aria-label={ariaLabel}
          sx={{
            '& .MuiPaginationItem-root': {
              borderRadius: '8px',
              fontWeight: 600,
              minWidth: 32,
              height: 32,
            },
          }}
        />
      )}
    </Box>
  );
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
}: PartnerCandidateResultsProps) {
  const { locale, t } = useLocale();
  const capabilities = usePartnerCapabilities();
  const filtersId = useId();
  const unavailableId = useId();
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<CandidateFilters>(DEFAULT_FILTERS);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [unavailablePage, setUnavailablePage] = useState(1);

  const updateFilter = <Key extends keyof CandidateFilters>(key: Key, value: CandidateFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setUnavailablePage(1);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setShowAdvancedFilters(false);
    setPage(1);
    setUnavailablePage(1);
  };

  if (loading) {
    return (
      <Stack spacing={1.5} aria-label={t('Loading partner candidates')}>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} variant="rounded" height={52} />
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
  const resultCandidates =
    filters.eligibility === 'ALL_EVALUATED' ? candidates : allEligibleCandidates;
  const visibleCandidates = sortPartnerCandidates(
    resultCandidates.filter((candidate) => candidateMatchesFilters(candidate, filters)),
    filters.sortBy,
  );
  const visibleUnavailable = sortPartnerCandidates(
    candidates.filter((candidate) =>
      !isSelectablePartnerCandidate(candidate) &&
      candidateMatchesFilters(candidate, { ...filters, eligibility: 'ALL_EVALUATED' }),
    ),
    filters.sortBy,
  );
  const totalCandidatePages = Math.max(1, Math.ceil(visibleCandidates.length / CANDIDATES_PER_PAGE));
  const safePage = Math.min(page, totalCandidatePages);
  const pagedCandidates = visibleCandidates.slice(
    (safePage - 1) * CANDIDATES_PER_PAGE,
    safePage * CANDIDATES_PER_PAGE,
  );
  const candidateGroups = groupByInspector(pagedCandidates);
  const totalUnavailablePages = Math.max(
    1,
    Math.ceil(visibleUnavailable.length / UNAVAILABLE_PER_PAGE),
  );
  const safeUnavailablePage = Math.min(unavailablePage, totalUnavailablePages);
  const pagedUnavailable = visibleUnavailable.slice(
    (safeUnavailablePage - 1) * UNAVAILABLE_PER_PAGE,
    safeUnavailablePage * UNAVAILABLE_PER_PAGE,
  );
  const capabilityOptions = capabilities.data ?? [];

  const noResultsForFilters = resultCandidates.length > 0 && visibleCandidates.length === 0;

  const isStep = variant === 'step';
  const containerSx = embedded
    ? { bgcolor: 'transparent' }
    : isStep
      ? {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper',
        }
      : {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        };
  const activeAdvancedFilterCount = [
    filters.eligibility !== DEFAULT_FILTERS.eligibility,
    filters.altitude !== DEFAULT_FILTERS.altitude,
    filters.capabilityCode !== DEFAULT_FILTERS.capabilityCode,
    filters.minimumRating !== DEFAULT_FILTERS.minimumRating,
    filters.sortBy !== DEFAULT_FILTERS.sortBy,
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
                  bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                  color: 'primary.main',
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
                {((activeDetailCandidate.ratingCount ?? 0) > 0 ||
                  (activeDetailCandidate.declineCount ?? 0) > 0 ||
                  (activeDetailCandidate.abortCount ?? 0) > 0) && (
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                    <InspectorRatingSummaryBadge
                      averageRating={activeDetailCandidate.averageRating}
                      ratingCount={activeDetailCandidate.ratingCount}
                    />
                    {(activeDetailCandidate.declineCount ?? 0) > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={`${t('Declines')}: ${activeDetailCandidate.declineCount}`}
                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    )}
                    {(activeDetailCandidate.abortCount ?? 0) > 0 && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={`${t('Aborts')}: ${activeDetailCandidate.abortCount}`}
                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                )}
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

          {[
            {
              id: 'eligibility',
              title: t('Eligibility checks'),
              status: activeDetailCandidate.eligibility,
              checks: activeDetailCandidate.hardGates,
              showCapability: false,
            },
            {
              id: 'capability',
              title: t('Capability fit'),
              status: activeDetailCandidate.capabilityFit,
              checks: activeDetailCandidate.capabilityChecks,
              showCapability: true,
            },
          ].map(({ id, title: checkTitle, status, checks, showCapability }) => (
            <Accordion
              key={id}
              defaultExpanded={status !== 'PASS' && status !== 'MATCH'}
              disableGutters
              elevation={0}
              slotProps={{ transition: { unmountOnExit: true } }}
              sx={{
                bgcolor: 'transparent',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary
                id={filtersId + '-detail-' + id}
                aria-controls={filtersId + '-detail-' + id + '-content'}
                expandIcon={<KeyboardArrowDownRoundedIcon />}
                sx={{ minHeight: 44, px: 0.5 }}
              >
                <Typography component="span" variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {checkTitle} ({status})
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0.5, pt: 0, pb: 1.5 }}>
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {checks.map((check) => (
                    <Stack
                      key={check.code}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        {showCapability && (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {check.code === 'NO_CAPABILITY_REQUIREMENTS'
                              ? t('Standard inspection')
                              : check.code === 'DRONE_MAX_ALTITUDE'
                                ? t('Drone max altitude')
                                : check.code.replaceAll('_', ' ')}
                          </Typography>
                        )}
                        <Typography
                          variant={showCapability ? 'caption' : 'body2'}
                          color={showCapability ? 'text.secondary' : 'text.primary'}
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {t(check.explanation)}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={check.status}
                        color={statusChipColor(check.status)}
                        variant="outlined"
                        sx={{ height: 22, fontWeight: 600, borderRadius: '6px', flexShrink: 0 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}

          {disclaimerText(candidates) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5 }}
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
      <Box sx={{ p: embedded ? 0 : { xs: 1.5, sm: isStep ? 2.5 : 2 } }}>
        {(onBackToForm || title || windowSummary || Boolean(requiredCapabilities?.length)) && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {onBackToForm && (
              <Button
                size="small"
                startIcon={<ArrowBackRoundedIcon fontSize="small" />}
                onClick={onBackToForm}
                sx={{
                  alignSelf: 'flex-start',
                  ml: -0.75,
                  px: 0.75,
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {backLabel ?? t('Back')}
              </Button>
            )}
            {title && (
              <Typography variant={isStep ? 'h5' : 'h6'} component="h2" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
            )}
            {(windowSummary || Boolean(requiredCapabilities?.length)) && (
              <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                {windowSummary && (
                  <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
                      {t('Flight window')}
                    </Box>
                    {windowSummary}
                  </Typography>
                )}
                {Boolean(requiredCapabilities?.length) && (
                  <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Capabilities')}
                    </Typography>
                    {requiredCapabilities?.map((code) => {
                      const capability = capabilityOptions.find((option) => option.code === code);
                      const label = capability
                        ? locale === 'vi' ? capability.nameVi : capability.nameEn
                        : code.replaceAll('_', ' ');
                      return (
                        <Chip
                          key={code}
                          size="small"
                          variant="outlined"
                          label={label}
                          sx={{ borderRadius: '6px' }}
                        />
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>
        )}

        {candidates.length > 0 && (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('Search Inspector, drone model, or serial number...')}
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                slotProps={{
                  htmlInput: { 'aria-label': t('Search Inspector, drone model, or serial number...') },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  flex: '1 1 240px',
                  maxWidth: 460,
                  minWidth: 0,
                  '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'background.paper' },
                }}
              />
              <Stack
                direction="row"
                sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
              >
                <Button
                  size="small"
                  variant={showAdvancedFilters ? 'contained' : 'outlined'}
                  color={showAdvancedFilters || activeAdvancedFilterCount > 0 ? 'primary' : 'inherit'}
                  disableElevation
                  startIcon={<TuneRoundedIcon fontSize="small" />}
                  aria-expanded={showAdvancedFilters}
                  aria-controls={showAdvancedFilters ? filtersId : undefined}
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('Filters')}
                  {activeAdvancedFilterCount > 0 ? ` · ${activeAdvancedFilterCount}` : ''}
                </Button>
                {(filters.query.trim() || activeAdvancedFilterCount > 0) && (
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
            </Stack>

            {showAdvancedFilters && (
              <Box
                id={filtersId}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  bgcolor: 'background.default',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
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

                <TextField
                  select
                  size="small"
                  label={t('Rating')}
                  value={filters.minimumRating}
                  onChange={(event) =>
                    updateFilter('minimumRating', event.target.value as RatingFilter)
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                >
                  <MenuItem value="ALL">{t('All ratings')}</MenuItem>
                  <MenuItem value="RATED_ONLY">{t('Has ratings')}</MenuItem>
                  <MenuItem value="MIN_4">{t('4+ stars')}</MenuItem>
                  <MenuItem value="MIN_3">{t('3+ stars')}</MenuItem>
                </TextField>

                <TextField
                  select
                  size="small"
                  label={t('Sort by')}
                  value={filters.sortBy}
                  onChange={(event) =>
                    updateFilter('sortBy', event.target.value as CandidateSort)
                  }
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                >
                  <MenuItem value="DEFAULT">{t('Default order')}</MenuItem>
                  <MenuItem value="RATING_DESC">{t('Highest rated first')}</MenuItem>
                </TextField>
              </Box>
            )}
          </Stack>
        )}

        {stale && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
            {t('Schedule or capability criteria changed. Re-run partner evaluation before confirming.')}
          </Alert>
        )}

        {candidates.length === 0 ? (
          <EmptyState title={t('No partner pairs registered.')} />
        ) : allEligibleCandidates.length === 0 && filters.eligibility === 'ELIGIBLE_ONLY' ? (
          <EmptyState title={t('No eligible partner pairs.')} />
        ) : noResultsForFilters ? (
          <EmptyState
            title={t('No partner pairs match.')}
            action={t('Clear filters')}
            onAction={resetFilters}
          />
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              bgcolor: 'background.paper',
              overflow: 'hidden',
              containerType: 'inline-size',
              '& table': { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' },
              '& th': {
                px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider',
                color: 'text.secondary', textAlign: 'left', typography: 'body2', fontWeight: 600,
              },
              '& .group-row td': {
                px: 1.5, py: 0.75, bgcolor: 'background.default',
                borderTop: '1px solid', borderColor: 'divider',
              },
              '& tbody:first-of-type .group-row td': { borderTop: 0 },
              '& .pair-row td': { px: 1.5, py: 1, borderTop: '1px solid', borderColor: 'divider' },
              '& .pair-row:hover': { bgcolor: 'action.hover' },
              '& .pair-row[aria-selected="true"]': { bgcolor: 'action.selected' },
              '@container (max-width: 600px)': {
                '& thead': { display: 'none' },
                '& table, & tbody, & .group-row, & .group-row td': { display: 'block', width: '100%' },
                '& .pair-row': {
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gridTemplateAreas: '"drone actions" "status status"',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                },
                '& .pair-row td': { display: 'block', width: 'auto', px: 0, py: 0, border: 0 },
                '& .pair-row td:first-child': { gridArea: 'drone', minWidth: 0 },
                '& .pair-row td:nth-child(2)': { gridArea: 'status', minWidth: 0 },
                '& .pair-row td:last-child': { gridArea: 'actions' },
              },
            }}
          >
            <table aria-label={t('Eligible partner pairs')}>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '54%' }}>{t('Inspector and drone')}</th>
                  <th scope="col" style={{ width: '24%' }}>{t('Eligibility')}</th>
                  <th scope="col" style={{ width: '22%', textAlign: 'right' }}>{t('Actions')}</th>
                </tr>
              </thead>
              {candidateGroups.map((group) => (
                <tbody key={group.inspectorId}>
                  <tr className="group-row"><td colSpan={3}>
                    <Stack direction="row" sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap', gap: 0.75 }}>
                      <Avatar src={group.inspectorAvatarUrl ?? undefined} alt={group.inspectorName}
                        sx={{
                          width: 30,
                          height: 30,
                          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                          color: 'primary.main',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          flexShrink: 0,
                        }}>
                        {getInspectorInitials(group.inspectorName)}
                      </Avatar>
                      <Typography variant="body2" sx={{ minWidth: 0, fontWeight: 700, overflowWrap: 'anywhere' }}>
                        {group.inspectorName}
                      </Typography>
                      <InspectorRatingSummaryBadge
                        averageRating={group.averageRating}
                        ratingCount={group.ratingCount}
                      />
                      {[
                        { label: 'Declines', count: group.declineCount },
                        { label: 'Aborts', count: group.abortCount },
                      ]
                        .filter(({ count }) => count > 0)
                        .map(({ label, count }) => (
                          <Typography
                            key={label}
                            component="span"
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {t(label)}: {count}
                          </Typography>
                        ))}
                    </Stack>
                  </td></tr>
                  {group.items.map((candidate) => {
                    const selectable = isSelectablePartnerCandidate(candidate);
                    const isSelected = selectable && selectedInspectorId === candidate.inspectorId && selectedDroneId === candidate.droneId;
                    const tier = formatDroneTierSummary(candidate.droneModel, locale);
                    const tierLabel = (tier.shortLabel.split('(')[0] ?? tier.shortLabel).trim();
                    const droneSpecs = [
                      candidate.droneSerialNumber,
                      tierLabel,
                      candidate.droneMaxAltitudeMeters != null
                        ? `${t('Drone ceiling')} ${candidate.droneMaxAltitudeMeters} m`
                        : null,
                    ].filter(Boolean).join(' · ');
                    return (
                      <tr key={pairKey(candidate)} className="pair-row" aria-selected={isSelected}>
                        <td>
                          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                            <Box sx={{ width: { xs: 40, sm: 54 }, height: { xs: 36, sm: 42 }, flexShrink: 0 }}>
                              <LazyDroneImage candidate={candidate} maxHeight={42} />
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}>
                                {candidate.droneModel ?? t('Partner drone')}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}
                              >
                                {droneSpecs}
                              </Typography>
                            </Box>
                          </Stack>
                        </td>
                        <td>
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
                                fontSize: '0.75rem',
                              }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="error.main"
                              sx={{
                                display: 'block',
                                fontWeight: 600,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {getPrimaryBlockerReason(candidate, t)}
                            </Typography>
                          )}
                        </td>
                        <td>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}
                          >
                            <IconButton
                              size="small"
                              aria-label={t('Details')}
                              title={t('Details')}
                              onClick={() => setDetailKey(pairKey(candidate))}
                              sx={{
                                width: 36,
                                height: 36,
                                color: 'text.secondary',
                                borderRadius: '8px',
                              }}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                            <Button
                              size="small"
                              variant={isSelected ? 'contained' : 'outlined'}
                              disabled={stale || !selectable}
                              onClick={() => onSelectPair(candidate)}
                              startIcon={isSelected ? <CheckRoundedIcon fontSize="small" /> : undefined}
                              sx={{
                                minHeight: 36,
                                px: 1.25,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderRadius: '8px',
                                whiteSpace: 'nowrap',
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
            {visibleCandidates.length > 0 && (
              <CandidatePaginationFooter
                page={safePage}
                totalCount={visibleCandidates.length}
                pageSize={CANDIDATES_PER_PAGE}
                ariaLabel={t('Candidate drones pagination')}
                onPageChange={setPage}
              />
            )}
          </Box>
        )}

        {filters.eligibility === 'ELIGIBLE_ONLY' && visibleUnavailable.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Button
              size="small"
              color="inherit"
              endIcon={showUnavailable ? <KeyboardArrowUpRoundedIcon /> : <KeyboardArrowDownRoundedIcon />}
              aria-expanded={showUnavailable}
              aria-controls={showUnavailable ? unavailableId : undefined}
              onClick={() => setShowUnavailable((prev) => !prev)}
              sx={{
                width: '100%',
                justifyContent: 'space-between',
                bgcolor: 'background.default',
                textTransform: 'none',
                textAlign: 'left',
                fontWeight: 600,
                borderRadius: '8px',
                minHeight: 40,
                px: 1.5,
              }}
            >
              {t('Unavailable or unverified pairs')} ({visibleUnavailable.length})
            </Button>

            {showUnavailable && (
              <Stack id={unavailableId} divider={<Divider flexItem />}>
                {pagedUnavailable.map((candidate) => {
                  const isBlocked =
                    candidate.eligibility === 'FAIL' || candidate.capabilityFit === 'MISMATCH';
                  const rowDescId = `${unavailableId}-${pairKey(candidate)}`;
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
                            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
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
                })}
                {visibleUnavailable.length > UNAVAILABLE_PER_PAGE && (
                  <CandidatePaginationFooter
                    page={safeUnavailablePage}
                    totalCount={visibleUnavailable.length}
                    pageSize={UNAVAILABLE_PER_PAGE}
                    ariaLabel={t('Unavailable candidate drones pagination')}
                    onPageChange={setUnavailablePage}
                  />
                )}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function EmptyState({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Box sx={{ py: 2, px: 1.5, color: 'text.secondary' }}>
      <Typography variant="body2" sx={{ fontWeight: 650 }}>
        {title}
      </Typography>
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
