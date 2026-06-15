import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'thermal_engineer' | 'safety_engineer' | 'chief_engineer' | 'reviewer';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  department: string;
  email: string;
  avatar?: string;
}

export type SimulationStatus =
  | 'pending_validation'
  | 'mesh_generation'
  | 'thermal_calculation'
  | 'accident_analysis'
  | 'completed'
  | 'exception_rollback'
  | 'paused';

export interface Simulation {
  id: string;
  name: string;
  status: SimulationStatus;
  progress: number;
  configurationHash: string;
  configurationName: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  gridType: string;
  turbulenceModel: string;
  boilingModel: string;
  inletTemp: number;
  inletPressure: number;
  inletFlowRate: number;
  channelCount: number;
}

export interface ChannelTemperature {
  channelId: string;
  pelletCenterTemp: number;
  claddingSurfaceTemp: number;
  coolantTemp: number;
  chfRatio: number;
  heatFlux: number;
  timestamp: number;
}

export type WarningType = 'temperature_exceed' | 'chf_below_threshold' | 'convergence_failure';
export type WarningSeverity = 'critical' | 'warning' | 'info';
export type WarningStatus = 'pending' | 'reviewed' | 'resolved';

export interface Warning {
  id: string;
  simulationId: string;
  simulationName: string;
  type: WarningType;
  severity: WarningSeverity;
  channelId?: string;
  actualValue: number;
  limitValue: number;
  status: WarningStatus;
  triggeredAt: string;
  reviewedBy?: string;
  reviewComment?: string;
  resolvedAt?: string;
}

export type AdjustmentType = 'bypass_flow' | 'control_rod_depth';

export interface AdjustmentLog {
  id: string;
  simulationId: string;
  type: AdjustmentType;
  beforeValue: number;
  afterValue: number;
  operator: string;
  timestamp: string;
  comment: string;
}

export type ApprovalLevel = 'engineer_verify' | 'chief_confirm';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalCheckResult = 'pass' | 'fail' | 'na';

export interface ApprovalCheckItem {
  name: string;
  description: string;
  result: ApprovalCheckResult;
  comment?: string;
}

export interface ApprovalItem {
  id: string;
  simulationId: string;
  simulationName: string;
  level: ApprovalLevel;
  status: ApprovalStatus;
  assignee: string;
  submitter: string;
  items: ApprovalCheckItem[];
  overallComment: string;
  createdAt: string;
  signedBy?: string;
  signedAt?: string;
  signComment?: string;
}

export type ReportSectionType = 'text' | 'chart' | 'image' | 'table';

export interface ReportSection {
  title: string;
  type: ReportSectionType;
  content: unknown;
}

export interface SafetyMargins {
  temperatureMargin: number;
  chfMargin: number;
  flowMargin: number;
  pressureMargin: number;
  powerMargin: number;
}

export type ReportType = 'steady_state' | 'accident_analysis' | 'sensitivity' | 'benchmark';
export type SafetyRating = 'S' | 'A' | 'B' | 'C' | 'D';
export type ApprovalProgressStatus = 'not_started' | 'level1_pending' | 'level1_approved' | 'level2_pending' | 'level2_approved' | 'rejected';

