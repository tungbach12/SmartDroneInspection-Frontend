export type RoleId =
  | 'ORG_ADMIN'
  | 'ADMIN'
  | 'INSPECTOR'
  | 'MAINTENANCE_ENGINEER';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  subtext: string;
  iconType: 'building' | 'check-circle' | 'alert' | 'wallet' | 'user' | 'lightning' | 'plane' | 'wrench' | 'clock' | 'shield';
}

export interface DashboardRoleConfig {
  id: RoleId;
  name: string;
  badge: string;
  report3RoleName: string;
  roleDescription: string;
  overviewTitle: string;
  overviewSubtitle: string;
  stats: DashboardMetric[];
  performanceChart: {
    headerLabel: string;
    headlineValue: string;
    trendBadge: string;
    series1Name: string;
    series1Color: string;
    series1Data: number[];
    series2Name: string;
    series2Color: string;
    series2Data: number[];
    months: string[];
    yTicks: string[];
    maxVal: number;
  };
  radialGauge: {
    title: string;
    subtitle: string;
    targetValue: string;
    targetLabel: string;
    percentage: number;
    subMetrics: Array<{
      label: string;
      value: string;
      percentage: number;
    }>;
  };
  stackedBarChart: {
    title: string;
    categories: string[];
    channels: Array<{
      name: string;
      color: string;
      data: number[];
    }>;
    maxStack: number;
  };
  table: {
    title: string;
    subtitle: string;
    headers: string[];
    rows: Array<{
      col1: string;
      col2: string;
      col3: string;
      col4: string;
      col5: string;
      status: 'positive' | 'warning' | 'negative' | 'neutral';
      link?: string;
    }>;
    viewAllLink?: string;
    viewAllText?: string;
  };
}

