import { useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  useAuthorManualDraft,
  useEvidenceQualityHistory,
  useGenerateReportDraft,
  useReportVersions,
} from '../hooks/useInspections';

/**
 * MF3-07 report draft, one stage of the inspection workspace.
 *
 * This step only creates the version; section authoring, review, return/approve, and
 * publication stay on the report document page. The single link that opens the document is
 * enabled only once a version exists.
 */
export default function InspectionDraftPage() {
  const { inspectionId = '' } = useParams();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));

  const quality = useEvidenceQualityHistory(inspectionId);
  const versions = useReportVersions(inspectionId);
  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);

  const [narrative, setNarrative] = useState('');
  const [omissionDisclosure, setOmissionDisclosure] = useState('');

  // The backend draft gate requires an ACCEPTED decision and returns 409 otherwise.
  const evidenceAccepted = quality.data?.[0]?.decision === 'ACCEPTED';
  const hasVersion = (versions.data ?? []).length > 0;
  const reportDocumentPath = `${getSectionPath(portal, 'reports')}/${inspectionId}`;

  return (
    <Stack spacing={2}>
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          You are viewing this inspection as a reader. Report drafting belongs to the assigned
          Inspector.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Report draft
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          MF3-07 proposes a value for each authored report section from the authorized sources.
          This step only creates the version; you verify and edit the sections on the report
          document.
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Button
            variant="contained"
            disabled={!isInspector || createDraft.isPending || !evidenceAccepted}
            onClick={() => createDraft.mutate()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {createDraft.isPending ? 'Compiling report…' : 'Generate report draft'}
          </Button>
          {!evidenceAccepted && (
            <Alert severity="warning">
              Accept the evidence set before generating a report draft.
            </Alert>
          )}
          {createDraft.isError && (
            <Alert severity="warning">
              {getErrorMessage(
                createDraft.error,
                'Accept the evidence set before generating a report draft.',
              )}
            </Alert>
          )}
          <Divider />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Start a draft without the model
          </Typography>
          <Typography variant="caption" color="text.secondary">
            MF3-07 can fail or be unavailable. This seeds the version with your own narrative and
            the omitted-analysis disclosure so the same author and reviewer gates still apply; you
            then author each §3.7.2 section on the report document.
          </Typography>
          <TextField
            label="Narrative"
            multiline
            minRows={4}
            value={narrative}
            onChange={(event) => setNarrative(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 10000 } }}
          />
          <TextField
            label="Omitted analysis disclosure"
            multiline
            minRows={2}
            value={omissionDisclosure}
            onChange={(event) => setOmissionDisclosure(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Button
            variant="outlined"
            disabled={!isInspector || !narrative.trim() || authorManualDraft.isPending}
            onClick={() => {
              const trimmedDisclosure = omissionDisclosure.trim();
              authorManualDraft.mutate(
                trimmedDisclosure
                  ? { narrative: narrative.trim(), omissionDisclosure: trimmedDisclosure }
                  : { narrative: narrative.trim() },
              );
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {authorManualDraft.isPending ? 'Saving draft…' : 'Save structured draft'}
          </Button>
          {authorManualDraft.isError && (
            <Alert severity="error">
              {getErrorMessage(authorManualDraft.error, 'The structured draft was not saved.')}
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">Report document</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {hasVersion
            ? `${(versions.data ?? []).length} version(s) available.`
            : 'No report has been authored for this inspection yet.'}
        </Typography>
        {hasVersion ? (
          <Button
            component={RouterLink}
            to={reportDocumentPath}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Open the report document
          </Button>
        ) : (
          <Button variant="outlined" disabled sx={{ textTransform: 'none' }}>
            Open the report document
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
