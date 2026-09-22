export const workflowSteps = [
  {
    number: '01',
    label: 'Client',
    title: 'Request an inspection',
    description:
      'Choose the asset, describe the inspection need, and submit the request for your organization.',
  },
  {
    number: '02',
    label: 'Service Manager',
    title: 'Prepare the service',
    description:
      'Review the request, prepare a quotation, create the order, and assign field staff.',
  },
  {
    number: '03',
    label: 'Inspector',
    title: 'Review the findings',
    description:
      'Check the evidence and confirm or update candidate findings for the assigned inspection.',
  },
  {
    number: '04',
    label: 'Maintenance Engineer',
    title: 'Track maintenance',
    description:
      'Work on assigned maintenance tasks and update their resolution status.',
  },
] as const;

export const productItems = [
  {
    label: 'Asset records',
    title: 'Keep asset information together',
    description:
      'Store asset details, inspection history, evidence, and current condition in one record.',
    icon: 'asset',
  },
  {
    label: 'Inspection findings',
    title: 'Review candidate findings',
    description:
      'Candidate findings stay separate until an assigned Inspector confirms or updates them.',
    icon: 'finding',
  },
  {
    label: 'Maintenance tasks',
    title: 'Track follow-up work',
    description:
      'Create assigned maintenance work from accepted findings and update its status.',
    icon: 'maintenance',
  },
] as const;

export const roleCards = [
  {
    role: 'Client',
    title: 'Manage your organization’s inspections',
    description:
      'Request inspections, review quotations and reports, and follow maintenance work for your assets.',
    icon: 'client',
  },
  {
    role: 'Service Manager',
    title: 'Coordinate requests and assignments',
    description:
      'Review requests, prepare quotations, assign field staff, and release customer-visible results.',
    icon: 'service',
  },
  {
    role: 'Field teams',
    title: 'Work from assigned tasks',
    description:
      'Inspectors and Maintenance Engineers see the inspections or maintenance tasks assigned to them.',
    icon: 'field',
  },
] as const;
