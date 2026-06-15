import { useState } from 'react';
import {
  Users,
  Shield,
  Settings2,
  AlertTriangle,
  Mail,
  FileClock,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Save,
  UserPlus,
  Thermometer,
  Droplets,
  Gauge,
  Database,
  Server,
  CheckSquare,
  Bell,
  FileText,
  Filter,
  Download,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

type TabKey = 'users' | 'roles' | 'params' | 'limits' | 'templates' | 'logs';

const tabConfig: Array<{ key: TabKey; label: string; icon: typeof Users; desc: string }> = [
  { key: 'users', label: '用户管理', icon: Users, desc: '平台用户账号与权限分配' },
  { key: 'roles', label: '角色权限', icon: Shield, desc: '角色定义与功能权限树' },
  { key: 'params', label: '系统参数', icon: Settings2, desc: '全局运行参数配置' },
  { key: 'limits', label: '安全限值配置', icon: AlertTriangle, desc: '温度/CHF/压力/流量限值' },
  { key: 'templates', label: '通知模板', icon: Mail, desc: '预警/审批/报告通知内容' },
  { key: 'logs', label: '操作日志', icon: FileClock, desc: '全平台操作审计记录' },
];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  enabled: boolean;
  lastLogin: string;
}

const initialUsers: UserRow[] = [
  { id: 'U001', name: '张工', email: 'zhanggong@nuclear.cn', role: '热工工程师', department: '热工水力设计所', enabled: true, lastLogin: '2024-06-16 09:15' },
  { id: 'U002', name: '李工', email: 'ligong@nuclear.cn', role: '热工工程师', department: '热工水力设计所', enabled: true, lastLogin: '2024-06-16 08:42' },
  { id: 'U003', name: '王总', email: 'wangzong@nuclear.cn', role: '安全总工', department: '核安全评审中心', enabled: true, lastLogin: '2024-06-15 17:30' },
  { id: 'U004', name: '赵工', email: 'zhaogong@nuclear.cn', role: '核安全分析师', department: '核安全评审中心', enabled: true, lastLogin: '2024-06-16 10:05' },
  { id: 'U005', name: '陈主任', email: 'chenzhuren@nuclear.cn', role: '运行规程组', department: '运行技术部', enabled: true, lastLogin: '2024-06-14 14:20' },
  { id: 'U006', name: '孙首席', email: 'sunshouxi@nuclear.cn', role: '首席核安全工程师', department: '总工办', enabled: true, lastLogin: '2024-06-16 07:58' },
  { id: 'U007', name: '周工', email: 'zhougong@nuclear.cn', role: '系统管理员', department: '信息技术部', enabled: false, lastLogin: '2024-06-10 11:45' },
];

interface RoleDef {
  id: string;
  name: string;
  code: string;
  color: string;
  userCount: number;
  desc: string;
  permissions: string[];
}

const initialRoles: RoleDef[] = [
  { id: 'R1', name: '热工工程师', code: 'thermal_engineer', color: '#00D4FF', userCount: 15, desc: '上传模型、发起模拟、验证模型', permissions: ['simulation.create', 'simulation.edit', 'simulation.view', 'model.upload', 'report.view'] },
  { id: 'R2', name: '核安全分析师', code: 'nuclear_safety', color: '#7C4DFF', userCount: 8, desc: '接收预警、复核超限、审批调整', permissions: ['warning.view', 'warning.handle', 'adjustment.approve', 'report.view', 'risk.view'] },
  { id: 'R3', name: '安全总工', code: 'chief_safety', color: '#FF8C00', userCount: 3, desc: '确认事故后果、最终审批结果', permissions: ['approval.final', 'report.approve', 'risk.manage', 'config.manage', 'all.view'] },
  { id: 'R4', name: '运行规程组', code: 'operation', color: '#00C853', userCount: 6, desc: '查看审批结果、优化运行规程', permissions: ['report.view', 'simulation.view', 'procedure.edit'] },
  { id: 'R5', name: '应急响应组', code: 'emergency', color: '#FF5252', userCount: 5, desc: '查看事故分析、制定应急预案', permissions: ['accident.view', 'report.view', 'emergency.plan'] },
  { id: 'R6', name: '首席核安全工程师', code: 'chief_nuclear', color: '#E91E63', userCount: 2, desc: '处理构型暂停、全局安全监控', permissions: ['config.suspend', 'all.view', 'alert.global', 'risk.global'] },
  { id: 'R7', name: '系统管理员', code: 'admin', color: '#607D8B', userCount: 2, desc: '用户管理、权限配置、系统参数', permissions: ['user.manage', 'role.manage', 'system.config', 'log.view', 'backup.manage'] },
];

