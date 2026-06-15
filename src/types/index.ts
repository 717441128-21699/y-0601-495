/**
 * 核反应堆堆芯热工水力模拟平台 - TypeScript类型定义
 */

// ==================== 枚举定义 ====================

/**
 * 模拟任务状态枚举（7种状态）
 */
export enum SimulationStatus {
  /** 待校验 - 任务创建完成等待模型合理性校验 */
  PENDING_VERIFICATION = 'pending_verification',
  /** 网格生成 - 校验通过正在生成子通道网格 */
  MESH_GENERATION = 'mesh_generation',
  /** 热工水力计算 - 网格生成完成正在进行热工迭代计算 */
  THERMAL_HYDRAULIC_CALCULATION = 'thermal_hydraulic_calculation',
  /** 事故分析 - 热工计算完成正在进行事故进程时序模拟 */
  ACCIDENT_ANALYSIS = 'accident_analysis',
  /** 完成 - 全部计算完成等待审批 */
  COMPLETED = 'completed',
  /** 异常回退 - 校验或计算失败，返回重新配置 */
  ABNORMAL_ROLLBACK = 'abnormal_rollback',
  /** 已暂停 - 构型连续超限被系统暂停 */
  SUSPENDED = 'suspended',
}

/**
 * 用户角色枚举（7种角色）
 */
export enum UserRole {
  /** 热工工程师 - 上传模型、发起模拟、验证模型合理性、提交审批 */
  THERMAL_ENGINEER = 'thermal_engineer',
  /** 核安全分析师 - 接收预警、复核超限工况、审批调整方案 */
  NUCLEAR_SAFETY_ANALYST = 'nuclear_safety_analyst',
  /** 安全总工 - 确认事故后果、最终审批模拟结果 */
  CHIEF_SAFETY_ENGINEER = 'chief_safety_engineer',
  /** 运行规程组 - 查看通过审批的模拟结果、优化运行规程 */
  OPERATION_PROCEDURE_TEAM = 'operation_procedure_team',
  /** 应急响应组 - 查看事故分析报告、制定应急预案 */
  EMERGENCY_RESPONSE_TEAM = 'emergency_response_team',
  /** 首席核安全工程师 - 处理构型暂停通知、全局安全监控 */
  CHIEF_NUCLEAR_SAFETY_ENGINEER = 'chief_nuclear_safety_engineer',
  /** 系统管理员 - 用户管理、权限配置、系统参数设置 */
  SYSTEM_ADMINISTRATOR = 'system_administrator',
}

/**
 * 网格类型枚举
 */
export enum MeshType {
  /** 六边形子通道网格 */
  HEXAGONAL = 'hexagonal',
  /** 矩形子通道网格 */
  RECTANGULAR = 'rectangular',
}

/**
 * 湍流模型枚举
 */
export enum TurbulenceModel {
  /** k-ε模型 */
  K_EPSILON = 'k_epsilon',
  /** k-ω模型 */
  K_OMEGA = 'k_omega',
  /** SST剪切应力输运模型 */
  SST = 'sst',
}

/**
 * 沸腾传热关联式枚举
 */
export enum BoilingCorrelation {
  /** DNB偏离泡核沸腾关联式 */
  DNB = 'dnb',
  /** CHF临界热流密度关联式 */
  CHF = 'chf',
}

/**
 * 预警严重等级枚举
 */
export enum WarningSeverity {
  /** 低等级 - 轻微超限，建议关注 */
  LOW = 'low',
  /** 中等级 - 中度超限，需要调整 */
  MEDIUM = 'medium',
  /** 高等级 - 严重超限，必须立即处理 */
  HIGH = 'high',
  /** 紧急 - 临界安全阈值，紧急响应 */
  CRITICAL = 'critical',
}

/**
 * 预警类型枚举
 */
export enum WarningType {
  /** 温度超限 - 燃料芯块或包壳温度超过安全限值 */
  TEMPERATURE_EXCEEDED = 'temperature_exceeded',
  /** CHF比不足 - 临界热流密度比低于安全阈值 */
  CHF_RATIO_INSUFFICIENT = 'chf_ratio_insufficient',
  /** 流量异常 - 冷却剂流量偏离设计范围 */
  FLOW_ANOMALY = 'flow_anomaly',
  /** 压力异常 - 系统压力超出正常范围 */
  PRESSURE_ANOMALY = 'pressure_anomaly',
}

