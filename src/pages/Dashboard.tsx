import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  AlertTriangle,
  Plus,
  Bell,
  CheckSquare,
  FileText,
  Thermometer,
  Gauge,
  Clock,
  Activity,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, type WarningSeverity } from '@/store/useAppStore';

const severityColorMap: Record<WarningSeverity, string> = {
  critical: '#FF5252',
  warning: '#FF8C00',
  info: '#00D4FF',
};

const statusTextMap: Record<string, string> = {
  pending_validation: '待校验',
  mesh_generation: '网格生成',
  thermal_calculation: '热工计算',
  accident_analysis: '事故分析',
  completed: '完成',
  exception_rollback: '异常',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { warnings, simulations, dailyStats, approvals, channelData, currentSimulation } = useAppStore();

  const displayWarnings = useMemo(() => {
    const base = [...warnings].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
    if (base.length >= 5) return base.slice(0, 5);
    const extras = [
      {
        id: 'warn-extra-1',
        simulationId: 'sim-005',
        simulationName: '网格收敛性研究-粗网格',
        type: 'temperature_exceed' as const,
        severity: 'warning' as WarningSeverity,
        channelId: 'CH-045',
        actualValue: 1268.3,
        limitValue: 1200.0,
        status: 'pending' as const,
        triggeredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'warn-extra-2',
        simulationId: 'sim-003',
        simulationName: 'LOCA-大破口-敏感性分析A',
        type: 'chf_below_threshold' as const,
        severity: 'critical' as WarningSeverity,
        channelId: 'CH-112',
        actualValue: 1.02,
        limitValue: 1.15,
        status: 'pending' as const,
        triggeredAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      },
    ];
    return [...base, ...extras].slice(0, 5);
  }, [warnings]);

  const taskDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      pending_validation: 8,
      mesh_generation: 5,
      thermal_calculation: 12,
      accident_analysis: 3,
      completed: 45,
      exception_rollback: 2,
    };
    simulations.forEach((s) => {
      if (counts[s.status] !== undefined) counts[s.status]++;
    });
    return counts;
  }, [simulations]);

  const chfMiniTrend = [1.42, 1.45, 1.39, 1.51, 1.48, 1.46, 1.48];
  const tempMiniTrend = [338, 340, 341, 339, 343, 342, 342];
  const timeMiniTrend = [2.8, 2.6, 2.5, 2.7, 2.5, 2.4, 2.4];

  const temperatureChannelData = useMemo(() => {
    const simId = currentSimulation?.id ?? 'sim-001';
    const raw = channelData[simId] ?? [];
    const channelIds = Array.from(new Set(raw.map((d) => d.channelId))).slice(0, 10);
    const timestamps = Array.from(new Set(raw.map((d) => d.timestamp))).sort((a, b) => a - b);
    const timeLabels = timestamps.map((_, i) => `t-${timestamps.length - i}`).reverse();

    const series: Array<{ name: string; type: string; data: number[]; smooth: boolean; lineStyle: { width: number } }> = [];
    const pelletColors = ['#00D4FF', '#4FC3F7', '#29B6F6', '#03A9F4', '#039BE5'];
    const cladColors = ['#FF8C00', '#FFA726', '#FFB74D', '#FFCC80', '#FFE0B2'];
    const coolColors = ['#00C853', '#69F0AE', '#B9F6CA'];

    channelIds.forEach((cid, idx) => {
      const byTime = new Map(raw.filter((d) => d.channelId === cid).map((d) => [d.timestamp, d]));
      const pelletData = timestamps.map((ts) => byTime.get(ts)?.pelletCenterTemp ?? null);
      const cladData = timestamps.map((ts) => byTime.get(ts)?.claddingSurfaceTemp ?? null);
      const coolData = timestamps.map((ts) => byTime.get(ts)?.coolantTemp ?? null);
      if (idx < 3) {
        series.push({ name: `${cid} 芯块`, type: 'line', data: pelletData, smooth: true, lineStyle: { width: 2 } });
      }
      if (idx < 4) {
        series.push({ name: `${cid} 包壳`, type: 'line', data: cladData, smooth: true, lineStyle: { width: 2 } });
      }
      if (idx < 3) {
        series.push({ name: `${cid} 冷却剂`, type: 'line', data: coolData, smooth: true, lineStyle: { width: 2 } });
      }
    });

    for (let i = 0; i < series.length; i++) {
      const colorPool = [...pelletColors, ...cladColors, ...coolColors];
      (series[i] as unknown as { lineStyle: { width: number; color?: string }; itemStyle?: { color?: string } }).lineStyle.color = colorPool[i % colorPool.length];
      (series[i] as unknown as { itemStyle: { color?: string } }).itemStyle = { color: colorPool[i % colorPool.length] };
    }

    return { timeLabels, series };
  }, [channelData, currentSimulation]);

  const chfDistributionData = useMemo(() => {
    const recent = dailyStats.slice(-15);
    return recent.map((d) => ({
      date: d.date.slice(5),
      values: d.minChfDistribution.length > 0 ? d.minChfDistribution : [1.35, 1.42, 1.48, 1.51, 1.38],
    }));
  }, [dailyStats]);

  const pendingApprovalCount = approvals.filter((a) => a.status === 'pending').length;
  const pendingWarningCount = warnings.filter((w) => w.status === 'pending').length;

  const miniLineOption = (data: number[], color: string) => ({
    grid: { top: 5, left: 0, right: 0, bottom: 0 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: Math.min(...data) * 0.95, max: Math.max(...data) * 1.05 },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        showSymbol: false,
        lineStyle: { color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '00' },
            ],
          },
        },
      },
    ],
  });

  const miniRingOption = (value: number) => ({
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#00D4FF' },
                { offset: 1, color: '#7C4DFF' },
              ],
            },
          },
        },
        axisLine: { lineStyle: { width: 8, color: [[1, 'rgba(0, 212, 255, 0.15)']] } },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value, detail: { show: false } }],
        detail: { show: false },
      },
    ],
  });

  const pieOption = {
    tooltip: { trigger: 'item', backgroundColor: 'rgba(11, 30, 63, 0.95)', borderColor: '#00D4FF40', textStyle: { color: '#E0F4FF' } },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#89A7CF' }, itemGap: 12 },
    color: ['#7C4DFF', '#00D4FF', '#00C853', '#FF8C00', '#5C6BC0', '#FF5252'],
    series: [
      {
        type: 'pie',
        radius: ['45%', '72%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#0B1E3F', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#E0F4FF', formatter: '{b}: {c}' },
          itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 212, 255, 0.5)' },
        },
        labelLine: { show: false },
        data: Object.entries(taskDistribution).map(([key, value]) => ({
          name: statusTextMap[key] ?? key,
          value,
        })),
      },
    ],
  };

  const temperatureOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
    },
    legend: {
      type: 'scroll',
      top: 0,
      textStyle: { color: '#89A7CF', fontSize: 11 },
      pageTextStyle: { color: '#89A7CF' },
      pageIconColor: '#00D4FF',
      pageIconInactiveColor: '#3B5A82',
    },
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: temperatureChannelData.timeLabels,
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '温度(K)',
      nameTextStyle: { color: '#89A7CF' },
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
    },
    series: temperatureChannelData.series,
  };

  const chfBarOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
      axisPointer: { type: 'shadow' },
    },
    legend: { top: 0, textStyle: { color: '#89A7CF' } },
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: chfDistributionData.map((d) => d.date),
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      name: '最小CHF比',
      nameTextStyle: { color: '#89A7CF' },
      min: 1.0,
      max: 1.8,
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
    },
    series: [
      {
        name: '最小值',
        type: 'bar',
        stack: 'total',
        barWidth: '45%',
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const vals = chfDistributionData[params.dataIndex].values;
            return Math.min(...vals) < 1.3 ? '#FF5252' : '#00D4FF';
          },
        },
        data: chfDistributionData.map((d) => Math.min(...d.values)),
      },
      {
        name: '最大值',
        type: 'bar',
        stack: 'total',
        barWidth: '45%',
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const vals = chfDistributionData[params.dataIndex].values;
            const min = Math.min(...vals);
            const max = Math.max(...vals);
            return max < 1.3 || min < 1.3 ? 'rgba(255, 82, 82, 0.4)' : 'rgba(0, 212, 255, 0.35)';
          },
        },
        data: chfDistributionData.map((d) => {
          const vals = d.values;
          return +(Math.max(...vals) - Math.min(...vals)).toFixed(2);
        }),
      },
      {
        name: '安全阈值',
        type: 'line',
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#FF8C00', type: 'dashed', width: 2 },
          data: [{ yAxis: 1.3, label: { formatter: '1.3 阈值', color: '#FF8C00', position: 'end' } }],
        },
        data: [],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-6 space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-secondary/60 backdrop-blur-md">
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-dark-bg to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-dark-bg to-transparent z-10 pointer-events-none" />
        <div className="flex items-center px-4 py-3 border-b border-primary/10">
          <AlertTriangle className="w-5 h-5 text-warning mr-3 flex-shrink-0" />
          <span className="text-sm font-semibold text-primary flex-shrink-0 mr-6">最新预警</span>
          <div className="flex-1 overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...displayWarnings, ...displayWarnings].map((w, i) => (
                <div
                  key={`${w.id}-${i}`}
                  onClick={() => navigate('/warnings')}
                  className="flex items-center mx-8 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div
                    className="w-1 h-6 rounded-full mr-3 flex-shrink-0"
                    style={{ backgroundColor: severityColorMap[w.severity] }}
                  />
                  <span className="text-xs text-gray-300 mr-2">
                    {new Date(w.triggeredAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-sm font-medium text-white mr-2">{w.simulationName}</span>
                  <span className="text-xs" style={{ color: severityColorMap[w.severity] }}>
                    [{w.channelId ?? '系统'}] {w.actualValue} / 限值 {w.limitValue}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6 overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-5 h-5 text-primary" />
                  <span className="text-sm text-gray-400">最小CHF比</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-display text-white">1.48</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </span>
                </div>
              </div>
              <div className="w-28 h-14">
                <ReactECharts option={miniLineOption(chfMiniTrend, '#00D4FF')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
              <span>7日趋势</span>
              <span className="text-primary">阈值 1.30</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6 overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-warning/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-warning" />
                  <span className="text-sm text-gray-400">平均包壳温度</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-display text-white">342</span>
                  <span className="text-lg text-gray-400">°C</span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </span>
                </div>
              </div>
              <div className="w-28 h-14">
                <ReactECharts option={miniLineOption(tempMiniTrend, '#FF8C00')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
              <span>7日趋势</span>
              <span className="text-warning">限值 1204°C</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6 overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-success/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-success" />
                  <span className="text-sm text-gray-400">模拟完成率</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-display text-white">87.3</span>
                  <span className="text-lg text-gray-400">%</span>
                </div>
              </div>
              <div className="w-20 h-20 -mt-2">
                <ReactECharts option={miniRingOption(87.3)} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
              <span>本月累计</span>
              <span className="text-success">74 / 85 任务</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-6 overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-40 h-40 bg-info/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-info" />
                  <span className="text-sm text-gray-400">平均事故分析耗时</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-display text-white">2.4</span>
                  <span className="text-lg text-gray-400">h</span>
                </div>
              </div>
              <div className="w-28 h-14">
                <ReactECharts option={miniLineOption(timeMiniTrend, '#7C4DFF')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
              <span>7日趋势</span>
              <span className="text-info">↓ 12% 较上周</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-primary/20 bg-secondary/50 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white">任务状态分布</h3>
              <p className="text-xs text-gray-500 mt-1">当前所有模拟任务状态统计</p>
            </div>
          </div>
          <div className="h-72">
            <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-secondary/50 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white">实时温度多通道监测</h3>
              <p className="text-xs text-gray-500 mt-1">芯块中心 / 包壳 / 冷却剂温度 · 最近100时间步</p>
            </div>
          </div>
          <div className="h-72">
            <ReactECharts option={temperatureOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-primary/20 bg-secondary/50 backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white">近15天最小CHF比分布</h3>
              <p className="text-xs text-gray-500 mt-1">每日最小/最大值区间 · 1.3安全阈值</p>
            </div>
          </div>
          <div className="h-72">
            <ReactECharts option={chfBarOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white px-1">快速操作</h3>

          <button
            onClick={() => navigate('/simulations/new')}
            className="w-full relative rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-info/10 backdrop-blur-xl p-5 text-left hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-white">新建模拟任务</div>
                  <div className="text-xs text-gray-500 mt-0.5">发起新的热工水力模拟</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate('/warnings')}
            className="w-full relative rounded-xl border border-warning/30 bg-gradient-to-r from-warning/10 to-danger/10 backdrop-blur-xl p-5 text-left hover:border-warning/60 hover:shadow-lg hover:shadow-warning/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center group-hover:bg-warning/30 transition-colors">
                  <Bell className="w-6 h-6 text-warning" />
                  {pendingWarningCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center">
                      {pendingWarningCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white">待处理预警</div>
                  <div className="text-xs text-gray-500 mt-0.5">需要关注的安全预警</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-warning group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate('/approvals')}
            className="w-full relative rounded-xl border border-info/30 bg-gradient-to-r from-info/10 to-primary/10 backdrop-blur-xl p-5 text-left hover:border-info/60 hover:shadow-lg hover:shadow-info/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center group-hover:bg-info/30 transition-colors">
                  <CheckSquare className="w-6 h-6 text-info" />
                  {pendingApprovalCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-info text-white text-xs font-bold flex items-center justify-center">
                      {pendingApprovalCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white">待我审批</div>
                  <div className="text-xs text-gray-500 mt-0.5">模拟任务审批确认</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-info group-hover:translate-x-1 transition-all" />
            </div>
          </button>

          <button
            onClick={() => navigate('/reports')}
            className="w-full relative rounded-xl border border-success/30 bg-gradient-to-r from-success/10 to-primary/10 backdrop-blur-xl p-5 text-left hover:border-success/60 hover:shadow-lg hover:shadow-success/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center group-hover:bg-success/30 transition-colors">
                  <FileText className="w-6 h-6 text-success" />
                </div>
                <div>
                  <div className="font-semibold text-white">最新报告</div>
                  <div className="text-xs text-gray-500 mt-0.5">热工分析报告归档</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-success group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
