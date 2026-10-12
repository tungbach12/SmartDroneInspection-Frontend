import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import type {
  InspectionReportVersion,
  ReportOverallCondition,
} from '@/features/inspections/api/inspectionApi';

/**
 * The report's authored sections, laid out as Report 3 §3.7.2 requires them.
 *
 * <p>Sections are headings and fields on one page rather than nested cards: a report reads as a
 * document, and the density is what an author checking fifty field entries needs.
 */
export interface ReportSectionFormProps {
  sections: ReportSectionValues;
  onChange: <K extends keyof ReportSectionValues>(
    field: K,
    value: ReportSectionValues[K],
  ) => void;
  disabled: boolean;
  saving: boolean;
  hasChanges: boolean;
}

export interface ReportSectionValues {
  executiveSummary: string;
  purposeScopeCriteria: string;
  methodEquipmentConditions: string;
  conclusionsRecommendations: string;
  overallCondition: ReportOverallCondition | '';
  omissionDisclosure: string;
}

export const EMPTY_SECTION_VALUES: ReportSectionValues = {
  executiveSummary: '',
  purposeScopeCriteria: '',
  methodEquipmentConditions: '',
  conclusionsRecommendations: '',
  overallCondition: '',
  omissionDisclosure: '',
};

export function sectionValuesFrom(
  version: InspectionReportVersion | null,
): ReportSectionValues {
  const stored = version?.sections;
  return {
    executiveSummary: stored?.executiveSummary ?? '',
    purposeScopeCriteria: stored?.purposeScopeCriteria ?? '',
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

const MAX_SECTION = 10000;
const MAX_DISCLOSURE = 2000;

interface SectionProps {
  title: string;
  accountable: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, accountable, description, children }: SectionProps) {
  return (
    <Box component="section" sx={{ mb: 3.5 }}>
      <Box sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#101828',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
          <Chip
            size="small"
            label={accountable}
            sx={{
              height: 18,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: '#f2f4f7',
              color: '#475467',
            }}
          />
        </Stack>
        <Typography variant="body2" sx={{ color: '#667085', fontSize: '0.8125rem' }}>
          {description}
        </Typography>
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
      helperText={`${value.length} / ${maxLength}`}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
    />
  );
}

export function ReportSectionForm({
  sections,
  onChange,
  disabled,
  saving,
  hasChanges,
}: ReportSectionFormProps) {
  return (
    <Box>
      {hasChanges && (
        <Chip
          size="small"
          color="warning"
          label={saving ? 'Saving sections…' : 'Unsaved section changes'}
          sx={{ mb: 2, height: 22, fontSize: '11px', fontWeight: 700 }}
        />
      )}

      <Section
        title="Executive summary"
        accountable="Inspector · approved by Organization Admin"
        description="Observed condition, the important confirmed findings, priority actions and limitations. Do not state whole-asset safety."
      >
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" sx={{ color: '#475467', fontWeight: 700 }}>
              Overall condition
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
              {CONDITIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  onClick={() =>
                    !disabled &&
                    onChange(
                      'overallCondition',
                      sections.overallCondition === option.value ? '' : option.value,
                    )
                  }
                  color={
                    sections.overallCondition === option.value ? 'primary' : 'default'
                  }
                  variant={
                    sections.overallCondition === option.value ? 'filled' : 'outlined'
                  }
                  disabled={disabled}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Box>
          <SectionField
            label="Executive summary"
            value={sections.executiveSummary}
            onChange={(next) => onChange('executiveSummary', next)}
            disabled={disabled}
            maxLength={MAX_SECTION}
            rows={5}
          />
        </Stack>
      </Section>

      <Section
        title="Purpose, scope and criteria"
        accountable="Inspector · approved by Organization Admin"
        description="The inspection objective, which components were included and excluded, the shot-list coverage and the supplied technical criteria with their versions."
      >
        <SectionField
          label="Purpose, scope and criteria"
          value={sections.purposeScopeCriteria}
          onChange={(next) => onChange('purposeScopeCriteria', next)}
          disabled={disabled}
          maxLength={MAX_SECTION}
          rows={5}
        />
      </Section>

      <Section
        title="Method, equipment and conditions"
        accountable="Inspector"
        description="The method actually used, the drone and payload where recorded, the measurement method where applicable, and the site conditions. Record unavailable data rather than omitting it."
      >
        <SectionField
          label="Method, equipment and conditions"
          value={sections.methodEquipmentConditions}
          onChange={(next) => onChange('methodEquipmentConditions', next)}
          disabled={disabled}
          maxLength={MAX_SECTION}
          rows={5}
        />
      </Section>

      <Section
        title="Limitations and omissions"
        accountable="Inspector"
        description="Anything not observed, not supplied, or not verified. A causal explanation stays a hypothesis unless a method validated it."
      >
        <SectionField
          label="Limitations and omissions"
          value={sections.omissionDisclosure}
          onChange={(next) => onChange('omissionDisclosure', next)}
          disabled={disabled}
          maxLength={MAX_DISCLOSURE}
          rows={3}
        />
      </Section>

      <Section
        title="Conclusions and recommendations"
        accountable="Inspector and qualified reviewer"
        description="The point-in-time assessment limited to the observed scope, the suggested next actions and any specialist or additional checks required."
      >
        <SectionField
          label="Conclusions and recommendations"
          value={sections.conclusionsRecommendations}
          onChange={(next) => onChange('conclusionsRecommendations', next)}
          disabled={disabled}
          maxLength={MAX_SECTION}
          rows={5}
        />
      </Section>
    </Box>
  );
}