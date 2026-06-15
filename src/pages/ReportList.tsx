import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  Eye,
  Share2,
  Database,
  ChevronLeft,
  ChevronRight,
  Gauge,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAppStore, type SimulationReport, type ApprovalProgressStatus, type ReportType, type SafetyRating } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

const reportTypeMap: Record<ReportType, { label: string; color: string }> = {
  steady_state: { label: '稳态分析', color: '#00D4FF' },
  accident_analysis: { label: '事故分析', color: '#FF5252' },
  sensitivity: { label: '敏感性分析', color: '#FF8C00' },
  benchmark: { label: '基准验证', color: '#7C4DFF' },
};

const approvalStatusMap: Record<ApprovalProgressStatus, { label: string; color: string; step: number }> = {
  not_started: { label: '未提交', color: '#89A7CF', step: 0 },
  level1_pending: { label: '待工程师验证', color: '#FF8C00', step: 1 },
  level1_approved: { label: '工程师已验证', color: '#00D4FF', step: 2 },
  level2_pending: { label: '待总工确认', color: '#FF8C00', step: 3 },
  level2_approved: { label: '已通过审批', color: '#00C853', step: 4 },
  rejected: { label: '已驳回', color: '#FF5252', step: -1 },
};

const ratingColors: Record<SafetyRating, { bg: string; text: string; border: string }> = {
  S: { bg: 'rgba(0, 200, 83, 0.15)', text: '#00C853', border: 'rgba(0, 200, 83, 0.4)' },
  A: { bg: 'rgba(0, 212, 255, 0.15)', text: '#00D4FF', border: 'rgba(0, 212, 255, 0.4)' },
  B: { bg: 'rgba(124, 77, 255, 0.15)', text: '#7C4DFF', border: 'rgba(124, 77, 255, 0.4)' },
  C: { bg: 'rgba(255, 140, 0, 0.15)', text: '#FF8C00', border: 'rgba(255, 140, 0, 0.4)' },
  D: { bg: 'rgba(255, 82, 82, 0.15)', text: '#FF5252', border: 'rgba(255, 82, 82, 0.4)' },
};

const coverGradients = [
  ['#0B1E3F', '#00D4FF'],
  ['#0A2442', '#7C4DFF'],
  ['#061529', '#00C853'],
  ['#1B2845', '#FF8C00'],
  ['#0F2A4A', '#FF5252'],
];

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
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '40' },
            { offset: 1, color: color + '00' },
          ],
        },
      },
    },
  ],
});

const CoverSVG = ({ id, idx }: { id: string; idx: number }) => {
  const [c1, c2] = coverGradients[idx % coverGradients.length];
  const gid = `grad-${id.slice(-6)}`;
  return (
    <svg viewBox="0 0 300 180" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} stopOpacity="0.8" />
        </linearGradient>
        <pattern id={`grid-${gid}`} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="300" height="180" fill={`url(#${gid})`} />
      <rect width="300" height="180" fill={`url(#grid-${gid})`} />
      <circle cx="250" cy="40" r="60" fill="rgba(0,212,255,0.08)" />
      <circle cx="220" cy="60" r="80" fill="rgba(124,77,255,0.06)" />
      <g transform="translate(20,110)">
        <text x="0" y="0" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Roboto Mono">REPORT ID</text>
        <text x="0" y="22" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="Orbitron">{id.slice(0, 14).toUpperCase()}</text>
      </g>
      <g transform="translate(20, 150)">
        {[40, 70, 95, 60, 80, 55, 85, 65, 90, 75, 50, 88, 70, 60].map((h, i) => (
          <rect key={i} x={i * 18} y={30 - h * 0.25} width="10" height={h * 0.25} rx="2" fill="rgba(0,212,255,0.5)" />
        ))}
      </g>
    </svg>
  );
};

