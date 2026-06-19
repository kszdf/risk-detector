'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LightbulbIcon, CopyIcon, TrashIcon, PlusIcon, CheckIcon, XIcon, FilterIcon, SparklesIcon } from '@/components/icons';
import { Topic, TopicStatus, TopicType, TargetAudience, RemixRecord } from '@/lib/types';
import { getTopics, saveTopic, deleteTopic, getRemixRecords, addRemixRecord, updateRemixRecord, deleteRemixRecord } from '@/lib/storage';

const ACCOUNT_LABELS: Record<string, string> = {
  main: '张老师老板财税',
  secondary: '创业老板第一站',
};

const TOPIC_TYPE_LABELS: Record<string, string> = {
  'risk-trigger': '风险触发型',
  'case-analysis': '案例拆解型',
  'policy-interpret': '政策解读型',
  'course-attract': '课程引流型',
  'register-avoid': '注册避坑型',
  'process-science': '流程科普型',
  'startup-remind': '创业提醒型',
  'agency-common': '代账常识型',
};

const STATUS_CONFIG: Record<TopicStatus, { label: string; color: string; bg: string }> = {
  'unused': { label: '待用', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  'in-use': { label: '已用', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  'discarded': { label: '弃用', color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' },
};

export default function TopicsModule() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filterStatus, setFilterStatus] = useState<TopicStatus | 'all'>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // 爆款二创相关状态
  const [remixRecords, setRemixRecords] = useState<RemixRecord[]>([]);
  const [remixUrl, setRemixUrl] = useState('');
  const [remixTranscript, setRemixTranscript] = useState('');

  useEffect(() => {
    setTopics(getTopics());
    setRemixRecords(getRemixRecords());
  }, []);

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAccount !== 'all' && t.account !== filterAccount) return false;
      return true;
    });
  }, [topics, filterStatus, filterAccount]);

  const stats = useMemo(() => ({
    total: topics.length,
    unused: topics.filter(t => t.status === 'unused').length,
    inUse: topics.filter(t => t.status === 'in-use').length,
    discarded: topics.filter(t => t.status === 'discarded').length,
  }), [topics]);

  const handleStatusChange = (topicId: string, newStatus: TopicStatus) => {
    const updated = topics.map(t => t.id === topicId ? { ...t, status: newStatus } : t);
    setTopics(updated);
    saveTopic(updated.find(t => t.id === topicId)!);
  };

  const handleDelete = (topicId: string) => {
    deleteTopic(topicId);
    setTopics(prev => prev.filter(t => t.id !== topicId));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 爆款二创处理函数
  const handleRemixSubmit = () => {
    if (!remixUrl && !remixTranscript) return;
    
    const record: RemixRecord = {
      id: `remix_${Date.now()}`,
      url: remixUrl,
      transcript: remixTranscript,
      title: remixUrl ? remixUrl.substring(0, 50) + (remixUrl.length > 50 ? '...' : '') : '逐字稿内容',
      status: 'pending',
      statusLabel: '待二创',
      createdAt: new Date().toISOString(),
    };
    
    addRemixRecord(record);
    setRemixRecords(prev => [record, ...prev]);
    setRemixUrl('');
    setRemixTranscript('');
  };

  const handleStartRemix = (record: RemixRecord) => {
    const prompt = `请对以下爆款内容做二创：【链接】${record.url || '无'}\n【逐字稿】${record.transcript || '无'}`;
    navigator.clipboard.writeText(prompt);
    
    // 更新状态为二创中
    updateRemixRecord(record.id, { status: 'in-progress', statusLabel: '二创中' });
    setRemixRecords(prev => prev.map(r => 
      r.id === record.id ? { ...r, status: 'in-progress', statusLabel: '二创中' } : r
    ));
  };

  const handleCompleteRemix = (recordId: string) => {
    updateRemixRecord(recordId, { status: 'completed', statusLabel: '已完成', completedAt: new Date().toISOString() });
    setRemixRecords(prev => prev.map(r => 
      r.id === recordId ? { ...r, status: 'completed', statusLabel: '已完成' } : r
    ));
  };

  const handleDeleteRemix = (recordId: string) => {
    deleteRemixRecord(recordId);
    setRemixRecords(prev => prev.filter(r => r.id !== recordId));
  };

  const getRemixStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'in-progress': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部统计 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-[#F1F5F9]">{stats.total}</div>
          <div className="text-sm text-[#94A3B8]">选题总数</div>
        </div>
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.unused}</div>
          <div className="text-sm text-[#94A3B8]">待用</div>
        </div>
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-green-400">{stats.inUse}</div>
          <div className="text-sm text-[#94A3B8]">已用</div>
        </div>
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-400">{stats.discarded}</div>
          <div className="text-sm text-[#94A3B8]">弃用</div>
        </div>
      </div>

      {/* 爆款二创区域 */}
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-base font-semibold text-[#F1F5F9]">爆款二创</h3>
          <span className="text-xs text-[#94A3B8] bg-[#2A303C] px-2 py-0.5 rounded">粘贴爆款自动解析</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">爆款链接</label>
            <input
              type="text"
              value={remixUrl}
              onChange={e => setRemixUrl(e.target.value)}
              placeholder="粘贴爆款视频链接"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1.5">爆款逐字稿</label>
            <textarea
              value={remixTranscript}
              onChange={e => setRemixTranscript(e.target.value)}
              placeholder="粘贴视频口播原文，AI自动解析二创"
              rows={2}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B] resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleRemixSubmit}
            disabled={!remixUrl && !remixTranscript}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            <SparklesIcon className="w-4 h-4" />
            提交二创
          </button>
          <span className="text-xs text-[#64748B]">数据将保存至飞书多维表格</span>
        </div>

        {/* 提交记录列表 */}
        {remixRecords.length > 0 && (
          <div className="mt-4 border-t border-[#2A303C] pt-4">
            <div className="text-sm text-[#94A3B8] mb-3">提交记录 ({remixRecords.length})</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {remixRecords.map(record => (
                <div key={record.id} className="flex items-center gap-3 bg-[#0D0F14] rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#F1F5F9] truncate">{record.title}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs border ${getRemixStatusStyle(record.status)}`}>
                    {record.statusLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    {record.status !== 'completed' && (
                      <button
                        onClick={() => handleStartRemix(record)}
                        className="px-2 py-1 text-xs bg-[#8B5CF6]/20 text-[#8B5CF6] rounded hover:bg-[#8B5CF6]/30 transition-colors"
                      >
                        开始二创
                      </button>
                    )}
                    {record.status === 'in-progress' && (
                      <button
                        onClick={() => handleCompleteRemix(record.id)}
                        className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                      >
                        完成
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteRemix(record.id)}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-[#94A3B8]" />
          <span className="text-sm text-[#94A3B8]">筛选:</span>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as TopicStatus | 'all')}
          className="bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9]"
        >
          <option value="all">全部状态</option>
          <option value="unused">待用</option>
          <option value="in-use">已用</option>
          <option value="discarded">弃用</option>
        </select>
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
          className="bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9]"
        >
          <option value="all">全部账号</option>
          <option value="main">主号</option>
          <option value="secondary">副号</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <PlusIcon className="w-4 h-4" />
          添加选题
        </button>
      </div>

      {/* 选题列表 */}
      <div className="flex-1 overflow-auto">
        {filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[#94A3B8]">
            <LightbulbIcon className="w-12 h-12 mb-4 opacity-50" />
            <p>暂无选题</p>
            <p className="text-sm mt-1">点击上方按钮添加选题</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTopics.map(topic => {
              const statusCfg = STATUS_CONFIG[topic.status || 'unused'];
              return (
                <div
                  key={topic.id}
                  className="bg-[#161A22] border border-[#2A303C] rounded-xl p-5 hover:border-[#3B82F6]/50 transition-colors"
                >
                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded border ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      <span className="px-2 py-1 text-xs rounded bg-[#3B82F6]/20 text-blue-400">
                        {ACCOUNT_LABELS[topic.account] || topic.account}
                      </span>
                      <span className="px-2 py-1 text-xs rounded bg-[#F59E0B]/20 text-amber-400">
                        {TOPIC_TYPE_LABELS[topic.type] || topic.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(topic.title)}
                        className="p-1.5 hover:bg-[#2A303C] rounded-lg transition-colors"
                        title="复制标题"
                      >
                        <CopyIcon className="w-4 h-4 text-[#94A3B8]" />
                      </button>
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="删除"
                      >
                        <TrashIcon className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* 标题 */}
                  <h3 className="text-lg font-bold text-[#F1F5F9] mb-3">{topic.title}</h3>

                  {/* 详情 */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#94A3B8]">核心内容:</span>
                      <span className="ml-2 text-[#F1F5F9]">{topic.coreContent}</span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8]">目标人群:</span>
                      <span className="ml-2 text-[#F1F5F9]">{topic.targetAudience}</span>
                    </div>
                  </div>

                  {/* 自诊钩子 */}
                  <div className="mt-3 px-3 py-2 bg-[#0D0F14] rounded-lg">
                    <span className="text-sm text-[#94A3B8]">自诊钩子: </span>
                    <span className="text-sm text-[#10B981]">{topic.hookPhrase}</span>
                  </div>

                  {/* 转化路径 */}
                  <div className="mt-2 px-3 py-2 bg-[#0D0F14] rounded-lg">
                    <span className="text-sm text-[#94A3B8]">转化路径: </span>
                    <span className="text-sm text-[#F1F5F9]">{topic.conversionPath}</span>
                  </div>

                  {/* 状态操作 */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-sm text-[#94A3B8]">标记状态:</span>
                    <select
                      value={topic.status || 'unused'}
                      onChange={e => handleStatusChange(topic.id, e.target.value as TopicStatus)}
                      className="bg-[#0D0F14] border border-[#2A303C] rounded px-2 py-1 text-sm text-[#F1F5F9]"
                    >
                      <option value="unused">待用</option>
                      <option value="in-use">已用</option>
                      <option value="discarded">弃用</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 添加选题弹窗 */}
      {showAddModal && (
        <AddTopicModal
          onClose={() => setShowAddModal(false)}
          onSave={(topic) => {
            saveTopic(topic);
            setTopics(prev => [...prev, topic]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddTopicModal({ onClose, onSave }: { onClose: () => void; onSave: (t: Topic) => void }) {
  const [account, setAccount] = useState<'main' | 'secondary'>('main');
  const [type, setType] = useState('risk-trigger');
  const [title, setTitle] = useState('');
  const [coreContent, setCoreContent] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [hookPhrase, setHookPhrase] = useState('');
  const [conversionPath, setConversionPath] = useState('');

  const mainTypes = ['risk-trigger', 'case-analysis', 'policy-interpret', 'course-attract'];
  const secondaryTypes = ['register-avoid', 'process-science', 'startup-remind', 'agency-common'];

  const handleSubmit = () => {
    if (!title.trim()) return;
    const topic: Topic = {
      id: `topic_${Date.now()}`,
      title,
      account,
      accountName: ACCOUNT_LABELS[account],
      type: type as TopicType,
      typeName: TOPIC_TYPE_LABELS[type] || type,
      coreContent,
      targetAudience: targetAudience as TargetAudience,
      hookPhrase: hookPhrase || `打「关键词」发你资料`,
      conversionPath: conversionPath || '打关键词→私信→C类',
      status: 'unused',
      createdAt: new Date().toISOString(),
    };
    onSave(topic);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6 w-[600px] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#F1F5F9]">添加选题</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#2A303C] rounded">
            <XIcon className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">账号</label>
            <select
              value={account}
              onChange={e => { setAccount(e.target.value as 'main' | 'secondary'); setType(account === 'main' ? 'risk-trigger' : 'register-avoid'); }}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              <option value="main">主号-张老师老板财税</option>
              <option value="secondary">副号-创业老板第一站</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">内容类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              {account === 'main' ? mainTypes.map(t => (
                <option key={t} value={t}>{TOPIC_TYPE_LABELS[t]}</option>
              )) : secondaryTypes.map(t => (
                <option key={t} value={t}>{TOPIC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="输入选题标题"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">核心内容</label>
            <input
              type="text"
              value={coreContent}
              onChange={e => setCoreContent(e.target.value)}
              placeholder="一句话说明核心价值"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">目标人群</label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              placeholder="如：创业老板、企业主"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">自诊钩子</label>
            <input
              type="text"
              value={hookPhrase}
              onChange={e => setHookPhrase(e.target.value)}
              placeholder="打「关键词」发你资料"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>

          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">转化路径</label>
            <input
              type="text"
              value={conversionPath}
              onChange={e => setConversionPath(e.target.value)}
              placeholder="打关键词→领资料→私信→C类"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] placeholder-[#64748B]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-[#94A3B8] hover:text-[#F1F5F9]">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
