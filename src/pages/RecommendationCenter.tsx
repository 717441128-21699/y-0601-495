import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Sparkles,
  Activity,
  Cpu,
  Clock,
  Gauge,
  Target,
  BarChart3,
  Sliders,
  CheckCircle2,
  Play,
  History,
  Calendar,
  TrendingUp,
  X,
  ChevronRight,
  Shield,
  Thermometer,
  Droplets,
  ArrowUpRight,
  ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface ExtendedRecommendation {
  id: string;
  title: string;
  planType: 'flow' | 'rod' | 'parameter';
  marginImprove: number;
  confidence: number;
  configTags: string[];
  applied: boolean;
  aiScore: number;
  generatedAt: string;
  flowCurrent: number[];
  flowSuggested: number[];
  rodMatrix: { name: string; depth: number; suggest: number }[];
  margins: {
    temp: { before: number; after: number };
    chf: { before: number; after: number };
    flow: { before: number; after: number };
    pressure: { before: number; after: number };
    power: { before: number; after: number };
  };
  effects: {
    tempDown: number;
    chfUp: number;
    marginUp: number;
  };
  configHash: string;
  configName: string;
}

interface HistoryCase {
  id: string;
  configName: string;
  date: string;
  result: 'success' | 'fail';
  improve: number;
  params: Record<string, { before: number; after: number }>;
  results: { temp: number; chf: number; margin: number };
}