/**
 * 通道类型枚举
 */
export enum ChannelType {
  /** 燃料通道 - 包含燃料棒的冷却剂通道 */
  FUEL = 'fuel',
  /** 旁通通道 - 堆芯外围旁通冷却剂通道 */
  BYPASS = 'bypass',
  /** 控制棒导向管通道 */
  CONTROL_ROD_GUIDE = 'control_rod_guide',
}

/**
 * 风险等级枚举
 */
export enum RiskLevel {
  /** 低风险 */
  LOW_RISK = 'low_risk',
  /** 中风险 */
  MEDIUM_RISK = 'medium_risk',
  /** 高风险 */
  HIGH_RISK = 'high_risk',
  /** 极高风险 */
  EXTREME_RISK = 'extreme_risk',
}

/**
 * 审批类型枚举
 */
export enum ApprovalType {
  /** 模型合理性验证 - 热工工程师验证 */
  MODEL_VALIDATION = 'model_validation',
  /** 事故后果确认 - 安全总工确认 */
  ACCIDENT_CONSEQUENCE_CONFIRMATION = 'accident_consequence_confirmation',
  /** 调整方案审批 - 核安全分析师审批 */
  ADJUSTMENT_APPROVAL = 'adjustment_approval',
}

/**
 * 审批状态枚举
 */
export enum ApprovalStatus {
  /** 待审批 */
  PENDING = 'pending',
  /** 审批通过 */
  APPROVED = 'approved',
  /** 审批驳回 */
  REJECTED = 'rejected',
}

/**
 * 调整类型枚举
 */
export enum AdjustmentType {
  /** 旁通流量优化 */
  BYPASS_FLOW_OPTIMIZATION = 'bypass_flow_optimization',
  /** 控制棒插入深度调整 */
  CONTROL_ROD_DEPTH_ADJUSTMENT = 'control_rod_depth_adjustment',
  /** 入口温度调整 */
  INLET_TEMPERATURE_ADJUSTMENT = 'inlet_temperature_adjustment',
  /** 入口压力调整 */
  INLET_PRESSURE_ADJUSTMENT = 'inlet_pressure_adjustment',
}

// ==================== 接口定义 ====================

/**
 * 用户基本信息接口
 */
export interface User {
  /** 用户唯一标识 */
  id: string;
  /** 用户姓名 */
  name: string;
  /** 用户邮箱 */
  email: string;
  /** 用户角色 */
  role: UserRole;
  /** 用户头像URL */
  avatar?: string;
  /** 所属部门 */
  department?: string;
  /** 联系电话 */
  phone?: string;
}

/**
 * 任务配置参数接口
 */
export interface TaskConfig {
  /** 网格类型 */
  meshType: MeshType;
  /** 网格密度（节点数） */
  meshDensity: number;
  /** 湍流模型 */
  turbulenceModel: TurbulenceModel;
  /** 沸腾传热关联式 */
  boilingCorrelation: BoilingCorrelation;
  /** 冷却剂入口温度（单位：K） */
  inletTemperature: number;
  /** 冷却剂入口压力（单位：MPa） */
  inletPressure: number;
  /** 冷却剂入口流量（单位：kg/s） */
  inletFlowRate: number;
  /** 堆芯额定功率（单位：MW） */
  ratedPower: number;
  /** 轴向功率分布文件路径 */
  axialPowerDistributionFile?: string;
  /** 几何模型文件路径（STEP/STL格式） */
  geometryModelFile?: string;
  /** 燃料棒数量 */
  fuelRodCount: number;
  /** 子通道数量 */
  subChannelCount: number;
  /** 轴向层数 */
  axialLayers: number;
  /** 最大迭代步数 */
  maxIterationSteps: number;
  /** 收敛残差阈值 */
  convergenceThreshold: number;
}

/**
 * 模拟任务接口
 */
