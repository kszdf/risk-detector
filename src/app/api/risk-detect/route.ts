import { NextRequest, NextResponse } from 'next/server';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'cli_aabfc053e138dcd6';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'ZvwvbfFoZa5V0hsndvBcNyc5nQg';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblyGuEsCmAVyGwa';

// 获取 tenant_access_token
async function getTenantAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
      }),
    });

    const data = await response.json();
    if (data.code === 0 && data.tenant_access_token) {
      return data.tenant_access_token;
    }
    console.error('Failed to get tenant_access_token:', data);
    return null;
  } catch (error) {
    console.error('Error getting tenant_access_token:', error);
    return null;
  }
}

// 飞书字段映射
const FIELD_MAPPING: Record<string, string> = {
  // 基本信息
  enterpriseName: 'fldvtGbzTw',
  contactPerson: 'fldDmFzcrS',
  contactPhone: 'fld9tVuKCg',
  customerEmail: 'fldzMHwrOx',
  industry: 'fldEJGmwE3j',
  detectionYear: 'fldRczwc3M',
  
  // 财务数据
  revenue: 'fldnGpi9xP',
  cost: 'fldKE4WxYW',
  profit: 'fldu4oDvq1F',
  vat: 'fldihKYTi9',
  cit: 'fldMGJYFGVW',
  totalAssets: 'fldjSqFYn4',
  totalLiabilities: 'fldm4aFcvz',
  receivables: 'fld6yB2IcV',
  inventory: 'fldF9DfiOU',
  advancePayment: 'fldvx6FQS0',
  
  // 财务指标
  vatRate: 'fldfMvRzHf',
  citRate: 'fldkFzR2yn',
  grossMargin: 'fldveWv3mZ',
  netMargin: 'fldWE4GXcY',
  debtRatio: 'fldCwtB2qe',
  
  // 报告信息
  detectionId: 'fld1iQgWrA',
  detectionTime: 'fldUVMDjFx',
  reportStatus: 'fldCrKtkRY',
  riskLevel: 'fldTmZbU3f',
  
  // 风险详情
  generalRiskResults: 'fldRvw5LGx',
  industryRiskResults: 'fld8iYaf4u',
  riskDetails: 'fldp2QI5qf',
  teacherComment: 'fldKk7gVgv',
  reportSentTime: 'fldq2b1GKt',
};

// 生成检测ID
function generateDetectionId(): string {
  const now = new Date();
  const dateStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(/\//g, '').replace(/, /g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RC${dateStr}${random}`;
}

// 风险等级计算
function getRiskLevelLabel(score: number): string {
  if (score === 0) return '低风险';
  if (score <= 2) return '中风险';
  if (score <= 5) return '高风险';
  return '极高风险';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 获取飞书 access_token
    const token = await getTenantAccessToken();
    if (!token) {
      return NextResponse.json(
        { success: false, error: '获取飞书访问令牌失败' },
        { status: 500 }
      );
    }

    // 生成检测ID和检测时间
    const detectionId = generateDetectionId();
    const detectionTime = new Date().toISOString();
    
    // 构建飞书多维表格字段数据
    const fields: Record<string, any> = {
      [FIELD_MAPPING.detectionId]: detectionId,
      [FIELD_MAPPING.detectionTime]: detectionTime,
      [FIELD_MAPPING.reportStatus]: body.reportStatus || '待审核',
      [FIELD_MAPPING.enterpriseName]: body.enterpriseName || '',
      [FIELD_MAPPING.contactPerson]: body.contactPerson || '',
      [FIELD_MAPPING.contactPhone]: body.contactPhone || '',
      [FIELD_MAPPING.customerEmail]: body.customerEmail || '',
      [FIELD_MAPPING.industry]: body.industry || '',
      [FIELD_MAPPING.detectionYear]: body.detectionYear || new Date().getFullYear().toString(),
      
      // 财务数据
      [FIELD_MAPPING.revenue]: body.revenue || 0,
      [FIELD_MAPPING.cost]: body.cost || 0,
      [FIELD_MAPPING.profit]: body.profit || 0,
      [FIELD_MAPPING.vat]: body.vat || 0,
      [FIELD_MAPPING.cit]: body.cit || 0,
      [FIELD_MAPPING.totalAssets]: body.totalAssets || 0,
      [FIELD_MAPPING.totalLiabilities]: body.totalLiabilities || 0,
      [FIELD_MAPPING.receivables]: body.receivables || 0,
      [FIELD_MAPPING.inventory]: body.inventory || 0,
      [FIELD_MAPPING.advancePayment]: body.advancePayment || 0,
      
      // 财务指标
      [FIELD_MAPPING.vatRate]: body.vatRate || 0,
      [FIELD_MAPPING.citRate]: body.citRate || 0,
      [FIELD_MAPPING.grossMargin]: body.grossMargin || 0,
      [FIELD_MAPPING.netMargin]: body.netMargin || 0,
      [FIELD_MAPPING.debtRatio]: body.debtRatio || 0,
      
      // 风险信息
      [FIELD_MAPPING.riskLevel]: getRiskLevelLabel(body.riskScore || 0),
      [FIELD_MAPPING.generalRiskResults]: body.generalRiskResults || '{}',
      [FIELD_MAPPING.industryRiskResults]: body.industryRiskResults || '{}',
      [FIELD_MAPPING.riskDetails]: body.riskDetails || '',
    };

    // 写入飞书多维表格
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fields: fields,
        }),
      }
    );

    const result = await response.json();

    if (result.code === 0) {
      return NextResponse.json({
        success: true,
        data: {
          detectionId,
          recordId: result.data?.record?.record_id,
        },
        message: '检测报告已成功保存',
      });
    } else {
      console.error('飞书API错误:', result);
      return NextResponse.json(
        { success: false, error: `飞书写入失败: ${result.msg}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
