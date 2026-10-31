import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type AssignOccurrenceInput, type ServiceRequest } from '../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';
import {
  useAssignServiceOccurrence,
  usePartnerDrones,
  usePartnerInspectors,
} from '../hooks/useContracts';

interface OccurrencesPanelProps {
  request: ServiceRequest;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function OccurrencesPanel({
  request,
  manager,
  onChanged,
  onError,
}: OccurrencesPanelProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          Occurrences and assignment
        </Typography>

        {request.occurrences.length === 0 ? (
          <Typography color="text.secondary">
            Occurrences are created after the signed contract is uploaded.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {request.occurrences.map((occurrence) => (
              <OccurrenceCard
                key={occurrence.id}
                request={request}
                occurrenceId={occurrence.id}
                occurrenceIndex={occurrence.occurrenceIndex}
                startAt={occurrence.plannedStartAt}
                endAt={occurrence.plannedEndAt}
                status={occurrence.status}
                inspectorId={occurrence.inspectorId}
                droneId={occurrence.droneId}
                inspectionId={occurrence.inspectionId}
                manager={manager}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function OccurrenceCard({
  request,
  occurrenceId,
  occurrenceIndex,
  startAt,
  endAt,
  status,
  inspectorId,
  droneId,
  inspectionId,
  manager,
  onChanged,
  onError,
}: {
  request: ServiceRequest;
  occurrenceId: string;
  occurrenceIndex: number;
  startAt: string;
  endAt: string;
  status: string;
  inspectorId: string | null;
  droneId: string | null;
  inspectionId: string | null;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const assign = useAssignServiceOccurrence(request.id, occurrenceId);
  const inspectors = usePartnerInspectors();
  const drones = usePartnerDrones();
  const [inspector, setInspector] = useState('');
  const [drone, setDrone] = useState('');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);

  const start = customStart ?? instantToDateTimeInput(startAt, request.timezone);
  const end = customEnd ?? instantToDateTimeInput(endAt, request.timezone);
  const availableDrones = (drones.data ?? []).filter((item) => item.inspectorOwnerId === inspector);
  const selectedDrone = availableDrones.some((item) => item.id === drone) ? drone : '';

  const isAssigned = status === 'ASSIGNED';

  const submit = async () => {
    if (!inspector || !selectedDrone) {
      onError('Select an Inspector and one of their registered drones for this occurrence.');
      return;
    }
    try {
      const plannedStartAt = dateTimeInputToInstant(start, request.timezone);
      const plannedEndAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(plannedEndAt) <= Date.parse(plannedStartAt)) {
        onError('The confirmed end time must be after the start time.');
        return;
      }
      const input: AssignOccurrenceInput = {
        plannedStartAt,
        plannedEndAt,
        inspectorId: inspector,
        droneId: selectedDrone,
      };
      await assign.mutateAsync(input);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to assign occurrence.';
      onError(msg);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: isAssigned ? 'success.light' : 'divider',
        bgcolor: isAssigned ? 'success.50' : 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>
            Occurrence {occurrenceIndex}
          </Typography>
          <Chip
            size="small"
            label={status.replaceAll('_', ' ')}
            color={isAssigned ? 'success' : 'default'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {new Date(startAt).toLocaleString(undefined, { timeZone: request.timezone })} –{' '}
          {new Date(endAt).toLocaleString(undefined, { timeZone: request.timezone })} · {request.timezone}
        </Typography>

        {isAssigned ? (
          <Box sx={{ pt: 0.5 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                icon={<BadgeOutlinedIcon />}
                label={`Inspector: ${inspectorId}`}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<FlightOutlinedIcon />}
                label={`Drone: ${droneId}`}
                variant="outlined"
                size="small"
              />
              {inspectionId && (
                <Chip
                  label={`Inspection ${inspectionId}`}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
              Inspector {inspectorId} · Drone {droneId} · Inspection {inspectionId} · MF2 ends at assignment; field work is in MF3.
            </Typography>
          </Box>
        ) : (
          manager &&
          request.status === 'CONTRACT_SIGNED' && (
            <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Confirmed start"
                    type="datetime-local"
                    size="small"
                    value={start}
                    onChange={(e) => setCustomStart(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    label="Confirmed end"
                    type="datetime-local"
                    size="small"
                    value={end}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id={`inspector-${occurrenceId}`}>Inspector</InputLabel>
                    <Select
                      labelId={`inspector-${occurrenceId}`}
                      label="Inspector"
                      value={inspector}
                      onChange={(e) => {
                        setInspector(e.target.value);
                        setDrone('');
                      }}
                    >
                      {(inspectors.data ?? []).map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small" disabled={!inspector || drones.isPending}>
                    <InputLabel id={`drone-${occurrenceId}`}>Drone</InputLabel>
                    <Select
                      labelId={`drone-${occurrenceId}`}
                      label="Drone"
                      value={selectedDrone}
                      onChange={(e) => setDrone(e.target.value)}
                    >
                      {availableDrones.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.serialNumber} · {item.model}
                        </MenuItem>
                      ))}
                    </Select>
                    {inspector && availableDrones.length === 0 && !drones.isPending && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        No eligible registered drone is listed for this Inspector.
                      </Typography>
                    )}
                  </FormControl>
                </Stack>
                <Box>
                  <LoadingButton
                    loading={assign.isPending}
                    variant="contained"
                    onClick={() => void submit()}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Assign occurrence
                  </LoadingButton>
                </Box>
              </Stack>
            </Box>
          )
        )}
      </Stack>
    </Paper>
  );
}
