'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3Icon, PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon, AlertCircleIcon } from '@/components/icons';
import { VideoRecord, VideoMetrics, OptimizationSuggestion, AccountType, TopicType, ContentFramework } from '@/lib/types';
import { getVideoRecords, addVideoRecord, deleteVideoRecord, calculateVideoMetrics, generateId, formatNumber, getAccountName, getTopicTypeName } from '@/lib/storage';

const ACCOUNT_OPTIONS = [
  { id: 'main' as AccountType, name: '张老师老板财税' },
  { id: 'secondary' as AccountType, name: '创业老板的第一站' },
];

const CONTENT_TYPE_OPTIONS = [
  { id: 'risk-trigger' as TopicType, name: '风险触发型' },
  { id: 'case-analysis' as TopicType, name: '案例拆解型' },
  { id: 'policy-interpret' as TopicType, name: '政策解读型' },
  { id: 'course-attract' as TopicType, name: '课程引流型' },
  { id: 'register-avoid' as TopicType, name: '注册避坑型' },
  { id: 'process-science' as TopicType, name: '流程科普型' },
  { id: 'startup-remind' as TopicType, name: '创业提醒型' },
  { id: 'agency-common' as TopicType, name: '代账常识型' },
];

const FRAMEWORK_OPTIONS = [
  { id: 'B' as ContentFramework, name: 'B类-注册(入口)' },
  { id: 'A' as ContentFramework, name: 'A类-代账(留存)' },
  { id: 'C' as ContentFramework, name: 'C类-税筹(利润)' },
  { id: 'D' as ContentFramework, name: 'D类-课程(杠杆)' },
];

const FRAMEWORK_COLORS: Record<string, string> = {
  'B': '#3B82F6',
  'A': '#10B981',
  'C': '#F59E0B',
  'D': '#8B5CF6',
};

const RATE_THRESHOLDS = {
  keywordTriggerRate: { excellent: 1, good: 0.5, normal: 0.2 },
  privateConversionRate: { excellent: 20, good: 10, normal: 5 },
  transactionConversionRate: { excellent: 10, good: 5, normal: 2 },
};

