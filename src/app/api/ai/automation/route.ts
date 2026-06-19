import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { VideoGenerationClient } from 'coze-coding-dev-sdk';

// 自动化工作流系统提示词
const TOPIC_SYSTEM_PROMPT = `你是财税短视频内容策划专家。生成JSON格式的爆款选题，包含：
title/核心内容/目标人群/自诊钩子（打「XX」发你XX格式）/转化路径。

选题要能引发老板焦虑和点击欲望。直接输出JSON数组。`;

const SCRIPT_SYSTEM_PROMPT = `你是财税短视频脚本创作专家。基于选题生成60秒口播脚本。

脚本结构：
- 00:00-00:03 钩子
- 00:03-00:08 共情
- 00:08-00:40 核心内容
- 00:40-00:50 自诊触发
- 00:50-00:60 CTA行动

输出JSON格式：
{segments: [{timeStart, timeEnd, action, content, emotion, type}], hookPhrase, cta, style}

口播文案要口语化，每句15字以内。`;

// 自动化工作流API
export async function POST(request: NextRequest) {
  try {
    const { 
      account = 'main',
      contentTypes = ['risk-trigger'],
      count = 3,
      autoGenerateVideo = false,
      videoDuration = 5,
      videoRatio = '9:16'
    } = await request.json();

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建客户端
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);
    const videoClient = new VideoGenerationClient(config, customHeaders);

    // 账号信息
    const accountName = account === 'main' ? '张老师老板财税' : '创业老板的第一站';
    const typesText = contentTypes.join('、');

    // 步骤1：生成选题
    console.log('[自动化工作流] 步骤1：生成选题...');
    const topicMessages = [
      { role: 'system' as const, content: TOPIC_SYSTEM_PROMPT },
      { role: 'user' as const, content: `为账号「${accountName}」生成${count}条${typesText}选题。输出JSON数组。` },
    ];

    const topicResponse = await llmClient.invoke(topicMessages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.8,
    });

    let topics = [];
    try {
      const jsonMatch = topicResponse.content.match(/\[[\s\S]*\]/);
      topics = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(topicResponse.content);
    } catch {
      return NextResponse.json({ error: '选题生成失败' }, { status: 500 });
    }

    // 步骤2：生成脚本
    console.log('[自动化工作流] 步骤2：生成脚本...');
    const scripts = [];

    for (let i = 0; i < Math.min(topics.length, count); i++) {
      const topic = topics[i];
      
      const scriptMessages = [
        { role: 'system' as const, content: SCRIPT_SYSTEM_PROMPT },
        { role: 'user' as const, content: `选题：${topic.title}\n核心：${topic.核心内容 || topic.coreContent}\n生成60秒脚本。` },
      ];

      const scriptResponse = await llmClient.invoke(scriptMessages, {
        model: 'doubao-seed-2-0-lite-260215',
        temperature: 0.7,
      });

      let script = null;
      try {
        const jsonMatch = scriptResponse.content.match(/\{[\s\S]*\}/);
        script = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(scriptResponse.content);
      } catch {
        script = { segments: [], hookPhrase: '', cta: '', style: '专业' };
      }

      scripts.push({
        id: `script_${Date.now()}_${i}`,
        topicId: `topic_${Date.now()}_${i}`,
        topicTitle: topic.title,
        account,
        accountName,
        segments: script.segments || [],
        duration: 60,
        style: script.style || '专业',
        hookPhrase: script.hookPhrase || '',
        cta: script.cta || '',
        createdAt: new Date().toISOString(),
      });
    }

    // 步骤3：生成视频（可选）
    let videos = [];
    if (autoGenerateVideo) {
      console.log('[自动化工作流] 步骤3：生成视频...');
      
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        // 从脚本提取口播文案作为视频描述
        const scriptText = script.segments
          .map((s: { content: string }) => s.content)
          .join('，');
        
        const videoPrompt = `${script.hookPhrase}。${scriptText.slice(0, 100)}...`;

        try {
          const videoResponse = await videoClient.videoGeneration([
            { type: 'text' as const, text: videoPrompt }
          ], {
            model: 'doubao-seedance-1-5-pro-251215',
            duration: videoDuration,
            ratio: videoRatio as '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9' | 'adaptive',
            watermark: false,
          });

          videos.push({
            id: `video_${Date.now()}_${i}`,
            scriptId: script.id,
            topicTitle: script.topicTitle,
            videoUrl: videoResponse.videoUrl,
            status: videoResponse.response?.status || 'completed',
            duration: videoDuration,
            createdAt: new Date().toISOString(),
          });
        } catch (videoError) {
          console.error(`视频生成失败:`, videoError);
          videos.push({
            id: `video_${Date.now()}_${i}`,
            scriptId: script.id,
            topicTitle: script.topicTitle,
            videoUrl: null,
            status: 'failed',
            error: '视频生成失败',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // 返回完整工作流结果
    return NextResponse.json({
      success: true,
      workflow: {
        account,
        accountName,
        contentTypes,
        createdAt: new Date().toISOString(),
      },
      topics: topics.map((t: Record<string, string>, i: number) => ({
        id: `topic_${Date.now()}_${i}`,
        ...t,
        account,
        accountName,
        createdAt: new Date().toISOString(),
      })),
      scripts,
      videos,
      summary: {
        topicsCount: topics.length,
        scriptsCount: scripts.length,
        videosCount: videos.length,
        autoVideoGenerated: autoGenerateVideo,
      },
    });

  } catch (error) {
    console.error('[自动化工作流] 执行失败:', error);
    return NextResponse.json(
      { error: '自动化工作流执行失败，请重试' },
      { status: 500 }
    );
  }
}

// 获取自动化任务状态
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: '自动化工作流API',
    endpoints: {
      POST: '执行自动化工作流（选题→脚本→视频）',
      GET: '获取API信息',
    },
    parameters: {
      account: 'main/secondary',
      contentTypes: '内容类型数组，如 risk-trigger, case-analysis 等',
      count: '生成数量',
      autoGenerateVideo: '是否自动生成视频',
      videoDuration: '视频时长(4-12秒)',
      videoRatio: '视频比例(9:16/16:9/1:1)',
    },
  });
}
