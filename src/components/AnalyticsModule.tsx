'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChartIcon, EyeIcon, HeartIcon, MessageIcon, 
  ShareIcon, TargetIcon, TrendingUpIcon, TrendingDownIcon,
  PlusIcon, TrashIcon, DownloadIcon, AlertIcon
} from '@/components/icons';
import { VideoRecord } from '@/lib/types';
import { getVideoRecords, addVideoRecord, deleteVideoRecord, generateId, formatNumber, calculateConversionRate } from '@/lib/storage';

export default function AnalyticsModule() {
  const [records, setRecords] = useState<VideoRecord[]>(() => getVideoRecords());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    publishDate: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    privateConversions: '',
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');

  // Calculate totals
  const totals = records.reduce((acc, r) => ({
    views: acc.views + r.views,
    likes: acc.likes + r.likes,
    comments: acc.comments + r.comments,
    shares: acc.shares + r.shares,
    conversions: acc.conversions + r.privateConversions,
  }), { views: 0, likes: 0, comments: 0, shares: 0, conversions: 0 });

  const overallConversion = calculateConversionRate(totals.conversions, totals.views);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newRecord: VideoRecord = {
      id: generateId(),
      title: formData.title,
      publishDate: formData.publishDate,
      views: parseInt(formData.views) || 0,
      likes: parseInt(formData.likes) || 0,
      comments: parseInt(formData.comments) || 0,
      shares: parseInt(formData.shares) || 0,
      privateConversions: parseInt(formData.privateConversions) || 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    addVideoRecord(newRecord);
    
    setFormData({
      title: '',
      publishDate: '',
      views: '',
      likes: '',
      comments: '',
      shares: '',
      privateConversions: '',
    });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    deleteVideoRecord(id);
  };

  const exportData = () => {
    const csv = [
      ['标题', '发布日期', '播放量', '点赞', '评论', '转发', '私域转化'].join(','),
      ...records.map(r => [
        `"${r.title}"`,
        r.publishDate,
        r.views,
        r.likes,
        r.comments,
        r.shares,
        r.privateConversions,
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `视频数据_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // Generate optimization suggestions
  const generateSuggestions = () => {
    const suggestions = [];
    
    if (totals.views > 0) {
      const avgLikes = totals.likes / records.length;
      const avgComments = totals.comments / records.length;
      const avgConversions = totals.conversions / records.length;
      
      if (avgLikes < totals.views * 0.02) {
        suggestions.push({
          type: 'warning',
          title: '点赞率偏低',
          content: '建议优化封面和开头3秒，提升观众留存和互动意愿',
        });
      }
      
      if (avgComments < 10) {
        suggestions.push({
          type: 'info',
          title: '评论互动不足',
          content: '在视频中设置互动话题或提问，引导用户评论',
        });
      }
      
      if (avgConversions < 5) {
        suggestions.push({
          type: 'warning',
          title: '私域转化待提升',
          content: '优化引流话术和钩子，在评论区置顶引导评论"666"获取资料',
        });
      }
    }

    if (records.length > 3) {
      const recentRecords = records.slice(0, 3);
      const olderRecords = records.slice(3);
      
      if (olderRecords.length > 0) {
        const recentAvgViews = recentRecords.reduce((sum, r) => sum + r.views, 0) / recentRecords.length;
        const olderAvgViews = olderRecords.reduce((sum, r) => sum + r.views, 0) / olderRecords.length;
        
        if (recentAvgViews > olderAvgViews * 1.2) {
          suggestions.push({
            type: 'success',
            title: '近期流量上升',
            content: '近期内容表现优于早期，建议延续当前选题方向',
          });
        }
      }
    }

    if (suggestions.length === 0) {
      suggestions.push({
        type: 'info',
        title: '数据积累中',
        content: '继续录入更多视频数据，系统将为您生成更精准的优化建议',
      });
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();

  return (
    <div className="flex gap-6 h-full">
      {/* 左侧区域 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 数据概览卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<EyeIcon size={20} />}
            label="总播放量"
            value={formatNumber(totals.views)}
            color="blue"
          />
          <StatCard
            icon={<HeartIcon size={20} />}
            label="总点赞数"
            value={formatNumber(totals.likes)}
            color="red"
            subValue={`${((totals.likes / totals.views) * 100 || 0).toFixed(1)}%点赞率`}
          />
          <StatCard
            icon={<MessageIcon size={20} />}
            label="总评论数"
            value={formatNumber(totals.comments)}
            color="amber"
          />
          <StatCard
            icon={<TargetIcon size={20} />}
            label="总转化数"
            value={formatNumber(totals.conversions)}
            color="green"
            subValue={`${overallConversion}转化率`}
          />
        </div>

        {/* 转化漏斗图 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium mb-4">转化漏斗</h3>
          <div className="space-y-3">
            <FunnelBar label="播放" value={totals.views} max={totals.views} color="from-blue-600 to-blue-500" />
            <FunnelBar label="互动(赞+评+转)" value={totals.likes + totals.comments + totals.shares} max={totals.views} color="from-purple-600 to-purple-500" />
            <FunnelBar label="私域转化" value={totals.conversions} max={totals.views} color="from-green-600 to-green-500" />
          </div>
        </div>

        {/* 数据表格 */}
        <div className="bg-card border border-border rounded-xl p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">视频数据明细</h3>
            <div className="flex items-center gap-2">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="h-8 px-2 bg-background border border-border rounded text-xs focus:outline-none focus:border-primary"
              >
                <option value="all">全部时间</option>
                <option value="7d">近7天</option>
                <option value="30d">近30天</option>
              </select>
              <button
                onClick={exportData}
                className="h-8 px-3 border border-border rounded text-xs hover:border-primary/50 transition-colors flex items-center gap-1"
              >
                <DownloadIcon size={14} />
                导出
              </button>
            </div>
          </div>
          
          {records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChartIcon size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无视频数据</p>
                <p className="text-sm mt-1">添加视频数据后在此查看</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">标题</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">播放</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">点赞</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">评论</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">转发</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">转化</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">转化率</th>
                    <th className="py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 max-w-[200px]">
                        <div className="truncate font-medium">{record.title}</div>
                        <div className="text-xs text-muted-foreground">{record.publishDate}</div>
                      </td>
                      <td className="text-right py-3 px-2 font-mono-num">{formatNumber(record.views)}</td>
                      <td className="text-right py-3 px-2 font-mono-num">{formatNumber(record.likes)}</td>
                      <td className="text-right py-3 px-2 font-mono-num">{formatNumber(record.comments)}</td>
                      <td className="text-right py-3 px-2 font-mono-num">{formatNumber(record.shares)}</td>
                      <td className="text-right py-3 px-2 font-mono-num text-green-500">{formatNumber(record.privateConversions)}</td>
                      <td className="text-right py-3 px-2 font-mono-num">
                        <span className="text-green-500">{calculateConversionRate(record.privateConversions, record.views)}</span>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 rounded hover:bg-red-500/10 transition-colors"
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

      {/* 右侧区域 */}
      <div className="w-[40%] flex flex-col gap-4">
        {/* 录入表单 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <PlusIcon size={18} />
              录入数据
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="视频标题"
                required
                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm"
              />
            </div>
            <div>
              <input
                type="date"
                value={formData.publishDate}
                onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value }))}
                required
                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">播放量</label>
                <input
                  type="number"
                  value={formData.views}
                  onChange={(e) => setFormData(prev => ({ ...prev, views: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">点赞数</label>
                <input
                  type="number"
                  value={formData.likes}
                  onChange={(e) => setFormData(prev => ({ ...prev, likes: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">评论数</label>
                <input
                  type="number"
                  value={formData.comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">转发数</label>
                <input
                  type="number"
                  value={formData.shares}
                  onChange={(e) => setFormData(prev => ({ ...prev, shares: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">引流私域数</label>
              <input
                type="number"
                value={formData.privateConversions}
                onChange={(e) => setFormData(prev => ({ ...prev, privateConversions: e.target.value }))}
                placeholder="添加微信/进入社群的人数"
                required
                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm font-mono-num"
              />
            </div>
            <button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press"
            >
              保存数据
            </button>
          </form>
        </div>

        {/* 优化建议 */}
        <div className="bg-card border border-border rounded-xl p-5 flex-1 overflow-hidden flex flex-col">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <AlertIcon size={18} className="text-amber-500" />
            优化建议
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  suggestion.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : suggestion.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <h4 className={`font-medium text-sm ${
                  suggestion.type === 'warning'
                    ? 'text-amber-500'
                    : suggestion.type === 'success'
                    ? 'text-green-500'
                    : 'text-blue-500'
                }`}>
                  {suggestion.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">{suggestion.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subValue?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-500',
    red: 'bg-red-500/20 text-red-500',
    amber: 'bg-amber-500/20 text-amber-500',
    green: 'bg-green-500/20 text-green-500',
    purple: 'bg-purple-500/20 text-purple-500',
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold font-mono-num">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono-num">{formatNumber(value)}</span>
      </div>
      <div className="h-6 bg-muted rounded-lg overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-lg transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
