import { NextRequest, NextResponse } from 'next/server'

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// 行业基准数据
const INDUSTRY_BENCHMARKS: Record<string, {
  grossMargin: { min: number; max: number };
  netMargin: { min: number; max: number };
  vatRate: { min: number; max: number };
  citRate: { min: number; max: number };
}> = {
  '制造业': { grossMargin: { min: 25, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.8, max: 2.0 } },
  '批发零售业': { grossMargin: { min: 15, max: 30 }, netMargin: { min: 2, max: 8 }, vatRate: { min: 1.0, max: 3.0 }, citRate: { min: 0.3, max: 1.5 } },
  '批发零售': { grossMargin: { min: 15, max: 30 }, netMargin: { min: 2, max: 8 }, vatRate: { min: 1.0, max: 3.0 }, citRate: { min: 0.3, max: 1.5 } },
  '建筑业': { grossMargin: { min: 8, max: 18 }, netMargin: { min: 2, max: 6 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '建筑房地产': { grossMargin: { min: 8, max: 18 }, netMargin: { min: 2, max: 6 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '商务服务业': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 15, max: 30 }, vatRate: { min: 2.5, max: 5.0 }, citRate: { min: 1.0, max: 3.0 } },
  '其他服务业': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 15, max: 30 }, vatRate: { min: 2.5, max: 5.0 }, citRate: { min: 1.0, max: 3.0 } },
  '生活服务业': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.5 }, citRate: { min: 0.5, max: 2.0 } },
  '餐饮住宿': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.5 }, citRate: { min: 0.5, max: 2.0 } },
  '交通运输': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } },
  '科技互联网': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '信息技术': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '农林牧渔': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } },
  '其他': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } }
};

// v5版本问卷题目完整映射（带税收政策依据）- 20题版本
interface V5QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  question: string;
  consequence: string;
  taxPolicy: string;
}

