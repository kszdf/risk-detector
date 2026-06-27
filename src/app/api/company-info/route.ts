import { NextRequest, NextResponse } from 'next/server'

// 风鸟 API 配置
const FN_API_KEY = process.env.FN_API_KEY || ''
const FN_BASE_URL = 'https://m.riskbird.com/prod-qbb-api'
const FN_CHANNEL = process.env.FN_CHANNEL || 'clawhub'

interface FengniaoResponse {
  code: number
  msg: string
  data?: any
  success: boolean
}

async function fetchFengniao(endpoint: string, params: Record<string, string>): Promise<FengniaoResponse> {
  const url = new URL(FN_BASE_URL + endpoint)
  url.searchParams.set('apikey', FN_API_KEY)
  url.searchParams.set('channel', FN_CHANNEL)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`风鸟 API 错误 ${res.status}`)
  }

  return res.json()
}

// 通过企业名称搜索获取 entid
async function searchCompany(keyword: string): Promise<{ entid: string; name: string } | null> {
  try {
    const result = await fetchFengniao('/skills/searchHint', { key: keyword })
    if (result.code === 200 && result.data && result.data.length > 0) {
      return {
        entid: result.data[0].entid,
        name: result.data[0].entName || keyword,
      }
    }
    return null
  } catch (error) {
    console.error('风鸟搜索失败:', error)
    return null
  }
}

// 获取企业基本信息
async function getCompanyBasicInfo(entid: string): Promise<any> {
  try {
    const result = await fetchFengniao('/skills/dataDimension?version=B1', { entid })
    if (result.code === 200 && result.data) {
      return result.data
    }
    return null
  } catch (error) {
    console.error('风鸟基本信息查询失败:', error)
    return null
  }
}

// 获取企业风险信息（被执行、失信、经营异常等）
async function getCompanyRiskInfo(entid: string): Promise<{
  executed: any[]
  dishonest: any[]
  abnormalOperation: any[]
}> {
  const [executed, dishonest, abnormalOp] = await Promise.all([
    fetchFengniao('/skills/dataDimension?version=C2', { entid }).catch(() => null),
    fetchFengniao('/skills/dataDimension?version=C3', { entid }).catch(() => null),
    fetchFengniao('/skills/dataDimension?version=D1', { entid }).catch(() => null),
  ])

  return {
    executed: executed?.code === 200 ? (executed.data || []) : [],
    dishonest: dishonest?.code === 200 ? (dishonest.data || []) : [],
    abnormalOperation: abnormalOp?.code === 200 ? (abnormalOp.data || []) : [],
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyName = searchParams.get('name') || ''
  const creditCode = searchParams.get('creditCode') || ''

  if (!companyName && !creditCode) {
    return NextResponse.json({ error: '请提供企业名称或信用代码' }, { status: 400 })
  }

  if (!FN_API_KEY) {
    return NextResponse.json({
      error: '工商信息查询服务未配置，请联系管理员',
      available: false,
    })
  }

  try {
    // Step 1: 搜索企业获取 entid
    const company = await searchCompany(companyName || creditCode)
    if (!company) {
      return NextResponse.json({
        available: true,
        found: false,
        companyName,
        message: '未找到该企业的工商信息',
      })
    }

    // Step 2: 获取基本信息（和风险信息并行）
    const [basicInfo, riskInfo] = await Promise.all([
      getCompanyBasicInfo(company.entid),
      getCompanyRiskInfo(company.entid),
    ])

    if (!basicInfo) {
      return NextResponse.json({
        available: true,
        found: true,
        companyName: company.name,
        message: '获取企业详细信息失败',
      })
    }

    // Step 3: 整理返回数据
    const companyData = {
      available: true,
      found: true,
      companyName: basicInfo.companyName || company.name,
      creditCode: basicInfo.creditCode || creditCode,
      legalPerson: basicInfo.legalPerson || '',
      registeredCapital: basicInfo.registeredCapital || '',
      establishDate: basicInfo.establishDate || '',
      businessStatus: basicInfo.businessStatus || '',
      companyType: basicInfo.companyType || '',
      registeredAddress: basicInfo.registeredAddress || '',
      businessScope: basicInfo.businessScope || '',
      industry: basicInfo.industry || '',
      operationPeriod: basicInfo.operationPeriod || '',
      registrationAuthority: basicInfo.registrationAuthority || '',
      // 风险信息汇总
      riskSummary: {
        executedCount: riskInfo.executed.length,
        dishonestCount: riskInfo.dishonest.length,
        abnormalOperationCount: riskInfo.abnormalOperation.length,
        hasRisk: riskInfo.executed.length > 0 || riskInfo.dishonest.length > 0 || riskInfo.abnormalOperation.length > 0,
      },
      // 详情链接
      detailUrl: `https://www.riskbird.com/company/${company.entid}`,
      gsxtUrl: `https://www.gsxt.gov.cn/corpquery-search-info.html?keyword=${encodeURIComponent(companyName || creditCode)}`,
    }

    return NextResponse.json(companyData, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // 缓存24小时
      },
    })
  } catch (error) {
    console.error('企业信息查询异常:', error)
    return NextResponse.json(
      { error: '查询企业信息失败', available: false },
      { status: 500 }
    )
  }
}
