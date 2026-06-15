import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Play,
  Grid3X3,
  FileText,
  Trash2,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Tag,
  Box,
  Thermometer,
  Gauge,
  Waves,
  Layers,
  Wind,
  Flame,
  FileArchive,
  FileSpreadsheet,
  ListChecks,
  History,
  Shield,
  ChevronRight,
  XCircle,
  PauseCircle,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { useAppStore, type Simulation, type SimulationStatus } from '@/store/useAppStore';

const STATUS_FLOW: { id: number; key: SimulationStatus | 'approved'; label: string; short: string }[] = [
  { id: 1, key: 'pending_validation', label: '待校验', short: '校验' },
  { id: 2, key: 'mesh_generation', label: '网格生成', short: '网格' },
  { id: 3, key: 'thermal_calculation', label: '热工计算', short: '热工' },
  { id: 4, key: 'accident_analysis', label: '事故分析', short: '事故' },
  { id: 5, key: 'completed', label: '计算完成', short: '完成' },
  { id: 6, key: 'approved', label: '审批通过', short: '审批' },
];

const STATUS_META: Record<SimulationStatus, { label: string; badgeClass: string; desc: string }> = {
  pending_validation: {
    label: '待校验',
    badgeClass: 'status-badge-info',
    desc: '任务创建完成，等待模型合理性校验',
  },
  mesh_generation: {
    label: '网格生成中',
    badgeClass: 'status-badge-primary',
    desc: '校验通过，正在生成子通道网格',
  },
  thermal_calculation: {
    label: '热工计算中',
    badgeClass: 'status-badge-primary',
    desc: '网格生成完成，正在进行热工水力迭代计算',
  },
  accident_analysis: {
    label: '事故分析中',
    badgeClass: 'status-badge-warning',
    desc: '热工计算完成，正在进行事故进程时序模拟',
  },
  completed: {
    label: '计算完成',
    badgeClass: 'status-badge-success',
    desc: '全部计算流程完成，等待结果审批',
  },
  exception_rollback: {
    label: '异常回退',
    badgeClass: 'status-badge-danger',
    desc: '校验或计算失败，已返回上一步重新配置',
  },
  paused: {
    label: '已暂停',
    badgeClass: 'status-badge-warning',
    desc: '构型连续超限，任务被系统自动暂停',
  },
};

