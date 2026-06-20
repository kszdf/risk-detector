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
    
    // 构建飞书多维表格字段数据（使用中文字段名）
    const fields: Record<string, any> = {
      // 基本信息
      '企业名称': body.enterpriseName || '',
      '联系人': body.contactPerson || '',
      '联系电话': body.contactPhone || '',
      '客户邮箱': body.customerEmail || '',
      '所属行业': body.industry || '',
      '检测年份': body.detectionYear || new Date().getFullYear().toString(),
      
      // 财务数据（数值类型）
      '营业收入(万元)': Number(body.revenue) || 0,
      '营业成本(万元)': Number(body.cost) || 0,
      '利润总额(万元)': Number(body.profit) || 0,
      '实缴增值税(万元)': Number(body.vat) || 0,
      '实缴所得税(万元)': Number(body.cit) || 0,
      '总资产(万元)': Number(body.totalAssets) || 0,
      '总负债(万元)': Number(body.totalLiabilities) || 0,
      '应收账款(万元)': Number(body.receivables) || 0,
      '期末存货(万元)': Number(body.inventory) || 0,
      '预收账款(万元)': Number(body.advancePayment) || 0,
      
      // 财务指标（数值类型）
      '增值税税负率': Number(body.vatRate) || 0,
      '所得税贡献率': Number(body.citRate) || 0,
      '毛利率': Number(body.grossMargin) || 0,
      '净利率': Number(body.netMargin) || 0,
      '资产负债率': Number(body.debtRatio) || 0,
      
      // 报告信息
      '检测ID': detectionId,
      '检测时间': detectionTime,
      '报告状态': body.reportStatus || '待审核',
      '综合风险等级': getRiskLevelLabel(body.riskScore || 0),
      
      // 风险结果（字符串类型）
      '通用风险结果': body.generalRiskResults || '{}',
      '行业风险结果': body.industryRiskResults || '{}',
      '风险项明细': body.riskDetails || '',
      '张老师批注': '',
      '报告发送时间': '',
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
