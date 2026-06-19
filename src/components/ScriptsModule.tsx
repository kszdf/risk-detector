'use client';

import React, { useState, useMemo } from 'react';
import { FileTextIcon, CopyIcon, TrashIcon, CheckIcon, ChevronDownIcon } from '@/components/icons';
import { Topic, Script, ScriptSegment } from '@/lib/types';
import { getTopics, getScripts, addScript, deleteScript, generateId, getAccountName } from '@/lib/storage';

const ACCOUNT_STYLES = {
  main: {
    style: '专业笃定、断言式开头',
    intro: '直接抛出专业观点，建立权威感',
  },
  secondary: {
    style: '亲和实用、场景式开头',
    intro: '从日常场景切入，引发共鸣',
  },
};

const EMOTION_LABELS = ['平静', '好奇', '共鸣', '激动', '紧迫', '信任'];

export default function ScriptsModule() {
  const topics = getTopics();
  const savedScripts = getScripts();
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [duration, setDuration] = useState(60);
  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'library'>('new');

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateScript = () => {
    if (!selectedTopic) return;
    setIsGenerating(true);

    setTimeout(() => {
      const segments: ScriptSegment[] = [];
      const accountStyle = ACCOUNT_STYLES[selectedTopic.account];
      const topicTitle = selectedTopic.title;
      const coreContent = selectedTopic.coreContent;
      const hookPhrase = selectedTopic.hookPhrase;
      const audience = selectedTopic.targetAudienceName;
      const framework = selectedTopic.framework;

      // 钩子话术生成（0-3秒）
      const hookContent = selectedTopic.account === 'main'
        ? `注册公司，这${Math.floor(Math.random() * 3) + 1}件事做错了，后果比你想象的严重！${topicTitle.replace(/[^，。！]/g, '')}，今天全部告诉你。`
        : `你是不是也在纠结要不要注册公司？担心流程复杂、被坑、踩雷？刷到这条视频就别划走了，${topicTitle}，我帮你一次性搞清楚。`;

      segments.push({
        timeStart: '00:00',
        timeEnd: '00:03',
        action: '直视镜头，表情严肃/关切',
        content: hookContent,
        emotion: '激动',
        isHook: true,
        isEmpathy: false,
        isCore: false,
        isSelfCheck: false,
        isCTA: false,
      });

      // 共情话术（3-8秒）
      const empathyContent = selectedTopic.account === 'main'
        ? `我见过太多创业者在公司注册阶段就埋下了巨大的隐患。不是税务问题，就是股权纠纷，还有很多人因为不懂政策，白白多交了几万甚至几十万的冤枉税。`
        : `很多刚开始创业的朋友，经常问我：张老师，注册公司到底要注意什么？确实，这里面门道很多，稍不注意就会踩坑。`;

      segments.push({
        timeStart: '00:03',
        timeEnd: '00:08',
        action: '微微点头，表达理解',
        content: empathyContent,
        emotion: '共鸣',
        isHook: false,
        isEmpathy: true,
        isCore: false,
        isSelfCheck: false,
        isCTA: false,
      });

      // 核心内容（8-40秒）- 根据框架类型生成不同内容
      const coreBlocks = generateCoreContent(framework, selectedTopic);
      coreBlocks.forEach((block, idx) => {
        const startTime = 8 + idx * 8;
        const endTime = Math.min(startTime + 8, 40);
        segments.push({
          timeStart: formatTime(startTime),
          timeEnd: formatTime(endTime),
          action: block.action,
          content: block.content,
          emotion: block.emotion,
          isHook: false,
          isEmpathy: false,
          isCore: true,
          isSelfCheck: false,
          isCTA: false,
        });
      });

      // 自诊触发（40-50秒）
      const selfCheckContent = `好，关于${topicTitle}，我给你整理了一份详细的资料。评论区打"${hookPhrase.split('"')[1] || '资料'}"，我发给你。注意查收，包含：${generateChecklist(framework)}`;

      segments.push({
        timeStart: formatTime(Math.max(40, 8 + coreBlocks.length * 8)),
        timeEnd: formatTime(Math.min(50, 8 + coreBlocks.length * 8 + 10)),
        action: '指向评论区，引导互动',
        content: selfCheckContent,
        emotion: '紧迫',
        isHook: false,
        isEmpathy: false,
        isCore: false,
        isSelfCheck: true,
        isCTA: false,
      });

      // CTA（50-60秒）
      const ctaContent = selectedTopic.account === 'main'
        ? `如果你还有更多财税问题不知道怎么解决，或者想了解更多节税技巧，点个关注，我会持续分享更多干货。需要专业指导的，评论区见。`
        : `关注我，带你避开创业路上的那些坑。有任何注册公司或财税方面的问题，都可以在评论区留言，我来帮你解答。`;

      segments.push({
        timeStart: formatTime(Math.max(50, 8 + coreBlocks.length * 8 + 10)),
        timeEnd: formatTime(duration),
        action: '微笑点头，引导关注',
        content: ctaContent,
        emotion: '信任',
        isHook: false,
        isEmpathy: false,
        isCore: false,
        isSelfCheck: false,
        isCTA: true,
      });

      const script: Script = {
        id: generateId(),
        topicId: selectedTopic.id,
        topicTitle: selectedTopic.title,
        account: selectedTopic.account,
        accountName: selectedTopic.accountName,
        segments,
        duration,
        style: accountStyle.style,
        hookPhrase: hookPhrase,
        cta: '点关注 + 评论领取资料',
        createdAt: new Date().toISOString(),
      };

      setGeneratedScript(script);
      setIsGenerating(false);
    }, 2000);
  };

  const generateCoreContent = (framework: string, topic: Topic): { action: string; content: string; emotion: string }[] => {
    const contents: { action: string; content: string; emotion: string }[] = [];
    
    switch (framework) {
      case 'B':
        contents.push(
          {
            action: '列举要点，配合手势',
            content: `第一，公司类型选择。不同类型的公司，税务负担差异巨大。有限公司、合伙企业、个人独资企业，税负完全不同。`,
            emotion: '专业',
          },
          {
            action: '强调重点，放慢语速',
            content: `第二，注册地址。很多新手不知道，注册地址直接决定了你能否享受当地的税收优惠政策。`,
            emotion: '紧迫',
          },
          {
            action: '讲述案例，表情认真',
            content: `第三，经营范围。写错了不仅多交税，还可能无法正常开展业务。真实案例：某科技公司因经营范围遗漏"技术服务"，损失了15万的退税。`,
            emotion: '警示',
          },
          {
            action: '提出建议，态度诚恳',
            content: `所以我建议你，在注册公司之前，先找专业的财税顾问做个规划。这不是多花钱，是真正帮你省钱避坑。`,
            emotion: '信任',
          }
        );
        break;
      case 'A':
        contents.push(
          {
            action: '解释概念，语速适中',
            content: `第一，代账的必要性。很多小公司觉得业务少，自己做账就行了。但你知道吗？税务逾期申报一次罚款2000起步，严重的还会影响法人信用。`,
            emotion: '警示',
          },
          {
            action: '对比分析，态度中立',
            content: `第二，代账 vs 自代理账。专职会计月薪8000起，代账一个月才几百块。但低价代账的坑，你必须知道——`,
            emotion: '专业',
          },
          {
            action: '列举陷阱，严肃提醒',
            content: `没有专业团队、税务异常不通知、账目混乱无法查——这些低价代账的陷阱，每年坑了多少小企业主。`,
            emotion: '紧迫',
          },
          {
            action: '给出建议，真诚引导',
            content: `选代账公司，一定要看三点：资质、口碑、增值服务。好的代账不只是做账，还能帮你预警税务风险。`,
            emotion: '信任',
          }
        );
        break;
      case 'C':
        contents.push(
          {
            action: '抛出痛点，引起重视',
            content: `你知道吗？同样年收入300万的老板，有的每年合法节税50万，有的多交了20万。差距在哪里？在于有没有做税务筹划。`,
            emotion: '紧迫',
          },
          {
            action: '讲解方法，逻辑清晰',
            content: `合法节税有三条路：第一，用好小微企业优惠政策；第二，合理利用区域性税收返还；第三，优化业务结构，降低税负。`,
            emotion: '专业',
          },
          {
            action: '强调合规，态度严肃',
            content: `但我必须强调：所有节税手段必须合法合规。金税四期大数据监管下，任何虚开发票、隐瞒收入的行为，都是死路一条。`,
            emotion: '严肃',
          },
          {
            action: '引导行动，态度诚恳',
            content: `如果你想知道自己的企业适合哪种节税方案，评论区告诉我你的行业和年营收，我帮你分析。`,
            emotion: '期待',
          }
        );
        break;
      case 'D':
        contents.push(
          {
            action: '介绍课程价值，语速适中',
            content: `这堂课专门解决一个问题：让创业老板不再被财税问题困扰。我把12年的实战经验，浓缩成了这套体系。`,
            emotion: '专业',
          },
          {
            action: '列举内容，强调实用',
            content: `课程包含：公司注册全流程、税务基础与申报、代账公司选择、股权架构设计、常见财税风险排查——创业必备知识点，全部覆盖。`,
            emotion: '激动',
          },
          {
            action: '说明收获，展望收益',
            content: `学完这堂课，你会知道：怎么少踩坑、怎么少交税、怎么安全地赚钱。这不是理论，是可以直接用的实操方法。`,
            emotion: '期待',
          },
          {
            action: '呼吁行动，有感染力',
            content: `想要系统学习财税知识的老板，评论区打"课程"，我把详细大纲发给你。早学早受益，别等踩坑了再来后悔。`,
            emotion: '紧迫',
          }
        );
        break;
      default:
        contents.push({
          action: '详细讲解，表情丰富',
          content: `关于${topic.coreContent}，这是很多老板都关心的问题。让我来帮你梳理一下核心要点。`,
          emotion: '专业',
        });
    }

    return contents.slice(0, 4);
  };

  const generateChecklist = (framework: string): string => {
    const checklists: Record<string, string> = {
      'B': '注册公司检查清单、各地税收优惠政策汇总表、注册流程时间表',
      'A': '代账公司选择标准、低价代账避坑指南、税务申报日历',
      'C': '企业节税方案对比表、税收优惠政策清单、行业税负分析',
      'D': '财税课程大纲、创业财税知识地图、常见问题解答集',
    };
    return checklists[framework] || '详细资料和操作指南';
  };

  const saveToLibrary = () => {
    if (generatedScript) {
      addScript(generatedScript);
      setActiveTab('library');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyFullScript = async () => {
    if (!generatedScript) return;
    const text = generatedScript.segments.map(s => 
      `[${s.timeStart}-${s.timeEnd}] ${s.content}`
    ).join('\n');
    await handleCopy(text, 'full');
  };

  const handleDelete = (id: string) => {
    deleteScript(id);
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
              <p className="text-sm text-muted-foreground">灵犀 · 心有灵犀</p>
            </div>
          </div>

          {/* Tab切换 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'new' 
                  ? 'bg-primary text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              生成新脚本
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'library' 
                  ? 'bg-primary text-white' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              脚本库
            </button>
          </div>

          {activeTab === 'new' && (
            <>
              {/* 选题选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">从选题库选择</label>
                <div className="relative">
                  <button
                    onClick={() => setShowTopicDropdown(!showTopicDropdown)}
                    className="w-full h-11 px-4 bg-background border border-border rounded-lg text-left flex items-center justify-between hover:border-primary/50 transition-all"
                  >
                    <span className={selectedTopic ? '' : 'text-muted-foreground'}>
                      {selectedTopic ? selectedTopic.title.slice(0, 30) + '...' : '请选择选题'}
                    </span>
                    <ChevronDownIcon size={16} className={`transition-transform ${showTopicDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showTopicDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                      {topics.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          暂无选题，请先到特劳特生成选题
                        </div>
                      ) : (
                        topics.map(topic => (
                          <button
                            key={topic.id}
                            onClick={() => {
                              setSelectedTopicId(topic.id);
                              setShowTopicDropdown(false);
                            }}
                            className={`w-full p-3 text-left hover:bg-primary/10 transition-colors border-b border-border last:border-0 ${
                              selectedTopicId === topic.id ? 'bg-primary/10' : ''
                            }`}
                          >
                            <div className="text-sm truncate">{topic.title}</div>
                            <div className="flex gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                topic.account === 'main' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {topic.accountName}
                              </span>
                              <span className="text-xs text-muted-foreground">{topic.typeName}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 时长选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">视频时长</label>
                <div className="flex gap-2">
                  {[30, 60, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        duration === d
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {d}秒
                    </button>
                  ))}
                </div>
              </div>

              {/* 风格预览 */}
              {selectedTopic && (
                <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">账号风格</div>
                  <div className="font-medium text-sm">
                    {ACCOUNT_STYLES[selectedTopic.account].style}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ACCOUNT_STYLES[selectedTopic.account].intro}
                  </div>
                </div>
              )}

              {/* 生成按钮 */}
              <button
                onClick={generateScript}
                disabled={!selectedTopic || isGenerating}
                className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg hover:opacity-90 transition-all btn-press disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    <span>生成60秒口播脚本</span>
                  </>
                )}
              </button>
            </>
          )}

          {activeTab === 'library' && (
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-3">
                已保存 {savedScripts.length} 个脚本
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {savedScripts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileTextIcon size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">暂无保存的脚本</p>
                  </div>
                ) : (
                  savedScripts.map(script => (
                    <div
                      key={script.id}
                      className="p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer"
                      onClick={() => setGeneratedScript(script)}
                    >
                      <div className="text-sm font-medium truncate">{script.topicTitle}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className={script.account === 'main' ? 'text-blue-400' : 'text-purple-400'}>
                          {script.accountName}
                        </span>
                        <span>{script.duration}秒</span>
                        <span>{script.segments.length}段落</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="w-[60%] flex flex-col gap-4">
        {!generatedScript ? (
          <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl">
            <div className="text-center text-muted-foreground">
              <FileTextIcon size={64} className="mx-auto mb-4 opacity-20" />
              <p>选择选题后点击生成</p>
              <p className="text-sm mt-1">将自动生成60秒口播脚本</p>
            </div>
          </div>
        ) : (
          <>
            {/* 脚本头部 */}
            <div className="bg-card border border-border rounded-xl p-5 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-lg">{generatedScript.topicTitle}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className={generatedScript.account === 'main' ? 'text-blue-400' : 'text-purple-400'}>
                      {generatedScript.accountName}
                    </span>
                    <span>{generatedScript.duration}秒</span>
                    <span>{generatedScript.style}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyFullScript}
                    className="h-9 px-4 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-all btn-press flex items-center gap-2"
                  >
                    {copiedId === 'full' ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    复制脚本
                  </button>
                  {activeTab === 'new' && (
                    <button
                      onClick={saveToLibrary}
                      className="h-9 px-4 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-all btn-press"
                    >
                      保存到脚本库
                    </button>
                  )}
                </div>
              </div>

              {/* 钩子话术高亮 */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                <div className="text-xs text-amber-400 mb-1">核心钩子</div>
                <div className="text-amber-200 font-medium">{generatedScript.segments[0]?.content}</div>
              </div>
            </div>

            {/* 时间轴表格 */}
            <div className="flex-1 bg-card border border-border rounded-xl p-5 overflow-hidden flex flex-col">
              <h4 className="font-medium mb-4">脚本时间轴</h4>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-24">时间</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-36">画面动作</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">口播文案</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-16">情绪</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground w-20">类型</th>
                    </tr>
                  </thead>
                  <tbody className="overflow-y-auto">
                    {generatedScript.segments.map((segment, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                          segment.isHook ? 'bg-amber-500/5' : 
                          segment.isSelfCheck ? 'bg-purple-500/5' : 
                          segment.isCTA ? 'bg-green-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-mono-num text-primary">
                          {segment.timeStart}-{segment.timeEnd}
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {segment.action}
                        </td>
                        <td className="py-3 px-3">
                          <span className={segment.isHook ? 'text-amber-300 font-medium' : ''}>
                            {segment.content}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                            EMOTION_COLORS[segment.emotion] || 'bg-muted text-muted-foreground'
                          }`}>
                            {segment.emotion}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {segment.isHook && <span className="tag tag-amber">钩子</span>}
                          {segment.isEmpathy && <span className="tag tag-green">共情</span>}
                          {segment.isCore && <span className="tag">核心</span>}
                          {segment.isSelfCheck && <span className="tag tag-purple">自诊</span>}
                          {segment.isCTA && <span className="tag tag-green">行动</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const EMOTION_COLORS: Record<string, string> = {
  '平静': 'bg-gray-500/20 text-gray-400',
  '好奇': 'bg-cyan-500/20 text-cyan-400',
  '共鸣': 'bg-green-500/20 text-green-400',
  '激动': 'bg-amber-500/20 text-amber-400',
  '紧迫': 'bg-red-500/20 text-red-400',
  '信任': 'bg-blue-500/20 text-blue-400',
  '专业': 'bg-indigo-500/20 text-indigo-400',
  '警示': 'bg-orange-500/20 text-orange-400',
  '严肃': 'bg-gray-600/20 text-gray-500',
  '期待': 'bg-pink-500/20 text-pink-400',
};

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
