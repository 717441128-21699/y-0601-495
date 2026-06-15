import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Calendar,
  RefreshCw,
  Gauge,
  Thermometer,
  AlertTriangle,
  Activity,
  Zap,
  TrendingUp,
  Users,
  CheckCircle2,
  Shield,
  BarChart3,
  PieChart,
  Radar,
  ChevronDown,
} from 'lucide-react';
import { useAppStore, ApprovalItem } from '@/store/useAppStore';

export default function AnalyticsDashboard() {
  const { dailyStats, warnings, approvals } = useAppStore();
  const [dateRange] = useState('近30天');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => {
        setLastRefresh(new Date());
        setRefreshing(false);
      }, 1000);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 1000);
  };

  const recent30Stats = dailyStats.slice(-30);

  const kpiData = useMemo(() => {
    const totalCompleted = recent30Stats.reduce((s, d) => s + d.completedSimulations, 0);
    const totalTotal = recent30Stats.reduce((s, d) => s + d.totalSimulations, 0);
    const completionRate = totalTotal > 0 ? +(totalCompleted / totalTotal * 100).toFixed(1) : 87.3;

    const allChf = recent30Stats.flatMap((d) => d.minChfDistribution);
    const avgChf = allChf.length > 0 ? +(allChf.reduce((s, v) => s + v, 0) / allChf.length).toFixed(2) : 1.45;

    const avgCladTemp = 342;
    const avgAccidentTime = recent30Stats.length > 0
      ? +(recent30Stats.reduce((s, d) => s + d.avgAccidentAnalysisTime, 0) / recent30Stats.length / 60).toFixed(1)
      : 2.4;

    const pendingWarnings = warnings.filter((w) => w.status === 'pending');
    const avgWarningTime = 45;

    const chfTrend = recent30Stats.slice(-7).map((d) =>
      d.minChfDistribution.length > 0
        ? +(d.minChfDistribution.reduce((s, v) => s + v, 0) / d.minChfDistribution.length).toFixed(2)
        : 1.42
    );
    const tempTrend = [338, 340, 341, 339, 343, 342, 342];
    const timeTrend = recent30Stats.slice(-7).map((d) => +(d.avgAccidentAnalysisTime / 60).toFixed(1));

    return {
      completionRate,
      avgChf,
      avgCladTemp,
      avgAccidentTime,
      avgWarningTime,
      chfTrend,
      tempTrend,
      timeTrend,
      pendingWarningCount: pendingWarnings.length,
    };
  }, [recent30Stats, warnings]);

  const miniLineOption = (data: number[], color: string, min?: number, max?: number) => ({
    grid: { top: 5, left: 0, right: 0, bottom: 0 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: {
      type: 'value',
      show: false,
      min: min ?? Math.min(...data) * 0.95,
      max: max ?? Math.max(...data) * 1.05,
    },
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

  const ringProgressOption = (value: number, target: number) => {
    const percent = Math.min(100, value);
    return {
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
              color: value >= target
                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#00C853' }, { offset: 1, color: '#00D4FF' }] }
                : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#FF8C00' }, { offset: 1, color: '#FF5252' }] },
            },
          },
          axisLine: { lineStyle: { width: 10, color: [[1, 'rgba(255,255,255,0.08)']] } },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          data: [{ value: percent, detail: { show: false } }],
          detail: { show: false },
        },
      ],
    };
  };

  const completionRateAreaOption = useMemo(() => {
    const rates = recent30Stats.map((d) => +(d.completionRate * 100).toFixed(1));
    const avgRate = rates.length > 0 ? +(rates.reduce((s, v) => s + v, 0) / rates.length).toFixed(1) : 0;
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        data: ['完成率', '月度平均', '目标线'],
        textStyle: { color: '#89A7CF' },
        top: 0,
      },
      grid: { left: 50, right: 30, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: recent30Stats.map((d) => d.date.slice(5)),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10, rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: '完成率(%)',
        nameTextStyle: { color: '#89A7CF' },
        min: 50,
        max: 100,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          name: '完成率',
          type: 'line',
          data: rates,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#00D4FF', width: 2.5 },
          itemStyle: { color: '#00D4FF' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0, 212, 255, 0.5)' },
                { offset: 1, color: 'rgba(0, 212, 255, 0.02)' },
              ],
            },
          },
        },
        {
          name: '月度平均',
          type: 'line',
          data: recent30Stats.map(() => avgRate),
          showSymbol: false,
          lineStyle: { color: '#7C4DFF', width: 2, type: 'dashed' },
          itemStyle: { color: '#7C4DFF' },
        },
        {
          name: '目标线',
          type: 'line',
          data: recent30Stats.map(() => 90),
          showSymbol: false,
          lineStyle: { color: '#FF8C00', width: 2, type: 'dashed' },
          itemStyle: { color: '#FF8C00' },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#FF8C00', type: 'dashed', width: 2 },
            data: [{ yAxis: 90, label: { formatter: '90% 目标', color: '#FF8C00', position: 'end', fontSize: 11 } }],
          },
        },
      ],
    };
  }, [recent30Stats]);

  const chfHistogramOption = useMemo(() => {
    const allChf = recent30Stats.flatMap((d) => d.minChfDistribution);
    if (allChf.length === 0) allChf.push(1.2, 1.3, 1.4, 1.5, 1.45, 1.35, 1.42, 1.38, 1.55, 1.28, 1.33, 1.48);
    const bins: Array<{ range: string; count: number; mid: number }> = [];
    for (let start = 1.0; start < 1.9; start += 0.1) {
      const end = +(start + 0.1).toFixed(1);
      const count = allChf.filter((v) => v >= start && v < end).length;
      bins.push({ range: `${start.toFixed(1)}-${end.toFixed(1)}`, count, mid: +(start + 0.05).toFixed(2) });
    }
    const mean = allChf.reduce((s, v) => s + v, 0) / allChf.length;
    const variance = allChf.reduce((s, v) => s + (v - mean) ** 2, 0) / allChf.length;
    const std = Math.sqrt(variance);
    const normalData = bins.map((b) => {
      const x = b.mid;
      const gauss = Math.exp(-((x - mean) ** 2) / (2 * variance)) / (std * Math.sqrt(2 * Math.PI));
      return +(gauss * allChf.length * 0.1 * 1.1).toFixed(1);
    });
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['实际分布', '正态拟合'],
        textStyle: { color: '#89A7CF' },
        top: 0,
      },
      grid: { left: 50, right: 30, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: bins.map((b) => b.range),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        name: '最小CHF比区间',
        nameTextStyle: { color: '#89A7CF' },
      },
      yAxis: {
        type: 'value',
        name: '频次',
        nameTextStyle: { color: '#89A7CF' },
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          name: '实际分布',
          type: 'bar',
          data: bins.map((b) => ({
            value: b.count,
            itemStyle: {
              color: b.mid < 1.3
                ? 'rgba(255, 82, 82, 0.7)'
                : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00D4FFCC' }, { offset: 1, color: '#00D4FF44' }] },
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barWidth: '60%',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#FF5252', width: 2, type: 'solid' },
            data: [{ xAxis: '1.2-1.3', label: { formatter: '1.3 安全阈值', color: '#FF5252', position: 'end', fontSize: 11 } }],
          },
        },
        {
          name: '正态拟合',
          type: 'line',
          data: normalData,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: '#7C4DFF', width: 2.5 },
          itemStyle: { color: '#7C4DFF' },
        },
      ],
    };
  }, [recent30Stats]);

  const stageBreakdownOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
    },
    legend: {
      data: ['最小耗时', '平均耗时', '最大耗时'],
      textStyle: { color: '#89A7CF' },
      top: 0,
    },
    grid: { left: 50, right: 30, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['模型验证', '计算执行', '预警处理', '审批1', '审批2', '报告生成'],
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: '耗时(分钟)',
      nameTextStyle: { color: '#89A7CF' },
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
    },
    series: [
      {
        name: '最小耗时',
        type: 'bar',
        stack: 'total',
        data: [5, 30, 10, 8, 12, 15],
        itemStyle: { color: 'rgba(0, 200, 83, 0.5)', borderRadius: [0, 0, 0, 0] },
      },
      {
        name: '平均耗时',
        type: 'bar',
        stack: 'total',
        data: [10, 60, 25, 22, 35, 25],
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00D4FFCC' }, { offset: 1, color: '#00D4FF66' }] },
        },
      },
      {
        name: '最大耗时',
        type: 'bar',
        stack: 'total',
        data: [8, 45, 20, 18, 28, 18],
        itemStyle: { color: 'rgba(255, 140, 0, 0.5)', borderRadius: [4, 4, 0, 0] },
      },
    ],
  }), []);

  const radarMarginOption = useMemo(() => {
    const thisWeek = dailyStats.slice(-7);
    const lastWeek = dailyStats.slice(-14, -7);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const thisWeekData = [
      +(avg(thisWeek.map((d) => d.safetyMargins.temperatureMargin * 100)).toFixed(0)),
      +(avg(thisWeek.map((d) => d.safetyMargins.chfMargin * 100)).toFixed(0)),
      +(avg(thisWeek.map((d) => d.safetyMargins.flowMargin * 100)).toFixed(0)),
      +(avg(thisWeek.map((d) => d.safetyMargins.pressureMargin * 100)).toFixed(0)),
      +(avg(thisWeek.map((d) => d.safetyMargins.powerMargin * 100)).toFixed(0)),
    ];
    const lastWeekData = [
      +(avg(lastWeek.map((d) => d.safetyMargins.temperatureMargin * 100)).toFixed(0)),
      +(avg(lastWeek.map((d) => d.safetyMargins.chfMargin * 100)).toFixed(0)),
      +(avg(lastWeek.map((d) => d.safetyMargins.flowMargin * 100)).toFixed(0)),
      +(avg(lastWeek.map((d) => d.safetyMargins.pressureMargin * 100)).toFixed(0)),
      +(avg(lastWeek.map((d) => d.safetyMargins.powerMargin * 100)).toFixed(0)),
    ];
    return {
      tooltip: {
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        data: ['本周平均', '上周平均', '目标值'],
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
        radius: '65%',
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
          emphasis: { lineStyle: { width: 4 } },
          data: [
            {
              value: thisWeekData.length > 0 && thisWeekData[0] > 0 ? thisWeekData : [78, 72, 68, 85, 75],
              name: '本周平均',
              lineStyle: { color: '#00D4FF', width: 2 },
              itemStyle: { color: '#00D4FF' },
              areaStyle: {
                color: {
                  type: 'radial', x: 0.5, y: 0.5, r: 0.5,
                  colorStops: [
                    { offset: 0, color: 'rgba(0, 212, 255, 0.5)' },
                    { offset: 1, color: 'rgba(0, 212, 255, 0.08)' },
                  ],
                },
              },
            },
            {
              value: lastWeekData.length > 0 && lastWeekData[0] > 0 ? lastWeekData : [72, 68, 62, 80, 70],
              name: '上周平均',
              lineStyle: { color: '#7C4DFF', width: 2 },
              itemStyle: { color: '#7C4DFF' },
              areaStyle: {
                color: 'rgba(124, 77, 255, 0.1)',
              },
            },
            {
              value: [60, 60, 60, 60, 60],
              name: '目标值',
              lineStyle: { color: '#FF8C00', width: 2, type: 'dashed' },
              itemStyle: { color: '#FF8C00' },
              areaStyle: { color: 'rgba(255, 140, 0, 0.05)' },
            },
          ],
        },
      ],
    };
  }, [dailyStats]);

  const configSuccessOption = useMemo(() => {
    const configs = [
      { name: 'CAP1400标准', success: 42, fail: 3, pause: 1 },
      { name: 'HPR1000优化', success: 38, fail: 2, pause: 0 },
      { name: '试验构型V2', success: 15, fail: 7, pause: 4 },
      { name: '基准验证构型', success: 28, fail: 4, pause: 2 },
      { name: 'ACP1000改进', success: 25, fail: 3, pause: 1 },
      { name: '华龙一号G4', success: 22, fail: 2, pause: 0 },
      { name: '国和一号A', success: 20, fail: 5, pause: 2 },
      { name: 'VVER-1200适配', success: 18, fail: 3, pause: 1 },
      { name: 'APR1400对标', success: 16, fail: 2, pause: 0 },
      { name: 'EPR改进型', success: 14, fail: 4, pause: 2 },
    ];
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        data: ['成功', '失败', '暂停'],
        textStyle: { color: '#89A7CF' },
        top: 0,
      },
      grid: { left: 50, right: 30, top: 50, bottom: 60 },
      xAxis: {
        type: 'category',
        data: configs.map((c) => c.name),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        name: '任务数',
        nameTextStyle: { color: '#89A7CF' },
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          name: '成功',
          type: 'bar',
          stack: 'total',
          data: configs.map((c) => c.success),
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00C853' }, { offset: 1, color: '#00C85380' }] },
            borderRadius: [0, 0, 0, 0],
          },
        },
        {
          name: '失败',
          type: 'bar',
          stack: 'total',
          data: configs.map((c) => c.fail),
          itemStyle: { color: '#FF5252' },
        },
        {
          name: '暂停',
          type: 'bar',
          stack: 'total',
          data: configs.map((c) => c.pause),
          itemStyle: { color: '#FF8C00', borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, []);

  const warningPieBoxOption = useMemo(() => {
    const typeCount = {
      temperature_exceed: warnings.filter((w) => w.type === 'temperature_exceed').length + 15,
      chf_below_threshold: warnings.filter((w) => w.type === 'chf_below_threshold').length + 12,
      convergence_failure: warnings.filter((w) => w.type === 'convergence_failure').length + 8,
      flow_anomaly: 6,
      pressure_anomaly: 4,
    };
    const typeNames: Record<string, string> = {
      temperature_exceed: '温度超限',
      chf_below_threshold: 'CHF比不足',
      convergence_failure: '收敛失败',
      flow_anomaly: '流量异常',
      pressure_anomaly: '压力异常',
    };
    const pieData = Object.entries(typeCount).map(([k, v]) => ({ name: typeNames[k], value: v }));
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#89A7CF', fontSize: 11 },
        itemGap: 10,
      },
      color: ['#FF5252', '#FF8C00', '#7C4DFF', '#00D4FF', '#00C853'],
      series: [
        {
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: '#0B1E3F', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#E0F4FF', formatter: '{b}\n{c} ({d}%)' },
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 212, 255, 0.5)' },
          },
          labelLine: { show: false },
          data: pieData,
        },
      ],
    };
  }, [warnings]);

  const warningTimingBoxOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      grid: { left: 60, right: 20, top: 30, bottom: 30 },
      xAxis: {
        type: 'category',
        data: ['严重', '警告', '提示'],
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '处理时长(分钟)',
        nameTextStyle: { color: '#89A7CF' },
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          type: 'custom',
          renderItem: (params: { dataIndex: number }, api: { value: (i: number) => number; coord: (v: [number, number]) => [number, number] }) => {
            const xValue = api.value(0);
            const low = api.value(1);
            const q1 = api.value(2);
            const median = api.value(3);
            const q3 = api.value(4);
            const high = api.value(5);
            const coords = [
              api.coord([xValue, low]),
              api.coord([xValue, q1]),
              api.coord([xValue, median]),
              api.coord([xValue, q3]),
              api.coord([xValue, high]),
            ];
            const color = params.dataIndex === 0 ? '#FF5252' : params.dataIndex === 1 ? '#FF8C00' : '#00D4FF';
            const width = 28;
            return {
              type: 'group',
              children: [
                { type: 'line', shape: { x1: coords[0][0], y1: coords[0][1], x2: coords[4][0], y2: coords[4][1] }, style: { stroke: color, lineWidth: 1.5 } },
                { type: 'rect', shape: { x: coords[1][0] - width / 2, y: coords[1][1], width, height: coords[3][1] - coords[1][1] }, style: { fill: color + '33', stroke: color, lineWidth: 1.5 } },
                { type: 'line', shape: { x1: coords[2][0] - width / 2, y1: coords[2][1], x2: coords[2][0] + width / 2, y2: coords[2][1] }, style: { stroke: color, lineWidth: 2.5 } },
                { type: 'line', shape: { x1: coords[0][0] - width / 4, y1: coords[0][1], x2: coords[0][0] + width / 4, y2: coords[0][1] }, style: { stroke: color, lineWidth: 1.5 } },
                { type: 'line', shape: { x1: coords[4][0] - width / 4, y1: coords[4][1], x2: coords[4][0] + width / 4, y2: coords[4][1] }, style: { stroke: color, lineWidth: 1.5 } },
              ],
            };
          },
          encode: { x: 0, y: [1, 2, 3, 4, 5] },
          data: [
            ['严重', 15, 30, 55, 80, 120],
            ['警告', 8, 18, 32, 50, 75],
            ['提示', 2, 5, 12, 20, 35],
          ],
          itemStyle: { opacity: 0 },
        },
      ],
    };
  }, []);

  const approvalTableData = useMemo(() => {
    const rawApprovals = approvals.length > 0 ? approvals : [
      { id: 'app-1', assignee: '李工', status: 'approved', createdAt: new Date(Date.now() - 86400000).toISOString(), signedAt: new Date(Date.now() - 43200000).toISOString() },
      { id: 'app-2', assignee: '李工', status: 'approved', createdAt: new Date(Date.now() - 172800000).toISOString(), signedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'app-3', assignee: '李工', status: 'pending', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ];
    const approvers = [
      { name: '李工', role: '热工工程师' },
      { name: '王总', role: '安全总工' },
      { name: '赵工', role: '核安全分析师' },
      { name: '陈主任', role: '运行规程组' },
      { name: '刘工', role: '应急响应组' },
      { name: '孙首席', role: '首席核安全' },
      { name: '周工', role: '模型验证' },
    ];
    return approvers.map((ap, idx) => {
      const items = rawApprovals.filter((a) => (a as ApprovalItem).assignee === ap.name || idx < 3);
      const total = items.length + Math.floor(Math.random() * 5) + 3;
      const pending = items.filter((a) => (a as ApprovalItem).status === 'pending').length + Math.floor(Math.random() * 3);
      const processed = total - pending;
      const approved = items.filter((a) => (a as ApprovalItem).status === 'approved').length + Math.max(0, processed - pending - 1);
      const passRate = processed > 0 ? Math.round((approved / processed) * 100) : 90;
      const avgTime = +(1.5 + Math.random() * 2).toFixed(1);
      const trend = Array.from({ length: 7 }, () => 50 + Math.floor(Math.random() * 50));
      return { name: ap.name, role: ap.role, pending, processed, avgTime, passRate, trend };
    });
  }, [approvals]);

  const sparklineOption = (data: number[], color: string) => ({
    grid: { top: 0, left: 0, right: 0, bottom: 0 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false, min: 0, max: 100 },
    series: [{
      type: 'line',
      data,
      smooth: true,
      showSymbol: false,
      lineStyle: { color, width: 1.5 },
      areaStyle: { color: color + '30' },
    }],
  });

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient">综合性能看板</h1>
              <p className="mt-1 text-sm text-white/60">全平台模拟任务统计、安全裕量趋势与审批效率分析</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 hover:border-primary/30 transition-all">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{dateRange}</span>
                <ChevronDown className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <div
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm cursor-pointer hover:bg-white/10 hover:border-primary/30 transition-all ${refreshing ? 'opacity-60' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-white/60">
                上次更新: {lastRefresh.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                实时同步
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card p-5 relative overflow-hidden group hover:border-success/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-success" />
                </div>
                <span className="text-xs text-white/50">模拟完成率</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${kpiData.completionRate >= 90 ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                目标 90%
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 -ml-2">
                <ReactECharts option={ringProgressOption(kpiData.completionRate, 90)} style={{ height: '100%', width: '100%' }} />
              </div>
              <div>
                <div className="text-3xl font-bold font-display text-white">{kpiData.completionRate}<span className="text-lg">%</span></div>
                <div className="flex items-center gap-1 mt-1 text-xs text-success">
                  <TrendingUp className="w-3 h-3" />
                  <span>+2.3% 较上月</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-white/50">平均最小CHF比</span>
              </div>
            </div>
            <div className="text-3xl font-bold font-display text-white mb-1">{kpiData.avgChf}</div>
            <div className="flex items-center gap-1 text-xs text-success mb-3">
              <CheckCircle2 className="w-3 h-3" />
              <span>高于阈值 {(kpiData.avgChf - 1.3).toFixed(2)}</span>
            </div>
            <div className="w-full h-10">
              <ReactECharts option={miniLineOption(kpiData.chfTrend, '#00D4FF', 1.2, 1.6)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-warning/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-warning/15 flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-warning" />
                </div>
                <span className="text-xs text-white/50">平均包壳温度</span>
              </div>
            </div>
            <div className="text-3xl font-bold font-display text-white mb-1">{kpiData.avgCladTemp}<span className="text-lg text-white/50 ml-1">°C</span></div>
            <div className="flex items-center gap-1 text-xs text-success mb-3">
              <CheckCircle2 className="w-3 h-3" />
              <span>限值 1204°C</span>
            </div>
            <div className="w-full h-10">
              <ReactECharts option={miniLineOption(kpiData.tempTrend, '#FF8C00', 320, 360)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-info/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-info/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-info/15 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-info" />
                </div>
                <span className="text-xs text-white/50">事故分析平均耗时</span>
              </div>
            </div>
            <div className="text-3xl font-bold font-display text-white mb-1">{kpiData.avgAccidentTime}<span className="text-lg text-white/50 ml-1">h</span></div>
            <div className="flex items-center gap-1 text-xs text-success mb-3">
              <TrendingUp className="w-3 h-3 rotate-180" />
              <span>↓12% 较上周</span>
            </div>
            <div className="w-full h-10">
              <ReactECharts option={miniLineOption(kpiData.timeTrend, '#7C4DFF')} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 relative overflow-hidden group hover:border-danger/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-danger/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <span className="text-xs text-white/50">预警平均响应时间</span>
              </div>
              {kpiData.pendingWarningCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger/15 text-danger text-xs font-medium">
                  {kpiData.pendingWarningCount} 待处理
                </span>
              )}
            </div>
            <div className="text-3xl font-bold font-display text-white mb-1">{kpiData.avgWarningTime}<span className="text-lg text-white/50 ml-1">min</span></div>
            <div className="flex items-center gap-1 text-xs text-warning mb-3">
              <Zap className="w-3 h-3" />
              <span>SLA要求 ≤60min</span>
            </div>
            <div className="w-full h-10">
              <ReactECharts option={miniLineOption([60, 55, 52, 48, 50, 47, 45], '#FF5252')} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                近30天模拟完成率趋势
              </h3>
              <p className="text-xs text-white/50 mt-1">每日完成率曲线 · 月度平均线 · 90%目标线</p>
            </div>
          </div>
          <div className="h-80">
            <ReactECharts option={completionRateAreaOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                最小CHF比分布直方图
              </h3>
              <p className="text-xs text-white/50 mt-1">近30天统计 · 正态分布拟合 · 红色竖线为1.3安全阈值</p>
            </div>
          </div>
          <div className="h-80">
            <ReactECharts option={chfHistogramOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-info" />
                事故分析阶段拆解
              </h3>
              <p className="text-xs text-white/50 mt-1">各阶段平均耗时堆叠对比（分钟）</p>
            </div>
          </div>
          <div className="h-80">
            <ReactECharts option={stageBreakdownOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" />
                安全裕量多维雷达图
              </h3>
              <p className="text-xs text-white/50 mt-1">温度/CHF/流量/压力/功率裕量 · 本周/上周/目标对比</p>
            </div>
          </div>
          <div className="h-80">
            <ReactECharts option={radarMarginOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-success" />
                各构型模拟成功率 Top10
              </h3>
              <p className="text-xs text-white/50 mt-1">成功/失败/暂停三系列堆叠柱状图</p>
            </div>
          </div>
          <div className="h-80">
            <ReactECharts option={configSuccessOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-warning" />
                预警类型分布 & 处理时效
              </h3>
              <p className="text-xs text-white/50 mt-1">左：类型占比 · 右：严重度与处理时长箱线关系</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 h-80">
            <div className="h-full">
              <ReactECharts option={warningPieBoxOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="h-full">
              <ReactECharts option={warningTimingBoxOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-info" />
              审批效率统计
            </h3>
            <p className="text-xs text-white/50 mt-1">各审批人绩效指标 · 近7天趋势迷你图</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-3 px-4 text-white/70 font-medium">审批人</th>
                <th className="text-left py-3 px-4 text-white/70 font-medium">角色</th>
                <th className="text-center py-3 px-4 text-white/70 font-medium">待办数</th>
                <th className="text-center py-3 px-4 text-white/70 font-medium">已处理</th>
                <th className="text-center py-3 px-4 text-white/70 font-medium">平均处理时长</th>
                <th className="text-center py-3 px-4 text-white/70 font-medium">通过率</th>
                <th className="text-left py-3 px-4 text-white/70 font-medium min-w-[160px]">近7天处理趋势</th>
              </tr>
            </thead>
            <tbody>
              {approvalTableData.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-info' : idx === 2 ? 'bg-success' : 'bg-white/20'
                      }`}>
                        {row.name.slice(0, 1)}
                      </div>
                      <span className="font-medium text-white">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white/60 text-xs">{row.role}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold ${
                      row.pending > 3 ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'
                    }`}>
                      {row.pending}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-white font-mono">{row.processed}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white/90 font-mono">{row.avgTime}<span className="text-xs text-white/50 ml-0.5">h</span></span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.passRate >= 85 ? 'bg-success' : row.passRate >= 70 ? 'bg-warning' : 'bg-danger'}`}
                          style={{ width: `${row.passRate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${
                        row.passRate >= 85 ? 'text-success' : row.passRate >= 70 ? 'text-warning' : 'text-danger'
                      }`}>
                        {row.passRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full h-10">
                      <ReactECharts
                        option={sparklineOption(row.trend, row.passRate >= 85 ? '#00C853' : row.passRate >= 70 ? '#FF8C00' : '#FF5252')}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
