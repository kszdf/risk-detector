'use server'
import { NextRequest, NextResponse } from 'next/server'

// 提取飞书文本字段内容
function extractFeishuText(field: any): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return field.map((item: any) => item.text || '').join('')
  return String(field)
}

// 提取并解析JSON字段
function extractJsonField(field: any): any {
  const raw = extractFeishuText(field)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

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

  const fields = searchData.data.items[0].fields || {}

  // 解析报告内容
  const reportContent = extractJsonField(fields['报告内容'])
  
  // 修复 industryBenchmarks 数据结构
  if (reportContent?.industryBenchmarks && Array.isArray(reportContent.industryBenchmarks)) {
    reportContent.industryBenchmarks = { industry: extractFeishuText(fields['所属行业']) || '', items: reportContent.industryBenchmarks }
  }

  // 提取风险统计
  let riskCounts = { red: 0, yellow: 0, green: 0 }
  if (reportContent?.overview) {
    riskCounts = {
      red: reportContent.overview.redCount || 0,
      yellow: reportContent.overview.yellowCount || 0,
      green: reportContent.overview.greenCount || 0
    }
  } else if (reportContent?.highRiskItems) {
    riskCounts = {
      red: reportContent.highRiskItems?.length || 0,
      yellow: reportContent.mediumRiskItems?.length || 0,
      green: reportContent.lowRiskItems?.length || 0
    }
  }

  return NextResponse.json({
    basicInfo: {
      enterpriseName: extractFeishuText(fields['企业名称']),
      contactPerson: extractFeishuText(fields['联系人']),
      contactPhone: extractFeishuText(fields['联系电话']),
      industry: extractFeishuText(fields['所属行业']),
      revenueScale: extractFeishuText(fields['年营收规模']),
      creditCode: extractFeishuText(fields['统一信用代码'])
    },
    riskLevel: extractFeishuText(fields['综合风险等级']) || '未知',
    riskCounts,
    reportContent,
    financialIndicators: reportContent?.financialIndicators || null,
    createdAt: extractFeishuText(fields['检测时间']) || ''
  })
}
