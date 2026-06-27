import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

interface BusinessInfo {
  enterpriseName: string;
  creditCode: string;
  legalPerson: string;
  registeredCapital: string;
  establishedDate: string;
  businessStatus: string;
  enterpriseType: string;
  businessScope: string;
  registeredAddress: string;
  businessTerm: string;
  approvedDate: string;
  orgCode: string;
  taxpayerType: string;
  industry: string;
}

function extractJsonFromLlmResponse(text: string): BusinessInfo | null {
  // 尝试从LLM回复中提取JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as BusinessInfo;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const enterpriseName = searchParams.get('enterpriseName') || '';
  const creditCode = searchParams.get('creditCode') || '';

  if (!enterpriseName && !creditCode) {
    return NextResponse.json({ error: '请提供企业名称或统一信用代码' }, { status: 400 });
  }

  try {
    const config = new Config();
    const client = new LLMClient(config);

    const prompt = `你是一个中国企业工商信息查询助手。请根据以下企业信息，查询并提供该企业的工商注册信息。

企业名称：${enterpriseName}
统一社会信用代码：${creditCode || '未提供'}

请严格按照以下JSON格式返回工商信息（如果某项信息无法确定，请填写"未查询到"）：

{
  "enterpriseName": "企业全称",
  "creditCode": "统一社会信用代码",
  "legalPerson": "法定代表人",
  "registeredCapital": "注册资本",
  "establishedDate": "成立日期",
  "businessStatus": "经营状态",
  "enterpriseType": "企业类型",
  "businessScope": "经营范围（精简为200字以内）",
  "registeredAddress": "注册地址",
  "businessTerm": "营业期限",
  "approvedDate": "核准日期",
  "orgCode": "组织机构代码",
  "taxpayerType": "纳税人类型",
  "industry": "所属行业"
}

注意：
1. 必须只返回JSON，不要返回任何其他文字说明
2. 如果是企业名称有误或不存在，也请尽量按格式返回，无法确定的字段填"未查询到"
3. 经营范围请精简到200字以内，保留核心业务
4. 纳税人类型请根据企业类型判断（一般纳税人/小规模纳税人）`;

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'system', content: '你是一个专业的中国企业工商信息查询助手，能够准确查询和返回企业的工商注册信息。你只返回JSON格式的数据，不返回其他文字。' },
      { role: 'user', content: prompt }
    ];

    const response = await client.invoke(messages as any, {
      model: 'doubao-seed-2-0-mini-260215',
      temperature: 0.1,
    });

    const businessInfo = extractJsonFromLlmResponse(response.content);

    if (!businessInfo) {
      return NextResponse.json({
        success: false,
        error: '无法解析工商信息',
        rawResponse: response.content
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: businessInfo
    });

  } catch (error) {
    console.error('工商信息查询失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '查询失败'
    }, { status: 500 });
  }
}
