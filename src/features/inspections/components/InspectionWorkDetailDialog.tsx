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
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import {
  useInspection,
  useFieldSessions,
  useRescheduleInspection,
  useCancelInspection,
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
  const isManagerOrAdminPortal = portal === 'manager' || portal === 'admin';
  const isClientPortal = portal === 'client';
  const roleView: InspectionRoleView = isManagerOrAdminPortal
    ? 'manager'
    : isClientPortal
      ? 'customer'
      : 'inspector';

  // Only Platform Manager or Admin can reschedule or cancel dispatched missions.
  const canManage =
    !isClientPortal && (roles.includes('MANAGER') || roles.includes('ADMIN'));

  const inspectionQuery = useInspection(inspectionId, open && Boolean(inspectionId));
  const inspection = inspectionQuery.data;
  const [surveyMapOpen, setSurveyMapOpen] = useState(false);

  const sessionsQuery = useFieldSessions(inspectionId, open && Boolean(inspectionId));
  const latestSession = sessionsQuery.data?.at(-1);
  const wasAborted = latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED';

  const reschedule = useRescheduleInspection(inspectionId);
  const cancel = useCancelInspection(inspectionId);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [cancelReason, setCancelReason] = useState('');

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
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.16)',
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
              bgcolor: 'rgba(55, 88, 249, 0.1)',
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

      <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
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
            {/* Aborted flight warning alert */}
            {wasAborted && (
              <Alert severity="warning" sx={{ borderRadius: '12px' }}>
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
                  borderRadius: '12px',
                  bgcolor: '#ffffff',
                  border: '1px solid',
                  borderColor: '#e2e8f0',
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
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#1e293b', mt: 0.5 }}>
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
                borderRadius: '12px',
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: '#e2e8f0',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthOutlinedIcon fontSize="small" color="primary" />
                {t('Planned work schedule')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Planned Start')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {inspection.plannedStartAt ? formatDateTime(new Date(inspection.plannedStartAt)) : t('Not scheduled')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Planned End')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
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
                borderRadius: '12px',
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: '#e2e8f0',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    bgcolor: 'rgba(55, 88, 249, 0.05)',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      bgcolor: 'rgba(55, 88, 249, 0.12)',
                    },
                  }}
                >
                  {t('🗺️ Xem Bản đồ khảo sát vùng bay & Điểm cất cánh')}
                </Button>
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Asset Name')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {inspection.assetName || `${t('Asset')} #${inspection.assetId.slice(0, 8)}`}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Asset Location')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155' }}>
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
                borderRadius: '12px',
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: '#e2e8f0',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FlightOutlinedIcon fontSize="small" color="primary" />
                {t('Equipment & Flight Permits')}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Assigned Drone')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
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
                        bgcolor: inspection.droneServiceability === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: inspection.droneServiceability === 'ACTIVE' ? 'success.dark' : 'error.dark',
                      }}
                    />
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Regulatory Flight Permit')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
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
                borderRadius: '12px',
                bgcolor: '#ffffff',
                border: '1px solid',
                borderColor: '#e2e8f0',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentOutlinedIcon fontSize="small" color="primary" />
                {t('Mission tasks & specifications')}
              </Typography>
              <Stack spacing={2}>
                {meta.objective && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Mission scope')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 500, mt: 0.25 }}>
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
                          sx={{ bgcolor: '#f1f5f9', fontWeight: 500 }}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
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
          {canManage && inspection?.status === 'SCHEDULED' && (
            <>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<EditCalendarOutlinedIcon />}
                onClick={() => {
                  const startStr = inspection.plannedStartAt
                    ? new Date(inspection.plannedStartAt).toISOString().slice(0, 16)
                    : '';
                  const endStr = inspection.plannedEndAt
                    ? new Date(inspection.plannedEndAt).toISOString().slice(0, 16)
                    : '';
                  setNewStart(startStr);
                  setNewEnd(endStr);
                  setRescheduleOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Reschedule')}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={() => {
                  setCancelReason('');
                  setCancelOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Cancel inspection')}
              </Button>
            </>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Close')}
          </Button>
          <Button
            variant="outlined"
            endIcon={<OpenInNewRoundedIcon />}
            onClick={() => navigateToInspectionRoute()}
            disabled={!inspection}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {t('Open full inspection workspace')}
          </Button>
        </Stack>
      </DialogActions>

      {inspection && (
        <AirspaceFlightPlannerDialog
          open={surveyMapOpen}
          onClose={() => setSurveyMapOpen(false)}
          assetName={inspection.assetName || 'Công trình kiểm định'}
          locationText={inspection.locationText}
          inspectionItems={inspection.inspectionItems ?? []}
        />
      )}

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStart || !newEnd) return;
            reschedule.mutate(
              {
                plannedStartAt: new Date(newStart).toISOString(),
                plannedEndAt: new Date(newEnd).toISOString(),
              },
              { onSuccess: () => setRescheduleOpen(false) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Reschedule flight window')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Planned start')}
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label={t('Planned end')}
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <MutationProblemAlert
                error={reschedule.error}
                isError={reschedule.isError}
                fallbackMessage={t('Could not reschedule inspection.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRescheduleOpen(false)}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={reschedule.isPending}
              disabled={!newStart || !newEnd}
            >
              {t('Save schedule')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cancel.mutate(
              { reason: cancelReason.trim() },
              {
                onSuccess: () => {
                  setCancelOpen(false);
                  onClose();
                },
              },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Cancel this inspection?')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Cancellation reason')}
                multiline
                minRows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                helperText={t('Enter the reason for cancelling this scheduled mission.')}
              />
              <MutationProblemAlert
                error={cancel.error}
                isError={cancel.isError}
                fallbackMessage={t('Could not cancel inspection.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCancelOpen(false)}>{t('Back')}</Button>
            <LoadingButton type="submit" variant="contained" color="error" loading={cancel.isPending}>
              {t('Confirm cancellation')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Dialog>
  );
}
