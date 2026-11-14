export const workflowSteps = [
  {
    number: '01',
    label: 'Client',
    title: 'Request the inspection',
    description:
      'A site owner describes the asset, scope, cadence, and expected evidence before any flight happens.',
  },
  {
    number: '02',
    label: 'Service Manager',
    title: 'Quote and prepare',
    description:
      'The provider scopes the work, prepares the quotation, creates the order, and assigns the team.',
  },
  {
    number: '03',
    label: 'Inspector',
    title: 'Plan the mission',
    description:
      'GSD, AGL, overlap, airspace, permits, and shot-items are captured before approval to fly.',
  },
  {
    number: '04',
    label: 'Inspector',
    title: 'Fly and capture',
    description:
      'Field work is uploaded with source imagery, checksum, asset context, and an append-only trail.',
  },
  {
    number: '05',
    label: 'Service Manager',
    title: 'Author verify and release',
    description:
      'AI candidates stay separate until human review; only a completeness-gated release becomes client-visible.',
  },
  {
    number: '06',
    label: 'Customer',
    title: 'Accept the report',
    description:
      'Review the published inspection report, confirm acceptance, and settle the service fee.',
  },
] as const;

export const productItems = [
  {
    label: 'Mission records',
    title: 'Keep every flight traceable',
    description:
      'Store equipment, GSD/AGL, overlap, airspace check, permit reference, and shot-list status with the job.',
    icon: 'asset',
  },
  {
    label: 'Human-reviewed AI',
    title: 'Let AI draft, not decide',
    description:
      'YOLO/LLM candidates remain candidates until an assigned author reviews, edits, and signs the record.',
    icon: 'finding',
  },
  {
    label: 'Published reports',
    title: 'Make every finding traceable',
    description:
      'Keep confirmed findings, evidence, and the signed inspection report together for review.',
    icon: 'finding',
  },
] as const;

export const roleCards = [
  {
    role: 'Client',
    title: 'Request and accept outcomes',
    description:
      'Create the inspection request, approve the quotation, review the immutable report, and request revisions when needed.',
    icon: 'client',
  },
  {
    role: 'Service Manager',
    title: 'Run the provider workflow',
    description:
      'Coordinate quotation, order, inspector assignment, report release, and customer-visible closure.',
    icon: 'service',
  },
  {
    role: 'Inspector',
    title: 'Plan and fly the mission',
    description:
      'Set GSD/AGL, overlap, airspace clearance, permits, and shot-items; capture evidence with checksum on site.',
    icon: 'field',
  },
] as const;