const mockPlans: ExtendedRecommendation[] = [
  {
    id: 'plan-001',
    title: 'CAP1400堆芯流量再分配优化',
    planType: 'flow',
    marginImprove: 18.5,
    confidence: 0.92,
    configTags: ['CAP1400', '193通道', 'LOCA工况'],
    applied: false,
    aiScore: 94,
    generatedAt: '2026-06-16T08:30:00Z',
    flowCurrent: [2.8, 3.1, 2.9, 3.3, 2.7, 3.0, 2.6, 3.2],
    flowSuggested: [4.2, 3.5, 2.9, 3.8, 3.6, 3.0, 3.4, 4.1],
    rodMatrix: [],
    margins: {
      temp: { before: 0.12, after: 0.22 },
      chf: { before: 0.10, after: 0.24 },
      flow: { before: 0.28, after: 0.38 },
      pressure: { before: 0.19, after: 0.26 },
      power: { before: 0.14, after: 0.21 },
    },
    effects: { tempDown: 32, chfUp: 0.18, marginUp: 18.5 },
    configHash: 'cfg-a1b2c3d4',
    configName: 'CAP1400标准堆芯',
  },
  {
    id: 'plan-002',
    title: 'HPR1000控制棒组A-D深度微调',
    planType: 'rod',
    marginImprove: 12.3,
    confidence: 0.87,
    configTags: ['HPR1000', '157通道', '稳态满功率'],
    applied: true,
    aiScore: 89,
    generatedAt: '2026-06-14T14:20:00Z',
    flowCurrent: [2.5, 2.7, 2.6, 2.8, 2.4, 2.9, 2.5, 2.7],
    flowSuggested: [2.5, 2.7, 2.6, 2.8, 2.4, 2.9, 2.5, 2.7],
    rodMatrix: [
      { name: 'G1-A', depth: 45, suggest: 52 },
      { name: 'G1-B', depth: 48, suggest: 55 },
      { name: 'G2-A', depth: 50, suggest: 48 },
      { name: 'G2-B', depth: 52, suggest: 50 },
      { name: 'G3-A', depth: 40, suggest: 45 },
      { name: 'G3-B', depth: 42, suggest: 47 },
      { name: 'SA-A', depth: 60, suggest: 58 },
      { name: 'SA-B', depth: 62, suggest: 60 },
      { name: 'SB-A', depth: 55, suggest: 53 },
    ],
    margins: {
      temp: { before: 0.18, after: 0.24 },
      chf: { before: 0.22, after: 0.28 },
      flow: { before: 0.30, after: 0.34 },
      pressure: { before: 0.22, after: 0.25 },
      power: { before: 0.16, after: 0.20 },
    },
    effects: { tempDown: 18, chfUp: 0.12, marginUp: 12.3 },
    configHash: 'cfg-e5f6g7h8',
    configName: 'HPR1000优化构型',
  },
  {
    id: 'plan-003',
    title: '试验构型V2入口参数组合优化',
    planType: 'parameter',
    marginImprove: 24.7,
    confidence: 0.83,
    configTags: ['试验构型V2', '121通道', '参数扫描'],
    applied: false,
    aiScore: 86,
    generatedAt: '2026-06-15T10:45:00Z',
    flowCurrent: [2.2, 2.4, 2.3, 2.5, 2.1, 2.6, 2.0, 2.4],
    flowSuggested: [2.8, 3.0, 2.7, 3.1, 2.6, 3.2, 2.5, 3.0],
    rodMatrix: [],
    margins: {
      temp: { before: 0.08, after: 0.20 },
      chf: { before: 0.06, after: 0.19 },
      flow: { before: 0.22, after: 0.35 },
      pressure: { before: 0.15, after: 0.24 },
      power: { before: 0.10, after: 0.18 },
    },
    effects: { tempDown: 45, chfUp: 0.22, marginUp: 24.7 },
    configHash: 'cfg-i9j0k1l2',
    configName: '试验构型V2',
  },
  {
    id: 'plan-004',
    title: '基准验证构型多通道均衡分配',
    planType: 'flow',
    marginImprove: 9.8,
    confidence: 0.95,
    configTags: ['基准构型', '91通道', '收敛验证'],
    applied: false,
    aiScore: 91,
    generatedAt: '2026-06-16T06:15:00Z',
    flowCurrent: [2.0, 2.5, 2.2, 2.8, 1.9, 2.6, 2.1, 2.4],
    flowSuggested: [2.4, 2.5, 2.4, 2.6, 2.3, 2.6, 2.3, 2.5],
    rodMatrix: [],
    margins: {
      temp: { before: 0.25, after: 0.29 },
      chf: { before: 0.30, after: 0.35 },
      flow: { before: 0.32, after: 0.36 },
      pressure: { before: 0.28, after: 0.30 },
      power: { before: 0.22, after: 0.25 },
    },
    effects: { tempDown: 12, chfUp: 0.08, marginUp: 9.8 },
    configHash: 'cfg-m3n4o5p6',
    configName: '基准验证构型',
  },
];

const mockCases: HistoryCase[] = [
  {
    id: 'case-001',
    configName: 'CAP1400标准堆芯',
    date: '2026-05-28',
    result: 'success',
    improve: 16.2,
    params: {
      'CH-157流量': { before: 2.5, after: 4.2 },
      'CH-089流量': { before: 2.7, after: 3.6 },
      '入口压力': { before: 15.2, after: 15.5 },
    },
    results: { temp: -28, chf: 0.15, margin: 16.2 },
  },
  {
    id: 'case-002',
    configName: 'HPR1000优化构型',
    date: '2026-05-15',
    result: 'success',
    improve: 11.8,
    params: {
      'G1-A棒深': { before: 42, after: 50 },
      'G2-B棒深': { before: 50, after: 48 },
      '入口温度': { before: 558, after: 556 },
    },
    results: { temp: -15, chf: 0.11, margin: 11.8 },
  },
  {
    id: 'case-003',
    configName: '试验构型V2',
    date: '2026-04-30',
    result: 'fail',
    improve: 5.3,
    params: {
      '旁通流量%': { before: 8, after: 12 },
      '湍流模型': { before: 0, after: 1 },
      '收敛阈值': { before: 0.0001, after: 0.00005 },
    },
    results: { temp: -8, chf: 0.04, margin: 5.3 },
  },
  {
    id: 'case-004',
    configName: 'CAP1400标准堆芯',
    date: '2026-04-18',
    result: 'success',
    improve: 20.1,
    params: {
      '通道组A流量': { before: 2.8, after: 3.8 },
      '通道组B流量': { before: 3.0, after: 3.5 },
      '通道组C流量': { before: 2.6, after: 3.2 },
    },
    results: { temp: -35, chf: 0.19, margin: 20.1 },
  },
  {
    id: 'case-005',
    configName: '基准验证构型',
    date: '2026-03-22',
    result: 'success',
    improve: 8.5,
    params: {
      'G3棒组深度': { before: 48, after: 52 },
      'SA棒组深度': { before: 58, after: 56 },
      '轴向层数': { before: 20, after: 25 },
    },
    results: { temp: -10, chf: 0.07, margin: 8.5 },
  },
];

