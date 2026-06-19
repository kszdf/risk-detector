'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlusIcon, TrashIcon, BarChartIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon, AlertCircleIcon, XIcon, VideoIcon } from '@/components/icons';
import { VideoRecord } from '@/lib/types';
import { getVideoRecords, saveVideoRecords } from '@/lib/storage';

const CONTENT_TYPES = [
  { id: 'risk-trigger', name: '风险触发型' },
  { id: 'case-analysis', name: '案例拆解型' },
  { id: 'policy-interpret', name: '政策解读型' },
  { id: 'course-attract', name: '课程引流型' },
  { id: 'register-avoid', name: '注册避坑型' },
  { id: 'process-science', name: '流程科普型' },
  { id: 'startup-remind', name: '创业提醒型' },
  { id: 'agency-common', name: '代账常识型' },
];

const RATE_THRESHOLDS = {
  keywordTrigger: { red: 0.5, yellow: 1, label: '关键词触发率' },
  privateConsult: { red: 10, yellow: 20, label: '私信转化率' },
  transaction: { red: 5, yellow: 10, label: '成交转化率' },
};

function getRateStatus(rate: number, threshold: typeof RATE_THRESHOLDS.keywordTrigger) {
  if (rate >= threshold.yellow) return 'green';
  if (rate >= threshold.red) return 'yellow';
  return 'red';
}

function getRateLabel(rate: number, threshold: typeof RATE_THRESHOLDS.keywordTrigger) {
  if (rate >= threshold.yellow) return '优秀';
  if (rate >= threshold.red) return '一般';
  return '需优化';
}

