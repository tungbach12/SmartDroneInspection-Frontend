import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type {
  InspectionReport,
  ReportOverallCondition,
} from '@/features/inspections/api/inspectionApi';

export interface ReportSectionFormProps {
  sections: ReportSectionValues;
  onChange: <K extends keyof ReportSectionValues>(field: K, value: ReportSectionValues[K]) => void;
  disabled: boolean;
  saving: boolean;
  hasChanges: boolean;
}

export interface ReportSectionValues {
  executiveSummary: string;
  purposeScopeCriteria: string;
  inspectorCoverageAssessment: string;
  methodEquipmentConditions: string;
  conclusionsRecommendations: string;
  overallCondition: ReportOverallCondition | '';
  omissionDisclosure: string;
}

export const EMPTY_SECTION_VALUES: ReportSectionValues = {
  executiveSummary: '',
  purposeScopeCriteria: '',
  inspectorCoverageAssessment: '',
  methodEquipmentConditions: '',
  conclusionsRecommendations: '',
  overallCondition: '',
  omissionDisclosure: '',
};

export function sectionValuesFrom(version: InspectionReport | null): ReportSectionValues {
  const stored = version?.sections;
  return {
    executiveSummary: stored?.executiveSummary ?? '',
    purposeScopeCriteria: stored?.purposeScopeCriteria ?? '',
    inspectorCoverageAssessment: stored?.inspectorCoverageAssessment ?? '',
    methodEquipmentConditions: stored?.methodEquipmentConditions ?? '',
    conclusionsRecommendations: stored?.conclusionsRecommendations ?? '',
    overallCondition: stored?.overallCondition ?? '',
    omissionDisclosure: stored?.omissionDisclosure ?? '',
  };
}

const CONDITIONS: { value: ReportOverallCondition; label: string }[] = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'CRITICAL', label: 'Critical' },
];
const MAX_SECTION = 4_000;
const MAX_DISCLOSURE = 2_000;

export type AuthoredReportSection =
  | 'executiveSummary'
  | 'methodEquipmentConditions'
  | 'omissionDisclosure'
  | 'conclusionsRecommendations';

interface SectionDetails {
  title: string;
  accountable: string;
  description: string;
  maxLength: number;
  rows: number;
}

const SECTION_DETAILS: Record<AuthoredReportSection, SectionDetails> = {
  executiveSummary: {
    title: 'Executive summary',
    accountable: 'Inspector · approved with report',
    description: 'Observed condition, important confirmed findings, priority actions and overall condition. Do not state whole-asset safety.',
    maxLength: MAX_SECTION,
    rows: 5,
  },
  methodEquipmentConditions: {
    title: 'Method, equipment and conditions',
    accountable: 'Inspector',
    description: 'Record the method actually used, equipment and site conditions. Planned dates or assigned equipment are not evidence of field activity.',
    maxLength: MAX_SECTION,
    rows: 4,
  },
  omissionDisclosure: {
    title: 'Limitations and omissions',
    accountable: 'Inspector',
    description: 'Anything not observed, not supplied or not verified. In the delivered report this disclosure appears within Executive summary.',
    maxLength: MAX_DISCLOSURE,
    rows: 3,
  },
  conclusionsRecommendations: {
    title: 'Conclusions and recommendations',
    accountable: 'Inspector · approved with report',
    description: 'Point-in-time conclusions within observed scope, next actions and specialist checks required.',
    maxLength: MAX_SECTION,
    rows: 4,
  },
};

function Section({
  title,
  accountable,
  description,
  children,
}: SectionDetails & { children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Box sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
          <Chip size="small" label={accountable} sx={{ height: 18, fontSize: '10px', fontWeight: 700 }} />
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>{description}</Typography>
      </Box>
      {children}
    </Box>
  );
}

function SectionField({
  label,
  value,
  onChange,
  disabled,
  maxLength,
  rows,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
  maxLength: number;
  rows: number;
}) {
  const showCount = value.length >= Math.floor(maxLength * 0.8);
  return (
    <TextField
      fullWidth
      multiline
      minRows={rows}
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { maxLength } }}
      helperText={showCount ? `${value.length} / ${maxLength}` : undefined}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
    />
  );
}

export function ReportSectionField({
  section,
  sections,
  onChange,
  disabled,
}: Pick<ReportSectionFormProps, 'sections' | 'onChange' | 'disabled'> & {
  section: AuthoredReportSection;
}) {
  const { t } = useLocale();
  const details = SECTION_DETAILS[section];
  if (section === 'executiveSummary') {
    return (
      <Section {...details}>
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{t('Overall condition')}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
              {CONDITIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() => !disabled && onChange('overallCondition', sections.overallCondition === option.value ? '' : option.value)}
                  color={sections.overallCondition === option.value ? 'primary' : 'default'}
                  variant={sections.overallCondition === option.value ? 'filled' : 'outlined'}
                  disabled={disabled}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>
          <SectionField label={t('Executive summary text')} value={sections.executiveSummary} onChange={(value) => onChange('executiveSummary', value)} disabled={disabled} maxLength={details.maxLength} rows={details.rows} />
        </Stack>
      </Section>
    );
  }

  const value = sections[section];
  return (
    <Section {...details}>
      <SectionField
        label={`${details.title} text`}
        value={value}
        onChange={(next) => onChange(section, next)}
        disabled={disabled}
        maxLength={details.maxLength}
        rows={details.rows}
      />
    </Section>
  );
}

export function ReportSectionForm(props: ReportSectionFormProps) {
  return (
    <Stack spacing={2}>
      {props.hasChanges && (
        <Chip
          size="small"
          color="warning"
          label={props.saving ? 'Saving sections…' : 'Unsaved section changes'}
          sx={{ alignSelf: 'flex-start', height: 22, fontSize: '11px', fontWeight: 700 }}
        />
      )}
      <ReportSectionField section="executiveSummary" {...props} />
      <ReportSectionField section="methodEquipmentConditions" {...props} />
      <ReportSectionField section="omissionDisclosure" {...props} />
      <ReportSectionField section="conclusionsRecommendations" {...props} />
    </Stack>
  );
}
