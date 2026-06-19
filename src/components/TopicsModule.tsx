'use client';

import React, { useState } from 'react';
import { LightbulbIcon, CopyIcon, TrashIcon, CheckIcon, PlusIcon, ChevronDownIcon, FileTextIcon, UsersIcon, TargetIcon, TrendingUpIcon, ArrowRightIcon, SparklesIcon } from '@/components/icons';
import { Topic, AccountType, MainTopicType, SecondaryTopicType, TargetAudience, ContentFramework, TopicType } from '@/lib/types';
import { getTopics, addTopic, deleteTopic, generateId, getAccountName, getTopicTypeName, getAudienceName, getFrameworkName } from '@/lib/storage';

const ACCOUNTS = [
  { id: 'main' as AccountType, name: '主号-张老师老板财税', label: '张老师老板财税', desc: '主号-专业权威定位' },
  { id: 'secondary' as AccountType, name: '副号-创业老板第一站', label: '创业老板的第一站', desc: '副号-亲和实用定位' },
];

const MAIN_TOPIC_TYPES = [
  { id: 'risk-trigger' as MainTopicType, name: '风险触发型', desc: '引发焦虑痛点', framework: 'C' as ContentFramework },
  { id: 'case-analysis' as MainTopicType, name: '案例拆解型', desc: '真实案例展示', framework: 'A' as ContentFramework },
  { id: 'policy-interpret' as MainTopicType, name: '政策解读型', desc: '最新政策分析', framework: 'C' as ContentFramework },
  { id: 'course-attract' as MainTopicType, name: '课程引流型', desc: '引导付费课程', framework: 'D' as ContentFramework },
];

const SECONDARY_TOPIC_TYPES = [
  { id: 'register-avoid' as SecondaryTopicType, name: '注册避坑型', desc: '注册常见误区', framework: 'B' as ContentFramework },
  { id: 'process-science' as SecondaryTopicType, name: '流程科普型', desc: '注册流程详解', framework: 'B' as ContentFramework },
  { id: 'startup-remind' as SecondaryTopicType, name: '创业提醒型', desc: '创业注意事项', framework: 'A' as ContentFramework },
  { id: 'agency-common' as SecondaryTopicType, name: '代账常识型', desc: '代账知识科普', framework: 'A' as ContentFramework },
];

const TARGET_AUDIENCES = [
  { id: 'startup' as TargetAudience, name: '创业初期老板' },
  { id: 'small-biz' as TargetAudience, name: '小微企业主' },
  { id: 'medium-biz' as TargetAudience, name: '中小企业主' },
  { id: 'founder' as TargetAudience, name: '公司创始人' },
  { id: 'cfo' as TargetAudience, name: '财务负责人' },
];

const FRAMEWORK_SEQUENCE = [
  { letter: 'B', name: '注册公司', role: '入口引流', color: '#3B82F6' },
  { letter: 'A', name: '代账服务', role: '留存转化', color: '#10B981' },
  { letter: 'C', name: '税务筹划', role: '利润提升', color: '#F59E0B' },
  { letter: 'D', name: '培训课程', role: '杠杆放大', color: '#8B5CF6' },
];

