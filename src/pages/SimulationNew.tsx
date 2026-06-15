import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  FileArchive,
  FileSpreadsheet,
  X,
  Thermometer,
  Gauge,
  Waves,
  Grid3X3,
  Hexagon,
  Square,
  Layers,
  Wind,
  Flame,
  Info,
  Sparkles,
  FileText,
  Box,
  Send,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const STEPS = [
  { id: 1, title: '基础信息', desc: '任务与构型' },
  { id: 2, title: '文件上传', desc: '几何与功率分布' },
  { id: 3, title: '入口参数', desc: '温度压力流量' },
  { id: 4, title: '物理模型', desc: '网格与湍流' },
];

const REACTOR_TYPES = [
  { id: 'cap1400', name: 'CAP1400', desc: '国和一号压水堆' },
  { id: 'hpr1000', name: 'HPR1000', desc: '华龙一号压水堆' },
  { id: 'ap1000', name: 'AP1000', desc: '西屋先进压水堆' },
  { id: 'epr', name: 'EPR', desc: '欧洲压水堆' },
  { id: 'candu6', name: 'CANDU-6', desc: '重水堆' },
  { id: 'htgr', name: 'HTGR', desc: '高温气冷堆' },
];

const TURBULENCE_MODELS = [
  { value: 'k-epsilon', label: 'k-ε模型', desc: '标准高雷诺数适用' },
  { value: 'k-omega', label: 'k-ω模型', desc: '近壁区精度高' },
  { value: 'SST', label: 'SST模型', desc: '剪切应力输运' },
];

const BOILING_MODELS = [
  { value: 'DNB', label: 'DNB', desc: '偏离泡核沸腾' },
  { value: 'CHF', label: 'CHF', desc: '临界热流密度' },
];

const MESH_DENSITIES = [
  { value: 250, label: '粗糙', desc: '节点少,计算快' },
  { value: 500, label: '标准', desc: '平衡精度与速度' },
  { value: 1000, label: '精细', desc: '精度高,计算慢' },
];

interface UploadedFile {
  name: string;
  size: number;
  progress: number;
  uploadTime?: number;
}