export interface Simulation {
  /** 任务唯一标识 */
  id: string;
  /** 任务编号 */
  code: string;
  /** 构型名称 */
  configurationName: string;
  /** 任务描述 */
  description?: string;
  /** 任务当前状态 */
  status: SimulationStatus;
  /** 任务配置参数 */
  config: TaskConfig;
  /** 任务创建人 */
  creator: User;
  /** 任务负责人 */
  assignee?: User;
  /** 任务创建时间 */
  createdAt: Date;
  /** 任务开始时间 */
  startedAt?: Date;
  /** 任务完成时间 */
  completedAt?: Date;
  /** 任务更新时间 */
  updatedAt: Date;
  /** 当前计算进度（0-100） */
  progress: number;
  /** 当前步骤名称 */
  currentStep: string;
  /** 计算耗时（单位：秒） */
  computationTime?: number;
  /** 关联的构型ID */
  configurationId: string;
  /** 连续超限次数 */
  consecutiveOverlimitCount: number;
  /** 标签 */
  tags?: string[];
  /** 备注 */
  remarks?: string;
}

/**
 * 网格通道接口
 */
export interface MeshChannel {
  /** 通道唯一标识 */
  id: string;
  /** 通道编号 */
  channelNumber: number;
  /** 通道类型 */
  channelType: ChannelType;
  /** 行索引 */
  rowIndex: number;
  /** 列索引 */
  columnIndex: number;
  /** 通道中心X坐标 */
  centerX: number;
  /** 通道中心Y坐标 */
  centerY: number;
  /** 通道水力直径（单位：m） */
  hydraulicDiameter: number;
  /** 通道流通面积（单位：m²） */
  flowArea: number;
  /** 通道湿周（单位：m） */
  wettedPerimeter: number;
  /** 相邻通道ID列表 */
  adjacentChannelIds: string[];
  /** 关联的燃料棒ID */
  fuelRodId?: string;
  /** 轴向长度（单位：m） */
  axialLength: number;
}

/**
 * 通道实时温度数据接口
 */
export interface ChannelTemperature {
  /** 通道ID */
  channelId: string;
  /** 通道编号 */
  channelNumber: number;
  /** 轴向位置索引 */
  axialIndex: number;
  /** 轴向位置高度（单位：m） */
  axialHeight: number;
  /** 时间戳 */
  timestamp: Date;
  /** 燃料芯块中心温度（单位：K） */
  pelletCenterTemperature: number;
  /** 包壳内表面温度（单位：K） */
  claddingInnerTemperature: number;
  /** 包壳外表面温度（单位：K） */
  claddingOuterTemperature: number;
  /** 冷却剂温度（单位：K） */
  coolantTemperature: number;
  /** 局部热流密度（单位：W/m²） */
  localHeatFlux: number;
  /** 临界热流密度（单位：W/m²） */
  criticalHeatFlux: number;
  /** CHF比（临界热流密度比） */
  chfRatio: number;
  /** 冷却剂质量流量（单位：kg/s） */
  massFlowRate: number;
  /** 压力（单位：MPa） */
  pressure: number;
  /** 空泡份额 */
  voidFraction: number;
  /** 是否超限 */
  isOverLimit: boolean;
  /** 超限类型 */
  overlimitType?: WarningType;
}

/**
 * 预警接口
 */
export interface Warning {
  /** 预警唯一标识 */
  id: string;
  /** 预警编号 */
  code: string;
  /** 预警类型 */
  type: WarningType;
  /** 严重等级 */
  severity: WarningSeverity;
  /** 关联的模拟任务ID */
  simulationId: string;
  /** 关联的模拟任务名称 */
  simulationName: string;
  /** 触发预警的通道ID */
  channelId?: string;
  /** 触发预警的通道编号 */
  channelNumber?: number;
  /** 触发条件描述 */
  triggerCondition: string;
  /** 当前值 */
  currentValue: number;
  /** 安全限值 */
  safetyLimit: number;
  /** 超限百分比 */
  overlimitPercentage: number;
  /** 触发时间 */
  triggeredAt: Date;
  /** 预警处理截止时间 */
  deadline?: Date;
  /** 预警状态：true已处理，false未处理 */
  isHandled: boolean;
  /** 处理时间 */
  handledAt?: Date;
  /** 处理人 */
  handledBy?: User;
  /** 处理结果说明 */
  handlingResult?: string;
  /** 建议措施 */
  recommendedActions?: string[];
  /** 关联的调整方案ID */
  relatedAdjustmentId?: string;
}

/**
 * 参数调整前后对比接口
 */
export interface ParameterComparison {
  /** 参数名称 */
  parameterName: string;
  /** 调整前值 */
  beforeValue: number;
  /** 调整后值 */
  afterValue: number;
  /** 变化量 */
  delta: number;
  /** 变化百分比 */
  deltaPercentage: number;
  /** 单位 */
  unit: string;
}

