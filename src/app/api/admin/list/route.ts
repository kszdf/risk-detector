import { NextRequest, NextResponse } from 'next/server';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'Z006bk7yuaxWalsdqoeck3mBnTb';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblYYxtHDeBAx15j';

// 管理员密钥
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hgttax_admin_2026';

// 获取飞书token
async function getFeishuToken(): Promise<string | null> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const data = await res.json();
  return data.tenant_access_token || null;
}

// 提取飞书字段值
function extractFieldValue(field: unknown): unknown {
  if (field === null || field === undefined) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'number' || typeof field === 'boolean') return field;
  if (Array.isArray(field)) {
    return field.map(item => {
      if (typeof item === 'object' && item !== null && 'text' in item) {
        return (item as { text: string }).text;
      }
      return item;
    }).join('');
  }
  return String(field);
}

function extractFeishuText(field: unknown): string {
  const value = extractFieldValue(field);
  if (value === undefined || value === null) return '';
  return String(value);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 鉴权：从query参数或cookie中获取admin_token
    const adminToken = searchParams.get('admin_token') || 
      req.cookies.get('admin_token')?.value || '';
    
    if (adminToken !== ADMIN_TOKEN) {
      return NextResponse.json({ error: '管理员密钥无效' }, { status: 403 });
    }

    // 搜索关键词
    const keyword = searchParams.get('keyword') || '';
    // 分页参数
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // 获取飞书token
    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ error: '获取飞书token失败' }, { status: 500 });
    }

    // 构建搜索条件
    const filterConditions: any[] = [];
    
    if (keyword) {
      filterConditions.push({
        field_name: '企业名称',
        operator: 'contains',
        value: [keyword]
      });
    }

    const requestBody: any = {
      page_size: Math.min(pageSize, 100),
      page_token: searchParams.get('page_token') || undefined,
      sort: [{
        field_name: '检测时间',
        desc: true
      }]
    };

    if (filterConditions.length > 0) {
      requestBody.filter = {
        conjunction: 'and',
        conditions: filterConditions
      };
    }

    // 查询飞书多维表
    const searchRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`,
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(requestBody)
      }
    );

    const searchData = await searchRes.json();
    
    if (searchData.code !== 0) {
      return NextResponse.json(
        { error: searchData.msg || '飞书API调用失败' },
        { status: 500 }
      );
    }

    const items = searchData.data?.items || [];
    const hasMore = searchData.data?.has_more || false;
    const pageToken = searchData.data?.page_token || '';
    const total = searchData.data?.total || items.length;

    // 转换为列表数据
    const list = items.map((item: any) => {
      const fields = item.fields || {};
      return {
        id: item.record_id,
        riskId: extractFeishuText(fields['检测ID']),
        enterpriseName: extractFeishuText(fields['企业名称']),
        creditCode: extractFeishuText(fields['统一信用代码']),
        industry: extractFeishuText(fields['所属行业']),
        riskLevel: extractFeishuText(fields['综合风险等级']),
        reportStatus: extractFeishuText(fields['报告状态']) || '待审核',
        submitTime: extractFeishuText(fields['检测时间']),
        highRiskCount: fields['高风险项数'] || 0,
        mediumRiskCount: fields['中风险项数'] || 0,
        lowRiskCount: fields['低风险项数'] || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        list,
        total,
        page,
        pageSize,
        hasMore,
        pageToken
      }
    });

  } catch (error) {
    console.error('Admin list API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