// 选题模板库
const TOPIC_TEMPLATES: Record<string, { templates: string[], cores: string[], hooks: string[], paths: string[], audiences: TargetAudience[] }> = {
  'risk-trigger': {
    templates: [
      '注册公司时忽略这3点，99%的老板都踩过坑',
      '公司注册资金写错了，老板们现在看还来得及',
      '为什么你的公司总是被查？财务可能没告诉你这些',
      '金税四期上线后，这5种转账方式千万别碰',
      '小规模纳税人变一般纳税人前，一定要知道的事',
    ],
    cores: [
      '揭露注册公司中的3大高危风险点',
      '注册资金的填写陷阱与法律风险',
      '企业被税务稽查的常见原因深度解析',
      '公转私的合规边界与风险控制',
      '纳税人身份转换的注意事项与影响',
    ],
    hooks: ['打“风险”发你排查表', '打“坑”发你避坑指南', '打“安全”发你合规清单', '打“自查”发你自检清单', '打“名单”发你高危企业名单'],
    paths: ['引流私域 → 发放风险排查表 → 预约诊断 → 税筹方案', '评论区引导 → 私信回复 → 资料包发放 → 深度咨询', '引导评论“666” → 发合规清单 → 建联'],
    audiences: ['startup', 'founder', 'small-biz'],
  },
  'case-analysis': {
    templates: [
      '真实案例：某科技公司如何一年省税200万',
      '餐饮老板踩坑实录：从被罚50万到合规节税',
      '电商企业成本票缺失的血泪教训',
      '建筑劳务公司的灵活用工税务筹划方案',
      '股权转让中的税务坑，看完能省几十万',
    ],
    cores: [
      '某科技公司研发费用加计扣除实操案例',
      '餐饮行业成本票管理的教训与解决方案',
      '电商企业刷单收入的合规处理方案',
      '建筑行业灵活用工模式的税务优化',
      '股权转让个人所得税的合规筹划路径',
    ],
    hooks: ['打“案例”发你案例资料', '打“省税”发你方案', '打“方案”发你模板', '打“模板”发你工具包', '打“工具”发你使用指南'],
    paths: ['激发兴趣 → 私信索取 → 发案例资料 → 预约咨询 → 签单', '评论区问价 → 私信报价 → 诊断后签单'],
    audiences: ['founder', 'cfo', 'medium-biz'],
  },
  'policy-interpret': {
    templates: [
      '重磅！2024年小微企业税收优惠全解读',
      '刚刚！增值税小规模纳税人免税标准又变了',
      '残保金优惠政策延续，老板们快来看',
      '研发费用加计扣除最新政策变化',
      '个人所得税专项附加扣除6大变化',
    ],
    cores: [
      '小微企业增值税和企业所得税优惠详解',
      '小规模纳税人免税标准的调整与影响',
      '残保金优惠政策的具体内容与申请',
      '研发费用加计扣除政策的适用范围',
      '个税专项附加扣除的最新变化解读',
    ],
    hooks: ['打“政策”发你汇总', '打“优惠”发你清单', '打“申报”发你指南', '打“指南”发你模板', '打“福利”发你领取方式'],
    paths: ['政策解读 → 评论区提问 → 私信解答 → 引导咨询 → 预约服务', '发放政策汇总 → 引流私域 → 资料包 → 咨询转化'],
    audiences: ['founder', 'small-biz', 'cfo'],
  },
  'course-attract': {
    templates: [
      '价值2999元的注册公司全流程，今晚免费送',
      '老板必学的财税必修课，限时0元领取',
      '财务小白7天训练营，现在报名还来得及',
      '金税四期应对指南课程，今晚截止免费',
      '创业财税风险防控课，送完即止',
    ],
    cores: [
      '注册公司全流程实操课程介绍',
      '老板财税必修知识体系课程',
      '财务小白入门训练营课程内容',
      '金税四期企业应对策略课程',
      '创业期财税风险防控课程',
    ],
    hooks: ['打“课程”发你报名', '打“学习”发你入口', '打“领取”发你方式', '打“免费”发你名额', '打“报名”发你链接'],
    paths: ['免费领取 → 私域沉淀 → 课程体验 → 正价转化', '评论区索课 → 发免费名额 → 引导正价'],
    audiences: ['startup', 'founder'],
  },
  'register-avoid': {
    templates: [
      '注册公司前不知道这5点，绝对会后悔',
      '公司注册地址选择错误，后果很严重',
      '经营范围填错了，税务找上门',
      '注册资金写的太少，客户不敢合作',
      '注册公司最容易踩的8个坑',
    ],
    cores: [
      '注册公司前的5个关键注意事项',
      '公司注册地址选择的合规性要求',
      '经营范围的规范填写与税务影响',
      '注册资金与客户信任度的关系',
      '公司注册常见问题与解决方案',
    ],
    hooks: ['打“避坑”发你清单', '打“注册”发你流程', '打“地址”发你指南', '打“清单”发你模板', '打“流程”发你步骤'],
    paths: ['避坑清单 → 引流私域 → 注册服务咨询', '评论区咨询 → 私信指导 → 代办服务'],
    audiences: ['startup', 'founder'],
  },
  'process-science': {
    templates: [
      '2024年注册公司全流程，看这一篇就够了',
      '手把手教你3天搞定营业执照',
      '公司注册需要准备什么？一张图讲清楚',
      '注册资金要交多少？一文读懂',
      '个体户和公司有什么区别？选错了多交税',
    ],
    cores: [
      '注册公司全流程与时间节点',
      '营业执照办理的具体步骤',
      '注册公司所需材料的详细清单',
      '注册资金的认缴与实缴区别',
      '个体工商户与企业类型的对比分析',
    ],
    hooks: ['打“流程”发你清单', '打“材料”发你列表', '打“执照”发你模板', '打“表格”发你下载', '打“对比”发你分析'],
    paths: ['流程科普 → 评论区问题 → 私信解答 → 注册代办', '资料发放 → 咨询转化 → 代办服务'],
    audiences: ['startup'],
  },
  'startup-remind': {
    templates: [
      '创业第一年，老板最容易犯的5个财税错误',
      '公司成立后90天内必须做的事',
      '新公司第一年，财务要注意什么',
      '创业初期，老板必须了解的财税知识',
      '首年经营，这几项财税工作千万别忘',
    ],
    cores: [
      '创业初期常见的财税错误与纠正',
      '公司成立后的税务登记与申报事项',
      '新公司首年财务工作的重点内容',
      '创业初期老板必备财税知识清单',
      '首年经营必须完成的财税事项',
    ],
    hooks: ['打“提醒”发你清单', '打“90天”发你指南', '打“清单”发你列表', '打“必做”发你事项', '打“首年”发你攻略'],
    paths: ['提醒清单 → 引流私域 → 代账服务', '评论区咨询 → 私信指导 → 代账签约'],
    audiences: ['startup', 'founder'],
  },
  'agency-common': {
    templates: [
      '代理记账每月多少钱？行业内情揭秘',
      '为什么建议小公司找代账？',
      '低价代账的3大陷阱，千万别踩',
      '代账公司都做什么？一文讲清楚',
      '如何选择靠谱的代理记账公司',
    ],
    cores: [
      '代理记账市场价格体系与收费明细',
      '小微企业选择代账服务的优势分析',
      '低价代账服务的风险与隐患',
      '代理记账服务的具体内容与范围',
      '选择代账公司的标准与注意事项',
    ],
    hooks: ['打“价格”发你报价', '打“陷阱”发你避坑', '打“选择”发你标准', '打“服务”发你清单', '打“对比”发你指南'],
    paths: ['价格咨询 → 私信报价 → 预约考察 → 签单', '避坑指南 → 引流私域 → 代账转化'],
    audiences: ['startup', 'small-biz'],
  },
};