export default function AnalyticsModule() {
  const [records, setRecords] = useState<VideoRecord[]>(() => getVideoRecords());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    account: 'main' as AccountType,
    contentType: 'risk-trigger' as TopicType,
    framework: 'C' as ContentFramework,
    publishDate: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    keywordTriggers: '',
    privateConsults: '',
    materialsSent: '',
    deepConsults: '',
    transactions: '',
  });

  const metrics = useMemo(() => calculateVideoMetrics(records), [records]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.publishDate) return;

    const newRecord: VideoRecord = {
      id: generateId(),
      title: formData.title,
      account: formData.account,
      contentType: formData.contentType,
      framework: formData.framework,
      publishDate: formData.publishDate,
      views: parseInt(formData.views) || 0,
      likes: parseInt(formData.likes) || 0,
      comments: parseInt(formData.comments) || 0,
      shares: parseInt(formData.shares) || 0,
      keywordTriggers: parseInt(formData.keywordTriggers) || 0,
      privateConsults: parseInt(formData.privateConsults) || 0,
      materialsSent: parseInt(formData.materialsSent) || 0,
      deepConsults: parseInt(formData.deepConsults) || 0,
      transactions: parseInt(formData.transactions) || 0,
      createdAt: new Date().toISOString(),
    };

    setRecords(prev => {
      const updated = [newRecord, ...prev];
      addVideoRecord(newRecord);
      return updated;
    });

    setShowForm(false);
    setFormData({
      title: '',
      account: 'main',
      contentType: 'risk-trigger',
      framework: 'C',
      publishDate: '',
      views: '',
      likes: '',
      comments: '',
      shares: '',
      keywordTriggers: '',
      privateConsults: '',
      materialsSent: '',
      deepConsults: '',
      transactions: '',
    });
  };

  const handleDelete = (id: string) => {
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      deleteVideoRecord(id);
      return updated;
    });
  };

  // 按内容类型分组统计
  const frameworkStats = useMemo(() => {
    const stats: Record<string, { count: number; views: number; transactions: number; contentType: string }> = {};
    
    records.forEach(r => {
      if (!stats[r.framework]) {
        stats[r.framework] = { count: 0, views: 0, transactions: 0, contentType: r.contentType };
      }
      stats[r.framework].count++;
      stats[r.framework].views += r.views;
      stats[r.framework].transactions += r.transactions;
    });

    return Object.entries(stats).map(([fw, data]) => ({
      framework: fw,
      ...data,
    })).sort((a, b) => {
      const order = ['B', 'A', 'C', 'D'];
      return order.indexOf(a.framework) - order.indexOf(b.framework);
    });
  }, [records]);

  // 生成优化建议
  const suggestions = useMemo((): OptimizationSuggestion[] => {
    if (frameworkStats.length < 2) return [];

    const suggestions: OptimizationSuggestion[] = [];
    const totalVideos = records.length;
    
    // 计算每个框架类型的平均表现
    const avgByFramework = frameworkStats.map(fw => ({
      framework: fw.framework,
      avgViews: fw.views / fw.count,
      avgTransactions: fw.transactions / fw.count,
      count: fw.count,
    }));

    const avgViews = avgByFramework.reduce((sum, f) => sum + f.avgViews, 0) / avgByFramework.length;
    const avgTransactions = avgByFramework.reduce((sum, f) => sum + f.avgTransactions, 0) / avgByFramework.length;

    avgByFramework.forEach(fw => {
      const ratio = fw.avgTransactions / (avgTransactions || 1);
      const threshold = totalVideos < 10 ? 0.5 : 0.7;
      
      if (ratio > 1.3) {
        suggestions.push({
          type: 'increase',
          contentType: fw.framework === 'B' ? 'register-avoid' : 
                       fw.framework === 'A' ? 'agency-common' :
                       fw.framework === 'C' ? 'risk-trigger' : 'course-attract',
          reason: `该类型平均转化${(ratio * 100).toFixed(0)}%超均值，表现优异`,
          currentCount: fw.count,
          recommendedCount: Math.ceil(fw.count * 1.5),
        });
      } else if (ratio < threshold && fw.count > 1) {
        suggestions.push({
          type: 'decrease',
          contentType: fw.framework === 'B' ? 'register-avoid' : 
                       fw.framework === 'A' ? 'agency-common' :
                       fw.framework === 'C' ? 'risk-trigger' : 'course-attract',
          reason: `该类型转化率偏低，建议减少产出`,
          currentCount: fw.count,
          recommendedCount: Math.max(1, Math.floor(fw.count * 0.5)),
        });
      } else {
        suggestions.push({
          type: 'maintain',
          contentType: fw.framework === 'B' ? 'register-avoid' : 
                       fw.framework === 'A' ? 'agency-common' :
                       fw.framework === 'C' ? 'risk-trigger' : 'course-attract',
          reason: `表现稳定，维持当前产出`,
          currentCount: fw.count,
          recommendedCount: fw.count,
        });
      }
    });

    return suggestions;
  }, [frameworkStats, records.length]);

  const getRateStatus = (rate: number, threshold: typeof RATE_THRESHOLDS.keywordTriggerRate) => {
    if (rate >= threshold.excellent) return { label: '优秀', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (rate >= threshold.good) return { label: '良好', color: 'text-blue-400', bg: 'bg-blue-500/20' };
    if (rate >= threshold.normal) return { label: '一般', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    return { label: '待优化', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const maxBarWidth = Math.max(...frameworkStats.map(f => f.views), 1);

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-module-gold/20 flex items-center justify-center">
              <BarChart3Icon className="module-gold" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">数据监控</h2>
              <p className="text-sm text-muted-foreground">千里眼 · 洞察秋毫</p>
            </div>
          </div>

          {/* 核心指标看板 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <MetricCard
              label="总播放量"
              value={formatNumber(metrics.totalViews)}
              icon="👁"
            />
            <MetricCard
              label="总评论数"
              value={formatNumber(metrics.totalComments)}
              icon="💬"
            />
            <MetricCard
              label="关键词触发"
              value={formatNumber(metrics.totalKeywordTriggers)}
              icon="🔑"
            />
            <MetricCard
              label="私信咨询量"
              value={formatNumber(metrics.totalPrivateConsults)}
              icon="✉️"
            />
            <MetricCard
              label="资料发放量"
              value={formatNumber(metrics.totalMaterialsSent)}
              icon="📄"
            />
            <MetricCard
              label="深度咨询量"
              value={formatNumber(metrics.totalDeepConsults)}
              icon="🎯"
            />
            <MetricCard
              label="成交量"
              value={formatNumber(metrics.totalTransactions)}
              icon="💰"
              highlight
            />
            <MetricCard
              label="视频数量"
              value={records.length.toString()}
              icon="📹"
            />
          </div>

          {/* 关键比率 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">关键比率</h4>
            <div className="space-y-3">
              <RateIndicator
                label="关键词触发率"
                rate={metrics.keywordTriggerRate}
                threshold={RATE_THRESHOLDS.keywordTriggerRate}
                unit="%"
                getStatus={getRateStatus}
              />
              <RateIndicator
                label="私信转化率"
                rate={metrics.privateConversionRate}
                threshold={RATE_THRESHOLDS.privateConversionRate}
                unit="%"
                getStatus={getRateStatus}
              />
              <RateIndicator
                label="成交转化率"
                rate={metrics.transactionConversionRate}
                threshold={RATE_THRESHOLDS.transactionConversionRate}
                unit="%"
                getStatus={getRateStatus}
              />
            </div>
          </div>

          {/* 添加数据按钮 */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press flex items-center justify-center gap-2"
          >
            <PlusIcon size={18} />
            {showForm ? '收起表单' : '录入视频数据'}
          </button>

          {/* 数据录入表单 */}
          {showForm && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border animate-fade-in space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">视频标题</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="输入视频标题"
                  className="w-full h-9 px-3 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary input-glow transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">账号</label>
                  <select
                    value={formData.account}
                    onChange={(e) => handleInputChange('account', e.target.value)}
                    className="w-full h-9 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                  >
                    {ACCOUNT_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">发布日期</label>
                  <input
                    type="date"
                    value={formData.publishDate}
                    onChange={(e) => handleInputChange('publishDate', e.target.value)}
                    className="w-full h-9 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">内容类型</label>
                  <select
                    value={formData.contentType}
                    onChange={(e) => handleInputChange('contentType', e.target.value)}
                    className="w-full h-9 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                  >
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">框架</label>
                  <select
                    value={formData.framework}
                    onChange={(e) => handleInputChange('framework', e.target.value)}
                    className="w-full h-9 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:border-primary"
                  >
                    {FRAMEWORK_OPTIONS.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 数据输入 */}
              <div className="grid grid-cols-3 gap-2">
                <DataInput label="播放量" value={formData.views} onChange={(v) => handleInputChange('views', v)} />
                <DataInput label="点赞数" value={formData.likes} onChange={(v) => handleInputChange('likes', v)} />
                <DataInput label="评论数" value={formData.comments} onChange={(v) => handleInputChange('comments', v)} />
                <DataInput label="转发数" value={formData.shares} onChange={(v) => handleInputChange('shares', v)} />
                <DataInput label="关键词触发" value={formData.keywordTriggers} onChange={(v) => handleInputChange('keywordTriggers', v)} />
                <DataInput label="私信咨询" value={formData.privateConsults} onChange={(v) => handleInputChange('privateConsults', v)} />
                <DataInput label="资料发放" value={formData.materialsSent} onChange={(v) => handleInputChange('materialsSent', v)} />
                <DataInput label="深度咨询" value={formData.deepConsults} onChange={(v) => handleInputChange('deepConsults', v)} />
                <DataInput label="成交量" value={formData.transactions} onChange={(v) => handleInputChange('transactions', v)} highlight />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.publishDate}
                className="w-full h-10 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                保存数据
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 漏斗图 & 优化建议 */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
          <h3 className="font-medium mb-4">内容类型效果对比</h3>
          
          {frameworkStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3Icon size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {frameworkStats.map(fw => {
                const barWidth = (fw.views / maxBarWidth) * 100;
                const convRate = fw.views > 0 ? ((fw.transactions / fw.views) * 100).toFixed(2) : '0.00';
                return (
                  <div key={fw.framework} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: FRAMEWORK_COLORS[fw.framework] }}
                        >
                          {fw.framework}
                        </div>
                        <span>{fw.contentType || '未分类'}</span>
                        <span className="text-muted-foreground">({fw.count}个)</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span>播放: {formatNumber(fw.views)}</span>
                        <span className="text-green-400">成交: {fw.transactions}</span>
                        <span className="text-amber-400">转化: {convRate}%</span>
                      </div>
                    </div>
                    <div className="h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${barWidth}%`,
                          backgroundColor: FRAMEWORK_COLORS[fw.framework],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 优化建议 */}
        {suggestions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <AlertCircleIcon size={18} className="text-amber-400" />
              优化建议
            </h3>
            <div className="space-y-3">
              {suggestions.map((sug, idx) => (
                <div 
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    sug.type === 'increase' ? 'bg-green-500/10 border-green-500/30' :
                    sug.type === 'decrease' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {sug.type === 'increase' && <ArrowUpIcon size={16} className="text-green-400" />}
                    {sug.type === 'decrease' && <ArrowDownIcon size={16} className="text-red-400" />}
                    {sug.type === 'maintain' && <MinusIcon size={16} className="text-muted-foreground" />}
                    <span className={`font-medium text-sm ${
                      sug.type === 'increase' ? 'text-green-400' :
                      sug.type === 'decrease' ? 'text-red-400' :
                      'text-muted-foreground'
                    }`}>
                      {sug.type === 'increase' ? '增加' : sug.type === 'decrease' ? '减少' : '维持'}产出
                    </span>
                    <span className="text-sm">{getTopicTypeName(sug.contentType, 'main')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{sug.reason}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    当前: {sug.currentCount}个 → 建议: {sug.recommendedCount}个
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 数据明细表格 */}
        <div className="flex-1 bg-card border border-border rounded-xl p-5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">数据明细</h4>
            <span className="text-sm text-muted-foreground">{records.length} 条记录</span>
          </div>
          
          {records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3Icon size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无数据记录</p>
                <p className="text-sm mt-1">录入视频数据后将显示在这里</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">标题</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground w-16">账号</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground w-20">类型</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground w-20">播放</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground w-20">触发</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground w-20">咨询</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground w-16">成交</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground w-12">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, idx) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 px-2 truncate max-w-[200px]">{record.title}</td>
                      <td className="py-2 px-2">
                        <span className={record.account === 'main' ? 'text-blue-400' : 'text-purple-400'}>
                          {record.account === 'main' ? '主号' : '副号'}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span 
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ 
                            backgroundColor: `${FRAMEWORK_COLORS[record.framework]}20`,
                            color: FRAMEWORK_COLORS[record.framework],
                          }}
                        >
                          {record.framework}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">{formatNumber(record.views)}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-amber-400">{record.keywordTriggers}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-blue-400">{record.privateConsults}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-green-400 font-medium">{record.transactions}</td>
                      <td className="py-2 px-2 text-right">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <TrashIcon size={14} className="text-red-500/70" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, highlight = false }: { label: string; value: string; icon: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${
      highlight 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-muted/30 border-border'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`font-mono-num text-lg font-bold ${highlight ? 'text-green-400' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function RateIndicator({ 
  label, 
  rate, 
  threshold, 
  unit,
  getStatus,
}: { 
  label: string; 
  rate: number; 
  threshold: typeof RATE_THRESHOLDS.keywordTriggerRate;
  unit: string;
  getStatus: (rate: number, threshold: typeof RATE_THRESHOLDS.keywordTriggerRate) => { label: string; color: string; bg: string };
}) {
  const status = getStatus(rate, threshold);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-24">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ 
            width: `${Math.min(rate / threshold.excellent * 100, 100)}%`,
            backgroundColor: status.color.includes('green') ? '#22c55e' : 
                            status.color.includes('blue') ? '#3b82f6' : 
                            status.color.includes('amber') ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      <span className={`text-sm font-medium ${status.color}`}>{rate.toFixed(2)}{unit}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>{status.label}</span>
    </div>
  );
}

function DataInput({ label, value, onChange, highlight = false }: { label: string; value: string; onChange: (v: string) => void; highlight?: boolean }) {
  return (
    <div>
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={`w-full h-9 px-2 bg-background border rounded text-sm font-mono focus:outline-none focus:border-primary input-glow transition-all ${
          highlight ? 'border-green-500/50 focus:border-green-500' : 'border-border'
        }`}
      />
    </div>
  );
}
