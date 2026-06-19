'use client';

import React, { useState } from 'react';
import { 
  VideoIcon, PlayIcon, MusicIcon, LayersIcon, CalendarIcon,
  PlusIcon, TrashIcon, CheckIcon, EditIcon, GridIcon
} from '@/components/icons';
import { Script, VideoProductionTask, DigitalHuman } from '@/lib/types';
import { getScripts, getProductionTasks, addProductionTask, updateProductionTask, deleteProductionTask, generateId } from '@/lib/storage';

const DIGITAL_HUMANS: DigitalHuman[] = [
  { id: 'dh-1', name: '小王老师', avatar: '👨‍🏫' },
  { id: 'dh-2', name: '李财务', avatar: '👩‍💼' },
  { id: 'dh-3', name: '张老师', avatar: '👨‍💻' },
];

const BACKGROUNDS = [
  { id: 'bg-1', name: '商务蓝', color: 'from-blue-900 to-blue-800' },
  { id: 'bg-2', name: '简约灰', color: 'from-slate-800 to-slate-700' },
  { id: 'bg-3', name: '科技紫', color: 'from-purple-900 to-purple-800' },
  { id: 'bg-4', name: '温暖橙', color: 'from-amber-800 to-amber-700' },
  { id: 'bg-5', name: '清新绿', color: 'from-emerald-800 to-emerald-700' },
  { id: 'bg-6', name: '经典黑', color: 'from-gray-900 to-gray-800' },
];

const SUBTITLE_STYLES = [
  { id: 'style-1', name: '白底黑字', preview: 'bg-white text-black' },
  { id: 'style-2', name: '黑底白字', preview: 'bg-black text-white' },
  { id: 'style-3', name: '渐变边框', preview: 'bg-gradient-to-r from-primary to-purple-600' },
  { id: 'style-4', name: '透明背景', preview: 'bg-black/50 backdrop-blur' },
];

const BGM_OPTIONS = [
  { id: 'bgm-1', name: '商务轻音乐', duration: '3:00' },
  { id: 'bgm-2', name: '励志背景乐', duration: '2:30' },
  { id: 'bgm-3', name: '科技感配乐', duration: '2:00' },
  { id: 'bgm-4', name: '温暖舒缓', duration: '3:30' },
  { id: 'bgm-5', name: '无背景音乐', duration: '-' },
];

