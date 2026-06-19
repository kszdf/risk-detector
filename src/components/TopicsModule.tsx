'use client';

import React, { useState } from 'react';
import { 
  LightbulbIcon, CopyIcon, TrashIcon, PlusIcon, 
  ClockIcon, FireIcon, CheckIcon, DownloadIcon 
} from '@/components/icons';
import { Topic } from '@/lib/types';
import { getTopics, addTopic, deleteTopic, generateId, formatNumber } from '@/lib/storage';

const CONTENT_TYPES = [
  { id: 'tax-planning', label: '税务筹划', description: '合法合规的节税方案' },
  { id: 'policy', label: '政策解读', description: '最新财税政策分析' },
  { id: 'case', label: '案例分析', description: '真实客户案例分享' },
  { id: 'compliance', label: '合规提醒', description: '风险预警与防范' },
  { id: 'tips', label: '节税技巧', description: '实用省税小妙招' },
];

const TOPIC_TEMPLATES = {
  'tax-planning': [
    '中小企业如何通过研发费用加计扣除节省税费',
    '个体工商户核定征收与查账征收如何选',
    '老板必知的3个合法节税黄金法则',
    '2024年小微企业税收优惠政策全解析',
    '高新技术企业认定后的税收优惠实操',
  ],
  'policy': [
    '重磅！2024年增值税小规模纳税人免税标准上调',
    '个人所得税专项附加扣除最新变化解读',
    '金税四期上线后企业需要注意什么',
    '最新发布的中小企业促进法实施条例要点',
    '残疾人就业保障金优惠政策延续解读',
  ],
  'case': [
    '真实案例：某科技公司如何一年省税200万',
    '餐饮企业成本票缺失的税务处理方案',
    '建筑劳务公司灵活用工税务筹划案例',
    '电商企业刷单收入的税务处理教训',
    '股权转让中的税务坑与合规路径',
  ],
  'compliance': [
    '注意！这些发票将不能再报销',
    '企业被税务稽查的常见原因分析',
    '财务人员必须知道的红线行为清单',
    '个体户注销时常见的税务问题汇总',
    '公司银行账户与税务信用等级的关系',
  ],
  'tips': [
    '财务必看：发票备注栏的隐藏学问',
    '差旅费报销的税务处理技巧',
    '年终奖如何发可以少交个税',
    '公司买车是抵税还是浪费钱',
    '老板从公司拿钱的税务成本计算',
  ],
};

const SCENES = ['抖音短视频', '小红书图文', '视频号内容', 'B站中视频', '朋友圈素材'];

export default function TopicsModule() {
  const [account, setAccount] = useState<'main' | 'secondary'>('main');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const [keyword, setKeyword] = useState('');
  const [topics, setTopics] = useState<Topic[]>(() => getTopics());
  const [generatedTopics, setGeneratedTopics] = useState<Topic[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      const typesToUse = selectedTypes.length > 0 ? selectedTypes : ['tax-planning', 'policy', 'case', 'compliance', 'tips'];
      const numToGenerate = Math.min(Math.max(count, 1), 20);

      for (let i = 0; i < numToGenerate; i++) {
        const randomType = typesToUse[Math.floor(Math.random() * typesToUse.length)];
        const templates = TOPIC_TEMPLATES[randomType as keyof typeof TOPIC_TEMPLATES] || TOPIC_TEMPLATES['tax-planning'];
        const template = templates[Math.floor(Math.random() * templates.length)];
        const title = keyword ? template.replace(/[Xx]/g, keyword) : template;
        const randomScene = SCENES[Math.floor(Math.random() * SCENES.length)];

        newTopics.push({
          id: generateId(),
          title,
          account,
          types: [randomType],
          duration: 45 + Math.floor(Math.random() * 30),
          heatIndex: 60 + Math.floor(Math.random() * 40),
          scene: randomScene,
          createdAt: new Date().toISOString(),
        });
      }

      setGeneratedTopics(newTopics);
      setIsGenerating(false);
    }, 1500);
  };

  const saveSelectedTopics = () => {
    if (generatedTopics.length > 0) {
      const updatedTopics = [...generatedTopics, ...topics];
      setTopics(updatedTopics);
      addTopic(generatedTopics[0]);
      setGeneratedTopics([]);
    }
  };

  const handleCopy = async (topic: Topic) => {
    await navigator.clipboard.writeText(topic.title);
    setCopiedId(topic.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = topics.filter(t => t.id !== id);
    setTopics(updated);
    deleteTopic(id);
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
            <div className="flex gap-3">
              <button
                onClick={() => setAccount('main')}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all btn-press ${
                  account === 'main'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <span className="block font-medium">主号</span>
                <span className="block text-xs text-muted-foreground mt-1">品牌IP账号</span>
              </button>
              <button
                onClick={() => setAccount('secondary')}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all btn-press ${
                  account === 'secondary'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <span className="block font-medium">副号</span>
                <span className="block text-xs text-muted-foreground mt-1">矩阵分发账号</span>
              </button>
            </div>
          </div>

          {/* 内容类型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">内容类型（可多选）</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPES.map(type => (
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
                    {type.label}
                  </span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{type.description}</span>
                </button>
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

          {/* 关键词 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">行业关键词（可选）</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="如：电商、餐饮、科技..."
              className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all"
            />
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
                <span>开始生成选题</span>
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
                新生成选题
              </h3>
              <button
                onClick={saveSelectedTopics}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                保存全部到选题库
              </button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {generatedTopics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-primary/20 text-primary text-xs font-medium rounded flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{topic.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={`tag ${topic.account === 'main' ? '' : 'tag-purple'}`}>
                          {topic.account === 'main' ? '主号' : '副号'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon size={12} />
                          ~{topic.duration}秒
                        </span>
                        <span className="flex items-center gap-1">
                          <FireIcon size={12} className="text-amber-500" />
                          热度 {topic.heatIndex}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(topic)}
                      className="p-2 rounded-lg hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {copiedId === topic.id ? (
                        <CheckIcon className="text-green-500" size={16} />
                      ) : (
                        <CopyIcon className="text-muted-foreground" size={16} />
                      )}
                    </button>
                  </div>
                </div>
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
                <p className="text-sm mt-1">生成选题后可保存到这里</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{topic.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={`tag ${topic.account === 'main' ? '' : 'tag-purple'}`}>
                          {topic.account === 'main' ? '主号' : '副号'}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClockIcon size={12} />
                          ~{topic.duration}秒
                        </span>
                        <span className="flex items-center gap-1">
                          <FireIcon size={12} className="text-amber-500" />
                          热度 {topic.heatIndex}
                        </span>
                        <span className="text-muted-foreground/60">{topic.scene}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(topic)}
                        className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                        title="复制"
                      >
                        {copiedId === topic.id ? (
                          <CheckIcon className="text-green-500" size={16} />
                        ) : (
                          <CopyIcon className="text-muted-foreground" size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(topic.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="删除"
                      >
                        <TrashIcon className="text-red-500/70" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className = '', size = 20 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
