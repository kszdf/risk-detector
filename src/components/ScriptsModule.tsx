'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileTextIcon, CopyIcon, TrashIcon, PlusIcon, XIcon, CheckIcon, ChevronDownIcon, ClockIcon } from '@/components/icons';
import { Topic, Script, ScriptSegment } from '@/lib/types';
import { getTopics, getScripts, addScript, deleteScript } from '@/lib/storage';

const ACCOUNT_LABELS: Record<string, string> = {
  main: '张老师老板财税',
  secondary: '创业老板第一站',
};

export default function ScriptsModule() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);

  useEffect(() => {
    setScripts(getScripts());
    setTopics(getTopics());
  }, []);

  const unusedTopics = useMemo(() => {
    const usedTopicIds = new Set(scripts.map(s => s.topicId));
    return topics.filter(t => !usedTopicIds.has(t.id) && t.status !== 'discarded');
  }, [topics, scripts]);

  const selectedTopic = useMemo(() => {
    return topics.find(t => t.id === selectedTopicId);
  }, [topics, selectedTopicId]);

  const handleCreateScript = () => {
    if (!selectedTopic) return;
    setEditingScript({
      id: `script_${Date.now()}`,
      topicId: selectedTopic.id,
      topicTitle: selectedTopic.title,
      account: selectedTopic.account as 'main' | 'secondary',
      accountName: ACCOUNT_LABELS[selectedTopic.account] || selectedTopic.account,
      segments: generateDefaultSegments(selectedTopic.account as 'main' | 'secondary'),
      duration: 60,
      style: selectedTopic.account === 'main' ? '专业笃定、断言式开头' : '亲和实用、场景式开头',
      hookPhrase: selectedTopic.hookPhrase,
      cta: '评论区扣「666」领取资料',
      createdAt: new Date().toISOString(),
    });
    setShowEditor(true);
  };

  const handleSaveScript = (script: Script) => {
    addScript(script);
    setScripts(prev => {
      const existing = prev.findIndex(s => s.id === script.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = script;
        return updated;
      }
      return [script, ...prev];
    });
    setShowEditor(false);
    setEditingScript(null);
  };

  const handleDeleteScript = (id: string) => {
    deleteScript(id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const handleCopyScript = (script: Script) => {
    const text = script.segments.map(s => `[${s.timeStart}-${s.timeEnd}] ${s.action}: ${s.content}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 统计 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#F1F5F9]">{scripts.length}</div>
          <div className="text-sm text-[#94A3B8]">脚本总数</div>
        </div>
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{unusedTopics.length}</div>
          <div className="text-sm text-[#94A3B8]">待写选题</div>
        </div>
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">
            {scripts.filter(s => s.duration).reduce((acc, s) => acc + s.duration, 0)}s
          </div>
          <div className="text-sm text-[#94A3B8]">总时长</div>
        </div>
      </div>

      {/* 创建区域 */}
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4 mb-6">
        <h3 className="text-sm font-medium text-[#94A3B8] mb-3">从选题库选择创建脚本</h3>
        <div className="flex gap-3">
          <select
            value={selectedTopicId}
            onChange={e => setSelectedTopicId(e.target.value)}
            className="flex-1 bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
          >
            <option value="">选择选题...</option>
            {unusedTopics.map(t => (
              <option key={t.id} value={t.id}>
                [{ACCOUNT_LABELS[t.account]}] {t.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateScript}
            disabled={!selectedTopicId}
            className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            生成脚本框架
          </button>
        </div>
      </div>

      {/* 脚本列表 */}
      <div className="flex-1 overflow-auto">
        {scripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#94A3B8]">
            <FileTextIcon className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无脚本</p>
            <p className="text-sm mt-1">从上方选题创建</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scripts.map(script => (
              <ScriptCard
                key={script.id}
                script={script}
                onCopy={() => handleCopyScript(script)}
                onDelete={() => handleDeleteScript(script.id)}
                onEdit={() => {
                  setEditingScript(script);
                  setShowEditor(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && editingScript && (
        <ScriptEditor
          script={editingScript}
          onClose={() => { setShowEditor(false); setEditingScript(null); }}
          onSave={handleSaveScript}
        />
      )}
    </div>
  );
}

function ScriptCard({ script, onCopy, onDelete, onEdit }: {
  script: Script;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 text-xs rounded bg-[#10B981]/20 text-green-400">
                {script.accountName}
              </span>
              <span className="px-2 py-1 text-xs rounded bg-[#F59E0B]/20 text-amber-400">
                {script.duration}秒
              </span>
            </div>
            <h3 className="text-[#F1F5F9] font-medium mb-1">{script.topicTitle}</h3>
            <p className="text-sm text-[#94A3B8]">{script.style}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onCopy} className="p-2 hover:bg-[#2A303C] rounded-lg" title="复制">
              <CopyIcon className="w-4 h-4 text-[#94A3B8]" />
            </button>
            <button onClick={onEdit} className="p-2 hover:bg-[#2A303C] rounded-lg" title="编辑">
              <FileTextIcon className="w-4 h-4 text-blue-400" />
            </button>
            <button onClick={onDelete} className="p-2 hover:bg-red-500/20 rounded-lg" title="删除">
              <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-2 hover:bg-[#2A303C] rounded-lg">
              <ChevronDownIcon className={`w-4 h-4 text-[#94A3B8] transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2A303C] p-4 bg-[#0D0F14]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#94A3B8]">
                <th className="text-left py-2 w-24">时间</th>
                <th className="text-left py-2 w-32">画面动作</th>
                <th className="text-left py-2">口播文案</th>
                <th className="text-left py-2 w-16">情绪</th>
              </tr>
            </thead>
            <tbody>
              {script.segments.map((seg, i) => (
                <tr key={i} className={`border-t border-[#2A303C] ${seg.isHook ? 'bg-[#3B82F6]/10' : seg.isCTA ? 'bg-[#10B981]/10' : ''}`}>
                  <td className="py-2 text-[#F59E0B]">{seg.timeStart}-{seg.timeEnd}</td>
                  <td className="py-2 text-[#F1F5F9]">{seg.action}</td>
                  <td className="py-2 text-[#F1F5F9]">{seg.content}</td>
                  <td className="py-2 text-[#94A3B8]">{seg.emotion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScriptEditor({ script, onClose, onSave }: {
  script: Script;
  onClose: () => void;
  onSave: (s: Script) => void;
}) {
  const [localScript, setLocalScript] = useState(script);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);

  const updateSegment = (index: number, updates: Partial<ScriptSegment>) => {
    const newSegments = [...localScript.segments];
    newSegments[index] = { ...newSegments[index], ...updates };
    setLocalScript({ ...localScript, segments: newSegments });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[#2A303C]">
          <h3 className="text-lg font-bold text-[#F1F5F9]">编辑脚本</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#2A303C] rounded">
            <XIcon className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 p-3 bg-[#0D0F14] rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 text-xs rounded bg-[#10B981]/20 text-green-400">
                {localScript.accountName}
              </span>
            </div>
            <h4 className="text-[#F1F5F9] font-medium">{localScript.topicTitle}</h4>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#94A3B8] border-b border-[#2A303C]">
                <th className="text-left py-2 w-24">时间</th>
                <th className="text-left py-2 w-28">类型</th>
                <th className="text-left py-2 w-32">画面动作</th>
                <th className="text-left py-2">口播文案</th>
                <th className="text-left py-2 w-20">情绪</th>
              </tr>
            </thead>
            <tbody>
              {localScript.segments.map((seg, i) => (
                <tr key={i} className={`border-b border-[#2A303C] ${editingSegment === i ? 'bg-[#3B82F6]/20' : ''}`}>
                  <td className="py-2 text-[#F59E0B]">{seg.timeStart}-{seg.timeEnd}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      seg.isHook ? 'bg-blue-500/30 text-blue-400' :
                      seg.isEmpathy ? 'bg-green-500/30 text-green-400' :
                      seg.isCore ? 'bg-amber-500/30 text-amber-400' :
                      seg.isSelfCheck ? 'bg-orange-500/30 text-orange-400' :
                      'bg-purple-500/30 text-purple-400'
                    }`}>
                      {seg.isHook ? '钩子' : seg.isEmpathy ? '共情' : seg.isCore ? '核心' : seg.isSelfCheck ? '自诊' : '行动'}
                    </span>
                  </td>
                  <td className="py-2">
                    {editingSegment === i ? (
                      <input
                        value={seg.action}
                        onChange={e => updateSegment(i, { action: e.target.value })}
                        className="w-full bg-[#0D0F14] border border-[#2A303C] rounded px-2 py-1 text-[#F1F5F9]"
                      />
                    ) : (
                      <span
                        className="text-[#F1F5F9] cursor-pointer hover:text-blue-400"
                        onClick={() => setEditingSegment(i)}
                      >
                        {seg.action}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {editingSegment === i ? (
                      <input
                        value={seg.content}
                        onChange={e => updateSegment(i, { content: e.target.value })}
                        className="w-full bg-[#0D0F14] border border-[#2A303C] rounded px-2 py-1 text-[#F1F5F9]"
                      />
                    ) : (
                      <span
                        className="text-[#F1F5F9] cursor-pointer hover:text-blue-400"
                        onClick={() => setEditingSegment(i)}
                      >
                        {seg.content}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-[#94A3B8]">{seg.emotion}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">脚本风格</label>
              <input
                value={localScript.style}
                onChange={e => setLocalScript({ ...localScript, style: e.target.value })}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">行动指令(CTA)</label>
              <input
                value={localScript.cta}
                onChange={e => setLocalScript({ ...localScript, cta: e.target.value })}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#2A303C]">
          <button onClick={onClose} className="px-4 py-2 text-[#94A3B8] hover:text-[#F1F5F9]">
            取消
          </button>
          <button
            onClick={() => onSave(localScript)}
            className="px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-lg hover:opacity-90"
          >
            保存脚本
          </button>
        </div>
      </div>
    </div>
  );
}

function generateDefaultSegments(account: 'main' | 'secondary'): ScriptSegment[] {
  const isMain = account === 'main';
  
  return [
    {
      timeStart: '00:00',
      timeEnd: '00:03',
      action: '直视镜头，语气笃定',
      content: isMain 
        ? '你知道吗？90%的老板都不知道，公司账上的钱根本不是你的。' 
        : '你有没有想过，为什么有些人创业顺风顺水，而你却总是踩坑？',
      emotion: '激动',
      isHook: true,
      isEmpathy: false,
      isCore: false,
      isSelfCheck: false,
      isCTA: false,
    },
    {
      timeStart: '00:03',
      timeEnd: '00:08',
      action: '微微点头，眼神坚定',
      content: isMain
        ? '因为从你注册公司的第一天起，就已经埋下了这颗雷。'
        : '今天这条视频，我整理了创业路上最容易被忽略的5个大坑，帮你少走3年弯路。',
      emotion: '共情',
      isHook: false,
      isEmpathy: true,
      isCore: false,
      isSelfCheck: false,
      isCTA: false,
    },
    {
      timeStart: '00:08',
      timeEnd: '00:40',
      action: '侧身展示数据图表',
      content: '第一，公私账户混用。很多老板觉得公司就是我自己的，钱随便花。但你知道吗？一旦被查到，不仅要补税，还要交0.5-5倍的罚款。第二，发票不规范。买发票、卖发票看似小事，但在金税四期系统下，每一张发票都能追溯。第三，社保和工资不一致。这个问题在金税四期上线后，已经成为稽查重点。',
      emotion: '专业',
      isHook: false,
      isEmpathy: false,
      isCore: true,
      isSelfCheck: false,
      isCTA: false,
    },
    {
      timeStart: '00:40',
      timeEnd: '00:50',
      action: '回看镜头，表情严肃',
      content: '如果你不确定自己有没有踩雷，可以在评论区扣"自检"，我把企业财税风险自检表发给你。',
      emotion: '紧迫',
      isHook: false,
      isEmpathy: false,
      isCore: false,
      isSelfCheck: true,
      isCTA: false,
    },
    {
      timeStart: '00:50',
      timeEnd: '00:60',
      action: '微笑点头，眼神温暖',
      content: '关注我，每天分享一个财税干货，让你少走弯路少踩坑。觉得有用的点个赞，我们下期见。',
      emotion: '信任',
      isHook: false,
      isEmpathy: false,
      isCore: false,
      isSelfCheck: false,
      isCTA: true,
    },
  ];
}
