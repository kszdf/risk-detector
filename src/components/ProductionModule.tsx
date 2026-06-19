'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { VideoIcon, PlusIcon, TrashIcon, CheckIcon, XIcon, CalendarIcon, UserIcon, ClockIcon } from '@/components/icons';
import { VideoProductionTask, Script } from '@/lib/types';
import { getProductionTasks, saveProductionTasks, getScripts } from '@/lib/storage';

const DIGITAL_HUMANS = [
  { id: 'dh1', name: '张老师', provider: 'tencent', recommended: true, desc: '专业权威风格，适合主号' },
  { id: 'dh2', name: '小李老师', provider: 'tencent', recommended: true, desc: '亲和力强，适合副号' },
  { id: 'dh3', name: '王博士', provider: 'guiji', recommended: false, desc: '学术气质，专业背书' },
  { id: 'dh4', name: '李经理', provider: 'shanjian', recommended: false, desc: '商务精英风格' },
];

const SUBTITLE_STYLES = [
  { id: 'style1', name: '思源黑体-白字黑边', desc: '清晰易读，适合财税内容' },
  { id: 'style2', name: '微软雅黑-白字黑边', desc: '通用风格' },
  { id: 'style3', name: '黑体-黄字黑边', desc: '高对比度，吸引注意力' },
];

const BGM_PRESETS = [
  { id: 'bgm1', name: '轻商务背景音乐', volume: -8, desc: '专业不抢戏' },
  { id: 'bgm2', name: '温暖励志BGM', volume: -10, desc: '增强情感共鸣' },
  { id: 'bgm3', name: '科技感背景音', volume: -12, desc: '现代感强' },
];

