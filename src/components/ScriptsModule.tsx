'use client';

import React, { useState } from 'react';
import { 
  FileTextIcon, CopyIcon, TrashIcon, ClockIcon, 
  CheckIcon, ChevronDownIcon, SparklesIcon 
} from '@/components/icons';
import { Topic, Script, ScriptSegment } from '@/lib/types';
import { getTopics, getScripts, addScript, deleteScript, generateId } from '@/lib/storage';

const DURATION_OPTIONS = [
  { value: 30, label: '30秒', desc: '快节奏要点' },
  { value: 60, label: '60秒', desc: '标准口播' },
  { value: 90, label: '90秒', desc: '深度解读' },
];

const STYLE_OPTIONS = [
  { id: 'professional', label: '专业严肃', icon: 'briefcase' },
  { id: 'humor', label: '轻松幽默', icon: 'smile' },
  { id: 'story', label: '故事叙述', icon: 'book' },
  { id: 'expert', label: '专家访谈', icon: 'mic' },
];

const EMOTIONS = ['平静', '好奇', '激动', '共鸣', '紧迫', '温暖', '自信', '专注'];

// 脚本生成辅助函数（纯函数，无副作用）
function generateScriptSegmentsPure(
  topic: string,
  dur: number,
  style: string,
  sellingPoint: string,
  cta: string,
  seed: number
): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  const segmentCount = Math.ceil(dur / 15);
  const segmentDuration = dur / segmentCount;
  
  // 使用确定性伪随机数生成器
  const random = (max: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return Math.floor((seed / 233280) * max);
  };
  
  const hookTemplates = {
    professional: [
      `你知道吗？90%的企业都在多交冤枉税，今天我来告诉你为什么。`,
      `老板们注意了！2024年税务稽查重点已经变了，不看后悔。`,
      `财务必看！一个操作帮你省下几万块的税。`,
    ],
    humor: [
      `哎呀妈呀，这个税务漏洞我必须曝光，太坑了！`,
      `老板：我又双叒叕被税务查了！我：你是不是没看过这个视频？`,
      `别划走！这个省税方法简单到我都想笑，但真的有用。`,
    ],
    story: [
      `上周有个客户找我，说他公司差点被罚50万...`,
      `我做财税十几年，见过太多老板踩这个坑了。`,
      `三年前我还是个小会计，现在...我学会了这招。`,
    ],
    expert: [
      `作为资深税务师，我今天必须跟大家分享这个重要信息。`,
      `根据我服务上百家企业的经验，这个问题最容易被忽视。`,
      `今天从专业角度，给大家深度解析这个政策。`,
    ],
  };
  
  const bodyTemplates = {
    professional: [
      `首先，我们要了解当前的税务政策环境。金税四期上线后，税务监管能力大幅提升。`,
      `其次，很多企业忽视了研发费用加计扣除这个政策红利。`,
      `第三，合理的业务拆分和架构调整可以有效降低税负。`,
      `最后提醒，节税必须在合法合规的前提下进行。`,
    ],
    humor: [
      `老板们想想，每个月多交的税够买多少杯奶茶？算了，我都不敢算。`,
      `这时候肯定有老板问了：这么简单？我：就这么简单，但就是没人做。`,
      `我见过太多人，钱没省到，罚款倒是交了不少，真是大冤种本种。`,
      `评论区告诉我，你是不是那个多交税的冤种？`,
    ],
    story: [
      `当时这位老板找到我的时候，眉头皱得能夹死苍蝇。`,
      `我们花了整整两周，重新梳理了公司的业务流程。`,
      `结果你猜怎么着？第一个月就省下了将近8万的税。`,
      `现在这位老板见人就夸我，说我是他的财神爷。`,
    ],
    expert: [
      `从政策层面分析，这项税收优惠的适用条件主要包括以下几点。`,
      `根据我们团队的研究，这类企业的税负率平均可以降低2-3个百分点。`,
      `在实操层面，需要特别注意成本费用的完整性和合规性。`,
      `建议企业在做税务规划时，一定要咨询专业人士。`,
    ],
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const hookTemplate = hookTemplates[style as keyof typeof hookTemplates] || hookTemplates.professional;
  const bodyTemplate = bodyTemplates[style as keyof typeof bodyTemplates] || bodyTemplates.professional;

  segments.push({
    timeStart: '00:00',
    timeEnd: formatTime(segmentDuration),
    content: hookTemplate[random(hookTemplate.length)],
    emotion: '激动',
    isHook: true,
  });

  for (let i = 0; i < segmentCount - 2; i++) {
    const timeStart = segmentDuration * (i + 1);
    const timeEnd = segmentDuration * (i + 2);
    segments.push({
      timeStart: formatTime(timeStart),
      timeEnd: formatTime(timeEnd),
      content: bodyTemplate[i % bodyTemplate.length],
      emotion: EMOTIONS[random(EMOTIONS.length)],
      isHook: false,
    });
  }

  const ctaContent = cta || '觉得有用的话，记得点个赞加关注，更多财税干货持续更新中！';
  segments.push({
    timeStart: formatTime(dur - segmentDuration),
    timeEnd: formatTime(dur),
    content: ctaContent,
    emotion: '温暖',
    isHook: false,
  });

  return segments;
}

