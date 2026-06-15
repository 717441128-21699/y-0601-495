import { ReactNode, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Thermometer,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore, Warning } from '../../store/useAppStore';

function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

const severityConfig: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  critical: {
    label: '紧急',
    color: 'text-danger',
    bg: 'bg-danger/15',
    border: 'border-danger/40',
    glow: 'shadow-[0_0_15px_rgba(255,82,82,0.4)]',
  },
  warning: {
    label: '警告',
    color: 'text-warning',
    bg: 'bg-warning/15',
    border: 'border-warning/40',
    glow: 'shadow-[0_0_15px_rgba(255,140,0,0.3)]',
  },
  info: {
    label: '提示',
    color: 'text-info',
    bg: 'bg-info/15',
    border: 'border-info/40',
    glow: 'shadow-[0_0_15px_rgba(124,77,255,0.3)]',
  },
  high: {
    label: '高',
    color: 'text-danger',
    bg: 'bg-danger/15',
    border: 'border-danger/40',
    glow: 'shadow-[0_0_15px_rgba(255,82,82,0.4)]',
  },
  medium: {
    label: '中',
    color: 'text-warning',
    bg: 'bg-warning/15',
    border: 'border-warning/40',
    glow: 'shadow-[0_0_15px_rgba(255,140,0,0.3)]',
  },
  low: {
    label: '低',
    color: 'text-primary',
    bg: 'bg-primary/15',
    border: 'border-primary/40',
    glow: 'shadow-[0_0_15px_rgba(0,212,255,0.3)]',
  },
};

const typeConfig: Record<string, { label: string; icon: typeof AlertCircle }> = {
  temperature_exceed: { label: '温度超限', icon: Thermometer },
  chf_below_threshold: { label: 'CHF比不足', icon: Activity },
  convergence_failure: { label: '收敛失败', icon: AlertCircle },
  temperature_exceeded: { label: '温度超限', icon: Thermometer },
  chf_ratio_insufficient: { label: 'CHF比不足', icon: Activity },
  flow_anomaly: { label: '流量异常', icon: Activity },
  pressure_anomaly: { label: '压力异常', icon: AlertCircle },
};

const getSeverity = (warning: Warning) =>
  severityConfig[warning.severity] ?? severityConfig.info;

const getType = (warning: Warning) =>
  typeConfig[warning.type] ?? { label: warning.type, icon: AlertCircle };

const formatTriggerTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
};

interface LayoutProps {
  children?: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [warningPanelOpen, setWarningPanelOpen] = useState(false);
  const warnings = useAppStore((state) => state.warnings);
  const resolveWarning = useAppStore((state) => state.resolveWarning);
  const currentUser = useAppStore((state) => state.currentUser);

  const pendingWarnings = warnings.filter((w) => w.status === 'pending');
  const hasPendingWarnings = pendingWarnings.length > 0;

