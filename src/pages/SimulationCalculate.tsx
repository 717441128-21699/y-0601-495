import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Play,
  Pause,
  Square,
  Settings,
  X,
  Clock,
  AlertTriangle,
  Thermometer,
  Droplets,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, type ChannelTemperature } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

interface ResidualPoint {
  step: number;
  energy: number;
  momentum: number;
  continuity: number;
}

interface AxialSlice {
  height: number;
  label: string;
  grid: number[][];
}

const TEMP_LIMIT = 650;
const CHF_LIMIT = 1.3;
const MAX_STEPS = 500;
const GRID_SIZE = 10;

export default function SimulationCalculate() {
  const { id } = useParams();
  const simId = id ?? 'sim-001';
  const {
    addChannelData,
    triggerWarning,
    currentSimulation,
    simulations,
    currentUser,
    addAdjustmentLog,
    updateSimulationStatus,
    checkConfigRisk,
    submitApproval,
  } = useAppStore();

  const sim = useMemo(() => {
    return simulations.find((s) => s.id === simId) ?? currentSimulation;
  }, [simulations, currentSimulation, simId]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [bypassFlow, setBypassFlow] = useState(5);
  const [controlRodDepth, setControlRodDepth] = useState(30);
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [residuals, setResiduals] = useState<ResidualPoint[]>([]);
  const [temperatureHistory, setTemperatureHistory] = useState<{
    step: number;
    pellet: number;
    cladding: number;
    coolant: number;
  }[]>([]);
  const [chfGrid, setChfGrid] = useState<number[][]>([]);
  const [axialSlices, setAxialSlices] = useState<AxialSlice[]>([]);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [minChfPos, setMinChfPos] = useState<{ row: number; col: number } | null>(null);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const warnedTempRef = useRef(false);
  const warnedChfRef = useRef(false);

  const addLog = (level: LogLevel, message: string) => {
    const now = new Date();
    const ts = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs((prev) => {
      const next = [
        ...prev,
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: ts,
          level,
          message,
        },
      ];
      return next.slice(-200);
    });
  };

  const generateChfGrid = (step: number, bypass: number, rod: number) => {
    const grid: number[][] = [];
    let minVal = Infinity;
    let minR = 0, minC = 0;
    const baseBias = (rod - 30) * 0.008;
    const bypassBoost = bypass * 0.012;
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: number[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const radialDist = Math.sqrt(Math.pow(r - 4.5, 2) + Math.pow(c - 4.5, 2));
        const radialFactor = 1 - radialDist * 0.04;
        const temporalNoise = Math.sin(step * 0.05 + r * 0.7 + c * 1.1) * 0.08;
        let value = 1.6 + radialFactor * 0.35 + temporalNoise - baseBias;
        if (r === 2 && c === 7) value -= 0.35 + step * 0.0008;
        value += bypassBoost;
        value = Math.max(0.8, Math.min(2.8, +value.toFixed(3)));
        if (value < minVal) {
          minVal = value;
          minR = r;
          minC = c;
        }
        row.push(value);
      }
      grid.push(row);
    }
    setMinChfPos({ row: minR, col: minC });
    return { grid, minVal, minR, minC };
  };

  const generateAxialSlices = (step: number) => {
    const heights = [0.25, 0.5, 0.75, 1.0];
    const labels = ['25% 高度', '50% 高度', '75% 高度', '100% 高度'];
    return heights.map((h, idx) => {
      const grid: number[][] = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        const row: number[] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
          const axialFactor = 0.6 + h * 0.5 - Math.abs(h - 0.7) * 0.3;
          const radialDist = Math.sqrt(Math.pow(r - 4.5, 2) + Math.pow(c - 4.5, 2));
          const radialFactor = 1 - radialDist * 0.03;
          const noise = Math.sin(step * 0.04 + r * 0.5 + c * 0.8 + idx) * 12;
          let temp = 400 + axialFactor * 180 + radialFactor * 60 + noise;
          temp = Math.max(280, Math.min(820, +temp.toFixed(1)));
          row.push(temp);
        }
        grid.push(row);
      }
      return { height: h, label: labels[idx], grid };
    });
  };

  const initData = () => {
    const { grid } = generateChfGrid(0, bypassFlow, controlRodDepth);
    setChfGrid(grid);
    setAxialSlices(generateAxialSlices(0));
    setTemperatureHistory([
      { step: 0, pellet: 820, cladding: 480, coolant: 310 },
    ]);
    setResiduals([
      { step: 0, energy: 1.0, momentum: 1.0, continuity: 1.0 },
    ]);
    setLogs([]);
    addLog('INFO', `热工水力计算任务启动：${sim?.name ?? '未命名任务'}`);
    addLog('INFO', `初始化参数：入口温度 ${sim?.inletTemp ?? 558}K，压力 ${sim?.inletPressure ?? 15.5}MPa`);
    addLog('INFO', `子通道网格：${GRID_SIZE}×${GRID_SIZE}，轴向分层：20层`);
    warnedTempRef.current = false;
    warnedChfRef.current = false;
  };

  useEffect(() => {
    initData();
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simId]);

  useEffect(() => {
    if (!logContainerRef.current) return;
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setCurrentStep((prevStep) => {
        const nextStep = Math.min(prevStep + 1, MAX_STEPS);
        const newProgress = Math.round((nextStep / MAX_STEPS) * 100);
        setProgress(newProgress);

        const timeFactor = nextStep / MAX_STEPS;
        const rodTempBias = (controlRodDepth - 30) * 2.5;
        const bypassCooling = bypassFlow * 3;

        const basePellet = 820 + timeFactor * 220 + Math.sin(nextStep * 0.08) * 15 + rodTempBias - bypassCooling;
        const baseCladding = 480 + timeFactor * 160 + Math.sin(nextStep * 0.07 + 1) * 10 + rodTempBias * 0.7 - bypassCooling * 0.8;
        const baseCoolant = 310 + timeFactor * 80 + Math.sin(nextStep * 0.06 + 2) * 6 - bypassCooling * 0.5;

        const pelletTemp = +(basePellet + (Math.random() - 0.5) * 20).toFixed(1);
        const claddingTemp = +(baseCladding + (Math.random() - 0.5) * 12).toFixed(1);
        const coolantTemp = +(baseCoolant + (Math.random() - 0.5) * 8).toFixed(1);
        const chfRatio = +(1.55 - timeFactor * 0.25 + Math.sin(nextStep * 0.04) * 0.06 + bypassFlow * 0.01 - controlRodDepth * 0.003 + (Math.random() - 0.5) * 0.1).toFixed(3);

        setTemperatureHistory((prev) => {
          const next = [...prev, { step: nextStep, pellet: pelletTemp, cladding: claddingTemp, coolant: coolantTemp }];
          return next.slice(-200);
        });

        const decayFactor = Math.pow(0.975, nextStep * 0.12);
        const noiseE = (Math.random() - 0.5) * 0.01;
        const noiseM = (Math.random() - 0.5) * 0.015;
        const noiseC = (Math.random() - 0.5) * 0.008;
        setResiduals((prev) => {
          const last = prev[prev.length - 1];
          const nextEnergy = Math.max(1e-6, last.energy * decayFactor + noiseE);
          const nextMomentum = Math.max(1e-6, last.momentum * decayFactor + noiseM);
          const nextContinuity = Math.max(1e-6, last.continuity * decayFactor + noiseC);
          const next = [
            ...prev,
            {
              step: nextStep,
              energy: +nextEnergy.toFixed(6),
              momentum: +nextMomentum.toFixed(6),
              continuity: +nextContinuity.toFixed(6),
            },
          ];
          return next.slice(-150);
        });

        const { grid, minVal, minR, minC } = generateChfGrid(nextStep, bypassFlow, controlRodDepth);
        setChfGrid(grid);
        setAxialSlices(generateAxialSlices(nextStep));

        const channelDataBatch: ChannelTemperature[] = [];
        for (let i = 0; i < 4; i++) {
          const cid = `CH-${String(nextStep % 80 + i + 1).padStart(3, '0')}`;
          channelDataBatch.push({
            channelId: cid,
            pelletCenterTemp: +(pelletTemp + (Math.random() - 0.5) * 50).toFixed(1),
            claddingSurfaceTemp: +(claddingTemp + (Math.random() - 0.5) * 30).toFixed(1),
            coolantTemp: +(coolantTemp + (Math.random() - 0.5) * 15).toFixed(1),
            chfRatio: +(chfRatio + (Math.random() - 0.5) * 0.15).toFixed(3),
            heatFlux: +(650000 + Math.random() * 300000).toFixed(0),
            timestamp: Date.now(),
          });
        }
        addChannelData(simId, channelDataBatch);

        if (nextStep % 10 === 0) {
          addLog('INFO', `迭代步 ${nextStep}/${MAX_STEPS}：能量残差=${(Math.pow(0.975, nextStep * 0.12)).toExponential(2)}`);
        }
        if (nextStep === 50) {
          addLog('INFO', '子通道流量重构完成，进入稳态迭代阶段');
        }
        if (nextStep === 150) {
          addLog('WARN', '湍流粘度比接近上限，监测k-ε模型收敛性');
        }
        if (nextStep === 320) {
          addLog('INFO', '轴向功率分布插值更新');
        }

        if (claddingTemp > TEMP_LIMIT && !warnedTempRef.current) {
          warnedTempRef.current = true;
          addLog('ERROR', `包壳温度超限：通道 CH-057 当前值 ${claddingTemp}°C > 限值 ${TEMP_LIMIT}°C`);
          triggerWarning({
            simulationId: simId,
            simulationName: sim?.name ?? '未命名任务',
            type: 'temperature_exceed',
            severity: 'critical',
            channelId: 'CH-057',
            actualValue: claddingTemp,
            limitValue: TEMP_LIMIT,
          });
        }

        if (minVal < CHF_LIMIT && !warnedChfRef.current) {
          warnedChfRef.current = true;
          addLog('ERROR', `CHF比低于阈值：通道 [${minR},${minC}] 当前值 ${minVal} < 限值 ${CHF_LIMIT}`);
          triggerWarning({
            simulationId: simId,
            simulationName: sim?.name ?? '未命名任务',
            type: 'chf_below_threshold',
            severity: 'warning',
            channelId: `CH-${String(minR * GRID_SIZE + minC + 1).padStart(3, '0')}`,
            actualValue: minVal,
            limitValue: CHF_LIMIT,
          });
        }

        if (nextStep >= MAX_STEPS) {
          addLog('INFO', `热工水力计算完成：共迭代 ${MAX_STEPS} 步，所有残差收敛到阈值以下`);
          addLog('INFO', '状态自动流转：进入事故分析阶段');
          setIsRunning(false);
          updateSimulationStatus(simId, 'accident_analysis');
          
          const latestData = temperatureHistory[temperatureHistory.length - 1];
          if (latestData) {
            const maxTemp = latestData.cladding;
            const minChf = Math.min(...chfGrid.flat());
            checkConfigRisk(sim?.configurationHash ?? '', simId, maxTemp, minChf);
          }

          setTimeout(() => {
            addLog('INFO', '事故进程时序模拟完成：喷放、再充、再淹没过程完整模拟');
            addLog('INFO', '状态自动流转：计算完成，进入审批流程');
            updateSimulationStatus(simId, 'completed');
            
            submitApproval({
              simulationId: simId,
              simulationName: sim?.name ?? '未命名任务',
              level: 'engineer_verify',
              assignee: '李工',
              submitter: currentUser.username,
              items: [
                { name: '模型完整性检查', description: '几何、边界条件、物性参数完整性', result: 'pass' },
                { name: '网格独立性验证', description: '粗/中/细网格结果偏差<3%', result: 'pass' },
                { name: 'CHF安全裕量', description: '最小CHF比值>1.30', result: 'pass' },
                { name: '包壳温度限值', description: '峰值<1477K', result: 'pass' },
              ],
              overallComment: '热工水力计算完成，结果符合设计基准要求，提交工程师验证。',
            });

            addLog('INFO', '已提交审批：热工工程师模型合理性验证（第一级）');
          }, 4000);
        }

        return nextStep;
      });
    }, 500);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, simId, sim, addChannelData, triggerWarning, bypassFlow, controlRodDepth]);

  const handleToggleRunning = () => {
    if (!isRunning) {
      if (currentStep >= MAX_STEPS) {
        setCurrentStep(0);
        setProgress(0);
        initData();
      }
      addLog('INFO', isRunning ? '计算已暂停' : '计算继续运行');
    } else {
      addLog('WARN', '用户暂停计算');
    }
    setIsRunning((r) => !r);
  };

  const handleStop = () => {
    setIsRunning(false);
    addLog('ERROR', '用户强制停止计算，状态自动回退到异常回退');
    updateSimulationStatus(simId, 'exception_rollback', { rollback: true, reason: '用户强制停止' });
  };

  const handleApplyParams = () => {
    addAdjustmentLog({
      simulationId: simId,
      type: 'bypass_flow',
      beforeValue: 5,
      afterValue: bypassFlow,
      operator: currentUser.username,
      comment: '调整旁通流量',
    });
    addAdjustmentLog({
      simulationId: simId,
      type: 'control_rod_depth',
      beforeValue: 30,
      afterValue: controlRodDepth,
      operator: currentUser.username,
      comment: '调整控制棒插入深度',
    });
    addLog('INFO', `参数调整生效：旁通流量 ${bypassFlow}%，控制棒深度 ${controlRodDepth}%`);
    setShowParamsModal(false);
  };

  const remainingSeconds = isRunning && progress > 0
    ? Math.max(0, Math.round((100 - progress) / (progress / Math.max(1, currentStep * 0.5))))
    : null;

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const temperatureOption = useMemo(() => {
    const steps = temperatureHistory.map((d) => d.step);
    const pelletData = temperatureHistory.map((d) => d.pellet);
    const claddingData = temperatureHistory.map((d) => d.cladding);
    const coolantData = temperatureHistory.map((d) => d.coolant);

    const pelletMax = Math.max(...pelletData, 1);
    const pelletMin = Math.min(...pelletData, 9999);
    const cladMax = Math.max(...claddingData, 1);
    const cladMin = Math.min(...claddingData, 9999);
    const coolMax = Math.max(...coolantData, 1);
    const coolMin = Math.min(...coolantData, 9999);
    const pelletCur = pelletData[pelletData.length - 1] ?? 0;
    const cladCur = claddingData[claddingData.length - 1] ?? 0;
    const coolCur = coolantData[coolantData.length - 1] ?? 0;

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        top: 0,
        textStyle: { color: '#89A7CF', fontSize: 11 },
        formatter: (name: string) => {
          if (name.includes('芯块')) {
            return `${name}  最高:${pelletMax.toFixed(0)}  当前:${pelletCur.toFixed(0)}  最低:${pelletMin.toFixed(0)}`;
          }
          if (name.includes('包壳')) {
            return `${name}  最高:${cladMax.toFixed(0)}  当前:${cladCur.toFixed(0)}  最低:${cladMin.toFixed(0)}`;
          }
          return `${name}  最高:${coolMax.toFixed(0)}  当前:${coolCur.toFixed(0)}  最低:${coolMin.toFixed(0)}`;
        },
      },
      grid: { left: 50, right: 20, top: 60, bottom: 40 },
      xAxis: {
        type: 'category',
        data: steps,
        min: 0,
        max: MAX_STEPS,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        name: '时间步',
        nameTextStyle: { color: '#89A7CF' },
      },
      yAxis: {
        type: 'value',
        min: 200,
        max: 1200,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
        name: '温度 (°C)',
        nameTextStyle: { color: '#89A7CF' },
      },
      series: [
        {
          name: '燃料芯块中心温度',
          type: 'line',
          data: pelletData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#FF5252' },
          itemStyle: { color: '#FF5252' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(255, 82, 82, 0.2)' }, { offset: 1, color: 'rgba(255, 82, 82, 0)' }],
            },
          },
        },
        {
          name: '包壳表面温度',
          type: 'line',
          data: claddingData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#FF8C00' },
          itemStyle: { color: '#FF8C00' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(255, 140, 0, 0.18)' }, { offset: 1, color: 'rgba(255, 140, 0, 0)' }],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#FF5252', type: 'dashed', width: 2 },
            data: [{
              yAxis: TEMP_LIMIT,
              label: {
                formatter: `包壳限值 ${TEMP_LIMIT}°C`,
                color: '#FF5252',
                position: 'end',
                fontSize: 10,
              },
            }],
          },
        },
        {
          name: '冷却剂温度',
          type: 'line',
          data: coolantData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#00D4FF' },
          itemStyle: { color: '#00D4FF' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(0, 212, 255, 0.2)' }, { offset: 1, color: 'rgba(0, 212, 255, 0)' }],
            },
          },
        },
      ],
    };
  }, [temperatureHistory]);

  const chfHeatmapOption = useMemo(() => {
    const heatmapData: [number, number, number][] = [];
    let minV = Infinity, maxV = -Infinity;
    let minRC = { r: 0, c: 0 };
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const v = chfGrid[r]?.[c] ?? 1.5;
        heatmapData.push([c, r, v]);
        if (v < minV) { minV = v; minRC = { r, c }; }
        if (v > maxV) maxV = v;
      }
    }
    const avgV = heatmapData.reduce((s, d) => s + d[2], 0) / heatmapData.length;
    return {
      tooltip: {
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
        formatter: (params: { data: [number, number, number] }) => {
          const [c, r, v] = params.data;
          const status = v < CHF_LIMIT
            ? `<span style="color:#FF5252">⚠ 超限</span>`
            : v < 2.0
              ? `<span style="color:#FFC107">● 注意</span>`
              : `<span style="color:#00C853">✓ 正常</span>`;
          return `通道 [R${r + 1},C${c + 1}]<br/>CHF比: <b>${v.toFixed(3)}</b><br/>状态: ${status}`;
        },
      },
      grid: { left: 60, right: 100, top: 30, bottom: 50 },
      xAxis: {
        type: 'category',
        data: Array.from({ length: GRID_SIZE }, (_, i) => `C${i + 1}`),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 9, interval: 0 },
        splitArea: { show: true, areaStyle: { color: ['rgba(0,212,255,0.02)', 'rgba(0,212,255,0.05)'] } },
      },
      yAxis: {
        type: 'category',
        data: Array.from({ length: GRID_SIZE }, (_, i) => `R${i + 1}`),
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 9, interval: 0 },
        splitArea: { show: true },
      },
      visualMap: {
        type: 'continuous',
        min: 0.8,
        max: 2.8,
        right: 10,
        top: 'center',
        itemHeight: 200,
        itemWidth: 15,
        text: ['高', '低'],
        textStyle: { color: '#89A7CF', fontSize: 10 },
        inRange: {
          color: ['#FF5252', '#FF8C00', '#FFC107', '#66BB6A', '#00C853', '#00D4FF'],
        },
        pieces: [
          { lte: 1.3, label: '<1.3 危险', color: '#FF5252' },
          { gt: 1.3, lte: 2.0, label: '1.3~2.0 注意', color: '#FFC107' },
          { gt: 2.0, label: '>2.0 安全', color: '#00D4FF' },
        ],
      },
      graphic: minChfPos ? [{
        type: 'rect',
        left: 60 + (minChfPos.col / GRID_SIZE) * (400 - 100 - 60),
        top: 30 + (minChfPos.row / GRID_SIZE) * (320 - 30 - 50),
        shape: {
          width: (400 - 100 - 60) / GRID_SIZE,
          height: (320 - 30 - 50) / GRID_SIZE,
        },
        style: {
          stroke: '#FF0000',
          lineWidth: 2.5,
          fill: 'transparent',
        },
      }, {
        type: 'text',
        left: 60 + (minChfPos.col / GRID_SIZE) * (400 - 100 - 60) + 4,
        top: 10,
        style: {
          text: `最小CHF: ${minV.toFixed(3)} @ R${minRC.r + 1}C${minRC.c + 1}`,
          fill: '#FF5252',
          fontSize: 11,
          fontWeight: 'bold',
        },
      }] : [],
      series: [
        {
          name: 'CHF比',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            formatter: (p: { data: [number, number, number] }) => p.data[2].toFixed(1),
            color: '#0B1E3F',
            fontSize: 9,
            fontWeight: 'bold',
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,212,255,0.6)' },
          },
        },
        {
          type: 'custom',
          renderItem: () => ({ type: 'group' }),
          data: [],
          markPoint: {
            symbol: 'pin',
            symbolSize: 40,
            label: { formatter: `min ${minV.toFixed(2)}`, fontSize: 9, color: '#fff' },
            itemStyle: { color: '#FF0000' },
            data: [{ coord: [minRC.c, minRC.r] }],
          },
        },
      ],
      title: [
        {
          text: `最小: ${minV.toFixed(3)}   平均: ${avgV.toFixed(3)}   最大: ${maxV.toFixed(3)}`,
          left: 'center',
          bottom: 5,
          textStyle: { color: '#89A7CF', fontSize: 11, fontWeight: 'normal' },
        },
      ],
    };
  }, [chfGrid, minChfPos]);

  const residualOption = useMemo(() => {
    const steps = residuals.map((d) => d.step);
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#00D4FF40',
        textStyle: { color: '#E0F4FF' },
      },
      legend: {
        top: 0,
        textStyle: { color: '#89A7CF', fontSize: 10 },
      },
      grid: { left: 50, right: 20, top: 35, bottom: 30 },
      xAxis: {
        type: 'category',
        data: steps,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 9 },
      },
      yAxis: {
        type: 'log',
        min: 1e-6,
        max: 1,
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 9, formatter: (v: number) => v.toExponential(0) },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
        name: '残差 (log)',
        nameTextStyle: { color: '#89A7CF', fontSize: 9 },
      },
      series: [
        {
          name: '能量残差',
          type: 'line',
          data: residuals.map((d) => d.energy),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#FF5252' },
          itemStyle: { color: '#FF5252' },
        },
        {
          name: '动量残差',
          type: 'line',
          data: residuals.map((d) => d.momentum),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#FFC107' },
          itemStyle: { color: '#FFC107' },
        },
        {
          name: '连续性残差',
          type: 'line',
          data: residuals.map((d) => d.continuity),
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#00D4FF' },
          itemStyle: { color: '#00D4FF' },
        },
      ],
    };
  }, [residuals]);

  const tempColor = (t: number) => {
    if (t < 350) return '#00D4FF';
    if (t < 500) return '#4FC3F7';
    if (t < 600) return '#66BB6A';
    if (t < 650) return '#FFC107';
    if (t < 720) return '#FF8C00';
    return '#FF5252';
  };

  const getSliceStats = (slice: AxialSlice) => {
    const flat = slice.grid.flat();
    return {
      avg: flat.reduce((s, v) => s + v, 0) / flat.length,
      max: Math.max(...flat),
      min: Math.min(...flat),
    };
  };

  const logColor = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return '#FF5252';
      case 'WARN': return '#FFC107';
      default: return '#89A7CF';
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient flex items-center gap-2">
                <Thermometer className="w-6 h-6 text-primary" />
                热工水力计算实时监控
              </h1>
              <p className="mt-1 text-sm text-white/60">
                任务 {sim?.name ?? ''} · ID: {simId} · 通道数: {sim?.channelCount ?? 193}
              </p>
            </div>
            <div className={cn(
              'status-badge',
              isRunning ? 'status-badge-success pulse-border' : currentStep >= MAX_STEPS ? 'status-badge-primary' : 'status-badge-warning'
            )}>
              {isRunning ? '计算中' : currentStep >= MAX_STEPS ? '已完成' : '已暂停'}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {remainingSeconds !== null && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                <Clock className="w-4 h-4 text-info" />
                <span className="text-xs text-white/60">剩余估算</span>
                <span className="font-mono text-lg font-bold text-info">{formatRemaining(remainingSeconds)}</span>
              </div>
            )}

            <button
              onClick={handleToggleRunning}
              className={cn(
                'glow-btn flex items-center gap-2',
                isRunning && 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 text-yellow-400'
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  暂停计算
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {currentStep === 0 ? '开始计算' : '继续计算'}
                </>
              )}
            </button>

            <button
              onClick={() => setShowParamsModal(true)}
              className="glow-btn flex items-center gap-2"
              style={{ borderColor: 'rgba(124, 77, 255, 0.5)', color: '#A78BFA' }}
            >
              <Settings className="w-4 h-4" />
              调整参数
            </button>

            <button
              onClick={handleStop}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm font-display tracking-wide uppercase border transition-all hover:shadow-lg hover:shadow-red-500/30 active:translate-y-0 bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/50 text-red-400 hover:from-red-500/30 hover:to-red-600/20"
            >
              <Square className="w-4 h-4" />
              停止计算
            </button>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-white/60 mb-2">
            <span>迭代进度 · 第 {currentStep}/{MAX_STEPS} 步</span>
            <span className="font-mono font-bold text-primary">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00D4FF, #7C4DFF, #00D4FF)',
                backgroundSize: '200% 100%',
                animation: isRunning ? 'text-shimmer 2s linear infinite' : 'none',
              }}
            >
              {isRunning && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              )}
            </div>
            <div
              className="absolute top-0 h-full bg-red-500/20 border-l-2 border-red-500/60"
              style={{ left: `${(TEMP_LIMIT / 1200) * 100}%` }}
              title="温度安全阈值参考"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-400" />
              多通道实时温度曲线
            </h3>
            <p className="text-xs text-white/50 mt-1">燃料芯块 / 包壳 / 冷却剂温度监测</p>
          </div>
          <div className="h-[340px]">
            <ReactECharts option={temperatureOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              CHF比横截面热力图
            </h3>
            <p className="text-xs text-white/50 mt-1">{GRID_SIZE}×{GRID_SIZE}堆芯横截面 · 红框=最小CHF通道</p>
          </div>
          <div className="h-[340px]">
            <ReactECharts option={chfHeatmapOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              轴向温度切片组图
            </h3>
            <p className="text-xs text-white/50 mt-1">4个高度截面温度分布 · 悬停查看统计</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {axialSlices.map((slice, idx) => {
              const stats = getSliceStats(slice);
              const cellSize = 100 / GRID_SIZE;
              return (
                <div
                  key={idx}
                  className={cn(
                    'relative rounded-xl p-3 transition-all cursor-pointer',
                    'bg-gradient-to-br from-white/3 to-white/1 border border-primary/15',
                    hoveredSlice === idx && 'border-primary/60 shadow-lg shadow-primary/20 scale-105'
                  )}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <div className="text-center mb-2">
                    <div className="text-xs font-bold text-primary">{slice.label}</div>
                    <div className="text-[10px] text-white/40">截面 #{idx + 1}</div>
                  </div>
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full aspect-square rounded-lg overflow-hidden border border-white/10"
                    style={{ background: '#061529' }}
                  >
                    {slice.grid.map((row, r) =>
                      row.map((val, c) => (
                        <rect
                          key={`${r}-${c}`}
                          x={c * cellSize}
                          y={r * cellSize}
                          width={cellSize + 0.5}
                          height={cellSize + 0.5}
                          fill={tempColor(val)}
                          opacity={0.92}
                        />
                      ))
                    )}
                  </svg>
                  {hoveredSlice === idx && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full z-20 px-3 py-2 rounded-lg text-xs whitespace-nowrap pointer-events-none"
                      style={{ background: 'rgba(11, 30, 63, 0.97)', border: '1px solid rgba(0, 212, 255, 0.4)', color: '#E0F4FF' }}
                    >
                      <div className="font-semibold text-primary mb-1">{slice.label} 统计</div>
                      <div>平均: <span className="font-mono text-cyan-400">{stats.avg.toFixed(1)}°C</span></div>
                      <div>最高: <span className="font-mono text-red-400">{stats.max.toFixed(1)}°C</span></div>
                      <div>位置: <span className="font-mono">截面{idx + 1}/4</span></div>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full border-4 border-transparent"
                        style={{ borderTopColor: 'rgba(0, 212, 255, 0.4)' }}
                      />
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                    <div className="text-center py-1 rounded bg-cyan-500/10">
                      <div className="text-white/40">平均</div>
                      <div className="font-mono text-cyan-400 font-bold">{stats.avg.toFixed(0)}</div>
                    </div>
                    <div className="text-center py-1 rounded bg-red-500/10">
                      <div className="text-white/40">最高</div>
                      <div className="font-mono text-red-400 font-bold">{stats.max.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="text-xs text-white/50 mb-2">温度色谱图例</div>
            <div className="flex items-center gap-1 h-5 rounded overflow-hidden">
              {[
                { t: '200', c: '#00D4FF' },
                { t: '350', c: '#4FC3F7' },
                { t: '500', c: '#66BB6A' },
                { t: '600', c: '#FFC107' },
                { t: '650', c: '#FF8C00' },
                { t: '800+', c: '#FF5252' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-1 h-full flex items-center justify-center text-[9px] text-white font-mono"
                  style={{ backgroundColor: item.c + 'CC' }}
                  title={`${item.t}°C`}
                >
                  {item.t}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              计算监控面板
            </h3>
            <p className="text-xs text-white/50 mt-1">迭代进度 · 收敛残差 · 运行日志</p>
          </div>

          <div className="space-y-4">
            <div className="h-[160px]">
              <ReactECharts option={residualOption} style={{ height: '100%', width: '100%' }} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-white/60 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-warning" />
                  计算日志
                </div>
                <div className="flex gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    INFO {logs.filter(l => l.level === 'INFO').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                    WARN {logs.filter(l => l.level === 'WARN').length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                    ERR {logs.filter(l => l.level === 'ERROR').length}
                  </span>
                </div>
              </div>
              <div
                ref={logContainerRef}
                className="h-[150px] overflow-y-auto rounded-lg bg-[#061529]/80 border border-white/5 p-3 font-mono text-[11px] leading-relaxed space-y-1"
              >
                {logs.length === 0 ? (
                  <div className="text-white/30 text-center py-6">等待日志输出...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2 items-start">
                      <span className="text-white/30 flex-shrink-0">{log.timestamp}</span>
                      <span
                        className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: logColor(log.level) + '20',
                          color: logColor(log.level),
                        }}
                      >
                        {log.level}
                      </span>
                      <span className="text-white/80 break-all">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showParamsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-gradient flex items-center gap-2">
                <Settings className="w-5 h-5 text-info" />
                计算参数调整
              </h3>
              <button
                onClick={() => setShowParamsModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    旁通流量分配
                  </label>
                  <span className="font-mono text-lg font-bold text-cyan-400">{bypassFlow.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={bypassFlow}
                  onChange={(e) => setBypassFlow(+e.target.value)}
                  className="slider-custom w-full"
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>0% 最小旁通</span>
                  <span>7.5% 参考值</span>
                  <span>15% 最大旁通</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    控制棒插入深度
                  </label>
                  <span className="font-mono text-lg font-bold text-yellow-400">{controlRodDepth.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={controlRodDepth}
                  onChange={(e) => setControlRodDepth(+e.target.value)}
                  className="slider-custom w-full"
                  style={{
                    background: controlRodDepth > 70
                      ? 'linear-gradient(90deg, rgba(255,82,82,0.3), rgba(255,140,0,0.1))'
                      : undefined,
                  }}
                />
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>0% 完全提出</span>
                  <span>50% 半插</span>
                  <span className={controlRodDepth > 70 ? 'text-red-400' : ''}>100% 完全插入</span>
                </div>
                {controlRodDepth > 70 && (
                  <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>控制棒插入过深可能引入过大的负反应性，导致温度场异常偏低，请谨慎操作。</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-center">
                  <div className="text-[10px] text-white/40 mb-1">温度场预估变化</div>
                  <div className="font-mono text-sm text-cyan-400">
                    ↓ {(bypassFlow * 2 + (100 - controlRodDepth) * 0.5).toFixed(1)} K
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-white/40 mb-1">CHF裕量预估变化</div>
                  <div className="font-mono text-sm text-green-400">
                    ↑ {(bypassFlow * 0.008 + (100 - controlRodDepth) * 0.001).toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowParamsModal(false)}
                className="flex-1 px-5 py-2.5 rounded-lg font-medium text-sm border border-white/15 text-white/70 hover:bg-white/5 transition"
              >
                取消
              </button>
              <button
                onClick={handleApplyParams}
                className="flex-1 glow-btn flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                应用调整
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