export default function AnalyticsModule() {
  const [records, setRecords] = useState<VideoRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setRecords(getVideoRecords());
  }, []);

  const stats = useMemo(() => {
    if (records.length === 0) {
      return {
        totalViews: 0,
        totalComments: 0,
        totalKeywordTriggers: 0,
        totalPrivateConsults: 0,
        totalMaterialsSent: 0,
        totalDeepConsults: 0,
        totalTransactions: 0,
        avgKeywordTriggerRate: 0,
        avgPrivateConsultRate: 0,
        avgTransactionRate: 0,
        byType: [] as { type: string; name: string; count: number; avgViews: number }[],
      };
    }

    const totalViews = records.reduce((sum, r) => sum + r.views, 0);
    const totalComments = records.reduce((sum, r) => sum + r.comments, 0);
    const totalKeywordTriggers = records.reduce((sum, r) => sum + r.keywordTriggers, 0);
    const totalPrivateConsults = records.reduce((sum, r) => sum + r.privateConsults, 0);
    const totalMaterialsSent = records.reduce((sum, r) => sum + r.materialsSent, 0);
    const totalDeepConsults = records.reduce((sum, r) => sum + r.deepConsults, 0);
    const totalTransactions = records.reduce((sum, r) => sum + r.transactions, 0);

    const avgKeywordTriggerRate = totalViews > 0 ? (totalKeywordTriggers / totalViews) * 100 : 0;
    const avgPrivateConsultRate = totalKeywordTriggers > 0 ? (totalPrivateConsults / totalKeywordTriggers) * 100 : 0;
    const avgTransactionRate = totalPrivateConsults > 0 ? (totalTransactions / totalPrivateConsults) * 100 : 0;

    const byType = CONTENT_TYPES.map(type => {
      const typeRecords = records.filter(r => r.contentType === type.id);
      return {
        type: type.id,
        name: type.name,
        count: typeRecords.length,
        avgViews: typeRecords.length > 0 ? Math.round(typeRecords.reduce((sum, r) => sum + r.views, 0) / typeRecords.length) : 0,
      };
    }).filter(t => t.count > 0).sort((a, b) => b.avgViews - a.avgViews);

    return {
      totalViews,
      totalComments,
      totalKeywordTriggers,
      totalPrivateConsults,
      totalMaterialsSent,
      totalDeepConsults,
      totalTransactions,
      avgKeywordTriggerRate,
      avgPrivateConsultRate,
      avgTransactionRate,
      byType,
    };
  }, [records]);

  const handleAddRecord = (record: VideoRecord) => {
    saveVideoRecords([record, ...records]);
    setRecords([record, ...records]);
    setShowAddModal(false);
  };

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    saveVideoRecords(updated);
    setRecords(updated);
  };

  const suggestions = useMemo(() => {
    const suggestions: { type: string; action: 'increase' | 'decrease' | 'maintain'; reason: string }[] = [];
    
    if (stats.byType.length === 0) return suggestions;

    const topPerformer = stats.byType[0];
    const bottomPerformer = stats.byType[stats.byType.length - 1];

    if (topPerformer && topPerformer.avgViews > 0) {
      suggestions.push({
        type: topPerformer.name,
        action: 'increase',
        reason: `平均播放量${topPerformer.avgViews.toLocaleString()}，建议增加产出`,
      });
    }

    if (bottomPerformer && bottomPerformer.avgViews > 0 && topPerformer) {
      if (bottomPerformer.avgViews < topPerformer.avgViews * 0.5) {
        suggestions.push({
          type: bottomPerformer.name,
          action: 'decrease',
          reason: `平均播放量${bottomPerformer.avgViews.toLocaleString()}，低于Top50%，建议减少`,
        });
      }
    }

    if (stats.avgKeywordTriggerRate < 0.5) {
      suggestions.push({
        type: '钩子优化',
        action: 'maintain',
        reason: '关键词触发率偏低，建议优化视频钩子，提高评论互动',
      });
    }

    if (stats.avgPrivateConsultRate < 10 && stats.totalKeywordTriggers > 10) {
      suggestions.push({
        type: '私信话术',
        action: 'maintain',
        reason: '私信转化率偏低，建议优化私信第一句话术',
      });
    }

    return suggestions;
  }, [stats]);

  return (
    <div className="h-full flex flex-col">
      {/* 核心指标 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="总播放量" value={stats.totalViews} icon={<VideoIcon className="w-5 h-5" />} />
        <MetricCard label="总评论数" value={stats.totalComments} icon={<BarChartIcon className="w-5 h-5" />} />
        <MetricCard label="关键词触发" value={stats.totalKeywordTriggers} icon={<TrendingUpIcon className="w-5 h-5" />} />
        <MetricCard label="私信咨询" value={stats.totalPrivateConsults} icon={<TrendingUpIcon className="w-5 h-5" />} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard label="资料发放" value={stats.totalMaterialsSent} icon={<TrendingUpIcon className="w-5 h-5" />} />
        <MetricCard label="深度咨询" value={stats.totalDeepConsults} icon={<TrendingUpIcon className="w-5 h-5" />} />
        <MetricCard label="成交量" value={stats.totalTransactions} icon={<TrendingUpIcon className="w-5 h-5" />} />
      </div>

      {/* 关键比率-红绿灯 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <RateCard
          label="关键词触发率"
          rate={stats.avgKeywordTriggerRate}
          threshold={RATE_THRESHOLDS.keywordTrigger}
          description="播放→关键词触发"
        />
        <RateCard
          label="私信转化率"
          rate={stats.avgPrivateConsultRate}
          threshold={RATE_THRESHOLDS.privateConsult}
          description="关键词触发→私信咨询"
        />
        <RateCard
          label="成交转化率"
          rate={stats.avgTransactionRate}
          threshold={RATE_THRESHOLDS.transaction}
          description="私信咨询→成交"
        />
      </div>

      {/* 优化建议 */}
      {suggestions.length > 0 && (
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-[#F1F5F9] mb-3 flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-[#F59E0B]" />
            优化建议
          </h3>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-[#0D0F14] rounded-lg">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  s.action === 'increase' ? 'bg-green-500/20 text-green-400' :
                  s.action === 'decrease' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {s.action === 'increase' ? '增加' : s.action === 'decrease' ? '减少' : '维持'}
                </span>
                <span className="text-sm text-[#F1F5F9]">{s.type}</span>
                <span className="text-sm text-[#94A3B8]">{s.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 内容类型效果对比 */}
      {stats.byType.length > 0 && (
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-[#F1F5F9] mb-3">内容类型效果对比</h3>
          <div className="space-y-2">
            {stats.byType.map((item, index) => (
              <div key={item.type} className="flex items-center gap-3">
                <span className="w-6 text-sm text-[#94A3B8]">{index + 1}</span>
                <span className="flex-1 text-sm text-[#F1F5F9]">{item.name}</span>
                <span className="px-2 py-0.5 text-xs bg-[#3B82F6]/20 text-blue-400 rounded">{item.count}条</span>
                <span className="text-sm text-[#F1F5F9]">{item.avgViews.toLocaleString()}</span>
                <div className="w-24 h-2 bg-[#2A303C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3B82F6] to-[#10B981]"
                    style={{ width: `${Math.min(100, (item.avgViews / (stats.byType[0]?.avgViews || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 数据录入和列表 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#F1F5F9]">视频数据明细</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:opacity-90 text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          录入数据
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8]">
            <BarChartIcon className="w-10 h-10 mb-3 opacity-50" />
            <p>暂无数据</p>
            <p className="text-sm mt-1">点击上方按钮录入视频数据</p>
          </div>
        ) : (
          <div className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0D0F14] text-[#94A3B8] text-xs">
                  <th className="text-left py-2 px-3">视频标题</th>
                  <th className="text-left py-2 px-3">类型</th>
                  <th className="text-right py-2 px-3">播放</th>
                  <th className="text-right py-2 px-3">评论</th>
                  <th className="text-right py-2 px-3">触发</th>
                  <th className="text-right py-2 px-3">私信</th>
                  <th className="text-right py-2 px-3">成交</th>
                  <th className="text-right py-2 px-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => {
                  const typeName = CONTENT_TYPES.find(t => t.id === record.contentType)?.name || record.contentType;
                  return (
                    <tr key={record.id} className="border-t border-[#2A303C] hover:bg-[#0D0F14]/50 text-sm">
                      <td className="py-2 px-3 text-[#F1F5F9]">{record.title}</td>
                      <td className="py-2 px-3 text-[#94A3B8]">{typeName}</td>
                      <td className="py-2 px-3 text-right text-[#F1F5F9]">{record.views.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-[#F1F5F9]">{record.comments}</td>
                      <td className="py-2 px-3 text-right text-[#F1F5F9]">{record.keywordTriggers}</td>
                      <td className="py-2 px-3 text-right text-[#F1F5F9]">{record.privateConsults}</td>
                      <td className="py-2 px-3 text-right text-[#10B981]">{record.transactions}</td>
                      <td className="py-2 px-3 text-right">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="p-1 hover:bg-red-500/20 rounded"
                        >
                          <TrashIcon className="w-4 h-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddRecordModal onClose={() => setShowAddModal(false)} onAdd={handleAddRecord} />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#94A3B8]">{icon}</span>
        <span className="text-sm text-[#94A3B8]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#F1F5F9]">{value.toLocaleString()}</div>
    </div>
  );
}

function RateCard({ label, rate, threshold, description }: {
  label: string;
  rate: number;
  threshold: typeof RATE_THRESHOLDS.keywordTrigger;
  description: string;
}) {
  const status = getRateStatus(rate, threshold);
  const statusColor = status === 'green' ? 'text-green-400' : status === 'yellow' ? 'text-amber-400' : 'text-red-400';
  const statusBg = status === 'green' ? 'bg-green-500/20' : status === 'yellow' ? 'bg-amber-500/20' : 'bg-red-500/20';
  const lightColor = status === 'green' ? '#10B981' : status === 'yellow' ? '#F59E0B' : '#EF4444';

  return (
    <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[#94A3B8]">{label}</span>
        <span className={`px-2 py-0.5 text-xs rounded ${statusBg} ${statusColor}`}>
          {rate.toFixed(2)}% | {getRateLabel(rate, threshold)}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#F1F5F9] mb-1">{rate.toFixed(2)}%</div>
      <div className="text-xs text-[#94A3B8] mb-2">{description}</div>
      <div className="h-2 bg-[#2A303C] rounded-full overflow-hidden">
        <div
          className="h-full transition-all"
          style={{ width: `${Math.min(100, rate)}%`, backgroundColor: lightColor }}
        />
      </div>
      <div className="flex justify-between text-xs text-[#94A3B8] mt-1">
        <span>0%</span>
        <span>{threshold.red}%</span>
        <span>{threshold.yellow}%+</span>
      </div>
    </div>
  );
}

function AddRecordModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (r: VideoRecord) => void;
}) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('risk-trigger');
  const [views, setViews] = useState(0);
  const [comments, setComments] = useState(0);
  const [keywordTriggers, setKeywordTriggers] = useState(0);
  const [privateConsults, setPrivateConsults] = useState(0);
  const [materialsSent, setMaterialsSent] = useState(0);
  const [deepConsults, setDeepConsults] = useState(0);
  const [transactions, setTransactions] = useState(0);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    if (!title) return;
    const record: VideoRecord = {
      id: `record_${Date.now()}`,
      title,
      contentType: contentType as VideoRecord['contentType'],
      account: 'main',
      publishDate,
      views,
      comments,
      keywordTriggers,
      privateConsults,
      materialsSent,
      deepConsults,
      transactions,
      framework: 'C' as const,
      likes: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
    };
    onAdd(record);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6 w-[600px] max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#F1F5F9]">录入视频数据</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#2A303C] rounded">
            <XIcon className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-[#94A3B8] mb-1">视频标题 *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="视频标题"
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">内容类型</label>
              <select
                value={contentType}
                onChange={e => setContentType(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              >
                {CONTENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">发布日期</label>
              <input
                type="date"
                value={publishDate}
                onChange={e => setPublishDate(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">播放量</label>
              <input
                type="number"
                value={views}
                onChange={e => setViews(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">评论数</label>
              <input
                type="number"
                value={comments}
                onChange={e => setComments(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">关键词触发次数</label>
              <input
                type="number"
                value={keywordTriggers}
                onChange={e => setKeywordTriggers(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">私信咨询量</label>
              <input
                type="number"
                value={privateConsults}
                onChange={e => setPrivateConsults(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">资料发放量</label>
              <input
                type="number"
                value={materialsSent}
                onChange={e => setMaterialsSent(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">深度咨询量</label>
              <input
                type="number"
                value={deepConsults}
                onChange={e => setDeepConsults(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-[#94A3B8] mb-1">成交量</label>
              <input
                type="number"
                value={transactions}
                onChange={e => setTransactions(Number(e.target.value))}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-[#94A3B8]">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!title}
            className="px-4 py-2 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
