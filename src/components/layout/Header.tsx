import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Bell, Clock, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppStore } from '../../store/useAppStore';

function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

const roleDisplayMap: Record<string, string> = {
  thermal_engineer: '热工工程师',
  safety_engineer: '核安全分析师',
  chief_engineer: '安全总工',
  reviewer: '运行规程组',
  nuclear_safety_analyst: '核安全分析师',
  chief_safety_engineer: '安全总工',
  operation_procedure_team: '运行规程组',
  emergency_response_team: '应急响应组',
  chief_nuclear_safety_engineer: '首席核安全工程师',
  system_administrator: '系统管理员',
};

interface HeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleWarningPanel: () => void;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
  { label: '首页', href: '/' },
  { label: '仪表板' },
];

export function Header({ sidebarCollapsed, onToggleSidebar, onToggleWarningPanel }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const warnings = useAppStore((state) => state.warnings);
  const currentUser = useAppStore((state) => state.currentUser);

  const unreadCount = warnings.filter((w) => w.status === 'pending').length;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    return `${year}-${month}-${day} ${weekDay}`;
  };

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <header className="relative h-20 flex items-center justify-between px-6 z-10">
      <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-secondary/60 to-secondary/80 backdrop-blur-xl border-b border-primary/15" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="relative flex items-center gap-6">
        <button
          onClick={onToggleSidebar}
          className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-white/70 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 group"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-primary/40 text-xs">/</span>
              )}
              <span
                className={cn(
                  'font-mono tracking-wide transition-colors duration-300',
                  index === breadcrumbs.length - 1
                    ? 'text-primary font-medium'
                    : 'text-white/60 hover:text-white/80'
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </nav>
      </div>

      <div className="relative flex items-center gap-4">
        <div className="flex items-center gap-3 px-5 py-2 rounded-xl bg-primary/5 border border-primary/15">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <div className="flex flex-col items-end leading-tight">
            <span className="font-mono text-xl font-bold text-primary tracking-wider glow-text">
              {formatTime(currentTime)}
            </span>
            <span className="font-mono text-[11px] text-white/50 tracking-wider">
              {formatDate(currentTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-4">
        <button
          onClick={onToggleWarningPanel}
          className="relative w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-white/70 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 group"
        >
          <Bell className={cn(
            "w-5 h-5",
            unreadCount > 0 && "text-warning animate-pulse"
          )} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger border-2 border-secondary flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_rgba(255,82,82,0.8)]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
        </button>

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 hover:border-primary/30 transition-colors duration-300">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-info/40 border border-primary/30 flex items-center justify-center overflow-hidden">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-secondary shadow-[0_0_6px_rgba(0,200,83,0.8)]" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-medium text-white/90">
              {currentUser.username}
            </span>
            <span className="font-mono text-[10px] text-primary/80 tracking-wide">
              {roleDisplayMap[currentUser.role] || currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