interface FormData {
  taskName: string;
  configName: string;
  description: string;
  reactorType: string;
  geometryFile: UploadedFile | null;
  powerFile: UploadedFile | null;
  inletTemp: number;
  inletPressure: number;
  inletFlow: number;
  meshType: 'hexagonal' | 'rectangular';
  meshDensity: number;
  turbulence: string;
  boiling: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function SimulationNew() {
  const navigate = useNavigate();
  const { createSimulation, currentUser, configRisks } = useAppStore();
  const [suspendedConfigWarning, setSuspendedConfigWarning] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    taskName: '',
    configName: '',
    description: '',
    reactorType: '',
    geometryFile: null,
    powerFile: null,
    inletTemp: 292,
    inletPressure: 15.5,
    inletFlow: 18000,
    meshType: 'hexagonal',
    meshDensity: 500,
    turbulence: 'k-epsilon',
    boiling: 'CHF',
  });

  const geoInputRef = useRef<HTMLInputElement>(null);
  const powerInputRef = useRef<HTMLInputElement>(null);
  const [dragType, setDragType] = useState<'geometry' | 'power' | null>(null);

  const simulateProgress = useCallback(
    (type: 'geometry' | 'power', file: File) => {
      const key: 'geometryFile' | 'powerFile' = type === 'geometry' ? 'geometryFile' : 'powerFile';
      setFormData((p) => ({
        ...p,
        [key]: { name: file.name, size: file.size, progress: 0 },
      }));
      let prog = 0;
      const iv = setInterval(() => {
        prog += Math.random() * 20 + 8;
        if (prog >= 100) {
          prog = 100;
          clearInterval(iv);
          setFormData((p) => ({
            ...p,
            [key]: p[key] ? { ...p[key]!, progress: 100, uploadTime: Date.now() } : p[key],
          }));
        } else {
          setFormData((p) => ({
            ...p,
            [key]: p[key] ? { ...p[key]!, progress: Math.round(prog) } : p[key],
          }));
        }
      }, 180);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'geometry' | 'power') => {
      e.preventDefault();
      setDragType(null);
      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (type === 'geometry') {
        if (!/\.(step|stp|stl)$/i.test(file.name)) {
          setErrors((p) => ({ ...p, geometryFile: '仅支持 STEP / STL 格式' }));
          return;
        }
      } else {
        if (!/\.(csv)$/i.test(file.name)) {
          setErrors((p) => ({ ...p, powerFile: '仅支持 CSV 格式' }));
          return;
        }
      }
      setErrors((p) => {
        const ne = { ...p };
        delete ne[type === 'geometry' ? 'geometryFile' : 'powerFile'];
        return ne;
      });
      simulateProgress(type, file);
    },
    [simulateProgress]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'geometry' | 'power') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (type === 'geometry') {
      if (!/\.(step|stp|stl)$/i.test(file.name)) {
        setErrors((p) => ({ ...p, geometryFile: '仅支持 STEP / STL 格式' }));
        return;
      }
    } else {
      if (!/\.(csv)$/i.test(file.name)) {
        setErrors((p) => ({ ...p, powerFile: '仅支持 CSV 格式' }));
        return;
      }
    }
    simulateProgress(type, file);
  };

  const removeFile = (type: 'geometry' | 'power') => {
    const key: 'geometryFile' | 'powerFile' = type === 'geometry' ? 'geometryFile' : 'powerFile';
    setFormData((p) => ({ ...p, [key]: null }));
  };

  useEffect(() => {
    if (formData.configName.trim()) {
      const suspended = configRisks.find(
        (r) => r.name === formData.configName.trim() && r.status === 'suspended'
      );
      if (suspended) {
        setSuspendedConfigWarning(
          `构型「${suspended.name}」已因连续${suspended.exceedCount}次燃料温度超限被暂停使用，${suspended.suspendReason ?? ''}`
        );
      } else {
        setSuspendedConfigWarning(null);
      }
    } else {
      setSuspendedConfigWarning(null);
    }
  }, [formData.configName, configRisks]);

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.taskName.trim()) e.taskName = '请输入任务名称';
      if (!formData.configName.trim()) e.configName = '请输入构型名称';
      if (!formData.reactorType) e.reactorType = '请选择反应堆类型';
      const suspended = configRisks.find(
        (r) => r.name === formData.configName.trim() && r.status === 'suspended'
      );
      if (suspended) {
        e.configName = `该构型已被暂停，无法创建新任务`;
      }
    }
    if (step === 2) {
      if (!formData.geometryFile || formData.geometryFile.progress < 100) {
        e.geometryFile = '请上传几何模型文件';
      }
      if (!formData.powerFile || formData.powerFile.progress < 100) {
        e.powerFile = '请上传轴向功率分布文件';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((s) => Math.min(4, s + 1));
  };

  const goPrev = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
    setErrors({});
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const newSim = createSimulation({
        name: formData.taskName,
        configurationHash: 'cfg-' + formData.reactorType + '-' + Math.random().toString(36).slice(2, 8),
        configurationName: formData.configName,
        gridType: formData.meshType === 'hexagonal' ? 'structured_hex' : 'structured_rect',
        turbulenceModel: formData.turbulence,
        boilingModel: formData.boiling,
        inletTemp: formData.inletTemp + 273.15,
        inletPressure: formData.inletPressure,
        inletFlowRate: formData.inletFlow,
        channelCount: formData.meshType === 'hexagonal' ? 193 : 157,
      });
      useAppStore.getState().updateDailyStats(new Date().toISOString().split('T')[0], {});
      setIsSubmitting(false);
      navigate(`/simulations/${newSim.id}`);
    }, 1200);
  };

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setFormData((p) => ({ ...p, [k]: v }));
    setErrors((e) => {
      if (e[k as string]) {
        const ne = { ...e };
        delete ne[k as string];
        return ne;
      }
      return e;
    });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const DragZone = ({
    type,
    title,
    subTitle,
    icon: Icon,
    accept,
  }: {
    type: 'geometry' | 'power';
    title: string;
    subTitle: string;
    icon: typeof FileArchive;
    accept: string;
  }) => {
    const data = type === 'geometry' ? formData.geometryFile : formData.powerFile;
    const err = errors[type === 'geometry' ? 'geometryFile' : 'powerFile'];
    const ref = type === 'geometry' ? geoInputRef : powerInputRef;
    const isDrag = dragType === type;
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-sm font-bold text-white/90">{title}</h3>
            <p className="text-xs text-white/50 mt-0.5">{subTitle}</p>
          </div>
          <Icon size={18} className="text-primary/70" />
        </div>
        {data ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white/90 truncate">{data.name}</div>
                  <div className="text-xs text-white/50">{formatSize(data.size)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.progress === 100 ? (
                  <span className="status-badge status-badge-success">
                    <Check size={10} />
                    上传完成
                  </span>
                ) : (
                  <span className="text-xs font-mono text-primary">{data.progress}%</span>
                )}
                <button
                  onClick={() => removeFile(type)}
                  className="p-1.5 rounded text-white/50 hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-info rounded-full transition-all duration-300"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragType(type);
            }}
            onDragLeave={() => setDragType(null)}
            onDrop={(e) => handleDrop(e, type)}
            onClick={() => ref.current?.click()}
            className={`relative min-h-[140px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDrag
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : err
                ? 'border-danger/50 bg-danger/5'
                : 'border-white/20 bg-white/3 hover:border-primary/50 hover:bg-white/5'
            }`}
          >
            <input
              ref={ref}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleFileChange(e, type)}
            />
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isDrag ? 'bg-primary/20 animate-pulse' : 'bg-white/5'
              }`}
            >
              <Upload size={22} className={isDrag ? 'text-primary' : 'text-white/50'} />
            </div>
            <div className="text-center px-4">
              <p className="text-sm text-white/80">
                拖拽文件到此处，或
                <span className="text-primary mx-1 underline">点击选择</span>
              </p>
              <p className="text-xs text-white/40 mt-1">支持 {accept.toUpperCase()} 格式</p>
            </div>
            {err && (
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1 text-xs text-danger">
                  <AlertCircle size={12} />
                  {err}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const SliderField = ({
    label,
    icon: Icon,
    value,
    min,
    max,
    step,
    unit,
    onChange,
    color,
  }: {
    label: string;
    icon: typeof Thermometer;
    value: number;
    min: number;
    max: number;
    step: number;
    unit: string;
    onChange: (v: number) => void;
    color: 'primary' | 'warning' | 'info';
  }) => (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${
            color === 'primary' ? 'bg-primary/10 border-primary/30 text-primary' :
            color === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
            'bg-info/10 border-info/30 text-info'
          }`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-white/90">{label}</h3>
            <p className="text-xs text-white/50 mt-0.5">
              范围 {min} ~ {max} {unit}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-display font-bold ${
            color === 'primary' ? 'text-primary' :
            color === 'warning' ? 'text-warning' :
            'text-info'
          }`}>
            {value.toFixed(step < 1 ? 1 : 0)}
          </div>
          <div className="text-xs text-white/40 font-mono">{unit}</div>
        </div>
      </div>
      <div className="space-y-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-custom"
        />
        <div className="flex justify-between text-xs font-mono text-white/40">
          <span>{min}</span>
          <span>{((min + max) / 2).toFixed(step < 1 ? 1 : 0)}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">创建模拟任务</h1>
            <p className="mt-2 text-sm text-white/60">模型上传、参数配置、网格设置</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-xs font-display font-bold text-white">
              {currentUser.username.slice(0, 1)}
            </div>
            <span className="text-sm text-white/80">{currentUser.username}</span>
          </div>
        </div>

        <div className="mt-8 relative">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-primary to-info transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {STEPS.map((s) => {
              const isDone = currentStep > s.id;
              const isActive = currentStep === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center w-1/4">
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm z-10 transition-all duration-300 ${
                      isDone
                        ? 'bg-success/20 border border-success/50 text-success shadow-[0_0_15px_rgba(0,200,83,0.3)]'
                        : isActive
                        ? 'bg-primary/20 border border-primary text-primary animate-pulse-glow'
                        : 'bg-white/5 border border-white/20 text-white/40'
                    }`}
                  >
                    {isDone ? <Check size={18} /> : s.id}
                  </div>
                  <div className="mt-3 text-center">
                    <div
                      className={`font-display text-xs font-bold uppercase tracking-wider ${
                        isActive ? 'text-primary glow-text' : isDone ? 'text-success' : 'text-white/50'
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 1 && (
            <>
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  基础信息
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-2 text-xs font-display uppercase tracking-wider text-white/60">
                      任务名称 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.taskName}
                      onChange={(e) => update('taskName', e.target.value)}
                      placeholder="例如: CAP1400-LOCA基准工况-01"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-sm text-white placeholder-white/40 outline-none focus:bg-white/10 transition-all ${
                        errors.taskName ? 'border-danger/50 focus:border-danger' : 'border-white/10 focus:border-primary/60'
                      }`}
                    />
                    {errors.taskName && (
                      <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.taskName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block mb-2 text-xs font-display uppercase tracking-wider text-white/60">
                      构型名称 <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.configName}
                      onChange={(e) => update('configName', e.target.value)}
                      placeholder="例如: CAP1400标准堆芯"
                      className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-sm text-white placeholder-white/40 outline-none focus:bg-white/10 transition-all ${
                        errors.configName ? 'border-danger/50 focus:border-danger' : 'border-white/10 focus:border-primary/60'
                      }`}
                    />
                    {errors.configName && (
                      <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.configName}
                      </p>
                    )}
                    {suspendedConfigWarning && (
                      <div className="mt-3 p-4 rounded-lg bg-danger/10 border border-danger/40">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                          <div className="text-xs text-white/80 space-y-1">
                            <p className="font-bold text-danger">构型已被暂停使用</p>
                            <p>{suspendedConfigWarning}</p>
                            <p className="text-white/50 mt-2">如需继续使用该构型，请联系首席核安全工程师申请恢复。</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-xs font-display uppercase tracking-wider text-white/60">
                      任务描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => update('description', e.target.value)}
                      rows={3}
                      placeholder="简要说明本次模拟的目的、工况条件、分析重点等..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-primary/60 focus:bg-white/10 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
                  <Box size={18} className="text-primary" />
                  反应堆类型 <span className="text-danger">*</span>
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {REACTOR_TYPES.map((r) => {
                    const active = formData.reactorType === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => update('reactorType', r.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-primary/15 border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                            : errors.reactorType
                            ? 'bg-white/3 border-danger/30 hover:border-danger/50'
                            : 'bg-white/3 border-white/10 hover:border-primary/30 hover:bg-white/5'
                        }`}
                      >
                        <div className={`font-display font-bold text-sm ${active ? 'text-primary' : 'text-white/80'}`}>
                          {r.name}
                        </div>
                        <div className="text-xs text-white/50 mt-1">{r.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {errors.reactorType && (
                  <p className="mt-4 text-xs text-danger flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.reactorType}
                  </p>
                )}
              </div>
            </>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-1 gap-5">
              <DragZone
                type="geometry"
                title="几何模型文件"
                subTitle="堆芯组件几何形状定义"
                icon={FileArchive}
                accept=".step,.stp,.stl"
              />
              <DragZone
                type="power"
                title="轴向功率分布"
                subTitle="沿高度方向的功率分布数据"
                icon={FileSpreadsheet}
                accept=".csv"
              />
              <div className="glass-card p-4 flex items-start gap-3 bg-info/5 border-info/20">
                <Info size={18} className="text-info shrink-0 mt-0.5" />
                <div className="text-xs text-white/70 space-y-1">
                  <p><span className="font-bold text-info">几何模型:</span> STEP / STP 为参数化几何，STL 为三角面片模型</p>
                  <p><span className="font-bold text-info">功率分布:</span> CSV 文件应包含两列：高度(m)、相对功率(归一化)</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <SliderField
                label="入口温度"
                icon={Thermometer}
                value={formData.inletTemp}
                min={250}
                max={350}
                step={1}
                unit="°C"
                color="warning"
                onChange={(v) => update('inletTemp', v)}
              />
              <SliderField
                label="入口压力"
                icon={Gauge}
                value={formData.inletPressure}
                min={10}
                max={20}
                step={0.1}
                unit="MPa"
                color="info"
                onChange={(v) => update('inletPressure', v)}
              />
              <SliderField
                label="入口流量"
                icon={Waves}
                value={formData.inletFlow}
                min={5000}
                max={30000}
                step={100}
                unit="kg/s"
                color="primary"
                onChange={(v) => update('inletFlow', v)}
              />
              <div className="glass-card p-4 flex items-start gap-3 bg-success/5 border-success/20">
                <Info size={18} className="text-success shrink-0 mt-0.5" />
                <div className="text-xs text-white/70 space-y-1">
                  <p><span className="font-bold text-success">设计参考值:</span> PWR 典型工况 ~ 292°C / 15.5 MPa / 18000 kg/s</p>
                  <p>参数将被保存并用于后续热工水力计算边界条件</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
                  <Grid3X3 size={18} className="text-primary" />
                  网格配置
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block mb-3 text-xs font-display uppercase tracking-wider text-white/60">
                      网格类型
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => update('meshType', 'hexagonal')}
                        className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                          formData.meshType === 'hexagonal'
                            ? 'bg-primary/15 border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                            : 'bg-white/3 border-white/10 hover:border-primary/30 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.meshType === 'hexagonal' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'
                          }`}>
                            <Hexagon size={20} />
                          </div>
                          <div className={`font-display font-bold ${
                            formData.meshType === 'hexagonal' ? 'text-primary' : 'text-white/80'
                          }`}>六边形子通道</div>
                        </div>
                        <p className="text-xs text-white/50 text-left">
                          适用于三角形栅距燃料组件，精度较高
                        </p>
                      </button>
                      <button
                        onClick={() => update('meshType', 'rectangular')}
                        className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                          formData.meshType === 'rectangular'
                            ? 'bg-primary/15 border-primary/50 shadow-[0_0_20px_rgba(0,212,255,0.15)]'
                            : 'bg-white/3 border-white/10 hover:border-primary/30 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            formData.meshType === 'rectangular' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'
                          }`}>
                            <Square size={20} />
                          </div>
                          <div className={`font-display font-bold ${
                            formData.meshType === 'rectangular' ? 'text-primary' : 'text-white/80'
                          }`}>矩形子通道</div>
                        </div>
                        <p className="text-xs text-white/50 text-left">
                          适用于正方形栅距组件，计算效率高
                        </p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-3 text-xs font-display uppercase tracking-wider text-white/60">
                      网格密度
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {MESH_DENSITIES.map((m) => {
                        const active = formData.meshDensity === m.value;
                        return (
                          <button
                            key={m.value}
                            onClick={() => update('meshDensity', m.value)}
                            className={`p-3 rounded-xl border transition-all ${
                              active
                                ? 'bg-primary/15 border-primary/50'
                                : 'bg-white/3 border-white/10 hover:border-primary/30 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-1.5">
                              <Layers size={14} className={active ? 'text-primary' : 'text-white/50'} />
                              <span className={`font-display font-bold text-sm ${active ? 'text-primary' : 'text-white/80'}`}>
                                {m.label}
                              </span>
                            </div>
                            <div className="text-xs text-white/50">{m.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
                  <Wind size={18} className="text-primary" />
                  湍流与传热模型
                </h2>
                <div className="space-y-5">
                  <div>
                    <label className="block mb-2 text-xs font-display uppercase tracking-wider text-white/60">
                      湍流模型
                    </label>
                    <select
                      value={formData.turbulence}
                      onChange={(e) => update('turbulence', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/60 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                    >
                      {TURBULENCE_MODELS.map((t) => (
                        <option key={t.value} value={t.value} className="bg-secondary">
                          {t.label} — {t.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-xs font-display uppercase tracking-wider text-white/60">
                      <Flame size={12} className="inline mr-1 -translate-y-0.5" />
                      沸腾传热关联式
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {BOILING_MODELS.map((b) => {
                        const active = formData.boiling === b.value;
                        return (
                          <button
                            key={b.value}
                            onClick={() => update('boiling', b.value)}
                            className={`p-4 rounded-xl border transition-all text-left ${
                              active
                                ? 'bg-primary/15 border-primary/50'
                                : 'bg-white/3 border-white/10 hover:border-primary/30 hover:bg-white/5'
                            }`}
                          >
                            <div className={`font-display font-bold text-sm mb-1 ${active ? 'text-primary' : 'text-white/80'}`}>
                              {b.label}
                            </div>
                            <div className="text-xs text-white/50">{b.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button
              onClick={goPrev}
              disabled={currentStep === 1}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-display text-sm"
            >
              <ArrowLeft size={16} />
              上一步
            </button>
            <div className="text-xs text-white/50 font-display">
              步骤 {currentStep} / 4
            </div>
            {currentStep < 4 ? (
              <button
                onClick={goNext}
                className="glow-btn"
              >
                下一步
                <ArrowRight size={16} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="glow-btn disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    提交并创建任务
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-6">
            <h2 className="font-display text-lg font-bold text-white/90 mb-5 flex items-center gap-2">
              <Eye size={18} className="text-primary" />
              配置预览
            </h2>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-xs font-display uppercase tracking-wider text-white/50">
                  <FileText size={12} />
                  基础信息
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">任务名称</span>
                    <span className="text-white/90 text-right truncate ml-2 max-w-[55%]" title={formData.taskName || '未设置'}>
                      {formData.taskName || <span className="text-white/30">未设置</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">构型名称</span>
                    <span className="text-white/90 text-right truncate ml-2 max-w-[55%]">
                      {formData.configName || <span className="text-white/30">未设置</span>}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">反应堆</span>
                    <span className="text-primary font-mono text-xs">
                      {REACTOR_TYPES.find((r) => r.id === formData.reactorType)?.name || '未选择'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-xs font-display uppercase tracking-wider text-white/50">
                  <Upload size={12} />
                  文件上传
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileArchive size={14} className={formData.geometryFile?.progress === 100 ? 'text-success' : 'text-white/30'} />
                    <span className={formData.geometryFile?.progress === 100 ? 'text-white/80' : 'text-white/30'}>
                      几何模型
                    </span>
                    {formData.geometryFile?.progress === 100 ? (
                      <Check size={12} className="text-success ml-auto" />
                    ) : (
                      <span className="text-xs text-white/30 ml-auto">待上传</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet size={14} className={formData.powerFile?.progress === 100 ? 'text-success' : 'text-white/30'} />
                    <span className={formData.powerFile?.progress === 100 ? 'text-white/80' : 'text-white/30'}>
                      功率分布
                    </span>
                    {formData.powerFile?.progress === 100 ? (
                      <Check size={12} className="text-success ml-auto" />
                    ) : (
                      <span className="text-xs text-white/30 ml-auto">待上传</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-xs font-display uppercase tracking-wider text-white/50">
                  <Thermometer size={12} />
                  入口参数
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">入口温度</span>
                    <span className="font-mono text-warning">{formData.inletTemp}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">入口压力</span>
                    <span className="font-mono text-info">{formData.inletPressure.toFixed(1)} MPa</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">入口流量</span>
                    <span className="font-mono text-primary">{formData.inletFlow.toLocaleString()} kg/s</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2 text-xs font-display uppercase tracking-wider text-white/50">
                  <Layers size={12} />
                  物理模型
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">网格类型</span>
                    <span className="text-white/90 text-xs">
                      {formData.meshType === 'hexagonal' ? '六边形子通道' : '矩形子通道'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">网格密度</span>
                    <span className="text-white/90 text-xs">
                      {MESH_DENSITIES.find((m) => m.value === formData.meshDensity)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">湍流模型</span>
                    <span className="text-white/90 text-xs font-mono">{formData.turbulence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">沸腾关联式</span>
                    <span className="text-white/90 text-xs font-mono">{formData.boiling}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display uppercase tracking-wider text-white/50">
                    配置完成度
                  </span>
                  <span className="text-sm font-mono font-bold text-primary">
                    {Math.round(
                      ((formData.taskName ? 1 : 0) +
                        (formData.configName ? 1 : 0) +
                        (formData.reactorType ? 1 : 0) +
                        (formData.geometryFile?.progress === 100 ? 1 : 0) +
                        (formData.powerFile?.progress === 100 ? 1 : 0)) *
                        100 /
                        5
                    )}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary via-info to-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        ((formData.taskName ? 1 : 0) +
                          (formData.configName ? 1 : 0) +
                          (formData.reactorType ? 1 : 0) +
                          (formData.geometryFile?.progress === 100 ? 1 : 0) +
                          (formData.powerFile?.progress === 100 ? 1 : 0)) *
                        100 /
                        5
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
