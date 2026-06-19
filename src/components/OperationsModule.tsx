'use client';

import React, { useState } from 'react';
import { UsersIcon, CopyIcon, CheckIcon, EditIcon } from '@/components/icons';
import { CommentKeywordRule, PrivateMessage, CustomerTier, ProductPitch } from '@/lib/types';
import { generateId } from '@/lib/storage';

// 预设评论关键词规则
const DEFAULT_COMMENT_RULES: CommentKeywordRule[] = [
  { id: '1', keyword: '自检', replyTemplate: '老板，先别急着注册，我来帮你做个简单的自检：你目前是什么行业？年营收大概多少？有没有特殊资质需求？评论区说说，帮你判断是否需要马上注册。', materialToSend: '《企业自检清单》', priority: 1 },
  { id: '2', keyword: '排查', replyTemplate: '想排查自己公司有没有风险？评论区打"排查"，我把风险排查表发给你，对着检查一下更安心。', materialToSend: '《财税风险排查表》', priority: 2 },
  { id: '3', keyword: '注册资金', replyTemplate: '注册资金不是随便写的，要看行业要求和你的承担能力。一般建议参考同行的标准，或者咨询专业人士。说说你的具体情况，帮你分析。', materialToSend: '《注册资金填写指南》', priority: 3 },
  { id: '4', keyword: '流程', replyTemplate: '注册公司流程不复杂，但材料准备很容易出错。我整理了一份详细的流程和材料清单，打"流程"发给你。', materialToSend: '《注册公司全流程清单》', priority: 4 },
  { id: '5', keyword: '雷点', replyTemplate: '老板，踩雷很常见但完全可以避免！我总结了10个注册公司最容易踩的坑，打"避坑"发给你，提前了解少走弯路。', materialToSend: '《注册公司10大避坑指南》', priority: 5 },
  { id: '6', keyword: '代账', replyTemplate: '代账这件事，确实要慎重。我建议看三点：①有没有专业资质 ②服务响应速度 ③能不能主动预警风险。你现在有在找代账公司吗？', materialToSend: '《代账公司选择标准》', priority: 6 },
  { id: '7', keyword: '税负', replyTemplate: '税负高低和公司类型、业务结构都有关系。你是做什么行业的？我帮你看看有没有可以优化的地方。', materialToSend: '《各行业税负参考表》', priority: 7 },
  { id: '8', keyword: '公转私', replyTemplate: '老板，公转私这个问题很关键！不是不能转，是要合规地转。我整理了7种合规的公转私方法，打"公转私"发给你。', materialToSend: '《合规公转私7种方法》', priority: 8 },
  { id: '9', keyword: '雷达', replyTemplate: '财税问题就像雷达扫描，提前发现才能避免损失。你最担心哪方面的财税风险？说出来，我帮你分析。', materialToSend: '《企业财税风险雷达图》', priority: 9 },
  { id: '10', keyword: '股权', replyTemplate: '股权设计很重要，开头没做好后面很麻烦。建议先明确：①股权比例怎么分 ②退出机制怎么定 ③有没有代持情况。说下你的情况，帮你分析。', materialToSend: '《股权设计模板》', priority: 10 },
  { id: '11', keyword: '年报', replyTemplate: '年报千万别忘了！每年6月30日前必须完成，逾期会被列入异常。我可以帮你代办，省心省力，需要的话评论区说一声。', materialToSend: '《年报代办服务说明》', priority: 11 },
];

// 预设私信话术
const DEFAULT_PRIVATE_MESSAGES: PrivateMessage[] = [
  { id: '1', stage: 'first', content: '老板你好！看到你评论了[关键词]，说明你对这方面很关注。我这边整理了一份[资料名称]，对你应该有帮助，需要的话我发给你。' },
  { id: '2', stage: 'follow', content: '老板，资料发你了，查收一下。有任何问题都可以问我。另外想了解一下，你目前公司是什么情况？有没有遇到过[相关问题]？' },
  { id: '3', stage: 'conversion', content: '根据你的情况，我建议可以做个全面的财税诊断。我们现在有免费诊断服务，包含：[诊断内容]。帮你看看有没有可以优化的地方。要不要预约一个？' },
];

