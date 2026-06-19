import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 选题生成系统提示词
const SYSTEM_PROMPT = `你是财税短视频内容策划专家，精通爆款选题创作。

你的职责是根据用户需求，生成适合财税行业短视频的爆款选题。

## 账号定位
- 主号「张老师老板财税」：专业权威定位，适合风险触发型、案例拆解型、政策解读型、课程引流型内容
- 副号「创业老板的第一站」：亲和实用定位，适合注册避坑型、流程科普型、创业提醒型、代账常识型内容

## 内容类型
主号类型：
- 风险触发型：引发老板焦虑和危机感
- 案例拆解型：用真实案例展示问题和解决方案
- 政策解读型：解读最新财税政策
- 课程引流型：引导购买课程

副号类型：
- 注册避坑型：注册公司常见错误
- 流程科普型：业务流程讲解
- 创业提醒型：创业初期注意事项
- 代账常识型：代账服务相关知识

## BACD内容框架
- B（注册公司）做入口 → A（代账）做留存 → C（税筹）做利润 → D（课程）做杠杆

## 选题要求
1. 标题要引发好奇和点击欲望
2. 核心内容要直击痛点
3. 自诊钩子要格式统一：打「XX」发你XX
4. 转化路径要清晰：打关键词→领资料→私信→B/C类

## 输出格式
请生成JSON格式的选题列表，每个选题包含：
{
  "title": "标题（悬念式）",
  "coreContent": "核心内容（一句话）",
  "targetAudience": "目标人群",
  "hookPhrase": "自诊钩子（打「XX」发你XX格式）",
  "conversionPath": "预估转化路径",
  "account": "主号/副号",
  "accountName": "账号名称",
  "type": "内容类型",
  "typeName": "类型名称"
}

请生成N条选题（数量由用户指定），确保多样性和差异化。`;

// 选题生成API
export async function POST(request: NextRequest) {
  try {
    const { 
      account, 
      accountType, 
      contentTypes, 
      count = 5 
    } = await request.json();

    // 验证参数
    if (!account || !contentTypes || contentTypes.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数：account, contentTypes' },
        { status: 400 }
      );
    }

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建用户提示词
    const accountName = account === 'main' ? '张老师老板财税' : '创业老板的第一站';
    const typesText = contentTypes.map((t: string) => {
      const typeNames: Record<string, string> = {
        'risk-trigger': '风险触发型',
        'case-analysis': '案例拆解型',
        'policy-interpret': '政策解读型',
        'course-attract': '课程引流型',
        'register-avoid': '注册避坑型',
        'process-science': '流程科普型',
        'startup-remind': '创业提醒型',
        'agency-common': '代账常识型',
      };
      return typeNames[t] || t;
    }).join('、');

    const userPrompt = `请为账号「${accountName}」生成${count}条${typesText}选题。

要求：
1. 每条选题要有爆款潜力，能引发老板点击
2. 标题要简短有力，引发好奇
3. 自诊钩子格式固定：打「XX」发你XX
4. 转化路径要清晰可执行

请直接输出JSON数组，不要其他文字。`;

    // 调用LLM生成选题
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.8,
    });

    // 解析LLM返回的JSON
    let topics = [];
    try {
      const content = response.content.trim();
      // 尝试提取JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        topics = JSON.parse(jsonMatch[0]);
      } else {
        topics = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return NextResponse.json(
        { error: 'AI返回格式错误，无法解析选题数据' },
        { status: 500 }
      );
    }

    // 确保返回的是数组
    if (!Array.isArray(topics)) {
      return NextResponse.json(
        { error: 'AI返回格式错误，期望数组类型' },
        { status: 500 }
      );
    }

    // 为每个选题添加元数据
    const enrichedTopics = topics.map((topic: Record<string, string>, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      ...topic,
      account: account,
      accountName: accountName,
      type: contentTypes[index % contentTypes.length],
      typeName: accountType,
      heatIndex: Math.floor(Math.random() * 30) + 70, // 热度指数 70-100
      createdAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      topics: enrichedTopics,
      total: enrichedTopics.length,
    });

  } catch (error) {
    console.error('选题生成失败:', error);
    return NextResponse.json(
      { error: '选题生成失败，请重试' },
      { status: 500 }
    );
  }
}