const PRODUCTION_STEPS = [
  { id: 1, name: '粘贴脚本', desc: '将脚本内容复制到工具' },
  { id: 2, name: '选数字人', desc: '选择合适的数字人形象' },
  { id: 3, name: '配字幕BGM', desc: '设置字幕样式和背景音乐' },
  { id: 4, name: '提交渲染', desc: '提交到渲染队列' },
  { id: 5, name: '人工审核', desc: '检查视频质量' },
  { id: 6, name: '导出发布', desc: '下载并发布到平台' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '待录制', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  submitted: { label: '制作中', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  rendering: { label: '渲染中', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  review: { label: '待审核', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  exported: { label: '已完成', color: 'text-green-400', bg: 'bg-green-500/20' },
};

export default function ProductionModule() {
  const [tasks, setTasks] = useState<VideoProductionTask[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState('');

  useEffect(() => {
    setTasks(getProductionTasks());
    setScripts(getScripts());
  }, []);

  const stats = useMemo(() => ({
    total: tasks.length,
    draft: tasks.filter(t => t.status === 'draft').length,
    inProgress: tasks.filter(t => ['submitted', 'rendering'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'exported').length,
  }), [tasks]);

  const handleAddTask = (task: VideoProductionTask) => {
    saveProductionTasks([task, ...tasks]);
    setTasks([task, ...tasks]);
    setShowAddModal(false);
  };

  const handleUpdateStatus = (taskId: string, status: VideoProductionTask['status']) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, status } : t);
    saveProductionTasks(updated);
    setTasks(updated);
  };

  const handleDelete = (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    saveProductionTasks(updated);
    setTasks(updated);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 数字人克隆指引 */}
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-5 mb-6">
        <h3 className="text-lg font-bold text-[#F1F5F9] mb-4">腾讯智影数字人克隆操作步骤</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0D0F14] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-sm flex items-center justify-center">1</span>
              <span className="text-[#F1F5F9] font-medium">注册账号</span>
            </div>
            <p className="text-sm text-[#94A3B8]">访问腾讯智影官网，注册并完成实名认证</p>
          </div>
          <div className="bg-[#0D0F14] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-sm flex items-center justify-center">2</span>
              <span className="text-[#F1F5F9] font-medium">克隆数字人</span>
            </div>
            <p className="text-sm text-[#94A3B8]">上传3-5分钟视频，等待AI训练完成（约2-4小时）</p>
          </div>
          <div className="bg-[#0D0F14] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-[#8B5CF6] text-white text-sm flex items-center justify-center">3</span>
              <span className="text-[#F1F5F9] font-medium">形象调整</span>
            </div>
            <p className="text-sm text-[#94A3B8]">选择服装、发型、背景等形象元素</p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-[#3B82F6]/10 border border-[#3B82F6]/30 rounded-lg">
          <p className="text-sm text-blue-400">
            <span className="font-medium">推荐工具：</span>
            腾讯智影（首选）- 数字人丰富，操作简单 | 硅基智能（备选）- 数字人逼真度高 | 闪剪（性价比）- 价格实惠
          </p>
        </div>
      </div>

      {/* 生产配置模板 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 字幕配置 */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[#F1F5F9] mb-3">字幕配置模板</h4>
          <div className="space-y-2">
            {SUBTITLE_STYLES.map(style => (
              <div key={style.id} className="flex items-center gap-3 p-2 bg-[#0D0F14] rounded-lg">
                <CheckIcon className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm text-[#F1F5F9]">{style.name}</p>
                  <p className="text-xs text-[#94A3B8]">{style.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BGM配置 */}
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <h4 className="text-sm font-medium text-[#F1F5F9] mb-3">BGM配置模板</h4>
          <div className="space-y-2">
            {BGM_PRESETS.map(bgm => (
              <div key={bgm.id} className="flex items-center gap-3 p-2 bg-[#0D0F14] rounded-lg">
                <CheckIcon className="w-4 h-4 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm text-[#F1F5F9]">{bgm.name}</p>
                  <p className="text-xs text-[#94A3B8]">音量: 人声{bgm.volume}dB以下 | {bgm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 统计和添加 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-[#F1F5F9]">{stats.total}</div>
            <div className="text-xs text-[#94A3B8]">总任务</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{stats.inProgress}</div>
            <div className="text-xs text-[#94A3B8]">制作中</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-[#94A3B8]">已完成</div>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-lg hover:opacity-90"
        >
          <PlusIcon className="w-4 h-4" />
          添加生产任务
        </button>
      </div>

      {/* 生产排程表 */}
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#94A3B8]">
            <VideoIcon className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无生产任务</p>
            <p className="text-sm mt-1">点击上方按钮添加</p>
          </div>
        ) : (
          <div className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0D0F14] text-[#94A3B8] text-sm">
                  <th className="text-left py-3 px-4">日期</th>
                  <th className="text-left py-3 px-4">脚本标题</th>
                  <th className="text-left py-3 px-4">数字人</th>
                  <th className="text-left py-3 px-4">字幕/BGM</th>
                  <th className="text-left py-3 px-4">状态</th>
                  <th className="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.draft;
                  return (
                    <tr key={task.id} className="border-t border-[#2A303C] hover:bg-[#0D0F14]/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-[#94A3B8]" />
                          <span className="text-sm text-[#F1F5F9]">{task.scheduledDate}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[#F1F5F9]">{task.scriptTitle}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-[#94A3B8]" />
                          <span className="text-sm text-[#F1F5F9]">{task.digitalHumanName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-[#94A3B8]">
                          <p>{task.subtitleStyle}</p>
                          <p>{task.bgmName} ({task.bgmVolume}dB)</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded ${statusCfg.bg} ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={task.status}
                            onChange={e => handleUpdateStatus(task.id, e.target.value as VideoProductionTask['status'])}
                            className="bg-[#0D0F14] border border-[#2A303C] rounded px-2 py-1 text-xs text-[#F1F5F9]"
                          >
                            <option value="draft">待录制</option>
                            <option value="submitted">制作中</option>
                            <option value="rendering">渲染中</option>
                            <option value="review">待审核</option>
                            <option value="exported">已完成</option>
                          </select>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1 hover:bg-red-500/20 rounded"
                          >
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 添加任务弹窗 */}
      {showAddModal && (
        <AddTaskModal
          scripts={scripts}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
        />
      )}
    </div>
  );
}

function AddTaskModal({ scripts, onClose, onAdd }: {
  scripts: Script[];
  onClose: () => void;
  onAdd: (t: VideoProductionTask) => void;
}) {
  const [scriptId, setScriptId] = useState('');
  const [digitalHumanId, setDigitalHumanId] = useState('dh1');
  const [subtitleStyle, setSubtitleStyle] = useState('style1');
  const [bgmId, setBgmId] = useState('bgm1');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const selectedScript = scripts.find(s => s.id === scriptId);
  const selectedDH = DIGITAL_HUMANS.find(d => d.id === digitalHumanId);
  const selectedSubtitle = SUBTITLE_STYLES.find(s => s.id === subtitleStyle);
  const selectedBGM = BGM_PRESETS.find(b => b.id === bgmId);

  const handleSubmit = () => {
    if (!scriptId || !digitalHumanId) return;
    const task: VideoProductionTask = {
      id: `task_${Date.now()}`,
      scriptId,
      scriptTitle: selectedScript?.topicTitle || '',
      digitalHumanId,
      digitalHumanName: selectedDH?.name || '',
      digitalHumanProvider: selectedDH?.provider || '',
      subtitleStyle: selectedSubtitle?.name || '',
      bgmName: selectedBGM?.name || '',
      bgmVolume: selectedBGM?.volume || -6,
      scheduledDate,
      scheduledTime: '10:00',
      status: 'draft',
      notes,
      createdAt: new Date().toISOString(),
    };
    onAdd(task);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6 w-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#F1F5F9]">添加生产任务</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#2A303C] rounded">
            <XIcon className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">选择脚本 *</label>
            <select
              value={scriptId}
              onChange={e => setScriptId(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              <option value="">选择脚本...</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>{s.topicTitle}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">数字人</label>
            <div className="grid grid-cols-2 gap-2">
              {DIGITAL_HUMANS.map(dh => (
                <div
                  key={dh.id}
                  onClick={() => setDigitalHumanId(dh.id)}
                  className={`p-3 rounded-lg cursor-pointer border ${
                    digitalHumanId === dh.id 
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' 
                      : 'border-[#2A303C] bg-[#0D0F14]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#94A3B8]" />
                    <span className="text-sm text-[#F1F5F9]">{dh.name}</span>
                    {dh.recommended && (
                      <span className="px-1 py-0.5 text-xs bg-[#3B82F6]/30 text-blue-400 rounded">推荐</span>
                    )}
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">{dh.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">字幕样式</label>
            <select
              value={subtitleStyle}
              onChange={e => setSubtitleStyle(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              {SUBTITLE_STYLES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">BGM</label>
            <select
              value={bgmId}
              onChange={e => setBgmId(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              {BGM_PRESETS.map(b => (
                <option key={b.id} value={b.id}>{b.name} (音量{b.volume}dB)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">计划日期</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="可选备注..."
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] h-20 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-[#94A3B8]">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!scriptId}
            className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
