// 飞书多维表同步接口 - 将问卷数据写入飞书bitable
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const riskId = searchParams.get('riskId') || ''
  const enterpriseName = searchParams.get('enterpriseName') || ''
  const creditCode = searchParams.get('creditCode') || ''
  const contactPerson = searchParams.get('contactPerson') || ''
  const contactPhone = searchParams.get('contactPhone') || ''
  const industry = searchParams.get('industry') || ''
  const revenueScale = searchParams.get('revenueScale') || ''
  const highCount = searchParams.get('highCount') || '0'
  const mediumCount = searchParams.get('mediumCount') || '0'
  const lowCount = searchParams.get('lowCount') || '0'
  const reportContent = searchParams.get('reportContent') || ''
  const answersStr = searchParams.get('answers') || '{}'

  const FEISHU_APP_ID = process.env.FEISHU_APP_ID || ''
  const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || ''
  const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || ''
  const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || ''

  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    return Response.json({ success: false, code: -1, msg: '飞书配置缺失' }, { status: 500 })
  }

  // Q字段名映射（与飞书表精确匹配）
  const QUESTION_FIELD_MAP: Record<string, string> = {
    'q1': 'q1_逾期申报', 'q2': 'q2_连续零申报', 'q3': 'q3_增值税与所得税收入差异',
    'q4': 'q4_连续三年亏损', 'q5': 'q5_异常发票', 'q6': 'q6_发票经营范围不符',
    'q7': 'q7_变票入账', 'q8': 'q8_进销项不匹配', 'q9': 'q9_隐匿收入',
    'q10': 'q10_账外经营', 'q11': 'q11_利润虚高', 'q12': 'q12_库存账实不符',
    'q13': 'q13_个人消费报销', 'q14': 'q14_股东往来款过大', 'q15': 'q15_利润临界值享受小微',
    'q16': 'q16_三无费用', 'q17': 'q17_税收洼地核定', 'q18': 'q18_关联交易价格偏离',
    'q19': 'q19_多层架构转移利润', 'q20': 'q20_非实际员工发工资'
  }

  try {
    // 1. 获取飞书 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.code !== 0 || !tokenData.tenant_access_token) {
      return Response.json({ success: false, code: tokenData.code, msg: '获取飞书token失败: ' + (tokenData.msg || '') }, { status: 500 })
    }
    const token = tokenData.tenant_access_token

    // 2. 构建写入字段
    const fields: Record<string, any> = {
      '检测ID': riskId,
      '企业名称': enterpriseName,
      '统一信用代码': creditCode,
      '联系人': contactPerson,
      '联系电话': contactPhone,
      '所属行业': industry,
      '年营收规模': revenueScale,
      '高风险项数': Number(highCount) || 0,
      '中风险项数': Number(mediumCount) || 0,
      '低风险项数': Number(lowCount) || 0,
    }

    if (reportContent) {
      fields['报告内容JSON'] = reportContent
    }

    // 3. 解析 answers 并转为布尔值写入 checkbox 字段
    let answers: Record<string, number> = {}
    try {
      answers = JSON.parse(answersStr)
    } catch {
      // answers 解析失败，跳过
    }

    for (const [qKey, value] of Object.entries(answers)) {
      const fieldName = QUESTION_FIELD_MAP[qKey]
      if (fieldName) {
        const numVal = Number(value) || 0
        fields[fieldName] = numVal > 0
      }
    }

    // 4. 写入飞书多维表
    const feishuRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )
    const feishuData = await feishuRes.json()

    if (feishuData.code !== 0) {
      console.error('飞书写入失败:', JSON.stringify(feishuData))
      return Response.json({ success: false, code: feishuData.code, msg: '飞书写入失败: ' + (feishuData.msg || '') }, { status: 500 })
    }

    return Response.json({ success: true, code: 0, data: feishuData.data })
  } catch (error: any) {
    console.error('飞书同步异常:', error)
    return Response.json({ success: false, code: -1, msg: error.message || '同步失败' }, { status: 500 })
  }
}