export const REPORT3_ROLE_DASHBOARDS: Record<RoleId, DashboardRoleConfig> = {
  // 1. ORG_ADMIN (Organization Admin) - Report 3 Customer Enterprise Authority
  ORG_ADMIN: {
    id: 'ORG_ADMIN',
    name: 'Organization Admin',
    badge: 'Enterprise Authority',
    report3RoleName: 'ORG_ADMIN',
    roleDescription: 'Customer enterprise authority: asset registration (MF1), readiness authorization (MF2), report approvals (MF3), and repair budget reconciliation (MF4).',
    overviewTitle: 'Asset overview',
    overviewSubtitle: 'Recent structures, fleet readiness, and workflow approvals registered to your organization.',
    stats: [
      {
        id: 'registered_assets',
        label: 'Registered assets',
        value: '12',
        change: '+100% paired',
        positive: true,
        subtext: 'in your organization',
        iconType: 'building',
      },
      {
        id: 'active_page',
        label: 'Active on this page',
        value: '1',
        change: 'Operational',
        positive: true,
        subtext: 'of 2 shown',
        iconType: 'check-circle',
      },
      {
        id: 'awaiting_review',
        label: 'Awaiting review',
        value: '1',
        change: 'Action due',
        positive: false,
        subtext: 'of 2 shown',
        iconType: 'alert',
      },
      {
        id: 'inspection_reports',
        label: 'Inspection reports',
        value: '24',
        change: '+18.5% YoY',
        positive: true,
        subtext: 'open Reports for available versions',
        iconType: 'shield',
      },
    ],
    performanceChart: {
      headerLabel: 'REPAIR COST VARIANCE (MF4)',
      headlineValue: '$64,654',
      trendBadge: '-5.6% Under Budget',
      series1Name: 'Authorized Budget (B)',
      series1Color: '#3758F9',
      series1Data: [48000, 75000, 52000, 55000, 78000, 42000, 95000, 72000, 62000, 74000, 60000, 82000],
      series2Name: 'Incurred Cost (A)',
      series2Color: '#F97316',
      series2Data: [28000, 40000, 36000, 30000, 28000, 26000, 24000, 30000, 22000, 30000, 22000, 28000],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      yTicks: ['100k', '80k', '60k', '40k', '20k', '0'],
      maxVal: 100000,
    },
    radialGauge: {
      title: 'Estimated Revenue & Savings',
      subtitle: 'Target inspection savings set for this quarter',
      targetValue: '$90k',
      targetLabel: 'Quarter Goals',
      percentage: 82,
      subMetrics: [
        { label: 'Preventative Maintenance Yield', value: '$54,200', percentage: 85 },
        { label: 'Regulatory Penalty Avoidance', value: '$35,800', percentage: 78 },
      ],
    },
    stackedBarChart: {
      title: 'Acquisition Channels & Finding Sources',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      channels: [
        { name: 'Direct Telemetry (Edge AI)', color: '#1E3A8A', data: [22, 28, 25, 34, 30, 38, 35, 30] },
        { name: 'Inspector Photogrammetry', color: '#3758F9', data: [35, 42, 38, 48, 45, 52, 48, 44] },
        { name: 'Thermal Radiometric Scan', color: '#60A5FA', data: [18, 24, 20, 26, 22, 28, 25, 22] },
        { name: 'LiDAR Structural Profile', color: '#C7D2FE', data: [14, 18, 16, 20, 18, 22, 19, 16] },
      ],
      maxStack: 140,
    },
    table: {
      title: 'Asset overview',
      subtitle: 'Recent structures registered to your organization.',
      headers: ['ASSET', 'LOCATION', 'PAIR / PILOT', 'STATUS', 'ACTION'],
      rows: [
        { col1: 'North Bridge (BR-014)', col2: 'River district', col3: 'T. Halloway + DJI M350', col4: 'Active', col5: '3.2%', status: 'positive', link: '/client/assets' },
        { col1: 'Harbor building (BL-032)', col2: 'Pier 4', col3: 'M. Chen + Skydio X10', col4: 'Pending Review', col5: '1.8%', status: 'warning', link: '/client/assets' },
        { col1: 'West Viaduct (BR-089)', col2: 'Highway 10', col3: 'R. Davis + Matrice 30T', col4: 'Active', col5: '4.5%', status: 'positive', link: '/client/assets' },
        { col1: 'Central Substation (PS-012)', col2: 'North Grid', col3: 'K. Patel + Freefly Astro', col4: 'Maintenance Due', col5: '0.9%', status: 'negative', link: '/client/assets' },
      ],
      viewAllLink: '/client/assets',
      viewAllText: 'View all assets',
    },
  },

  // 2. ADMIN (Platform Admin) - Report 3 Platform SaaS Governance
  ADMIN: {
    id: 'ADMIN',
    name: 'Platform Administrator',
    badge: 'Platform SaaS Governance',
    report3RoleName: 'ADMIN',
    roleDescription: 'Platform-wide multi-tenant governance, subscription life-cycles (1, 6, 12 months), MinIO vault storage, and system availability.',
    overviewTitle: 'Platform overview',
    overviewSubtitle: 'Multi-tenant organization accounts, subscription health, and MinIO storage infrastructure.',
    stats: [
      {
        id: 'organizations',
        label: 'Organizations',
        value: '142 Orgs',
        change: '+14.2% MoM',
        positive: true,
        subtext: 'summary not available',
        iconType: 'building',
      },
      {
        id: 'asset_records',
        label: 'Asset records',
        value: '3,840 Assets',
        change: '+8.5% Growth',
        positive: true,
        subtext: 'summary not available',
        iconType: 'shield',
      },
      {
        id: 'inspection_records',
        label: 'Inspection records',
        value: '12,980',
        change: '+22.4% Volume',
        positive: true,
        subtext: 'summary not available',
        iconType: 'plane',
      },
      {
        id: 'report_versions',
        label: 'Report versions',
        value: '8,421',
        change: '+18.1% Active',
        positive: true,
        subtext: 'summary not available',
        iconType: 'check-circle',
      },
    ],
    performanceChart: {
      headerLabel: 'STORAGE INGESTION & AI COMPUTE',
      headlineValue: '42.8 TB',
      trendBadge: '+24% Ingested',
      series1Name: 'Telemetry & Evidence Storage (TB)',
      series1Color: '#3758F9',
      series1Data: [18, 22, 26, 25, 29, 32, 36, 38, 39, 41, 41.5, 42.8],
      series2Name: 'AI Model Inference Pipeline (k)',
      series2Color: '#F97316',
      series2Data: [8, 12, 14, 11, 15, 18, 22, 20, 24, 26, 25, 28],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      yTicks: ['50 TB', '40 TB', '30 TB', '20 TB', '10 TB', '0 TB'],
      maxVal: 50,
    },
    radialGauge: {
      title: 'Platform Availability SLA',
      subtitle: '99.98% availability commitment across customer clusters',
      targetValue: '99.98%',
      targetLabel: 'Uptime Achieved',
      percentage: 99.98,
      subMetrics: [
        { label: 'MinIO Distributed Object Store', value: '99.99% Uptime', percentage: 99.99 },
        { label: 'PostgreSQL Relational DB Cluster', value: '99.98% Uptime', percentage: 99.98 },
      ],
    },
    stackedBarChart: {
      title: 'Tenant Subscription Tiers & Workspaces',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      channels: [
        { name: 'Enterprise Annual (12 mo)', color: '#1E3A8A', data: [32, 36, 38, 42, 45, 48, 52, 56] },
        { name: 'Corporate Bi-Annual (6 mo)', color: '#3758F9', data: [22, 25, 28, 30, 32, 34, 38, 40] },
        { name: 'Standard Monthly (1 mo)', color: '#60A5FA', data: [18, 20, 19, 22, 24, 26, 25, 28] },
        { name: 'Pilot Evaluation (14 d)', color: '#C7D2FE', data: [10, 12, 14, 11, 13, 15, 12, 14] },
      ],
      maxStack: 140,
    },
    table: {
      title: 'Platform overview',
      subtitle: 'Choose a workspace to review its records and activity.',
      headers: ['ORGANIZATION', 'SUBSCRIPTION', 'ASSETS', 'HEALTH', 'CONVERSION'],
      rows: [
        { col1: 'Nordic Energy Infrastructure', col2: 'Enterprise 12-mo', col3: '348 Assets', col4: 'Healthy (99.9%)', col5: '3.2%', status: 'positive', link: '/admin/asset-catalog' },
        { col1: 'Metro Transit Department', col2: 'Corporate 6-mo', col3: '112 Assets', col4: 'Healthy (99.8%)', col5: '2.8%', status: 'positive', link: '/admin/asset-catalog' },
        { col1: 'Vanguard Civil Engineering', col2: 'Enterprise 12-mo', col3: '240 Assets', col4: 'Healthy (99.9%)', col5: '3.5%', status: 'positive', link: '/admin/asset-catalog' },
        { col1: 'Apex Renewable Power', col2: 'Monthly 1-mo', col3: '64 Assets', col4: 'Renewal Due', col5: '1.2%', status: 'warning', link: '/admin/asset-catalog' },
      ],
      viewAllLink: '/admin/asset-catalog',
      viewAllText: 'View platform catalog',
    },
  },

  // 3. INSPECTOR (Remote Pilot & Lead Inspector) - Report 3 MF2 & MF3
  INSPECTOR: {
    id: 'INSPECTOR',
    name: 'Lead Drone Inspector',
    badge: 'Remote Pilot & Flight Operations',
    report3RoleName: 'INSPECTOR',
    roleDescription: 'Field drone operator & evidence author: executes pre-flight checklists (MF2), captures certified telemetry, and verifies AI defect candidates (MF3).',
    overviewTitle: 'Inspection workload',
    overviewSubtitle: 'Open inspections, evidence sets, and reports assigned to you.',
    stats: [
      {
        id: 'assignments',
        label: 'Assignments',
        value: '18 Missions',
        change: '4 in Progress',
        positive: true,
        subtext: 'open Inspections to view assigned work',
        iconType: 'plane',
      },
      {
        id: 'evidence_sets',
        label: 'Evidence sets',
        value: '1,420 Items',
        change: '100% SHA-256',
        positive: true,
        subtext: 'available inside each inspection',
        iconType: 'check-circle',
      },
      {
        id: 'reports',
        label: 'Reports',
        value: '9 Drafts',
        change: '3 Awaiting Verification',
        positive: false,
        subtext: 'open Reports for a selected inspection',
        iconType: 'shield',
      },
      {
        id: 'deadlines',
        label: 'Deadlines',
        value: '48 Hours',
        change: 'On Schedule',
        positive: true,
        subtext: 'available on assigned work',
        iconType: 'clock',
      },
    ],
    performanceChart: {
      headerLabel: 'INSPECTION FLIGHT COVERAGE (MF2/MF3)',
      headlineValue: '128 Hours',
      trendBadge: '+14% Flight Time',
      series1Name: 'Flight Duration Logged (Hours)',
      series1Color: '#3758F9',
      series1Data: [12, 18, 15, 22, 20, 26, 24, 28, 25, 30, 28, 32],
      series2Name: 'Verified AI Defect Candidates',
      series2Color: '#F97316',
      series2Data: [6, 10, 8, 14, 12, 16, 15, 18, 16, 20, 18, 22],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      yTicks: ['35 hrs', '28 hrs', '21 hrs', '14 hrs', '7 hrs', '0 hrs'],
      maxVal: 35,
    },
    radialGauge: {
      title: 'Checklist & Airspace Compliance',
      subtitle: 'FAA Part 107 & MF2 safety protocol adherence',
      targetValue: '98%',
      targetLabel: 'Flight Ready',
      percentage: 98,
      subMetrics: [
        { label: 'Pre-Flight Sensor Calibration', value: '18 / 18 Complete', percentage: 100 },
        { label: 'Airspace Authorization Clearance', value: '17 / 18 Approved', percentage: 94 },
      ],
    },
    stackedBarChart: {
      title: 'Assigned Mission Status by Asset Type',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      channels: [
        { name: 'Wind Turbines (Blades & Nacelles)', color: '#1E3A8A', data: [15, 18, 16, 22, 20, 25, 22, 20] },
        { name: 'High-Voltage Transmission Pylons', color: '#3758F9', data: [20, 24, 22, 28, 26, 32, 28, 26] },
        { name: 'Bridges & Civil Infrastructure', color: '#60A5FA', data: [14, 16, 15, 20, 18, 22, 19, 18] },
        { name: 'Photovoltaic Solar Arrays', color: '#C7D2FE', data: [10, 12, 11, 15, 14, 18, 15, 14] },
      ],
      maxStack: 100,
    },
    table: {
      title: 'Inspection workload',
      subtitle: 'Open inspections, evidence, and reports assigned to you.',
      headers: ['INSPECTION CODE', 'ASSET TARGET', 'MISSION PROFILE', 'STATUS', 'CONVERSION'],
      rows: [
        { col1: 'INSP-2026-089', col2: 'North Bridge (BR-014)', col3: 'Deck & Pylon Orthomosaic', col4: 'In Progress', col5: '3.2%', status: 'positive', link: '/operations/inspections' },
        { col1: 'INSP-2026-092', col2: 'Harbor building (BL-032)', col3: 'Facade Thermal Radiometry', col4: 'Evidence Upload', col5: '2.4%', status: 'warning', link: '/operations/inspections' },
        { col1: 'INSP-2026-095', col2: 'Wind Turbine WTG-04', col3: 'Blade Leading Edge Inspection', col4: 'AI Verification', col5: '3.8%', status: 'positive', link: '/operations/inspections' },
        { col1: 'INSP-2026-098', col2: 'Substation Transformer', col3: 'Radiometric Hot-Spot Scan', col4: 'Ready for Review', col5: '1.5%', status: 'neutral', link: '/operations/inspections' },
      ],
      viewAllLink: '/operations/inspections',
      viewAllText: 'View assigned inspections',
    },
  },

  // 4. MAINTENANCE_ENGINEER (Maintenance Repair Lead) - Report 3 MF4
  MAINTENANCE_ENGINEER: {
    id: 'MAINTENANCE_ENGINEER',
    name: 'Maintenance Engineer',
    badge: 'Repair Work Order Lead',
    report3RoleName: 'MAINTENANCE_ENGINEER',
    roleDescription: 'Repair author & execution engineer: converts verified defect findings into itemized work orders (MF4), repairs defects, and reconciles costs.',
    overviewTitle: 'Maintenance workload',
    overviewSubtitle: 'Work and follow-up assigned to your maintenance role.',
    stats: [
      {
        id: 'maintenance_tasks',
        label: 'Maintenance tasks',
        value: '14 Orders',
        change: 'Assigned repair work',
        positive: true,
        subtext: 'open Maintenance to view assigned work',
        iconType: 'wrench',
      },
      {
        id: 'due_soon',
        label: 'Due soon',
        value: '3 Urgent',
        change: '< 48 Hours',
        positive: false,
        subtext: 'available on assigned tasks',
        iconType: 'clock',
      },
      {
        id: 'source_findings',
        label: 'Source findings',
        value: '28 Defects',
        change: 'MF3 Certified',
        positive: true,
        subtext: 'available on assigned tasks',
        iconType: 'shield',
      },
      {
        id: 'completed',
        label: 'Completed',
        value: '42 Orders',
        change: '+16.5% Closed',
        positive: true,
        subtext: 'available on assigned tasks',
        iconType: 'check-circle',
      },
    ],
    performanceChart: {
      headerLabel: 'REPAIR TURNAROUND TIME & VARIANCE (MF4)',
      headlineValue: '3.4 Days',
      trendBadge: '-24% MTTR',
      series1Name: 'Authorized Estimate ($k)',
      series1Color: '#3758F9',
      series1Data: [24, 32, 28, 38, 36, 44, 40, 48, 45, 52, 48, 55],
      series2Name: 'Actual Reconciled Cost ($k)',
      series2Color: '#F97316',
      series2Data: [22, 29, 26, 35, 33, 40, 38, 44, 42, 48, 45, 51],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      yTicks: ['60k', '48k', '36k', '24k', '12k', '0'],
      maxVal: 60,
    },
    radialGauge: {
      title: 'First-Time Repair Success Rate',
      subtitle: 'Post-repair drone verification passing first QA check',
      targetValue: '94%',
      targetLabel: 'QA Passed',
      percentage: 94,
      subMetrics: [
        { label: 'Surface Patch Mechanical Integrity', value: '26 / 28 Passed', percentage: 93 },
        { label: 'Secondary Drone Telemetry Verification', value: '27 / 28 Verified', percentage: 96 },
      ],
    },
    stackedBarChart: {
      title: 'Defect Remediation by Asset Class (MF4)',
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
      channels: [
        { name: 'Structural Crack Epoxy Injection', color: '#1E3A8A', data: [12, 15, 14, 18, 16, 20, 18, 16] },
        { name: 'Corrosion Sandblasting & Coating', color: '#3758F9', data: [18, 22, 20, 26, 24, 30, 26, 24] },
        { name: 'Electrical Terminal Replacement', color: '#60A5FA', data: [14, 16, 15, 20, 18, 22, 20, 18] },
        { name: 'Mechanical Gasket Resealing', color: '#C7D2FE', data: [8, 10, 9, 12, 11, 14, 12, 10] },
      ],
      maxStack: 90,
    },
    table: {
      title: 'Maintenance workload',
      subtitle: 'Work and follow-up assigned to your maintenance role.',
      headers: ['WORK ORDER', 'DEFECT FINDING', 'PARTS / LABOR', 'STATUS', 'CONVERSION'],
      rows: [
        { col1: 'WO-2026-041', col2: 'Blade Delamination (WTG-14)', col3: 'Aero Epoxy + 8 hrs', col4: 'Active Repair', col5: '3.2%', status: 'warning', link: '/operations/maintenance' },
        { col1: 'WO-2026-039', col2: 'Corrosion Spall (BR-014)', col3: 'Zinc Primer + 12 hrs', col4: 'Reconciled', col5: '4.1%', status: 'positive', link: '/operations/maintenance' },
        { col1: 'WO-2026-044', col2: 'Hot-Spot Terminal (PS-012)', col3: 'Bushing Kit + 4 hrs', col4: 'Pending Parts', col5: '1.2%', status: 'negative', link: '/operations/maintenance' },
        { col1: 'WO-2026-046', col2: 'Cable Tray Anchor Flaw', col3: 'Stainless Fasteners + 3 hrs', col4: 'Completed', col5: '3.5%', status: 'positive', link: '/operations/maintenance' },
      ],
      viewAllLink: '/operations/maintenance',
      viewAllText: 'View assigned maintenance',
    },
  },
};