export interface PushNotification {
  id: string;
  department: string;
  pushedAt: string;
  status: 'pending' | 'acknowledged';
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface SimulationReport {
  id: string;
  simulationId: string;
  simulationName: string;
  configurationName: string;
  reportType: ReportType;
  sections: ReportSection[];
  safetyMargins: SafetyMargins;
  safetyRating: SafetyRating;
  generatedAt: string;
  generatedBy: string;
  generationDuration: number;
  approvalStatus: ApprovalProgressStatus;
  engineerVerify?: {
    status: 'pending' | 'approved' | 'rejected';
    reviewer?: string;
    reviewedAt?: string;
    comment?: string;
  };
  chiefConfirm?: {
    status: 'pending' | 'approved' | 'rejected';
    reviewer?: string;
    reviewedAt?: string;
    comment?: string;
  };
  approvedBy: string[];
  pushNotifications: PushNotification[];
  isDistributed: boolean;
  distributedAt?: string;
  recipientDepartments?: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskStatus = 'active' | 'suspended';

export interface RiskHistoryItem {
  simulationId: string;
  exceededAt: string;
  maxTemp: number;
  minChf: number;
}

export interface ChiefNotification {
  id: string;
  notifiedAt: string;
  notifiedTo: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

export interface ConfigurationRisk {
  id: string;
  name: string;
  hash: string;
  exceedCount: number;
  riskLevel: RiskLevel;
  status: RiskStatus;
  lastExceedAt: string;
  history: RiskHistoryItem[];
  suspendReason?: string;
  suspendedAt?: string;
  chiefNotifications: ChiefNotification[];
}

export interface DailyStatistics {
  date: string;
  totalSimulations: number;
  completedSimulations: number;
  completionRate: number;
  avgAccidentAnalysisTime: number;
  minChfDistribution: number[];
  safetyMargins: SafetyMargins;
}

export type RecommendationType = 'adjustment' | 'configuration' | 'model';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: RecommendationType;
  priority: RecommendationPriority;
  relatedSimulationId?: string;
  expectedBenefit: string;
  confidence: number;
  createdAt: string;
  applied: boolean;
  appliedAt?: string;
}

interface ChannelDataMap {
  [simId: string]: ChannelTemperature[];
}

export interface AppState {
  currentUser: User;
  simulations: Simulation[];
  currentSimulation: Simulation | null;
  channelData: ChannelDataMap;
  warnings: Warning[];
  adjustmentLogs: AdjustmentLog[];
  approvals: ApprovalItem[];
  reports: SimulationReport[];
  configRisks: ConfigurationRisk[];
  dailyStats: DailyStatistics[];
  recommendations: Recommendation[];

  createSimulation: (input: Partial<Simulation> & Pick<Simulation, 'name' | 'configurationHash'>) => Simulation;
  updateSimulationStatus: (id: string, status: SimulationStatus, options?: { rollback?: boolean; reason?: string }) => void;
  setCurrentSimulation: (simulation: Simulation | null) => void;
  addChannelData: (simId: string, data: ChannelTemperature | ChannelTemperature[]) => void;
  getChannelData: (simId: string) => ChannelTemperature[];
  triggerWarning: (input: Omit<Warning, 'id' | 'status' | 'triggeredAt'>) => Warning;
  resolveWarning: (id: string, reviewedBy: string, reviewComment: string) => void;
  addAdjustmentLog: (input: Omit<AdjustmentLog, 'id' | 'timestamp'>) => AdjustmentLog;
  submitApproval: (input: Omit<ApprovalItem, 'id' | 'status' | 'createdAt'>) => ApprovalItem;
  approveItem: (id: string, signedBy: string, signComment?: string) => void;
  rejectItem: (id: string, signedBy: string, signComment: string) => void;
  generateReport: (simulationId: string, generatedBy: string) => SimulationReport;
  checkConfigRisk: (hash: string, simulationId: string, maxTemp: number, minChf: number) => ConfigurationRisk | null;
  updateDailyStats: (date: string, updates: Partial<DailyStatistics>) => void;
  deleteSimulation: (id: string) => void;
}

const genId = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const now = (): string => new Date().toISOString();

const daysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const defaultUser: User = {
  id: 'user-001',
  username: '张工',
  role: 'thermal_engineer',
  department: '热工水力设计所',
  email: 'zhanggong@nuclear-design.cn',
};

const mockSimulations: Simulation[] = [
  {
    id: 'sim-001',
    name: 'CAP1400-LOCA基准工况-01',
    status: 'thermal_calculation',
    progress: 67,
    configurationHash: 'cfg-a1b2c3d4',
    configurationName: 'CAP1400标准堆芯',
    creatorId: 'user-001',
    createdAt: daysAgo(2) + 'T09:30:00Z',
    updatedAt: daysAgo(0) + 'T10:15:00Z',
    gridType: 'structured_hex',
    turbulenceModel: 'k-epsilon',
    boilingModel: 'RPI',
    inletTemp: 558.0,
    inletPressure: 15.5,
    inletFlowRate: 4200.0,
    channelCount: 193,
  },
  {
    id: 'sim-002',
    name: 'HPR1000-稳态满功率-验证',
    status: 'completed',
    progress: 100,
    configurationHash: 'cfg-e5f6g7h8',
    configurationName: 'HPR1000优化构型',
    creatorId: 'user-001',
    createdAt: daysAgo(7) + 'T14:00:00Z',
    updatedAt: daysAgo(5) + 'T08:45:00Z',
    gridType: 'unstructured_tet',
    turbulenceModel: 'SST',
    boilingModel: 'Ishii',
    inletTemp: 556.5,
    inletPressure: 15.2,
    inletFlowRate: 3850.0,
    channelCount: 157,
  },
  {
    id: 'sim-003',
    name: 'LOCA-大破口-敏感性分析A',
    status: 'accident_analysis',
    progress: 82,
    configurationHash: 'cfg-a1b2c3d4',
    configurationName: 'CAP1400标准堆芯',
    creatorId: 'user-001',
    createdAt: daysAgo(1) + 'T11:20:00Z',
    updatedAt: daysAgo(0) + 'T14:00:00Z',
    gridType: 'structured_hex',
    turbulenceModel: 'k-epsilon',
    boilingModel: 'RPI',
    inletTemp: 558.0,
    inletPressure: 15.5,
    inletFlowRate: 4200.0,
    channelCount: 193,
  },
  {
    id: 'sim-004',
    name: '小破口-初始条件扫描-03',
    status: 'exception_rollback',
    progress: 35,
    configurationHash: 'cfg-i9j0k1l2',
    configurationName: '试验构型V2',
    creatorId: 'user-001',
    createdAt: daysAgo(3) + 'T16:45:00Z',
    updatedAt: daysAgo(2) + 'T09:10:00Z',
    gridType: 'structured_hex',
    turbulenceModel: 'RNG-k-epsilon',
    boilingModel: 'RPI',
    inletTemp: 550.0,
    inletPressure: 14.8,
    inletFlowRate: 3600.0,
    channelCount: 121,
  },
  {
    id: 'sim-005',
    name: '网格收敛性研究-粗网格',
    status: 'mesh_generation',
    progress: 12,
    configurationHash: 'cfg-m3n4o5p6',
    configurationName: '基准验证构型',
    creatorId: 'user-001',
    createdAt: daysAgo(0) + 'T08:00:00Z',
    updatedAt: daysAgo(0) + 'T09:30:00Z',
    gridType: 'unstructured_poly',
    turbulenceModel: 'k-omega',
    boilingModel: 'Cole',
    inletTemp: 555.0,
    inletPressure: 15.0,
    inletFlowRate: 4000.0,
    channelCount: 91,
  },
];

const mockWarnings: Warning[] = [
  {
    id: 'warn-001',
    simulationId: 'sim-001',
    simulationName: 'CAP1400-LOCA基准工况-01',
    type: 'temperature_exceed',
    severity: 'critical',
    channelId: 'CH-157',
    actualValue: 1487.5,
    limitValue: 1477.0,
    status: 'pending',
    triggeredAt: daysAgo(0) + 'T10:12:35Z',
  },
  {
    id: 'warn-002',
    simulationId: 'sim-001',
    simulationName: 'CAP1400-LOCA基准工况-01',
    type: 'chf_below_threshold',
    severity: 'warning',
    channelId: 'CH-089',
    actualValue: 1.08,
    limitValue: 1.15,
    status: 'reviewed',
    triggeredAt: daysAgo(0) + 'T09:45:20Z',
    reviewedBy: '张工',
    reviewComment: 'CHF比值略低于阈值，建议增加旁通流量5%',
  },
  {
    id: 'warn-003',
    simulationId: 'sim-004',
    simulationName: '小破口-初始条件扫描-03',
    type: 'convergence_failure',
    severity: 'info',
    status: 'resolved',
    actualValue: 0.0023,
    limitValue: 0.0001,
    triggeredAt: daysAgo(2) + 'T08:55:10Z',
    reviewedBy: '张工',
    reviewComment: '收敛失败，调整松弛因子后回退到网格阶段重算',
    resolvedAt: daysAgo(2) + 'T09:10:00Z',
  },
];

const mockApprovals: ApprovalItem[] = [
  {
    id: 'app-001',
    simulationId: 'sim-002',
    simulationName: 'HPR1000-稳态满功率-验证',
    level: 'engineer_verify',
    status: 'approved',
    assignee: '李工',
    submitter: '张工',
    items: [
      { name: '模型完整性检查', description: '几何、边界条件、物性参数完整性', result: 'pass' },
      { name: '网格独立性验证', description: '粗/中/细网格结果偏差<3%', result: 'pass' },
      { name: 'CHF安全裕量', description: '最小CHF比值>1.30', result: 'pass', comment: '最小1.42，满足要求' },
      { name: '包壳温度限值', description: '峰值<1477K', result: 'pass' },
    ],
    overallComment: '稳态计算结果可信，安全裕量充足，同意进入下一步。',
    createdAt: daysAgo(6) + 'T09:00:00Z',
    signedBy: '李工',
    signedAt: daysAgo(6) + 'T14:30:00Z',
    signComment: '模型验证充分，数据完整。',
  },
  {
    id: 'app-002',
    simulationId: 'sim-002',
    simulationName: 'HPR1000-稳态满功率-验证',
    level: 'chief_confirm',
    status: 'pending',
    assignee: '王总',
    submitter: '李工',
    items: [
      { name: '设计基准符合性', description: '结果符合RCC-M及GSR要求', result: 'pass' },
      { name: '事故分析预评估', description: '为事故分析提供合理初始条件', result: 'pass' },
      { name: '敏感性分析覆盖', description: '关键参数敏感性扫描完整', result: 'na' },
    ],
    overallComment: '已完成热工工程师验证，提交总工最终确认。',
    createdAt: daysAgo(5) + 'T08:30:00Z',
  },
  {
    id: 'app-003',
    simulationId: 'sim-001',
    simulationName: 'CAP1400-LOCA基准工况-01',
    level: 'engineer_verify',
    status: 'rejected',
    assignee: '李工',
    submitter: '张工',
    items: [
      { name: '模型完整性检查', description: '几何、边界条件、物性参数完整性', result: 'fail', comment: '缺少部分构件几何定义' },
      { name: '网格独立性验证', description: '粗/中/细网格结果偏差<3%', result: 'na' },
      { name: 'CHF安全裕量', description: '最小CHF比值>1.30', result: 'fail', comment: '计算未完成，无结果' },
      { name: '包壳温度限值', description: '峰值<1477K', result: 'na' },
    ],
    overallComment: '模型定义不完整，建议重新上传几何文件后再提交。',
    createdAt: daysAgo(1) + 'T15:20:00Z',
    signedBy: '李工',
    signedAt: daysAgo(0) + 'T08:50:00Z',
    signComment: '模型需要补充构件定义后重新验证。',
  },
  {
    id: 'app-004',
    simulationId: 'sim-003',
    simulationName: 'LOCA-大破口-敏感性分析A',
    level: 'engineer_verify',
    status: 'pending',
    assignee: '李工',
    submitter: '张工',
    items: [
      { name: '初始条件合理性', description: '事故初始参数与设计基准一致', result: 'pass' },
      { name: '过程模型覆盖', description: '喷放、再充、再淹没过程完整', result: 'pass' },
      { name: 'CHF包络线', description: '全工况CHF比值>1.0', result: 'na' },
      { name: '峰值包壳温度', description: 'PCT限值<1477K', result: 'na' },
    ],
    overallComment: '事故分析计算中，预提交审批项以便后续验证。',
    createdAt: daysAgo(0) + 'T11:00:00Z',
  },
];

const mockConfigRisks: ConfigurationRisk[] = [
  {
    id: 'risk-001',
    name: '试验构型V2',
    hash: 'cfg-i9j0k1l2',
    exceedCount: 3,
    riskLevel: 'high',
    status: 'suspended',
    lastExceedAt: daysAgo(2) + 'T08:55:10Z',
    history: [
      { simulationId: 'sim-004', exceededAt: daysAgo(2) + 'T08:55:10Z', maxTemp: 1502.3, minChf: 0.92 },
      { simulationId: 'sim-old-001', exceededAt: daysAgo(10) + 'T14:22:00Z', maxTemp: 1491.8, minChf: 0.97 },
      { simulationId: 'sim-old-002', exceededAt: daysAgo(18) + 'T09:10:00Z', maxTemp: 1483.5, minChf: 1.03 },
    ],
    suspendReason: '连续3次燃料温度超限，最大峰值1502.3K，超出安全限值1477K。建议对燃料棒排列和冷却剂流道进行设计优化。',
    suspendedAt: daysAgo(2) + 'T09:00:00Z',
    chiefNotifications: [
      {
        id: 'notif-001',
        notifiedAt: daysAgo(2) + 'T09:00:00Z',
        notifiedTo: '首席核安全工程师-王总',
        message: '构型「试验构型V2」(cfg-i9j0k1l2) 已连续3次出现燃料温度超限，已自动暂停该构型新任务提交。',
        acknowledged: true,
        acknowledgedAt: daysAgo(2) + 'T10:30:00Z',
      },
    ],
  },
  {
    id: 'risk-002',
    name: 'CAP1400标准堆芯',
    hash: 'cfg-a1b2c3d4',
    exceedCount: 2,
    riskLevel: 'medium',
    status: 'active',
    lastExceedAt: daysAgo(0) + 'T10:12:35Z',
    history: [
      { simulationId: 'sim-001', exceededAt: daysAgo(0) + 'T10:12:35Z', maxTemp: 1487.5, minChf: 1.08 },
      { simulationId: 'sim-old-004', exceededAt: daysAgo(8) + 'T11:05:00Z', maxTemp: 1479.1, minChf: 1.12 },
    ],
    chiefNotifications: [],
  },
];

const generateDailyStats = (): DailyStatistics[] => {
  const stats: DailyStatistics[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(i);
    const total = 3 + Math.floor(Math.random() * 4);
    const completed = Math.max(0, total - Math.floor(Math.random() * 2) - (i > 2 ? 0 : 1));
    const chfDist: number[] = [];
    for (let j = 0; j < 5; j++) {
      chfDist.push(+(1.0 + Math.random() * 0.8).toFixed(2));
    }
    stats.push({
      date,
      totalSimulations: total,
      completedSimulations: completed,
      completionRate: +(completed / total).toFixed(3),
      avgAccidentAnalysisTime: +(120 + Math.random() * 180).toFixed(1),
      minChfDistribution: chfDist.sort(),
      safetyMargins: {
        temperatureMargin: +(0.15 + Math.random() * 0.2).toFixed(3),
        chfMargin: +(0.2 + Math.random() * 0.25).toFixed(3),
        flowMargin: +(0.25 + Math.random() * 0.2).toFixed(3),
        pressureMargin: +(0.18 + Math.random() * 0.15).toFixed(3),
        powerMargin: +(0.1 + Math.random() * 0.15).toFixed(3),
      },
    });
  }
  return stats;
};

const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-001',
    title: 'CH-157通道旁通流量+5%调整',
    description: '基于 sim-001 热工计算结果，157号通道CHF比值仅1.08，建议将该通道旁通流量从2.5%提升至7.5%，预计CHF比值可提升至1.21，温度峰值降低约18K。',
    type: 'adjustment',
    priority: 'high',
    relatedSimulationId: 'sim-001',
    expectedBenefit: '消除温度超限预警，CHF裕量恢复至阈值以上',
    confidence: 0.91,
    createdAt: daysAgo(0) + 'T10:20:00Z',
    applied: false,
  },
  {
    id: 'rec-002',
    title: '试验构型V2暂停使用建议',
    description: '构型 cfg-i9j0k1l2 近30天连续4次出现温度/CHF超限，已达到高风险等级阈值。建议暂停该构型的新任务提交，进行设计复核与参数优化。',
    type: 'configuration',
    priority: 'high',
    expectedBenefit: '降低异常回退率约30%，减少无效计算资源消耗',
    confidence: 0.97,
    createdAt: daysAgo(2) + 'T09:30:00Z',
    applied: true,
    appliedAt: daysAgo(2) + 'T11:00:00Z',
  },
  {
    id: 'rec-003',
    title: 'RNG-k-epsilon湍流模型替换',
    description: ' sim-004 采用RNG-k-epsilon模型出现收敛困难，历史同类几何采用标准k-epsilon模型收敛速度提升23%且结果偏差<2%，建议替换。',
    type: 'model',
    priority: 'medium',
    relatedSimulationId: 'sim-004',
    expectedBenefit: '收敛迭代次数减少约20%，降低异常回退概率',
    confidence: 0.84,
    createdAt: daysAgo(2) + 'T09:45:00Z',
    applied: false,
  },
];