const permissionTree: Array<{ key: string; label: string; children: Array<{ key: string; label: string }> }> = [
  {
    key: 'simulation', label: '模拟任务管理',
    children: [
      { key: 'simulation.view', label: '查看模拟任务' },
      { key: 'simulation.create', label: '创建模拟任务' },
      { key: 'simulation.edit', label: '编辑模拟任务' },
      { key: 'simulation.delete', label: '删除模拟任务' },
    ],
  },
  {
    key: 'model', label: '模型管理',
    children: [
      { key: 'model.upload', label: '上传几何模型' },
      { key: 'model.validate', label: '模型验证' },
      { key: 'model.view', label: '查看模型库' },
    ],
  },
  {
    key: 'warning', label: '预警管理',
    children: [
      { key: 'warning.view', label: '查看预警' },
      { key: 'warning.handle', label: '处理预警' },
      { key: 'warning.escalate', label: '升级预警' },
    ],
  },
  {
    key: 'approval', label: '审批管理',
    children: [
      { key: 'approval.view', label: '查看审批' },
      { key: 'approval.engineer', label: '工程师级审批' },
      { key: 'approval.final', label: '最终审批' },
    ],
  },
  {
    key: 'report', label: '报告管理',
    children: [
      { key: 'report.view', label: '查看报告' },
      { key: 'report.generate', label: '生成报告' },
      { key: 'report.approve', label: '审批报告' },
      { key: 'report.export', label: '导出报告' },
    ],
  },
  {
    key: 'system', label: '系统管理',
    children: [
      { key: 'user.manage', label: '用户管理' },
      { key: 'role.manage', label: '角色权限' },
      { key: 'system.config', label: '参数配置' },
      { key: 'log.view', label: '操作日志' },
    ],
  },
];

const initialParams = {
  warningInterval: 300,
  autoSaveInterval: 120,
  maxConcurrentSim: 8,
  logRetention: 90,
};

const initialLimits = {
  temperature: 1477,
  chf: 1.3,
  pressure: 17.2,
  flow: 0.85,
};

const initialTemplates = {
  warning: `【安全预警通知】
预警编号: {{warning_code}}
触发时间: {{trigger_time}}
模拟任务: {{simulation_name}}
预警类型: {{warning_type}}
严重等级: {{severity}}
当前值: {{actual_value}}
限值: {{limit_value}}
通道编号: {{channel_id}}

请相关人员及时登录平台处理。
——核反应堆热工水力模拟平台`,
  approval: `【审批待办通知】
审批编号: {{approval_code}}
提交时间: {{submit_time}}
模拟任务: {{simulation_name}}
审批类型: {{approval_type}}
提交人: {{submitter}}
待审批人: {{approver}}

请在24小时内登录平台完成审批。
——核反应堆热工水力模拟平台`,
  report: `【报告生成通知】
报告编号: {{report_code}}
生成时间: {{generate_time}}
模拟任务: {{simulation_name}}
生成人: {{generated_by}}
报告版本: {{version}}

报告已生成，请登录平台查看详情。
——核反应堆热工水力模拟平台`,
};

