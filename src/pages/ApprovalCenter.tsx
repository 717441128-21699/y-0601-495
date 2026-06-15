import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  Shield,
  Gauge,
  CheckSquare,
  ThumbsUp,
  ThumbsDown,
  Save,
  ChevronRight,
  Radar,
  Flame,
  Activity,
  Thermometer,
  Droplets,
  Zap,
} from 'lucide-react';
import { useAppStore, type ApprovalItem, type ApprovalCheckResult } from '@/store/useAppStore';

const levelTextMap: Record<string, string> = {
  engineer_verify: '模型合理性验证',
  chief_confirm: '事故后果确认',
};

const statusTextMap: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已驳回',
};

export default function ApprovalCenter() {
  const { currentUser, approvals, approveItem, rejectItem, generateReport } = useAppStore();

  const [activeRole, setActiveRole] = useState<'engineer' | 'chief'>(
    currentUser.role === 'chief_engineer' ? 'chief' : 'engineer'
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [localCheckItems, setLocalCheckItems] = useState<Array<{ name: string; description: string; result: ApprovalCheckResult; comment?: string; verifier: string }>>([]);

  const groupedApprovals = useMemo(() => {
    const engineerList = approvals.filter((a) => a.level === 'engineer_verify');
    const chiefList = approvals.filter((a) => a.level === 'chief_confirm');
    return { engineerList, chiefList };
  }, [approvals]);

  const myPendingApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchRole =
        activeRole === 'engineer' ? a.level === 'engineer_verify' : a.level === 'chief_confirm';
      return matchRole && a.status === 'pending';
    });
  }, [approvals, activeRole]);

  const myApprovedCount = useMemo(() => {
    return approvals.filter((a) => {
      const matchRole =
        activeRole === 'engineer' ? a.level === 'engineer_verify' : a.level === 'chief_confirm';
      return matchRole && a.status === 'approved';
    }).length;
  }, [approvals, activeRole]);

  const todayCompleted = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return approvals.filter((a) => {
      if (!a.signedAt) return false;
      return a.signedAt.startsWith(today) && a.status === 'approved';
    }).length;
  }, [approvals]);

  const avgApprovalTime = useMemo(() => {
    const completed = approvals.filter((a) => a.signedAt && a.createdAt);
    if (completed.length === 0) return 2.5;
    const totalMs = completed.reduce((sum, a) => {
      return sum + (new Date(a.signedAt!).getTime() - new Date(a.createdAt).getTime());
    }, 0);
    return +(totalMs / completed.length / 3600000).toFixed(1);
  }, [approvals]);

  const filteredEngineerList = useMemo(() => {
    if (!searchQuery) return groupedApprovals.engineerList;
    const q = searchQuery.toLowerCase();
    return groupedApprovals.engineerList.filter(
      (a) => a.id.toLowerCase().includes(q) || a.simulationName.toLowerCase().includes(q)
    );
  }, [groupedApprovals.engineerList, searchQuery]);

  const filteredChiefList = useMemo(() => {
    if (!searchQuery) return groupedApprovals.chiefList;
    const q = searchQuery.toLowerCase();
    return groupedApprovals.chiefList.filter(
      (a) => a.id.toLowerCase().includes(q) || a.simulationName.toLowerCase().includes(q)
    );
  }, [groupedApprovals.chiefList, searchQuery]);

  const selectedApproval = useMemo(() => {
    if (!selectedId) return approvals.find((a) => a.status === 'pending') ?? null;
    return approvals.find((a) => a.id === selectedId) ?? null;
  }, [selectedId, approvals]);

  const defaultCheckItems = useMemo(() => {
    if (!selectedApproval) return [];
    const templateItems = [
      { name: '模型假设验证', description: '验证物理模型假设与实际工况一致性', verifier: '系统自动' },
      { name: '网格质量评估', description: '网格正交性、长宽比、扭曲度等指标', verifier: '系统自动' },
      { name: '边界条件合理性', description: '入口/出口/壁面边界条件设定合理性', verifier: '系统自动' },
      { name: '收敛性检查', description: '残差收敛曲线、关键参数稳定性', verifier: '系统自动' },
      { name: '参数敏感性分析', description: '关键输入参数扰动对结果影响', verifier: '李工' },
      { name: '数值稳定性验证', description: '时间步长、松弛因子等数值方案', verifier: '李工' },
      { name: '物理规律符合性', description: '能量守恒、质量守恒、动量守恒检查', verifier: '李工' },
      { name: '结果合理性确认', description: '最终结果与经验数据/benchmark对比', verifier: '李工' },
    ];
    return templateItems.map((tpl, idx) => {
      const existing = selectedApproval.items[idx];
      return {
        ...tpl,
        result: existing?.result ?? 'pass',
        comment: existing?.comment,
      };
    });
  }, [selectedApproval]);

  const approvalHistory = useMemo(() => {
    if (!selectedApproval) return [];
    const history: Array<{ time: string; actor: string; action: string; result: string; comment?: string; avatarColor: string }> = [];
    const sim = selectedApproval;
    history.push({
      time: sim.createdAt,
      actor: sim.submitter,
      action: '提交审批申请',
      result: '提交',
      comment: sim.overallComment,
      avatarColor: 'bg-primary',
    });
    const related = approvals.filter((a) => a.simulationId === sim.simulationId && a.id !== sim.id);
    related.forEach((r) => {
      if (r.status === 'approved') {
        history.push({
          time: r.signedAt ?? r.createdAt,
          actor: r.signedBy ?? r.assignee,
          action: levelTextMap[r.level] + ' 审批',
          result: '通过',
          comment: r.signComment,
          avatarColor: 'bg-success',
        });
      } else if (r.status === 'rejected') {
        history.push({
          time: r.signedAt ?? r.createdAt,
          actor: r.signedBy ?? r.assignee,
          action: levelTextMap[r.level] + ' 审批',
          result: '驳回',
          comment: r.signComment,
          avatarColor: 'bg-danger',
        });
      }
    });
    return history.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [selectedApproval, approvals]);

  const currentProgressStep = useMemo(() => {
    if (!selectedApproval) return 0;
    const related = approvals.filter((a) => a.simulationId === selectedApproval.simulationId);
    if (selectedApproval.level === 'engineer_verify') {
      return selectedApproval.status === 'approved' ? 1 : 0;
    }
    const engineerApproved = related.some((a) => a.level === 'engineer_verify' && a.status === 'approved');
    if (!engineerApproved) return 0;
    return selectedApproval.status === 'approved' ? 2 : 1;
  }, [selectedApproval, approvals]);

  const originalParams = useMemo(() => [
    { name: '入口温度', value: 558.0, unit: 'K', icon: Thermometer },
    { name: '入口压力', value: 15.5, unit: 'MPa', icon: Gauge },
    { name: '入口流量', value: 4200.0, unit: 'kg/s', icon: Droplets },
    { name: '额定功率', value: 3400.0, unit: 'MW', icon: Zap },
    { name: '燃料棒数', value: 193, unit: '根', icon: Activity },
    { name: '轴向层数', value: 50, unit: '层', icon: FileText },
    { name: '最大迭代步', value: 5000, unit: '步', icon: Clock },
    { name: '收敛阈值', value: 0.0001, unit: '-', icon: Shield },
  ], []);

  const adjustedParams = useMemo(() => [
    { name: '入口温度', value: 558.0, delta: 0, unit: 'K', icon: Thermometer },
    { name: '入口压力', value: 15.6, delta: 0.1, unit: 'MPa', icon: Gauge },
    { name: '入口流量', value: 4284.0, delta: 84, unit: 'kg/s', icon: Droplets },
    { name: '额定功率', value: 3400.0, delta: 0, unit: 'MW', icon: Zap },
    { name: '燃料棒数', value: 193, delta: 0, unit: '根', icon: Activity },
    { name: '轴向层数', value: 55, delta: 5, unit: '层', icon: FileText },
    { name: '最大迭代步', value: 6000, delta: 1000, unit: '步', icon: Clock },
    { name: '收敛阈值', value: 0.00005, delta: -0.00005, unit: '-', icon: Shield },
  ], []);

  const radarOption = useMemo(() => ({
    tooltip: {
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
    },
    legend: {
      data: ['本次模拟', '基准限值'],
      textStyle: { color: '#89A7CF' },
      bottom: 0,
    },
    radar: {
      indicator: [
        { name: '温度裕量', max: 100 },
        { name: 'CHF裕量', max: 100 },
        { name: '流量裕量', max: 100 },
        { name: '压力裕量', max: 100 },
        { name: '功率裕量', max: 100 },
      ],
      axisName: { color: '#89A7CF', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.2)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(0, 212, 255, 0.02)', 'rgba(0, 212, 255, 0.05)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(0, 212, 255, 0.3)' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [78, 72, 68, 85, 75],
            name: '本次模拟',
            lineStyle: { color: '#00D4FF', width: 2 },
            itemStyle: { color: '#00D4FF' },
            areaStyle: {
              color: {
                type: 'radial',
                x: 0.5, y: 0.5, r: 0.5,
                colorStops: [
                  { offset: 0, color: 'rgba(0, 212, 255, 0.5)' },
                  { offset: 1, color: 'rgba(0, 212, 255, 0.1)' },
                ],
              },
            },
          },
          {
            value: [60, 60, 60, 60, 60],
            name: '基准限值',
            lineStyle: { color: '#FF8C00', width: 2, type: 'dashed' },
            itemStyle: { color: '#FF8C00' },
            areaStyle: {
              color: 'rgba(255, 140, 0, 0.08)',
            },
          },
        ],
      },
    ],
  }), []);

  const isUrgent = (createdAt: string): boolean => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    return diffMs > 24 * 3600 * 1000;
  };

  const formatTime = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSelectApproval = (id: string) => {
    setSelectedId(id);
    setApprovalComment('');
    setSignatureConfirmed(false);
    setLocalCheckItems([]);
  };

  const handleCheckItemChange = (idx: number, result: ApprovalCheckResult) => {
    const items = localCheckItems.length > 0 ? [...localCheckItems] : [...defaultCheckItems];
    items[idx] = { ...items[idx], result };
    setLocalCheckItems(items);
  };

  const effectiveCheckItems = localCheckItems.length > 0 ? localCheckItems : defaultCheckItems;

  const handleApprove = () => {
    if (!selectedApproval) return;
    if (!approvalComment.trim()) {
      alert('请填写审批意见');
      return;
    }
    if (!signatureConfirmed) {
      alert('请确认电子签名');
      return;
    }
    approveItem(selectedApproval.id, currentUser.username, approvalComment);
    if (selectedApproval.level === 'chief_confirm') {
      const hasEngineerApproved = approvals.some(
        (a) => a.simulationId === selectedApproval.simulationId && a.level === 'engineer_verify' && a.status === 'approved'
      );
      if (hasEngineerApproved) {
        generateReport(selectedApproval.simulationId, currentUser.username);
      }
    }
    setApprovalComment('');
    setSignatureConfirmed(false);
  };

  const handleReject = () => {
    if (!selectedApproval) return;
    if (!approvalComment.trim()) {
      alert('请填写审批意见（驳回必填）');
      return;
    }
    if (!signatureConfirmed) {
      alert('请确认电子签名');
      return;
    }
    rejectItem(selectedApproval.id, currentUser.username, approvalComment);
    setApprovalComment('');
    setSignatureConfirmed(false);
  };

  const handleSaveDraft = () => {
    alert('草稿已保存');
  };

  const renderApprovalCard = (item: ApprovalItem) => {
    const isSelected = (selectedId ?? approvals.find((a) => a.status === 'pending')?.id) === item.id;
    const urgent = item.status === 'pending' && isUrgent(item.createdAt);
    return (
      <div
        key={item.id}
        onClick={() => handleSelectApproval(item.id)}
        className={`relative p-4 rounded-xl cursor-pointer transition-all border ${
          isSelected
            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/20'
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30'
        }`}
      >
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />
        )}
        <div className="flex items-start justify-between mb-2">
          <span className="font-mono text-xs text-white/50">{item.id.toUpperCase()}</span>
          {urgent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/20 text-danger text-xs font-medium">
              <AlertCircle className="w-3 h-3" />
              紧急
            </span>
          )}
        </div>
        <div className="font-semibold text-white text-sm mb-2 line-clamp-1">{item.simulationName}</div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`status-badge ${item.level === 'engineer_verify' ? 'status-badge-info' : 'status-badge-primary'}`}>
            {levelTextMap[item.level]}
          </span>
          <span className={`status-badge ${
            item.status === 'approved' ? 'status-badge-success' :
            item.status === 'rejected' ? 'status-badge-danger' : 'status-badge-warning'
          }`}>
            {statusTextMap[item.status]}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {item.submitter}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(item.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">审批工作台</h1>
            <p className="mt-2 text-sm text-white/60">待审批项、对比视图、审批操作</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveRole('engineer')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeRole === 'engineer'
                ? 'bg-info/20 border border-info/50 text-info'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <Shield className="w-4 h-4" />
            热工工程师验证
          </button>
          <button
            onClick={() => setActiveRole('chief')}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              activeRole === 'chief'
                ? 'bg-primary/20 border border-primary/50 text-primary'
                : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            安全总工确认
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative rounded-xl p-4 bg-gradient-to-br from-warning/10 to-transparent border border-warning/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">待我审批</span>
              <Clock className="w-4 h-4 text-warning" />
            </div>
            <div className="text-3xl font-bold font-display text-white">{myPendingApprovals.length}</div>
            <div className="text-xs text-white/40 mt-1">当前角色待处理</div>
          </div>
          <div className="relative rounded-xl p-4 bg-gradient-to-br from-success/10 to-transparent border border-success/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">我已审批</span>
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <div className="text-3xl font-bold font-display text-white">{myApprovedCount}</div>
            <div className="text-xs text-white/40 mt-1">历史审批总数</div>
          </div>
          <div className="relative rounded-xl p-4 bg-gradient-to-br from-info/10 to-transparent border border-info/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">今日完成</span>
              <Activity className="w-4 h-4 text-info" />
            </div>
            <div className="text-3xl font-bold font-display text-white">{todayCompleted}</div>
            <div className="text-xs text-white/40 mt-1">当日审批通过</div>
          </div>
          <div className="relative rounded-xl p-4 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50">平均审批时长</span>
              <Gauge className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold font-display text-white">{avgApprovalTime}<span className="text-base ml-1">h</span></div>
            <div className="text-xs text-white/40 mt-1">历史平均耗时</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-3 space-y-4">
          <div className="glass-card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索任务ID或名称..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-info/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-info" />
                  <span className="font-semibold text-sm text-white">模型合理性验证</span>
                </div>
                <span className="text-xs text-white/50">{filteredEngineerList.length} 项</span>
              </div>
              <p className="text-xs text-white/40 mt-1">热工工程师待办</p>
            </div>
            <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
              {filteredEngineerList.length > 0 ? (
                filteredEngineerList.map(renderApprovalCard)
              ) : (
                <div className="py-8 text-center text-white/40 text-sm">暂无待办</div>
              )}
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm text-white">事故后果确认</span>
                </div>
                <span className="text-xs text-white/50">{filteredChiefList.length} 项</span>
              </div>
              <p className="text-xs text-white/40 mt-1">安全总工待办</p>
            </div>
            <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
              {filteredChiefList.length > 0 ? (
                filteredChiefList.map(renderApprovalCard)
              ) : (
                <div className="py-8 text-center text-white/40 text-sm">暂无待办</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-6 space-y-4">
          {selectedApproval ? (
            <>
              <div className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-white">{selectedApproval.simulationName}</h2>
                      <span className={`status-badge ${
                        selectedApproval.status === 'approved' ? 'status-badge-success' :
                        selectedApproval.status === 'rejected' ? 'status-badge-danger' : 'status-badge-warning'
                      }`}>
                        {statusTextMap[selectedApproval.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />提交人：{selectedApproval.submitter}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(selectedApproval.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${currentProgressStep >= 1 ? 'bg-success/60' : 'bg-white/10'}`}>
                    <div className={`h-full ${currentProgressStep >= 1 ? 'bg-success' : 'bg-warning/60'} ${currentProgressStep === 0 ? 'w-1/2 animate-pulse' : 'w-full'}`} />
                  </div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentProgressStep >= 1 ? 'bg-success border-success text-white' : 'bg-warning/30 border-warning text-warning'
                  }`}>
                    {currentProgressStep >= 1 ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">1</span>}
                  </div>
                  <span className={`text-xs ${currentProgressStep >= 1 ? 'text-success' : 'text-warning'}`}>工程师验证</span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${currentProgressStep >= 2 ? 'bg-success/60' : 'bg-white/10'}`}>
                    <div className={`h-full ${currentProgressStep >= 2 ? 'bg-success' : currentProgressStep === 1 ? 'bg-primary/60 w-1/2 animate-pulse' : ''}`} />
                  </div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentProgressStep >= 2 ? 'bg-success border-success text-white' :
                    currentProgressStep === 1 ? 'bg-primary/30 border-primary text-primary' : 'bg-white/5 border-white/20 text-white/40'
                  }`}>
                    {currentProgressStep >= 2 ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">2</span>}
                  </div>
                  <span className={`text-xs ${
                    currentProgressStep >= 2 ? 'text-success' :
                    currentProgressStep === 1 ? 'text-primary' : 'text-white/40'
                  }`}>总工确认</span>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  参数对比视图
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-white/50 mb-3 px-1">原始提交参数</div>
                    <div className="grid grid-cols-2 gap-2">
                      {originalParams.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p.icon className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/60">{p.name}</span>
                          </div>
                          <div className="text-lg font-bold font-mono text-white">
                            {p.value.toLocaleString()}
                            <span className="text-xs font-normal text-white/40 ml-1">{p.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50 mb-3 px-1">调整后参数</div>
                    <div className="grid grid-cols-2 gap-2">
                      {adjustedParams.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <p.icon className="w-3 h-3 text-white/40" />
                            <span className="text-xs text-white/60">{p.name}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-bold font-mono text-white">
                              {p.value.toLocaleString()}
                            </span>
                            <span className="text-xs font-normal text-white/40">{p.unit}</span>
                            {p.delta !== 0 && (
                              <span className={`text-xs font-medium ${
                                p.delta > 0 ? 'text-success' : 'text-danger'
                              }`}>
                                {p.delta > 0 ? '+' : ''}{p.delta.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  验证项清单
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-3 text-white/50 font-medium">验证项名称</th>
                        <th className="text-left py-3 px-3 text-white/50 font-medium">说明</th>
                        <th className="text-left py-3 px-3 text-white/50 font-medium">验证结果</th>
                        <th className="text-left py-3 px-3 text-white/50 font-medium">验证人</th>
                        <th className="text-left py-3 px-3 text-white/50 font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveCheckItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 font-medium text-white whitespace-nowrap">{item.name}</td>
                          <td className="py-3 px-3 text-white/50 text-xs max-w-[200px]">{item.description}</td>
                          <td className="py-3 px-3">
                            <select
                              value={item.result}
                              onChange={(e) => handleCheckItemChange(idx, e.target.value as ApprovalCheckResult)}
                              disabled={selectedApproval.status !== 'pending'}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border cursor-pointer focus:outline-none ${
                                item.result === 'pass'
                                  ? 'bg-success/15 text-success border-success/40'
                                  : item.result === 'fail'
                                  ? 'bg-danger/15 text-danger border-danger/40'
                                  : 'bg-white/10 text-white/60 border-white/20'
                              }`}
                            >
                              <option value="pass">PASS</option>
                              <option value="fail">FAIL</option>
                              <option value="na">NA</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-white/60 text-xs">{item.verifier}</td>
                          <td className="py-3 px-3 text-white/40 text-xs">{item.comment ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeRole === 'chief' && (
                <div className="glass-card p-6">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-danger" />
                    事故后果分析
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
                      <div className="text-xs text-white/50 mb-1">事故类型</div>
                      <div className="text-sm font-semibold text-white">LOCA 大破口</div>
                    </div>
                    <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                      <div className="text-xs text-white/50 mb-1">最严重后果</div>
                      <div className="text-sm font-semibold text-warning">包壳峰值超限</div>
                    </div>
                    <div className="p-4 rounded-xl bg-info/10 border border-info/20">
                      <div className="text-xs text-white/50 mb-1">释放源项</div>
                      <div className="text-sm font-semibold text-white">Ⅰ类 低释放</div>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="text-xs text-white/50 mb-1">影响范围等级</div>
                      <div className="text-sm font-semibold text-white">Ⅲ级 局部</div>
                    </div>
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                      <div className="text-xs text-white/50 mb-1">缓解措施有效性</div>
                      <div className="text-sm font-semibold text-success">87.5%</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Radar className="w-4 h-4 text-primary" />
                  安全裕量评估
                </h3>
                <div className="h-80">
                  <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <FileText className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">请选择左侧待审批项查看详情</p>
            </div>
          )}
        </div>

        <div className="col-span-12 xl:col-span-3">
          <div className="glass-card p-4 sticky top-4">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              审批历史
            </h3>
            {selectedApproval && approvalHistory.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-info/30 to-transparent" />
                <div className="space-y-4">
                  {approvalHistory.map((h, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${h.avatarColor} flex items-center justify-center text-white text-xs font-bold border-2 border-secondary`}>
                        {h.actor.slice(0, 1)}
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm text-white">{h.actor}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            h.result === '通过' ? 'bg-success/20 text-success' :
                            h.result === '驳回' ? 'bg-danger/20 text-danger' :
                            'bg-white/10 text-white/60'
                          }`}>
                            {h.result}
                          </span>
                        </div>
                        <div className="text-xs text-primary mb-1">{h.action}</div>
                        <div className="text-xs text-white/40">{formatTime(h.time)}</div>
                        {h.comment && (
                          <div className="mt-2 p-2 rounded bg-white/5 text-xs text-white/60 border-l-2 border-primary/50">
                            {h.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">暂无审批历史</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-secondary/95 backdrop-blur-xl">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          {selectedApproval && selectedApproval.status === 'pending' ? (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="text-xs text-white/50 mb-1.5 block">
                  审批意见 <span className="text-danger">*</span>
                </label>
                <textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="请输入审批意见..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 resize-none transition-all"
                />
              </div>
              <div className="flex flex-col justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={signatureConfirmed}
                    onChange={(e) => setSignatureConfirmed(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary/50"
                  />
                  <span className="text-xs text-white/60">确认电子签名</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReject}
                    className="px-5 py-2.5 rounded-lg font-medium text-sm text-white bg-danger/80 border border-danger hover:bg-danger hover:shadow-lg hover:shadow-danger/30 transition-all flex items-center gap-2"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    驳回
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-5 py-2.5 rounded-lg font-medium text-sm text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    保存草稿
                  </button>
                  <button
                    onClick={handleApprove}
                    className="glow-btn flex items-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    通过审批
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-3 text-white/40 text-sm">
              {selectedApproval ? '该审批项已处理，请选择其他待审批项' : '请选择待审批项进行操作'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
