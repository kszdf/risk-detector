import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 脚本生成系统提示词
const SYSTEM_PROMPT = `你是财税短视频脚本创作专家，精通口播脚本写作。

你的职责是基于选题生成60秒口播脚本，包含时间轴、情绪标注、钩子话术。

## 脚本结构（60秒）
- 00:00-00:03 钩子：引发好奇，留住观众
- 00:03-00:08 共情：引发共鸣，建立信任
- 00:08-00:40 核心内容：专业输出，价值提供
- 00:40-00:50 自诊触发：引导行动
- 00:50-00:60 CTA行动：引导关注/私信/购买

## 账号风格差异
- 主号「张老师老板财税」：专业笃定、断言式开头，语气严肃权威
- 副号「创业老板的第一站」：亲和实用、场景式开头，语气亲切随和

## 输出格式
请生成JSON格式的脚本数据：
{
  "segments": [
    {
      "timeStart": "00:00",
      "timeEnd": "00:03",
      "action": "画面动作描述",
      "content": "口播文案",
      "emotion": "情绪标注",
      "type": "钩子/共情/核心/自诊/行动"
    }
  ],
  "hookPhrase": "开场钩子（10字以内）",
  "cta": "结尾行动号召",
  "style": "风格描述",
  "duration": 60
}

## 注意事项
1. 每句话控制在15字以内，便于口播
2. 口播文案要口语化，自然流畅
3. 情绪标注：平静/共情/激动/紧迫/信任
4. 画面动作要简单易执行`;

// 脚本生成API
export async function POST(request: NextRequest) {
  try {
    const { topic, account, accountName } = await request.json();

    // 验证参数
    if (!topic || !account) {
      return NextResponse.json(
        { error: '缺少必要参数：topic, account' },
        { status: 400 }
      );
    }

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建LLM客户端
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 确定账号风格
    const isMainAccount = account === 'main';
    const styleHint = isMainAccount 
      ? '风格要求：专业笃定、断言式开头，语气严肃权威，像财税专家在授课'
      : '风格要求：亲和实用、场景式开头，语气亲切随和，像朋友在分享经验';

    // 构建用户提示词
    const userPrompt = `请为以下选题生成60秒口播脚本：

选题标题：${topic.title || topic}
账号：${accountName || (isMainAccount ? '张老师老板财税' : '创业老板的第一站')}
${styleHint}

核心内容：${topic.coreContent || ''}
目标人群：${topic.targetAudience || ''}
自诊钩子：${topic.hookPhrase || ''}

请生成完整的60秒脚本，包含时间轴、动作、情绪标注。确保口语化、自然流畅。

请直接输出JSON格式，不要其他文字。`;

    // 调用LLM生成脚本
    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.7,
    });

    // 解析LLM返回的JSON
    let script = null;
    try {
      const content = response.content.trim();
      // 尝试提取JSON对象
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        script = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      return NextResponse.json(
        { error: 'AI返回格式错误，无法解析脚本数据' },
        { status: 500 }
      );
    }

    // 构建完整脚本数据
    const fullScript = {
      id: `script_${Date.now()}`,
      topicId: topic.id || null,
      topicTitle: topic.title || topic,
      account: account,
      accountName: accountName || (isMainAccount ? '张老师老板财税' : '创业老板的第一站'),
      segments: script.segments || [],
      duration: script.duration || 60,
      style: script.style || (isMainAccount ? '专业笃定' : '亲和实用'),
      hookPhrase: script.hookPhrase || '',
      cta: script.cta || '',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      script: fullScript,
    });

  } catch (error) {
    console.error('脚本生成失败:', error);
    return NextResponse.json(
      { error: '脚本生成失败，请重试' },
      { status: 500 }
    );
  }
}
