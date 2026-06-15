import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Grid3X3,
  Box,
  Eye,
  Monitor,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  Hash,
  Flame,
  Layers,
  Fuel,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  SearchCheck,
  Loader2,
  Activity,
} from 'lucide-react';

type ViewTab = '2d' | '3d';
type Projection = 'orthographic' | 'perspective';
type ColorMode = 'type' | 'id' | 'density';
type ChannelType = 'fuel' | 'bypass' | 'guide';

interface ChannelCell {
  id: number;
  q: number;
  r: number;
  type: ChannelType;
  area: number;
  hydraulicDiameter: number;
  powerDensity: number;
}

const channelTypeColors: Record<ChannelType, { fill: string; stroke: string; glow: string; label: string }> = {
  fuel: { fill: 'rgba(0, 212, 255, 0.55)', stroke: '#00D4FF', glow: 'rgba(0, 212, 255, 0.8)', label: '燃料通道' },
  bypass: { fill: 'rgba(124, 77, 255, 0.55)', stroke: '#7C4DFF', glow: 'rgba(124, 77, 255, 0.8)', label: '旁通通道' },
  guide: { fill: 'rgba(140, 150, 170, 0.45)', stroke: '#8C96AA', glow: 'rgba(140, 150, 170, 0.7)', label: '导向管' },
};

const HEX_SIZE = 28;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;

function generateHexGrid(): ChannelCell[] {
  const cells: ChannelCell[] = [];
  const ring = 5;
  let id = 1;
  const guidePositions = new Set(['0,0', '-2,-2', '2,2', '-2,2', '2,-2', '0,-4', '0,4', '-4,0', '4,0']);
  const bypassPositions = new Set(['-1,-1', '1,1', '-1,1', '1,-1', '-3,0', '3,0', '0,-3', '0,3', '-2,0', '2,0', '0,-2', '0,2', '-3,2', '3,-2', '-2,3', '2,-3', '-3,-2', '3,2', '-2,-3', '2,3']);

  for (let q = -ring + 1; q < ring; q++) {
    for (let r = -ring + 1; r < ring; r++) {
      const s = -q - r;
      if (Math.abs(s) >= ring) continue;
      const key = `${q},${r}`;
      let type: ChannelType = 'fuel';
      if (guidePositions.has(key)) type = 'guide';
      else if (bypassPositions.has(key)) type = 'bypass';
      cells.push({
        id: id++,
        q,
        r,
        type,
        area: type === 'fuel' ? 58.9 : type === 'bypass' ? 52.3 : 78.5,
        hydraulicDiameter: type === 'fuel' ? 12.6 : type === 'bypass' ? 11.8 : 15.2,
        powerDensity: type === 'fuel' ? 380 + Math.random() * 80 : type === 'guide' ? 0 : 20 + Math.random() * 30,
      });
    }
  }
  return cells;
}

function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_W * (q + r / 2);
  const y = (HEX_H * 3) / 4 * r;
  return { x, y };
}

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    pts.push(`${px.toFixed(3)},${py.toFixed(3)}`);
  }
  return pts.join(' ');
}

