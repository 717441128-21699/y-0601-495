import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Atom,
  AlertTriangle,
  CheckSquare,
  FileText,
  Lightbulb,
  Shield,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

const navItems = [
  { to: '/dashboard', label: '仪表板', icon: LayoutDashboard },
  { to: '/simulations', label: '模拟任务', icon: Atom },
  { to: '/warnings', label: '预警中心', icon: AlertTriangle },
  { to: '/approvals', label: '审批工作台', icon: CheckSquare },
  { to: '/reports', label: '报告管理', icon: FileText },
  { to: '/recommendations', label: '智能推荐', icon: Lightbulb },
  { to: '/configurations', label: '构型管控', icon: Shield },
  { to: '/performance', label: '性能看板', icon: BarChart3 },
  { to: '/settings', label: '系统设置', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen transition-all duration-300 ease-in-out z-20',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/95 via-secondary/90 to-dark-bg/95 backdrop-blur-xl border-r border-primary/20" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative flex items-center justify-between h-20 px-4 border-b border-primary/10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/40 flex items-center justify-center">
            <Atom className="w-6 h-6 text-primary animate-pulse-glow" />
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
          </div>
          {!collapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="font-display font-bold text-lg text-gradient tracking-wider">
                NUCLEAR-TH
              </span>
              <span className="text-[10px] text-white/50 font-mono tracking-widest">
                SIMULATION PLATFORM
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="relative flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="relative">
              <NavLink
                to={to}
                onMouseEnter={() => setHoveredItem(to)}
                onMouseLeave={() => setHoveredItem(null)}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300',
                    'hover:bg-primary/10',
                    isActive
                      ? 'bg-gradient-to-r from-primary/25 to-primary/5 text-primary shadow-[0_0_20px_rgba(0,212,255,0.25)] border border-primary/30'
                      : 'text-white/70 hover:text-white border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
                    )}
                    <Icon
                      className={cn(
                        'w-5 h-5 flex-shrink-0 transition-all duration-300',
                        isActive && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]'
                      )}
                    />
                    {!collapsed && (
                      <span className="font-display text-sm font-medium tracking-wide whitespace-nowrap">
                        {label}
                      </span>
                    )}

                    {collapsed && hoveredItem === to && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-secondary/95 backdrop-blur-xl border border-primary/30 rounded-lg whitespace-nowrap z-50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                        <span className="font-display text-sm font-medium text-primary">
                          {label}
                        </span>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 bg-secondary/95 border-l border-t border-primary/30 rotate-[-45deg] translate-x-1/2" />
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        onClick={onToggle}
        className="relative flex items-center justify-center h-14 mx-3 mb-4 rounded-lg bg-primary/10 border border-primary/20 text-white/70 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all duration-300 group"
      >
        <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
        {collapsed ? (
          <ChevronRight className="w-5 h-5 relative z-10" />
        ) : (
          <ChevronLeft className="w-5 h-5 relative z-10" />
        )}
      </button>
    </aside>
  );
}