export default function ProductionModule() {
  const [scripts] = useState<Script[]>(() => getScripts());
  const [tasks, setTasks] = useState<VideoProductionTask[]>(() => getProductionTasks());
  const [selectedScript, setSelectedScript] = useState('');
  const [selectedHuman, setSelectedHuman] = useState('dh-1');
  const [selectedBg, setSelectedBg] = useState('bg-1');
  const [selectedSubtitle, setSelectedSubtitle] = useState('style-1');
  const [selectedBgm, setSelectedBgm] = useState('bgm-1');
  const [bgmVolume, setBgmVolume] = useState(30);
  const [scheduledDate, setScheduledDate] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'tasks'>('schedule');

  const handleAddTask = () => {
    if (!selectedScript || !scheduledDate) return;
    
    const script = scripts.find(s => s.id === selectedScript);
    if (!script) return;
    
    const human = DIGITAL_HUMANS.find(h => h.id === selectedHuman);
    
    const newTask: VideoProductionTask = {
      id: generateId(),
      scriptId: selectedScript,
      scriptTitle: script.topicTitle,
      digitalHumanId: selectedHuman,
      digitalHumanName: human?.name || '',
      background: selectedBg,
      subtitleStyle: selectedSubtitle,
      bgm: selectedBgm,
      bgmVolume,
      scheduledDate,
      status: 'pending',
    };
    
    const updated = [newTask, ...tasks];
    setTasks(updated);
    addProductionTask(newTask);
    
    // Reset form
    setSelectedScript('');
    setScheduledDate('');
  };

  const handleStatusChange = (id: string, status: VideoProductionTask['status']) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(updated);
    updateProductionTask(id, { status });
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    deleteProductionTask(id);
  };

  const getBackgroundStyle = (bgId: string) => {
    const bg = BACKGROUNDS.find(b => b.id === bgId);
    return bg ? `bg-gradient-to-br ${bg.color}` : 'bg-gradient-to-br from-gray-900 to-gray-800';
  };

  const getSubtitleStyle = (styleId: string) => {
    const style = SUBTITLE_STYLES.find(s => s.id === styleId);
    return style?.preview || 'bg-white text-black';
  };

  // Group tasks by date
  const groupedTasks = tasks.reduce((acc, task) => {
    const date = task.scheduledDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {} as Record<string, VideoProductionTask[]>);

  const sortedDates = Object.keys(groupedTasks).sort();

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-module-purple/20 flex items-center justify-center">
              <VideoIcon className="module-purple" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">视频生产</h2>
              <p className="text-sm text-muted-foreground">小丽 · 智造精彩</p>
            </div>
          </div>

          {/* 数字人选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">选择数字人</label>
            <div className="space-y-2">
              {DIGITAL_HUMANS.map(human => (
                <button
                  key={human.id}
                  onClick={() => setSelectedHuman(human.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all btn-press flex items-center gap-3 ${
                    selectedHuman === human.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span className="text-2xl">{human.avatar}</span>
                  <div>
                    <span className={`block text-sm font-medium ${
                      selectedHuman === human.id ? 'text-primary' : ''
                    }`}>
                      {human.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">数字人克隆</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              数字人克隆需联系客服进行定制
            </p>
          </div>

          {/* 脚本选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">选择脚本</label>
            <select
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all appearance-none cursor-pointer"
            >
              <option value="">从脚本库选择...</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.topicTitle}</option>
              ))}
            </select>
          </div>

          {/* 背景模板 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">背景模板</label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg.id)}
                  className={`aspect-video rounded-lg ${getBackgroundStyle(bg.id)} transition-all flex items-end justify-center pb-1 ${
                    selectedBg === bg.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                >
                  <span className="text-[10px] text-white/80">{bg.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 字幕样式 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">字幕样式</label>
            <div className="grid grid-cols-2 gap-2">
              {SUBTITLE_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => setSelectedSubtitle(style.id)}
                  className={`p-3 rounded-lg border text-center transition-all btn-press ${
                    selectedSubtitle === style.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className={`w-full h-6 rounded ${getSubtitleStyle(style.id)} mb-1`} />
                  <span className="text-xs">{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BGM配置 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">背景音乐</label>
            <select
              value={selectedBgm}
              onChange={(e) => setSelectedBgm(e.target.value)}
              className="w-full h-11 px-4 mb-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all appearance-none cursor-pointer"
            >
              {BGM_OPTIONS.map(bgm => (
                <option key={bgm.id} value={bgm.id}>{bgm.name} ({bgm.duration})</option>
              ))}
            </select>
            {selectedBgm !== 'bgm-5' && (
              <div className="flex items-center gap-3">
                <MusicIcon size={16} className="text-muted-foreground" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="w-10 text-sm text-muted-foreground text-right">{bgmVolume}%</span>
              </div>
            )}
          </div>

          {/* 排程日期 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">排程日期</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all"
            />
          </div>

          {/* 添加按钮 */}
          <button
            onClick={handleAddTask}
            disabled={!selectedScript || !scheduledDate}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <PlusIcon size={18} />
            <span>添加到生产排程</span>
          </button>
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* Tab切换 */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'schedule'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarIcon size={16} />
              生产排程
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'tasks'
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayersIcon size={16} />
              任务列表
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'schedule' ? (
              // 日历视图
              tasks.length === 0 ? (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  <div className="text-center">
                    <CalendarIcon size={48} className="mx-auto mb-3 opacity-30" />
                    <p>暂无排程任务</p>
                    <p className="text-sm mt-1">添加任务后将显示在这里</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                  {sortedDates.map(date => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon size={16} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{date}</span>
                        <span className="text-xs text-muted-foreground">({groupedTasks[date].length}个)</span>
                      </div>
                      <div className="space-y-2">
                        {groupedTasks[date].map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // 任务列表视图
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <div className="text-center">
                      <LayersIcon size={48} className="mx-auto mb-3 opacity-30" />
                      <p>暂无生产任务</p>
                      <p className="text-sm mt-1">添加任务后将显示在这里</p>
                    </div>
                  </div>
                ) : (
                  tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDeleteTask}
                      expanded
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  onDelete,
  expanded = false,
}: {
  task: VideoProductionTask;
  onStatusChange: (id: string, status: VideoProductionTask['status']) => void;
  onDelete: (id: string) => void;
  expanded?: boolean;
}) {
  const statusColors = {
    pending: 'bg-muted text-muted-foreground',
    processing: 'bg-amber-500/20 text-amber-500',
    completed: 'bg-green-500/20 text-green-500',
  };

  const statusLabels = {
    pending: '待处理',
    processing: '制作中',
    completed: '已完成',
  };

  return (
    <div className={`bg-background border border-border rounded-lg overflow-hidden ${expanded ? '' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm leading-snug">{task.scriptTitle}</h4>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>{task.digitalHumanName}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{task.scheduledDate}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              <span>{BGM_OPTIONS.find(b => b.id === task.bgm)?.name || '无BGM'}</span>
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
            {statusLabels[task.status]}
          </span>
        </div>
        
        <div className="flex gap-2 mt-3">
          {task.status === 'pending' && (
            <button
              onClick={() => onStatusChange(task.id, 'processing')}
              className="flex-1 h-8 text-xs border border-border rounded-lg hover:border-primary/50 transition-colors"
            >
              开始制作
            </button>
          )}
          {task.status === 'processing' && (
            <button
              onClick={() => onStatusChange(task.id, 'completed')}
              className="flex-1 h-8 text-xs bg-green-500/20 text-green-500 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              标记完成
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="h-8 px-3 text-xs border border-border rounded-lg hover:border-red-500/50 transition-colors"
          >
            <TrashIcon size={14} className="text-red-500/70" />
          </button>
        </div>
      </div>
    </div>
  );
}