export default function SimulationMesh() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [viewTab, setViewTab] = useState<ViewTab>('2d');
  const [projection, setProjection] = useState<Projection>('orthographic');
  const [colorMode, setColorMode] = useState<ColorMode>('type');
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [channelCount, setChannelCount] = useState(61);
  const [fuelRodCount, setFuelRodCount] = useState(37);
  const [bypassCount, setBypassCount] = useState(15);
  const [rodDiameter, setRodDiameter] = useState(9.5);
  const [pitch, setPitch] = useState(12.6);
  const [activeHeight, setActiveHeight] = useState(3660);

  const cells = useMemo(() => generateHexGrid(), []);
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    cells.forEach((c) => {
      const { x, y } = hexToPixel(c.q, c.r);
      minX = Math.min(minX, x - HEX_SIZE);
      maxX = Math.max(maxX, x + HEX_SIZE);
      minY = Math.min(minY, y - HEX_SIZE);
      maxY = Math.max(maxY, y + HEX_SIZE);
    });
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [cells]);

  const getChannelColor = (cell: ChannelCell): { fill: string; stroke: string; glow: string } => {
    if (colorMode === 'id') {
      const hue = (cell.id * 37) % 360;
      return {
        fill: `hsla(${hue}, 80%, 55%, 0.55)`,
        stroke: `hsl(${hue}, 85%, 60%)`,
        glow: `hsla(${hue}, 85%, 60%, 0.7)`,
      };
    }
    if (colorMode === 'density') {
      const maxD = 460;
      const ratio = Math.min(1, cell.powerDensity / maxD);
      const hue = 200 - ratio * 160;
      return {
        fill: `hsla(${hue}, 85%, 55%, 0.55)`,
        stroke: `hsl(${hue}, 90%, 60%)`,
        glow: `hsla(${hue}, 90%, 60%, 0.7)`,
      };
    }
    return channelTypeColors[cell.type];
  };

  const handleGenerate = () => {
    if (generating) return;
    setGenerating(true);
    setGenProgress(0);
    const interval = setInterval(() => {
      setGenProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setGenerating(false);
          return 100;
        }
        return p + 2;
      });
    }, 60);
  };

  const histogramOption = useMemo(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 30, 63, 0.95)',
      borderColor: '#00D4FF40',
      textStyle: { color: '#E0F4FF' },
      axisPointer: { type: 'shadow' },
    },
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: 'category',
      name: '正交性',
      nameTextStyle: { color: '#89A7CF', fontSize: 11 },
      data: ['0.90-0.92', '0.92-0.94', '0.94-0.96', '0.96-0.98', '0.98-1.00'],
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: '单元数',
      nameTextStyle: { color: '#89A7CF', fontSize: 11 },
      axisLine: { lineStyle: { color: '#3B5A82' } },
      axisLabel: { color: '#89A7CF', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
    },
    series: [
      {
        type: 'bar',
        barWidth: '55%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#00D4FF' },
              { offset: 1, color: 'rgba(0, 212, 255, 0.2)' },
            ],
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 15,
            shadowColor: 'rgba(0, 212, 255, 0.6)',
          },
        },
        data: [3, 12, 58, 187, 412],
      },
    ],
  }), []);

  const violinOption = useMemo(() => {
    const seedData = [0.12, 0.15, 0.18, 0.2, 0.22, 0.23, 0.25, 0.26, 0.27, 0.28, 0.29, 0.3, 0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.38, 0.4, 0.42, 0.45, 0.5];
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(11, 30, 63, 0.95)',
        borderColor: '#7C4DFF40',
        textStyle: { color: '#E0F4FF' },
      },
      grid: { left: 50, right: 20, top: 30, bottom: 40 },
      xAxis: {
        type: 'category',
        data: ['全部单元'],
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: '扭曲度 (°)',
        nameTextStyle: { color: '#89A7CF', fontSize: 11 },
        axisLine: { lineStyle: { color: '#3B5A82' } },
        axisLabel: { color: '#89A7CF', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(59, 90, 130, 0.3)' } },
      },
      series: [
        {
          type: 'violin',
          data: [seedData],
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(124, 77, 255, 0.7)' },
                { offset: 1, color: 'rgba(124, 77, 255, 0.2)' },
              ],
            },
            borderColor: '#7C4DFF',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: { shadowBlur: 15, shadowColor: 'rgba(124, 77, 255, 0.6)' },
          },
        },
      ],
    };
  }, []);

  const hoveredCell = cells.find((c) => c.id === hoveredId);
  const selectedCell = cells.find((c) => c.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">网格构建可视化</h1>
            <p className="mt-1.5 text-xs text-white/60 font-mono">任务ID: {id} · 六边形堆芯组件 · {cells.length} 通道单元</p>
          </div>
          {selectedCell && (
            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
                <span className="text-white/50 font-mono mr-2">选中</span>
                <span className="text-primary font-display font-bold">CH-{selectedCell.id.toString().padStart(3, '0')}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg" style={{ background: channelTypeColors[selectedCell.type].fill, borderColor: channelTypeColors[selectedCell.type].stroke, borderWidth: 1 }}>
                <span style={{ color: channelTypeColors[selectedCell.type].stroke }} className="font-display font-bold">
                  {channelTypeColors[selectedCell.type].label}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
            <button
              onClick={() => setViewTab('2d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${viewTab === '2d' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'text-white/50 hover:text-white/80'}`}
            >
              <Grid3X3 className="w-4 h-4" />
              2D网格视图
            </button>
            <button
              onClick={() => setViewTab('3d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all ${viewTab === '3d' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,212,255,0.3)]' : 'text-white/50 hover:text-white/80'}`}
            >
              <Box className="w-4 h-4" />
              3D几何视图
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
            <button
              onClick={() => setProjection('orthographic')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${projection === 'orthographic' ? 'bg-info/20 text-info shadow-[0_0_12px_rgba(124,77,255,0.25)]' : 'text-white/50 hover:text-white/80'}`}
              title="正交视图"
            >
              <Monitor className="w-3.5 h-3.5" />
              正交
            </button>
            <button
              onClick={() => setProjection('perspective')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${projection === 'perspective' ? 'bg-info/20 text-info shadow-[0_0_12px_rgba(124,77,255,0.25)]' : 'text-white/50 hover:text-white/80'}`}
              title="透视视图"
            >
              <Eye className="w-3.5 h-3.5" />
              透视
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
            <button
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="px-2 font-mono text-xs text-primary font-bold w-12 text-center">{Math.round(zoom * 100)}%</div>
            <button
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              onClick={() => setZoom(1)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all"
              title="重置"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-mono">着色模式:</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
              <button
                onClick={() => setColorMode('type')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${colorMode === 'type' ? 'bg-success/20 text-success shadow-[0_0_12px_rgba(0,200,83,0.25)]' : 'text-white/50 hover:text-white/80'}`}
              >
                <Palette className="w-3.5 h-3.5" />
                通道类型
              </button>
              <button
                onClick={() => setColorMode('id')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${colorMode === 'id' ? 'bg-success/20 text-success shadow-[0_0_12px_rgba(0,200,83,0.25)]' : 'text-white/50 hover:text-white/80'}`}
              >
                <Hash className="w-3.5 h-3.5" />
                通道编号
              </button>
              <button
                onClick={() => setColorMode('density')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all ${colorMode === 'density' ? 'bg-success/20 text-success shadow-[0_0_12px_rgba(0,200,83,0.25)]' : 'text-white/50 hover:text-white/80'}`}
              >
                <Flame className="w-3.5 h-3.5" />
                功率密度
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-3 space-y-5">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm text-white/90">网格参数</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">通道数量</label>
                  <span className="text-xs font-display font-bold text-primary">{channelCount}</span>
                </div>
                <input type="range" min={37} max={91} step={1} value={channelCount} onChange={(e) => setChannelCount(+e.target.value)} className="slider-custom" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">燃料棒数量</label>
                  <span className="text-xs font-display font-bold text-primary">{fuelRodCount}</span>
                </div>
                <input type="range" min={20} max={70} step={1} value={fuelRodCount} onChange={(e) => setFuelRodCount(+e.target.value)} className="slider-custom" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">旁通通道数</label>
                  <span className="text-xs font-display font-bold text-info">{bypassCount}</span>
                </div>
                <input type="range" min={5} max={30} step={1} value={bypassCount} onChange={(e) => setBypassCount(+e.target.value)} className="slider-custom" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="w-4 h-4 text-warning" />
              <h3 className="font-display font-bold text-sm text-white/90">几何尺寸</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">燃料棒径 (mm)</label>
                  <span className="text-xs font-display font-bold text-warning">{rodDiameter.toFixed(2)}</span>
                </div>
                <input type="range" min={8} max={11} step={0.1} value={rodDiameter} onChange={(e) => setRodDiameter(+e.target.value)} className="slider-custom" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">节距 (mm)</label>
                  <span className="text-xs font-display font-bold text-warning">{pitch.toFixed(2)}</span>
                </div>
                <input type="range" min={10} max={16} step={0.1} value={pitch} onChange={(e) => setPitch(+e.target.value)} className="slider-custom" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-white/60 font-mono">活性区高度 (mm)</label>
                  <span className="text-xs font-display font-bold text-warning">{activeHeight}</span>
                </div>
                <input type="range" min={3000} max={4200} step={10} value={activeHeight} onChange={(e) => setActiveHeight(+e.target.value)} className="slider-custom" />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <SearchCheck className="w-4 h-4 text-success" />
              <h3 className="font-display font-bold text-sm text-white/90">网格质量指标</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 to-primary/[0.03] p-3 overflow-hidden group hover:border-primary/50 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">正交性</div>
                  <div className="mt-1 font-display text-2xl font-bold text-primary">0.98</div>
                  <div className="mt-0.5 text-[10px] text-success font-mono">↑ 优</div>
                </div>
              </div>
              <div className="relative rounded-xl border border-info/25 bg-gradient-to-br from-info/10 to-info/[0.03] p-3 overflow-hidden group hover:border-info/50 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-info/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">长宽比</div>
                  <div className="mt-1 font-display text-2xl font-bold text-info">1.02</div>
                  <div className="mt-0.5 text-[10px] text-success font-mono">↑ 优</div>
                </div>
              </div>
              <div className="relative rounded-xl border border-warning/25 bg-gradient-to-br from-warning/10 to-warning/[0.03] p-3 overflow-hidden group hover:border-warning/50 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-warning/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">扭曲度</div>
                  <div className="mt-1 font-display text-2xl font-bold text-warning">0.3°</div>
                  <div className="mt-0.5 text-[10px] text-success font-mono">↑ 良</div>
                </div>
              </div>
              <div className="relative rounded-xl border border-success/25 bg-gradient-to-br from-success/10 to-success/[0.03] p-3 overflow-hidden group hover:border-success/50 transition-all">
                <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">雅可比</div>
                  <div className="mt-1 font-display text-2xl font-bold text-success">0.99</div>
                  <div className="mt-0.5 text-[10px] text-success font-mono">↑ 优</div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full relative rounded-xl border border-primary/40 bg-gradient-to-r from-primary/20 via-info/20 to-primary/20 backdrop-blur-xl p-4 text-left hover:border-primary/70 hover:shadow-lg hover:shadow-primary/20 transition-all group disabled:opacity-80"
          >
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl bg-primary/25 flex items-center justify-center group-hover:bg-primary/35 transition-colors ${generating ? 'animate-pulse' : ''}`}>
                {generating ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Fuel className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-sm text-white/90">{generating ? '网格生成中...' : '生成网格模型'}</div>
                <div className="text-[11px] text-white/50 font-mono mt-0.5">{generating ? `${genProgress}% 完成 · 请稍候` : `${cells.length} 单元 · 四面体/六面体混合`}</div>
              </div>
              {!generating && <Play className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${generating ? genProgress : 100}%`,
                  background: 'linear-gradient(90deg, #00D4FF, #7C4DFF, #00D4FF)',
                  backgroundSize: '200% 100%',
                  animation: generating ? 'shimmer 1.5s linear infinite' : 'none',
                }}
              />
            </div>
          </button>
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-5">
          <div className="glass-card p-5 min-h-[620px] relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-40" />
            <div className="absolute top-5 left-5 right-5 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] font-mono text-white/50 mr-2">模型</span>
                  <span className="text-xs font-display font-bold text-white/90">5×5 六边形组件</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm">
                  <span className="text-[10px] font-mono text-white/50 mr-2">单元</span>
                  <span className="text-xs font-display font-bold text-primary">{cells.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {(Object.keys(channelTypeColors) as ChannelType[]).map((t) => (
                  <div key={t} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40 border border-white/10 backdrop-blur-sm">
                    <div className="w-3 h-3 rounded" style={{ background: channelTypeColors[t].fill, border: `1.5px solid ${channelTypeColors[t].stroke}` }} />
                    <span className="text-[10px] font-mono" style={{ color: channelTypeColors[t].stroke }}>{channelTypeColors[t].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {viewTab === '2d' ? (
              <div className="relative h-[560px] w-full flex items-center justify-center overflow-hidden">
                <svg
                  viewBox={`${bounds.minX - 30} ${bounds.minY - 30} ${bounds.width + 60} ${bounds.height + 60}`}
                  className="max-w-full max-h-full transition-transform duration-300 ease-out"
                  style={{ transform: `scale(${zoom})` }}
                  onMouseMove={(e) => setTooltipPos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <defs>
                    <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0, 212, 255, 0.08)" />
                      <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
                    </radialGradient>
                    {cells.map((c) => {
                      return (
                        <filter key={`glow-${c.id}`} id={`filter-glow-${c.id}`} x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      );
                    })}
                  </defs>

                  <circle cx={(bounds.minX + bounds.maxX) / 2} cy={(bounds.minY + bounds.maxY) / 2} r={Math.max(bounds.width, bounds.height) / 2} fill="url(#bg-glow)" />

                  {cells.map((c) => {
                    const { x, y } = hexToPixel(c.q, c.r);
                    const pts = hexPoints(x, y, HEX_SIZE - 1.5);
                    const ptsInner = hexPoints(x, y, HEX_SIZE - 6);
                    const col = getChannelColor(c);
                    const isSelected = c.id === selectedId;
                    const isHovered = c.id === hoveredId;
                    const scale = isHovered ? 1.06 : isSelected ? 1.03 : 1;
                    return (
                      <g
                        key={c.id}
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: `${x}px ${y}px`,
                          transformBox: 'fill-box',
                          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedId(c.id)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        {(isSelected || isHovered) && (
                          <polygon
                            points={hexPoints(x, y, HEX_SIZE + 2)}
                            fill="none"
                            stroke={col.glow}
                            strokeWidth={isSelected ? 3 : 2}
                            opacity={isSelected ? 0.9 : 0.6}
                            filter={`url(#filter-glow-${c.id})`}
                          />
                        )}
                        <polygon
                          points={pts}
                          fill={col.fill}
                          stroke={col.stroke}
                          strokeWidth={isSelected ? 2.5 : 1.2}
                          opacity={selectedId && !isSelected && !isHovered ? 0.55 : 1}
                        />
                        <polygon
                          points={ptsInner}
                          fill="none"
                          stroke={col.stroke}
                          strokeWidth={0.6}
                          opacity={0.35}
                        />
                        {c.type === 'fuel' && (
                          <circle cx={x} cy={y} r={4.2} fill="rgba(255, 200, 80, 0.9)" stroke="#FF8C00" strokeWidth={1} />
                        )}
                        {c.type === 'guide' && (
                          <>
                            <circle cx={x} cy={y} r={6.5} fill="rgba(40, 50, 70, 0.8)" stroke="#5C6BC0" strokeWidth={1.2} />
                            <circle cx={x} cy={y} r={2.5} fill="#5C6BC0" />
                          </>
                        )}
                        {c.type === 'bypass' && (
                          <g>
                            <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke="#7C4DFF" strokeWidth={1.2} />
                            <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} stroke="#7C4DFF" strokeWidth={1.2} />
                          </g>
                        )}
                        <text
                          x={x}
                          y={y + HEX_SIZE * 0.55}
                          textAnchor="middle"
                          fontSize="7"
                          fontFamily="Roboto Mono, monospace"
                          fontWeight="600"
                          fill={col.stroke}
                          opacity={0.75}
                        >
                          {c.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {hoveredCell && (
                  <div
                    className="absolute pointer-events-none z-20 rounded-xl bg-secondary/95 border border-primary/40 backdrop-blur-xl p-3 shadow-2xl min-w-[180px]"
                    style={{
                      left: Math.min(tooltipPos.x + 18, 450),
                      top: Math.min(tooltipPos.y + 18, 450),
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(0,212,255,0.15)',
                    }}
                  >
                    <div className="font-display font-bold text-sm text-primary mb-2">CH-{hoveredCell.id.toString().padStart(3, '0')}</div>
                    <div className="space-y-1.5 text-[11px] font-mono">
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">类型</span>
                        <span style={{ color: channelTypeColors[hoveredCell.type].stroke }} className="font-bold">{channelTypeColors[hoveredCell.type].label}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">面积</span>
                        <span className="text-white/90">{hoveredCell.area.toFixed(1)} mm²</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">水力直径</span>
                        <span className="text-white/90">{hoveredCell.hydraulicDiameter.toFixed(2)} mm</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/50">功率密度</span>
                        <span className="text-warning">{hoveredCell.powerDensity.toFixed(0)} kW/L</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                        <span className="text-white/50">坐标(q,r)</span>
                        <span className="text-info">({hoveredCell.q}, {hoveredCell.r})</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative h-[560px] w-full flex items-center justify-center overflow-hidden">
                <div
                  className="relative w-[90%] h-[90%] rounded-2xl border border-primary/30 overflow-hidden"
                  style={{
                    background: `
                      linear-gradient(${projection === 'perspective' ? '160deg' : '180deg'},
                        rgba(0, 60, 120, 0.4) 0%,
                        rgba(0, 40, 90, 0.6) 40%,
                        rgba(0, 25, 60, 0.85) 100%),
                      repeating-linear-gradient(0deg, transparent 0, transparent 34px, rgba(0, 212, 255, 0.08) 34px, rgba(0, 212, 255, 0.08) 35px),
                      repeating-linear-gradient(90deg, transparent 0, transparent 34px, rgba(124, 77, 255, 0.06) 34px, rgba(124, 77, 255, 0.06) 35px)
                    `,
                    transform: projection === 'perspective' ? 'perspective(1400px) rotateX(18deg) rotateY(-22deg)' : 'perspective(1400px) rotateX(6deg) rotateY(-4deg)',
                    transformStyle: 'preserve-3d',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,212,255,0.08)',
                    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <div className="absolute inset-0 scan-line" />
                  {[0, 1, 2, 3].map((layer) => (
                    <div key={layer} className="absolute w-full" style={{ top: `${12 + layer * 22}%` }}>
                      <div
                        className="h-2 mx-auto rounded"
                        style={{
                          width: `${85 - layer * 8}%`,
                          background: 'linear-gradient(90deg, transparent, rgba(124,77,255,0.5), rgba(0,212,255,0.7), rgba(124,77,255,0.5), transparent)',
                          boxShadow: '0 0 15px rgba(0,212,255,0.4)',
                          transform: `translateZ(${layer * 20}px)`,
                        }}
                      />
                      <div className="text-center mt-1 text-[9px] font-mono text-white/30">定位格架 L{4 - layer}</div>
                    </div>
                  ))}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="grid gap-[10px]"
                      style={{
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        transform: projection === 'perspective' ? 'translateZ(30px)' : 'translateZ(10px)',
                      }}
                    >
                      {Array.from({ length: 25 }).map((_, i) => {
                        const col = i % 5;
                        const row = Math.floor(i / 5);
                        const isGuide = (row === 0 && col === 0) || (row === 0 && col === 4) || (row === 4 && col === 0) || (row === 4 && col === 4) || (row === 2 && col === 2);
                        const isBypass = (row === 1 && col === 2) || (row === 2 && col === 1) || (row === 2 && col === 3) || (row === 3 && col === 2);
                        const color = isGuide ? 'rgba(140, 150, 170, 0.7)' : isBypass ? 'rgba(124, 77, 255, 0.75)' : 'rgba(0, 212, 255, 0.8)';
                        const borderCol = isGuide ? '#8C96AA' : isBypass ? '#7C4DFF' : '#00D4FF';
                        return (
                          <div
                            key={i}
                            className="w-8 rounded-full relative"
                            style={{
                              height: '230px',
                              background: `linear-gradient(180deg, ${color} 0%, ${color}cc 30%, ${color}99 70%, ${color}66 100%)`,
                              border: `1px solid ${borderCol}`,
                              boxShadow: `0 0 10px ${borderCol}66, inset 0 0 15px rgba(255,255,255,0.15)`,
                              animation: `float ${2.5 + (i % 5) * 0.2}s ease-in-out infinite`,
                              animationDelay: `${(row + col) * 0.08}s`,
                            }}
                          >
                            <div className="absolute inset-x-0 top-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.4)' }} />
                            {isGuide && <div className="absolute inset-2 rounded-full border border-dashed border-white/40" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/50 border border-primary/30 backdrop-blur-sm">
                    <div className="text-[10px] font-mono text-primary/80">3D VIEW · {projection === 'perspective' ? 'PERSPECTIVE' : 'ORTHOGRAPHIC'}</div>
                  </div>
                  <div className="absolute bottom-3 right-3 text-right">
                    <div className="text-[10px] font-mono text-white/40">{activeHeight} mm (H)</div>
                    <div className="text-[10px] font-mono text-white/40">{pitch * 5} mm (W)</div>
                    <div className="text-[10px] font-mono text-info">{fuelRodCount} 燃料棒 · {bypassCount} 旁通 · 9 导向管</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-5">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Grid3X3 className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm text-white/90">网格正交性分布</h3>
            </div>
            <div className="h-52">
              <ReactECharts option={histogramOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-info" />
              <h3 className="font-display font-bold text-sm text-white/90">扭曲度分布</h3>
            </div>
            <div className="h-52">
              <ReactECharts option={violinOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <h3 className="font-display font-bold text-sm text-white/90">质量统计</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-success/30 bg-gradient-to-r from-success/15 to-success/[0.04] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-xs font-display font-bold text-success">合格单元</span>
                  </div>
                  <span className="font-display text-xl font-bold text-success">672</span>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-success to-success/50" style={{ width: '98.5%' }} />
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1.5 text-right">98.5%</div>
              </div>
              <div className="rounded-xl border border-warning/30 bg-gradient-to-r from-warning/15 to-warning/[0.04] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs font-display font-bold text-warning">警告单元</span>
                  </div>
                  <span className="font-display text-xl font-bold text-warning">10</span>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-warning to-warning/50" style={{ width: '1.5%' }} />
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1.5 text-right">1.5%</div>
              </div>
              <div className="rounded-xl border border-danger/30 bg-gradient-to-r from-danger/15 to-danger/[0.04] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-danger" />
                    <span className="text-xs font-display font-bold text-danger">不合格单元</span>
                  </div>
                  <span className="font-display text-xl font-bold text-danger">0</span>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-danger to-danger/50" style={{ width: '0%' }} />
                </div>
                <div className="text-[10px] font-mono text-white/50 mt-1.5 text-right">0.0%</div>
              </div>
              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="rounded-lg bg-black/30 p-2">
                  <div className="text-white/40 mb-0.5">总单元数</div>
                  <div className="font-display text-lg font-bold text-white/90">682</div>
                </div>
                <div className="rounded-lg bg-black/30 p-2">
                  <div className="text-white/40 mb-0.5">节点数</div>
                  <div className="font-display text-lg font-bold text-primary">4,897</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50 font-mono">导出格式:</span>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/30 border border-white/10">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" />
                STEP
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-display font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all">
                <Download className="w-3.5 h-3.5" />
                OBJ
              </button>
            </div>
          </div>

          <button className="glow-btn">
            <Download className="w-4 h-4 mr-2" />
            导出网格文件
          </button>

          <button className="glow-btn" style={{ borderColor: 'rgba(124, 77, 255, 0.4)', color: '#7C4DFF', background: 'linear-gradient(135deg, rgba(124, 77, 255, 0.15), rgba(124, 77, 255, 0.05))' }}>
            <SearchCheck className="w-4 h-4 mr-2" />
            网格质量检查
          </button>

          <div className="flex-1" />

          <button
            onClick={() => id && navigate(`/simulations/${id}/calculate`)}
            className="relative px-7 py-3 rounded-xl font-display font-bold text-sm tracking-wider text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00D4FF 0%, #7C4DFF 50%, #FF8C00 100%)',
              backgroundSize: '200% 200%',
              animation: 'text-shimmer 3s ease infinite',
              boxShadow: '0 0 30px rgba(0,212,255,0.4), 0 0 50px rgba(124,77,255,0.25)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Play className="w-4 h-4" />
              确认使用该网格并进入计算
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