const V5_QUESTION_MAPPING: Record<string, V5QuestionInfo> = {
  // 维度一：申报与纳税合规 (q1-q4)
  'q1': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '近12个月是否存在逾期申报或逾期缴纳税款？',
    name: '逾期申报',
    consequence: '按日加收万分之五滞纳金，并处0.5-5倍罚款',
    taxPolicy: '《税收征收管理法》第六十二条、第六十四条'
  },
  'q2': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '是否存在连续零申报或负申报超过6个月？',
    name: '连续零申报超6个月',
    consequence: '税务机关可认定为异常申报，要求企业进行纳税评估或稽查',
    taxPolicy: '《税收征收管理法》第三十五条；国税发〔2005〕43号'
  },
  'q3': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '增值税申报收入与企业所得税申报收入是否存在较大差异且无合理说明？',
    name: '增值税与所得税收入差异',
    consequence: '需进行收入差异说明，否则面临纳税调整和补税风险',
    taxPolicy: '《税收征收管理法》第三十五条；国税发〔2009〕28号'
  },
  'q4': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '企业是否连续三年及以上亏损但仍持续经营？',
    name: '连续三年亏损仍经营',
    consequence: '连续亏损是纳税评估重点关注对象，可能被认定为空壳公司或存在隐匿收入',
    taxPolicy: '国税发〔2005〕43号；《企业所得税法》第四十七条'
  },

  // 维度二：发票管理 (q5-q8)
  'q5': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在无票采购、取得走逃企业发票或品名不符的异常发票？',
    name: '异常发票/走逃企业',
    consequence: '进项税额转出，补缴增值税，0.5-5倍罚款，情节严重追究刑事责任',
    taxPolicy: '《发票管理办法》第二十二条；国税发〔1995〕192号；国家税务总局公告2014年第39号'
  },
  'q6': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在发票开具内容与实际经营范围明显不符？',
    name: '发票经营范围不符',
    consequence: '涉嫌虚开增值税发票，补缴税款+罚款，最高可判无期徒刑',
    taxPolicy: '《发票管理办法》第二十二条；《刑法》第二百零五条'
  },
  'q7': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在大额现金交易或通过个人账户收款后"变票"入账？',
    name: '变票入账',
    consequence: '按虚开发票论处，补缴税款+罚款，情节严重追究刑事责任',
    taxPolicy: '《发票管理办法》第二十二条；《税收征收管理法》第六十三条'
  },
  'q8': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在进销项品名/数量严重不匹配（如进项钢材、销项电子产品）？',
    name: '进销项不匹配',
    consequence: '面临增值税异常抵扣核查，可能要求进项转出并补缴税款',
    taxPolicy: '国家税务总局公告2014年第39号；国税发〔2005〕43号'
  },

  // 维度三：收入与成本 (q9-q12)
  'q9': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在延迟开票确认收入、部分收入未入账或使用个人账户收款未报税？',
    name: '隐匿收入/个人账户收款',
    consequence: '补缴增值税和企业所得税，0.5-5倍罚款，滞纳金',
    taxPolicy: '《税收征收管理法》第六十三条；《增值税暂行条例》第十九条'
  },
  'q10': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在账外经营（部分业务不入账，通过私人账户收支）？',
    name: '账外经营',
    consequence: '按偷税论处，补缴增值税+企业所得税，并处0.5-5倍罚款，滞纳金',
    taxPolicy: '《税收征收管理法》第六十三条；《会计法》第九条、第十六条'
  },
  'q11': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在利润明显虚高（毛利率远超同行但无法合理解释）？',
    name: '利润虚高',
    consequence: '面临特别纳税调整，可能被要求补缴企业所得税并调整转让定价',
    taxPolicy: '国税发〔2005〕43号；《企业所得税法》第四十一条'
  },
  'q12': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在库存账实不符（账面库存远大于实际、或库存长期只增不减）？',
    name: '库存账实不符',
    consequence: '涉嫌隐匿收入或虚增进项，面临增值税和企业所得税调整',
    taxPolicy: '《增值税暂行条例》第十条；国税发〔2003〕136号'
  },

  // 维度四：费用与往来 (q13-q16)
  'q13': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在使用与经营无关的发票报销、或报销股东/员工个人消费？',
    name: '个人消费报销',
    consequence: '费用调增，补缴企业所得税，个人所得税',
    taxPolicy: '《企业所得税法》第八条、第十条；财税〔2003〕158号'
  },
  'q14': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在股东与公司之间往来款余额过大（其他应收/其他应付占总资产比例异常）？',
    name: '股东往来款过大',
    consequence: '视同分红，需代扣代缴20%个人所得税；涉嫌抽逃资金',
    taxPolicy: '财税〔2003〕158号第二条；《个人所得税法》第二条'
  },
  'q15': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在应纳税所得额刚好卡在小微企业/小型微利企业标准临界值附近？',
    name: '利润临界值享受小微',
    consequence: '如被认定人为调节利润，将追缴优惠减免的税款+滞纳金',
    taxPolicy: '《企业所得税法》第二十八条；国家税务总局公告2023年第6号'
  },
  'q16': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在大额费用列支无合同/无审批/无发票"三无"支撑？',
    name: '三无费用',
    consequence: '费用调增，补缴企业所得税；发票不合规不得作为税前扣除凭证',
    taxPolicy: '《企业所得税法》第八条；《发票管理办法》第二十条'
  },

  // 维度五：架构与关联交易 (q17-q20)
  'q17': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否在税收洼地注册公司并享受核定征收？',
    name: '税收洼地核定',
    consequence: '核定征收优惠可能被否定，要求查账征收，补缴全部税款+滞纳金',
    taxPolicy: '国家税务总局公告2019年第48号'
  },
  'q18': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在关联方之间资金无偿拆借、或商品/服务价格明显偏离市场价？',
    name: '关联交易价格偏离',
    consequence: '转让定价调整风险，需补缴税款+滞纳金+利息',
    taxPolicy: '《企业所得税法》第四十一条至第四十八条'
  },
  'q19': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在通过多层架构（个独/合伙/壳公司）转移利润至低税率主体？',
    name: '多层架构转移利润',
    consequence: '一般反避税调查，追缴全部少缴税款，可能处1-5倍罚款',
    taxPolicy: '《企业所得税法》第四十七条；国税发〔2009〕2号'
  },
  'q20': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在向非实际员工发放"工资"、或股东/家庭消费在公司列支？',
    name: '非实际员工发工资',
    consequence: '工资不得税前扣除，补缴企业所得税；涉及个税偷逃',
    taxPolicy: '《个人所得税法》第二条；《企业所得税法》第十条'
  }
};

