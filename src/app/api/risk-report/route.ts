'use server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const riskId = searchParams.get('riskId')
  if (!riskId) return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 })

  const token = process.env.FEISHU_APP_TOKEN
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET
  const baseToken = process.env.FEISHU_BASE_TOKEN
  const tableId = process.env.FEISHU_TABLE_ID

  // 获取 tenant_access_token
  let tenantToken = token
  if (!tenantToken && appId && appSecret) {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    })
    const data = await res.json()
    tenantToken = data.tenant_access_token
  }
  if (!tenantToken || !baseToken || !tableId) return NextResponse.json({ error: '飞书配置缺失' }, { status: 500 })

  // 搜索记录
  const searchRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records/search`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter: { conjunction: 'and', conditions: [{ field_name: '检测ID', operator: 'is', value: [riskId] }] } })
  })
  const searchData = await searchRes.json()
  if (!searchData.data?.items?.length) return NextResponse.json({ error: '未找到记录' }, { status: 404 })

  const record = searchData.data.items[0]
  const fields = record.fields || {}

  // 解析报告内容
  let reportContent = null
  try {
    const raw = fields['报告内容'] || fields['reportContent'] || ''
    reportContent = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { reportContent = null }

  // 提取风险统计
  const overview = reportContent?.overview || {}
  const riskCounts = {
    red: overview.redCount || 0,
    yellow: overview.yellowCount || 0,
    green: overview.greenCount || 0
  }

  // 兼容旧格式
  if (!overview.redCount && fields['综合得分']) {
    const score = Number(fields['综合得分']) || 0
    const level = fields['综合风险等级'] || ''
    riskCounts.red = level.includes('极高') || level.includes('高') ? Math.floor(score / 10) : 0
    riskCounts.yellow = level.includes('中') ? Math.floor(score % 10) : 0
    riskCounts.green = 20 - riskCounts.red - riskCounts.yellow
  }

  return NextResponse.json({
    basicInfo: {
      enterpriseName: fields['企业名称'] || '',
      contactPerson: fields['联系人'] || '',
      contactPhone: fields['联系电话'] || '',
      industry: fields['所属行业'] || '',
      revenueScale: fields['年营收规模'] || '',
      creditCode: fields['统一信用代码'] || ''
    },
    riskLevel: fields['综合风险等级'] || '未知',
    riskCounts,
    reportContent,
    financialIndicators: reportContent?.financialIndicators || null,
    createdAt: fields['检测时间'] || fields['created_at'] || ''
  })
}
