'use client';

import React, { useState } from 'react';
import { VideoIcon, PlusIcon, TrashIcon, EditIcon, CalendarIcon, CheckIcon } from '@/components/icons';
import { Script, VideoProductionTask, DigitalHuman } from '@/lib/types';
import { getScripts, getProductionTasks, addProductionTask, updateProductionTask, deleteProductionTask, generateId } from '@/lib/storage';

const DIGITAL_HUMANS: DigitalHuman[] = [
  { id: 'dh-1', name: '张老师', avatar: '张', provider: 'tencent', recommended: true },
  { id: 'dh-2', name: '李老师', avatar: '李', provider: 'tencent', recommended: false },
  { id: 'dh-3', name: '王老师', avatar: '王', provider: 'guiji', recommended: false },
  { id: 'dh-4', name: '赵老师', avatar: '赵', provider: 'shanjian', recommended: false },
];

const TOOL_RECOMMENDATIONS = [
  {
    name: '腾讯智影',
    url: 'https://zenvideo.qq.com',
    priority: 1,
    badge: '首选',
    color: '#3B82F6',
    desc: '数字人丰富，支持多种风格，操作简单',
    features: ['多款数字人可选', '背景模板丰富', '字幕自动生成', 'BGM库完善'],
  },
  {
    name: '硅基智能',
    url: 'https://www.guiji.ai',
    priority: 2,
    badge: '备选',
    color: '#8B5CF6',
    desc: '数字人逼真度高，适合高端内容',
    features: ['超写实数字人', '声音克隆', '多语言支持', 'API接口'],
  },
  {
    name: '闪剪',
    url: 'https://shanjian.tv',
    priority: 3,
    badge: '性价比',
    color: '#10B981',
    desc: '价格实惠，适合批量生产',
    features: ['基础数字人免费', '批量生产支持', '模板丰富', '导出便捷'],
  },
];

const BACKGROUND_TEMPLATES = [
  { id: 'bg-1', name: '商务简约', preview: '📊', category: '商务' },
  { id: 'bg-2', name: '科技蓝', preview: '💻', category: '科技' },
  { id: 'bg-3', name: '财税风格', preview: '📈', category: '财税' },
  { id: 'bg-4', name: '温馨家庭', preview: '🏠', category: '生活' },
  { id: 'bg-5', name: '专业讲台', preview: '🎓', category: '教育' },
  { id: 'bg-6', name: '现代办公室', preview: '🏢', category: '商务' },
];

const SUBTITLE_STYLES = [
  { id: 'sub-1', name: '思源黑体', font: 'Noto Sans SC', style: '白字黑边', position: '底部居中', effect: '逐字出现' },
  { id: 'sub-2', name: '苹方黑体', font: 'PingFang SC', style: '白字无边框', position: '底部居中', effect: '整句出现' },
  { id: 'sub-3', name: '微软雅黑', font: 'Microsoft YaHei', style: '黄字黑边', position: '底部偏上', effect: '逐字出现' },
  { id: 'sub-4', name: '思源宋体', font: 'Noto Serif SC', style: '白字金边', position: '底部居中', effect: '渐变出现' },
];

const BGM_OPTIONS = [
  { id: 'bgm-1', name: '轻商务风-温暖版', duration: '2:30', desc: '温暖治愈，适合财税科普' },
  { id: 'bgm-2', name: '轻商务风-专业版', duration: '2:30', desc: '沉稳专业，适合政策解读' },
  { id: 'bgm-3', name: '轻节奏-积极版', duration: '2:00', desc: '节奏明快，适合案例分析' },
  { id: 'bgm-4', name: '无BGM', duration: '-', desc: '纯口播，无背景音乐' },
];