// 风险等级由答案值直接决定：0=无此情况(low), 1=存在但较轻(medium), 2=存在且严重(high)

// 20个问题的飞书字段映射
const QUESTION_FIELD_MAP: Record<string, string> = {
  'q1': 'q1_逾期申报', 'q2': 'q2_连续零申报', 'q3': 'q3_增值税与所得税收入差异',
  'q4': 'q4_连续三年亏损', 'q5': 'q5_异常发票', 'q6': 'q6_发票经营范围不符',
  'q7': 'q7_变票入账', 'q8': 'q8_进销项不匹配', 'q9': 'q9_隐匿收入',
  'q10': 'q10_账外经营', 'q11': 'q11_利润虚高', 'q12': 'q12_库存账实不符',
  'q13': 'q13_个人消费报销', 'q14': 'q14_股东往来款过大', 'q15': 'q15_利润临界值享受小微',
  'q16': 'q16_三无费用', 'q17': 'q17_税收洼地核定', 'q18': 'q18_关联交易价格偏离',
  'q19': 'q19_多层架构转移利润', 'q20': 'q20_非实际员工发工资'
};

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

// 提取飞书文本字段内容
function extractFeishuText(field: unknown): string {
  const value = extractFieldValue(field);
  if (value === undefined || value === null) return '';
  return String(value);
}

// 提取并解析JSON字段
function extractJsonField(field: unknown): any {
  const raw = extractFeishuText(field);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// 提取飞书布尔值字段
function extractFeishuBoolean(field: unknown): boolean {
  const value = extractFieldValue(field);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return false;
}

// 提取飞书数字字段（用于三档风险等级 0/1/2，兼容旧版 boolean）
function extractFeishuRiskLevel(field: unknown): number {
  const value = extractFieldValue(field);
  if (typeof value === 'number') {
    // 新格式：0/1/2 直接返回；旧格式 boolean (0/1) 映射为 0/2
    if (value === 2) return 2;
    if (value === 1) return 1;  // 可能是新格式的"较轻"或旧格式的"true"
    return 0;
  }
  if (typeof value === 'boolean') {
    // 旧版 boolean 兼容：true 映射为"存在但较轻"(1)，false 映射为"无此情况"(0)
    return value ? 1 : 0;
  }
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0 && num <= 2) return num;
    if (value === 'true') return 1;
  }
  return 0;
}

// 获取数字值
function getNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// 计算财务指标
interface FinancialData {
  periodType: string;
  periodValue: string;
  revenue: number;
  cost: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
}

function calculateMetrics(data: FinancialData) {
  const grossMargin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
  const vatRate = data.revenue > 0 ? (data.vatPaid / data.revenue) * 100 : 0;
  const citRate = data.revenue > 0 ? (data.incomeTaxPaid / data.revenue) * 100 : 0;
  const debtRatio = data.totalAssets > 0 ? (data.totalLiabilities / data.totalAssets) * 100 : 0;
  return { grossMargin, vatRate, citRate, debtRatio };
}

// 综合风险等级判定
function determineOverallLevel(redCount: number, yellowCount: number): { level: string; icon: string } {
  if (redCount >= 4) {
    return { level: '高风险', icon: '🔴' };
  } else if (redCount >= 2) {
    return { level: '中高风险', icon: '🟠' };
  } else if (redCount >= 1 || yellowCount >= 1) {
    return { level: '中风险', icon: '🟡' };
  } else {
    return { level: '低风险', icon: '🟢' };
  }
}

// 计算行业基准对比
interface BenchmarkItem {
  name: string;
  unit: string;
  benchmarkMin: number;
  benchmarkMax: number;
  actual: number;
  status: string;
}

