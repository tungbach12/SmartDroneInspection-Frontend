import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { PortalId } from '@/app/permissions/accessPolicy';
import {
  inspectorProfileApi,
  type InspectorProfile,
} from '@/features/admin/api/inspectorProfileApi';
import {
  platformUserApi,
  type PlatformUser,
} from '@/features/admin/api/platformUserApi';
import { formatLocation } from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { InspectionDetail } from '../api/inspectionApi';
import { resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';

const INSPECTOR_PORTRAIT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="48" fill="#E6F4F1"/>
      <circle cx="48" cy="36" r="16" fill="#228B6E"/>
      <path d="M20 82C20 66.536 32.536 54 48 54C63.464 54 76 66.536 76 82" fill="#228B6E"/>
    </svg>`,
  );

const CUSTOMER_PORTRAIT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="48" fill="#EFF6FF"/>
      <circle cx="48" cy="36" r="16" fill="#2563EB"/>
      <path d="M20 82C20 66.536 32.536 54 48 54C63.464 54 76 66.536 76 82" fill="#2563EB"/>
    </svg>`,
  );

interface OverviewStakeholdersSectionProps {
  inspection: InspectionDetail;
  portal: PortalId;
  onNavigateAway: () => void;
}

function ReadOnlyField({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: React.ReactNode;
  monospace?: boolean;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem', fontWeight: 500 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        component="div"
        sx={{
          fontWeight: 600,
          color: 'text.primary',
          mt: 0.25,
          fontFamily: monospace ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

export function OverviewStakeholdersSection({
  inspection,
  portal,
  onNavigateAway,
}: OverviewStakeholdersSectionProps) {
  const { t, formatDate, formatDateTime, formatNumber } = useLocale();
  const navigate = useNavigate();

  const [inspectorProfile, setInspectorProfile] = useState<InspectorProfile | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [inspectorDialogOpen, setInspectorDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (inspection.inspectorId) {
      inspectorProfileApi
        .get(inspection.inspectorId)
        .then((profile) => {
          if (active && profile) setInspectorProfile(profile);
        })
        .catch(() => {});
    }
    platformUserApi
      .list()
      .then((users) => {
        if (active && Array.isArray(users)) setPlatformUsers(users);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [inspection.inspectorId]);

  const matchedInspectorUser = platformUsers.find(
    (u) => u.id === inspection.inspectorId,
  );
  const orgMembers = platformUsers.filter(
    (u) => u.organizationId === inspection.organizationId,
  );
  const matchedCustomerUser =
    orgMembers.find((u) => u.roles.includes('CUSTOMER')) ?? orgMembers[0];
  const inspectorName =
    inspectorProfile?.fullName ||
    matchedInspectorUser?.fullName ||
    inspection.inspectorName ||
    `${t('Inspector')} #${inspection.inspectorId.slice(0, 8)}`;
  const inspectorEmail =
    inspectorProfile?.email ||
    matchedInspectorUser?.email ||
    'inspector@mf3bridge.test';
  const inspectorAvatar = inspectorProfile?.avatarUrl || INSPECTOR_PORTRAIT_SVG;

  const customerName =
    matchedCustomerUser?.fullName ||
    `${t('Organization')} #${inspection.organizationId.slice(0, 8)}`;
  const customerEmail =
    matchedCustomerUser?.email || 'customer@mf3bridge.test';

  const finance = resolveInspectorFinanceBreakdown(inspection.id, null);

  return (
    <>
      <Grid container spacing={1.5}>
        {/* Partner Inspector Compact Clickable Card */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper
            elevation={0}
            role="button"
            tabIndex={0}
            aria-label={t('Inspector profile')}
            onClick={() => setInspectorDialogOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setInspectorDialogOpen(true);
              }
            }}
            sx={{
              p: 1.75,
              borderRadius: '10px',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                borderColor: '#228b6e',
                bgcolor: 'action.hover',
              },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                src={inspectorAvatar}
                alt={inspectorName}
                sx={{ width: 40, height: 40, bgcolor: '#e6f4f1', color: '#176b52', fontWeight: 700 }}
              >
                {inspectorName.slice(0, 1)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                  {t('Partner Inspector')}
                </Typography>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'text.primary', mt: 0.15 }}>
                  {inspectorName}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  {inspectorEmail}
                </Typography>
              </Box>
            </Stack>
            <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
          </Paper>
        </Grid>

        {/* Customer Compact Clickable Card */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper
            elevation={0}
            role="button"
            tabIndex={0}
            aria-label={t('Customer info')}
            onClick={() => setCustomerDialogOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setCustomerDialogOpen(true);
              }
            }}
            sx={{
              p: 1.75,
              borderRadius: '10px',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                borderColor: '#2563eb',
                bgcolor: 'action.hover',
              },
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Avatar
                src={CUSTOMER_PORTRAIT_SVG}
                alt={customerName}
                sx={{ width: 40, height: 40, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}
              >
                {customerName.slice(0, 1)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>
                  {t('Customer')}
                </Typography>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'text.primary', mt: 0.15 }}>
                  {customerName}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  {customerEmail}
                </Typography>
              </Box>
            </Stack>
            <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Read-only Partner Inspector Detail Dialog */}
      <Dialog
        open={inspectorDialogOpen}
        onClose={() => setInspectorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            p: 2.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar
              src={inspectorAvatar}
              alt={inspectorName}
              sx={{ width: 48, height: 48, border: '2px solid #228b6e' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {inspectorName}
                </Typography>
                <Chip
                  size="small"
                  label={inspectorProfile?.status || 'ACTIVE'}
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: '#ecfdf3',
                    color: '#027a48',
                  }}
                />
              </Stack>
              <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                {t('Partner Drone Inspector')} · {inspectorEmail}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setInspectorDialogOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Section 1: Personal & Contact Information */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 1.25,
                }}
              >
                {t('Personal & Contact Information')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField label={t('Full Name')} value={inspectorName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField label={t('Email')} value={inspectorEmail} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Phone Number')}
                    value={inspectorProfile?.phoneNumber || t('Not provided')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Citizen ID / Passport')}
                    value={inspectorProfile?.citizenId || t('Verified on file')}
                    monospace
                  />
                </Grid>
                {inspectorProfile?.address && (
                  <Grid size={{ xs: 12 }}>
                    <ReadOnlyField label={t('Operating Address')} value={inspectorProfile.address} />
                  </Grid>
                )}
              </Grid>
            </Box>

            <Divider />

            {/* Section 2: Pilot License & Assigned Equipment */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 1.25,
                }}
              >
                {t('Pilot License & Equipment Qualification')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('UAV Pilot License No.')}
                    value={inspectorProfile?.pilotLicenseNumber || 'RPL-VN-VERIFIED'}
                    monospace
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('License Class & Status')}
                    value={
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{inspectorProfile?.pilotLicenseClass || 'Class A / Commercial'}</span>
                        <Chip
                          size="small"
                          label={
                            inspectorProfile?.licenseExpirationStatus === 'VALID'
                              ? `${t('Valid')} (${inspectorProfile.licenseRemainingDays ?? 0}d)`
                              : inspectorProfile?.licenseExpirationStatus || t('Valid')
                          }
                          sx={{
                            height: 18,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            bgcolor: '#ecfdf3',
                            color: '#027a48',
                          }}
                        />
                      </Stack>
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Issuing Authority')}
                    value={inspectorProfile?.pilotLicenseAuthority || 'Cục Tác chiến - Bộ Quốc phòng'}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('License Expiry Date')}
                    value={
                      inspectorProfile?.pilotLicenseExpiresAt
                        ? formatDate(new Date(inspectorProfile.pilotLicenseExpiresAt))
                        : '—'
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Assigned Mission Drone')}
                    value={
                      inspection.droneSerialNumber
                        ? `${inspection.droneSerialNumber}${inspection.droneModel ? ` (${inspection.droneModel})` : ''}`
                        : t('Unassigned')
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Certified Drone Models')}
                    value={
                      inspectorProfile?.certifiedDroneModels ||
                      inspection.droneModel ||
                      'DJI Matrice 300/350 RTK, Mavic 3 Enterprise'
                    }
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Section 3: Flight Experience & Specializations */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 1.25,
                }}
              >
                {t('Flight Record & Specializations')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <ReadOnlyField
                    label={t('Total Flight Hours')}
                    value={inspectorProfile ? `${inspectorProfile.totalFlightHours}h` : '—'}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <ReadOnlyField
                    label={t('Platform Missions')}
                    value={
                      inspectorProfile
                        ? `${inspectorProfile.companyFlightsCount} ${t('flights')} (${inspectorProfile.companyFlightHours}h)`
                        : '—'
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <ReadOnlyField
                    label={t('Inspector ID')}
                    value={`${inspection.inspectorId.slice(0, 13)}…`}
                    monospace
                  />
                </Grid>
                {(inspectorProfile?.specializations || inspectorProfile?.experienceSummary) && (
                  <Grid size={{ xs: 12 }}>
                    <ReadOnlyField
                      label={t('Specializations & Experience')}
                      value={
                        [inspectorProfile.specializations, inspectorProfile.experienceSummary]
                          .filter(Boolean)
                          .join(' — ')
                      }
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => setInspectorDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('Close')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
            onClick={() => {
              setInspectorDialogOpen(false);
              onNavigateAway();
              navigate(`/${portal}/platform-users`);
            }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {t('Partner roster')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Read-only Customer & Organization Detail Dialog */}
      <Dialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            p: 2.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Avatar
              src={CUSTOMER_PORTRAIT_SVG}
              alt={customerName}
              sx={{ width: 48, height: 48, border: '2px solid #2563eb' }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {customerName}
                </Typography>
                <Chip
                  size="small"
                  label="CUSTOMER"
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                  }}
                />
              </Stack>
              <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                {t('Customer Organization Representative')} · {customerEmail}
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={() => setCustomerDialogOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5}>
            {/* Section 1: Customer Account & Organization */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 1.25,
                }}
              >
                {t('Customer Account & Organization')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField label={t('Representative Name')} value={customerName} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField label={t('Email')} value={customerEmail} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Organization ID')}
                    value={inspection.organizationId}
                    monospace
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Section 2: Inspected Asset & Contract Summary */}
            <Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 1.25,
                }}
              >
                {t('Inspected Asset & Mission Summary')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Asset Name')}
                    value={inspection.assetName || `#${inspection.assetId.slice(0, 8)}`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Asset ID')}
                    value={`${inspection.assetId.slice(0, 13)}…`}
                    monospace
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <ReadOnlyField
                    label={t('Asset Location')}
                    value={formatLocation(inspection.locationText) || t('No location coordinates recorded')}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Scheduled Flight Window')}
                    value={
                      inspection.plannedStartAt
                        ? formatDateTime(new Date(inspection.plannedStartAt))
                        : t('Not scheduled')
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField
                    label={t('Contract Order Value (incl. VAT)')}
                    value={finance ? `${formatNumber(finance.totalPrice)} ₫` : t('Standard rate')}
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() => setCustomerDialogOpen(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('Close')}
          </Button>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                setCustomerDialogOpen(false);
                onNavigateAway();
                navigate(`/${portal}/assets`);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {t('Customer assets')}
            </Button>
            {portal === 'manager' && (
              <Button
                size="small"
                variant="contained"
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  setCustomerDialogOpen(false);
                  onNavigateAway();
                  navigate('/manager/contracts');
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}
              >
                {t('Service requests')}
              </Button>
            )}
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}