export default function TopicsModule() {
  const [account, setAccount] = useState<AccountType>('main');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [topics, setTopics] = useState<Topic[]>(() => getTopics());
  const [generatedTopics, setGeneratedTopics] = useState<Topic[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const topicTypes = account === 'main' ? MAIN_TOPIC_TYPES : SECONDARY_TOPIC_TYPES;

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const generateTopics = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const newTopics: Topic[] = [];
      const typesToUse = selectedTypes.length > 0 ? selectedTypes : topicTypes.map(t => t.id);
      const numToGenerate = Math.min(Math.max(count, 1), 20);

      for (let i = 0; i < numToGenerate; i++) {
        const randomType = typesToUse[Math.floor(Math.random() * typesToUse.length)];
        const templateData = TOPIC_TEMPLATES[randomType];
        if (!templateData) continue;

        const templateIdx = Math.floor(Math.random() * templateData.templates.length);
        const coreIdx = Math.floor(Math.random() * templateData.cores.length);
        const hookIdx = Math.floor(Math.random() * templateData.hooks.length);
        const pathIdx = Math.floor(Math.random() * templateData.paths.length);
        const audienceIdx = Math.floor(Math.random() * templateData.audiences.length);

        const typeInfo = topicTypes.find(t => t.id === randomType);
        
        newTopics.push({
          id: generateId(),
          title: templateData.templates[templateIdx],
          account,
          accountName: getAccountName(account),
          type: randomType as TopicType,
          typeName: getTopicTypeName(randomType, account),
          framework: typeInfo?.framework || 'A',
          coreContent: templateData.cores[coreIdx],
          targetAudience: [templateData.audiences[audienceIdx]],
          targetAudienceName: getAudienceName(templateData.audiences[audienceIdx]),
          hookPhrase: templateData.hooks[hookIdx],
          conversionPath: templateData.paths[pathIdx],
          duration: 45 + Math.floor(Math.random() * 30),
          heatIndex: 60 + Math.floor(Math.random() * 40),
          createdAt: new Date().toISOString(),
        });
      }

      setGeneratedTopics(newTopics);
      setIsGenerating(false);
    }, 1500);
  };

  const saveToLibrary = (topic: Topic) => {
    const updated = [topic, ...topics];
    setTopics(updated);
    addTopic(topic);
  };

  const saveAllToLibrary = () => {
    if (generatedTopics.length > 0) {
      const updated = [...generatedTopics, ...topics];
      setTopics(updated);
      generatedTopics.forEach(t => addTopic(t));
      setGeneratedTopics([]);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = topics.filter(t => t.id !== id);
    setTopics(updated);
    deleteTopic(id);
  };

  const frameworkColorMap: Record<string, string> = {
    'B': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'A': 'bg-green-500/20 text-green-400 border-green-500/30',
    'C': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'D': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-module-blue/20 flex items-center justify-center">
              <LightbulbIcon className="module-blue" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">选题生成</h2>
              <p className="text-sm text-muted-foreground">特劳特 · 灵感迸发</p>
            </div>
          </div>

          {/* 账号选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">选择账号</label>
            <div className="relative">
              <select
                value={account}
                onChange={(e) => {
                  setAccount(e.target.value as AccountType);
                  setSelectedTypes([]);
                }}
                className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all appearance-none cursor-pointer font-medium"
              >
                {ACCOUNTS.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {account === 'main' ? '主号内容：风险触发型、案例拆解型、政策解读型、课程引流型' : '副号内容：注册避坑型、流程科普型、创业提醒型、代账常识型'}
            </p>
          </div>

          {/* 内容类型 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-3">
              内容类型（可多选，未选则全部生成）
            </label>
            <div className="grid grid-cols-2 gap-2">
              {topicTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeToggle(type.id)}
                  className={`p-3 rounded-lg border text-left transition-all btn-press ${
                    selectedTypes.includes(type.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span className={`block text-sm font-medium ${
                    selectedTypes.includes(type.id) ? 'text-primary' : ''
                  }`}>
                    {type.name}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{type.desc}</span>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                    frameworkColorMap[type.framework]
                  }`}>
                    {type.framework}类-{type.framework === 'B' ? '入口' : type.framework === 'A' ? '留存' : type.framework === 'C' ? '利润' : '杠杆'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 框架说明 */}
          <div className="mb-6 p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">内容框架逻辑</div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {FRAMEWORK_SEQUENCE.map((fw, idx) => (
                <React.Fragment key={fw.letter}>
                  <div className="flex flex-col items-center px-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: fw.color }}
                    >
                      {fw.letter}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">{fw.name}</span>
                  </div>
                  {idx < FRAMEWORK_SEQUENCE.length - 1 && (
                    <div className="w-6 h-px bg-border flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 生成数量 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">生成数量</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="w-12 h-10 bg-background border border-border rounded-lg flex items-center justify-center font-mono-num">
                {count}
              </div>
            </div>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={generateTopics}
            disabled={isGenerating}
            className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="text-amber-300" />
                <span>生成选题</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 新生成选题 */}
        {generatedTopics.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-module-blue animate-pulse" />
                新生成选题（{generatedTopics.length}个）
              </h3>
              <button
                onClick={saveAllToLibrary}
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <PlusIcon size={14} />
                一键保存全部
              </button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {generatedTopics.map((topic, index) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  index={index}
                  onCopy={handleCopy}
                  onSave={saveToLibrary}
                  copiedId={copiedId}
                  showSave
                />
              ))}
            </div>
          </div>
        )}

        {/* 选题库 */}
        <div className="bg-card border border-border rounded-xl p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">选题库</h3>
            <span className="text-sm text-muted-foreground">{topics.length} 个选题</span>
          </div>
          
          {topics.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <LightbulbIcon size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无保存的选题</p>
                <p className="text-sm mt-1">生成选题后可一键保存</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {topics.map((topic, index) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  index={index + 1}
                  onCopy={handleCopy}
                  onDelete={handleDelete}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  index,
  onCopy,
  onSave,
  onDelete,
  copiedId,
  showSave = false,
}: {
  topic: Topic;
  index: number;
  onCopy: (text: string, id: string) => void;
  onSave?: (topic: Topic) => void;
  onDelete?: (id: string) => void;
  copiedId: string | null;
  showSave?: boolean;
}) {
  const frameworkColorMap: Record<string, string> = {
    'B': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'A': 'bg-green-500/20 text-green-400 border-green-500/30',
    'C': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'D': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="p-5 bg-background border border-border rounded-lg hover:border-primary/50 transition-all group">
      <div className="flex items-start gap-4">
        <span className="w-7 h-7 bg-primary/20 text-primary text-sm font-bold rounded-lg flex items-center justify-center shrink-0">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          {/* 标题 - 大字加粗 */}
          <h4 className="text-base font-bold leading-snug text-foreground mb-3">
            {topic.title}
          </h4>
          
          {/* 核心内容 */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <FileTextIcon size={12} className="text-primary" />
              核心内容
            </span>
            <p className="text-sm text-foreground/80">{topic.coreContent}</p>
          </div>
          
          {/* 目标人群 */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <UsersIcon size={12} className="text-green-500" />
              目标人群
            </span>
            <div className="flex items-center gap-2">
              <span className={`tag ${topic.account === 'main' ? 'tag-blue' : 'tag-purple'}`}>
                {topic.accountName}
              </span>
              <span className="tag">{topic.targetAudienceName}</span>
            </div>
          </div>
          
          {/* 自诊钩子 - 格式固定 */}
          <div className="mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 mb-1">
              <TargetIcon size={12} />
              自诊钩子
            </span>
            <p className="text-sm font-semibold text-amber-300">
              {topic.hookPhrase.split(/(打"[^"]+")发你/).map((part, idx) => {
                if (part.startsWith('打"')) {
                  const keyword = part.match(/"([^"]+)"/)?.[1] || '';
                  return <React.Fragment key={idx}>打「<span className="text-amber-200 underline decoration-amber-400/50">{keyword}</span>」发你</React.Fragment>;
                }
                return part;
              })}
            </p>
          </div>
          
          {/* 预估转化路径 */}
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUpIcon size={12} className="text-purple-500" />
              预估转化路径
            </span>
            <div className="flex flex-wrap gap-1 items-center">
              {topic.conversionPath.split(' → ').map((step, i, arr) => (
                <React.Fragment key={i}>
                  <span className="text-xs text-foreground/70 bg-muted/50 px-2 py-0.5 rounded">{step}</span>
                  {i < arr.length - 1 && <ArrowRightIcon size={12} className="text-muted-foreground/50" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          
          {/* 标签行 */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`tag ${frameworkColorMap[topic.framework]}`}>
              {topic.framework}类-{topic.typeName}
            </span>
            <span className="tag">{topic.duration}秒</span>
            <span className="tag">热度 {topic.heatIndex}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {showSave && onSave && (
            <button
              onClick={() => onSave(topic)}
              className="p-2 rounded-lg hover:bg-green-500/10 transition-colors"
              title="保存到选题库"
            >
              <PlusIcon size={16} className="text-green-500" />
            </button>
          )}
          <button
            onClick={() => onCopy(topic.title, topic.id)}
            className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
            title="复制标题"
          >
            {copiedId === topic.id ? (
              <CheckIcon size={16} className="text-green-500" />
            ) : (
              <CopyIcon size={16} className="text-muted-foreground" />
            )}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(topic.id)}
              className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="删除"
            >
              <TrashIcon size={16} className="text-red-500/70" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