/**
 * 调整日志接口
 */
export interface AdjustmentLog {
  /** 日志唯一标识 */
  id: string;
  /** 调整编号 */
  code: string;
  /** 调整类型 */
  adjustmentType: AdjustmentType;
  /** 关联的模拟任务ID */
  simulationId: string;
  /** 关联的预警ID */
  warningId?: string;
  /** 调整原因 */
  reason: string;
  /** 参数调整对比列表 */
  parameterComparisons: ParameterComparison[];
  /** 调整前安全指标快照 */
  safetyIndicatorsBefore: {
    /** 最小CHF比 */
    minChfRatio: number;
    /** 最高包壳温度（K） */
    maxCladdingTemperature: number;
    /** 最高芯块温度（K） */
    maxPelletTemperature: number;
  };
  /** 调整后安全指标预估 */
  safetyIndicatorsAfter: {
    /** 最小CHF比预估 */
    minChfRatio: number;
    /** 最高包壳温度预估（K） */
    maxCladdingTemperature: number;
    /** 最高芯块温度预估（K） */
    maxPelletTemperature: number;
  };
  /** 调整人 */
  adjustedBy: User;
  /** 调整时间 */
  adjustedAt: Date;
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 审批状态 */
  approvalStatus?: ApprovalStatus;
  /** 审批人 */
  approvedBy?: User;
  /** 审批时间 */
  approvedAt?: Date;
  /** 审批意见 */
  approvalComment?: string;
  /** 调整后计算结果是否生效 */
  isEffective: boolean;
  /** 生效时间 */
  effectiveAt?: Date;
}

/**
 * 审批项接口
 */
export interface ApprovalItem {
  /** 审批项唯一标识 */
  id: string;
  /** 审批项编号 */
  code: string;
  /** 审批类型 */
  approvalType: ApprovalType;
  /** 关联的模拟任务ID */
  simulationId: string;
  /** 关联的模拟任务名称 */
  simulationName: string;
  /** 关联的调整日志ID（仅调整方案审批时有值） */
  adjustmentLogId?: string;
  /** 审批标题 */
  title: string;
  /** 审批详情描述 */
  description: string;
  /** 需要审批的附件文件列表 */
  attachments?: string[];
  /** 提交人 */
  submitter: User;
  /** 提交时间 */
  submittedAt: Date;
  /** 审批状态 */
  status: ApprovalStatus;
  /** 指定审批人 */
  approver: User;
  /** 审批截止时间 */
  deadline?: Date;
  /** 审批时间 */
  approvedAt?: Date;
  /** 审批意见 */
  approvalComment?: string;
  /** 电子签名 */
  electronicSignature?: string;
  /** 模型假设验证项列表（仅模型验证审批时有值） */
  modelValidationItems?: {
    /** 验证项名称 */
    itemName: string;
    /** 验证项描述 */
    description: string;
    /** 是否通过 */
    isPassed: boolean;
    /** 验证说明 */
    remark?: string;
  }[];
  /** 计算收敛性验证指标（仅模型验证审批时有值） */
  convergenceMetrics?: {
    /** 质量守恒残差 */
    massResidual: number;
    /** 动量守恒残差 */
    momentumResidual: number;
    /** 能量守恒残差 */
    energyResidual: number;
    /** 是否收敛 */
    isConverged: boolean;
  };
  /** 事故后果确认项（仅事故后果确认时有值） */
  consequenceItems?: {
    /** 确认项名称 */
    itemName: string;
    /** 后果描述 */
    description: string;
    /** 严重程度 */
    severity: string;
    /** 是否已确认 */
    isConfirmed: boolean;
  }[];
}

/**
 * 安全裕量接口
 */
export interface SafetyMargins {
  /** 温度裕量（单位：K） - 最高包壳温度与安全限值差值 */
  temperatureMargin: number;
  /** CHF裕量 - 最小CHF比与安全阈值（1.3）差值 */
  chfMargin: number;
  /** 流量裕量（%） - 实际流量与最小要求流量差值百分比 */
  flowMargin: number;
  /** 压力裕量（单位：MPa） - 实际压力与最大允许压力差值 */
  pressureMargin: number;
  /** 功率裕量（%） - 额定功率与实际功率差值百分比 */
  powerMargin: number;
  /** 综合安全裕量评分（0-100） */
  overallScore: number;
}

