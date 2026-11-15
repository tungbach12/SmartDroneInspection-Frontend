import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import {
  useInspection,
  useFieldSessions,
  useAcceptInspection,
  useDeclineInspection,
} from '../hooks/useInspections';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { getSectionPath, PORTAL_IDS, type PortalId } from '@/app/permissions/accessPolicy';
import { formatLocation } from '@/shared/airspace/airspaceZones';
import { AirspaceFlightPlannerDialog } from '@/shared/airspace/AirspaceFlightPlannerDialog';
import { resolveInspectionMetadata, resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import {
  resolveOverviewGuidance,
  type InspectionRoleView,
} from '../utils/workflowStepResolver';
import { OverviewFinanceSection } from './OverviewFinanceSection';
import { OverviewStakeholdersSection } from './OverviewStakeholdersSection';

export interface InspectionWorkDetailDialogProps {
  open: boolean;
  inspectionId: string | null;
  onClose: () => void;
}

export function InspectionWorkDetailDialog({
  open,
  inspectionId,
  onClose,
}: InspectionWorkDetailDialogProps) {
  const { t, formatDateTime, formatDate } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();

  const roles = useAuthStore((state) => state.roles);
  const portal = (location.pathname.split('/').filter(Boolean)[0] ?? PORTAL_IDS[0]) as PortalId;
  const isManagerPortal = portal === 'manager' && roles.includes('MANAGER');
  const isClientPortal = portal === 'client';
  const roleView: InspectionRoleView = isManagerPortal
    ? 'manager'
    : isClientPortal
      ? 'customer'
      : 'inspector';


  const inspectionQuery = useInspection(inspectionId, open && Boolean(inspectionId));
  const inspection = inspectionQuery.data;
  const [surveyMapOpen, setSurveyMapOpen] = useState(false);

  const sessionsQuery = useFieldSessions(inspectionId, open && Boolean(inspectionId));
  const latestSession = sessionsQuery.data?.at(-1);
  const wasAborted = latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED';

  const accept = useAcceptInspection(inspectionId);
  const decline = useDeclineInspection(inspectionId);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const isPendingAcceptance =
    !isManagerPortal &&
    !isClientPortal &&
    roles.includes('INSPECTOR') &&
    inspection?.status === 'SCHEDULED' &&
    !inspection?.reassignmentRequired &&
    inspection?.assignmentStatus === 'PENDING_ACCEPTANCE';
  const canDecline =
    !isManagerPortal &&
    !isClientPortal &&
    roles.includes('INSPECTOR') &&
    inspection?.status === 'SCHEDULED' &&
    !inspection?.reassignmentRequired;
  const navigateToInspectionRoute = (subpath = '') => {
    onClose();
    const base = `${getSectionPath(portal, 'inspections')}/${inspectionId}`;
    const destination = subpath ? `${base}/${subpath}` : base;
    navigate(destination);
  };

  const inspectionItems = inspection?.inspectionItems ?? [];
  const guidance = inspection ? resolveOverviewGuidance(inspection, roleView, t) : null;
  const meta = resolveInspectionMetadata(inspection);
  const finance = inspectionId ? resolveInspectorFinanceBreakdown(inspectionId, null) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="inspection-work-detail-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider',
          },
        },
      }}
    >
      <DialogTitle
        id="inspection-work-detail-title"
        sx={{
          p: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: 'rgba(43, 132, 235, 0.1)',
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <CalendarMonthOutlinedIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 }} noWrap>
              {inspection?.assetName || t('Inspection work details')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {t('Inspection ID')}: <span style={{ fontFamily: 'monospace' }}>{inspectionId?.slice(0, 13)}…</span>
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {inspection && <StatusChip status={inspection.status} />}
          {wasAborted && (
            <Chip
              size="small"
              color="warning"
              label={t('Reschedule required')}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            />
          )}
          <IconButton onClick={onClose} size="small" aria-label={t('Close')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: 'background.default' }}>
        {inspectionQuery.isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t('Loading inspection details…')}
            </Typography>
          </Box>
        ) : inspectionQuery.isError ? (
          <Alert severity="error" sx={{ my: 2 }}>
            {t('Could not load inspection details. Please try again.')}
          </Alert>
        ) : !inspection ? (
          <Alert severity="info" sx={{ my: 2 }}>
            {t('Inspection not found.')}
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {/* Pending inspector acceptance alert */}
            {isPendingAcceptance && (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Assignment pending confirmation')}
                </Typography>
              </Alert>
            )}

            {/* Inspector decline / reassignment required alert */}
            {inspection.reassignmentRequired && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Reassignment required — assigned inspector declined')}
                </Typography>
                {inspection.declineReason && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {t('Reason')}: &ldquo;{inspection.declineReason}&rdquo;
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('This flight cannot start until the Platform Manager reassigns or reschedules it.')}
                </Typography>
              </Alert>
            )}

            {/* Overdue no-show alert */}
            {inspection.overdueNotifiedAt && inspection.status === 'SCHEDULED' && !inspection.reassignmentRequired && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Scheduled window passed without starting')}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('The scheduled flight window elapsed with no active field session recorded. Follow up, reschedule, or reassign as needed.')}
                </Typography>
              </Alert>
            )}

            {/* Aborted flight warning alert */}
            {wasAborted && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Previous flight session was aborted')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {latestSession?.endedAt
                    ? `${t('Ended')} ${formatDateTime(new Date(latestSession.endedAt))} · `
                    : ''}
                  {t('Reason')}: "{latestSession?.abortReason}"
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('The flight session was stopped before completion. Please reschedule the flight window or dispatch as needed.')}
                </Typography>
              </Alert>
            )}

            {/* Workflow Action Guidance Banner */}
            {guidance && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('Current mission stage')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mt: 0.5 }}>
                    {guidance.tip}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigateToInspectionRoute(guidance.subpath)}
                  sx={{
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: '8px',
                    boxShadow: 'none',
                  }}
                >
                  {guidance.actionLabel}
                </Button>
              </Paper>
            )}

            {/* Mission Stakeholders (Partner Inspector & Customer Account) for Manager / Admin */}
            {roleView === 'manager' && (
              <OverviewStakeholdersSection
                inspection={inspection}
                portal={portal}
                onNavigateAway={onClose}
              />
            )}

            {/* General Time & Location Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '10px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthOutlinedIcon fontSize="small" color="primary" />
                {t('Planned work schedule')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Planned Start')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {inspection.plannedStartAt ? formatDateTime(new Date(inspection.plannedStartAt)) : t('Not scheduled')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Planned End')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {inspection.plannedEndAt ? formatDateTime(new Date(inspection.plannedEndAt)) : t('Not specified')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Asset & Target Infrastructure */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '10px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOnOutlinedIcon fontSize="small" color="primary" />
                  {t('Infrastructure Asset')}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MapRounded sx={{ fontSize: 16 }} />}
                  onClick={() => setSurveyMapOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    borderRadius: '8px',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    bgcolor: 'action.selected',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {t('View Airspace Survey Map & Takeoff Point')}
                </Button>
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Asset Name')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {inspection.assetName || `${t('Asset')} #${inspection.assetId.slice(0, 8)}`}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Asset Location')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {formatLocation(inspection.locationText) || t('No specific location coordinates recorded')}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Assigned Drone & Flight Authorization */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '10px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlightOutlinedIcon fontSize="small" color="primary" />
                {t('Equipment & Flight Permits')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Assigned Drone')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {inspection.droneSerialNumber
                      ? `${inspection.droneSerialNumber} ${inspection.droneModel ? `(${inspection.droneModel})` : ''}`
                      : t('Unassigned Drone')}
                  </Typography>
                  {inspection.droneServiceability && (
                    <Chip
                      label={inspection.droneServiceability}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 20,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        bgcolor: inspection.droneServiceability === 'ACTIVE' ? 'rgba(23, 107, 82, 0.12)' : 'rgba(168, 50, 59, 0.12)',
                        color: inspection.droneServiceability === 'ACTIVE' ? 'success.main' : 'error.main',
                      }}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Regulatory Flight Permit')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {inspection.flightPermitFileName || t('Awaiting Permit Upload')}
                  </Typography>
                  {inspection.flightPermitUploadedAt && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('Uploaded')}: {formatDate(new Date(inspection.flightPermitUploadedAt))}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Mission Work Items, Components & Standards */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '10px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentOutlinedIcon fontSize="small" color="primary" />
                {t('Mission tasks & specifications')}
              </Typography>
              <Stack spacing={2}>
                {meta.objective && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Mission scope')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, mt: 0.25 }}>
                      {meta.objective}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {t('Target components to inspect')}
                  </Typography>
                  {inspectionItems.length > 0 ? (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                      {inspectionItems.map((comp, idx) => (
                        <Chip
                          key={idx}
                          label={comp}
                          size="small"
                          icon={<TaskAltOutlinedIcon fontSize="small" />}
                          sx={{ bgcolor: 'action.hover', fontWeight: 500 }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {t('Standard full physical inspection covering all accessible structures')}
                    </Typography>
                  )}
                </Box>
                {finance && (
                  <OverviewFinanceSection finance={finance} roleView={roleView} />
                )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          p: 2.5,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {isPendingAcceptance && (
            <LoadingButton
              variant="contained"
              color="primary"
              loading={accept.isPending}
              onClick={() => accept.mutate(undefined)}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none', minHeight: { xs: 42, sm: 36 } }}
            >
              {t('Accept mission')}
            </LoadingButton>
          )}
          {canDecline && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<CancelOutlinedIcon />}
              onClick={() => {
                setDeclineReason('');
                setDeclineOpen(true);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', minHeight: { xs: 42, sm: 36 } }}
            >
              {t('Decline mission')}
            </Button>
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600, minHeight: { xs: 42, sm: 36 } }}>
            {t('Close')}
          </Button>
          <Button
            variant="outlined"
            endIcon={<OpenInNewRoundedIcon />}
            onClick={() => navigateToInspectionRoute()}
            disabled={!inspection}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', minHeight: { xs: 42, sm: 36 } }}
          >
            {t('Open full inspection workspace')}
          </Button>
        </Stack>
      </DialogActions>

      {inspection && (
        <AirspaceFlightPlannerDialog
          open={surveyMapOpen}
          onClose={() => setSurveyMapOpen(false)}
          assetName={inspection.assetName || t('Inspected Asset')}
          locationText={inspection.locationText}
          inspectionItems={inspection.inspectionItems ?? []}
        />
      )}

      {/* Inspector Decline Dialog */}
      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!declineReason.trim()) return;
            decline.mutate(declineReason.trim(), {
              onSuccess: () => {
                setDeclineOpen(false);
                onClose();
              },
            });
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Decline assigned mission?')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Decline reason')}
                multiline
                minRows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                helperText={t('Explain why you cannot perform this inspection so the Platform Manager can reassign it.')}
              />
              <MutationProblemAlert
                error={decline.error}
                isError={decline.isError}
                fallbackMessage={t('Could not decline inspection.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeclineOpen(false)}>{t('Back')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              color="warning"
              loading={decline.isPending}
              disabled={!declineReason.trim()}
            >
              {t('Confirm decline')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

    </Dialog>
  );
}
