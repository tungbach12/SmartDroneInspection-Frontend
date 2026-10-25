import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  useAuthorManualDraft,
  useInspectionWorkflowState,
  useGenerateReportDraft,
  useReportVersions,
} from '../hooks/useInspections';
import { DraftProgressTracker } from '../components/DraftProgressTracker';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { useLocale } from '@/shared/i18n/LocaleProvider';

/**
 * MF3-07 report draft, one stage of the inspection workspace.
 *
 * This step only creates the version; section authoring, review, return/approve, and
 * publication stay on the report document page. The single link that opens the document is
 * enabled only once a version exists.
 */
export default function InspectionDraftPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));

  const workflow = useInspectionWorkflowState(inspectionId);
  const versions = useReportVersions(inspectionId);
  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);

  const findingsConfirmed = Boolean(workflow.data?.findingsSnapshotHash) && [
    'REPORT_DRAFT',
    'REPORT_PUBLISHED',
    'REPAIR_PENDING',
    'COMPLETED',
  ].includes(workflow.data?.status ?? '');
  const isPublished = ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
    workflow.data?.status ?? '',
  );
  const hasVersion = (versions.data ?? []).length > 0;
  const reportDocumentPath = `${getSectionPath(portal, 'reports')}/${inspectionId}`;

  return (
    <Stack spacing={2}>
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          Organization Manager review actions are available on the Review report tab. This stage is
          retained for read-only status and version history.
        </Alert>
      )}

      {isInspector && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {t('Create report draft')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          MF3-07 proposes a value for each authored report section from the authorized sources.
          This step only creates the version; you verify and edit the sections on the report
          document.
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {isPublished ? (
            <Alert severity="success">{t('The report has been published. This version is immutable.')}</Alert>
          ) : !findingsConfirmed ? (
            <Alert
              severity="info"
              action={
                <Button component={RouterLink} to="../findings" color="inherit" size="small">
                  {t('Go to Findings')}
                </Button>
              }
            >
              {t('Confirm the reviewed findings before choosing how to create the report. This step does not create a report automatically.')}
            </Alert>
          ) : null}
          <Button
            variant="contained"
            disabled={!isInspector || isPublished || createDraft.isPending || !findingsConfirmed}
            startIcon={
              createDraft.isPending ? <AiMotionFigure name="draftBurst" size={22} /> : undefined
            }
            onClick={() => createDraft.mutate()}
            sx={{ alignSelf: 'flex-start' }}
          >
            {createDraft.isPending ? 'Compiling report…' : 'Generate report draft'}
          </Button>
          {createDraft.isPending && <DraftProgressTracker />}
          {createDraft.isSuccess && (
            <Alert severity="success">
              {t('Report draft created successfully! You can now view and edit the document below.')}
            </Alert>
          )}

          {createDraft.isError && (
            <Alert severity="warning">
              {getErrorMessage(
                createDraft.error,
                'The report draft was not created.',
              )}
            </Alert>
          )}
          <Divider />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('Start a draft without the model')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Creates an empty structured report version without calling the drafting model. Author
            each report section once on the report document; the choice of manual drafting is kept as
            provenance and is not repeated as an inspection limitation.
          </Typography>
          <Button
            variant="outlined"
            disabled={!isInspector || isPublished || !findingsConfirmed || authorManualDraft.isPending}
            startIcon={authorManualDraft.isPending ? <AiMotionFigure name="draftRibbon" size={20} /> : undefined}
            onClick={() => {
              authorManualDraft.mutate({});
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {authorManualDraft.isPending ? 'Creating draft…' : 'Create manual draft'}
          </Button>
          {authorManualDraft.isError && (
            <Alert severity="error">
              {getErrorMessage(authorManualDraft.error, 'The structured draft was not saved.')}
            </Alert>
          )}
        </Stack>
      </Paper>}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">{isInspector ? 'Report document' : 'Report versions'}</Typography>
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
            {t('Open the report document')}
          </Button>
        ) : (
          <Button variant="outlined" disabled sx={{ textTransform: 'none' }}>
            {t('Open the report document')}
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