const TABS = [
  { id: 'channels', label: '通道数据预览', icon: Grid3X3 },
  { id: 'adjustments', label: '调整日志', icon: History },
  { id: 'approvals', label: '审批记录', icon: Shield },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function SimulationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    simulations,
    currentUser,
    warnings,
    adjustmentLogs,
    approvals,
    setCurrentSimulation,
    updateSimulationStatus,
    generateReport,
    reports,
    deleteSimulation,
    getChannelData,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'channels' | 'adjustments' | 'approvals'>('channels');
  const [isStarting, setIsStarting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const sim: Simulation | undefined = useMemo(
    () => simulations.find((s) => s.id === id),
    [simulations, id]
  );

  const simWarnings = useMemo(() => warnings.filter((w) => w.simulationId === id), [warnings, id]);
  const simAdjustments = useMemo(
    () => adjustmentLogs.filter((a) => a.simulationId === id),
    [adjustmentLogs, id]
  );
  const simApprovals = useMemo(
    () => approvals.filter((a) => a.simulationId === id),
    [approvals, id]
  );
  const channelData = useMemo(() => (id ? getChannelData(id) : []), [getChannelData, id]);
  const simReport = reports.find((r) => r.simulationId === id);

  useEffect(() => {
    if (sim) setCurrentSimulation(sim);
  }, [sim, setCurrentSimulation]);

  useEffect(() => {
    if (!sim) return;
    if (sim.status === 'completed' && simReport) return;
    if (sim.status === 'completed' && !simReport) {
      const timer = setTimeout(() => {
        generateReport(sim.id, currentUser.username);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sim, simReport, generateReport, currentUser.username]);

  if (!sim) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-danger/60 mb-4" />
          <h2 className="font-display text-xl font-bold text-white/80 mb-2">任务不存在</h2>
          <p className="text-sm text-white/50 mb-6">
            无法找到ID为 <span className="font-mono text-danger">{id}</span> 的模拟任务
          </p>
          <button onClick={() => navigate('/simulations')} className="glow-btn">
            <ArrowLeft size={16} className="mr-2" />
            返回任务列表
          </button>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[sim.status];

  const getFlowState = () => {
    let currentIdx = 0;
    const statusOrder: SimulationStatus[] = [
      'pending_validation',
      'mesh_generation',
      'thermal_calculation',
      'accident_analysis',
      'completed',
    ];
    const idx = statusOrder.indexOf(sim.status);
    if (idx >= 0) currentIdx = idx;
    if (sim.status === 'exception_rollback') currentIdx = 0;
    if (sim.status === 'paused') currentIdx = statusOrder.indexOf('thermal_calculation');
    const hasApproval = simApprovals.some((a) => a.status === 'approved');
    return { currentIdx, hasApproval };
  };

  const { currentIdx, hasApproval } = getFlowState();

  const handleStart = () => {
    if (sim.status !== 'pending_validation' && sim.status !== 'exception_rollback') return;
    setIsStarting(true);
    updateSimulationStatus(sim.id, 'mesh_generation');
    setTimeout(() => {
      setIsStarting(false);
    }, 1000);
  };

  const handleDelete = () => {
    deleteSimulation?.(sim.id);
    navigate('/simulations');
  };

  const kelvinToCelsius = (k: number) => (k - 273.15).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={() => navigate('/simulations')}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-primary transition-colors font-display"
        >
          <ArrowLeft size={16} />
          返回任务列表
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStart}
            disabled={
              isStarting ||
              (sim.status !== 'pending_validation' && sim.status !== 'exception_rollback')
            }
            className="glow-btn disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                启动中...
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                启动计算
              </>
            )}
          </button>
          <button
            onClick={() => navigate(`/simulations/${sim.id}/mesh`)}
            className="px-5 py-2.5 rounded-lg border border-white/20 text-white/80 hover:text-primary hover:border-primary/50 hover:bg-primary/10 transition-all font-display text-sm flex items-center gap-2"
          >
            <Grid3X3 size={16} />
            查看网格
          </button>
          <button
            onClick={() => {
              if (simReport) navigate(`/reports/${simReport.id}`);
            }}
            disabled={sim.status !== 'completed' || !simReport}
            className="px-5 py-2.5 rounded-lg border border-success/30 text-success/80 hover:text-success hover:bg-success/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-display text-sm flex items-center gap-2"
          >
            <FileText size={16} />
            查看报告
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2.5 rounded-lg border border-danger/30 text-danger/80 hover:text-danger hover:bg-danger/10 transition-all font-display text-sm flex items-center gap-2"
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold text-gradient">{sim.name}</h1>
              <span className={`status-badge ${meta.badgeClass}`}>{meta.label}</span>
            </div>
            <p className="text-sm text-white/50 font-mono">任务ID: {sim.id}</p>
            <p className="text-xs text-white/40 mt-1">{meta.desc}</p>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar size={14} className="text-primary/70" />
              <span>创建: {formatDateTime(sim.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Clock size={14} className="text-warning/70" />
              <span>更新: {formatDateTime(sim.updatedAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <User size={14} className="text-info/70" />
              <span>负责人: {currentUser.username}</span>
            </div>
          </div>
        </div>

        <div className="relative py-2">
          <div className="absolute top-7 left-12 right-12 h-0.5 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-success transition-all duration-700"
              style={{ width: `${Math.min(100, (currentIdx + (hasApproval ? 1 : 0.3)) * 20)}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {STATUS_FLOW.map((node, idx) => {
              let state: 'done' | 'current' | 'pending' = 'pending';
              if (idx < currentIdx) state = 'done';
              else if (idx === currentIdx) state = 'current';
              if (idx === 5) {
                if (hasApproval) state = 'done';
                else if (currentIdx >= 4) state = 'pending';
                else state = 'pending';
              }
              const isAbnormal = (sim.status === 'exception_rollback' || sim.status === 'paused') && idx === currentIdx;
              return (
                <div key={node.id} className="flex flex-col items-center w-1/6 relative z-10">
                  <div
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
                      state === 'done'
                        ? 'bg-success/20 border-2 border-success/60 text-success shadow-[0_0_20px_rgba(0,200,83,0.3)]'
                        : state === 'current'
                        ? isAbnormal
                          ? 'bg-danger/20 border-2 border-danger text-danger animate-pulse-glow shadow-[0_0_25px_rgba(255,82,82,0.4)]'
                          : 'bg-primary/20 border-2 border-primary text-primary animate-pulse-glow shadow-[0_0_25px_rgba(0,212,255,0.4)]'
                        : 'bg-white/5 border-2 border-white/15 text-white/30'
                    }`}
                  >
                    {state === 'done' ? (
                      <Check size={22} strokeWidth={3} />
                    ) : isAbnormal ? (
                      sim.status === 'paused' ? (
                        <PauseCircle size={22} />
                      ) : (
                        <XCircle size={22} />
                      )
                    ) : (
                      <span className="font-display font-bold text-lg">{node.id}</span>
                    )}
                    {state === 'current' && (
                      <div className="absolute -inset-1 rounded-full border border-primary/40 animate-ping opacity-60" />
                    )}
                  </div>
                  <div
                    className={`mt-3 text-center ${
                      state === 'done'
                        ? 'text-success'
                        : state === 'current'
                        ? isAbnormal
                          ? 'text-danger'
                          : 'text-primary glow-text'
                        : 'text-white/40'
                    }`}
                  >
                    <div className="font-display text-xs font-bold uppercase tracking-wider">
                      {node.label}
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5">{node.short}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(sim.status === 'exception_rollback' || sim.status === 'paused') && (
          <div className="mt-6 p-4 rounded-xl flex items-start gap-3 bg-danger/10 border border-danger/30">
            <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-bold text-sm text-danger mb-1">
                {sim.status === 'paused' ? '任务已暂停' : '任务异常回退'}
              </div>
              <div className="text-xs text-white/70">
                {sim.status === 'paused'
                  ? `构型 ${sim.configurationName} 连续超限次数达到阈值，系统已自动暂停。请核查构型风险后再恢复。`
                  : `计算过程中出现异常，已回退至初始状态。建议检查输入文件与参数配置后重新启动。`}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
              <Box size={18} className="text-primary" />
              基础信息与参数配置
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3 p-4 rounded-xl bg-white/3 border border-white/10">
                <div className="text-xs font-display uppercase tracking-wider text-white/50 mb-3">
                  <Tag size={12} className="inline mr-1.5" />
                  任务标识
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">构型名称</span>
                  <span className="text-white/90">{sim.configurationName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">构型Hash</span>
                  <span className="font-mono text-xs text-primary">{sim.configurationHash}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">子通道数</span>
                  <span className="font-mono text-white/90">{sim.channelCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">计算进度</span>
                  <span className="font-mono font-bold text-primary">{sim.progress}%</span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-white/3 border border-white/10">
                <div className="text-xs font-display uppercase tracking-wider text-white/50 mb-3">
                  <FileArchive size={12} className="inline mr-1.5" />
                  输入文件
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <FileArchive size={12} className="text-primary/60" />
                    几何模型
                  </span>
                  <span className="status-badge status-badge-success !py-0.5 !px-2 !text-[10px]">
                    <Check size={8} />
                    已上传
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <FileSpreadsheet size={12} className="text-primary/60" />
                    功率分布
                  </span>
                  <span className="status-badge status-badge-success !py-0.5 !px-2 !text-[10px]">
                    <Check size={8} />
                    已上传
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">网格类型</span>
                  <span className="text-white/90 text-xs font-mono">{sim.gridType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">预警数</span>
                  <span className={`font-mono font-bold ${simWarnings.length > 0 ? 'text-warning' : 'text-success'}`}>
                    {simWarnings.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-white/3 border border-white/10">
                <div className="text-xs font-display uppercase tracking-wider text-white/50 mb-3">
                  <Thermometer size={12} className="inline mr-1.5" />
                  入口边界条件
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Thermometer size={12} className="text-warning/60" />
                    入口温度
                  </span>
                  <span className="font-mono text-warning">{kelvinToCelsius(sim.inletTemp)}°C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Gauge size={12} className="text-info/60" />
                    入口压力
                  </span>
                  <span className="font-mono text-info">{sim.inletPressure.toFixed(1)} MPa</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Waves size={12} className="text-primary/60" />
                    入口流量
                  </span>
                  <span className="font-mono text-primary">{sim.inletFlowRate.toLocaleString()} kg/s</span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-xl bg-white/3 border border-white/10">
                <div className="text-xs font-display uppercase tracking-wider text-white/50 mb-3">
                  <Layers size={12} className="inline mr-1.5" />
                  物理模型
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Grid3X3 size={12} className="text-primary/60" />
                    网格类型
                  </span>
                  <span className="text-white/90 text-xs">
                    {sim.gridType.includes('hex') ? '六边形' : '矩形'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Wind size={12} className="text-info/60" />
                    湍流模型
                  </span>
                  <span className="font-mono text-white/90 text-xs">{sim.turbulenceModel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60 flex items-center gap-1.5">
                    <Flame size={12} className="text-warning/60" />
                    沸腾模型
                  </span>
                  <span className="font-mono text-white/90 text-xs">{sim.boilingModel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">审批项</span>
                  <span className="font-mono text-white/90 text-xs">
                    {simApprovals.length} 项
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="flex border-b border-white/10">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-display text-sm transition-all relative ${
                      active
                        ? 'text-primary'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                    {active && (
                      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-6 min-h-[360px]">
              {activeTab === 'channels' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-white/80 flex items-center gap-2">
                      <Grid3X3 size={16} className="text-primary" />
                      通道温度数据预览
                    </h3>
                    <span className="text-xs text-white/40 font-mono">
                      共 {channelData.length} 条记录
                    </span>
                  </div>
                  {channelData.length === 0 ? (
                    <div className="py-16 text-center">
                      <Eye size={40} className="mx-auto text-white/20 mb-3" />
                      <p className="text-white/50 text-sm font-display">暂无通道数据</p>
                      <p className="text-white/30 text-xs mt-1">启动计算后将显示实时温度数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-2 px-3 text-left text-xs font-display uppercase text-white/50">
                              通道
                            </th>
                            <th className="py-2 px-3 text-right text-xs font-display uppercase text-white/50">
                              芯块温度
                            </th>
                            <th className="py-2 px-3 text-right text-xs font-display uppercase text-white/50">
                              包壳温度
                            </th>
                            <th className="py-2 px-3 text-right text-xs font-display uppercase text-white/50">
                              冷却剂温度
                            </th>
                            <th className="py-2 px-3 text-right text-xs font-display uppercase text-white/50">
                              CHF比
                            </th>
                            <th className="py-2 px-3 text-right text-xs font-display uppercase text-white/50">
                              热流密度
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {channelData.slice(0, 12).map((d, i) => {
                            const overTemp = d.pelletCenterTemp > 1477;
                            const overChf = d.chfRatio < 1.15;
                            return (
                              <tr key={i} className="hover:bg-white/5">
                                <td className="py-2 px-3 font-mono text-primary text-xs">
                                  {d.channelId}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono text-xs ${
                                    overTemp ? 'text-danger font-bold' : 'text-warning'
                                  }`}
                                >
                                  {kelvinToCelsius(d.pelletCenterTemp)}°C
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-xs text-warning/90">
                                  {kelvinToCelsius(d.claddingSurfaceTemp)}°C
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-xs text-info">
                                  {kelvinToCelsius(d.coolantTemp)}°C
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-mono text-xs ${
                                    overChf ? 'text-danger font-bold' : 'text-success'
                                  }`}
                                >
                                  {d.chfRatio.toFixed(3)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-xs text-white/70">
                                  {(d.heatFlux / 1000).toFixed(0)} kW/m²
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'adjustments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-white/80 flex items-center gap-2">
                      <History size={16} className="text-primary" />
                      参数调整日志
                    </h3>
                    <span className="text-xs text-white/40 font-mono">
                      共 {simAdjustments.length} 条记录
                    </span>
                  </div>
                  {simAdjustments.length === 0 ? (
                    <div className="py-16 text-center">
                      <History size={40} className="mx-auto text-white/20 mb-3" />
                      <p className="text-white/50 text-sm font-display">暂无调整记录</p>
                      <p className="text-white/30 text-xs mt-1">预警处理后将生成调整日志</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simAdjustments.map((a) => (
                        <div
                          key={a.id}
                          className="p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-info/15 border border-info/30 flex items-center justify-center">
                                <History size={14} className="text-info" />
                              </div>
                              <div>
                                <div className="font-display font-bold text-sm text-white/90">
                                  {a.type === 'bypass_flow' ? '旁通流量调整' : '控制棒深度调整'}
                                </div>
                                <div className="text-xs text-white/40 font-mono">
                                  {formatDateTime(a.timestamp)}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-white/50 font-display">
                              操作人: {a.operator}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="p-2 rounded-lg bg-white/5">
                              <div className="text-xs text-white/50 mb-1">调整前</div>
                              <div className="font-mono text-warning">{a.beforeValue}</div>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 text-center">
                              <ChevronRight size={20} className="mx-auto text-primary/60" />
                              <div className="text-[10px] text-white/40 mt-1">变更</div>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5">
                              <div className="text-xs text-white/50 mb-1">调整后</div>
                              <div className="font-mono text-success">{a.afterValue}</div>
                            </div>
                          </div>
                          {a.comment && (
                            <p className="mt-3 text-xs text-white/60 pl-2 border-l-2 border-primary/40">
                              {a.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'approvals' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-white/80 flex items-center gap-2">
                      <Shield size={16} className="text-primary" />
                      审批流程记录
                    </h3>
                    <span className="text-xs text-white/40 font-mono">
                      共 {simApprovals.length} 项审批
                    </span>
                  </div>
                  {simApprovals.length === 0 ? (
                    <div className="py-16 text-center">
                      <Shield size={40} className="mx-auto text-white/20 mb-3" />
                      <p className="text-white/50 text-sm font-display">暂无审批记录</p>
                      <p className="text-white/30 text-xs mt-1">计算完成后可提交审批</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simApprovals.map((a) => (
                        <div
                          key={a.id}
                          className={`p-4 rounded-xl border ${
                            a.status === 'approved'
                              ? 'bg-success/5 border-success/20'
                              : a.status === 'rejected'
                              ? 'bg-danger/5 border-danger/20'
                              : 'bg-white/3 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  a.status === 'approved'
                                    ? 'bg-success/15 border border-success/30'
                                    : a.status === 'rejected'
                                    ? 'bg-danger/15 border border-danger/30'
                                    : 'bg-warning/15 border border-warning/30'
                                }`}
                              >
                                <ListChecks
                                  size={18}
                                  className={
                                    a.status === 'approved'
                                      ? 'text-success'
                                      : a.status === 'rejected'
                                      ? 'text-danger'
                                      : 'text-warning'
                                  }
                                />
                              </div>
                              <div>
                                <div className="font-display font-bold text-sm text-white/90">
                                  {a.level === 'engineer_verify' ? '热工工程师验证' : '总工最终确认'}
                                </div>
                                <div className="text-xs text-white/40 font-mono">
                                  提交: {formatDateTime(a.createdAt)}
                                </div>
                              </div>
                            </div>
                            <span
                              className={`status-badge ${
                                a.status === 'approved'
                                  ? 'status-badge-success'
                                  : a.status === 'rejected'
                                  ? 'status-badge-danger'
                                  : 'status-badge-warning'
                              }`}
                            >
                              {a.status === 'approved'
                                ? '已通过'
                                : a.status === 'rejected'
                                ? '已驳回'
                                : '待审批'}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {a.items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5"
                              >
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    it.result === 'pass'
                                      ? 'bg-success/20 text-success'
                                      : it.result === 'fail'
                                      ? 'bg-danger/20 text-danger'
                                      : 'bg-white/10 text-white/40'
                                  }`}
                                >
                                  {it.result === 'pass' ? (
                                    <Check size={12} strokeWidth={3} />
                                  ) : it.result === 'fail' ? (
                                    <XCircle size={12} />
                                  ) : (
                                    '-'
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm text-white/85">{it.name}</div>
                                  <div className="text-xs text-white/40">{it.description}</div>
                                  {it.comment && (
                                    <div className="text-xs text-info/80 mt-1">{it.comment}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/75">
                            <div className="text-xs text-white/50 mb-1">
                              提交人: {a.submitter} → 审批人: {a.assignee}
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-white/40 shrink-0">总体意见:</span>
                              <span>{a.overallComment}</span>
                            </div>
                          </div>

                          {a.signedBy && (
                            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                              <div className="text-white/50">
                                签署:
                                <span className="text-primary font-mono ml-1">{a.signedBy}</span>
                                {a.signedAt && (
                                  <span className="text-white/40 ml-2">
                                    @ {formatDateTime(a.signedAt)}
                                  </span>
                                )}
                              </div>
                              {a.signComment && (
                                <span className="text-white/60 italic">"{a.signComment}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              计算进度
            </h2>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">总体进度</span>
                <span className="font-display font-bold text-2xl text-primary">{sim.progress}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-info to-primary rounded-full transition-all duration-700 relative"
                  style={{ width: `${sim.progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { label: '模型校验', value: sim.status === 'pending_validation' ? 50 : 100, done: sim.status !== 'pending_validation' },
                { label: '网格生成', value: sim.status === 'mesh_generation' ? sim.progress : sim.status === 'pending_validation' ? 0 : 100, done: currentIdx >= 2 },
                { label: '热工计算', value: sim.status === 'thermal_calculation' ? sim.progress : currentIdx < 2 ? 0 : currentIdx > 2 ? 100 : sim.progress, done: currentIdx >= 3 },
                { label: '事故分析', value: sim.status === 'accident_analysis' ? sim.progress : currentIdx < 3 ? 0 : currentIdx > 3 ? 100 : sim.progress, done: currentIdx >= 4 },
                { label: '报告生成', value: sim.status === 'completed' ? (simReport ? 100 : 70) : 0, done: !!simReport },
              ].map((p, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`flex items-center gap-1.5 ${p.done ? 'text-success' : 'text-white/60'}`}>
                      {p.done ? <Check size={11} /> : <div className="w-2 h-2 rounded-full bg-primary/50" />}
                      {p.label}
                    </span>
                    <span className="font-mono text-white/50">{Math.round(p.value)}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        p.done
                          ? 'bg-gradient-to-r from-success to-success/60'
                          : 'bg-gradient-to-r from-primary to-info'
                      }`}
                      style={{ width: `${p.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              预警摘要
            </h2>
            {simWarnings.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-success/10 border border-success/30 flex items-center justify-center mb-3">
                  <Check size={24} className="text-success" />
                </div>
                <p className="text-sm text-success/90 font-display">暂无预警</p>
                <p className="text-xs text-white/40 mt-1">所有参数均在安全范围内</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {['critical', 'warning', 'info'].map((sev) => {
                  const count = simWarnings.filter((w) => w.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <div
                      key={sev}
                      className={`p-3 rounded-xl flex items-center justify-between ${
                        sev === 'critical'
                          ? 'bg-danger/10 border border-danger/20'
                          : sev === 'warning'
                          ? 'bg-warning/10 border border-warning/20'
                          : 'bg-info/10 border border-info/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          size={16}
                          className={
                            sev === 'critical'
                              ? 'text-danger'
                              : sev === 'warning'
                              ? 'text-warning'
                              : 'text-info'
                          }
                        />
                        <span className="text-sm text-white/80">
                          {sev === 'critical'
                            ? '紧急预警'
                            : sev === 'warning'
                            ? '一般警告'
                            : '提示信息'}
                        </span>
                      </div>
                      <span
                        className={`font-display font-bold text-lg ${
                          sev === 'critical'
                            ? 'text-danger'
                            : sev === 'warning'
                            ? 'text-warning'
                            : 'text-info'
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                  );
                })}
                <button
                  onClick={() => navigate('/warnings')}
                  className="w-full mt-3 py-2 rounded-lg border border-white/15 text-xs text-white/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all font-display flex items-center justify-center gap-1.5"
                >
                  查看预警中心
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="font-display text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-success" />
              模拟报告
            </h2>
            {!simReport ? (
              <div className="py-6 text-center">
                <FileText size={36} className="mx-auto text-white/20 mb-2" />
                <p className="text-sm text-white/50 font-display">报告生成中</p>
                <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-success/50 to-success rounded-full animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Check size={14} className="text-success" />
                    <span className="text-sm font-display text-success">报告已生成</span>
                  </div>
                  <div className="text-xs text-white/50 font-mono">
                    {formatDateTime(simReport.generatedAt)}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    生成人: {simReport.generatedBy}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/5 text-center">
                    <div className="text-warning/90 font-mono font-bold">
                      {simReport.safetyMargins.temperatureMargin.toFixed(2)}
                    </div>
                    <div className="text-white/40 mt-0.5">温度裕量</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 text-center">
                    <div className="text-success/90 font-mono font-bold">
                      {simReport.safetyMargins.chfMargin.toFixed(2)}
                    </div>
                    <div className="text-white/40 mt-0.5">CHF裕量</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 text-center">
                    <div className="text-primary/90 font-mono font-bold">
                      {simReport.safetyMargins.flowMargin.toFixed(2)}
                    </div>
                    <div className="text-white/40 mt-0.5">流量裕量</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5 text-center">
                    <div className="text-info/90 font-mono font-bold">
                      {simReport.safetyMargins.powerMargin.toFixed(2)}
                    </div>
                    <div className="text-white/40 mt-0.5">功率裕量</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/reports/${simReport.id}`)}
                  className="w-full mt-2 glow-btn !py-2 !text-xs"
                >
                  <Eye size={14} className="mr-1.5" />
                  查看完整报告
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md pulse-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/40 flex items-center justify-center">
                <AlertTriangle className="text-danger" size={24} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">确认删除任务</h3>
                <p className="text-sm text-white/60">此操作不可撤销，相关数据将被永久删除</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-6 space-y-1.5">
              <div className="text-sm text-white/80">
                任务ID: <span className="font-mono text-primary">{sim.id}</span>
              </div>
              <div className="text-sm text-white/80">
                任务名称: <span className="text-white/95">{sim.name}</span>
              </div>
              <div className="text-sm text-white/80">
                构型名称: <span className="text-white/90">{sim.configurationName}</span>
              </div>
              <div className="text-sm text-white/80">
                关联预警: <span className="text-warning">{simWarnings.length} 条</span>
              </div>
              <div className="text-sm text-white/80">
                审批记录: <span className="text-info">{simApprovals.length} 项</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-all font-display text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 transition-all font-display text-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