// 客户分层
const DEFAULT_CUSTOMER_TIERS: CustomerTier[] = [
  { 
    id: '1', 
    name: 'A级热客', 
    grade: 'A', 
    label: '热客',
    description: '高意向客户，活跃互动，已咨询具体服务',
    criteria: ['已咨询价格', '主动询问流程', '表达明确需求', '互动频率高'],
    color: '#22c55e'
  },
  { 
    id: '2', 
    name: 'B级温客', 
    grade: 'B', 
    label: '温客',
    description: '有需求但未明确表达，需要持续跟进',
    criteria: ['评论过相关内容', '下载过资料', '未主动咨询', '偶尔互动'],
    color: '#3b82f6'
  },
  { 
    id: '3', 
    name: 'C级凉客', 
    grade: 'C', 
    label: '凉客',
    description: '兴趣较低或已被竞品截流',
    criteria: ['只点赞', '互动后无回应', '可能已在他处咨询', '长时间无互动'],
    color: '#f59e0b'
  },
  { 
    id: '4', 
    name: 'D级无效', 
    grade: 'D', 
    label: '无效',
    description: '非目标客户或无法转化',
    criteria: ['同行交流', '无效联系方式', '明确拒绝', '多次拉黑'],
    color: '#6b7280'
  },
];

// 产品转化话术
const DEFAULT_PRODUCT_PITCHES: ProductPitch[] = [
  { id: '1', productCategory: 'B', productName: '注册公司', painPoint: '不知道流程、材料不全、反复驳回', benefit: '3-7个工作日完成，省心省力', pitchContent: '老板，注册公司这件事看着简单，但材料不对、流程不清很容易被驳回，来回折腾耽误时间。我们有专业团队帮你全程代办，你只需要提供基础信息，最快3个工作日就能拿到执照。需要的话帮你安排？' },
  { id: '2', productCategory: 'A', productName: '代理记账', painPoint: '专职会计成本高、低价代账不靠谱', benefit: '专业团队+主动预警，性价比高', pitchContent: '你现在代账是什么情况？如果是自己做账，建议了解一下我们的代账服务。不只是帮你做账，还会主动帮你预警税务风险、提醒申报时间、处理异常情况。比你之前找的那种低价代账省心多了。要不要试试？' },
  { id: '3', productCategory: 'C', productName: '税务筹划', painPoint: '税负高、不知道有哪些优惠政策', benefit: '合法合规节税，最高可省50%', pitchContent: '老板，聊了这么多，感觉你的企业税负压力不小。我们有专门的税务筹划服务，可以帮你合法合规地优化税负。根据你的情况，预计每年能节省[X]万。要不要做个详细方案看看？' },
  { id: '4', productCategory: 'D', productName: '培训课程', painPoint: '财税知识缺乏、被坑了才后悔', benefit: '系统学习，少走弯路', pitchContent: '看你对财税这么关注，建议你系统学一下。我们有专门给老板开设的财税必修课，从注册公司到税务筹划全覆盖。内容很实用，帮你避免踩坑。要不要领取试听名额？' },
];

type TabType = 'comment' | 'private' | 'customer' | 'product';

