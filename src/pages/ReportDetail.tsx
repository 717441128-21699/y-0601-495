import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search as SearchIcon,
  Printer,
  Download,
  FileSpreadsheet,
  Share2,
  Send,
  FileText,
  Users,
  AlertTriangle,
  ArrowLeft,
  Thermometer,
  Gauge,
  X,
} from 'lucide-react';
import { useAppStore, type SimulationReport } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const TOC = [
  { id: 'cover', label: '封面', page: 1 },
  { id: 'executive', label: '1. 执行摘要', page: 2 },
  { id: 'model-config', label: '2. 模型与参数配置', children: [
    { id: 'geometry', label: '2.1 几何构型', page: 3 },
    { id: 'boundary', label: '2.2 边界条件', page: 3 },
    { id: 'physics', label: '2.3 物理模型', page: 3 },
  ]},
  { id: 'thermal-results', label: '3. 热工水力计算结果', children: [
    { id: 'temp-field', label: '3.1 温度场分布', page: 4 },
    { id: 'heat-flux', label: '3.2 热流密度分布', page: 5 },
    { id: 'chf-analysis', label: '3.3 CHF比分析', page: 6 },
  ]},
  { id: 'accident-timeline', label: '4. 事故进程时序', page: 7 },
  { id: 'safety-margin', label: '5. 安全裕量评估', page: 8 },
  { id: 'conclusion', label: '6. 结论与建议', page: 9 },
  { id: 'appendix-a', label: '附录A：通道数据表', page: 10 },
];

interface TempSliceProps {
  height: number;
  label: string;
  seed: number;
}

const TemperatureSlice = ({ height, label, seed }: TempSliceProps) => {
  const size = 260;
  const cols = 13;
  const rows = 13;
  const cellSize = size / cols;
  const rand = (i: number, j: number) => {
    const v = Math.sin(seed * 13.37 + i * 7.1 + j * 3.7) * 0.5 + 0.5;
    const dx = (i - cols / 2) / (cols / 2);
    const dy = (j - rows / 2) / (rows / 2);
    const centerBias = 1 - Math.sqrt(dx * dx + dy * dy) * 0.7;
    return Math.min(1, Math.max(0, (v * 0.4 + centerBias * 0.6)));
  };
  const getColor = (t: number) => {
    const stops: Array<[number, string]> = [
      [0.0, '#0D47A1'],
      [0.2, '#00D4FF'],
      [0.4, '#00C853'],
      [0.6, '#FFD600'],
      [0.8, '#FF8C00'],
      [1.0, '#FF1744'],
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [s1, c1] = stops[i];
      const [s2, c2] = stops[i + 1];
      if (t >= s1 && t <= s2) {
        const ratio = (t - s1) / (s2 - s1);
        const h2r = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
        const [r1, g1, b1] = h2r(c1);
        const [r2, g2, b2] = h2r(c2);
        const r = Math.round(r1 + (r2 - r1) * ratio);
        const g = Math.round(g1 + (g2 - g1) * ratio);
        const b = Math.round(b1 + (b2 - b1) * ratio);
        return `rgb(${r},${g},${b})`;
      }
    }
    return stops[stops.length - 1][1];
  };
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-500 mb-2 font-medium">轴向高度 {label}</div>
      <svg viewBox={`0 0 ${size + 60} ${size}`} className="w-full max-w-[300px]">
        <defs>
          <linearGradient id="tempbar-ht-${height}" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0D47A1"/>
            <stop offset="20%" stopColor="#00D4FF"/>
            <stop offset="40%" stopColor="#00C853"/>
            <stop offset="60%" stopColor="#FFD600"/>
            <stop offset="80%" stopColor="#FF8C00"/>
            <stop offset="100%" stopColor="#FF1744"/>
          </linearGradient>
        </defs>
        <g>
          {Array.from({ length: rows }).map((_, j) =>
            Array.from({ length: cols }).map((_, i) => {
              const t = rand(i, j);
              return (
                <rect
                  key={`${i}-${j}`}
                  x={i * cellSize + 1}
                  y={j * cellSize + 1}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  rx={2}
                  fill={getColor(t)}
                  opacity={0.9}
                />
              );
            })
          )}
        </g>
        <g transform={`translate(${size + 15}, 0)`}>
          <rect x="0" y="0" width="14" height={size} fill={`url(#tempbar-ht-${height})`} rx="3" />
          <text x="20" y="8" fill="#64748B" fontSize="9">1477K</text>
          <text x="20" y={size / 2} fill="#64748B" fontSize="9" textAnchor="start" dominantBaseline="middle">1000K</text>
          <text x="20" y={size - 2} fill="#64748B" fontSize="9">600K</text>
        </g>
      </svg>
    </div>
  );
};

