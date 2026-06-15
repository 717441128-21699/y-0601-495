import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ArrowUpDown,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Loader2,
} from 'lucide-react';
import { useAppStore, type Simulation, type SimulationStatus } from '@/store/useAppStore';

const STATUS_OPTIONS: { value: SimulationStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: '全部状态', color: 'primary' },
  { value: 'pending_validation', label: '待校验', color: 'info' },
  { value: 'mesh_generation', label: '网格生成', color: 'primary' },
  { value: 'thermal_calculation', label: '热工计算', color: 'primary' },
  { value: 'accident_analysis', label: '事故分析', color: 'warning' },
  { value: 'completed', label: '已完成', color: 'success' },
  { value: 'exception_rollback', label: '异常回退', color: 'danger' },
  { value: 'paused', label: '已暂停', color: 'warning' },
];

const STATUS_META: Record<SimulationStatus, { label: string; badgeClass: string; icon: typeof Clock }> = {
  pending_validation: { label: '待校验', badgeClass: 'status-badge-info', icon: Clock },
  mesh_generation: { label: '网格生成', badgeClass: 'status-badge-primary', icon: Loader2 },
  thermal_calculation: { label: '热工计算', badgeClass: 'status-badge-primary', icon: Loader2 },
  accident_analysis: { label: '事故分析', badgeClass: 'status-badge-warning', icon: AlertTriangle },
  completed: { label: '已完成', badgeClass: 'status-badge-success', icon: CheckCircle2 },
  exception_rollback: { label: '异常回退', badgeClass: 'status-badge-danger', icon: XCircle },
  paused: { label: '已暂停', badgeClass: 'status-badge-warning', icon: PauseCircle },
};