function calculateIndustryBenchmarks(
  revenue: number,
  cost: number,
  vatPaid: number,
  incomeTaxPaid: number,
  totalAssets: number,
  totalLiabilities: number,
  industry: string
): { industry: string; items: BenchmarkItem[] } {
  const items: BenchmarkItem[] = [];
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  
  const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  const vatRate = revenue > 0 ? (vatPaid / revenue) * 100 : 0;
  const citRate = revenue > 0 ? (incomeTaxPaid / revenue) * 100 : 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  items.push({
    name: '毛利率',
    unit: '%',
    benchmarkMin: benchmarks.grossMargin.min,
    benchmarkMax: benchmarks.grossMargin.max,
    actual: parseFloat(grossMargin.toFixed(1)),
    status: grossMargin < benchmarks.grossMargin.min ? 'below' : grossMargin > benchmarks.grossMargin.max ? 'above' : 'normal'
  });

  items.push({
    name: '所得税贡献率',
    unit: '%',
    benchmarkMin: benchmarks.citRate.min,
    benchmarkMax: benchmarks.citRate.max,
    actual: parseFloat(citRate.toFixed(2)),
    status: citRate < benchmarks.citRate.min ? 'below' : citRate > benchmarks.citRate.max ? 'above' : 'normal'
  });

  items.push({
    name: '增值税税负率',
    unit: '%',
    benchmarkMin: benchmarks.vatRate.min,
    benchmarkMax: benchmarks.vatRate.max,
    actual: parseFloat(vatRate.toFixed(2)),
    status: vatRate < benchmarks.vatRate.min ? 'below' : vatRate > benchmarks.vatRate.max ? 'above' : 'normal'
  });

  const debtBenchMax = 70;
  items.push({
    name: '资产负债率',
    unit: '%',
    benchmarkMin: 0,
    benchmarkMax: debtBenchMax,
    actual: parseFloat(debtRatio.toFixed(1)),
    status: debtRatio > debtBenchMax ? 'above' : 'normal'
  });

  return { industry, items };
}

// 交叉验证计算
interface CrossValidationItem {
  rule: string;
  level: string;
  levelIcon: string;
  detail: string;
  consequence: string;
  taxPolicy: string;
}

function calculateCrossValidation(
  revenue: number,
  cost: number,
  vatPaid: number,
  incomeTaxPaid: number,
  totalAssets: number,
  totalLiabilities: number,
  industry: string
): CrossValidationItem[] {
  const result: CrossValidationItem[] = [];
  
  if (revenue <= 0) return result;

  const metrics = calculateMetrics({
    periodType: '',
    periodValue: '',
    revenue,
    cost,
    vatPaid,
    incomeTaxPaid,
    totalAssets,
    totalLiabilities
  });
  
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];

  // 增值税税负率偏低
  if (metrics.vatRate < benchmarks.vatRate.min) {
    const vatDiff = metrics.vatRate - benchmarks.vatRate.min;
    const vatWarningThreshold = benchmarks.vatRate.min * 0.5;
    if (vatDiff >= -vatWarningThreshold) {
      result.push({
        rule: '增值税税负率偏低',
        level: 'medium',
        levelIcon: '🟡',
        detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，低于行业下限${benchmarks.vatRate.min}%`,
        consequence: '税负率偏低可能面临纳税评估，需合理解释',
        taxPolicy: '《增值税暂行条例》及行业税负监控标准'
      });
    } else {
      result.push({
        rule: '增值税税负异常偏低',
        level: 'high',
        levelIcon: '🔴',
        detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，显著低于行业下限${benchmarks.vatRate.min}%`,
        consequence: `需补缴增值税约${((benchmarks.vatRate.min - metrics.vatRate) / 100 * revenue).toFixed(0)}万元，并处滞纳金`,
        taxPolicy: '《税收征收管理法》第六十三条；行业税负预警标准'
      });
    }
  }

  // 毛利率偏低
  if (metrics.grossMargin < benchmarks.grossMargin.min) {
    const grossMarginDiff = metrics.grossMargin - benchmarks.grossMargin.min;
    const grossMarginWarningThreshold = benchmarks.grossMargin.min * 0.5;
    if (grossMarginDiff >= -grossMarginWarningThreshold) {
      result.push({
        rule: '毛利率偏低',
        level: 'medium',
        levelIcon: '🟡',
        detail: `毛利率${metrics.grossMargin.toFixed(1)}%，接近行业下限${benchmarks.grossMargin.min}%`,
        consequence: '毛利率偏低需有合理商业理由，否则可能面临纳税调整',
        taxPolicy: '《企业所得税法》第八条；成本核算相关规定'
      });
    } else {
      result.push({
        rule: '毛利率异常偏低',
        level: 'high',
        levelIcon: '🔴',
        detail: `毛利率${metrics.grossMargin.toFixed(1)}%，显著低于行业下限${benchmarks.grossMargin.min}%`,
        consequence: '毛利率严重偏低，涉嫌隐匿收入或虚增成本，需补缴税款并处0.5-5倍罚款',
        taxPolicy: '《税收征收管理法》第六十三条；《企业所得税法》'
      });
    }
  }

  // 资产负债率偏高
  if (metrics.debtRatio > 70) {
    result.push({
      rule: '资产负债率偏高',
      level: 'high',
      levelIcon: '🔴',
      detail: `资产负债率${metrics.debtRatio.toFixed(1)}%，超过70%高风险线`,
      consequence: '负债率过高，财务风险较大，可能面临资金链断裂风险',
      taxPolicy: '企业财务风险评估标准'
    });
  } else if (metrics.debtRatio > 60) {
    result.push({
      rule: '资产负债率偏高',
      level: 'medium',
      levelIcon: '🟡',
      detail: `资产负债率${metrics.debtRatio.toFixed(1)}%，超过60%预警线`,
      consequence: '负债率偏高需关注偿债能力和资金链安全',
      taxPolicy: '企业财务风险评估标准'
    });
  }

  return result;
}

