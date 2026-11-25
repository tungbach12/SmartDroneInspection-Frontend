import { api } from '@/shared/api/client';

export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  subtext: string;
  iconType: string;
}

export interface PerformanceChartData {
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
}

export interface RadialSubMetric {
  label: string;
  value: string;
  percentage: number;
}

export interface RadialGaugeData {
  title: string;
  subtitle: string;
  targetValue: string;
  targetLabel: string;
  percentage: number;
  subMetrics: RadialSubMetric[];
}

export interface StackedBarChannel {
  name: string;
  color: string;
  data: number[];
}

export interface StackedBarChartData {
  title: string;
  categories: string[];
  channels: StackedBarChannel[];
  maxStack: number;
}

export interface QueueTableRow {
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
  status: 'positive' | 'warning' | 'negative' | 'neutral';
  link?: string;
}

export interface QueueTableData {
  title: string;
  subtitle: string;
  headers: string[];
  rows: QueueTableRow[];
  viewAllLink?: string;
  viewAllText?: string;
}

export interface PipelineStage {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardActionItem {
  category: string;
  title: string;
  code: string;
  subtitle: string;
  status: string;
  badgeTone: 'positive' | 'warning' | 'negative' | 'neutral';
  link: string;
}

export interface DashboardScheduleSlot {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  status: string;
  link: string;
}

export interface DashboardInspectorWorkload {
  inspectorName: string;
  activeMissions: number;
  averageRating: number;
  ratingCount: number;
  licenseClass: string;
}

export interface DashboardServiceHealth {
  name: string;
  status: string;
  detail: string;
}

export interface DashboardAnalytics {
  summaryCards: DashboardMetric[];
  performanceChart: PerformanceChartData;
  radialGauge: RadialGaugeData;
  stackedBarChart: StackedBarChartData;
  queueTable: QueueTableData;
  pipelineStages?: PipelineStage[];
  secondaryPerformanceChart?: PerformanceChartData | null;
  actionItems?: DashboardActionItem[];
  upcomingSchedule?: DashboardScheduleSlot[];
  inspectorWorkloads?: DashboardInspectorWorkload[];
  serviceHealth?: DashboardServiceHealth[];
}

export const dashboardApi = {
  getAnalytics: async (role?: string): Promise<DashboardAnalytics> => {
    const { data } = await api.get<DashboardAnalytics>('/dashboard/analytics', {
      ...(role ? { params: { role } } : {}),
    });
    return data;
  },
};