export default function OperationsModule() {
  const [activeTab, setActiveTab] = useState<TabType>('comment');
  const [commentRules, setCommentRules] = useState<CommentKeywordRule[]>(DEFAULT_COMMENT_RULES);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>(DEFAULT_PRIVATE_MESSAGES);
  const [customerTiers] = useState<CustomerTier[]>(DEFAULT_CUSTOMER_TIERS);
  const [productPitches] = useState<ProductPitch[]>(DEFAULT_PRODUCT_PITCHES);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditRule = (rule: CommentKeywordRule) => {
    setEditingRule(rule.id);
    setEditContent(rule.replyTemplate);
  };

  const handleSaveRule = (ruleId: string) => {
    setCommentRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, replyTemplate: editContent } : r
    ));
    setEditingRule(null);
  };

  const tabs = [
    { id: 'comment' as TabType, name: '评论回复SOP', icon: '💬' },
    { id: 'private' as TabType, name: '私信话术', icon: '✉️' },
    { id: 'customer' as TabType, name: '客户分层', icon: '👥' },
    { id: 'product' as TabType, name: '产品话术', icon: '💰' },
  ];

  const productCategoryNames: Record<string, { name: string; desc: string; color: string }> = {
    'B': { name: 'B类注册', desc: '入口产品', color: '#3b82f6' },
    'A': { name: 'A类代账', desc: '留存产品', color: '#10b981' },
    'C': { name: 'C类税筹', desc: '利润产品', color: '#f59e0b' },
    'D': { name: 'D类课程', desc: '杠杆产品', color: '#8b5cf6' },
  };

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        <div className="bg-card border border-border rounded-xl p-4 animate-fade-in">
          {/* Tab切换 */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-primary text-white' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 评论回复SOP */}
        {activeTab === 'comment' && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-module-red/20 flex items-center justify-center">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">评论回复SOP</h2>
                <p className="text-sm text-muted-foreground">东风 · 精准触达</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">使用说明</div>
              <p className="text-sm">当用户在评论区触发关键词时，自动发送对应话术和资料</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {commentRules.map(rule => (
                <div 
                  key={rule.id}
                  className="p-4 bg-background border border-border rounded-lg hover:border-amber-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
                        {rule.keyword.slice(0, 2)}
                      </span>
                      <span className="font-semibold text-amber-300">#{rule.keyword}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                        优先级 {rule.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        <EditIcon size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleCopy(rule.replyTemplate, rule.id)}
                        className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                      >
                        {copiedId === rule.id ? (
                          <CheckIcon size={14} className="text-green-500" />
                        ) : (
                          <CopyIcon size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {editingRule === rule.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-24 p-2 bg-muted border border-border rounded text-sm resize-none focus:outline-none focus:border-primary"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveRule(rule.id)}
                          className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingRule(null)}
                          className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded hover:bg-muted/80"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 发放资料 */}
                      <div className="mb-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-400 font-medium">📦 发放资料：</span>
                          <span className="text-green-300">{rule.materialToSend}</span>
                        </div>
                      </div>
                      {/* 回复话术 */}
                      <div className="p-2.5 bg-muted/50 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1.5">回复话术</div>
                        <p className="text-sm leading-relaxed">{rule.replyTemplate}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 私信话术 */}
        {activeTab === 'private' && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-module-red/20 flex items-center justify-center">
                <span className="text-xl">✉️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">私信跟进话术</h2>
                <p className="text-sm text-muted-foreground">3段式精准跟进</p>
              </div>
            </div>

            <div className="space-y-4">
              {privateMessages.map((msg, idx) => (
                <div 
                  key={msg.id}
                  className={`p-4 rounded-lg border ${
                    msg.stage === 'first' ? 'bg-blue-500/10 border-blue-500/30' :
                    msg.stage === 'follow' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-green-500/10 border-green-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        msg.stage === 'first' ? 'bg-blue-500' :
                        msg.stage === 'follow' ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">
                        {msg.stage === 'first' ? '第1条：标雷点' :
                         msg.stage === 'follow' ? '第2条：给动作+引导' :
                         '第3条：诊断+报价'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <CheckIcon size={14} className="text-green-500" />
                      ) : (
                        <CopyIcon size={14} className="text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  
                  <p className="text-sm leading-relaxed">{msg.content}</p>

                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-muted-foreground">
                    {msg.stage === 'first' && '• 引发关注，建立联系'}
                    {msg.stage === 'follow' && '• 提供价值，收集需求'}
                    {msg.stage === 'conversion' && '• 推动决策，促成转化'}
                  </div>
                </div>
              ))}
            </div>

            {/* 使用说明 */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium mb-2">跟进节奏建议</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">1</span>
                  <span>评论后30分钟内发送第1条</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center">2</span>
                  <span>用户无回应后1天发送第2条</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-green-500/20 text-green-400 flex items-center justify-center">3</span>
                  <span>第2条发送后2天无回应发送第3条</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 客户分层 */}
        {activeTab === 'customer' && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-module-red/20 flex items-center justify-center">
                <UsersIcon className="module-red" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">客户分层管理</h2>
                <p className="text-sm text-muted-foreground">精准识别，差异化跟进</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {customerTiers.map(tier => (
                <div 
                  key={tier.id}
                  className="p-3 rounded-lg border"
                  style={{ borderColor: `${tier.color}40`, backgroundColor: `${tier.color}10` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.grade}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{tier.name}</div>
                      <div className="text-xs text-muted-foreground">{tier.label}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </div>
              ))}
            </div>

            {/* 判定标准 */}
            <h4 className="text-sm font-medium mb-3">分层判定标准</h4>
            <div className="flex-1 overflow-y-auto space-y-3">
              {customerTiers.map(tier => (
                <div key={tier.id} className="p-3 bg-background rounded-lg border" style={{ borderColor: `${tier.color}30` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: tier.color }}
                    >
                      {tier.grade}
                    </div>
                    <span className="font-medium text-sm">{tier.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tier.criteria.map((c, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 产品话术 */}
        {activeTab === 'product' && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-module-red/20 flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">产品转化话术</h2>
                <p className="text-sm text-muted-foreground">4类产品精准匹配</p>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {productPitches.map(pitch => {
                const cat = productCategoryNames[pitch.productCategory];
                return (
                  <div 
                    key={pitch.id}
                    className="p-4 rounded-lg border"
                    style={{ borderColor: `${cat.color}40`, backgroundColor: `${cat.color}08` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.name}
                        </span>
                        <span className="font-medium">{pitch.productName}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(pitch.pitchContent, pitch.id)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      >
                        {copiedId === pitch.id ? (
                          <CheckIcon size={14} className="text-green-500" />
                        ) : (
                          <CopyIcon size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs text-red-400 mb-1">痛点</div>
                      <p className="text-sm text-muted-foreground">{pitch.painPoint}</p>
                    </div>

                    <div className="mb-3">
                      <div className="text-xs text-green-400 mb-1">收益</div>
                      <p className="text-sm text-muted-foreground">{pitch.benefit}</p>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <div className="text-xs text-muted-foreground mb-1">话术</div>
                      <p className="text-sm leading-relaxed">{pitch.pitchContent}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 快捷操作 */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
          <h3 className="font-medium mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const allRules = commentRules.map(r => r.keyword).join('、');
                handleCopy(allRules, 'keywords');
              }}
              className="p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all text-left"
            >
              <div className="text-sm font-medium mb-1">复制所有关键词</div>
              <div className="text-xs text-muted-foreground">快速获取11个预设关键词</div>
            </button>
            <button
              onClick={() => {
                const allPitches = productPitches.map(p => `${productCategoryNames[p.productCategory].name}：${p.productName}`).join('\n');
                handleCopy(allPitches, 'products');
              }}
              className="p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all text-left"
            >
              <div className="text-sm font-medium mb-1">复制产品清单</div>
              <div className="text-xs text-muted-foreground">快速获取4类产品列表</div>
            </button>
          </div>
        </div>

        {/* 工作流说明 */}
        <div className="bg-card border border-border rounded-xl p-5 flex-1">
          <h3 className="font-medium mb-4">私域运营工作流</h3>
          
          <div className="space-y-4">
            <WorkflowStep
              step={1}
              icon="💬"
              title="评论触达"
              description="用户评论触发关键词 → 自动回复话术 + 发放资料"
              example="用户评论「避坑」→ 自动回复避坑指南"
            />
            <WorkflowStep
              step={2}
              icon="👀"
              title="私信承接"
              description="添加微信后 → 按节奏发送3段话术"
              example="第1天：标雷点 → 第2天：给动作 → 第4天：诊断报价"
            />
            <WorkflowStep
              step={3}
              icon="📊"
              title="客户分层"
              description="根据互动行为 → 判定客户等级 → 差异化跟进"
              example="A级热客重点跟 → B级温客持续养 → C级凉客偶尔触达"
            />
            <WorkflowStep
              step={4}
              icon="💰"
              title="产品转化"
              description="匹配客户需求 → 推送对应产品话术 → 促成成交"
              example="关注注册问题 → 推注册服务 → 关注税负 → 推税筹服务"
            />
          </div>

          {/* 话术框架总结 */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-medium mb-2">话术框架</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-background rounded border border-border">
                <div className="text-primary mb-1">钩子开场</div>
                <div className="text-muted-foreground">引发好奇 / 制造紧迫 / 点明痛点</div>
              </div>
              <div className="p-2 bg-background rounded border border-border">
                <div className="text-amber-400 mb-1">价值展示</div>
                <div className="text-muted-foreground">解决问题 / 展示优势 / 案例佐证</div>
              </div>
              <div className="p-2 bg-background rounded border border-border">
                <div className="text-green-400 mb-1">行动引导</div>
                <div className="text-muted-foreground">明确动作 / 降低门槛 / 限时优惠</div>
              </div>
              <div className="p-2 bg-background rounded border border-border">
                <div className="text-purple-400 mb-1">信任强化</div>
                <div className="text-muted-foreground">权威背书 / 客户见证 / 效果承诺</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ 
  step, 
  icon, 
  title, 
  description, 
  example 
}: { 
  step: number; 
  icon: string; 
  title: string; 
  description: string; 
  example: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div className="w-px h-full bg-border mt-2" style={{ minHeight: '40px' }} />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded bg-primary text-white text-xs flex items-center justify-center font-medium">
            {step}
          </span>
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-primary/70 mt-1">{example}</p>
      </div>
    </div>
  );
}