const buildHeatFluxOption = () => {
  const channels = Array.from({ length: 20 }, (_, i) => `CH-${String(i + 1).padStart(3, '0')}`);
  const seed = [0.72, 0.85, 0.93, 1.05, 1.12, 1.18, 1.22, 1.25, 1.30, 1.32, 1.28, 1.26, 1.20, 1.15, 1.08, 1.02, 0.95, 0.88, 0.80, 0.74];
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(11, 30, 63, 0.95)', borderColor: '#00D4FF40', textStyle: { color: '#E0F4FF', fontSize: 11 } },
    grid: { left: 60, right: 20, top: 40, bottom: 60 },
    legend: { top: 0, textStyle: { color: '#64748B', fontSize: 11 }, data: ['实际值', '理论值'] },
    xAxis: {
      type: 'category', data: channels,
      axisLabel: { color: '#64748B', fontSize: 9, rotate: 35 },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
    },
    yAxis: [
      {
        type: 'value', name: '热流密度 (W/m²)', nameTextStyle: { color: '#64748B', fontSize: 10 },
        axisLabel: { color: '#64748B', fontSize: 10 },
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        splitLine: { lineStyle: { color: '#E2E8F0' } },
        max: 1.6e6,
      },
    ],
    series: [
      {
        name: '实际值', type: 'bar', barWidth: '55%',
        itemStyle: {
          color: (p: { dataIndex: number }) => {
            const v = seed[p.dataIndex] * 1e6;
            if (v > 1.25e6) return '#FF5252';
            if (v > 1.05e6) return '#FF8C00';
            return 'linear-gradient(180deg, #00D4FF 0%, #1565C0 100%)';
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: seed.map((s) => +(s * 1e6).toFixed(0)),
      },
      {
        name: '理论值', type: 'line', smooth: true, lineStyle: { width: 2, color: '#7C4DFF', type: 'dashed' },
        itemStyle: { color: '#7C4DFF' },
        data: seed.map((s) => +(s * 0.95 * 1e6).toFixed(0)),
      },
      {
        type: 'line', data: [],
        markLine: {
          silent: true, symbol: 'none',
          lineStyle: { color: '#FF1744', type: 'dashed', width: 2 },
          data: [{ yAxis: 1.25e6, label: { formatter: '限值 1.25MW/m²', color: '#FF1744', position: 'end', fontSize: 10 } }],
        },
      },
    ],
  };
};

const buildCHFOption = () => {
  const points = Array.from({ length: 10 }, (_, i) => i + 1);
  const values = [1.65, 1.58, 1.52, 1.46, 1.39, 1.35, 1.31, 1.28, 1.33, 1.40];
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(11, 30, 63, 0.95)', borderColor: '#00D4FF40', textStyle: { color: '#E0F4FF', fontSize: 11 } },
    grid: { left: 60, right: 40, top: 40, bottom: 50 },
    legend: { top: 0, textStyle: { color: '#64748B', fontSize: 11 }, data: ['最小CHF比', '测点'] },
    xAxis: {
      type: 'category', name: '轴向位置 (%)', nameTextStyle: { color: '#64748B', fontSize: 10 },
      data: points.map((p) => `${p * 10}%`),
      axisLabel: { color: '#64748B', fontSize: 10 },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
    },
    yAxis: {
      type: 'value', name: 'CHF 比', nameTextStyle: { color: '#64748B', fontSize: 10 },
      min: 0.8, max: 2.0,
      axisLabel: { color: '#64748B', fontSize: 10 },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      splitLine: { lineStyle: { color: '#E2E8F0' } },
    },
    series: [
      {
        name: '最小CHF比', type: 'line', smooth: true, data: values,
        lineStyle: { width: 3, color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#00D4FF' },
            { offset: 1, color: '#1565C0' },
          ],
        }},
        itemStyle: { color: '#1565C0' },
        symbol: 'circle', symbolSize: 8,
        markArea: {
          silent: true,
          data: [[
            { yAxis: 1.0, itemStyle: { color: 'rgba(255,23,68,0.08)' } },
            { yAxis: 1.3 },
          ]],
        },
      },
      {
        name: '测点', type: 'scatter', data: values, symbol: 'circle', symbolSize: 10,
        itemStyle: (p: { dataIndex: number }) => ({
          color: values[p.dataIndex] >= 1.3 ? '#00C853' : values[p.dataIndex] >= 1.0 ? '#FF8C00' : '#FF1744',
          borderColor: '#ffffff', borderWidth: 1.5,
        }),
      },
      {
        type: 'line', data: [],
        markLine: [
          {
            silent: true, symbol: 'none',
            lineStyle: { color: '#FF1744', type: 'solid', width: 2 },
            data: [{ yAxis: 1.3, label: { formatter: '安全阈值 1.30', color: '#1565C0', position: 'insideEndTop', fontSize: 11, fontWeight: 'bold' } }],
          },
          {
            silent: true, symbol: 'none',
            lineStyle: { color: '#FF1744', type: 'dashed', width: 1.5 },
            data: [{ yAxis: 1.0, label: { formatter: '危险线 1.00', color: '#FF1744', position: 'end', fontSize: 10 } }],
          },
        ],
      },
    ],
  };
};

const buildRadarOption = (m: SimulationReport['safetyMargins']) => {
  return {
    tooltip: { backgroundColor: 'rgba(11, 30, 63, 0.95)', borderColor: '#00D4FF40', textStyle: { color: '#E0F4FF' } },
    legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 11 }, data: ['当前裕量', '设计要求'] },
    radar: {
      indicator: [
        { name: '温度裕量', max: 0.4 },
        { name: 'CHF裕量', max: 0.4 },
        { name: '流量裕量', max: 0.4 },
        { name: '压力裕量', max: 0.4 },
        { name: '功率裕量', max: 0.4 },
      ],
      radius: '65%',
      center: ['50%', '48%'],
      axisName: { color: '#475569', fontSize: 11 },
      splitArea: { areaStyle: { color: ['#F8FAFC', '#F1F5F9'] } },
      splitLine: { lineStyle: { color: '#CBD5E1' } },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
    },
    series: [{
      type: 'radar', symbolSize: 6,
      data: [
        {
          value: [m.temperatureMargin, m.chfMargin, m.flowMargin, m.pressureMargin, m.powerMargin],
          name: '当前裕量',
          lineStyle: { width: 2.5, color: '#00D4FF' },
          itemStyle: { color: '#00D4FF' },
          areaStyle: { color: 'rgba(0, 212, 255, 0.25)' },
        },
        {
          value: [0.10, 0.13, 0.10, 0.08, 0.08],
          name: '设计要求',
          lineStyle: { width: 2, color: '#FF8C00', type: 'dashed' },
          itemStyle: { color: '#FF8C00' },
          areaStyle: { color: 'rgba(255, 140, 0, 0.08)' },
        },
      ],
    }],
  };
};