const calcSafetyRating = (margins: SafetyMargins): SafetyRating => {
  const avg = (margins.temperatureMargin + margins.chfMargin + margins.flowMargin + margins.pressureMargin + margins.powerMargin) / 5;
  if (avg >= 0.30) return 'S';
  if (avg >= 0.22) return 'A';
  if (avg >= 0.15) return 'B';
  if (avg >= 0.08) return 'C';
  return 'D';
};

const reportNames: Array<{ name: string; config: string; type: ReportType }> = [
  { name: 'CAP1400-LOCA基准工况-01', config: 'CAP1400标准堆芯', type: 'accident_analysis' },
  { name: 'HPR1000-稳态满功率-验证', config: 'HPR1000优化构型', type: 'steady_state' },
  { name: 'LOCA-大破口-敏感性分析A', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: '小破口-初始条件扫描-03', config: '试验构型V2', type: 'sensitivity' },
  { name: '网格收敛性研究-粗网格', config: '基准验证构型', type: 'benchmark' },
  { name: 'HPR1000-LOCA-50mm破口', config: 'HPR1000优化构型', type: 'accident_analysis' },
  { name: 'CAP1400-稳态-旁通优化V1', config: 'CAP1400标准堆芯', type: 'steady_state' },
  { name: 'LOCA-中破口-敏感性分析B', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: 'HPR1000-功率倾斜-基准验证', config: 'HPR1000优化构型', type: 'benchmark' },
  { name: '试验构型V2-稳态测试-01', config: '试验构型V2', type: 'steady_state' },
  { name: 'CAP1400-SBO-全厂断电分析', config: 'CAP1400标准堆芯', type: 'accident_analysis' },
  { name: '基准验证构型-标准测试题', config: '基准验证构型', type: 'benchmark' },
  { name: 'HPR1000-旁通流量优化-02', config: 'HPR1000优化构型', type: 'sensitivity' },
  { name: 'CAP1400-小破口-100mm', config: 'CAP1400标准堆芯', type: 'accident_analysis' },
  { name: 'HPR1000-稳态满功率-重复计算', config: 'HPR1000优化构型', type: 'steady_state' },
  { name: 'LOCA-大破口-敏感性分析C', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: '试验构型V2-LOCA预研', config: '试验构型V2', type: 'accident_analysis' },
  { name: 'CAP1400-网格收敛-细网格', config: 'CAP1400标准堆芯', type: 'benchmark' },
  { name: 'HPR1000-功率运行瞬态', config: 'HPR1000优化构型', type: 'accident_analysis' },
  { name: '基准构型-湍流模型对比', config: '基准验证构型', type: 'benchmark' },
  { name: 'CAP1400-稳态-燃料棒升级', config: 'CAP1400标准堆芯', type: 'steady_state' },
  { name: '小破口-200mm-敏感性', config: '试验构型V2', type: 'sensitivity' },
  { name: 'HPR1000-控制棒弹出事故', config: 'HPR1000优化构型', type: 'accident_analysis' },
  { name: 'CAP1400-CHF关联式对比', config: 'CAP1400标准堆芯', type: 'benchmark' },
  { name: '试验构型V2-稳态验证', config: '试验构型V2', type: 'steady_state' },
  { name: 'LOCA-大破口-衰变热敏感性', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: 'HPR1000-丧失给水事故', config: 'HPR1000优化构型', type: 'accident_analysis' },
  { name: 'CAP1400-出口温度分布研究', config: 'CAP1400标准堆芯', type: 'steady_state' },
  { name: '基准构型-两相流验证', config: '基准验证构型', type: 'benchmark' },
  { name: 'HPR1000-燃料密实化分析', config: 'HPR1000优化构型', type: 'sensitivity' },
  { name: 'CAP1400-安注流量敏感性', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: '试验构型V2-网格独立性', config: '试验构型V2', type: 'benchmark' },
  { name: 'HPR1000-主管道破裂事故', config: 'HPR1000优化构型', type: 'accident_analysis' },
  { name: 'CAP1400-稳态满功率-复核', config: 'CAP1400标准堆芯', type: 'steady_state' },
  { name: 'LOCA-喷放阶段-敏感性D', config: 'CAP1400标准堆芯', type: 'sensitivity' },
  { name: '基准构型-国际基准题OECD', config: '基准验证构型', type: 'benchmark' },
];