export default function ScriptsModule() {
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['professional']);
  const [coreSellingPoint, setCoreSellingPoint] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [topics] = useState<Topic[]>(() => getTopics());
  const [scripts, setScripts] = useState<Script[]>(() => getScripts());
  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(s => s !== styleId)
        : [...prev, styleId]
    );
  };

  const generateScript = () => {
    setIsGenerating(true);
    
    const topicTitle = selectedTopic 
      ? topics.find(t => t.id === selectedTopic)?.title || ''
      : customTopic || '财税合规与节税技巧';
    
    const mainStyle = selectedStyles[0] || 'professional';
    
    setTimeout(() => {
      // 使用当前时间戳作为随机种子
      const seed = Date.now();
      const segments = generateScriptSegmentsPure(topicTitle, duration, mainStyle, coreSellingPoint, ctaText, seed);
      
      const script: Script = {
        id: generateId(),
        topicId: selectedTopic || '',
        topicTitle,
        segments,
        duration,
        style: selectedStyles,
        hookPhrase: segments[0]?.content || '',
        cta: ctaText || '关注我，带你了解更多财税干货',
        createdAt: new Date().toISOString(),
      };
      
      setGeneratedScript(script);
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopyScript = async (script: Script) => {
    const fullText = script.segments.map(s => `[${s.timeStart}] ${s.content}`).join('\n\n');
    await navigator.clipboard.writeText(fullText);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveScript = () => {
    if (generatedScript) {
      const updatedScripts = [generatedScript, ...scripts];
      setScripts(updatedScripts);
      addScript(generatedScript);
      setGeneratedScript(null);
    }
  };

  const handleDeleteScript = (id: string) => {
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    deleteScript(id);
  };

  const copyFullScript = async (script: Script) => {
    const fullText = script.segments.map(s => `[${s.timeStart}] ${s.content}`).join('\n\n');
    await navigator.clipboard.writeText(fullText);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* 表单区 */}
      <div className="w-[40%] flex flex-col gap-6">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-module-green/20 flex items-center justify-center">
              <FileTextIcon className="module-green" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">脚本生成</h2>
              <p className="text-sm text-muted-foreground">灵犀 · 一键成稿</p>
            </div>
          </div>

          {/* 选题选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">选择选题</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all appearance-none cursor-pointer"
            >
              <option value="">从选题库选择...</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            <div className="mt-2 text-sm text-muted-foreground">或者</div>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="直接输入选题..."
              className="w-full h-11 px-4 mt-2 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all"
            />
          </div>

          {/* 视频时长 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">视频时长</label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  className={`flex-1 py-3 px-3 rounded-lg border transition-all btn-press ${
                    duration === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 风格选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">内容风格（可多选）</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_OPTIONS.map(style => (
                <button
                  key={style.id}
                  onClick={() => handleStyleToggle(style.id)}
                  className={`p-3 rounded-lg border text-left transition-all btn-press ${
                    selectedStyles.includes(style.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <span className={`block text-sm font-medium ${
                    selectedStyles.includes(style.id) ? 'text-primary' : ''
                  }`}>
                    {style.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 核心卖点 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">核心卖点（可选）</label>
            <textarea
              value={coreSellingPoint}
              onChange={(e) => setCoreSellingPoint(e.target.value)}
              placeholder="描述你想要传达的核心价值..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all resize-none"
            />
          </div>

          {/* CTA话术 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">引导话术（可选）</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="如：关注我，带你了解更多财税干货"
              className="w-full h-11 px-4 bg-background border border-border rounded-lg focus:outline-none focus:border-primary input-glow transition-all"
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={generateScript}
            disabled={isGenerating || (!selectedTopic && !customTopic)}
            className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="text-amber-300" />
                <span>生成60秒脚本</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {/* 新生成脚本 */}
        {generatedScript && (
          <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-module-green animate-pulse" />
                新生成脚本
              </h3>
              <button
                onClick={handleSaveScript}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                保存到脚本库
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm text-muted-foreground mb-2">选题：{generatedScript.topicTitle}</h4>
              <div className="flex gap-2 text-xs">
                {generatedScript.style.map(s => (
                  <span key={s} className="tag tag-green">{s}</span>
                ))}
                <span className="tag">{generatedScript.duration}秒</span>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {generatedScript.segments.map((seg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border transition-all ${
                    seg.isHook 
                      ? 'bg-amber-500/10 border-amber-500/30' 
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono-num text-xs text-muted-foreground">
                      {seg.timeStart} - {seg.timeEnd}
                    </span>
                    <span className={`tag text-xs ${seg.emotion === '激动' ? 'tag-amber' : seg.emotion === '温暖' ? 'tag-green' : ''}`}>
                      {seg.emotion}
                    </span>
                    {seg.isHook && <span className="tag text-xs">钩子</span>}
                  </div>
                  <p className={`text-sm leading-relaxed ${seg.isHook ? 'text-amber-200' : ''}`}>
                    {seg.content}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => copyFullScript(generatedScript)}
              className="w-full mt-4 h-10 border border-border rounded-lg hover:border-primary/50 transition-all text-sm flex items-center justify-center gap-2"
            >
              {copiedId === generatedScript.id ? (
                <><CheckIcon size={16} className="text-green-500" /> 已复制</>
              ) : (
                <><CopyIcon size={16} /> 复制完整脚本</>
              )}
            </button>
          </div>
        )}

        {/* 脚本库 */}
        <div className="bg-card border border-border rounded-xl p-5 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">脚本库</h3>
            <span className="text-sm text-muted-foreground">{scripts.length} 个脚本</span>
          </div>
          
          {scripts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileTextIcon size={48} className="mx-auto mb-3 opacity-30" />
                <p>暂无保存的脚本</p>
                <p className="text-sm mt-1">生成脚本后可保存到这里</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {scripts.map(script => (
                <div
                  key={script.id}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-snug">{script.topicTitle}</h4>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClockIcon size={12} />
                            {script.duration}秒
                          </span>
                          <span>{script.segments.length} 段落</span>
                          <span>{new Date(script.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronDownIcon
                        size={16}
                        className={`text-muted-foreground transition-transform shrink-0 ${
                          expandedScript === script.id ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>
                  
                  {expandedScript === script.id && (
                    <div className="border-t border-border p-4 bg-card">
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {script.segments.map((seg, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono-num text-xs text-muted-foreground">{seg.timeStart}</span>
                              {seg.isHook && <span className="tag text-xs">钩子</span>}
                            </div>
                            <p className="text-muted-foreground leading-relaxed pl-3 border-l-2 border-border">{seg.content}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => copyFullScript(script)}
                          className="flex-1 h-9 border border-border rounded-lg hover:border-primary/50 transition-all text-sm flex items-center justify-center gap-2"
                        >
                          {copiedId === script.id ? <><CheckIcon size={14} className="text-green-500" /> 已复制</> : <><CopyIcon size={14} /> 复制</>}
                        </button>
                        <button
                          onClick={() => handleDeleteScript(script.id)}
                          className="h-9 px-3 border border-border rounded-lg hover:border-red-500/50 transition-all text-sm flex items-center justify-center"
                        >
                          <TrashIcon size={14} className="text-red-500/70" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