  useEffect(() => {
    if (hasPendingWarnings && !warningPanelOpen) {
      const timer = setTimeout(() => {
        setWarningPanelOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasPendingWarnings, warningPanelOpen]);

  const handleDismissWarning = (id: string) => {
    resolveWarning(id, currentUser.username, '已标记为已查看');
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 bg-dark-bg pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 255, 0.15), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124, 77, 255, 0.1), transparent)',
        }}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="relative flex flex-1 flex-col min-h-screen overflow-hidden">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onToggleWarningPanel={() => setWarningPanelOpen((prev) => !prev)}
        />

        <main className="relative flex-1 overflow-auto p-6">
          {children ?? <Outlet />}
        </main>
      </div>

      <aside
        className={cn(
          'relative flex flex-col h-screen transition-all duration-500 ease-in-out z-30 overflow-hidden',
          warningPanelOpen ? 'w-80' : 'w-0'
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/90 to-dark-bg/95 backdrop-blur-xl border-l border-primary/20" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-primary/50 via-primary/30 to-transparent" />

        <div className="relative flex flex-col h-full min-w-[320px]">
          <div className="flex items-center justify-between h-20 px-5 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-danger/20 border border-danger/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
                <div className="absolute inset-0 rounded-xl bg-danger/10 blur-md -z-10" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-white/90 tracking-wide">
                  预警中心
                </span>
                <span className="font-mono text-[11px] text-white/50">
                  共 {pendingWarnings.length} 条待处理
                </span>
              </div>
            </div>
            <button
              onClick={() => setWarningPanelOpen(false)}
              className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-white/60 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
            >
              {warningPanelOpen ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pendingWarnings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-success/70" />
                </div>
                <p className="font-display text-base text-white/70 mb-1">
                  系统运行正常
                </p>
                <p className="font-mono text-xs text-white/40">
                  当前无待处理预警
                </p>
              </div>
            ) : (
              pendingWarnings.map((warning) => {
                const severity = getSeverity(warning);
                const type = getType(warning);
                const TypeIcon = type.icon;

                return (
                  <div
                    key={warning.id}
                    className={cn(
                      'relative rounded-xl border p-4 transition-all duration-300',
                      'hover:scale-[1.01]',
                      severity.bg,
                      severity.border,
                      severity.glow
                    )}
                  >
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-xl" />

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          severity.bg,
                          severity.border,
                          'border'
                        )}>
                          <TypeIcon className={cn('w-4 h-4', severity.color)} />
                        </div>
                        <div className="flex flex-col">
                          <span className={cn(
                            'font-display text-xs font-bold uppercase tracking-wider',
                            severity.color
                          )}>
                            {severity.label}
                          </span>
                          <span className="font-mono text-[10px] text-white/50">
                            {type.label}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissWarning(warning.id)}
                        className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <p className="font-display text-sm font-medium text-white/90 mb-1 line-clamp-1">
                        {warning.simulationName}
                      </p>
                      {warning.channelId && (
                        <p className="font-mono text-[11px] text-primary/70">
                          通道: {warning.channelId}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                        <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider mb-0.5">
                          当前值
                        </p>
                        <p className={cn('font-display text-sm font-bold', severity.color)}>
                          {warning.actualValue.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
                        <p className="font-mono text-[9px] text-white/40 uppercase tracking-wider mb-0.5">
                          限值
                        </p>
                        <p className="font-display text-sm font-bold text-white/80">
                          {warning.limitValue.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-white/40">
                        {formatTriggerTime(warning.triggeredAt)}
                      </span>
                      <span className={cn(
                        'font-display text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider',
                        severity.bg,
                        severity.border,
                        'border',
                        severity.color
                      )}>
                        待处理
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t border-primary/10">
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-danger/25 to-warning/25 border border-danger/40 text-danger font-display text-sm font-bold uppercase tracking-wider hover:from-danger/35 hover:to-warning/35 hover:border-danger/50 transition-all duration-300 shadow-[0_0_20px_rgba(255,82,82,0.2)]">
              查看全部预警
            </button>
          </div>
        </div>
      </aside>

      {!warningPanelOpen && (
        <button
          onClick={() => setWarningPanelOpen(true)}
          className={cn(
            'fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300',
            hasPendingWarnings ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          )}
        >
          <div className="relative flex items-center">
            <div className="absolute inset-0 bg-danger/30 blur-xl rounded-l-xl -left-2" />
            <div className={cn(
              'relative rounded-l-xl border-r-0 py-6 px-2 backdrop-blur-xl',
              hasPendingWarnings
                ? 'bg-danger/20 border-danger/50'
                : 'bg-primary/10 border-primary/30'
            )}
              style={{ borderWidth: '1px 0 1px 1px' }}
            >
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className={cn(
                  'w-5 h-5',
                  hasPendingWarnings ? 'text-danger animate-pulse' : 'text-white/60'
                )} />
                {hasPendingWarnings && (
                  <span className="font-display text-xs font-bold text-danger">
                    {pendingWarnings.length}
                  </span>
                )}
                <ChevronLeft className="w-4 h-4 text-white/50" />
              </div>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