const approvalStatusList: ApprovalProgressStatus[] = [
  'level2_approved', 'level2_approved', 'level2_approved', 'level2_approved', 'level2_approved',
  'level1_approved', 'level2_pending', 'level2_pending',
  'level1_pending', 'level1_pending', 'level1_pending',
  'rejected', 'not_started',
];

const generateMockReports = (): SimulationReport[] => {
  const reports: SimulationReport[] = [];
  for (let i = 0; i < reportNames.length; i++) {
    const item = reportNames[i];
    const margins: SafetyMargins = {
      temperatureMargin: +(0.08 + Math.random() * 0.25).toFixed(3),
      chfMargin: +(0.10 + Math.random() * 0.30).toFixed(3),
      flowMargin: +(0.12 + Math.random() * 0.22).toFixed(3),
      pressureMargin: +(0.09 + Math.random() * 0.18).toFixed(3),
      powerMargin: +(0.06 + Math.random() * 0.20).toFixed(3),
    };
    const rating = calcSafetyRating(margins);
    const approval = approvalStatusList[i % approvalStatusList.length];
    const genDaysAgo = Math.floor(Math.random() * 25);
    const generatedAt = daysAgo(genDaysAgo) + `T${String(8 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00Z`;
    const duration = +(45 + Math.random() * 240).toFixed(1);

    let engineerVerify: SimulationReport['engineerVerify'] = undefined;
    let chiefConfirm: SimulationReport['chiefConfirm'] = undefined;

    if (approval === 'level1_pending' || approval === 'level1_approved' || approval === 'level2_pending' || approval === 'level2_approved') {
      engineerVerify = { status: approval === 'level1_pending' ? 'pending' : 'approved' };
      if (engineerVerify.status === 'approved') {
        engineerVerify.reviewer = '李工';
        engineerVerify.reviewedAt = daysAgo(Math.max(0, genDaysAgo - 1)) + 'T14:30:00Z';
        engineerVerify.comment = '模型验证充分，数据完整，同意进入下一步。';
      }
    }
    if (approval === 'level2_pending' || approval === 'level2_approved') {
      chiefConfirm = { status: approval === 'level2_pending' ? 'pending' : 'approved' };
      if (chiefConfirm.status === 'approved') {
        chiefConfirm.reviewer = '王总';
        chiefConfirm.reviewedAt = daysAgo(Math.max(0, genDaysAgo - 2)) + 'T09:15:00Z';
        chiefConfirm.comment = '结果可信，安全裕量充足，同意归档。';
      }
    }
    if (approval === 'rejected') {
      engineerVerify = {
        status: 'rejected',
        reviewer: '李工',
        reviewedAt: daysAgo(Math.max(0, genDaysAgo - 1)) + 'T11:20:00Z',
        comment: '缺少部分构件几何定义，模型需要补充后重新提交。',
      };
    }

    const isLevel2Approved = approval === 'level2_approved';
    reports.push({
      id: `rep-${String(i + 1).padStart(3, '0')}-${genId().slice(0, 6)}`,
      simulationId: `sim-${String(100 + i).padStart(3, '0')}`,
      simulationName: item.name,
      configurationName: item.config,
      reportType: item.type,
      sections: [
        { title: '任务概述', type: 'text', content: `模拟任务 ${item.name} 的热工水力分析报告。` },
        { title: '输入参数摘要', type: 'table', content: {} },
        { title: '关键温度曲线', type: 'chart', content: { type: 'temperature_profile' } },
        { title: 'CHF比值分布', type: 'chart', content: { type: 'chf_distribution' } },
        { title: '结论', type: 'text', content: '本次模拟各关键参数评估。' },
      ],
      safetyMargins: margins,
      safetyRating: rating,
      generatedAt,
      generatedBy: i % 3 === 0 ? '张工' : i % 3 === 1 ? '刘工' : '陈工',
      generationDuration: duration,
      approvalStatus: approval,
      engineerVerify,
      chiefConfirm,
      approvedBy: approval === 'level2_approved' ? ['李工', '王总'] : approval === 'level1_approved' ? ['李工'] : [],
      pushNotifications: isLevel2Approved
        ? [
            {
              id: 'push-' + genId(),
              department: '运行规程组',
              pushedAt: daysAgo(Math.max(0, genDaysAgo - 2)) + 'T10:00:00Z',
              status: i % 2 === 0 ? 'acknowledged' : 'pending',
              acknowledgedAt: i % 2 === 0 ? daysAgo(Math.max(0, genDaysAgo - 2)) + 'T14:30:00Z' : undefined,
              acknowledgedBy: i % 2 === 0 ? '运行规程组-刘组长' : undefined,
            },
            {
              id: 'push-' + genId(),
              department: '应急响应组',
              pushedAt: daysAgo(Math.max(0, genDaysAgo - 2)) + 'T10:00:00Z',
              status: i % 3 === 0 ? 'acknowledged' : 'pending',
              acknowledgedAt: i % 3 === 0 ? daysAgo(Math.max(0, genDaysAgo - 2)) + 'T11:20:00Z' : undefined,
              acknowledgedBy: i % 3 === 0 ? '应急响应组-陈队长' : undefined,
            },
          ]
        : [],
      isDistributed: isLevel2Approved,
      distributedAt: isLevel2Approved ? daysAgo(Math.max(0, genDaysAgo - 2)) + 'T10:00:00Z' : undefined,
      recipientDepartments: isLevel2Approved ? ['运行规程组', '应急响应组'] : undefined,
    });
  }
  return reports;
};