/**
 * 模拟报告接口
 */
export interface SimulationReport {
  /** 报告唯一标识 */
  id: string;
  /** 报告编号 */
  code: string;
  /** 关联的模拟任务ID */
  simulationId: string;
  /** 关联的模拟任务名称 */
  simulationName: string;
  /** 报告标题 */
  title: string;
  /** 报告版本号 */
  version: string;
  /** 报告生成时间 */
  generatedAt: Date;
  /** 报告生成人 */
  generatedBy: User;
  /** 报告摘要 */
  summary: string;
  /** 任务配置参数快照 */
  taskConfigSnapshot: TaskConfig;
  /** 关键计算结果 */
  keyResults: {
    /** 最高燃料芯块温度（单位：K） */
    maxPelletTemperature: number;
    /** 最高包壳表面温度（单位：K） */
    maxCladdingTemperature: number;
    /** 最高冷却剂温度（单位：K） */
    maxCoolantTemperature: number;
    /** 最小临界热流密度比 */
    minChfRatio: number;
    /** 出现CHF比最小值的通道编号 */
    minChfChannelNumber?: number;
    /** 平均包壳温度（单位：K） */
    averageCladdingTemperature: number;
    /** 总压降（单位：MPa） */
    totalPressureDrop: number;
    /** 堆芯出口温度（单位：K） */
    coreOutletTemperature: number;
  };
  /** 安全裕量评估 */
  safetyMargins: SafetyMargins;
  /** 预警统计 */
  warningStatistics: {
    /** 预警总数 */
    totalCount: number;
    /** 各严重等级数量 */
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    /** 各类型数量 */
    byType: Record<WarningType, number>;
  };
  /** 调整日志摘要 */
  adjustmentSummaries: {
    /** 调整日志ID */
    adjustmentId: string;
    /** 调整类型 */
    adjustmentType: AdjustmentType;
    /** 调整时间 */
    adjustedAt: Date;
    /** 调整效果简述 */
    effectDescription: string;
  }[];
  /** 报告章节列表 */
  sections: {
    /** 章节ID */
    sectionId: string;
    /** 章节标题 */
    title: string;
    /** 章节页码 */
    pageNumber: number;
  }[];
  /** PDF报告文件路径 */
  pdfFilePath?: string;
  /** Excel数据文件路径 */
  excelFilePath?: string;
  /** 报告分享链接 */
  shareLink?: string;
  /** 审批状态 */
  approvalStatus: ApprovalStatus;
  /** 是否已分发 */
  isDistributed: boolean;
  /** 分发时间 */
  distributedAt?: Date;
  /** 接收部门列表 */
  recipientDepartments?: string[];
}

/**
 * 构型风险接口
 */
export interface ConfigurationRisk {
  /** 风险记录唯一标识 */
  id: string;
  /** 构型ID */
  configurationId: string;
  /** 构型名称 */
  configurationName: string;
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 连续超限次数 */
  consecutiveOverlimitCount: number;
  /** 超限历史记录ID列表 */
  overlimitHistoryIds: string[];
  /** 首次超限时间 */
  firstOverlimitAt: Date;
  /** 最近一次超限时间 */
  lastOverlimitAt: Date;
  /** 当前状态：true已暂停，false正常运行 */
  isSuspended: boolean;
  /** 暂停时间 */
  suspendedAt?: Date;
  /** 暂停原因 */
  suspensionReason?: string;
  /** 暂停通知接收人 */
  suspensionNotifiedUsers?: User[];
  /** 恢复申请ID */
  recoveryRequestId?: string;
  /** 恢复申请时间 */
  recoveryRequestedAt?: Date;
  /** 恢复申请人 */
  recoveryRequestedBy?: User;
  /** 恢复申请理由 */
  recoveryReason?: string;
  /** 是否已恢复 */
  isRecovered: boolean;
  /** 恢复时间 */
  recoveredAt?: Date;
  /** 恢复审批人 */
  recoveredBy?: User;
  /** 处理建议 */
  handlingRecommendations?: string[];
  /** 备注 */
  remarks?: string;
}

/**
 * 每日统计接口
 */
