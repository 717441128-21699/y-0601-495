import { useState, useMemo, useEffect } from 'react';
import {
  Thermometer,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  Users,
  Zap,
  TrendingUp,
  Calendar,
  CheckSquare,
  Square,
  Gauge,
  Activity,
  Send,
  Ban,
  CheckCheck,
  Flag,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useAppStore, type Warning, type WarningSeverity, type WarningStatus, type WarningType } from '../store/useAppStore';
import { cn } from '../lib/utils';

const severityColors: Record<WarningSeverity, { bg: string; border: string; text: string; shadow: string; bar: string }> = {
  critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/50',
    text: 'text-red-400',
    shadow: 'shadow-red-500/30',
    bar: 'bg-gradient-to-b from-red-500 to-red-600',
  },
  warning: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/50',
    text: 'text-orange-400',
    shadow: 'shadow-orange-500/30',
    bar: 'bg-gradient-to-b from-orange-500 to-orange-600',
  },
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/50',
    text: 'text-cyan-400',
    shadow: 'shadow-cyan-500/30',
    bar: 'bg-gradient-to-b from-cyan-500 to-cyan-600',
  },
};

const severityLabels: Record<WarningSeverity, string> = {
  critical: '紧急',
  warning: '警告',
  info: '提示',
};

const statusLabels: Record<WarningStatus, string> = {
  pending: '未处理',
  reviewed: '复核中',
  resolved: '已解决',
};

const statusBadgeClass: Record<WarningStatus, string> = {
  pending: 'status-badge-danger',
  reviewed: 'status-badge-warning',
  resolved: 'status-badge-success',
};

const typeLabels: Record<WarningType, string> = {
  temperature_exceed: '温度超限',
  chf_below_threshold: 'CHF不足',
  convergence_failure: '收敛失败',
};

const timeRangeOptions = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义' },
] as const;

type TimeRangeKey = typeof timeRangeOptions[number]['key'];

interface Suggestion {
  id: string;
  title: string;
  description: string;
  expectedEffect: string;
  confidence: number;
}

