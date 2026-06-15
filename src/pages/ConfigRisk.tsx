import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  ShieldAlert,
  TriangleAlert,
  PauseCircle,
  Activity,
  Search,
  Filter,
  Eye,
  RotateCcw,
  Pause,
  Clock,
  Calendar,
  Thermometer,
  Droplets,
  X,
  FileText,
  Hash,
  Layers,
  AlertOctagon,
  BarChart3,
  Radar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAppStore, type ConfigurationRisk, type RiskLevel, type RiskStatus } from '@/store/useAppStore';

interface ExtendedConfigRisk extends ConfigurationRisk {
  reactorType: string;
  simulationCount: number;
  consecutiveOverlimit: number;
}

const reactorTypes: Record<string, string> = {
  'cfg-i9j0k1l2': '试验堆型V2',
  'cfg-a1b2c3d4': 'CAP1400压水堆',
  'cfg-e5f6g7h8': 'HPR1000华龙一号',
  'cfg-m3n4o5p6': '基准验证堆型',
  'cfg-q7r8s9t0': 'CAP1000压水堆',
  'cfg-u1v2w3x4': '快堆试验型',
};

const riskLevelConfig: Record<RiskLevel, { label: string; badge: string; color: string; bg: string }> = {
  low: { label: '低风险', badge: 'status-badge-success', color: '#00C853', bg: 'rgba(0, 200, 83, 0.1)' },
  medium: { label: '中风险', badge: 'status-badge-warning', color: '#FF8C00', bg: 'rgba(255, 140, 0, 0.1)' },
  high: { label: '高风险', badge: 'status-badge-danger', color: '#FF5252', bg: 'rgba(255, 82, 82, 0.1)' },
};

const statusConfig: Record<RiskStatus, { label: string; badge: string }> = {
  active: { label: '正常运行', badge: 'status-badge-primary' },
  suspended: { label: '已暂停', badge: 'status-badge-info' },
};

const extraConfigs: ExtendedConfigRisk[] = [
  {
    id: 'risk-003',
    name: 'HPR1000优化构型',
    hash: 'cfg-e5f6g7h8',
    reactorType: 'HPR1000华龙一号',
    exceedCount: 1,
    simulationCount: 12,
    consecutiveOverlimit: 1,
    riskLevel: 'low',
    status: 'active',
    lastExceedAt: '2026-06-10T16:30:00Z',
    history: [
      { simulationId: 'sim-006', exceededAt: '2026-06-10T16:30:00Z', maxTemp: 1478.2, minChf: 1.28 },
    ],
  },
  {
    id: 'risk-004',
    name: '基准验证构型',
    hash: 'cfg-m3n4o5p6',
    reactorType: '基准验证堆型',
    exceedCount: 0,
    simulationCount: 8,
    consecutiveOverlimit: 0,
    riskLevel: 'low',
    status: 'active',
    lastExceedAt: '',
    history: [],
  },
  {
    id: 'risk-005',
    name: 'CAP1000标准堆芯',
    hash: 'cfg-q7r8s9t0',
    reactorType: 'CAP1000压水堆',
    exceedCount: 3,
    simulationCount: 25,
    consecutiveOverlimit: 2,
    riskLevel: 'medium',
    status: 'active',
    lastExceedAt: '2026-06-12T09:15:00Z',
    history: [
      { simulationId: 'sim-007', exceededAt: '2026-06-12T09:15:00Z', maxTemp: 1480.8, minChf: 1.18 },
      { simulationId: 'sim-008', exceededAt: '2026-06-08T11:40:00Z', maxTemp: 1479.5, minChf: 1.21 },
      { simulationId: 'sim-old-010', exceededAt: '2026-05-28T14:20:00Z', maxTemp: 1477.6, minChf: 1.25 },
    ],
  },
  {
    id: 'risk-006',
    name: '快堆试验构型',
    hash: 'cfg-u1v2w3x4',
    reactorType: '快堆试验型',
    exceedCount: 5,
    simulationCount: 6,
    consecutiveOverlimit: 4,
    riskLevel: 'high',
    status: 'suspended',
    lastExceedAt: '2026-06-05T08:50:00Z',
    history: [
      { simulationId: 'sim-009', exceededAt: '2026-06-05T08:50:00Z', maxTemp: 1520.5, minChf: 0.88 },
      { simulationId: 'sim-010', exceededAt: '2026-06-03T15:10:00Z', maxTemp: 1508.2, minChf: 0.94 },
      { simulationId: 'sim-011', exceededAt: '2026-06-01T10:25:00Z', maxTemp: 1501.8, minChf: 0.98 },
      { simulationId: 'sim-old-012', exceededAt: '2026-05-25T13:05:00Z', maxTemp: 1492.4, minChf: 1.02 },
      { simulationId: 'sim-old-013', exceededAt: '2026-05-18T09:30:00Z', maxTemp: 1485.6, minChf: 1.08 },
    ],
  },
];

