import { NextRequest, NextResponse } from 'next/server'

/**
 * 统一社会信用代码解析
 * 结构（18位）：
 * 第1位: 登记管理部门代码
 * 第2位: 机构类别代码
 * 第3-8位: 行政区划码
 * 第9-17位: 主体标识码（组织机构代码）
 * 第18位: 校验码
 */

const DEPT_CODES: Record<string, string> = {
  '1': '机构编制机关', '5': '民政部门', '9': '工商部门',
  'Y': '市场监管部门', 'A': '司法行政部门', 'N': '农业农村部门',
}

const CATEGORY_MAP: Record<string, Record<string, string>> = {
  '1': { '1': '机关', '2': '事业单位', '3': '群众团体', '9': '其他' },
  '5': { '1': '社会团体', '2': '民办非企业单位', '3': '基金会', '9': '其他' },
  '9': { '1': '企业', '2': '个体工商户', '3': '农民专业合作社', '9': '其他' },
  'Y': { '1': '企业', '2': '个体工商户', '3': '农民专业合作社', '9': '其他' },
  'A': { '1': '律师执业机构', '2': '公证机构', '9': '其他' },
  'N': { '1': '事业单位', '2': '社会团体', '9': '其他' },
}

// 常用行政区划码（覆盖主要城市，更多可通过数据库扩展）
const REGION_MAP: Record<string, string> = {
  // 北京
  '110000': '北京市', '110100': '北京市',
  // 天津
  '120000': '天津市',
  // 上海
  '310000': '上海市', '310100': '上海市',
  // 重庆
  '500000': '重庆市',
  // 江苏
  '320000': '江苏省', '320100': '南京市', '320200': '无锡市', '320300': '徐州市',
  '320400': '常州市', '320500': '苏州市', '320600': '南通市', '320700': '连云港市',
  '320800': '淮安市', '320900': '盐城市', '321000': '扬州市', '321100': '镇江市',
  '321200': '泰州市', '321300': '宿迁市',
  // 浙江
  '330000': '浙江省', '330100': '杭州市', '330200': '宁波市', '330300': '温州市',
  '330400': '嘉兴市', '330500': '湖州市', '330600': '绍兴市',
  // 广东
  '440000': '广东省', '440100': '广州市', '440300': '深圳市', '440400': '珠海市',
  '440600': '佛山市', '441300': '惠州市', '441900': '东莞市',
  // 山东
  '370000': '山东省', '370100': '济南市', '370200': '青岛市',
  // 四川
  '510000': '四川省', '510100': '成都市',
  // 湖北
  '420000': '湖北省', '420100': '武汉市',
  // 湖南
  '430000': '湖南省', '430100': '长沙市',
  // 河北
  '130000': '河北省', '130100': '石家庄市',
  // 河南
  '410000': '河南省', '410100': '郑州市',
  // 福建
  '350000': '福建省', '350100': '福州市', '350200': '厦门市',
  // 安徽
  '340000': '安徽省', '340100': '合肥市',
  // 辽宁
  '210000': '辽宁省', '210100': '沈阳市', '210200': '大连市',
  // 陕西
  '610000': '陕西省', '610100': '西安市',
}

function parseCreditCode(code: string) {
  code = code.trim().toUpperCase()
  if (code.length !== 18) {
    return { valid: false, reason: `编码长度为${code.length}位（标准应为18位）` }
  }

  const dept = code[0]
  const category = code[1]
  const regionCode = code.substring(2, 8)
  const orgCode = code.substring(8, 17)
  const checkDigit = code[17]

  const deptName = DEPT_CODES[dept] || `未知部门(${dept})`
  const categoryMap = CATEGORY_MAP[dept] || {}
  const categoryName = categoryMap[category] || `未知类别(${category})`
  const regionName = REGION_MAP[regionCode] || `行政区划${regionCode}`

  // 校验码验证（GB 32100-2015）
  const charset = '0123456789ABCDEFGHJKLMNPQRTUWXY'
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const idx = charset.indexOf(code[i])
    if (idx === -1) return { valid: false, reason: `第${i + 1}位"${code[i]}"不在合法字符集中` }
    sum += idx * weights[i]
  }
  const expectedCheck = charset[(31 - (sum % 31)) % 31]
  const checksumValid = expectedCheck === checkDigit

  return {
    valid: checksumValid,
    checksumMismatch: !checksumValid,
    deptName,
    categoryName,
    fullType: `${deptName} · ${categoryName}`,
    regionCode,
    regionName,
    orgCode,
    checkDigit,
    expectedCheck,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyName = searchParams.get('name') || ''
  const creditCode = searchParams.get('creditCode') || ''

  if (!companyName && !creditCode) {
    return NextResponse.json({ error: '请提供企业名称或信用代码' }, { status: 400 })
  }

  // 纯本地解析，不依赖任何外部API
  const parsed = creditCode ? parseCreditCode(creditCode) : null

  return NextResponse.json({
    available: true,
    found: true,
    companyName: companyName || '',
    creditCode: creditCode || '',
    creditCodeAnalysis: parsed,
    dataFromSelfDeclaration: true,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