// 主处理函数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enterpriseName, creditCode, contactPerson, contactPhone, industry, revenueScale, financialData, riskAnswers, version } = body

    if (!enterpriseName && !creditCode) {
      return NextResponse.json({ error: '缺少企业名称或信用代码' }, { status: 400 })
    }
    if (!riskAnswers || typeof riskAnswers !== 'object') {
      return NextResponse.json({ error: '缺少风险问卷答案' }, { status: 400 })
    }

    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
    })
    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    if (!accessToken) {
      return NextResponse.json({ error: '飞书认证失败' }, { status: 500 })
    }

    const riskId = Date.now().toString() + Math.random().toString().slice(2, 13)

    const fields: Record<string, any> = {}
    fields['企业名称'] = enterpriseName || ''
    fields['统一社会信用代码'] = creditCode || ''
    fields['联系人'] = contactPerson || ''
    fields['联系电话'] = contactPhone || ''
    fields['所属行业'] = industry || ''
    fields['年营收规模'] = revenueScale || ''
    fields['报告状态'] = '待审核'
    fields['风险检测ID'] = riskId
    fields['版本'] = version || 'v5'
    fields['检测时间'] = new Date().toISOString().replace('T', ' ').slice(0, 19)

    if (financialData) {
      fields['营业收入(万元)'] = financialData.revenue ? Number(financialData.revenue) : 0
      fields['资产总额(万元)'] = financialData.totalAssets ? Number(financialData.totalAssets) : 0
      fields['负债总额(万元)'] = financialData.totalLiabilities ? Number(financialData.totalLiabilities) : 0
      fields['毛利率(%)'] = financialData.grossMargin ? Number(financialData.grossMargin) : 0
      fields['净利率(%)'] = financialData.netMargin ? Number(financialData.netMargin) : 0
      fields['增值税税负率(%)'] = financialData.vatRate ? Number(financialData.vatRate) : 0
      fields['所得税贡献率(%)'] = financialData.citRate ? Number(financialData.citRate) : 0
      fields['资产负债率(%)'] = financialData.liabilityRatio ? Number(financialData.liabilityRatio) : 0
    }

    for (const [qKey, answer] of Object.entries(riskAnswers)) {
      const fieldName = QUESTION_FIELD_MAP[qKey]
      if (fieldName) {
        fields[fieldName] = answer
      }
    }

    const answers = Object.values(riskAnswers) as number[]
    const highCount = answers.filter(a => a === 2).length
    const mediumCount = answers.filter(a => a === 1).length
    const lowCount = answers.filter(a => a === 0).length

    let riskLevel = '低风险'
    if (highCount >= 3 || (highCount >= 2 && mediumCount >= 3)) riskLevel = '极高风险'
    else if (highCount >= 2 || (highCount >= 1 && mediumCount >= 3)) riskLevel = '高风险'
    else if (highCount >= 1 || mediumCount >= 4) riskLevel = '中风险'
    else if (mediumCount >= 2) riskLevel = '中低风险'

    fields['风险等级'] = riskLevel
    fields['高风险项数'] = highCount
    fields['中风险项数'] = mediumCount
    fields['低风险项数'] = lowCount

    const createRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    )
    const createData = await createRes.json()

    if (createData.code !== 0) {
      console.error('飞书写入失败:', JSON.stringify(createData))
      return NextResponse.json({ error: '写入飞书失败: ' + (createData.msg || '未知错误') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      riskId,
      riskLevel,
      riskCounts: { red: highCount, yellow: mediumCount, green: lowCount },
    })
  } catch (error) {
    console.error('提交异常:', error)
    return NextResponse.json({ error: '提交失败' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const riskId = searchParams.get('riskId');
    
    if (!riskId) {
      return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
    }

    // 获取飞书token
    const token = await getFeishuToken();
    if (!token || !FEISHU_BASE_TOKEN || !FEISHU_TABLE_ID) {
      return NextResponse.json({ error: '飞书配置缺失' }, { status: 500 });
    }

    // 搜索记录
    const searchRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: {
            conjunction: 'and',
            conditions: [{ field_name: '检测ID', operator: 'is', value: [riskId] }]
          }
        })
      }
    );

    const searchData = await searchRes.json();
    if (!searchData.data?.items?.length) {
      return NextResponse.json({ error: '未找到记录' }, { status: 404 });
    }

    const fields = searchData.data.items[0].fields || {};

    // 提取报告状态
    const reportStatus = extractFeishuText(fields['报告状态']) || '待审核';

    // 提取基本信息
    const basicInfo = {
      enterpriseName: extractFeishuText(fields['企业名称']),
      contactPerson: extractFeishuText(fields['联系人']),
      contactPhone: extractFeishuText(fields['联系电话']),
      industry: extractFeishuText(fields['所属行业']),
      revenueScale: extractFeishuText(fields['年营收规模']),
      creditCode: extractFeishuText(fields['统一信用代码']),
      period: ''
    };

    // 提取财务数据（从独立字段）
    const revenue = getNumber(fields['营业收入(万元)']);
    const cost = getNumber(fields['营业成本(万元)']);
    const vatPaid = getNumber(fields['实缴增值税(万元)']);
    const incomeTaxPaid = getNumber(fields['实缴所得税(万元)']);
    const totalAssets = getNumber(fields['总资产(万元)']);
    const totalLiabilities = getNumber(fields['总负债(万元)']);
    const period = extractFeishuText(fields['所属期']) || extractFeishuText(fields['检测时间'])?.split(' ')[0] || '';
    basicInfo.period = period;

    // 从20个字段读取三档风险等级（0=无此情况, 1=存在但较轻, 2=存在且严重）
    const riskAnswers: Record<string, number> = {};
    for (let i = 1; i <= 20; i++) {
      const key = `q${i}`;
      const fieldName = QUESTION_FIELD_MAP[key];
      if (fieldName) {
        riskAnswers[key] = extractFeishuRiskLevel(fields[fieldName]);
      }
    }

    // 构建风险项列表
    const riskItems: any[] = [];
    let redCount = 0;
    let yellowCount = 0;
    let greenCount = 0;

    for (const [qKey, answer] of Object.entries(riskAnswers)) {
      const info = V5_QUESTION_MAPPING[qKey];
      if (!info) continue;

      let level: string;
      let levelIcon: string;
      let impact: string;
      const hasIssue = answer >= 1;

      if (answer >= 2) {
        level = 'high';
        levelIcon = '🔴';
        redCount++;
        impact = `存在「${info.name}」风险（严重），${info.consequence}`;
      } else if (answer === 1) {
        level = 'medium';
        levelIcon = '🟡';
        yellowCount++;
        impact = `存在「${info.name}」风险（程度较轻），${info.consequence}`;
      } else {
        level = 'low';
        levelIcon = '🟢';
        greenCount++;
        impact = '该方面暂未发现明显违规';
      }

      riskItems.push({
        name: info.name,
        source: `问卷${qKey}`,
        module: info.module,
        moduleName: info.moduleName,
        level: levelIcon,
        impact,
        consequence: hasIssue ? info.consequence : '',
        taxPolicy: hasIssue ? info.taxPolicy : ''
      });
    }

    // 分离高/中/低风险项
    const highRiskItems = riskItems.filter(i => i.level === '🔴');
    const mediumRiskItems = riskItems.filter(i => i.level === '🟡');
    const lowRiskItems = riskItems.filter(i => i.level === '🟢').map(i => i.name);

    // 综合风险等级
    const { level: overallLevel, icon: levelIcon } = determineOverallLevel(redCount, yellowCount);

    // 财务指标
    const metrics = calculateMetrics({
      periodType: '',
      periodValue: period,
      revenue,
      cost,
      vatPaid,
      incomeTaxPaid,
      totalAssets,
      totalLiabilities
    });

    // 行业基准对比
    const industryBenchmarks = calculateIndustryBenchmarks(
      revenue, cost, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities, basicInfo.industry
    );

    // 交叉验证：优先使用飞书中的文本内容，如果没有则根据财务数据计算
    let crossValidation: CrossValidationItem[] = [];
    const feishuCrossValidation = extractFeishuText(fields['交叉验证结果']);
    if (feishuCrossValidation && feishuCrossValidation !== '暂无明显矛盾') {
      // 如果有文本内容，解析为结构化数据
      crossValidation = feishuCrossValidation.split('；').filter(Boolean).map(item => {
        const match = item.match(/^([🔴🟡]+)(.+?):(.+?)（依据：(.+?)）$/);
        if (match) {
          return {
            rule: match[2].trim(),
            level: match[1].includes('🔴') ? 'high' : 'medium',
            levelIcon: match[1],
            detail: match[3].trim(),
            consequence: '',
            taxPolicy: match[4]
          };
        }
        // 简单解析
        return {
          rule: item.substring(1).split(':')[0] || item,
          level: item.startsWith('🔴') ? 'high' : 'medium',
          levelIcon: item.startsWith('🔴') ? '🔴' : '🟡',
          detail: item.split(':')[1] || item,
          consequence: '',
          taxPolicy: ''
        };
      });
    } else {
      // 根据财务数据重新计算
      crossValidation = calculateCrossValidation(
        revenue, cost, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities, basicInfo.industry
      );
    }

    // 检测时间
    const detectionTime = extractFeishuText(fields['检测时间']);

    // 构建返回数据
    return NextResponse.json({
      basicInfo,
      riskLevel: extractFeishuText(fields['综合风险等级']) || overallLevel,
      riskCounts: {
        red: redCount,
        yellow: yellowCount,
        green: greenCount
      },
      reportStatus,
      reportContent: {
        overview: {
          riskId,
          period,
          level: overallLevel,
          levelIcon,
          redCount,
          yellowCount,
          greenCount
        },
        highRiskItems,
        mediumRiskItems,
        lowRiskItems,
        trendWarnings: [],
        crossValidation,
        industryBenchmarks,
        financialIndicators: [{
          period,
          grossMargin: metrics.grossMargin,
          vatRate: metrics.vatRate,
          citRate: metrics.citRate,
          netMargin: 0,
          liabilityRatio: metrics.debtRatio
        }]
      },
      createdAt: detectionTime,
      financialMetrics: {
        period,
        revenue,
        cost,
        vatPaid,
        incomeTaxPaid,
        totalAssets,
        totalLiabilities,
        grossMargin: metrics.grossMargin,
        vatRate: metrics.vatRate,
        citRate: metrics.citRate,
        debtRatio: metrics.debtRatio
      }
    });

  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