export default function ReportList() {
  const navigate = useNavigate();
  const { reports } = useAppStore();

  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !r.id.toLowerCase().includes(s) &&
          !r.simulationName.toLowerCase().includes(s) &&
          !r.configurationName.toLowerCase().includes(s)
        ) return false;
      }
      if (approvalFilter !== 'all') {
        if (approvalFilter === 'approved' && r.approvalStatus !== 'level2_approved') return false;
        if (approvalFilter === 'pending' && !['level1_pending', 'level2_pending'].includes(r.approvalStatus)) return false;
        if (approvalFilter === 'rejected' && r.approvalStatus !== 'rejected') return false;
      }
      if (typeFilter !== 'all' && r.reportType !== typeFilter) return false;
      if (startDate) {
        if (new Date(r.generatedAt) < new Date(startDate)) return false;
      }
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59);
        if (new Date(r.generatedAt) > ed) return false;
      }
      return true;
    });
  }, [reports, search, approvalFilter, typeFilter, startDate, endDate]);

  const pagedReports = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const stats = useMemo(() => {
    const total = reports.length;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = reports.filter((r) => new Date(r.generatedAt) >= thisMonthStart).length;
    const passed = reports.filter((r) => r.approvalStatus === 'level2_approved').length;
    const submitted = reports.filter((r) => r.approvalStatus !== 'not_started').length;
    const passRate = submitted > 0 ? +((passed / submitted) * 100).toFixed(1) : 0;
    const avgDur = total > 0 ? +(reports.reduce((s, r) => s + r.generationDuration, 0) / total).toFixed(1) : 0;
    return { total, thisMonth, passRate, avgDur };
  }, [reports]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedReports.length && pagedReports.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedReports.map((r) => r.id)));
    }
  };

  const showToast = (msg: string) => {
    const el = document.createElement('div');
    el.className = 'fixed top-20 right-6 z-[100] rounded-lg border border-success/40 bg-success/10 backdrop-blur-xl px-5 py-3 text-sm text-success font-medium shadow-lg';
    el.style.animation = 'slideIn 0.3s ease, fadeOut 0.3s ease 2.2s';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  };

  const handleExportSelectedPDF = () => {
    if (selectedIds.size === 0) {
      alert('请先选择要导出的报告');
      return;
    }
    showToast(`已导出 ${selectedIds.size} 份PDF报告`);
    setSelectedIds(new Set());
  };

  const handleBatchExportExcel = () => {
    const data = filtered.map((r) => ({
      报告ID: r.id,
      任务名称: r.simulationName,
      构型: r.configurationName,
      报告类型: reportTypeMap[r.reportType].label,
      安全评级: r.safetyRating,
      审批状态: approvalStatusMap[r.approvalStatus].label,
      生成时间: new Date(r.generatedAt).toLocaleString('zh-CN'),
      生成时长_min_: r.generationDuration,
      生成人: r.generatedBy,
    }));
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '报告清单');
      XLSX.writeFile(wb, `报告清单_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`已导出 ${data.length} 条报告数据`);
    });
  };

  const formatDuration = (m: number) => {
    if (m < 60) return `${m.toFixed(0)}分钟`;
    const h = Math.floor(m / 60);
    const mm = Math.round(m % 60);
    return mm === 0 ? `${h}小时` : `${h}h ${mm}min`;
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        .report-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .report-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0, 212, 255, 0.15); border-color: rgba(0, 212, 255, 0.4); }
      `}</style>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">报告管理</h1>
            <p className="mt-1 text-sm text-white/60">报告列表、预览、导出、下载 · 共 {filtered.length} 份报告</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportSelectedPDF}
              className="glow-btn !py-2 !px-4 text-xs !flex !gap-2"
            >
              <FileText className="w-4 h-4" />
              导出选中PDF
              {selectedIds.size > 0 && <span className="bg-primary/30 px-1.5 rounded">{selectedIds.size}</span>}
            </button>
            <button onClick={handleBatchExportExcel} className="glow-btn !py-2 !px-4 text-xs !flex !gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              批量导出Excel
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="搜索报告ID / 任务名称 / 构型..."
              className="w-full bg-secondary/60 border border-primary/20 rounded-lg pl-10 pr-10 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2 border border-primary/10">
            <Filter className="w-4 h-4 text-white/50" />
            <select
              value={approvalFilter}
              onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-white/80 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-secondary">全部审批状态</option>
              <option value="approved" className="bg-secondary">已通过</option>
              <option value="pending" className="bg-secondary">待审批</option>
              <option value="rejected" className="bg-secondary">已驳回</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2 border border-primary/10">
            <BarChart3 className="w-4 h-4 text-white/50" />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-white/80 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-secondary">全部报告类型</option>
              {(Object.keys(reportTypeMap) as ReportType[]).map((t) => (
                <option key={t} value={t} className="bg-secondary">{reportTypeMap[t].label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2 border border-primary/10">
            <Calendar className="w-4 h-4 text-white/50" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-white/80 focus:outline-none cursor-pointer"
            />
            <span className="text-white/30 text-sm">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-white/80 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 overflow-hidden group hover:border-primary/40 transition-all relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-xs text-white/50">报告总数</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-white">{stats.total}</span>
                  <span className="text-xs text-primary">份</span>
                </div>
              </div>
              <div className="w-24 h-12">
                <ReactECharts option={miniLineOption([3, 5, 8, 10, 14, 18, 22, 28, 32, 36], '#00D4FF')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <span className="text-white/40">累计归档</span>
              <span className="text-primary/80">{reports.filter(r => r.approvalStatus === 'level2_approved').length} 已通过</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 overflow-hidden group hover:border-info/40 transition-all relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-info/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-4 h-4 text-info" />
                  <span className="text-xs text-white/50">本月生成</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-white">{stats.thisMonth}</span>
                  <span className="text-xs text-info">份</span>
                </div>
              </div>
              <div className="w-24 h-12">
                <ReactECharts option={miniLineOption([0, 1, 2, 2, 3, 4, 5, 6, 7, stats.thisMonth], '#7C4DFF')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <span className="text-white/40">日均生成</span>
              <span className="text-info/80">{(stats.thisMonth / Math.max(1, new Date().getDate())).toFixed(1)} 份/天</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 overflow-hidden group hover:border-success/40 transition-all relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-xs text-white/50">通过审批率</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-white">{stats.passRate}</span>
                  <span className="text-xs text-success">%</span>
                </div>
              </div>
              <div className="w-24 h-12">
                <ReactECharts option={miniLineOption([70, 72, 75, 73, 78, 80, 79, 82, 81, stats.passRate], '#00C853')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <span className="text-white/40">通过/已提交</span>
              <span className="text-success/80">{reports.filter(r => r.approvalStatus === 'level2_approved').length} / {reports.filter(r => r.approvalStatus !== 'not_started').length}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 overflow-hidden group hover:border-warning/40 transition-all relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-4 h-4 text-warning" />
                  <span className="text-xs text-white/50">平均生成时长</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-bold text-white">{formatDuration(stats.avgDur).replace(/h|min|分钟/g, m => m)}</span>
                  <span className="text-xs text-warning">{stats.avgDur < 60 ? '分钟' : 'h'}</span>
                </div>
              </div>
              <div className="w-24 h-12">
                <ReactECharts option={miniLineOption([220, 210, 195, 200, 180, 170, 175, 165, 160, stats.avgDur], '#FF8C00')} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-white/5">
              <span className="text-white/40">最快 / 最慢</span>
              <span className="text-warning/80">
                {formatDuration(Math.min(...reports.map(r => r.generationDuration)))} / {formatDuration(Math.max(...reports.map(r => r.generationDuration)))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pagedReports.length > 0 && selectedIds.size === pagedReports.length}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-primary/40 bg-secondary/60 text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-white/60">
            本页全选 {selectedIds.size > 0 && `(${selectedIds.size}份已选中)`}
          </span>
        </label>
        <div className="text-xs text-white/40">
          第 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} 条，共 {filtered.length} 条
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pagedReports.map((r: SimulationReport, idx: number) => {
          const typeMeta = reportTypeMap[r.reportType];
          const approvalMeta = approvalStatusMap[r.approvalStatus];
          const rating = ratingColors[r.safetyRating];
          const step = approvalMeta.step;
          const totalSteps = 4;
          const progress = step < 0 ? 0 : (step / totalSteps) * 100;
          const isSelected = selectedIds.has(r.id);
          const coverIdx = (parseInt(r.id.slice(-3), 36) + idx) % coverGradients.length;

          return (
            <div
              key={r.id}
              className={cn(
                'report-card glass-card overflow-hidden cursor-pointer',
                isSelected && 'ring-2 ring-primary/60 border-primary/50'
              )}
              onClick={() => navigate(`/reports/${r.id}`)}
            >
              <div className="relative h-[150px] overflow-hidden group">
                <CoverSVG id={r.id} idx={coverIdx} />
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 left-3 w-4 h-4 rounded border-white/40 bg-white/10 text-primary focus:ring-primary/30 cursor-pointer z-10"
                />
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  <span
                    className="text-[11px] font-semibold px-2 py-1 rounded font-display tracking-wide"
                    style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: typeMeta.color, border: `1px solid ${typeMeta.color}60`, backdropFilter: 'blur(8px)' }}
                  >
                    {typeMeta.label}
                  </span>
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-display tracking-wide backdrop-blur-sm"
                    style={{ backgroundColor: rating.bg, color: rating.text, border: `1px solid ${rating.border}` }}
                  >
                    {r.safetyRating}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-white truncate mb-1" title={r.simulationName}>
                    {r.simulationName}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-white/45">
                    <span className="truncate">{r.configurationName}</span>
                    <span>·</span>
                    <span className="whitespace-nowrap font-mono">
                      {new Date(r.generatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-white/45">审批进度</span>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: approvalMeta.color }}
                    >
                      {approvalMeta.label}
                    </span>
                  </div>
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: step < 0
                          ? 'linear-gradient(90deg, #FF5252, #FF525280)'
                          : 'linear-gradient(90deg, #00D4FF, #7C4DFF)',
                      }}
                    />
                    <div className="absolute inset-0 flex justify-between px-0.5 pointer-events-none">
                      {[0.25, 0.5, 0.75].map((pos, i) => (
                        <div
                          key={i}
                          className="w-0.5 h-full bg-secondary/80"
                          style={{ marginLeft: `${i === 0 ? '25%' : i === 1 ? '25%' : ''}` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-white/30 font-mono">
                    <span>提交</span>
                    <span className={step >= 2 ? 'text-primary' : ''}>工程师验证</span>
                    <span className={step >= 3 ? 'text-primary' : ''}>总工确认</span>
                    <span className={step >= 4 ? 'text-success' : ''}>归档</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[11px] text-white/50 font-mono">
                      CHF {r.safetyMargins.chfMargin.toFixed(2)} · T {r.safetyMargins.temperatureMargin.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/reports/${r.id}`); }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-primary/15 hover:text-primary text-white/60 transition-colors"
                      title="预览"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); showToast(`正在下载 ${r.id}.pdf ...`); }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-primary/15 hover:text-primary text-white/60 transition-colors"
                      title="下载PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        import('xlsx').then((XLSX) => {
                          const data = [{
                            报告ID: r.id, 任务: r.simulationName, 构型: r.configurationName,
                            温度裕量: r.safetyMargins.temperatureMargin, CHF裕量: r.safetyMargins.chfMargin,
                            流量裕量: r.safetyMargins.flowMargin, 压力裕量: r.safetyMargins.pressureMargin,
                            功率裕量: r.safetyMargins.powerMargin,
                          }];
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, '报告数据');
                          XLSX.writeFile(wb, `${r.id}_数据.xlsx`);
                        });
                      }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-primary/15 hover:text-primary text-white/60 transition-colors"
                      title="导出数据"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/reports/${r.id}`;
                        navigator.clipboard?.writeText(url);
                        showToast('分享链接已复制到剪贴板');
                      }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-primary/15 hover:text-primary text-white/60 transition-colors"
                      title="分享"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pagedReports.length === 0 && (
        <div className="glass-card p-16 text-center">
          <FileText className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <div className="text-white/50 mb-2">没有匹配的报告</div>
          <div className="text-sm text-white/30">试试调整筛选条件或清空搜索</div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="text-xs text-white/40">
            第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-primary/15 bg-secondary/40 text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
              if (totalPages > 7) {
                if (p !== 1 && p !== totalPages && Math.abs(p - page) > 1) {
                  if (p === 2 || p === totalPages - 1) {
                    return <span key={p} className="px-2 text-white/30 text-sm">...</span>;
                  }
                  return null;
                }
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'min-w-[34px] h-8 rounded-lg text-sm font-medium transition-all',
                    p === page
                      ? 'bg-gradient-to-r from-primary/30 to-info/30 border border-primary/50 text-primary'
                      : 'border border-primary/10 bg-secondary/30 text-white/60 hover:border-primary/30 hover:text-white'
                  )}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-primary/15 bg-secondary/40 text-white/70 hover:border-primary/40 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