export interface DailyStatistics {
  /** 统计日期 */
  date: Date;
  /** 新建任务数 */
  newTaskCount: number;
  /** 完成任务数 */
  completedTaskCount: number;
  /** 进行中任务数 */
  inProgressTaskCount: number;
  /** 异常回退任务数 */
  abnormalRollbackCount: number;
  /** 模拟完成率（%） */
  completionRate: number;
  /** 预警触发总数 */
  warningTotalCount: number;
  /** 已处理预警数 */
  warningHandledCount: number;
  /** 预警平均处理时长（单位：分钟） */
  warningAverageHandlingTime: number;
  /** 平均事故分析耗时（单位：分钟） */
  averageAccidentAnalysisTime: number;
  /** 平均模拟计算耗时（单位：分钟） */
  averageSimulationTime: number;
  /** CHF比最小值当日统计 */
  chfRatioStatistics: {
    /** 当日所有任务最小CHF比的平均值 */
    averageMinChfRatio: number;
    /** 当日最小CHF比 */
    minChfRatio: number;
    /** 当日CHF比<1.3的任务数 */
    belowThresholdCount: number;
    /** CHF比分布直方图数据 */
    distribution: {
      /** 区间下限 */
      rangeStart: number;
      /** 区间上限 */
      rangeEnd: number;
      /** 落入该区间的任务数 */
      count: number;
    }[];
  };
  /** 安全裕量当日平均 */
  averageSafetyMargins: SafetyMargins;
  /** 审批统计 */
  approvalStatistics: {
    /** 待审批数 */
    pendingCount: number;
    /** 审批通过数 */
    approvedCount: number;
    /** 审批驳回数 */
    rejectedCount: number;
    /** 平均审批时长（单位：分钟） */
    averageApprovalTime: number;
  };
  /** 构型风险统计 */
  configurationRiskStatistics: {
    /** 高风险构型数 */
    highRiskCount: number;
    /** 中风险构型数 */
    mediumRiskCount: number;
    /** 已暂停构型数 */
    suspendedCount: number;
  };
}

/**
 * 推荐方案接口
 */
export interface Recommendation {
  /** 推荐方案唯一标识 */
  id: string;
  /** 推荐方案编号 */
  code: string;
  /** 关联的构型ID */
  configurationId: string;
  /** 关联的构型名称 */
  configurationName: string;
  /** 推荐方案标题 */
  title: string;
  /** 推荐方案描述 */
  description: string;
  /** 推荐方案类型 */
  recommendationType: 'flow_distribution' | 'control_rod' | 'parameter_optimization' | 'comprehensive';
  /** 推荐的参数配置 */
  recommendedConfig: Partial<TaskConfig>;
  /** 推荐的旁通流量分配方案 */
  bypassFlowDistribution?: {
    /** 通道编号 */
    channelNumber: number;
    /** 推荐流量（单位：kg/s） */
    recommendedFlow: number;
    /** 原流量（单位：kg/s） */
    originalFlow: number;
  }[];
  /** 推荐的控制棒组调整方案 */
  controlRodAdjustments?: {
    /** 控制棒组名称 */
    rodGroupName: string;
    /** 原插入深度（单位：%） */
    originalDepth: number;
    /** 推荐插入深度（单位：%） */
    recommendedDepth: number;
    /** 反应性预估变化（单位：pcm） */
    reactivityChange: number;
  }[];
  /** 安全裕量提升预估 */
  safetyMarginImprovement: {
    /** 方案前安全裕量 */
    before: SafetyMargins;
    /** 方案后预估安全裕量 */
    after: SafetyMargins;
    /** 各维度提升百分比 */
    improvements: {
      /** 温度裕量提升百分比 */
      temperatureMargin: number;
      /** CHF裕量提升百分比 */
      chfMargin: number;
      /** 流量裕量提升百分比 */
      flowMargin: number;
      /** 综合评分提升百分比 */
      overallScore: number;
    };
  };
  /** 推荐置信度（0-1） */
  confidence: number;
  /** 历史相似案例ID列表 */
  similarCaseIds: string[];
  /** 历史相似案例匹配度（0-1） */
  similarCaseMatchScore?: number;
  /** 历史成功率（%） */
  historicalSuccessRate: number;
  /** 推荐生成时间 */
  generatedAt: Date;
  /** 是否已应用 */
  isApplied: boolean;
  /** 应用时间 */
  appliedAt?: Date;
  /** 应用人 */
  appliedBy?: User;
  /** 应用后生成的模拟任务ID */
  appliedSimulationId?: string;
  /** 推荐人（AI/用户名） */
  recommendedBy: string;
}