export default function WarningCenter() {
  const { warnings, currentUser, resolveWarning, addAdjustmentLog, updateSimulationStatus } = useAppStore();

  const [severityFilter, setSeverityFilter] = useState<WarningSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<WarningStatus | 'all'>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('today');
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(warnings[0]?.id ?? null);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [bypassFlow, setBypassFlow] = useState(5);
  const [controlRodGroup, setControlRodGroup] = useState('G7');
  const [controlRodSteps, setControlRodSteps] = useState(20);

  useEffect(() => {
    if (warnings.length > 0 && !selectedWarningId) {
      setSelectedWarningId(warnings[0].id);
    }
  }, [warnings, selectedWarningId]);

  const filteredWarnings = useMemo(() => {
    return warnings.filter((w) => {
      if (severityFilter !== 'all' && w.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      const triggered = new Date(w.triggeredAt);
      const now = new Date();
      if (timeRange === 'today') {
        return triggered.toDateString() === now.toDateString();
      } else if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return triggered >= weekAgo;
      } else if (timeRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return triggered >= monthAgo;
      }
      return true;
    });
  }, [warnings, severityFilter, statusFilter, timeRange]);

  const stats = useMemo(() => {
    const pending = warnings.filter((w) => w.status === 'pending').length;
    const critical = warnings.filter((w) => w.severity === 'critical').length;
    const resolved = warnings.filter((w) => w.status === 'resolved').length;
    const total = warnings.length;
    let avgResponse = 0;
    const reviewed = warnings.filter((w) => w.reviewedBy && w.triggeredAt);
    if (reviewed.length > 0) {
      const totalMin = reviewed.reduce((acc, w) => {
        const trig = new Date(w.triggeredAt).getTime();
        const reso = w.resolvedAt
          ? new Date(w.resolvedAt).getTime()
          : Date.now();
        return acc + (reso - trig) / 60000;
      }, 0);
      avgResponse = Math.round(totalMin / reviewed.length);
    }
    const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { pending, critical, avgResponse, resolveRate };
  }, [warnings]);

  const severityCounts = useMemo(() => {
    return {
      all: warnings.length,
      critical: warnings.filter((w) => w.severity === 'critical').length,
      warning: warnings.filter((w) => w.severity === 'warning').length,
      info: warnings.filter((w) => w.severity === 'info').length,
    };
  }, [warnings]);

  const selectedWarning = useMemo(
    () => warnings.find((w) => w.id === selectedWarningId) ?? null,
    [warnings, selectedWarningId]
  );

  const suggestions: Suggestion[] = useMemo(() => {
    if (!selectedWarning) return [];
    const base: Suggestion[] = [
      {
        id: 's1',
        title: '增加旁通流量3.5%',
        description: `提升通道旁通冷却剂流量，降低热点温度`,
        expectedEffect: `预估温度下降23°C`,
        confidence: 92,
      },
      {
        id: 's2',
        title: `插入控制棒${controlRodGroup}组${controlRodSteps}步`,
        description: '通过控制棒引入负反应性，降低局部功率峰',
        expectedEffect: '预估CHF比提升0.18',
        confidence: 85,
      },
      {
        id: 's3',
        title: '降低入口温度2°C',
        description: '调整一回路入口温度设定值',
        expectedEffect: '全堆芯温度整体下移',
        confidence: 67,
      },
    ];
    return base;
  }, [selectedWarning, controlRodGroup, controlRodSteps]);

  const handleToggleSuggestion = (id: string) => {
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleReject = () => {
    if (!selectedWarning || !reviewComment.trim()) return;
    resolveWarning(selectedWarning.id, currentUser.username, `[驳回] ${reviewComment}`);
    setReviewComment('');
    setSelectedSuggestions([]);
  };

  const handleAccept = () => {
    if (!selectedWarning) return;
    const appliedSugs = suggestions.filter((s) => selectedSuggestions.includes(s.id));
    const commentParts = appliedSugs.length > 0
      ? `已应用方案: ${appliedSugs.map((s) => s.title).join('; ')}`
      : '接受预警';
    const fullComment = reviewComment.trim()
      ? `${commentParts}. ${reviewComment}`
      : commentParts;

    if (selectedSuggestions.includes('s1')) {
      addAdjustmentLog({
        simulationId: selectedWarning.simulationId,
        type: 'bypass_flow',
        beforeValue: 2.5,
        afterValue: 2.5 + bypassFlow * 0.7,
        operator: currentUser.username,
        comment: `预警${selectedWarning.id}旁通流量调整`,
      });
    }
    if (selectedSuggestions.includes('s2')) {
      addAdjustmentLog({
        simulationId: selectedWarning.simulationId,
        type: 'control_rod_depth',
        beforeValue: 0,
        afterValue: controlRodSteps,
        operator: currentUser.username,
        comment: `预警${selectedWarning.id}控制棒${controlRodGroup}组插入${controlRodSteps}步`,
      });
    }

    resolveWarning(selectedWarning.id, currentUser.username, fullComment);
    updateSimulationStatus(selectedWarning.simulationId, 'thermal_calculation');
    setReviewComment('');
    setSelectedSuggestions([]);
  };

  const handleResolve = () => {
    if (!selectedWarning) return;
    resolveWarning(
      selectedWarning.id,
      currentUser.username,
      reviewComment.trim() || '标记为已解决'
    );
    setReviewComment('');
    setSelectedSuggestions([]);
  };

  const countdownDisplay = (warning: Warning) => {
    if (warning.status !== 'pending') return null;
    const deadline = new Date(warning.triggeredAt);
    deadline.setMinutes(deadline.getMinutes() + (warning.severity === 'critical' ? 15 : warning.severity === 'warning' ? 60 : 240));
    const remain = deadline.getTime() - Date.now();
    if (remain <= 0) return '已超时';
    const m = Math.floor(remain / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: WarningType) => {
    switch (type) {
      case 'temperature_exceed':
        return <Thermometer className="w-4 h-4" />;
      case 'chf_below_threshold':
        return <AlertTriangle className="w-4 h-4" />;
      case 'convergence_failure':
        return <RefreshCw className="w-4 h-4" />;
    }
  };

  const temperatureGaugeOption = useMemo(() => {
    if (!selectedWarning) return {};
    const value = selectedWarning.actualValue;
    const limit = selectedWarning.type === 'temperature_exceed' ? selectedWarning.limitValue : 1477;
    const percent = Math.min(100, (value / limit) * 100);
    return {
      series: [
        {
          type: 'gauge',
          radius: '90%',
          startAngle: 225,
          endAngle: -45,
          min: 0,
          max: limit * 1.1,
          progress: { show: true, width: 12, itemStyle: { color: percent > 100 ? '#FF5252' : percent > 85 ? '#FF8C00' : '#00D4FF' } },
          axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(0,212,255,0.1)']] } },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1 } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, distance: -20 },
          pointer: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '10%'],
            fontSize: 20,
            fontWeight: 700,
            color: percent > 100 ? '#FF5252' : percent > 85 ? '#FF8C00' : '#00D4FF',
            formatter: `{value}K\n限值 ${limit}K`,
          },
          data: [{ value: Math.round(value * 10) / 10 }],
        },
      ],
    };
  }, [selectedWarning]);

  const chfGaugeOption = useMemo(() => {
    if (!selectedWarning) return {};
    const value = selectedWarning.type === 'chf_below_threshold' ? selectedWarning.actualValue : 1.15;
    const limit = selectedWarning.type === 'chf_below_threshold' ? selectedWarning.limitValue : 1.15;
    return {
      series: [
        {
          type: 'gauge',
          radius: '90%',
          startAngle: 225,
          endAngle: -45,
          min: 0.5,
          max: 2.0,
          progress: { show: true, width: 12, itemStyle: { color: value < limit ? '#FF5252' : value < limit * 1.15 ? '#FF8C00' : '#00C853' } },
          axisLine: { lineStyle: { width: 12, color: [[1, 'rgba(0,212,255,0.1)']] } },
          axisTick: { show: false },
          splitLine: { length: 8, lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1 } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, distance: -20 },
          pointer: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, '10%'],
            fontSize: 20,
            fontWeight: 700,
            color: value < limit ? '#FF5252' : value < limit * 1.15 ? '#FF8C00' : '#00C853',
            formatter: `{value}\n阈值 ${limit}`,
          },
          data: [{ value: Math.round(value * 100) / 100 }],
        },
      ],
    };
  }, [selectedWarning]);

  const trendOption = useMemo(() => {
    const times: string[] = [];
    const temps: number[] = [];
    const now = new Date();
    const limit = selectedWarning?.type === 'temperature_exceed' ? selectedWarning.limitValue : 1477;
    for (let i = 29; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60000);
      times.push(`${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`);
      const base = selectedWarning?.actualValue ?? 1400;
      const noise = (Math.sin(i * 0.5) + Math.random() - 0.5) * 15;
      temps.push(Math.round((base + noise - (29 - i) * 0.8) * 10) / 10);
    }
    return {
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(11,30,63,0.95)', borderColor: 'rgba(0,212,255,0.3)', textStyle: { color: '#fff' } },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: 'rgba(0,212,255,0.3)' } },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, interval: 4 },
      },
      yAxis: {
        type: 'value',
        min: (limit: number) => Math.floor((limit - 100) / 50) * 50,
        axisLine: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        {
          type: 'line',
          data: temps,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#00D4FF', width: 2, shadowColor: 'rgba(0,212,255,0.5)', shadowBlur: 10 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0,212,255,0.3)' },
                { offset: 1, color: 'rgba(0,212,255,0)' },
              ],
            },
          },
          markLine: {
            symbol: 'none',
            lineStyle: { color: '#FF5252', type: 'dashed', width: 1 },
            data: [{ yAxis: limit, label: { formatter: `限值 ${limit}K`, color: '#FF5252', fontSize: 10, position: 'end' } }],
          },
        },
      ],
    };
  }, [selectedWarning]);

  const timelineItems = useMemo(() => {
    if (!selectedWarning) return [];
    const trig = new Date(selectedWarning.triggeredAt);
    const fmt = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    const items: { time: string; title: string; status: 'done' | 'active' | 'pending'; color: string }[] = [];
    items.push({ time: fmt(trig), title: '预警触发', status: 'done', color: '#00D4FF' });
    items.push({ time: fmt(new Date(trig.getTime() + 12000)), title: '推送分析师', status: 'done', color: '#00D4FF' });
    if (selectedWarning.status === 'pending') {
      items.push({ time: '--:--:--', title: '开始复核', status: 'active', color: '#FF8C00' });
      items.push({ time: '--:--:--', title: '应用方案', status: 'pending', color: 'rgba(255,255,255,0.3)' });
      items.push({ time: '--:--:--', title: '解决', status: 'pending', color: 'rgba(255,255,255,0.3)' });
    } else if (selectedWarning.status === 'reviewed') {
      items.push({ time: fmt(new Date(trig.getTime() + 300000)), title: '开始复核', status: 'done', color: '#00D4FF' });
      items.push({ time: '--:--:--', title: '应用方案', status: 'active', color: '#FF8C00' });
      items.push({ time: '--:--:--', title: '解决', status: 'pending', color: 'rgba(255,255,255,0.3)' });
    } else {
      const reso = selectedWarning.resolvedAt ? new Date(selectedWarning.resolvedAt) : new Date(trig.getTime() + 600000);
      items.push({ time: fmt(new Date(trig.getTime() + 300000)), title: '开始复核', status: 'done', color: '#00D4FF' });
      items.push({ time: fmt(new Date(trig.getTime() + 480000)), title: '应用方案', status: 'done', color: '#00D4FF' });
      items.push({ time: fmt(reso), title: '解决', status: 'done', color: '#00C853' });
    }
    return items;
  }, [selectedWarning]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient">预警处理中心</h1>
              <p className="mt-2 text-sm text-white/60">预警列表、复核处理、历史记录</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card !border-red-500/30 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                  未处理数
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-red-400 font-display">{stats.pending}</span>
                  <span className="text-xs text-white/40">条</span>
                </div>
              </div>
              <div className="glass-card !border-orange-500/30 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Flag className="w-3.5 h-3.5 text-orange-400" />
                  紧急数
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-400 font-display">{stats.critical}</span>
                  <span className="text-xs text-white/40">条</span>
                </div>
              </div>
              <div className="glass-card !border-cyan-500/30 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  平均响应
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-cyan-400 font-display">{stats.avgResponse}</span>
                  <span className="text-xs text-white/40">分钟</span>
                </div>
              </div>
              <div className="glass-card !border-green-500/30 px-4 py-3 min-w-[140px]">
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  解决率
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-400 font-display">{stats.resolveRate}</span>
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2',
                    severityFilter === sev
                      ? sev === 'all'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : `${severityColors[sev].bg} ${severityColors[sev].text} border ${severityColors[sev].border}`
                      : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                  )}
                >
                  {sev === 'all' ? '全部' : severityLabels[sev]}
                  <span className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded-full',
                    severityFilter === sev
                      ? sev === 'all' ? 'bg-cyan-500/30 text-cyan-200' : `${severityColors[sev].bg} ${severityColors[sev].text}`
                      : 'bg-white/10 text-white/50'
                  )}>
                    {severityCounts[sev]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              {(['all', 'pending', 'reviewed', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all',
                    statusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                  )}
                >
                  {st === 'all' ? '全部状态' : statusLabels[st]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              {timeRangeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTimeRange(opt.key)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                    timeRange === opt.key
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-white/60 hover:text-white/90 hover:bg-white/5'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{ minHeight: 'calc(100vh - 420px)' }}>
        <div className="lg:col-span-2 glass-card p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-2 pb-4 border-b border-white/10">
            <h2 className="font-display font-semibold text-white/90 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              预警列表
            </h2>
            <span className="text-xs text-white/40">{filteredWarnings.length} 条</span>
          </div>
          <div className="flex-1 mt-4 overflow-y-auto pr-2 space-y-3" style={{ maxHeight: 'calc(100vh - 500px)' }}>
            {filteredWarnings.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">暂无匹配预警</p>
              </div>
            )}
            {filteredWarnings.map((warning) => {
              const s = severityColors[warning.severity];
              const isSelected = selectedWarningId === warning.id;
              const cd = countdownDisplay(warning);
              return (
                <div
                  key={warning.id}
                  onClick={() => setSelectedWarningId(warning.id)}
                  className={cn(
                    'relative rounded-xl border cursor-pointer transition-all overflow-hidden',
                    s.bg,
                    isSelected
                      ? `${s.border} shadow-lg ${s.shadow} ring-2 ring-offset-2 ring-offset-transparent`
                      : 'border-white/10 hover:border-white/20 hover:shadow-md'
                  )}
                  style={isSelected ? { boxShadow: `0 0 20px ${warning.severity === 'critical' ? 'rgba(255,82,82,0.3)' : warning.severity === 'warning' ? 'rgba(255,140,0,0.3)' : 'rgba(0,212,255,0.3)'}` } : undefined}
                >
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', s.bar)}>
                    <div className="w-full h-full animate-pulse opacity-80" style={{ animationDuration: '1.5s' }} />
                  </div>
                  <div className="pl-5 pr-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', s.bg, `border ${s.border}`, s.text)}>
                          {getTypeIcon(warning.type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-mono font-semibold', s.text)}>{warning.id.toUpperCase()}</span>
                            <span className={`status-badge ${statusBadgeClass[warning.status]}`}>{statusLabels[warning.status]}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-white/90 truncate font-medium">{typeLabels[warning.type]}</p>
                        </div>
                      </div>
                      {isSelected && <ChevronRight className={cn('w-5 h-5 shrink-0 mt-1', s.text)} />}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span className="truncate max-w-[180px]">{warning.simulationName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(warning.triggeredAt).toLocaleTimeString('zh-CN', { hour12: false })}
                      </span>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-black/20 border border-white/5">
                      <div className="text-xs text-white/50 mb-1">参数超限摘要</div>
                      <div className="text-sm font-mono flex flex-wrap items-center gap-2">
                        <span className="text-white/70">实际值:</span>
                        <span className={cn(
                          'font-bold px-2 py-0.5 rounded',
                          (warning.type === 'chf_below_threshold' ? warning.actualValue < warning.limitValue : warning.actualValue > warning.limitValue)
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'text-cyan-300'
                        )}>
                          {warning.actualValue.toLocaleString()}
                        </span>
                        <span className="text-white/30">vs</span>
                        <span className="text-white/70">限值:</span>
                        <span className="text-white/90 font-semibold">{warning.limitValue.toLocaleString()}</span>
                      </div>
                    </div>

                    {cd && (
                      <div className={cn(
                        'mt-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg',
                        cd === '已超时' ? 'bg-red-500/20 border border-red-500/30' : 'bg-white/5 border border-white/10'
                      )}>
                        <span className="text-xs text-white/50 flex items-center gap-1">
                          <Timer className="w-3 h-3" />
                          处理时限
                        </span>
                        <span className={cn(
                          'text-sm font-mono font-bold',
                          cd === '已超时' ? 'text-red-400' : s.text
                        )}>
                          {cd}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          {!selectedWarning ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center">
              <AlertOctagon className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/50">请从左侧选择预警查看详情</p>
            </div>
          ) : (
            <>
              <div className={cn(
                'glass-card p-6 border-l-4',
                severityColors[selectedWarning.severity].bar
              )}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center',
                        severityColors[selectedWarning.severity].bg,
                        `border-2 ${severityColors[selectedWarning.severity].border}`,
                        severityColors[selectedWarning.severity].text
                      )}>
                        <div className="w-7 h-7">{getTypeIcon(selectedWarning.type)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-display text-xl font-bold text-white">{selectedWarning.id.toUpperCase()}</h2>
                          <span className={`status-badge ${statusBadgeClass[selectedWarning.status]}`}>{statusLabels[selectedWarning.status]}</span>
                          <span className={cn(
                            'status-badge',
                            selectedWarning.severity === 'critical' ? 'status-badge-danger' :
                            selectedWarning.severity === 'warning' ? 'status-badge-warning' : 'status-badge-info'
                          )}>{severityLabels[selectedWarning.severity]}</span>
                        </div>
                        <p className="mt-1.5 text-lg text-white/90 font-semibold">{typeLabels[selectedWarning.type]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="text-xs text-white/50 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      触发时间
                    </div>
                    <div className="text-sm font-mono text-white/90">
                      {new Date(selectedWarning.triggeredAt).toLocaleString('zh-CN', { hour12: false })}
                    </div>
                    <div className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedWarning.simulationName}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  超限详情
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-black/30 to-transparent border border-white/10">
                    <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-1.5">
                      <Thermometer className="w-4 h-4 text-red-400" />
                      通道信息
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-white/40 mb-0.5">通道编号</div>
                        <div className="font-mono text-white/90 font-semibold">{selectedWarning.channelId ?? 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-0.5">坐标 (i, j)</div>
                        <div className="font-mono text-white/90 font-semibold">(12, 7)</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-0.5">类型</div>
                        <div className="text-white/90">燃料通道</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/40 mb-0.5">燃料组件</div>
                        <div className="text-white/90">FA-Block-A3</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-black/30 to-transparent border border-white/10">
                    <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      超限倍率
                    </h4>
                    <div className="mt-1">
                      <div className="flex items-end justify-between mb-1.5">
                        <span className="text-3xl font-display font-bold text-white">
                          {selectedWarning.type === 'chf_below_threshold'
                            ? (selectedWarning.limitValue / selectedWarning.actualValue).toFixed(2)
                            : (selectedWarning.actualValue / selectedWarning.limitValue).toFixed(2)}
                          <span className="text-lg text-white/40 ml-1">x</span>
                        </span>
                        <span className="text-xs text-white/50">安全阈值 1.0x</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            selectedWarning.severity === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            selectedWarning.severity === 'warning' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                            'bg-gradient-to-r from-cyan-500 to-cyan-400'
                          )}
                          style={{
                            width: `${Math.min(100, Math.max(
                              10,
                              (selectedWarning.type === 'chf_below_threshold'
                                ? (selectedWarning.limitValue / selectedWarning.actualValue - 1)
                                : (selectedWarning.actualValue / selectedWarning.limitValue - 1)) * 200 + 10
                            ))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="text-xs text-center text-white/50 mb-2">温度仪表 (K)</div>
                    <div className="h-[170px]">
                      <ReactECharts option={temperatureGaugeOption} style={{ height: '100%', width: '100%' }} notMerge />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                    <div className="text-xs text-center text-white/50 mb-2">CHF比仪表</div>
                    <div className="h-[170px]">
                      <ReactECharts option={chfGaugeOption} style={{ height: '100%', width: '100%' }} notMerge />
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl border border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/50 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    近30分钟温度趋势
                  </div>
                  <div className="h-[140px]">
                    <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} notMerge />
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  系统建议措施
                </h3>
                <div className="space-y-3">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={sug.id}
                      onClick={() => handleToggleSuggestion(sug.id)}
                      className={cn(
                        'p-4 rounded-xl border cursor-pointer transition-all',
                        selectedSuggestions.includes(sug.id)
                          ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {selectedSuggestions.includes(sug.id) ? (
                            <CheckSquare className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <Square className="w-5 h-5 text-white/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-white">{sug.title}</span>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[10px] text-white/40 mb-0.5">推荐度</div>
                              <div className={cn(
                                'text-lg font-display font-bold',
                                sug.confidence >= 85 ? 'text-green-400' : sug.confidence >= 70 ? 'text-yellow-400' : 'text-orange-400'
                              )}>
                                {sug.confidence}%
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-white/60">{sug.description}</p>
                          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                            <TrendingUp className="w-3 h-3" />
                            {sug.expectedEffect}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-white/90 mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  复核操作
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">复核意见</label>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="请输入复核意见、调整原因等..."
                      className="w-full h-24 px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white/90 text-sm placeholder-white/30 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <label className="flex items-center justify-between text-sm text-white/70 mb-3">
                        <span className="font-medium">旁通流量调整</span>
                        <span className="font-mono text-cyan-400 font-bold">+{bypassFlow.toFixed(1)}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        step="0.5"
                        value={bypassFlow}
                        onChange={(e) => setBypassFlow(parseFloat(e.target.value))}
                        className="slider-custom w-full"
                      />
                      <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
                        <span>0%</span>
                        <span>7.5%</span>
                        <span>15%</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <label className="block text-sm text-white/70 mb-3 font-medium">控制棒组选择</label>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {['G1', 'G3', 'G5', 'G7', 'G9'].map((g) => (
                          <button
                            key={g}
                            onClick={() => setControlRodGroup(g)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all',
                              controlRodGroup === g
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                      <label className="flex items-center justify-between text-sm text-white/70 mt-3 mb-2">
                        <span className="font-medium">插入步数</span>
                        <span className="font-mono text-orange-400 font-bold">{controlRodSteps} 步</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="5"
                        value={controlRodSteps}
                        onChange={(e) => setControlRodSteps(parseInt(e.target.value))}
                        className="slider-custom w-full"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleReject}
                      disabled={!reviewComment.trim() || selectedWarning.status === 'resolved'}
                      className="glow-btn !text-red-400 !border-red-500/40 hover:!bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      驳回（不处理）
                    </button>
                    <button
                      onClick={handleAccept}
                      disabled={selectedWarning.status === 'resolved'}
                      className="glow-btn disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCheck className="w-4 h-4 mr-2" />
                      接受并应用
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={selectedWarning.status === 'resolved'}
                      className="glow-btn !text-green-400 !border-green-500/40 hover:!bg-green-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      标记已解决
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-semibold text-white/90 mb-5 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  处理时间线
                </h3>
                <div className="relative pl-2">
                  <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/50 via-white/20 to-transparent" />
                  <div className="space-y-5">
                    {timelineItems.map((item, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        <div className="relative z-10 shrink-0">
                          <div
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
                            style={{
                              borderColor: item.color,
                              backgroundColor: item.status === 'pending' ? 'transparent' : `${item.color}15`,
                              boxShadow: item.status === 'active' ? `0 0 16px ${item.color}80` : 'none',
                            }}
                          >
                            {item.status === 'done' ? (
                              <CheckCircle2 className="w-5 h-5" style={{ color: item.color }} />
                            ) : item.status === 'active' ? (
                              <div
                                className="w-4 h-4 rounded-full animate-pulse"
                                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                              />
                            ) : (
                              <Clock className="w-4 h-4" style={{ color: item.color }} />
                            )}
                          </div>
                        </div>
                        <div className="pt-1.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className="font-semibold text-base"
                              style={{ color: item.status === 'pending' ? 'rgba(255,255,255,0.4)' : '#fff' }}
                            >
                              {item.title}
                            </span>
                            <span
                              className="text-xs font-mono"
                              style={{ color: item.status === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.5)' }}
                            >
                              {item.time}
                            </span>
                          </div>
                          {idx === 0 && (
                            <p className="mt-1 text-xs text-white/50">系统自动检测参数超限并触发预警</p>
                          )}
                          {idx === 1 && (
                            <p className="mt-1 text-xs text-white/50">推送至 {currentUser.department} 待处理队列</p>
                          )}
                          {idx === 2 && selectedWarning.reviewedBy && (
                            <p className="mt-1 text-xs text-white/50">由 {selectedWarning.reviewedBy} 开始复核处理</p>
                          )}
                          {idx === 3 && selectedWarning.reviewComment && (
                            <p className="mt-1 text-xs text-white/50 truncate max-w-md">
                              {selectedWarning.reviewComment}
                            </p>
                          )}
                          {idx === 4 && selectedWarning.resolvedAt && (
                            <p className="mt-1 text-xs text-white/50">预警状态更新为已解决</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Timer(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  );
}
