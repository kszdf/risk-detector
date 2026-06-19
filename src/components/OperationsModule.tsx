'use client';

import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, MessageIcon, SendIcon, BookOpenIcon,
  PlusIcon, EditIcon, TrashIcon, CopyIcon, CheckIcon,
  HeartIcon, AlertIcon, TargetIcon
} from '@/components/icons';
import { 
  CommentReplyRule, PrivateMessage, CustomerTier, ProductPitch 
} from '@/lib/types';
import { 
  getCommentRules, saveCommentRules, addCommentRule, deleteCommentRule,
  getPrivateMessages, savePrivateMessages,
  getCustomerTiers, saveCustomerTiers,
  getProductPitches, addProductPitch, deleteProductPitch,
  generateId
} from '@/lib/storage';

type TabType = 'comments' | 'messages' | 'tiers' | 'products';

export default function OperationsModule() {
  const [activeTab, setActiveTab] = useState<TabType>('comments');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabs = [
    { id: 'comments' as TabType, label: '评论回复', icon: MessageIcon },
    { id: 'messages' as TabType, label: '私信话术', icon: SendIcon },
    { id: 'tiers' as TabType, label: '客户分层', icon: UsersIcon },
    { id: 'products' as TabType, label: '产品转化', icon: TargetIcon },
  ];

  return (
    <div className="flex gap-6 h-full">
      {/* Tab导航 */}
      <div className="w-full flex flex-col">
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="flex border-b border-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary -mb-px bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-[calc(100vh-220px)] overflow-y-auto">
            {activeTab === 'comments' && <CommentsSection copiedId={copiedId} setCopiedId={setCopiedId} />}
            {activeTab === 'messages' && <MessagesSection copiedId={copiedId} setCopiedId={setCopiedId} />}
            {activeTab === 'tiers' && <TiersSection />}
            {activeTab === 'products' && <ProductsSection copiedId={copiedId} setCopiedId={setCopiedId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// 评论回复SOP模块
function CommentsSection({ copiedId, setCopiedId }: { copiedId: string | null; setCopiedId: (id: string | null) => void }) {
  const [rules, setRules] = useState<CommentReplyRule[]>(() => getCommentRules());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    keywords: '',
    replyTemplate: '',
    priority: '1',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: CommentReplyRule = {
      id: generateId(),
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
      replyTemplate: formData.replyTemplate,
      priority: parseInt(formData.priority),
    };
    const updated = [newRule, ...rules];
    setRules(updated);
    addCommentRule(newRule);
    setFormData({ keywords: '', replyTemplate: '', priority: '1' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    deleteCommentRule(id);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">评论关键词回复SOP</h3>
          <p className="text-sm text-muted-foreground">设置关键词匹配规则，自动生成回复</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all btn-press flex items-center gap-2"
        >
          <PlusIcon size={16} />
          添加规则
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-background border border-border rounded-lg p-4 mb-4 animate-fade-in">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">触发关键词（逗号分隔）</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="多少钱，怎么联系，代理记账..."
              required
              className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-2">回复模板</label>
            <textarea
              value={formData.replyTemplate}
              onChange={(e) => setFormData(prev => ({ ...prev, replyTemplate: e.target.value }))}
              placeholder="您好，感谢关注！可以直接点击主页链接..."
              required
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all">
              保存规则
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 border border-border rounded-lg text-sm hover:border-primary/50 transition-all">
              取消
            </button>
          </div>
        </form>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无回复规则</p>
          <p className="text-sm mt-1">添加关键词匹配规则后自动回复评论</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-background border border-border rounded-lg p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {rule.keywords.map((kw, idx) => (
                      <span key={idx} className="tag">{kw}</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed">{rule.replyTemplate}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(rule.replyTemplate, rule.id)}
                    className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    {copiedId === rule.id ? <CheckIcon size={16} className="text-green-500" /> : <CopyIcon size={16} className="text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <TrashIcon size={16} className="text-red-500/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 私信话术模块
function MessagesSection({ copiedId, setCopiedId }: { copiedId: string | null; setCopiedId: (id: string | null) => void }) {
  const [messages, setMessages] = useState<PrivateMessage[]>(() => {
    const stored = getPrivateMessages();
    if (stored.length === 0) {
      const defaults: PrivateMessage[] = [
        { id: '1', stage: 'first', content: '您好，感谢关注！请问有什么财税方面的问题想了解吗？我们可以免费为您做个初步诊断~' },
        { id: '2', stage: 'follow', content: '看到您对我们的内容很感兴趣，这边整理了一份《新公司财税避坑指南》，包含常见的5大税务风险点，需要的话可以发给您参考一下。' },
        { id: '3', stage: 'conversion', content: '根据您说的情况，推荐您了解一下我们的「财税托管服务」，专业团队帮您处理税务问题，省心省力还能合理节税。现在咨询可以享受首月免费体验，要不要试试？' },
      ];
      savePrivateMessages(defaults);
      return defaults;
    }
    return stored;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const stageLabels = {
    first: { label: '首段话术', desc: '新粉丝首次私信', color: 'blue' },
    follow: { label: '跟进话术', desc: '有意向客户跟进', color: 'amber' },
    conversion: { label: '转化话术', desc: '促成转化的最终话术', color: 'green' },
  };

  const handleSave = (id: string) => {
    const updated = messages.map(m => m.id === id ? { ...m, content: editContent } : m);
    setMessages(updated);
    savePrivateMessages(updated);
    setEditingId(null);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-medium">三段式私信话术</h3>
        <p className="text-sm text-muted-foreground">私域引流转化标准流程，从首次接触到成功转化</p>
      </div>

      <div className="space-y-4">
        {(['first', 'follow', 'conversion'] as const).map((stage, idx) => {
          const msg = messages.find(m => m.stage === stage);
          const stageInfo = stageLabels[stage];
          const colorMap: Record<string, string> = {
            blue: 'border-blue-500/30 bg-blue-500/5',
            amber: 'border-amber-500/30 bg-amber-500/5',
            green: 'border-green-500/30 bg-green-500/5',
          };

          return (
            <div key={stage} className={`border rounded-xl p-5 ${colorMap[stageInfo.color]}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  stageInfo.color === 'blue' ? 'bg-blue-500/20 text-blue-500' :
                  stageInfo.color === 'amber' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-medium">{stageInfo.label}</h4>
                  <p className="text-xs text-muted-foreground">{stageInfo.desc}</p>
                </div>
              </div>

              {editingId === msg?.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow text-sm resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => msg && handleSave(msg.id)} className="flex-1 h-8 bg-primary text-primary-foreground rounded-lg text-xs font-medium">
                      保存
                    </button>
                    <button onClick={() => setEditingId(null)} className="h-8 px-3 border border-border rounded-lg text-xs">
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <p className="text-sm leading-relaxed">{msg?.content}</p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => msg && handleCopy(msg.content, msg.id)}
                      className="h-7 px-3 border border-border rounded-lg text-xs flex items-center gap-1 hover:border-primary/50 transition-colors"
                    >
                      {copiedId === msg?.id ? <><CheckIcon size={12} className="text-green-500" /> 已复制</> : <><CopyIcon size={12} /> 复制</>}
                    </button>
                    <button
                      onClick={() => { setEditingId(msg?.id || null); setEditContent(msg?.content || ''); }}
                      className="h-7 px-3 border border-border rounded-lg text-xs flex items-center gap-1 hover:border-primary/50 transition-colors"
                    >
                      <EditIcon size={12} /> 编辑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 客户分层模块
function TiersSection() {
  const [tiers, setTiers] = useState<CustomerTier[]>(() => {
    const stored = getCustomerTiers();
    if (stored.length === 0) {
      const defaults: CustomerTier[] = [
        {
          id: '1',
          name: '潜在客户',
          description: '刚关注或互动过但未私信',
          criteria: ['关注7天内', '点赞/评论1-3次', '未留联系方式'],
          color: '#94A3B8',
        },
        {
          id: '2',
          name: '意向客户',
          description: '主动咨询或表现出兴趣',
          criteria: ['主动私信询问', '评论涉及业务问题', '点赞/评论3次以上'],
          color: '#3B82F6',
        },
        {
          id: '3',
          name: '高价值客户',
          description: '有明确需求且有支付能力',
          criteria: ['咨询过报价', '问过代理记账价格', '有公司规模暗示'],
          color: '#F59E0B',
        },
        {
          id: '4',
          name: '成交客户',
          description: '已付费转化的客户',
          criteria: ['已完成首单', '续费客户', '转介绍客户'],
          color: '#10B981',
        },
      ];
      saveCustomerTiers(defaults);
      return defaults;
    }
    return stored;
  });

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-medium">客户分层管理矩阵</h3>
        <p className="text-sm text-muted-foreground">根据客户行为和意向进行分层，制定差异化运营策略</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tiers.map(tier => (
          <div
            key={tier.id}
            className="bg-background border border-border rounded-xl p-4"
            style={{ borderLeftColor: tier.color, borderLeftWidth: 4 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tier.color }}
              />
              <h4 className="font-medium">{tier.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
            <div className="space-y-1">
              {tier.criteria.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.color }} />
                  {c}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">运营策略</span>
                <span className={`tag text-xs`} style={{ 
                  backgroundColor: `${tier.color}20`, 
                  color: tier.color,
                  borderColor: `${tier.color}40`,
                }}>
                  {tier.id === '1' ? '培育' : tier.id === '2' ? '跟进' : tier.id === '3' ? '冲刺' : '维护'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 产品转化话术模块
function ProductsSection({ copiedId, setCopiedId }: { copiedId: string | null; setCopiedId: (id: string | null) => void }) {
  const [pitches, setPitches] = useState<ProductPitch[]>(() => getProductPitches());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    productName: '',
    productType: '',
    painPoint: '',
    benefit: '',
    pitchContent: '',
  });

  const productTypes = ['代理记账', '税务筹划', '公司注册', '资质办理', '股权设计', '法律咨询'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPitch: ProductPitch = {
      id: generateId(),
      productName: formData.productName,
      productType: formData.productType,
      painPoint: formData.painPoint,
      benefit: formData.benefit,
      pitchContent: formData.pitchContent,
    };
    const updated = [newPitch, ...pitches];
    setPitches(updated);
    addProductPitch(newPitch);
    setFormData({ productName: '', productType: '', painPoint: '', benefit: '', pitchContent: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updated = pitches.filter(p => p.id !== id);
    setPitches(updated);
    deleteProductPitch(id);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">四类产品转化话术</h3>
          <p className="text-sm text-muted-foreground">针对不同产品线的标准化转化话术库</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-all btn-press flex items-center gap-2"
        >
          <PlusIcon size={16} />
          添加话术
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-background border border-border rounded-lg p-4 mb-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">产品名称</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                placeholder="财税顾问年卡"
                required
                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">产品类型</label>
              <select
                value={formData.productType}
                onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))}
                required
                className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
              >
                <option value="">选择类型</option>
                {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-muted-foreground mb-1">客户痛点</label>
            <input
              type="text"
              value={formData.painPoint}
              onChange={(e) => setFormData(prev => ({ ...prev, painPoint: e.target.value }))}
              placeholder="没有专业会计，税务经常出问题"
              required
              className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-muted-foreground mb-1">产品收益</label>
            <input
              type="text"
              value={formData.benefit}
              onChange={(e) => setFormData(prev => ({ ...prev, benefit: e.target.value }))}
              placeholder="专业团队服务，省税又合规"
              required
              className="w-full h-10 px-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs text-muted-foreground mb-1">完整话术</label>
            <textarea
              value={formData.pitchContent}
              onChange={(e) => setFormData(prev => ({ ...prev, pitchContent: e.target.value }))}
              placeholder="针对您说的问题，我建议..."
              required
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-sm resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
              保存话术
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-9 px-4 border border-border rounded-lg text-sm">
              取消
            </button>
          </div>
        </form>
      )}

      {pitches.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <TargetIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p>暂无转化话术</p>
          <p className="text-sm mt-1">添加产品话术后可一键复制使用</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pitches.map(pitch => (
            <div key={pitch.id} className="bg-background border border-border rounded-lg p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{pitch.productName}</h4>
                    <span className="tag text-xs">{pitch.productType}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div className="bg-red-500/10 rounded p-2">
                      <span className="text-red-500">痛点：</span>
                      <span className="text-muted-foreground">{pitch.painPoint}</span>
                    </div>
                    <div className="bg-green-500/10 rounded p-2">
                      <span className="text-green-500">收益：</span>
                      <span className="text-muted-foreground">{pitch.benefit}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pitch.pitchContent}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(pitch.pitchContent, pitch.id)}
                    className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    {copiedId === pitch.id ? <CheckIcon size={16} className="text-green-500" /> : <CopyIcon size={16} className="text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(pitch.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <TrashIcon size={16} className="text-red-500/70" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
