import { NextRequest, NextResponse } from 'next/server';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'Z006bk7yuaxWalsdqoeck3mBnTb';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblYYxtHDeBAx15j';

// 管理员密钥
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hgttax_admin_2026';

// 附件字段ID
const ATTACHMENT_FIELD_ID = 'fldsMBvgFa';

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

// 根据riskId查找记录
async function findRecordByRiskId(token: string, riskId: string): Promise<any | null> {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search?page_size=10`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [
            { field_name: '检测ID', operator: 'is', value: [riskId] }
          ]
        }
      })
    }
  );
  const data = await res.json();
  if (data.code !== 0 || !data.data?.items?.length) return null;
  return data.data.items[0];
}

// 从飞书下载文件
async function downloadFeishuFile(token: string, fileToken: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  // 先获取文件信息
  const metaRes = await fetch(
    `https://open.feishu.cn/open-apis/drive/v1/medias/${fileToken}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  let fileName = `report_${fileToken}.docx`;
  if (metaRes.ok) {
    const metaData = await metaRes.json();
    if (metaData.data?.file_name) {
      fileName = metaData.data.file_name;
    }
  }

  // 下载文件内容
  const downloadRes = await fetch(
    `https://open.feishu.cn/open-apis/drive/v1/medias/${fileToken}/download`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  if (!downloadRes.ok) return null;
  
  const arrayBuffer = await downloadRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    fileName
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // 鉴权
    const adminToken = searchParams.get('admin_token') || 
      req.cookies.get('admin_token')?.value || '';
    
    if (adminToken !== ADMIN_TOKEN) {
      return NextResponse.json({ error: '管理员密钥无效' }, { status: 403 });
    }

    const riskId = searchParams.get('riskId');
    if (!riskId) {
      return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
    }

    // 获取飞书token
    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ error: '获取飞书token失败' }, { status: 500 });
    }

    // 查找记录
    const record = await findRecordByRiskId(token, riskId);
    if (!record) {
      return NextResponse.json({ error: '未找到对应检测记录' }, { status: 404 });
    }

    // 获取附件字段
    const fields = record.fields || {};
    const attachments = fields['完整报告'];
    
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return NextResponse.json({ error: '报告尚未生成，请稍后再试' }, { status: 404 });
    }

    // 取第一个附件
    const attachment = attachments[0];
    const fileToken = attachment.file_token || attachment.token;
    
    if (!fileToken) {
      return NextResponse.json({ error: '附件文件标识无效' }, { status: 500 });
    }

    // 下载文件
    const fileData = await downloadFeishuFile(token, fileToken);
    if (!fileData) {
      return NextResponse.json({ error: '文件下载失败' }, { status: 500 });
    }

    // 返回文件
    return new NextResponse(fileData.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.fileName)}"`,
        'Content-Length': fileData.buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Download report API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