const initialLogs = [
  { id: 1, user: '张工', action: '创建模拟任务 CAP1400-LOCA-01', ip: '192.168.1.101', time: '2024-06-16 10:15:23', result: 'success' },
  { id: 2, user: '李工', action: '审批通过 HPR1000-稳态-验证', ip: '192.168.1.102', time: '2024-06-16 09:45:12', result: 'success' },
  { id: 3, user: '赵工', action: '处理预警 CH-157温度超限', ip: '192.168.1.104', time: '2024-06-16 09:30:08', result: 'success' },
  { id: 4, user: '孙首席', action: '暂停构型 试验构型V2', ip: '192.168.1.106', time: '2024-06-15 18:22:45', result: 'success' },
  { id: 5, user: '王总', action: '最终审批通过 华龙一号G4-08', ip: '192.168.1.103', time: '2024-06-15 17:30:11', result: 'success' },
  { id: 6, user: '周工', action: '修改系统参数 最大并发数', ip: '192.168.1.107', time: '2024-06-15 15:10:33', result: 'success' },
  { id: 7, user: '张工', action: '上传几何模型 CAP1400-core-v2', ip: '192.168.1.101', time: '2024-06-15 14:05:19', result: 'success' },
  { id: 8, user: '李工', action: '审批驳回 试验构型V2-03', ip: '192.168.1.102', time: '2024-06-15 11:42:08', result: 'rejected' },
  { id: 9, user: '未知用户', action: '尝试登录系统', ip: '203.0.113.42', time: '2024-06-15 09:15:00', result: 'failed' },
  { id: 10, user: '陈主任', action: '导出运行规程优化报告', ip: '192.168.1.105', time: '2024-06-14 16:30:22', result: 'success' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [userSearch, setUserSearch] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: '热工工程师', department: '', enabled: true });

  const [roles] = useState<RoleDef[]>(initialRoles);
  const [expandedRole, setExpandedRole] = useState<string | null>('R1');
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    initialRoles.forEach((r) => { init[r.id] = [...r.permissions]; });
    return init;
  });
  const [expandedPermGroups, setExpandedPermGroups] = useState<Record<string, boolean>>({ simulation: true, warning: true, approval: true });

  const [params, setParams] = useState(initialParams);

  const [limits, setLimits] = useState(initialLimits);

  const [templates, setTemplates] = useState(initialTemplates);

  const [logs] = useState(initialLogs);
  const [logSearch, setLogSearch] = useState('');
  const [logResultFilter, setLogResultFilter] = useState<'all' | 'success' | 'failed' | 'rejected'>('all');

  const currentTab = tabConfig.find((t) => t.key === activeTab)!;

  const filteredUsers = users.filter((u) =>
    !userSearch ||
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = logs.filter((l) => {
    const matchSearch = !logSearch || l.user.toLowerCase().includes(logSearch.toLowerCase()) || l.action.toLowerCase().includes(logSearch.toLowerCase()) || l.ip.includes(logSearch);
    const matchResult = logResultFilter === 'all' || l.result === logResultFilter;
    return matchSearch && matchResult;
  });

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({ name: '', email: '', role: '热工工程师', department: '', enabled: true });
    setUserModalOpen(true);
  };

  const openEditUser = (user: UserRow) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, role: user.role, department: user.department, enabled: user.enabled });
    setUserModalOpen(true);
  };

  const saveUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    if (editingUser) {
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...userForm } : u));
    } else {
      const newUser: UserRow = {
        id: 'U' + String(users.length + 1).padStart(3, '0'),
        ...userForm,
        lastLogin: '-',
      };
      setUsers((prev) => [...prev, newUser]);
    }
    setUserModalOpen(false);
  };

  const toggleUser = (id: string) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, enabled: !u.enabled } : u));
  };

  const deleteUser = (id: string) => {
    if (confirm('确定要删除该用户吗？')) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const toggleRolePermission = (roleId: string, permKey: string) => {
    setRolePermissions((prev) => {
      const current = prev[roleId] ?? [];
      return {
        ...prev,
        [roleId]: current.includes(permKey)
          ? current.filter((p) => p !== permKey)
          : [...current, permKey],
      };
    });
  };

  const togglePermGroup = (groupKey: string) => {
    setExpandedPermGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">系统设置</h1>
            <p className="mt-1 text-sm text-white/60">{currentTab.label} · {currentTab.desc}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-3 space-y-2">
          <div className="glass-card p-2 sticky top-4">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all mb-1 ${
                    active
                      ? 'bg-gradient-to-r from-primary/20 to-info/10 border border-primary/30 text-primary'
                      : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-primary/20' : 'bg-white/5'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-semibold text-sm ${active ? 'text-primary' : 'text-white/90'}`}>{tab.label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{tab.desc}</div>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 opacity-60" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          {activeTab === 'users' && (
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="搜索用户名、邮箱、部门..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                  />
                </div>
                <button onClick={openAddUser} className="glow-btn">
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加用户
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="text-left py-3 px-4 text-white/70 font-medium">用户</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium">角色</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium">部门</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium">最后登录</th>
                      <th className="text-center py-3 px-4 text-white/70 font-medium">状态</th>
                      <th className="text-right py-3 px-4 text-white/70 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-white font-bold text-sm">
                              {user.name.slice(0, 1)}
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-xs text-white/50">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-primary/15 text-primary text-xs font-medium border border-primary/30">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white/70 text-xs">{user.department}</td>
                        <td className="py-3 px-4 text-white/50 text-xs font-mono">{user.lastLogin}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => toggleUser(user.id)} className="inline-flex items-center">
                            {user.enabled ? (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/15 text-success text-xs font-medium border border-success/30">
                                <ToggleRight className="w-4 h-4" /> 启用
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/10 text-white/50 text-xs font-medium border border-white/15">
                                <ToggleLeft className="w-4 h-4" /> 禁用
                              </div>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-2 rounded-md text-primary/70 hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-2 rounded-md text-danger/70 hover:bg-danger/10 hover:text-danger transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {userModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="glass-card w-full max-w-lg p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-white">
                        {editingUser ? '编辑用户' : '添加新用户'}
                      </h3>
                      <button onClick={() => setUserModalOpen(false)} className="p-1.5 rounded-md hover:bg-white/10 text-white/60">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-white/60 mb-1.5 block">姓名 <span className="text-danger">*</span></label>
                        <input
                          value={userForm.name}
                          onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                          placeholder="请输入用户姓名"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/60 mb-1.5 block">邮箱 <span className="text-danger">*</span></label>
                        <input
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                          placeholder="name@company.cn"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-white/60 mb-1.5 block">角色</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                          >
                            {initialRoles.map((r) => <option key={r.id} value={r.name} className="bg-secondary">{r.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-white/60 mb-1.5 block">部门</label>
                          <input
                            value={userForm.department}
                            onChange={(e) => setUserForm({ ...userForm, department: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                            placeholder="所属部门"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <button onClick={() => setUserForm({ ...userForm, enabled: !userForm.enabled })}>
                          {userForm.enabled ? (
                            <ToggleRight className="w-8 h-8 text-success" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-white/40" />
                          )}
                        </button>
                        <span className="text-sm text-white/80">账号启用状态</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                      <button
                        onClick={() => setUserModalOpen(false)}
                        className="px-5 py-2.5 rounded-lg font-medium text-sm text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                      >
                        取消
                      </button>
                      <button onClick={saveUser} className="glow-btn">
                        <Save className="w-4 h-4 mr-2" />
                        {editingUser ? '保存修改' : '创建用户'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {roles.map((role) => {
                const expanded = expandedRole === role.id;
                const Icon = role.id === 'R1' ? Users : role.id === 'R3' ? Shield : role.id === 'R7' ? Settings2 : CheckSquare;
                return (
                  <div key={role.id} className="glass-card overflow-hidden">
                    <div
                      onClick={() => setExpandedRole(expanded ? null : role.id)}
                      className="p-5 cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: role.color + '20', border: `1px solid ${role.color}40` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: role.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-white">{role.name}</h3>
                              <span className="font-mono text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{role.code}</span>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: role.color + '15', color: role.color, border: `1px solid ${role.color}30` }}
                              >
                                {role.userCount} 人
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mt-1">{role.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/50">{rolePermissions[role.id]?.length ?? 0} 项权限</span>
                          {expanded ? (
                            <ChevronDown className="w-5 h-5 text-primary" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-white/40" />
                          )}
                        </div>
                      </div>
                    </div>
                    {expanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {permissionTree.map((group) => {
                            const groupExpanded = expandedPermGroups[group.key] ?? true;
                            const allChecked = group.children.every((c) => rolePermissions[role.id]?.includes(c.key));
                            const someChecked = group.children.some((c) => rolePermissions[role.id]?.includes(c.key));
                            return (
                              <div key={group.key} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                <div
                                  onClick={() => togglePermGroup(group.key)}
                                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {groupExpanded ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronRight className="w-4 h-4 text-white/60" />}
                                    <span className="font-semibold text-sm text-white">{group.label}</span>
                                    <span className="text-xs text-white/40">({group.children.length})</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      group.children.forEach((c) => {
                                        if (!allChecked) {
                                          if (!rolePermissions[role.id]?.includes(c.key)) toggleRolePermission(role.id, c.key);
                                        } else {
                                          if (rolePermissions[role.id]?.includes(c.key)) toggleRolePermission(role.id, c.key);
                                        }
                                      });
                                    }}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                                      allChecked
                                        ? 'bg-primary/20 text-primary border border-primary/40'
                                        : someChecked
                                          ? 'bg-warning/20 text-warning border border-warning/40'
                                          : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                    }`}
                                  >
                                    {allChecked ? '全选' : someChecked ? '部分' : '全选'}
                                  </button>
                                </div>
                                {groupExpanded && (
                                  <div className="px-4 pb-3 space-y-1 border-t border-white/5 pt-2">
                                    {group.children.map((child) => {
                                      const checked = rolePermissions[role.id]?.includes(child.key);
                                      return (
                                        <label
                                          key={child.key}
                                          className="flex items-center gap-3 py-2 px-2 rounded-md cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleRolePermission(role.id, child.key)}
                                            className={`w-5 h-5 rounded flex items-center justify-center transition-all border ${
                                              checked
                                                ? 'bg-primary border-primary text-white'
                                                : 'bg-white/5 border-white/20 hover:border-primary/50'
                                            }`}
                                          >
                                            {checked && <Check className="w-3.5 h-3.5" />}
                                          </button>
                                          <span className={`text-sm ${checked ? 'text-white' : 'text-white/60'}`}>{child.label}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/5">
                          <button className="glow-btn">
                            <Save className="w-4 h-4 mr-2" />
                            保存权限配置
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'params' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'warningInterval', label: '预警检查间隔', desc: '系统定时扫描任务工况的频率', unit: '秒', min: 60, max: 3600, step: 30, icon: Bell, color: '#FF8C00' },
                { key: 'autoSaveInterval', label: '自动保存间隔', desc: '模拟任务计算状态自动保存', unit: '秒', min: 30, max: 1800, step: 15, icon: Database, color: '#00D4FF' },
                { key: 'maxConcurrentSim', label: '最大并发模拟数', desc: '同时运行的热工计算任务上限', unit: '个', min: 1, max: 32, step: 1, icon: Server, color: '#7C4DFF' },
                { key: 'logRetention', label: '日志保留天数', desc: '操作日志自动清理周期', unit: '天', min: 7, max: 365, step: 7, icon: FileClock, color: '#00C853' },
              ].map((item) => {
                const Icon = item.icon;
                const value = params[item.key as keyof typeof params];
                const percent = ((value - item.min) / (item.max - item.min)) * 100;
                return (
                  <div key={item.key} className="glass-card p-6 relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-10"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: item.color + '20', border: `1px solid ${item.color}40` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: item.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{item.label}</h3>
                            <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-bold font-display text-white">{value}</span>
                          <span className="text-sm text-white/50">{item.unit}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={value}
                            onChange={(e) => setParams({ ...params, [item.key]: Number(e.target.value) })}
                            className="slider-custom"
                            style={{
                              background: `linear-gradient(90deg, ${item.color}66 0%, ${item.color}66 ${percent}%, rgba(255,255,255,0.05) ${percent}%, rgba(255,255,255,0.02) 100%)`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setParams({ ...params, [item.key]: Math.max(item.min, value - item.step) })}
                              className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm"
                            >-</button>
                            <input
                              type="number"
                              min={item.min}
                              max={item.max}
                              value={value}
                              onChange={(e) => setParams({ ...params, [item.key]: Math.min(item.max, Math.max(item.min, Number(e.target.value)))} as typeof params)}
                              className="w-20 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-center text-sm text-white font-mono focus:outline-none focus:border-primary/40"
                            />
                            <button
                              onClick={() => setParams({ ...params, [item.key]: Math.min(item.max, value + item.step) })}
                              className="w-7 h-7 rounded-md bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 text-sm"
                            >+</button>
                          </div>
                        </div>
                        <div className="text-xs text-white/40 font-mono">
                          {item.min} ~ {item.max}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setParams(initialParams)}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                >
                  恢复默认
                </button>
                <button className="glow-btn">
                  <Save className="w-4 h-4 mr-2" />
                  应用配置
                </button>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'temperature', label: '温度安全限值', desc: '燃料包壳最高允许温度', unit: 'K',
                  min: 1200, max: 1800, step: 10, icon: Thermometer, color: '#FF5252', value: limits.temperature,
                  warning: '建议值 ≤1477K',
                },
                {
                  key: 'chf', label: 'CHF比安全阈值', desc: '临界热流密度比最小允许值', unit: '',
                  min: 1.0, max: 2.0, step: 0.05, icon: Shield, color: '#FF8C00', value: limits.chf,
                  warning: '建议值 ≥1.30',
                },
                {
                  key: 'pressure', label: '压力安全限值', desc: '冷却剂系统最高压力', unit: 'MPa',
                  min: 10.0, max: 25.0, step: 0.1, icon: Gauge, color: '#7C4DFF', value: limits.pressure,
                  warning: '设计压力 15.5MPa',
                },
                {
                  key: 'flow', label: '流量安全限值', desc: '最小流量与额定流量比', unit: '',
                  min: 0.5, max: 1.2, step: 0.01, icon: Droplets, color: '#00D4FF', value: limits.flow,
                  warning: '建议 ≥0.85 额定值',
                },
              ].map((item) => {
                const Icon = item.icon;
                const percent = ((item.value - item.min) / (item.max - item.min)) * 100;
                return (
                  <div key={item.key} className="glass-card p-6 relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-10"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: item.color + '20', border: `1px solid ${item.color}40` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: item.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{item.label}</h3>
                            <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                          style={{ backgroundColor: item.color + '15', color: item.color, border: `1px solid ${item.color}30` }}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {item.warning}
                        </span>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-4xl font-bold font-display text-white">{item.value}</span>
                          {item.unit && <span className="text-lg text-white/50">{item.unit}</span>}
                        </div>
                        <div className="relative mb-2">
                          <input
                            type="range"
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            value={item.value}
                            onChange={(e) => setLimits({ ...limits, [item.key]: Number(e.target.value) } as typeof limits)}
                            className="slider-custom"
                            style={{
                              background: `linear-gradient(90deg, ${item.color}66 0%, ${item.color}66 ${percent}%, rgba(255,255,255,0.05) ${percent}%, rgba(255,255,255,0.02) 100%)`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/40 font-mono">
                          <span>{item.min}{item.unit}</span>
                          <span>{item.max}{item.unit}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-white/60">数值输入</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLimits({ ...limits, [item.key]: Math.max(item.min, +(item.value - item.step).toFixed(2))} as typeof limits)}
                            className="w-8 h-8 rounded-md bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 font-bold"
                          >−</button>
                          <input
                            type="number"
                            step={item.step}
                            value={item.value}
                            onChange={(e) => setLimits({ ...limits, [item.key]: Math.min(item.max, Math.max(item.min, Number(e.target.value)))} as typeof limits)}
                            className="w-28 px-3 py-2 rounded-md bg-white/10 border border-white/15 text-center text-white font-mono font-semibold focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={() => setLimits({ ...limits, [item.key]: Math.min(item.max, +(item.value + item.step).toFixed(2))} as typeof limits)}
                            className="w-8 h-8 rounded-md bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 font-bold"
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm text-white">安全限值修改提示</div>
                    <div className="text-xs text-white/60 mt-1">修改安全限值将影响全平台预警判定标准，请在核安全工程师指导下操作。修改后需经过审批方可生效。</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setLimits(initialLimits)}
                    className="px-4 py-2 rounded-lg font-medium text-sm text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                  >
                    恢复默认
                  </button>
                  <button className="glow-btn">
                    <Save className="w-4 h-4 mr-2" />
                    提交审批
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              {[
                {
                  key: 'warning' as const, label: '预警通知模板', desc: '安全预警触发时发送给相关人员',
                  icon: Bell, color: '#FF5252',
                },
                {
                  key: 'approval' as const, label: '审批通知模板', desc: '提交审批或审批流转时发送',
                  icon: CheckSquare, color: '#7C4DFF',
                },
                {
                  key: 'report' as const, label: '报告通知模板', desc: '分析报告生成完成时发送',
                  icon: FileText, color: '#00D4FF',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="glass-card p-6 relative overflow-hidden">
                    <div
                      className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-8"
                      style={{ backgroundColor: item.color + '15' }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: item.color + '20', border: `1px solid ${item.color}40` }}
                          >
                            <Icon className="w-6 h-6" style={{ color: item.color }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-white">{item.label}</h3>
                            <p className="text-sm text-white/50 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 rounded-md text-xs font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" />
                            恢复默认
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
                            style={{ backgroundColor: item.color + '15', color: item.color, border: `1px solid ${item.color}40` }}
                          >
                            <Save className="w-3.5 h-3.5" />
                            保存模板
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-white/50 mb-2 font-medium">可用变量占位符</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(item.key === 'warning'
                            ? ['{{warning_code}}', '{{trigger_time}}', '{{simulation_name}}', '{{warning_type}}', '{{severity}}', '{{actual_value}}', '{{limit_value}}', '{{channel_id}}']
                            : item.key === 'approval'
                              ? ['{{approval_code}}', '{{submit_time}}', '{{simulation_name}}', '{{approval_type}}', '{{submitter}}', '{{approver}}']
                              : ['{{report_code}}', '{{generate_time}}', '{{simulation_name}}', '{{generated_by}}', '{{version}}']
                          ).map((v) => (
                            <code key={v} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono border border-primary/20">
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>

                      <textarea
                        value={templates[item.key]}
                        onChange={(e) => setTemplates({ ...templates, [item.key]: e.target.value })}
                        rows={10}
                        className="w-full px-4 py-3 rounded-lg bg-secondary/60 border border-white/10 text-sm text-white font-mono leading-relaxed placeholder:text-white/30 focus:outline-none focus:border-primary/40 focus:bg-secondary/80 transition-all resize-none"
                        placeholder="请输入通知模板内容，可使用上述变量占位符..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div className="flex flex-1 items-center gap-3 flex-wrap">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="搜索用户、操作、IP地址..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <select
                      value={logResultFilter}
                      onChange={(e) => setLogResultFilter(e.target.value as 'all' | 'success' | 'failed' | 'rejected')}
                      className="pl-10 pr-8 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none cursor-pointer"
                    >
                      <option value="all" className="bg-secondary">全部结果</option>
                      <option value="success" className="bg-secondary">成功</option>
                      <option value="rejected" className="bg-secondary">驳回</option>
                      <option value="failed" className="bg-secondary">失败</option>
                    </select>
                  </div>
                </div>
                <button className="px-4 py-2.5 rounded-lg font-medium text-sm text-white/70 bg-white/10 border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  导出日志
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">序号</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">用户</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">操作内容</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">IP地址</th>
                      <th className="text-left py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">时间</th>
                      <th className="text-center py-3 px-4 text-white/70 font-medium text-xs uppercase tracking-wider">结果</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-4 text-white/40 font-mono text-xs">#{String(idx + 1).padStart(4, '0')}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                              log.user.includes('未知') ? 'bg-danger/40' : 'bg-gradient-to-br from-primary to-info'
                            }`}>
                              {log.user.slice(0, 1)}
                            </div>
                            <span className={`font-medium ${log.user.includes('未知') ? 'text-danger' : 'text-white'}`}>{log.user}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white/80">{log.action}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{log.ip}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-white/50">{log.time}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.result === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-success/15 text-success text-xs font-medium border border-success/30">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 成功
                            </span>
                          ) : log.result === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-warning/15 text-warning text-xs font-medium border border-warning/30">
                              <XCircle className="w-3.5 h-3.5" /> 驳回
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-danger/15 text-danger text-xs font-medium border border-danger/30">
                              <XCircle className="w-3.5 h-3.5" /> 失败
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-white/40">
                          <FileClock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                          <p>暂无符合条件的日志记录</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10 text-sm">
                <span className="text-white/50">共 <span className="text-white font-semibold">{filteredLogs.length}</span> 条日志</span>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1.5 rounded-md text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 text-xs">上一页</button>
                  <button className="px-3 py-1.5 rounded-md bg-primary/20 border border-primary/40 text-primary text-xs font-medium">1</button>
                  <button className="px-3 py-1.5 rounded-md text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 text-xs">2</button>
                  <button className="px-3 py-1.5 rounded-md text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 text-xs">3</button>
                  <button className="px-3 py-1.5 rounded-md text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 text-xs">下一页</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