const WORKFLOW_STEPS = [
  { id: 1, name: '粘贴脚本', icon: '📋', desc: '将灵犀生成的脚本粘贴到数字人口播框' },
  { id: 2, name: '选数字人', icon: '👤', desc: '从已克隆数字人中选择出镜形象' },
  { id: 3, name: '配字幕BGM', icon: '🎵', desc: '设置字幕样式和背景音乐' },
  { id: 4, name: '提交渲染', icon: '⏳', desc: '提交到平台进行AI渲染' },
  { id: 5, name: '人工审核', icon: '👀', desc: '检查数字人表现、口型、字幕' },
  { id: 6, name: '导出发布', icon: '🚀', desc: '导出视频并发布到各平台' },
];

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'bg-gray-500/20 text-gray-400', icon: '📝' },
  submitted: { label: '已提交', color: 'bg-blue-500/20 text-blue-400', icon: '⏳' },
  rendering: { label: '渲染中', color: 'bg-amber-500/20 text-amber-400', icon: '🎬' },
  review: { label: '审核中', color: 'bg-purple-500/20 text-purple-400', icon: '👀' },
  exported: { label: '已完成', color: 'bg-green-500/20 text-green-400', icon: '✅' },
};

export default function ProductionModule() {
  const scripts = getScripts();
  const [tasks, setTasks] = useState<VideoProductionTask[]>(() => getProductionTasks());
  const [selectedScriptId, setSelectedScriptId] = useState<string>('');
  const [selectedDigitalHuman, setSelectedDigitalHuman] = useState<string>(DIGITAL_HUMANS[0].id);
  const [selectedBackground, setSelectedBackground] = useState<string>(BACKGROUND_TEMPLATES[0].id);
  const [selectedSubtitleStyle, setSelectedSubtitleStyle] = useState<string>(SUBTITLE_STYLES[0].id);
  const [selectedBgm, setSelectedBgm] = useState<string>(BGM_OPTIONS[0].id);
  const [bgmVolume, setBgmVolume] = useState(30);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'tools' | 'templates'>('schedule');

  const selectedScript = scripts.find(s => s.id === selectedScriptId);
  const selectedBgmInfo = BGM_OPTIONS.find(b => b.id === selectedBgm);

  const handleCreateTask = () => {
    if (!selectedScriptId || !scheduledDate) return;

    const digitalHuman = DIGITAL_HUMANS.find(d => d.id === selectedDigitalHuman);
    const subtitleStyle = SUBTITLE_STYLES.find(s => s.id === selectedSubtitleStyle);
    const bgm = BGM_OPTIONS.find(b => b.id === selectedBgm);
    const script = scripts.find(s => s.id === selectedScriptId);

    const newTask: VideoProductionTask = {
      id: generateId(),
      scriptId: selectedScriptId,
      scriptTitle: script?.topicTitle || '',
      digitalHumanId: selectedDigitalHuman,
      digitalHumanName: digitalHuman?.name || '',
      digitalHumanProvider: digitalHuman?.provider || '',
      subtitleStyle: subtitleStyle?.name || '',
      bgmName: bgm?.name || '',
      bgmVolume,
      scheduledDate,
      scheduledTime,
      status: 'draft',
      notes,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => {
      const updated = [newTask, ...prev];
      addProductionTask(newTask);
      return updated;
    });

    // Reset form
    setSelectedScriptId('');
    setScheduledDate('');
    setScheduledTime('10:00');
    setNotes('');
  };

  const handleUpdateStatus = (taskId: string, newStatus: VideoProductionTask['status']) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      updateProductionTask(taskId, { status: newStatus });
      return updated;
    });
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      deleteProductionTask(taskId);
      return updated;
    });
  };

  const getCalendarDays = (date: string) => {
    const d = new Date(date || new Date());
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const days: { date: number | null; isToday: boolean; hasTask: boolean; taskId?: string }[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, isToday: false, hasTask: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const task = tasks.find(t => t.scheduledDate === dateStr);
      days.push({ 
        date: i, 
        isToday, 
        hasTask: !!task,
        taskId: task?.id
      });
    }
    
    return { year, month, days };
  };

  const { year, month, days } = getCalendarDays(scheduledDate || new Date().toISOString());

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        {/* Tab切换 */}
        <div className="bg-card border border-border rounded-xl p-4 animate-fade-in">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'schedule' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              生产排程
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'tools' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              推荐工具
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'templates' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              配置模板
            </button>
          </div>
        </div>

        {/* 生产排程表单 */}
        {activeTab === 'schedule' && (
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-module-purple/20 flex items-center justify-center">
                <VideoIcon className="module-purple" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">做视频</h2>
                <p className="text-sm text-muted-foreground">生产数字人视频</p>
              </div>
            </div>

            {/* 脚本选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">选择脚本</label>
              <select
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary input-glow transition-all"
              >
                <option value="">请选择脚本</option>
                {scripts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.topicTitle.slice(0, 25)}...
                  </option>
                ))}
              </select>
            </div>

            {/* 数字人选择 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">选择数字人</label>
              <div className="grid grid-cols-2 gap-2">
                {DIGITAL_HUMANS.map(dh => (
                  <button
                    key={dh.id}
                    onClick={() => setSelectedDigitalHuman(dh.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedDigitalHuman === dh.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                        dh.provider === 'tencent' ? 'bg-blue-500' : dh.provider === 'guiji' ? 'bg-purple-500' : 'bg-green-500'
                      }`}>
                        {dh.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{dh.name}</div>
                        {dh.recommended && (
                          <span className="text-[10px] text-primary">推荐</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 背景模板 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">背景模板</label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_TEMPLATES.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg.id)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedBackground === bg.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className="text-xl mb-1">{bg.preview}</div>
                    <div className="text-xs">{bg.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 字幕样式 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">字幕样式</label>
              <select
                value={selectedSubtitleStyle}
                onChange={(e) => setSelectedSubtitleStyle(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary input-glow transition-all"
              >
                {SUBTITLE_STYLES.map(ss => (
                  <option key={ss.id} value={ss.id}>
                    {ss.name} - {ss.style} - {ss.effect}
                  </option>
                ))}
              </select>
            </div>

            {/* BGM配置 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">BGM配置</label>
              <select
                value={selectedBgm}
                onChange={(e) => setSelectedBgm(e.target.value)}
                className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary input-glow transition-all mb-2"
              >
                {BGM_OPTIONS.map(bgm => (
                  <option key={bgm.id} value={bgm.id}>
                    {bgm.name}
                  </option>
                ))}
              </select>
              {selectedBgm !== 'bgm-4' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16">音量</span>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs text-muted-foreground w-12">-{bgmVolume}dB</span>
                </div>
              )}
              <div className="text-xs text-amber-400 mt-1">人声-6dB以下，避免喧宾夺主</div>
            </div>

            {/* 排程时间 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">排程时间</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="flex-1 h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary input-glow transition-all"
                />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-28 h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary input-glow transition-all"
                />
              </div>
            </div>

            {/* 备注 */}
            <div className="mb-4 flex-1">
              <label className="block text-sm font-medium mb-2">备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="添加生产备注..."
                className="w-full h-16 p-3 bg-background border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary input-glow transition-all"
              />
            </div>

            {/* 创建任务按钮 */}
            <button
              onClick={handleCreateTask}
              disabled={!selectedScriptId || !scheduledDate}
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <PlusIcon size={18} />
              创建生产任务
            </button>
          </div>
        )}

        {/* 推荐工具 */}
        {activeTab === 'tools' && (
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in flex-1">
            <h3 className="font-medium mb-4">推荐数字人工具</h3>
            <div className="space-y-4">
              {TOOL_RECOMMENDATIONS.map(tool => (
                <a
                  key={tool.name}
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${tool.color}20` }}
                    >
                      🎬
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.name}</span>
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${tool.color}20`, color: tool.color }}
                        >
                          {tool.badge}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tool.desc}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tool.features.map(f => (
                          <span key={f} className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {/* 制作流程 */}
            <h3 className="font-medium mt-6 mb-4">制作流程</h3>
            <div className="space-y-2">
              {WORKFLOW_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                    {step.id}
                  </div>
                  <div className="text-xl">{step.icon}</div>
                  <div>
                    <div className="text-sm font-medium">{step.name}</div>
                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className="ml-auto text-muted-foreground">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 配置模板 */}
        {activeTab === 'templates' && (
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in flex-1">
            {/* 字幕配置模板 */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">字幕配置模板</h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">字体：</span>
                    <span className="font-medium">思源黑体</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">样式：</span>
                    <span className="font-medium">白字黑边</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">位置：</span>
                    <span className="font-medium">底部居中</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">效果：</span>
                    <span className="font-medium text-primary">逐字出现</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-background rounded border border-border">
                  <div className="text-xs text-muted-foreground mb-1">预览效果</div>
                  <div className="text-center py-2">
                    <span className="text-lg font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      这里是字幕预览文字
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BGM配置模板 */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">BGM配置模板</h3>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">推荐BGM：</span>
                    <span className="font-medium">轻商务风</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">音量设置：</span>
                    <span className="font-medium text-amber-400">人声-6dB以下</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">风格要求：</span>
                    <span className="font-medium">温馨、沉稳、专业</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">版权建议：</span>
                    <span className="font-medium text-green-400">使用平台BGM库</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 制作标准 */}
            <div>
              <h3 className="font-medium mb-3">制作标准</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <CheckIcon size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span>视频分辨率：1920x1080（1080P）</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <CheckIcon size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span>帧率：30fps 或 60fps</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <CheckIcon size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span>字幕字号：36-48px，清晰可读</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <CheckIcon size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span>片头：3秒固定模板</span>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                  <CheckIcon size={16} className="text-green-500 shrink-0 mt-0.5" />
                  <span>片尾：关注引导 + 联系方式</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 排程日历 */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <CalendarIcon size={18} />
              {year}年{month + 1}月生产排程
            </h3>
            <span className="text-sm text-muted-foreground">
              {tasks.length} 个任务
            </span>
          </div>
          
          {/* 日历头部 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          
          {/* 日历网格 */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => (
              <div
                key={idx}
                className={`h-12 rounded-lg border flex flex-col items-center justify-center text-sm transition-all ${
                  day.date === null 
                    ? 'border-transparent' 
                    : day.isToday 
                      ? 'border-primary bg-primary/10' 
                      : day.hasTask 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-border hover:border-primary/30'
                }`}
              >
                {day.date && (
                  <>
                    <span className={day.isToday ? 'text-primary font-medium' : ''}>
                      {day.date}
                    </span>
                    {day.hasTask && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 任务列表 */}
        <div className="flex-1 bg-card border border-border rounded-xl p-5 overflow-hidden flex flex-col">
          <h4 className="font-medium mb-4">生产任务列表</h4>
          
          {tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <VideoIcon size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无生产任务</p>
                <p className="text-sm mt-1">创建任务后将显示在这里</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {tasks.map(task => {
                const statusInfo = STATUS_CONFIG[task.status];
                return (
                  <div
                    key={task.id}
                    className="p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{task.scriptTitle}</div>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="tag">数字人: {task.digitalHumanName}</span>
                          <span className="tag">{selectedBackground}</span>
                          <span className="tag">{task.subtitleStyle}</span>
                          <span className="tag">{task.bgmName}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{task.scheduledDate} {task.scheduledTime}</span>
                          {task.notes && <span className="text-amber-400/70">备注: {task.notes}</span>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-2 py-1 rounded text-xs ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* 状态操作 */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'submitted')}
                        className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 transition-colors"
                        disabled={task.status !== 'draft'}
                      >
                        提交渲染
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'review')}
                        className="text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 transition-colors"
                        disabled={task.status !== 'rendering'}
                      >
                        开始审核
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(task.id, 'exported')}
                        className="text-xs px-3 py-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 transition-colors"
                        disabled={task.status !== 'review'}
                      >
                        完成导出
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon size={14} className="text-red-500/70" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