const channelLabels = ['CH-A1', 'CH-A2', 'CH-B1', 'CH-B2', 'CH-C1', 'CH-C2', 'CH-D1', 'CH-D2'];

const planTypeConfig: Record<ExtendedRecommendation['planType'], { label: string; color: string; bg: string; icon: LucideIcon }> = {
  flow: { label: '流量分配优化', color: '#00D4FF', bg: 'rgba(0, 212, 255, 0.15)', icon: Droplets },
  rod: { label: '控制棒策略', color: '#FF8C00', bg: 'rgba(255, 140, 0, 0.15)', icon: Sliders },
  parameter: { label: '运行参数组合', color: '#7C4DFF', bg: 'rgba(124, 77, 255, 0.15)', icon: Gauge },
};

export default function RecommendationCenter() {
  const { createSimulation } = useAppStore();
  const [selectedId, setSelectedId] = useState<string>(mockPlans[0].id);
  const [plans, setPlans] = useState<ExtendedRecommendation[]>(mockPlans);
  const [caseModal, setCaseModal] = useState<HistoryCase | null>(null);
  const [engineStatus] = useState<{ state: 'running' | 'training'; lastUpdate: string }>({
    state: 'running',
    lastUpdate: '2026-06-16 14:22:08',
  });

  const selected = useMemo(() => plans.find((p) => p.id === selectedId) ?? plans[0], [plans, selectedId]);

  const flowOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
      axisPointer: { type: 'shadow' },
    },
    legend: { top: 0, textStyle: { color: '#89A7CF' }, right: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: channelLabels,
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '流量 (kg/s)',
      nameTextStyle: { color: '#89A7CF' },
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
    },
    series: [
      {
        name: '当前值',
        type: 'bar',
        barWidth: '35%',
        itemStyle: { color: 'rgba(59, 90, 130, 0.6)', borderRadius: [4, 4, 0, 0] },
        data: selected?.flowCurrent ?? [],
      },
      {
        name: '建议值',
        type: 'bar',
        barWidth: '35%',
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#00D4FF' }, { offset: 1, color: '#0099CC' }],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: selected?.flowSuggested ?? [],
      },
    ],
  }), [selected]);

  const marginOption = useMemo(() => {
    const dims = [
      { key: 'temp', label: '温度裕量', color: '#FF8C00' },
      { key: 'chf', label: 'CHF裕量', color: '#00D4FF' },
      { key: 'flow', label: '流量裕量', color: '#00C853' },
      { key: 'pressure', label: '压力裕量', color: '#7C4DFF' },
      { key: 'power', label: '功率裕量', color: '#FF5252' },
    ] as const;
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ seriesName: string; name: string; value: number }>) => {
          const lines = [`<div style="font-weight:600;margin-bottom:4px">${params[0].name}</div>`];
          params.forEach((p) => {
            lines.push(`<div style="display:flex;justify-content:space-between;gap:12px"><span>${p.seriesName}:</span><span style="font-weight:600">${(p.value * 100).toFixed(1)}%</span></div>`);
          });
          return lines.join('');
        },
      },
      legend: { top: 0, textStyle: { color: '#89A7CF' }, right: 0 },
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
      xAxis: {
        type: 'category',
        data: dims.map((d) => d.label),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '安全裕量系数',
        nameTextStyle: { color: '#89A7CF' },
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 11, formatter: (v: number) => `${(v * 100).toFixed(0)}%` },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          name: '方案前',
          type: 'bar',
          barWidth: '32%',
          itemStyle: { color: 'rgba(59, 90, 130, 0.6)', borderRadius: [4, 4, 0, 0] },
          data: dims.map((d) => selected?.margins[d.key as keyof typeof selected.margins].before ?? 0),
        },
        {
          name: '方案后',
          type: 'bar',
          barWidth: '32%',
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const color = dims[params.dataIndex].color;
              return {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [{ offset: 0, color }, { offset: 1, color: color + '99' }],
              };
            },
            borderRadius: [4, 4, 0, 0],
          },
          data: dims.map((d) => selected?.margins[d.key as keyof typeof selected.margins].after ?? 0),
        },
      ],
    };
  }, [selected]);

  const handleApply = () => {
    if (!selected) return;
    createSimulation({
      name: `${selected.title}-AI推荐方案验证`,
      configurationHash: selected.configHash,
      configurationName: selected.configName,
      gridType: 'structured_hex',
      turbulenceModel: 'k-epsilon',
      boilingModel: 'RPI',
      inletTemp: 558.0,
      inletPressure: 15.5,
      inletFlowRate: 4200.0,
      channelCount: 193,
    });
    setPlans((prev) => prev.map((p) => (p.id === selected.id ? { ...p, applied: true } : p)));
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="glass-card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-7 h-7 text-primary" />
              <h1 className="font-display text-2xl font-bold text-gradient">智能推荐中心</h1>
            </div>
            <p className="text-sm text-white/60">AI驱动的热工参数优化方案 · 历史案例匹配 · 一键应用</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: engineStatus.state === 'training' ? 'rgba(255, 140, 0, 0.1)' : 'rgba(0, 200, 83, 0.1)', border: `1px solid ${engineStatus.state === 'training' ? 'rgba(255, 140, 0, 0.3)' : 'rgba(0, 200, 83, 0.3)'}` }}>
              <div className="relative">
                {engineStatus.state === 'running' ? <Activity className="w-4 h-4 text-success animate-pulse" /> : <Cpu className="w-4 h-4 text-warning animate-pulse" />}
              </div>
              <span className="text-xs font-medium" style={{ color: engineStatus.state === 'training' ? '#FF8C00' : '#00C853' }}>
                {engineStatus.state === 'running' ? '推荐引擎运行中' : '模型训练中'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-white/50" />
              <span className="text-xs text-white/60">上次更新: {engineStatus.lastUpdate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-100 gap-6" style={{ gridTemplateColumns: '30% 45% 25%' }}>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              推荐方案
            </h3>
            <span className="text-xs text-white/40">{plans.length} 条</span>
          </div>
          <div className="space-y-3">
            {plans.map((plan) => {
              const cfg = planTypeConfig[plan.planType];
              const Icon = cfg.icon;
              const isSelected = plan.id === selectedId;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedId(plan.id)}
                  className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.01] ${isSelected ? 'ring-2 ring-primary/60 shadow-lg shadow-primary/20' : ''}`}
                  style={isSelected ? { boxShadow: '0 0 30px rgba(0, 212, 255, 0.15), inset 0 0 20px rgba(0, 212, 255, 0.05)' } : {}}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.bg }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {plan.applied && (
                      <div className="status-badge status-badge-success text-[10px] py-0.5 px-2">已应用</div>
                    )}
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-3 line-clamp-2 leading-snug">{plan.title}</h4>
                  <div className="mb-3">
                    <div className="flex items-end justify-between mb-1.5">
                      <span className="text-xs text-white/50">预估安全裕量提升</span>
                      <span className="font-display font-bold text-xl text-gradient">{plan.marginImprove}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, plan.marginImprove * 3)}%`,
                          background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-white/40" />
                      <span className="text-white/50">置信度</span>
                      <span className="text-white font-medium">{(plan.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="text-[10px]">AI {plan.aiScore}</span>
                      <BarChart3 className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                    {plan.configTags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/5">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg text-white">{selected?.title}</h3>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded"
                    style={{ background: planTypeConfig[selected?.planType ?? 'flow'].bg, color: planTypeConfig[selected?.planType ?? 'flow'].color }}
                  >
                    {planTypeConfig[selected?.planType ?? 'flow'].label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    AI评分 <span className="text-primary font-semibold">{selected?.aiScore}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    生成于 {new Date(selected?.generatedAt ?? '').toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-primary" />
                流量分配建议
              </h4>
              <div className="h-56 bg-white/[0.02] rounded-lg p-2">
                <ReactECharts option={flowOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {selected?.rodMatrix && selected.rodMatrix.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-warning" />
                  控制棒插入深度建议
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {selected.rodMatrix.map((rod) => {
                    const diff = rod.suggest - rod.depth;
                    const color = diff > 0 ? '#FF8C00' : diff < 0 ? '#00D4FF' : '#89A7CF';
                    const intensity = Math.min(100, Math.abs(diff) * 12);
                    return (
                      <div key={rod.name} className="rounded-lg p-3 relative overflow-hidden" style={{ background: `rgba(11, 30, 63, 0.6)`, border: '1px solid rgba(59, 90, 130, 0.3)' }}>
                        <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${color}${Math.floor(intensity).toString(16).padStart(2, '0')}, transparent)` }} />
                        <div className="relative z-10">
                          <div className="text-[11px] text-white/50 mb-1">{rod.name}</div>
                          <div className="flex items-end justify-between mb-2">
                            <span className="text-xs text-white/60">{rod.depth}%</span>
                            <ChevronRight className="w-3 h-3 text-white/30" />
                            <span className="font-semibold text-sm" style={{ color }}>{rod.suggest}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${rod.suggest}%`, background: color }} />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-white/40">插入深度</span>
                            {diff !== 0 && (
                              <span className="text-[10px] flex items-center gap-0.5 font-medium" style={{ color }}>
                                {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(diff)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-5">
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-info" />
                安全裕量5维提升对比
              </h4>
              <div className="h-64 bg-white/[0.02] rounded-lg p-2">
                <ReactECharts option={marginOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 border border-danger/20 bg-gradient-to-br from-danger/10 to-transparent">
                <div className="flex items-center gap-1.5 mb-2">
                  <Thermometer className="w-4 h-4 text-danger" />
                  <span className="text-xs text-white/60">最大包壳温度</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-danger">↓{selected?.effects.tempDown}</span>
                  <span className="text-sm text-white/50">°C</span>
                </div>
              </div>
              <div className="rounded-xl p-4 border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
                <div className="flex items-center gap-1.5 mb-2">
                  <Droplets className="w-4 h-4 text-primary" />
                  <span className="text-xs text-white/60">最小CHF比</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-primary">↑{selected?.effects.chfUp}</span>
                </div>
              </div>
              <div className="rounded-xl p-4 border border-success/20 bg-gradient-to-br from-success/10 to-transparent">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-4 h-4 text-success" />
                  <span className="text-xs text-white/60">综合安全裕量</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-bold text-success">↑{selected?.effects.marginUp}</span>
                  <span className="text-sm text-white/50">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
              <History className="w-4 h-4 text-info" />
              相似历史案例
            </h3>
            <span className="text-xs text-white/40">{mockCases.length} 条</span>
          </div>
          <div className="space-y-3">
            {mockCases.map((c) => (
              <div key={c.id} className="glass-card p-4 cursor-pointer hover:scale-[1.01] transition-transform" onClick={() => setCaseModal(c)}>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-white leading-snug">{c.configName}</h4>
                  <div className={`status-badge text-[10px] py-0.5 px-2 ${c.result === 'success' ? 'status-badge-success' : 'status-badge-danger'}`}>
                    {c.result === 'success' ? '成功' : '失败'}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/50 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {c.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    提升 {c.improve}%
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-white/40">点击查看详情</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {caseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCaseModal(null)}>
          <div className="glass-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-lg text-white mb-1">{caseModal.configName}</h3>
                <p className="text-xs text-white/50 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{caseModal.date}</span>
                  <span className={`status-badge text-[10px] py-0.5 px-2 ${caseModal.result === 'success' ? 'status-badge-success' : 'status-badge-danger'}`}>
                    {caseModal.result === 'success' ? '应用成功' : '应用失败'}
                  </span>
                </p>
              </div>
              <button onClick={() => setCaseModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                参数调整对比
              </h4>
              <div className="rounded-lg overflow-hidden border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left py-2.5 px-3 font-medium text-white/60">参数</th>
                      <th className="text-right py-2.5 px-3 font-medium text-white/60">调整前</th>
                      <th className="text-right py-2.5 px-3 font-medium text-white/60">调整后</th>
                      <th className="text-right py-2.5 px-3 font-medium text-white/60">变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(caseModal.params).map(([k, v]) => {
                      const diff = v.after - v.before;
                      const pct = v.before !== 0 ? ((diff / v.before) * 100).toFixed(1) : '—';
                      return (
                        <tr key={k} className="border-t border-white/5">
                          <td className="py-2.5 px-3 text-white/80">{k}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-white/60">{v.before}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-primary">{v.after}</td>
                          <td className={`py-2.5 px-3 text-right font-medium ${diff > 0 ? 'text-warning' : diff < 0 ? 'text-primary' : 'text-white/40'}`}>
                            {diff > 0 ? '+' : ''}{diff} ({pct}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-success" />
                应用结果数据
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 border border-danger/20 bg-danger/5">
                  <div className="text-[11px] text-white/50 mb-1">峰值温度变化</div>
                  <div className="font-display text-xl font-bold text-danger">{caseModal.results.temp > 0 ? '+' : ''}{caseModal.results.temp}°C</div>
                </div>
                <div className="rounded-lg p-3 border border-primary/20 bg-primary/5">
                  <div className="text-[11px] text-white/50 mb-1">CHF比变化</div>
                  <div className="font-display text-xl font-bold text-primary">+{caseModal.results.chf}</div>
                </div>
                <div className="rounded-lg p-3 border border-success/20 bg-success/5">
                  <div className="text-[11px] text-white/50 mb-1">裕量提升</div>
                  <div className="font-display text-xl font-bold text-success">+{caseModal.results.margin}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-5" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
        <div className="glass-card px-6 py-4 flex items-center justify-between" style={{ backdropFilter: 'blur(24px)' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-info/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-white/60">当前选中方案</div>
              <div className="font-semibold text-white">{selected?.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] text-white/50">预估综合提升</div>
              <div className="font-display font-bold text-gradient text-lg">↑{selected?.effects.marginUp}%</div>
            </div>
            <button
              onClick={handleApply}
              disabled={selected?.applied}
              className={`glow-btn gap-2 ${selected?.applied ? 'opacity-60 cursor-not-allowed hover:translate-y-0' : ''}`}
              style={selected?.applied ? { pointerEvents: 'none' } : {}}
            >
              {selected?.applied ? (
                <><CheckCircle2 className="w-4 h-4" /> 已创建模拟任务</>
              ) : (
                <><Play className="w-4 h-4" /> 一键应用此方案</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