type SortKey = 'createdAt' | 'updatedAt' | 'progress' | 'name';
type SortDir = 'asc' | 'desc';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SimulationList() {
  const navigate = useNavigate();
  const { simulations, currentUser } = useAppStore();

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<SimulationStatus | 'all'>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Simulation | null>(null);

  const filtered = useMemo(() => {
    let list = [...simulations];
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.configurationName.toLowerCase().includes(kw) ||
          s.id.toLowerCase().includes(kw)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (dateStart) {
      const start = new Date(dateStart).getTime();
      list = list.filter((s) => new Date(s.createdAt).getTime() >= start);
    }
    if (dateEnd) {
      const end = new Date(dateEnd).getTime() + 24 * 3600 * 1000;
      list = list.filter((s) => new Date(s.createdAt).getTime() <= end);
    }
    list.sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      if (sortKey === 'createdAt') {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      } else if (sortKey === 'updatedAt') {
        av = new Date(a.updatedAt).getTime();
        bv = new Date(b.updatedAt).getTime();
      } else if (sortKey === 'progress') {
        av = a.progress;
        bv = b.progress;
      } else {
        av = a.name;
        bv = b.name;
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [simulations, keyword, statusFilter, dateStart, dateEnd, sortKey, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageData = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    STATUS_OPTIONS.forEach((o) => {
      if (o.value !== 'all') byStatus[o.value] = 0;
    });
    simulations.forEach((s) => {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    });
    return { total: simulations.length, byStatus };
  }, [simulations]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      useAppStore.getState().deleteSimulation?.(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-white/70 cursor-pointer hover:text-primary select-none"
      onClick={() => toggleSort(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={12}
          className={sortKey === k ? 'text-primary' : 'text-white/40'}
        />
      </span>
    </th>
  );

  const statusCounts = STATUS_OPTIONS.filter((o) => o.value !== 'all').map((o) => ({
    ...o,
    count: stats.byStatus[o.value] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="glass-card p-6 flex-1">
          <h1 className="font-display text-2xl font-bold text-gradient">模拟任务列表</h1>
          <p className="mt-2 text-sm text-white/60">任务查询、状态筛选、批量操作</p>
        </div>
        <button
          className="glow-btn shrink-0"
          onClick={() => navigate('/simulations/new')}
        >
          <Plus size={16} className="mr-2" />
          新建任务
        </button>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block mb-1.5 text-xs font-display uppercase tracking-wider text-white/60">
              <Search size={12} className="inline mr-1 -translate-y-0.5" />
              关键字搜索
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                placeholder="任务ID、名称、构型名称..."
                className="w-full px-4 py-2.5 pl-10 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-primary/60 focus:bg-white/10 transition-all"
              />
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
          </div>

          <div className="min-w-[180px]">
            <label className="block mb-1.5 text-xs font-display uppercase tracking-wider text-white/60">
              <Filter size={12} className="inline mr-1 -translate-y-0.5" />
              状态筛选
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SimulationStatus | 'all');
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/60 focus:bg-white/10 transition-all appearance-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-secondary">
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div>
              <label className="block mb-1.5 text-xs font-display uppercase tracking-wider text-white/60">
                <Calendar size={12} className="inline mr-1 -translate-y-0.5" />
                开始日期
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => {
                  setDateStart(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/60 focus:bg-white/10 transition-all"
              />
            </div>
            <span className="text-white/40 pb-2.5">~</span>
            <div>
              <label className="block mb-1.5 text-xs font-display uppercase tracking-wider text-white/60">
                结束日期
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => {
                  setDateEnd(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/60 focus:bg-white/10 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="glass-card p-3 text-center">
          <div className="text-2xl font-display font-bold text-gradient">{stats.total}</div>
          <div className="text-xs text-white/60 mt-1 font-display uppercase">总数</div>
        </div>
        {statusCounts.map((s) => (
          <div key={s.value} className="glass-card p-3 text-center">
            <div className={`text-2xl font-display font-bold ${
              s.color === 'success' ? 'text-success' :
              s.color === 'danger' ? 'text-danger' :
              s.color === 'warning' ? 'text-warning' :
              s.color === 'info' ? 'text-info' :
              'text-primary'
            }`}>{s.count}</div>
            <div className="text-xs text-white/60 mt-1 font-display uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <SortHeader label="任务ID" k="name" />
                <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-white/70">
                  构型名称
                </th>
                <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-white/70">
                  状态
                </th>
                <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-white/70 w-56">
                  当前步骤进度
                </th>
                <SortHeader label="创建时间" k="createdAt" />
                <th className="px-4 py-3 text-left font-display text-xs uppercase tracking-wider text-white/70">
                  负责人
                </th>
                <th className="px-4 py-3 text-right font-display text-xs uppercase tracking-wider text-white/70">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <FileText size={48} className="mx-auto text-white/20 mb-3" />
                    <p className="text-white/50 font-display">暂无匹配的模拟任务</p>
                  </td>
                </tr>
              )}
              {pageData.map((sim) => {
                const meta = STATUS_META[sim.status];
                const StatusIcon = meta.icon;
                return (
                  <tr
                    key={sim.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/simulations/${sim.id}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="font-mono text-sm text-primary">{sim.id}</div>
                      <div className="text-xs text-white/60 mt-0.5">{sim.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-white/90">{sim.configurationName}</div>
                      <div className="text-xs text-white/40 mt-0.5">{sim.configurationHash}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`status-badge ${meta.badgeClass}`}>
                        <StatusIcon size={10} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-white/60">
                          {sim.status === 'pending_validation' && '等待校验'}
                          {sim.status === 'mesh_generation' && '生成子通道网格'}
                          {sim.status === 'thermal_calculation' && '热工水力迭代'}
                          {sim.status === 'accident_analysis' && '事故时序模拟'}
                          {sim.status === 'completed' && '计算完成'}
                          {sim.status === 'exception_rollback' && '异常处理中'}
                          {sim.status === 'paused' && '任务暂停'}
                        </span>
                        <span className="font-mono font-bold text-primary">{sim.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-info to-primary rounded-full transition-all duration-500 relative"
                          style={{ width: `${sim.progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-white/80">{formatDate(sim.createdAt)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-xs font-display font-bold text-white shrink-0">
                          {currentUser.username.slice(0, 1)}
                        </div>
                        <span className="text-sm text-white/80">{currentUser.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => navigate(`/simulations/${sim.id}`)}
                          className="p-2 rounded-lg text-white/60 hover:text-primary hover:bg-primary/10 transition-all"
                          title="查看"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/simulations/${sim.id}`)}
                          className="p-2 rounded-lg text-white/60 hover:text-info hover:bg-info/10 transition-all"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(sim)}
                          className="p-2 rounded-lg text-white/60 hover:text-danger hover:bg-danger/10 transition-all"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-white/10">
          <div className="text-sm text-white/60">
            共 <span className="font-display font-bold text-primary">{total}</span> 条记录，
            当前第 <span className="font-display font-bold text-white/90">{curPage}</span> / {totalPages} 页
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={curPage === 1}
              className="p-2 rounded-lg text-white/60 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={curPage === 1}
              className="p-2 rounded-lg text-white/60 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (curPage <= 3) {
                p = i + 1;
              } else if (curPage >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = curPage - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-display transition-all ${
                    curPage === p
                      ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={curPage === totalPages}
              className="p-2 rounded-lg text-white/60 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={curPage === totalPages}
              className="p-2 rounded-lg text-white/60 hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md pulse-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/40 flex items-center justify-center">
                <AlertTriangle className="text-danger" size={24} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">确认删除</h3>
                <p className="text-sm text-white/60">此操作不可撤销</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 mb-6">
              <p className="text-sm text-white/80 mb-2">
                任务ID: <span className="font-mono text-primary">{deleteTarget.id}</span>
              </p>
              <p className="text-sm text-white/80">
                任务名称: <span className="text-white/90">{deleteTarget.name}</span>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/10 transition-all font-display text-sm"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-lg bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 transition-all font-display text-sm"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