const mockReports: SimulationReport[] = generateMockReports();

const defaultChannelData: ChannelDataMap = {};
mockSimulations.forEach((sim) => {
  const data: ChannelTemperature[] = [];
  const nowTs = Date.now();
  for (let i = 0; i < 10; i++) {
    for (let c = 1; c <= Math.min(sim.channelCount, 8); c++) {
      data.push({
        channelId: `CH-${String(c).padStart(3, '0')}`,
        pelletCenterTemp: +(1100 + Math.random() * 350 + i * 5).toFixed(1),
        claddingSurfaceTemp: +(600 + Math.random() * 150 + i * 2).toFixed(1),
        coolantTemp: +(550 + Math.random() * 80).toFixed(1),
        chfRatio: +(1.0 + Math.random() * 0.6).toFixed(3),
        heatFlux: +(600000 + Math.random() * 400000).toFixed(0),
        timestamp: nowTs - (10 - i) * 500,
      });
    }
  }
  defaultChannelData[sim.id] = data;
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: defaultUser,
      simulations: mockSimulations,
      currentSimulation: mockSimulations[0] ?? null,
      channelData: defaultChannelData,
      warnings: mockWarnings,
      adjustmentLogs: [],
      approvals: mockApprovals,
      reports: mockReports,
      configRisks: mockConfigRisks,
      dailyStats: generateDailyStats(),
      recommendations: mockRecommendations,

      createSimulation: (input) => {
        const newSim: Simulation = {
          id: 'sim-' + genId(),
          name: input.name,
          status: 'pending_validation',
          progress: 0,
          configurationHash: input.configurationHash,
          configurationName: input.configurationName ?? '未命名构型',
          creatorId: get().currentUser.id,
          createdAt: now(),
          updatedAt: now(),
          gridType: input.gridType ?? 'structured_hex',
          turbulenceModel: input.turbulenceModel ?? 'k-epsilon',
          boilingModel: input.boilingModel ?? 'RPI',
          inletTemp: input.inletTemp ?? 558.0,
          inletPressure: input.inletPressure ?? 15.5,
          inletFlowRate: input.inletFlowRate ?? 4200.0,
          channelCount: input.channelCount ?? 193,
        };
        set((s) => ({
          simulations: [...s.simulations, newSim],
          currentSimulation: newSim,
        }));
        return newSim;
      },

      updateSimulationStatus: (id, status, options) => {
        set((s) => {
          const sim = s.simulations.find((x) => x.id === id);
          if (!sim) return {};
          const updatedSim: Simulation = { ...sim, status, updatedAt: now() };
          if (status === 'completed') updatedSim.progress = 100;
          if (status === 'mesh_generation' && sim.progress < 5) updatedSim.progress = 5;
          if (status === 'thermal_calculation' && sim.progress < 30) updatedSim.progress = 30;
          if (status === 'accident_analysis' && sim.progress < 70) updatedSim.progress = 70;
          if (options?.rollback) {
            updatedSim.status = 'exception_rollback';
            updatedSim.progress = Math.max(0, sim.progress - 20);
          }
          const simulations = s.simulations.map((x) => (x.id === id ? updatedSim : x));
          const currentSimulation = s.currentSimulation?.id === id ? updatedSim : s.currentSimulation;
          return { simulations, currentSimulation };
        });
      },

      setCurrentSimulation: (simulation) => set({ currentSimulation: simulation }),

      addChannelData: (simId, data) => {
        const arr = Array.isArray(data) ? data : [data];
        set((s) => ({
          channelData: {
            ...s.channelData,
            [simId]: [...(s.channelData[simId] ?? []), ...arr],
          },
        }));
      },

      getChannelData: (simId) => get().channelData[simId] ?? [],

      triggerWarning: (input) => {
        const warning: Warning = {
          id: 'warn-' + genId(),
          ...input,
          status: 'pending',
          triggeredAt: now(),
        };
        set((s) => ({ warnings: [warning, ...s.warnings] }));
        return warning;
      },

      resolveWarning: (id, reviewedBy, reviewComment) => {
        set((s) => ({
          warnings: s.warnings.map((w) =>
            w.id === id
              ? { ...w, status: 'resolved', reviewedBy, reviewComment, resolvedAt: now() }
              : w.status === 'pending' && w.id === id
                ? { ...w, status: 'reviewed', reviewedBy, reviewComment }
                : w
          ),
        }));
      },

      addAdjustmentLog: (input) => {
        const log: AdjustmentLog = {
          id: 'adj-' + genId(),
          ...input,
          timestamp: now(),
        };
        set((s) => ({ adjustmentLogs: [log, ...s.adjustmentLogs] }));
        return log;
      },

      submitApproval: (input) => {
        const approval: ApprovalItem = {
          id: 'app-' + genId(),
          ...input,
          status: 'pending',
          createdAt: now(),
        };
        set((s) => ({ approvals: [approval, ...s.approvals] }));
        return approval;
      },

      approveItem: (id, signedBy, signComment) => {
        const state = get();
        const approval = state.approvals.find((a) => a.id === id);
        if (!approval) return;

        let newApprovals: ApprovalItem[] = [];
        let newReports: SimulationReport[] = state.reports;
        let shouldUpdateReports = false;

        set((s) => {
          newApprovals = s.approvals.map((a) =>
            a.id === id
              ? { ...a, status: 'approved' as const, signedBy, signedAt: now(), signComment: signComment ?? a.signComment }
              : a
          );

          if (approval.level === 'engineer_verify') {
            const existingChief = newApprovals.find(
              (a) => a.simulationId === approval.simulationId && a.level === 'chief_confirm'
            );
            if (!existingChief) {
              const chiefApproval: ApprovalItem = {
                id: 'app-' + genId(),
                simulationId: approval.simulationId,
                simulationName: approval.simulationName,
                level: 'chief_confirm',
                status: 'pending',
                assignee: '王总',
                submitter: signedBy,
                items: [
                  { name: '设计基准符合性', description: '结果符合RCC-M及GSR要求', result: 'pass' },
                  { name: '事故分析预评估', description: '为事故分析提供合理初始条件', result: 'pass' },
                  { name: '敏感性分析覆盖', description: '关键参数敏感性扫描完整', result: 'na' },
                ],
                overallComment: '热工工程师验证通过，提交总工最终确认。',
                createdAt: now(),
              };
              newApprovals = [chiefApproval, ...newApprovals];
            } else if (existingChief.status === 'rejected') {
              const idx = newApprovals.findIndex((a) => a.id === existingChief.id);
              newApprovals[idx] = { ...existingChief, status: 'pending', submitter: signedBy, createdAt: now() };
            }
          }

          if (approval.level === 'chief_confirm') {
            shouldUpdateReports = true;
            const existingReport = s.reports.find((r) => r.simulationId === approval.simulationId);
            let reportId = existingReport?.id;

            if (!existingReport) {
              const newReport = state.generateReport(approval.simulationId, signedBy);
              newReports = [newReport, ...s.reports];
              reportId = newReport.id;
            }

            if (reportId) {
              newReports = newReports.map((r) =>
                r.id === reportId
                  ? {
                      ...r,
                      approvalStatus: 'level2_approved' as const,
                      engineerVerify: r.engineerVerify ?? {
                        status: 'approved',
                        reviewer: approval.submitter,
                        reviewedAt: s.approvals.find(
                          (a) => a.simulationId === approval.simulationId && a.level === 'engineer_verify'
                        )?.signedAt,
                        comment: '模型验证充分，数据完整',
                      },
                      chiefConfirm: {
                        status: 'approved',
                        reviewer: signedBy,
                        reviewedAt: now(),
                        comment: signComment ?? '结果可信，安全裕量充足，同意归档。',
                      },
                      approvedBy: [...new Set([...(r.approvedBy ?? []), approval.submitter, signedBy])],
                      pushNotifications: [
                        {
                          id: 'push-' + genId(),
                          department: '运行规程组',
                          pushedAt: now(),
                          status: 'pending',
                        },
                        {
                          id: 'push-' + genId(),
                          department: '应急响应组',
                          pushedAt: now(),
                          status: 'pending',
                        },
                      ],
                      isDistributed: true,
                      distributedAt: now(),
                      recipientDepartments: ['运行规程组', '应急响应组'],
                    }
                  : r
              );
            }
          }

          return shouldUpdateReports
            ? { approvals: newApprovals, reports: newReports }
            : { approvals: newApprovals };
        });
      },

      rejectItem: (id, signedBy, signComment) => {
        set((s) => {
          const approval = s.approvals.find((a) => a.id === id);
          const newApprovals: ApprovalItem[] = s.approvals.map((a) =>
            a.id === id ? { ...a, status: 'rejected' as const, signedBy, signedAt: now(), signComment } : a
          );

          if (approval?.level === 'engineer_verify') {
            return {
              approvals: newApprovals.map((a) =>
                a.simulationId === approval.simulationId && a.level === 'chief_confirm' && a.status === 'pending'
                  ? { ...a, status: 'rejected' as const, signedBy: signedBy, signedAt: now(), signComment: '前置审批被驳回，自动终止。' }
                  : a
              ),
            };
          }

          return { approvals: newApprovals };
        });
      },

      generateReport: (simulationId, generatedBy) => {
        const sim = get().simulations.find((x) => x.id === simulationId);
        const simName = sim?.name ?? '未知任务';
        const margins: SafetyMargins = {
          temperatureMargin: +(0.12 + Math.random() * 0.2).toFixed(3),
          chfMargin: +(0.18 + Math.random() * 0.25).toFixed(3),
          flowMargin: +(0.22 + Math.random() * 0.2).toFixed(3),
          pressureMargin: +(0.15 + Math.random() * 0.15).toFixed(3),
          powerMargin: +(0.1 + Math.random() * 0.15).toFixed(3),
        };
        const rating = calcSafetyRating(margins);
        const report: SimulationReport = {
          id: 'rep-' + genId(),
          simulationId,
          simulationName: simName,
          configurationName: sim?.configurationName ?? '未命名构型',
          reportType: 'steady_state',
          sections: [
            { title: '任务概述', type: 'text', content: `模拟任务 ${simName} 的热工水力分析报告，包含稳态与事故工况下的关键热工参数评估。` },
            { title: '输入参数摘要', type: 'table', content: sim ?? {} },
            { title: '关键温度曲线', type: 'chart', content: { type: 'temperature_profile' } },
            { title: 'CHF比值分布', type: 'chart', content: { type: 'chf_distribution' } },
            { title: '结论', type: 'text', content: '本次模拟各关键参数满足设计基准要求，安全裕量充足。' },
          ],
          safetyMargins: margins,
          safetyRating: rating,
          generatedAt: now(),
          generatedBy,
          generationDuration: +(60 + Math.random() * 180).toFixed(1),
          approvalStatus: 'not_started',
          approvedBy: [],
          pushNotifications: [],
          isDistributed: false,
        };
        set((s) => ({ reports: [report, ...s.reports] }));
        return report;
      },

      checkConfigRisk: (hash, simulationId, maxTemp, minChf) => {
        const tempLimit = 1477;
        const chfLimit = 1.0;
        const isExceed = maxTemp > tempLimit || minChf < chfLimit;
        if (!isExceed) return null;
        let result: ConfigurationRisk | null = null;
        set((s) => {
          const historyItem: RiskHistoryItem = { simulationId, exceededAt: now(), maxTemp, minChf };
          let risks = s.configRisks.map((r) => ({ ...r, history: [...r.history], chiefNotifications: [...(r.chiefNotifications ?? [])] }));
          const idx = risks.findIndex((r) => r.hash === hash);
          if (idx === -1) {
            const newRisk: ConfigurationRisk = {
              id: 'risk-' + genId(),
              name: `构型-${hash.slice(-4)}`,
              hash,
              exceedCount: 1,
              riskLevel: 'low',
              status: 'active',
              lastExceedAt: historyItem.exceededAt,
              history: [historyItem],
              chiefNotifications: [],
            };
            risks = [newRisk, ...risks];
            result = newRisk;
          } else {
            const previousStatus = risks[idx].status;
            risks[idx] = {
              ...risks[idx],
              exceedCount: risks[idx].exceedCount + 1,
              lastExceedAt: historyItem.exceededAt,
              history: [historyItem, ...risks[idx].history],
              chiefNotifications: [...(risks[idx].chiefNotifications ?? [])],
            };
            const cnt = risks[idx].exceedCount;
            risks[idx].riskLevel = cnt >= 3 ? 'high' : cnt >= 2 ? 'medium' : 'low';
            if (cnt >= 3 && previousStatus === 'active') {
              risks[idx].status = 'suspended';
              risks[idx].suspendReason = `连续${cnt}次燃料温度超限，最大峰值${maxTemp.toFixed(1)}K，超出安全限值${tempLimit}K。已自动暂停该构型新任务提交。`;
              risks[idx].suspendedAt = now();
              const notification: ChiefNotification = {
                id: 'notif-' + genId(),
                notifiedAt: now(),
                notifiedTo: '首席核安全工程师',
                message: `构型「${risks[idx].name}」(${hash}) 已连续${cnt}次出现燃料温度超限，已自动暂停该构型新任务提交，请及时处理。`,
                acknowledged: false,
              };
              risks[idx].chiefNotifications.push(notification);
            }
            result = risks[idx];
          }
          return { configRisks: risks };
        });
        return result;
      },

      updateDailyStats: (date, updates) => {
        set((s) => {
          const stats = s.dailyStats.map((d) => (d.date === date ? { ...d, ...updates } : d));
          const exists = stats.some((d) => d.date === date);
          if (!exists) {
            const defaults: DailyStatistics = {
              date,
              totalSimulations: 0,
              completedSimulations: 0,
              completionRate: 0,
              avgAccidentAnalysisTime: 0,
              minChfDistribution: [],
              safetyMargins: { temperatureMargin: 0, chfMargin: 0, flowMargin: 0, pressureMargin: 0, powerMargin: 0 },
            };
            stats.push({ ...defaults, ...updates });
          }
          return { dailyStats: stats };
        });
      },

      deleteSimulation: (id) => {
        set((s) => ({
          simulations: s.simulations.filter((x) => x.id !== id),
          currentSimulation: s.currentSimulation?.id === id ? null : s.currentSimulation,
          warnings: s.warnings.filter((w) => w.simulationId !== id),
          adjustmentLogs: s.adjustmentLogs.filter((a) => a.simulationId !== id),
          approvals: s.approvals.filter((a) => a.simulationId !== id),
          reports: s.reports.filter((r) => r.simulationId !== id),
          channelData: Object.fromEntries(
            Object.entries(s.channelData).filter(([k]) => k !== id)
          ),
        }));
      },
    }),
    {
      name: 'nuclear-thermal-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        simulations: state.simulations,
        currentSimulation: state.currentSimulation,
        channelData: state.channelData,
        warnings: state.warnings,
        adjustmentLogs: state.adjustmentLogs,
        approvals: state.approvals,
        reports: state.reports,
        configRisks: state.configRisks,
        dailyStats: state.dailyStats,
        recommendations: state.recommendations,
      }),
    }
  )
);
