'use client';

import React, { useState, useCallback } from 'react';
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

// 选题模板库 - 财税行业真实场景选题池
const TOPIC_TEMPLATES: Record<string, { templates: string[], cores: string[], hooks: string[], paths: string[], audiences: TargetAudience[] }> = {
  // 主号-风险触发型（10个）
  'risk-trigger': {
    templates: [
      '公司账上趴着300万但你可能一分都拿不走',
      '你的公司可能正在裸奔90%的老板不知道',
      '公转私超过这个数已经在系统雷达上了',
      '你的会计可能正在给你埋雷',
      '3年前一笔走账现在可能变成50万罚单',
      '有限公司的有限两个字可能保不了你',
      '你以为的正常操作在税务眼里叫避税',
      '年报里这个数字填错罚单自动生成',
      '去年注销的公司今年还能被查出问题',
      '金税四期上线后这3类企业首当其冲',
    ],
    cores: [
      '公转私的税务陷阱',
      '历史遗留问题4大类型',
      '公私账户混用红线',
      '代账操作隐性风险',
      '历史往来款追溯',
      '股东连带责任触发条件',
      '合法节税vs非法避税',
      '工商年报与税务数据交叉比对',
      '注销不等于安全',
      '金税四期数据穿透',
    ],
    hooks: [
      '打「自检」发你企业财税风险自检表',
      '打「雷点」发你行业3大财税雷',
      '打「雷达」发你风控触发线清单',
      '打「换过」发你代账交接7个必查点',
      '打「排查」发你往来款排查清单',
      '打「有限责任」发你5种股东自掏腰包情况',
      '打「灰色」发你6个灰色操作对照表',
      '打「年报」发你年报3个坑',
      '打「注销」发你3个必须查的遗留项',
      '打「金税」发你3类高危企业特征清单',
    ],
    paths: [
      '打关键词→领自检表→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
    ],
    audiences: ['founder', 'founder', 'founder', 'founder', 'founder', 'founder', 'founder', 'founder', 'founder', 'founder'],
  },
  // 主号-案例拆解型（6个）
  'case-analysis': {
    templates: [
      '利润200万的公司税后到手不到80万问题出在哪',
      '被稽查后补了120万但如果3年前做一步只需8万',
      '两个股东反目翻出3年前的账谁最受伤',
      '卖了公司2年后收到税局通知补缴68万',
      '一家贸易公司的账税务翻出了5个看不见的雷',
      '注册资金填了5000万3年后才知道这意味着什么',
    ],
    cores: [
      '利润分配与税负结构',
      '历史问题早发现晚发现天壤之别',
      '股东纠纷历史账务',
      '股权转让历史遗留税负',
      '稽查视角5大常见隐患',
      '注册资金历史遗留问题',
    ],
    hooks: [
      '打「税负」发你税负率自测表',
      '打「对比」发你早晚发现成本对照',
      '打「合伙」发你合伙避坑清单',
      '打「转让」发你股权转让避坑指南',
      '打「5个雷」发你自查清单',
      '打「资金」发你风险对照表',
    ],
    paths: [
      '打关键词→领自测表→私信→C类',
      '打关键词→领对照→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领指南→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领对照表→私信→C类',
    ],
    audiences: ['founder', 'founder', 'founder', 'founder', 'founder', 'founder'],
  },
  // 主号-政策解读型（5个）
  'policy-interpret': {
    templates: [
      '金税四期上线后这3类企业首当其冲',
      '2026年稽查重点变了别再用去年的经验',
      '数电票全面推开后你的历史发票可能全要翻一遍',
      '这个新规7月生效你的公司可能刚好踩线',
      '个人养老金新政策老板自己的钱怎么放最划算',
    ],
    cores: [
      '金税四期数据穿透',
      '最新稽查方向',
      '数电票与历史发票交叉稽查',
      '即将生效政策影响面',
      '老板个人税务优化',
    ],
    hooks: [
      '打「金税」发你3类高危企业清单',
      '打「稽查」发你本年度重点稽查领域清单',
      '打「数电票」发你过渡期自查清单',
      '打「7月新规」发你影响对照表',
      '打「养老」发你老板养老金方案对照',
    ],
    paths: [
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领清单→私信→C类',
      '打关键词→领对照表→私信→C类',
      '打关键词→领对照→私信→C类',
    ],
    audiences: ['founder', 'founder', 'founder', 'founder', 'founder'],
  },
  // 主号-课程引流型（5个）
  'course-attract': {
    templates: [
      '老板自己不会看报表你确定公司是你的',
      '这9个财税问题不懂你的公司随时关门',
      '创业第一课不是找客户是先把财税搞明白',
      '金税四期下老板必须掌握的3个自保技能',
      '价值2999元的税筹课今晚免费送',
    ],
    cores: [
      '3个必看报表指标',
      '创业期9大财税生死线',
      '财税认知决定企业寿命',
      '金税四期老板自保三板斧',
      '系统税筹方案学习',
    ],
    hooks: [
      '左下角199元入门课12节带你从0到能看懂',
      '评论区扣「学习」发你课程目录',
      '关注后私信「创业财税」领取入门资料',
      '评论区扣「自保」发你技能清单',
      '评论区扣「税筹课」发你领取方式',
    ],
    paths: [
      '买D类课程→C类筛选',
      '领资料→进群→课程转化',
      '关注→私信→资料→课程',
      '买课→学习→升单C类',
      '买课→升单C类',
    ],
    audiences: ['founder', 'startup', 'startup', 'founder', 'founder'],
  },
  // 副号-注册避坑型（8个）
  'register-avoid': {
    templates: [
      '注册公司前不知道这5点绝对后悔',
      '注册资金填错一个字后来赔了50万',
      '经营范围乱写税务找上门都不知道',
      '公司注册地址踩坑全怪当初没看这篇',
      '法人和监事的坑80%的创业者不知道',
      '注册公司股权分配踩坑后来撕了一年半',
      '小规模和一般纳税人选错多交10万税',
      '公司起名踩的雷看完少走3个月弯路',
    ],
    cores: [
      '注册前必须搞清楚的5个法律问题',
      '注册资金填写的法律风险',
      '经营范围的合规性填写要点',
      '注册地址选择的合规与风险',
      '法人监事的法律风险与责任',
      '股权分配的法律设计',
      '纳税人身份选择的税务影响',
      '公司命名的合规与品牌考量',
    ],
    hooks: [
      '打「注册」发你避坑清单',
      '打「资金」发你填写指南',
      '打「范围」发你填写模板',
      '打「地址」发你选择指南',
      '打「法人」发你风险提示',
      '打「股权」发你分配方案',
      '打「小规模」发你选择攻略',
      '打「名字」发你起名规范',
    ],
    paths: [
      '打关键词→领清单→私信→B类',
      '打关键词→领指南→私信→B类',
      '打关键词→领模板→私信→B类',
      '打关键词→领指南→私信→B类',
      '打关键词→领提示→私信→B类',
      '打关键词→领方案→私信→B类',
      '打关键词→领攻略→私信→B类',
      '打关键词→领规范→私信→B类',
    ],
    audiences: ['startup', 'startup', 'startup', 'startup', 'startup', 'startup', 'startup', 'startup'],
  },
  // 副号-流程科普型（6个）
  'process-science': {
    templates: [
      '2025年注册公司全流程看这一篇就够了',
      '手把手教你3天拿到营业执照',
      '注册公司需要准备什么一张图讲清楚',
      '注册资金要交多少一文读懂',
      '个体户和公司有什么区别选错了多交税',
      '银行开户全流程及避坑指南',
    ],
    cores: [
      '注册公司全流程与时间节点',
      '营业执照办理的具体步骤',
      '注册所需材料的详细清单',
      '注册资金认缴与实缴区别',
      '个体工商户与企业类型对比',
      '银行开户流程与注意事项',
    ],
    hooks: [
      '打「流程」发你清单',
      '打「执照」发你模板',
      '打「材料」发你列表',
      '打「资金」发你解读',
      '打「个体」发你对比',
      '打「开户」发你指南',
    ],
    paths: [
      '领清单→咨询→B类注册',
      '领模板→咨询→B类注册',
      '领列表→咨询→B类注册',
      '领解读→咨询→B类注册',
      '领对比→咨询→B类注册',
      '领指南→咨询→B类注册',
    ],
    audiences: ['startup', 'startup', 'startup', 'startup', 'startup', 'startup'],
  },
  // 副号-创业提醒型（5个）
  'startup-remind': {
    templates: [
      '创业第一年老板最容易犯的5个财税错误',
      '公司成立后90天内必须做的事',
      '新公司第一年财务要注意什么',
      '创业初期老板必须了解的财税知识',
      '首年经营这几项财税工作千万别忘',
    ],
    cores: [
      '创业初期常见财税错误与纠正',
      '公司成立后的税务登记与申报',
      '新公司首年财务工作重点',
      '创业初期老板必备财税知识',
      '首年经营必须完成的财税事项',
    ],
    hooks: [
      '打「提醒」发你清单',
      '打「90天」发你指南',
      '打「清单」发你列表',
      '打「必做」发你事项',
      '打「首年」发你攻略',
    ],
    paths: [
      '领清单→引流→A类代账',
      '领指南→引流→A类代账',
      '领列表→引流→A类代账',
      '领事项→引流→A类代账',
      '领攻略→引流→A类代账',
    ],
    audiences: ['startup', 'startup', 'startup', 'startup', 'startup'],
  },
  // 副号-代账常识型（6个）
  'agency-common': {
    templates: [
      '代理记账每月多少钱行业内情揭秘',
      '为什么建议小公司找代账',
      '低价代账的3大陷阱千万别踩',
      '代账公司都做什么一文讲清楚',
      '如何选择靠谱的代理记账公司',
      '代账交接这7个点必须查',
    ],
    cores: [
      '代账市场价格体系与收费明细',
      '小微企业选择代账的优势分析',
      '低价代账服务的风险与隐患',
      '代账服务的具体内容与范围',
      '选择代账公司的标准与注意事项',
      '代账交接的必查事项清单',
    ],
    hooks: [
      '打「价格」发你报价',
      '打「陷阱」发你避坑',
      '打「选择」发你标准',
      '打「服务」发你清单',
      '打「对比」发你指南',
      '打「交接」发你清单',
    ],
    paths: [
      '价格咨询→私信报价→A类代账',
      '避坑指南→引流→A类代账',
      '选标准→咨询→A类代账',
      '领清单→咨询→A类代账',
      '领指南→咨询→A类代账',
      '领清单→换代账→A类',
    ],
    audiences: ['startup', 'startup', 'startup', 'startup', 'startup', 'founder'],
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
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const topicTypes = account === 'main' ? MAIN_TOPIC_TYPES : SECONDARY_TOPIC_TYPES;

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  // AI智能生成选题
  const generateAITopics = useCallback(async () => {
    if (selectedTypes.length === 0) {
      setAiError('请至少选择一个内容类型');
      return;
    }

    setIsAILoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          contentTypes: selectedTypes,
          count,
        }),
      });

      if (!response.ok) {
        throw new Error('AI选题生成失败');
      }

      const data = await response.json();
      
      if (data.success && data.topics) {
        const newTopics: Topic[] = data.topics.map((t: Record<string, string>, index: number) => ({
          id: `ai_topic_${Date.now()}_${index}`,
          title: t.title || t.核心内容 || '未命名选题',
          coreContent: t.核心内容 || t.coreContent || '',
          targetAudience: (t.目标人群 || t.targetAudience || '创业老板') as TargetAudience,
          hookPhrase: t.自诊钩子 || t.hookPhrase || '',
          conversionPath: t.预估转化路径 || t.conversionPath || '打关键词→私信→C类',
          account,
          accountName: account === 'main' ? '张老师老板财税' : '创业老板的第一站',
          type: selectedTypes[0] as TopicType,
          typeName: selectedTypes[0],
          framework: 'C' as ContentFramework,
          createdAt: new Date().toISOString(),
        }));

        setGeneratedTopics(newTopics);
        setTopics(prev => [...prev, ...newTopics]);
        newTopics.forEach(topic => addTopic(topic));
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      console.error('AI生成失败:', error);
      setAiError(error instanceof Error ? error.message : 'AI生成失败，请重试');
    } finally {
      setIsAILoading(false);
    }
  }, [account, selectedTypes, count]);

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
              <h2 className="text-lg font-semibold">找选题</h2>
              <p className="text-sm text-muted-foreground">生成财税爆款选题</p>
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
              内容类型（可多选,未选则全部生成）
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
            className="h-12 px-4 bg-[#2A303C] text-[#F1F5F9] font-medium rounded-lg hover:bg-[#3A404C] transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="text-amber-300" />
                <span>模板选题</span>
              </>
            )}
          </button>
          <button
            onClick={generateAITopics}
            disabled={isAILoading}
            className="h-12 px-4 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAILoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AI生成中...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="text-white" />
                <span>AI智能选题</span>
              </>
            )}
          </button>
          {aiError && (
            <p className="text-sm text-red-400 mt-1">{aiError}</p>
          )}
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