export default function ConfigRisk() {
  const { configRisks, simulations, dailyStats } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskLevel>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | RiskStatus>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<ExtendedConfigRisk | null>(null);
  const [localData, setLocalData] = useState<ExtendedConfigRisk[]>([]);

  const allConfigs = useMemo(() => {
    const base = configRisks.map((r) => ({
      ...r,
      reactorType: reactorTypes[r.hash] ?? '未知堆型',
      simulationCount: simulations.filter((s) => s.configurationHash === r.hash).length + 3,
      consecutiveOverlimit: r.exceedCount >= 4 ? r.exceedCount : Math.min(r.exceedCount + 1, 3),
    }));
    const existing = new Set(base.map((b) => b.id));
    const merged = [...base, ...extraConfigs.filter((e) => !existing.has(e.id))];
    return localData.length > 0 ? localData : merged;
  }, [configRisks, simulations, localData]);

  const filtered = useMemo(() => {
    return allConfigs.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.hash.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRisk = riskFilter === 'all' || r.riskLevel === riskFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchRisk && matchStatus;
    });
  }, [allConfigs, searchQuery, riskFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: allConfigs.length,
      highRisk: allConfigs.filter((r) => r.riskLevel === 'high').length,
      suspended: allConfigs.filter((r) => r.status === 'suspended').length,
      weekExceed: allConfigs.reduce((sum, r) => {
        const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
        return sum + r.history.filter((h) => new Date(h.exceededAt).getTime() > cutoff).length;
      }, 0),
    };
  }, [allConfigs]);

  const trendOption = useMemo(() => {
    const last30 = dailyStats.slice(-30);
    const dates = last30.map((d) => d.date.slice(5));
    const exceedByDate: Record<string, number> = {};
    allConfigs.forEach((cfg) => {
      cfg.history.forEach((h) => {
        const d = h.exceededAt.split('T')[0].slice(5);
        exceedByDate[d] = (exceedByDate[d] ?? 0) + 1;
      });
    });
    const exceedCounts = dates.map((d) => {
      if (exceedByDate[d] !== undefined) return exceedByDate[d];
      return Math.floor(Math.random() * 3);
    });
    const avgChf = last30.map((d) => {
      const arr = d.minChfDistribution.length > 0 ? d.minChfDistribution : [1.35, 1.42, 1.38];
      return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: { top: 0, textStyle: { color: '#89A7CF' }, right: 0 },
      grid: { left: 55, right: 55, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10, rotate: 30 },
      },
      yAxis: [
        {
          type: 'value',
          name: '超限次数',
          nameTextStyle: { color: '#FF8C00' },
          axisLine: { lineStyle: { color: '#3B5A82' } },
          axisLabel: { color: '#FF8C00', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
        },
        {
          type: 'value',
          name: '平均CHF比',
          nameTextStyle: { color: '#00D4FF' },
          axisLine: { lineStyle: { color: '#3B5A82' } },
          axisLabel: { color: '#00D4FF', fontSize: 10 },
          min: 1.0,
          max: 1.8,
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '超限次数',
          type: 'line',
          yAxisIndex: 0,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#FF8C00', width: 3 },
          itemStyle: { color: '#FF8C00' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(255, 140, 0, 0.25)' }, { offset: 1, color: 'rgba(255, 140, 0, 0)' }],
            },
          },
          data: exceedCounts,
        },
        {
          name: '平均CHF比',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#00D4FF', width: 3 },
          itemStyle: { color: '#00D4FF' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(0, 212, 255, 0.2)' }, { offset: 1, color: 'rgba(0, 212, 255, 0)' }],
            },
          },
          data: avgChf,
        },
      ],
    };
  }, [dailyStats, allConfigs]);

  const radarOption = useMemo(() => {
    if (!selectedRisk) return {};
    const baseScore = { low: 85, medium: 60, high: 35 }[selectedRisk.riskLevel];
    const variance = () => Math.floor(Math.random() * 20 - 10);
    const indicators = [
      { name: '温度稳定性', max: 100 },
      { name: 'CHF裕量', max: 100 },
      { name: '流量均衡性', max: 100 },
      { name: '压力可靠性', max: 100 },
      { name: '收敛一致性', max: 100 },
      { name: '构型成熟度', max: 100 },
    ];
    const values = indicators.map((_, i) => Math.max(20, Math.min(98, baseScore + variance() + (i === 5 ? 5 : 0))));
    return {
      tooltip: {
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#89A7CF', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.5)' } },
        splitArea: { areaStyle: { color: ['rgba(11, 30, 63, 0.3)', 'rgba(11, 30, 63, 0.1)'] } },
        axisLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.5)' } },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: '#00D4FF', width: 2 },
          itemStyle: { color: '#00D4FF' },
          areaStyle: {
            color: {
              type: 'radial', x: 0.5, y: 0.5, r: 0.5,
              colorStops: [{ offset: 0, color: 'rgba(0, 212, 255, 0.5)' }, { offset: 1, color: 'rgba(0, 212, 255, 0.1)' }],
            },
          },
          data: [{ value: values, name: '风险评分' }],
        },
      ],
    };
  }, [selectedRisk]);

  const handleSuspend = (id: string) => {
    setLocalData((prev) => {
      const source = prev.length > 0 ? prev : allConfigs;
      return source.map((r) => (r.id === id ? { ...r, status: 'suspended' as RiskStatus } : r));
    });
  };

  const handleRestore = (id: string) => {
    setLocalData((prev) => {
      const source = prev.length > 0 ? prev : allConfigs;
      return source.map((r) => (r.id === id ? { ...r, status: 'active' as RiskStatus, riskLevel: (r.exceedCount <= 1 ? 'low' : 'medium') as RiskLevel } : r));
    });
  };

  const openDrawer = (r: ExtendedConfigRisk) => {
    setSelectedRisk(r);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-7 h-7 text-warning" />
          <h1 className="font-display text-2xl font-bold text-gradient">构型风险管控</h1>
        </div>
        <p className="text-sm text-white/60">堆芯构型风险等级评估 · 超限历史追溯 · 暂停/恢复管理</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs text-white/40">全部构型</span>
            </div>
            <div className="font-display text-3xl font-bold text-white">{stats.total}</div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
              <span>在役构型总数</span>
              <BarChart3 className="w-3.5 h-3.5 text-primary/60" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-danger/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-danger/15 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5 text-danger" />
              </div>
              <span className="text-xs text-white/40">≥4次超限</span>
            </div>
            <div className="font-display text-3xl font-bold text-danger">{stats.highRisk}</div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
              <span>高风险构型数</span>
              <TriangleAlert className="w-3.5 h-3.5 text-danger/60" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-info/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-info/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-info" />
              </div>
              <span className="text-xs text-white/40">禁止新任务</span>
            </div>
            <div className="font-display text-3xl font-bold text-info">{stats.suspended}</div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
              <span>已暂停构型数</span>
              <Pause className="w-3.5 h-3.5 text-info/60" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-warning/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
                <Activity className="w-5 h-5 text-warning" />
              </div>
              <span className="text-xs text-white/40">近7天</span>
            </div>
            <div className="font-display text-3xl font-bold text-warning">{stats.weekExceed}</div>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/50">
              <span>本周超限次数</span>
              <Clock className="w-3.5 h-3.5 text-warning/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索构型名称或哈希..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/40" />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
              >
                <option value="all">全部风险等级</option>
                <option value="low">低风险</option>
                <option value="medium">中风险</option>
                <option value="high">高风险</option>
              </select>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
            >
              <option value="all">全部状态</option>
              <option value="active">正常运行</option>
              <option value="suspended">已暂停</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] border-b border-white/10">
                <th className="text-left py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">构型名称 / 哈希</th>
                <th className="text-left py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">反应堆类型</th>
                <th className="text-center py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">模拟次数</th>
                <th className="text-center py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">连续超限</th>
                <th className="text-center py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">风险等级</th>
                <th className="text-center py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">状态</th>
                <th className="text-left py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">最后超限时间</th>
                <th className="text-right py-3.5 px-5 font-medium text-white/70 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rl = riskLevelConfig[r.riskLevel];
                const st = statusConfig[r.status];
                return (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-medium text-white">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-white/40 font-mono">
                        <Hash className="w-3 h-3" />
                        {r.hash}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-white/80">{r.reactorType}</td>
                    <td className="py-4 px-5 text-center">
                      <span className="font-mono text-primary font-medium">{r.simulationCount}</span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`font-mono font-semibold ${r.consecutiveOverlimit >= 3 ? 'text-danger' : r.consecutiveOverlimit >= 2 ? 'text-warning' : 'text-white/70'}`}>
                        {r.consecutiveOverlimit}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className={`status-badge ${rl.badge}`}>{rl.label}</div>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <div className={`status-badge ${st.badge}`}>{st.label}</div>
                    </td>
                    <td className="py-4 px-5">
                      {r.lastExceedAt ? (
                        <span className="text-xs text-white/60 flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-white/40" />
                          {new Date(r.lastExceedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-xs text-white/30">— 无超限记录 —</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDrawer(r)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          查看详情
                        </button>
                        {r.status === 'suspended' ? (
                          <button
                            onClick={() => handleRestore(r.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-success border border-success/30 bg-success/5 hover:bg-success/15 hover:border-success/50 transition-all"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            申请恢复
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(r.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-warning border border-warning/30 bg-warning/5 hover:bg-warning/15 hover:border-warning/50 transition-all"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            暂停
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-white/40">
                    <div className="flex flex-col items-center gap-3">
                      <Filter className="w-10 h-10 text-white/20" />
                      <span>没有符合筛选条件的构型</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              风险趋势分析
            </h3>
            <p className="text-xs text-white/50 mt-1">近30天各构型超限次数趋势 · 平均CHF比趋势</p>
          </div>
        </div>
        <div className="h-80">
          <ReactECharts option={trendOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </div>

      {drawerOpen && selectedRisk && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="ml-auto w-full max-w-2xl h-full bg-gradient-to-br from-[#0a1e3c] to-[#061529] border-l border-primary/20 flex flex-col relative z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="p-6 border-b border-white/10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-xl font-bold text-white">{selectedRisk.name}</h2>
                  <div className={`status-badge ${riskLevelConfig[selectedRisk.riskLevel].badge}`}>
                    {riskLevelConfig[selectedRisk.riskLevel].label}
                  </div>
                </div>
                <p className="text-xs text-white/50 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{selectedRisk.hash}</span>
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{selectedRisk.reactorType}</span>
                </p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/50 mb-1.5">累计模拟任务</div>
                  <div className="font-display text-2xl font-bold text-primary">{selectedRisk.simulationCount}</div>
                </div>
                <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/50 mb-1.5">累计超限次数</div>
                  <div className={`font-display text-2xl font-bold ${selectedRisk.exceedCount >= 4 ? 'text-danger' : selectedRisk.exceedCount >= 2 ? 'text-warning' : 'text-success'}`}>
                    {selectedRisk.exceedCount}
                  </div>
                </div>
                <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/50 mb-1.5">连续超限次数</div>
                  <div className="font-display text-2xl font-bold text-warning">{selectedRisk.consecutiveOverlimit}</div>
                </div>
                <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02]">
                  <div className="text-xs text-white/50 mb-1.5">当前状态</div>
                  <div className="mt-1.5">
                    <div className={`status-badge ${statusConfig[selectedRisk.status].badge}`}>
                      {statusConfig[selectedRisk.status].label}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Radar className="w-4 h-4 text-info" />
                  风险评估雷达图
                </h4>
                <div className="h-72 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  超限历史时间线
                </h4>
                <div className="space-y-3">
                  {selectedRisk.history.length === 0 ? (
                    <div className="rounded-xl p-8 border border-white/10 bg-white/[0.02] text-center">
                      <CheckCircle2 className="w-8 h-8 text-success/60 mx-auto mb-2" />
                      <div className="text-sm text-white/60">暂无超限记录，构型运行稳定</div>
                    </div>
                  ) : (
                    selectedRisk.history.map((h, idx) => (
                      <div key={idx} className="relative pl-6">
                        {idx < selectedRisk.history.length - 1 && (
                          <div className="absolute left-[7px] top-6 bottom-[-12px] w-px bg-gradient-to-b from-primary/50 to-transparent" />
                        )}
                        <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${h.minChf < 1.0 || h.maxTemp > 1500 ? 'bg-danger' : h.minChf < 1.15 || h.maxTemp > 1485 ? 'bg-warning' : 'bg-primary'}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                        <div className="rounded-xl p-4 border border-white/10 bg-white/[0.02] hover:border-white/15 transition-colors">
                          <div className="flex items-start justify-between mb-2.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-white/40" />
                                <span className="text-xs font-mono text-white/70">{h.simulationId}</span>
                              </div>
                              <div className="text-[11px] text-white/40 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(h.exceededAt).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {h.minChf < 1.0 || h.maxTemp > 1500 ? (
                                <span className="status-badge status-badge-danger text-[10px] py-0.5 px-2">严重超限</span>
                              ) : (
                                <span className="status-badge status-badge-warning text-[10px] py-0.5 px-2">超限</span>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="rounded-lg p-2.5 bg-white/[0.02]">
                              <div className="flex items-center gap-1 text-[11px] text-white/50 mb-1">
                                <Thermometer className="w-3 h-3 text-danger/70" />
                                峰值包壳温度
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className={`font-mono font-bold ${h.maxTemp > 1485 ? 'text-danger' : 'text-warning'}`}>{h.maxTemp.toFixed(1)}</span>
                                <span className="text-xs text-white/40">K</span>
                                <span className="text-[10px] text-danger ml-auto">限值 1477K</span>
                              </div>
                            </div>
                            <div className="rounded-lg p-2.5 bg-white/[0.02]">
                              <div className="flex items-center gap-1 text-[11px] text-white/50 mb-1">
                                <Droplets className="w-3 h-3 text-primary/70" />
                                最小CHF比
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className={`font-mono font-bold ${h.minChf < 1.0 ? 'text-danger' : h.minChf < 1.15 ? 'text-warning' : 'text-primary'}`}>{h.minChf.toFixed(2)}</span>
                                <span className="text-[10px] text-warning ml-auto">阈值 1.15</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                            <span className="text-[11px] text-white/50">处理结果</span>
                            <span className="text-[11px] flex items-center gap-1.5">
                              {idx >= 3 ? (
                                <><XCircle className="w-3.5 h-3.5 text-danger" /><span className="text-danger">构型已暂停</span></>
                              ) : idx === 0 ? (
                                <><Clock className="w-3.5 h-3.5 text-warning" /><span className="text-warning">处理中 · AI分析</span></>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-success" /><span className="text-success">参数调整后恢复</span></>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/10 bg-black/20 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-white/50">
                  <span className="flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-warning/60" />当前状态：{statusConfig[selectedRisk.status].label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {selectedRisk.status === 'suspended' ? (
                    <button
                      onClick={() => {
                        handleRestore(selectedRisk.id);
                        setSelectedRisk({ ...selectedRisk, status: 'active' });
                      }}
                      className="glow-btn gap-2"
                      style={{ background: 'linear-gradient(135deg, rgba(0, 200, 83, 0.2), rgba(0, 200, 83, 0.08))', borderColor: 'rgba(0, 200, 83, 0.5)', color: '#00C853' }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      申请恢复运行
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleSuspend(selectedRisk.id);
                        setSelectedRisk({ ...selectedRisk, status: 'suspended' });
                      }}
                      className="glow-btn gap-2"
                      style={{ background: 'linear-gradient(135deg, rgba(255, 82, 82, 0.2), rgba(255, 82, 82, 0.08))', borderColor: 'rgba(255, 82, 82, 0.5)', color: '#FF5252' }}
                    >
                      <Pause className="w-4 h-4" />
                      暂停构型使用
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