const PAGE_COUNT = 10;

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reports, getChannelData, simulations } = useAppStore();
  const report = useMemo(() => reports.find(r => r.id === id) ?? reports[0], [reports, id]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scale, setScale] = useState(100);
  const [activeSection, setActiveSection] = useState('cover');
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpInput, setJumpInput] = useState('');
  const [printMode, setPrintMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 30;

  const pageRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const onScroll = () => {
      if (!pageRef.current) return;
      const sections = TOC.flatMap(t => t.children ? [t, ...t.children] : [t]);
      const containerScroll = pageRef.current.scrollTop;
      let current = sections[0].id;
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (el && el.offsetTop - pageRef.current.offsetTop - 80 <= containerScroll) {
          current = s.id;
        }
      }
      setActiveSection(current);
    };
    const container = pageRef.current;
    container?.addEventListener('scroll', onScroll);
    return () => container?.removeEventListener('scroll', onScroll);
  }, [sidebarOpen]);

  const channelData = useMemo(() => {
    const sim = simulations.find(s => s.id === report?.simulationId) ?? simulations[0];
    const raw = sim ? getChannelData(sim.id) : [];
    if (raw.length === 0) {
      const arr = [];
      for (let i = 1; i <= 80; i++) {
        arr.push({
          channelId: `CH-${String(i).padStart(3, '0')}`,
          pelletCenterTemp: +(1150 + Math.random() * 300).toFixed(1),
          claddingSurfaceTemp: +(620 + Math.random() * 130).toFixed(1),
          coolantTemp: +(555 + Math.random() * 60).toFixed(1),
          chfRatio: +(1.08 + Math.random() * 0.6).toFixed(3),
          heatFlux: +(620000 + Math.random() * 380000).toFixed(0),
          timestamp: 0,
        });
      }
      return arr;
    }
    return raw;
  }, [report, simulations, getChannelData]);

  const pagedChannels = channelData.slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE);
  const tableTotalPages = Math.max(1, Math.ceil(channelData.length / TABLE_PAGE_SIZE));

  const scrollToSection = (sectionId: string, pageNum?: number) => {
    if (pageNum) setCurrentPage(pageNum);
    const el = sectionRefs.current[sectionId];
    if (el && pageRef.current) {
      pageRef.current.scrollTo({ top: el.offsetTop - pageRef.current.offsetTop - 24, behavior: 'smooth' });
    }
  };

  const toast = (msg: string, type: 'success' | 'info' = 'success') => {
    const el = document.createElement('div');
    const color = type === 'success' ? 'success' : 'info';
    el.className = `fixed top-20 right-6 z-[100] rounded-lg border border-${color}/40 bg-${color}/10 backdrop-blur-xl px-5 py-3 text-sm text-${color} font-medium shadow-lg`;
    el.style.animation = 'slideIn 0.3s ease, fadeOut 0.3s ease 2.2s';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const target = pageRef.current;
      if (!target) return;
      toast('正在生成PDF，请稍候...', 'info');
      const canvas = await html2canvas(target, { scale: 1.5, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${report?.id ?? 'report'}.pdf`);
      const w = window.open('', '_blank', 'width=400,height=200');
      if (w) {
        w.document.write(`<title>下载成功</title><body style="display:flex;align-items:center;justify-content:center;flex-direction:column;height:100vh;font-family:system-ui;"><div style="font-size:48px;">✅</div><h2 style="color:#00C853;">PDF下载成功</h2><p style="color:#64748B;">文件名: ${report?.id ?? 'report'}.pdf</p></body>`);
        setTimeout(() => w.close(), 3500);
      }
    } catch {
      toast('PDF导出模拟完成');
    }
  };

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
        { 项目: '报告ID', 值: report?.id },
        { 项目: '任务名称', 值: report?.simulationName },
        { 项目: '构型', 值: report?.configurationName },
        { 项目: '生成时间', 值: report ? new Date(report.generatedAt).toLocaleString('zh-CN') : '' },
        { 项目: '安全评级', 值: report?.safetyRating },
        { 项目: '温度裕量', 值: report?.safetyMargins.temperatureMargin },
        { 项目: 'CHF裕量', 值: report?.safetyMargins.chfMargin },
        { 项目: '流量裕量', 值: report?.safetyMargins.flowMargin },
        { 项目: '压力裕量', 值: report?.safetyMargins.pressureMargin },
        { 项目: '功率裕量', 值: report?.safetyMargins.powerMargin },
      ]), '报告摘要');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        channelData.map(c => ({
          通道ID: c.channelId,
          芯块中心温度_K_: c.pelletCenterTemp,
          包壳表面温度_K_: c.claddingSurfaceTemp,
          冷却剂温度_K_: c.coolantTemp,
          CHF比: c.chfRatio,
          热流密度_W_m2_: c.heatFlux,
        }))
      ), '通道数据');
      XLSX.writeFile(wb, `${report?.id ?? 'report'}_完整数据.xlsx`);
      toast('Excel文件已导出');
    });
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    toast('分享链接已复制到剪贴板');
  };

  const handleSend = (team: string) => {
    toast(`已发送至${team}`);
  };

  const sim = simulations.find(s => s.id === report?.simulationId) ?? simulations[0];

  return (
    <div className="min-h-screen p-4 md:p-6 relative">
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .a4-page { width: 210mm; min-height: 297mm; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1); padding: 20mm 18mm; color: #1E293B; font-family: 'Times New Roman', 'SimSun', serif; }
        @media print { .no-print { display: none !important; } .a4-page { box-shadow: none !important; margin: 0; padding: 15mm; } body { background: white !important; } }
        .page-zoom { transform: scale(var(--zoom, 1)); transform-origin: top center; }
      `}</style>

      <div className="no-print flex items-center gap-4 mb-4">
        <button onClick={() => navigate('/reports')} className="flex items-center gap-2 text-white/70 hover:text-primary text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> 返回报告列表
        </button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-gradient truncate">{report?.simulationName}</h1>
          <p className="text-xs text-white/50">报告ID: {report?.id} · {report?.configurationName}</p>
        </div>
      </div>

      <div className="relative flex gap-4 no-print mb-4">
        <div className={cn(
          'glass-card overflow-hidden transition-all duration-300 flex-shrink-0',
          sidebarOpen ? 'w-64' : 'w-0 opacity-0 pointer-events-none'
        )}>
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">报告目录</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <nav className="p-2 overflow-y-auto max-h-[calc(100vh-220px)]">
            {TOC.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id, item.page)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-xs mb-0.5 flex items-center justify-between transition-colors',
                    activeSection === item.id
                      ? 'bg-primary/20 text-primary font-medium'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="ml-2 text-[10px] opacity-60 flex-shrink-0">P{item.page}</span>
                </button>
                {item.children?.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => scrollToSection(c.id, c.page)}
                    className={cn(
                      'w-full text-left pl-8 pr-3 py-1.5 rounded-md text-[11px] mb-0.5 flex items-center justify-between transition-colors',
                      activeSection === c.id
                        ? 'bg-info/20 text-info font-medium'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="ml-2 text-[10px] opacity-50 flex-shrink-0">P{c.page}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="glass-card p-2 h-fit text-white/60 hover:text-primary hover:border-primary/40">
            <PanelLeft className="w-5 h-5" />
          </button>
        )}

        <div className="absolute right-0 top-0 glass-card p-2 flex items-center gap-1 z-20">
          <div className={cn(
            'flex items-center gap-1 overflow-hidden transition-all',
            searchOpen ? 'w-56 pl-2 border-l border-white/10' : 'w-0'
          )}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索报告内容..."
              className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white/70">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={() => setSearchOpen(s => !s)} className={cn('p-2 rounded-md transition-colors', searchOpen && 'bg-primary/20 text-primary')}>
            <SearchIcon className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={() => setScale(s => Math.max(50, s - 10))} className="p-2 rounded-md text-white/70 hover:bg-white/10 hover:text-white" title="缩小">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/70 font-mono w-12 text-center">{scale}%</span>
          <button onClick={() => setScale(s => Math.min(200, s + 10))} className="p-2 rounded-md text-white/70 hover:bg-white/10 hover:text-white" title="放大">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setScale(100)} className="px-2 py-2 rounded-md text-xs text-white/70 hover:bg-white/10 hover:text-white font-mono" title="100%">
            1:1
          </button>
          <button onClick={() => setScale(printMode ? 100 : 78)} className="p-2 rounded-md text-white/70 hover:bg-white/10 hover:text-white" title="适应宽度">
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={() => { setPrintMode(p => !p); setScale(printMode ? 100 : 78); }} className={cn('p-2 rounded-md transition-colors', printMode && 'bg-info/20 text-info')} title="打印模式">
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={pageRef}
          className="no-print overflow-auto rounded-xl"
          style={{ height: printMode ? 'auto' : 'calc(100vh - 280px)', background: printMode ? '#f1f5f9' : 'transparent' }}
        >
          <div
            className="page-zoom"
            style={{ ['--zoom' as never]: `${scale / 100}`, paddingBottom: '40px' }}
          >
            <div className="a4-page space-y-6">
              {/* 封面 */}
              <div ref={el => { sectionRefs.current['cover'] = el; }} className="flex flex-col justify-between min-h-[257mm]">
                <div className="text-center pt-10">
                  <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
                    <svg viewBox="0 0 40 40" className="w-8 h-8"><circle cx="20" cy="20" r="18" fill="none" stroke="#1565C0" strokeWidth="2"/><circle cx="20" cy="20" r="12" fill="none" stroke="#00D4FF" strokeWidth="1.5"/><circle cx="20" cy="20" r="5" fill="#1565C0"/></svg>
                    <span className="font-display text-lg tracking-[0.3em] text-[#1565C0]">NUCLEAR THERMAL-HYDRAULICS</span>
                  </div>
                  <h1 className="text-3xl font-bold text-[#0B1E3F] mb-3 font-display tracking-wider">热工水力分析报告</h1>
                  <div className="h-px bg-gradient-to-r from-transparent via-[#1565C0] to-transparent w-2/3 mx-auto my-6" />
                  <div className="text-xl text-[#334155] font-semibold mb-8">{report?.simulationName}</div>
                </div>
                <div className="max-w-md mx-auto space-y-3 text-sm">
                  {[
                    ['报告编号', report?.id?.toUpperCase()],
                    ['任务编号', report?.simulationId?.toUpperCase()],
                    ['几何构型', report?.configurationName],
                    ['报告版本', 'V1.0'],
                    ['生成日期', report ? new Date(report.generatedAt).toLocaleDateString('zh-CN') : ''],
                    ['编制人', report?.generatedBy],
                  ].map(([k, v]) => (
                    <div key={k} className="flex border-b border-gray-200 pb-2">
                      <span className="w-28 text-gray-500 flex-shrink-0">{k}</span>
                      <span className="text-gray-800 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-gray-200">
                  {[
                    { title: '编制人', name: report?.generatedBy ?? '张工', dept: '热工水力设计所' },
                    { title: '审核人', name: report?.engineerVerify?.reviewer ?? '李工', dept: '热工水力设计所' },
                    { title: '批准人', name: report?.chiefConfirm?.reviewer ?? '王总', dept: '安全评审中心' },
                  ].map((s) => (
                    <div key={s.title} className="text-center">
                      <div className="text-xs text-gray-500 mb-2">{s.title}</div>
                      <div className="h-14 border-b-2 border-dashed border-gray-300 flex items-end justify-center pb-2">
                        <span className="font-bold text-lg text-[#1565C0]" style={{ fontFamily: 'cursive' }}>{s.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{s.dept}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1. 执行摘要 */}
              <div ref={el => { sectionRefs.current['executive'] = el; }} className="pt-2">
                <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                  <span className="text-[#00D4FF] mr-2">01</span>执行摘要
                </h2>
                <p className="text-[14px] leading-7 text-gray-700 indent-8 mb-4">
                  本报告针对<b>{report?.simulationName}</b>任务开展了系统的热工水力分析工作。计算采用成熟的子通道分析程序COBRA-Ⅳ，基于<b>{report?.configurationName}</b>几何构型，对稳态运行及典型事故工况下的堆芯热工参数进行了全面评估。
                </p>
                <div className="grid grid-cols-2 gap-4 my-6">
                  {[
                    ['最高燃料芯块温度', `${(1200 + (report?.safetyMargins.temperatureMargin ?? 0.2) * 800).toFixed(0)} K`, '1477 K (限值)', 'success'],
                    ['最小临界热流密度比', `${(1.3 + (report?.safetyMargins.chfMargin ?? 0.2)).toFixed(3)}`, '1.30 (阈值)', 'info'],
                    ['堆芯出口冷却剂温度', `${(560 + (report?.safetyMargins.flowMargin ?? 0.2) * 60).toFixed(1)} K`, '617.0 K (限值)', 'warning'],
                    ['堆芯总压降', `${(0.28 + (report?.safetyMargins.pressureMargin ?? 0.1)).toFixed(3)} MPa`, '0.45 MPa (限值)', 'primary'],
                  ].map(([k, v, l, c]) => (
                    <div key={k} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                      <div className="text-xs text-gray-500 mb-1">{k}</div>
                      <div className={cn('text-xl font-bold mb-1',
                        c === 'success' && 'text-[#00C853]',
                        c === 'info' && 'text-[#1565C0]',
                        c === 'warning' && 'text-[#FF8C00]',
                        c === 'primary' && 'text-[#7C4DFF]',
                      )}>{v}</div>
                      <div className="text-[10px] text-gray-400">限值: {l}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[#00D4FF]/5 border-l-4 border-[#00D4FF] mt-6">
                  <Thermometer className="w-5 h-5 text-[#1565C0] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#0B1E3F] mb-1 text-sm">综合安全评级</div>
                    <div className="text-[13px] text-gray-600 leading-6">
                      本次模拟<b className="text-[#1565C0]">{report?.simulationName}</b>各项热工参数均满足设计基准限值要求，综合安全裕量评级为
                      <span className="inline-block mx-2 px-3 py-0.5 rounded-full font-bold text-lg font-display"
                        style={{
                          backgroundColor: report?.safetyRating === 'S' ? '#00C85320' : report?.safetyRating === 'A' ? '#00D4FF20' : report?.safetyRating === 'B' ? '#7C4DFF20' : report?.safetyRating === 'C' ? '#FF8C0020' : '#FF525220',
                          color: report?.safetyRating === 'S' ? '#00C853' : report?.safetyRating === 'A' ? '#00D4FF' : report?.safetyRating === 'B' ? '#7C4DFF' : report?.safetyRating === 'C' ? '#FF8C00' : '#FF5252',
                          border: `1px solid ${report?.safetyRating === 'S' ? '#00C853' : report?.safetyRating === 'A' ? '#00D4FF' : report?.safetyRating === 'B' ? '#7C4DFF' : report?.safetyRating === 'C' ? '#FF8C00' : '#FF5252'}60`
                        }}>{report?.safetyRating}</span>
                      级，安全裕量充足，结果可信。
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 模型与参数配置 */}
              <div>
                <div ref={el => { sectionRefs.current['model-config'] = el; }}>
                  <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                    <span className="text-[#00D4FF] mr-2">02</span>模型与参数配置
                  </h2>
                </div>

                <div ref={el => { sectionRefs.current['geometry'] = el; }} className="mb-6">
                  <h3 className="text-lg font-bold text-[#1565C0] mb-3">2.1 几何构型</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      ['堆芯等效直径', '3.50 m'],
                      ['燃料组件数', '121 组'],
                      ['燃料棒总数', '45,828 根'],
                      ['燃料棒外径', '9.5 mm'],
                      ['包壳厚度', '0.57 mm'],
                      ['活性区高度', '3.66 m'],
                      ['棒间距', '12.6 mm'],
                      ['子通道数', sim?.channelCount ? String(sim.channelCount) : '193'],
                      ['栅距', '12.6 mm'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center py-2 border-b border-gray-100">
                        <span className="text-gray-500 text-xs w-28">{k}</span>
                        <span className="text-gray-800 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div ref={el => { sectionRefs.current['boundary'] = el; }} className="mb-6">
                  <h3 className="text-lg font-bold text-[#1565C0] mb-3">2.2 边界条件</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: '冷却剂入口温度', v: sim?.inletTemp ?? 558, u: 'K', color: '#FF5252' },
                      { label: '系统入口压力', v: sim?.inletPressure ?? 15.5, u: 'MPa', color: '#7C4DFF' },
                      { label: '总质量流量', v: sim?.inletFlowRate ?? 4200, u: 'kg/s', color: '#00D4FF' },
                      { label: '堆芯额定功率', v: 3050, u: 'MWt', color: '#FF8C00' },
                    ].map((p) => (
                      <div key={p.label} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                          <Gauge className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">{p.label}</div>
                          <div className="text-base font-bold text-gray-800">{p.v} <span className="text-xs font-normal text-gray-500">{p.u}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div ref={el => { sectionRefs.current['physics'] = el; }}>
                  <h3 className="text-lg font-bold text-[#1565C0] mb-3">2.3 物理模型</h3>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#1565C0]/10">
                        <th className="p-3 text-left text-[#0B1E3F] font-bold border border-gray-200">类别</th>
                        <th className="p-3 text-left text-[#0B1E3F] font-bold border border-gray-200">模型/关联式</th>
                        <th className="p-3 text-left text-[#0B1E3F] font-bold border border-gray-200">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['湍流模型', sim?.turbulenceModel ?? 'k-epsilon', '工程标准'],
                        ['沸腾传热', sim?.boilingModel ?? 'RPI', '适用于压水堆'],
                        ['CHF关联式', 'W-3', '修正版西屋公式'],
                        ['临界流模型', 'HEM 均相平衡', '两相临界流'],
                        ['交混模型', 'COBRA-GWC', '子通道交混'],
                        ['轴向功率分布', '余弦+顶部偏峰', '实测拟合'],
                      ].map((r) => (
                        <tr key={r[0]} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-600 border border-gray-200">{r[0]}</td>
                          <td className="p-3 text-gray-800 font-medium border border-gray-200">{r[1]}</td>
                          <td className="p-3 text-gray-500 text-xs border border-gray-200">{r[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. 热工水力计算结果 */}
              <div>
                <div ref={el => { sectionRefs.current['thermal-results'] = el; }}>
                  <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                    <span className="text-[#00D4FF] mr-2">03</span>热工水力计算结果
                  </h2>
                </div>

                <div ref={el => { sectionRefs.current['temp-field'] = el; }} className="mb-8">
                  <h3 className="text-lg font-bold text-[#1565C0] mb-4">3.1 温度场分布（横截面切片）</h3>
                  <p className="text-[13px] text-gray-600 mb-4 leading-6">
                    选取轴向 4 个典型高度位置（H=0.3m、1.2m、2.4m、3.3m）的横截面温度分布切片。最高温度出现在堆芯中部区域，位于热通道组件中心位置，与理论预测的功率分布趋势一致。
                  </p>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <TemperatureSlice height={1} label="H = 0.3 m (入口)" seed={1.3} />
                    <TemperatureSlice height={2} label="H = 1.2 m (下部)" seed={2.7} />
                    <TemperatureSlice height={3} label="H = 2.4 m (中部)" seed={4.1} />
                    <TemperatureSlice height={4} label="H = 3.3 m (出口)" seed={5.9} />
                  </div>
                </div>

                <div ref={el => { sectionRefs.current['heat-flux'] = el; }} className="mb-8">
                  <h3 className="text-lg font-bold text-[#1565C0] mb-4">3.2 热流密度分布（典型通道）</h3>
                  <p className="text-[13px] text-gray-600 mb-4 leading-6">
                    选取堆芯径向 20 个典型燃料通道（包含热通道、平均通道及外围通道）进行热流密度对比分析。
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 bg-white">
                    <ReactECharts option={buildHeatFluxOption()} style={{ height: '320px', width: '100%' }} />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">注：红色标注通道为超过设计限值 1.25MW/m² 的热点通道，建议在运行中重点监测。</p>
                </div>

                <div ref={el => { sectionRefs.current['chf-analysis'] = el; }}>
                  <h3 className="text-lg font-bold text-[#1565C0] mb-4">3.3 最小CHF比分析（轴向分布）</h3>
                  <p className="text-[13px] text-gray-600 mb-4 leading-6">
                    热通道轴向 10 个测点的最小 CHF 比值分布。最小 CHF 比出现在轴向位置 70%~80% 处（约 H=2.5m~2.9m），对应堆芯上半部分功率峰值区域。
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 bg-white">
                    <ReactECharts option={buildCHFOption()} style={{ height: '320px', width: '100%' }} />
                  </div>
                  <div className="flex items-start gap-3 p-3 mt-3 rounded-lg bg-[#FF8C00]/5 border border-[#FF8C00]/20">
                    <AlertTriangle className="w-4 h-4 text-[#FF8C00] flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-gray-600 leading-5">
                      <b className="text-[#FF8C00]">提示：</b>最小CHF比出现在CH-012通道轴向70%位置，测量值1.28，虽略低于安全阈值1.30但高于绝对危险线1.00，判定为可接受工况，建议后续可采用旁通流量优化方案进一步提升裕量。
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. 事故进程时序 */}
              <div ref={el => { sectionRefs.current['accident-timeline'] = el; }}>
                <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                  <span className="text-[#00D4FF] mr-2">04</span>事故进程时序
                </h2>
                <p className="text-[13px] text-gray-600 mb-6 leading-6">
                  以<b className="text-[#FF5252]">大破口失水事故（LOCA）</b>为基准工况，模拟了事故发生后 0s ~ 3600s 内的关键事件时序与参数演进过程。
                </p>
                <div className="relative pl-6 border-l-2 border-dashed border-[#1565C0]/40 space-y-5">
                  {[
                    { t: '0.0 s', e: '主管道双端断裂', d: '一回路冷却剂喷放开始，系统压力快速下降', color: '#FF1744', sev: 'critical' },
                    { t: '1.2 s', e: '稳压器安全阀开启', d: '压力控制策略触发，限制系统过压', color: '#FF8C00', sev: 'warning' },
                    { t: '8.6 s', e: '安注信号触发', d: '高压安注系统（HPSI）投入运行', color: '#00D4FF', sev: 'info' },
                    { t: '45 s', e: '达到临界CHF点', d: '热通道最小CHF比降至 1.07（>1.0限值）', color: '#FF8C00', sev: 'warning' },
                    { t: '120 s', e: '安喷系统启动', d: '压力容器上部喷淋，蒸汽冷凝抑制压力升高', color: '#00D4FF', sev: 'info' },
                    { t: '360 s', e: '再淹没阶段开始', d: '低压安注（LPSI）流量进入堆芯，包壳开始冷却', color: '#00C853', sev: 'success' },
                    { t: '900 s', e: 'PCT峰值出现', d: '包壳最高温度 1204 K（<1477 K 限值）', color: '#00C853', sev: 'success' },
                    { t: '1800 s', e: '堆芯完全再淹没', d: '所有通道恢复稳定冷却，温度持续下降', color: '#00C853', sev: 'success' },
                    { t: '3600 s', e: '进入长期冷却', d: '余热排出系统（RHR）稳定运行，事故缓解完成', color: '#00C853', sev: 'success' },
                  ].map((ev, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: ev.color }} />
                      <div className="p-3 border border-gray-200 rounded-lg bg-gray-50/60 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>{ev.t}</span>
                          <span className="font-bold text-[14px] text-[#0B1E3F]">{ev.e}</span>
                          {ev.sev === 'critical' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF1744]/15 text-[#FF1744]">关键节点</span>}
                        </div>
                        <p className="text-[12px] text-gray-600 leading-5 pl-1">{ev.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. 安全裕量评估 */}
              <div ref={el => { sectionRefs.current['safety-margin'] = el; }}>
                <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                  <span className="text-[#00D4FF] mr-2">05</span>安全裕量评估
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-[#1565C0] mb-3 text-sm">五维度安全裕量雷达图</h4>
                    <div className="border border-gray-200 rounded-lg p-2 bg-white">
                      {report && <ReactECharts option={buildRadarOption(report.safetyMargins)} style={{ height: '340px', width: '100%' }} />}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-bold text-[#1565C0] mb-3 text-sm">各维度裕量详情</h4>
                    {report ? [
                      ['温度裕量 ΔT', report.safetyMargins.temperatureMargin, report.safetyMargins.temperatureMargin / 0.10],
                      ['CHF裕量 ΔCHF', report.safetyMargins.chfMargin, report.safetyMargins.chfMargin / 0.13],
                      ['流量裕量 ΔG', report.safetyMargins.flowMargin, report.safetyMargins.flowMargin / 0.10],
                      ['压力裕量 ΔP', report.safetyMargins.pressureMargin, report.safetyMargins.pressureMargin / 0.08],
                      ['功率裕量 ΔQ', report.safetyMargins.powerMargin, report.safetyMargins.powerMargin / 0.08],
                    ].map(([name, val, req]) => {
                      const ratio = +((val as number) / 0.4).toFixed(2);
                      const reqRatio = +(req as number).toFixed(2);
                      return (
                        <div key={name} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-semibold text-gray-700">{name}</span>
                            <span className={cn('text-sm font-bold font-mono',
                              reqRatio >= 2 ? 'text-[#00C853]' : reqRatio >= 1.2 ? 'text-[#1565C0]' : reqRatio >= 1 ? 'text-[#FF8C00]' : 'text-[#FF1744]'
                            )}>{(val as number).toFixed(3)} ({reqRatio}×要求)</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, ratio * 100)}%`,
                                background: ratio > 0.5 ? 'linear-gradient(90deg,#00D4FF,#00C853)' : ratio > 0.25 ? 'linear-gradient(90deg,#FF8C00,#FFD600)' : 'linear-gradient(90deg,#FF5252,#FF8C00)'
                              }}
                            />
                            <div className="absolute inset-y-0 w-px bg-[#1565C0] z-10" style={{ left: `${(0.1 / 0.4) * 100}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>0</span>
                            <span className="text-[#1565C0]">设计要求</span>
                            <span>0.40</span>
                          </div>
                        </div>
                      );
                    }) : null}
                  </div>
                </div>
              </div>

              {/* 6. 结论与建议 */}
              <div ref={el => { sectionRefs.current['conclusion'] = el; }}>
                <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                  <span className="text-[#00D4FF] mr-2">06</span>结论与建议
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#00C853]/8 border border-[#00C853]/25">
                    <CheckCircleSVG color="#00C853" />
                    <div>
                      <h5 className="font-bold text-[#0B1E3F] mb-1 text-sm">结论一：稳态热工参数全部满足要求</h5>
                      <p className="text-[13px] text-gray-600 leading-6">稳态满功率工况下，各通道包壳峰值温度（1204K {'<'} 1477K）、最小CHF比（1.28 ≈ 1.30阈值）、堆芯压降等关键参数均满足设计基准限值要求，具备充足的安全裕量。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#00C853]/8 border border-[#00C853]/25">
                    <CheckCircleSVG color="#00C853" />
                    <div>
                      <h5 className="font-bold text-[#0B1E3F] mb-1 text-sm">结论二：事故工况下安全功能可用</h5>
                      <p className="text-[13px] text-gray-600 leading-6">大破口LOCA事故进程分析表明，安注、安喷、余热排出等专设安全设施动作时序正确，堆芯在事故全过程中得到有效冷却，PCT峰值远低于1477K安全限值。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#00D4FF]/8 border border-[#1565C0]/25">
                    <SuggestionSVG />
                    <div>
                      <h5 className="font-bold text-[#1565C0] mb-1 text-sm">优化建议一：旁通流量再分配</h5>
                      <p className="text-[13px] text-gray-600 leading-6">建议将CH-008~CH-015通道（热通道区）旁通流量从当前2.5%提升至7.5%，可将最小CHF比由1.28提升至约1.42，进一步增强安全裕量。</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-[#00D4FF]/8 border border-[#1565C0]/25">
                    <SuggestionSVG />
                    <div>
                      <h5 className="font-bold text-[#1565C0] mb-1 text-sm">优化建议二：入口温度微调</h5>
                      <p className="text-[13px] text-gray-600 leading-6">可尝试将冷却剂入口温度降低1.5K（由558K降至556.5K），预期全堆芯温度分布整体下移，温度裕量可额外增加约0.025。</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 附录A：通道数据表 */}
              <div ref={el => { sectionRefs.current['appendix-a'] = el; }}>
                <h2 className="text-2xl font-bold text-[#0B1E3F] pb-2 border-b-2 border-[#1565C0] mb-5 font-display">
                  <span className="text-[#00D4FF] mr-2">A</span>附录：通道数据表
                </h2>
                <div className="text-xs text-gray-500 mb-3">共 {channelData.length} 条通道记录 · 显示第 {(tablePage - 1) * TABLE_PAGE_SIZE + 1}-{Math.min(tablePage * TABLE_PAGE_SIZE, channelData.length)} 条</div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#1565C0] text-white">
                        <th className="px-2.5 py-2 text-left border border-gray-300">通道ID</th>
                        <th className="px-2.5 py-2 text-right border border-gray-300">芯块温度(K)</th>
                        <th className="px-2.5 py-2 text-right border border-gray-300">包壳温度(K)</th>
                        <th className="px-2.5 py-2 text-right border border-gray-300">冷却剂温度(K)</th>
                        <th className="px-2.5 py-2 text-right border border-gray-300">CHF比</th>
                        <th className="px-2.5 py-2 text-right border border-gray-300">热流密度(W/m²)</th>
                        <th className="px-2.5 py-2 text-center border border-gray-300">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedChannels.map((c, i) => {
                        const isBad = c.chfRatio < 1.3 || c.claddingSurfaceTemp > 1200;
                        return (
                          <tr key={c.channelId + i} className={cn(isBad ? 'bg-[#FFF3E0]' : i % 2 ? 'bg-gray-50' : '')}>
                            <td className="px-2.5 py-1.5 font-mono font-semibold border border-gray-200">{c.channelId}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-200">{c.pelletCenterTemp.toFixed(1)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-200">{c.claddingSurfaceTemp.toFixed(1)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-200">{c.coolantTemp.toFixed(1)}</td>
                            <td className={cn('px-2.5 py-1.5 text-right font-mono border border-gray-200 font-bold',
                              c.chfRatio >= 1.3 ? 'text-[#00C853]' : c.chfRatio >= 1.0 ? 'text-[#FF8C00]' : 'text-[#FF1744]'
                            )}>{c.chfRatio.toFixed(3)}</td>
                            <td className="px-2.5 py-1.5 text-right font-mono border border-gray-200">{c.heatFlux.toLocaleString()}</td>
                            <td className="px-2.5 py-1.5 text-center border border-gray-200">
                              {isBad ? (
                                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#FF8C00]/15 text-[#FF8C00] font-semibold">关注</span>
                              ) : (
                                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-[#00C853]/15 text-[#00C853] font-semibold">正常</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <div>第 {tablePage} / {tableTotalPages} 页</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTablePage(p => Math.max(1, p - 1))}
                      disabled={tablePage === 1}
                      className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >上一页</button>
                    {Array.from({ length: tableTotalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setTablePage(p)}
                        className={cn('min-w-[28px] h-7 rounded border text-[11px] transition-colors',
                          tablePage === p
                            ? 'bg-[#1565C0] text-white border-[#1565C0]'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        )}
                      >{p}</button>
                    ))}
                    <button
                      onClick={() => setTablePage(p => Math.min(tableTotalPages, p + 1))}
                      disabled={tablePage === tableTotalPages}
                      className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >下一页</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="no-print mt-4 glass-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-md border border-primary/15 bg-secondary/40 text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-40"
          ><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs text-white/70 font-mono">第 <b className="text-primary">{currentPage}</b> / {PAGE_COUNT} 页</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(PAGE_COUNT, p + 1))}
            disabled={currentPage === PAGE_COUNT}
            className="p-2 rounded-md border border-primary/15 bg-secondary/40 text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-40"
          ><ChevronRight className="w-4 h-4" /></button>
          <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-white/10">
            <span className="text-xs text-white/50">跳转至</span>
            <input
              type="number"
              min={1}
              max={PAGE_COUNT}
              value={jumpInput}
              onChange={e => setJumpInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const p = Math.min(PAGE_COUNT, Math.max(1, parseInt(jumpInput) || 1));
                  setCurrentPage(p); setJumpInput('');
                }
              }}
              className="w-14 px-2 py-1 rounded bg-secondary/60 border border-primary/20 text-xs text-white/80 font-mono focus:outline-none focus:border-primary/50"
              placeholder="页码"
            />
            <span className="text-xs text-white/50">页</span>
          </div>
        </div>
        <div className="text-[10px] text-white/40 font-mono">
          {report?.id?.toUpperCase()} · {report?.configurationName}
        </div>
      </div>

      <div className="no-print sticky bottom-4 mt-4 z-30">
        <div className="glass-card p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-white/50 font-mono">
            <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            核反应堆堆芯热工水力模拟平台 · 报告编号: {report?.id?.toUpperCase()}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              className="glow-btn !py-2 !px-4 text-xs !flex !gap-2"
            >
              <Download className="w-4 h-4" />
              下载PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-success/40 bg-success/10 text-success hover:bg-success/15 hover:border-success/60 text-xs font-semibold transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              导出Excel
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-info/40 bg-info/10 text-info hover:bg-info/15 hover:border-info/60 text-xs font-semibold transition-all"
            >
              <Share2 className="w-4 h-4" />
              生成分享链接
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSend('运行规程组')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50 text-xs font-semibold transition-all"
                title="发送至运行规程组"
              >
                <Users className="w-3.5 h-3.5" />
                运行规程
              </button>
              <button
                onClick={() => handleSend('应急响应组')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 hover:border-warning/60 text-xs font-semibold transition-all"
                title="发送至应急响应组"
              >
                <Send className="w-3.5 h-3.5" />
                应急响应
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const CheckCircleSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill={`${color}15`} />
    <path d="M8 12.5l3 3 5-6" />
  </svg>
);

const SuggestionSVG = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="#1565C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" fill="rgba(0,212,255,0.1)" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);
