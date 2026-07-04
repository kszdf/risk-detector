import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// 行业基准数据（key兼容前端下拉值和后端原有值）
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
    consequence: '逾期申报由税务机关责令限期改正，可处2000元以下罚款；逾期缴纳税款按日加收万分之五滞纳金',
    taxPolicy: '《税收征收管理法》第六十二条（逾期申报）、第六十三条（逾期缴纳）'
  },
  'q2': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '是否存在连续零申报或负申报超过6个月？',
    name: '连续零申报超6个月',
    consequence: '税务机关可认定为异常申报，纳入重点监控，要求企业进行纳税评估或稽查',
    taxPolicy: '《税收征收管理法》第三十五条；国税发〔2005〕43号'
  },
  'q3': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '增值税申报收入与企业所得税申报收入是否存在较大差异且无合理说明？',
    name: '增值税与所得税收入差异',
    consequence: '税务机关可要求企业提供差异说明，无法合理说明的面临纳税调整和补税风险',
    taxPolicy: '《税收征收管理法》第三十五条；国税发〔2009〕28号'
  },
  'q4': {
    module: 'taxCompliance',
    moduleName: '申报与纳税合规',
    question: '企业是否连续三年及以上亏损但仍持续经营？',
    name: '连续三年亏损仍经营',
    consequence: '列入纳税评估重点关注对象，税务机关可能怀疑存在隐匿收入或转移利润',
    taxPolicy: '国税发〔2005〕43号；《企业所得税法》第四十七条'
  },

  // 维度二：发票管理 (q5-q8)
  'q5': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在无票采购、取得走逃企业发票或品名不符的异常发票？',
    name: '异常发票/走逃企业',
    consequence: '已抵扣进项税额需转出，补缴增值税及滞纳金；善意取得可免于处罚，恶意取得按偷税处理',
    taxPolicy: '国家税务总局公告2014年第39号；《发票管理办法》第二十四条'
  },
  'q6': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在发票开具内容与实际经营范围明显不符？',
    name: '发票经营范围不符',
    consequence: '涉嫌虚开发票，补缴税款并处0.5-5倍罚款；虚开增值税专用发票的依法追究刑事责任',
    taxPolicy: '《发票管理办法》第二十二条；《刑法》第二百零五条'
  },
  'q7': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在大额现金交易或通过个人账户收款后"变票"入账？',
    name: '变票入账',
    consequence: '涉嫌虚开发票或偷税，补缴税款并处0.5-5倍罚款，构成犯罪的依法追究刑事责任',
    taxPolicy: '《发票管理办法》第二十二条；《税收征收管理法》第六十三条'
  },
  'q8': {
    module: 'invoice',
    moduleName: '发票管理',
    question: '是否存在进销项品名/数量严重不匹配（如进项钢材、销项电子产品）？',
    name: '进销项不匹配',
    consequence: '可能被认定为取得异常凭证，进项税额不得抵扣，需补缴增值税及滞纳金',
    taxPolicy: '国家税务总局公告2014年第39号；《增值税暂行条例》第九条'
  },

  // 维度三：收入与成本 (q9-q12)
  'q9': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在延迟开票确认收入、部分收入未入账或使用个人账户收款未报税？',
    name: '隐匿收入/个人账户收款',
    consequence: '按偷税论处，补缴增值税和企业所得税，按日加收万分之五滞纳金，并处0.5-5倍罚款',
    taxPolicy: '《税收征收管理法》第六十三条；《增值税暂行条例》第十九条'
  },
  'q10': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在账外经营（部分业务不入账，通过私人账户收支）？',
    name: '账外经营',
    consequence: '按偷税论处，补缴增值税和企业所得税，按日加收万分之五滞纳金，并处0.5-5倍罚款',
    taxPolicy: '《税收征收管理法》第六十三条；《会计法》第九条、第十六条'
  },
  'q11': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在毛利率明显偏低或利润异常偏低（明显低于同行业水平且无法合理解释）？',
    name: '利润偏低',
    consequence: '税务机关可启动转让定价调查或纳税评估，要求补缴税款并加收利息',
    taxPolicy: '《企业所得税法》第四十一条；国税发〔2009〕2号'
  },
  'q12': {
    module: 'revenue',
    moduleName: '收入与成本',
    question: '是否存在库存账实不符（账面库存远大于实际、或库存长期只增不减）？',
    name: '库存账实不符',
    consequence: '账面大于实际涉嫌已销售未入账隐匿收入；实际大于账面涉嫌虚增进项抵扣',
    taxPolicy: '《增值税暂行条例》第十条；国税发〔2003〕136号'
  },

  // 维度四：费用与往来 (q13-q16)
  'q13': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在使用与经营无关的发票报销、或报销股东/员工个人消费？',
    name: '个人消费报销',
    consequence: '相关费用不得税前扣除，需调增应纳税所得额补缴企业所得税，并代扣代缴个人所得税，按日加收滞纳金',
    taxPolicy: '《企业所得税法》第八条、第十条；财税〔2003〕158号'
  },
  'q14': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在股东与公司之间往来款余额过大（其他应收/其他应付占总资产比例异常）？',
    name: '股东往来款过大',
    consequence: '股东借款年度终了未归还且未用于经营的，视同分红需代扣代缴20%个人所得税',
    taxPolicy: '财税〔2003〕158号第二条；《个人所得税法》第二条'
  },
  'q15': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在应纳税所得额刚好卡在小微企业/小型微利企业标准临界值附近？',
    name: '利润临界值享受小微',
    consequence: '如被认定为人为调节利润骗取税收优惠，将追缴已享受的减免税款并加收滞纳金',
    taxPolicy: '《企业所得税法》第二十八条；国家税务总局公告2023年第6号'
  },
  'q16': {
    module: 'expense',
    moduleName: '费用与往来',
    question: '是否存在大额费用列支无合同/无审批/无发票"三无"支撑？',
    name: '三无费用',
    consequence: '不合规凭证不得作为税前扣除依据，需调增应纳税所得额补缴企业所得税及滞纳金',
    taxPolicy: '《企业所得税法》第八条；《发票管理办法》第二十条；国家税务总局公告2018年第28号'
  },

  // 维度五：架构与关联交易 (q17-q20)
  'q17': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否在税收洼地注册公司并享受核定征收？',
    name: '税收洼地核定',
    consequence: '无实质性经营的核定征收资格可能被取消，要求查账征收并补缴税款差额及滞纳金',
    taxPolicy: '国家税务总局公告2019年第48号；《税收征收管理法》第六十三条'
  },
  'q18': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在关联方之间资金无偿拆借、或商品/服务价格明显偏离市场价？',
    name: '关联交易价格偏离',
    consequence: '税务机关有权进行特别纳税调整，补缴税款并按银行同期贷款利率加收利息',
    taxPolicy: '《企业所得税法》第四十一条至第四十八条'
  },
  'q19': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在通过多层架构（个独/合伙/壳公司）转移利润至低税率主体？',
    name: '多层架构转移利润',
    consequence: '税务机关可启动一般反避税调查，按合理方法重新核定应纳税所得额，补缴税款并加收利息',
    taxPolicy: '《企业所得税法》第四十七条；国税发〔2009〕2号'
  },
  'q20': {
    module: 'structure',
    moduleName: '架构与关联交易',
    question: '是否存在向非实际员工发放"工资"、或股东/家庭消费在公司列支？',
    name: '非实际员工发工资',
    consequence: '虚列工资不得税前扣除，需调增补缴企业所得税；涉及偷逃个人所得税',
    taxPolicy: '《个人所得税法》第二条；《企业所得税法》第十条；《税收征收管理法》第六十三条'
  }
};

// 旧版问卷题目完整映射（兼容旧格式）
interface QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  consequence: string;
}

const QUESTION_MAPPING: Record<string, QuestionInfo> = {
  'inv1': { module: 'invoice', moduleName: '发票与资金流', name: '四流不一致', consequence: '按偷税论处，补缴增值税+企业所得税，并处0.5-5倍罚款' },
  'inv2': { module: 'invoice', moduleName: '发票与资金流', name: '私户收款未入账', consequence: '补缴增值税+所得税，0.5-5倍罚款' },
  'inv3': { module: 'invoice', moduleName: '发票与资金流', name: '变名发票', consequence: '按虚开发票论处，补缴税款+罚款，情节严重可追究刑事责任' },
  'inv4': { module: 'invoice', moduleName: '发票与资金流', name: '上游供应商异常', consequence: '进项转出+补缴增值税+罚款' },
  'inv5': { module: 'invoice', moduleName: '发票与资金流', name: '红冲发票异常', consequence: '涉嫌虚开增值税发票，补缴税款+罚款' },
  'rev1': { module: 'revenueCost', moduleName: '收入与成本', name: '延迟确认收入', consequence: '补缴增值税+所得税+滞纳金' },
  'rev2': { module: 'revenueCost', moduleName: '收入与成本', name: '替票冲账', consequence: '费用调增+补缴企业所得税+罚款' },
  'rev3': { module: 'revenueCost', moduleName: '收入与成本', name: '个人消费入公司账', consequence: '费用调增+补缴企业所得税+罚款' },
  'rev4': { module: 'revenueCost', moduleName: '收入与成本', name: '存货账实不符', consequence: '涉嫌隐匿收入或虚增成本，补缴税款+罚款' },
  'pp1': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '股东借款超一年未还', consequence: '视同分红，需代扣代缴20%个人所得税' },
  'pp2': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '利润分配不规范', consequence: '涉嫌逃避个人所得税，补缴+罚款' },
  'pp3': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '关联方资金互转', consequence: '转让定价调整风险，需补缴税款+滞纳金' },
  'pp4': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '大额现金交易', consequence: '资金链异常，触发税务稽查重点关注' },
  'pp5': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '报销替代工资', consequence: '补缴个人所得税+社保，0.5-5倍罚款' },
  'tax1': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '逾期申报/缴税', consequence: '按日加收万分之五滞纳金，并处0.5-5倍罚款' },
  'tax2': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '小微优惠滥用', consequence: '补缴优惠减免税款+滞纳金+罚款' },
  'tax3': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税收洼地空壳公司', consequence: '核定征收优惠被否定，补缴全部税款+滞纳金' },
  'tax4': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税负率低于行业均值', consequence: '面临纳税评估，补缴+滞纳金+0.5-5倍罚款' },
  'tax5': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '被稽查/纳税评估', consequence: '再次被稽查概率显著提高' }
};

// 辅助函数
function getFeishuToken(): Promise<string | null> {
  return fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  }).then(res => res.json()).then(data => data.tenant_access_token || null).catch(() => null);
}

function getNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,\\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function generateRiskId(): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RC${datePart}${random}`;
}

// 新版财务数据类型（v5版本 - 单期）
interface V5FinancialData {
  periodType: string;
  periodValue: string;
  revenue: number;
  cost: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
  prevRevenue?: number;
  prevVatPaid?: number;
}

// 旧版财务数据类型（4期分层）
interface FinancialPeriod {
  period: string;
  type: 'latest' | 'annual';
  revenue: number;
  cost: number;
  profit: number;
  vat: number;
  cit: number;
  totalAssets: number;
  totalLiabilities: number;
  accountsReceivable: number;
  inventory: number;
  advanceReceived: number;
}

// 风险项结构
type RiskLevel = 'high' | 'medium' | 'low';

interface RiskItem {
  name: string;
  source: string;
  module: string;
  moduleName: string;
  level: RiskLevel;
  levelIcon: string;
  score: number;
  impact: string;
  consequence: string;
  taxPolicy: string;
}

// 风险等级由用户选择的答案值直接决定：0=无此情况(low), 1=存在但较轻(medium), 2=存在且严重(high)

// v5财务指标计算
function calculateV5Metrics(data: V5FinancialData) {
  const grossMargin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
  const vatRate = data.revenue > 0 ? (data.vatPaid / data.revenue) * 100 : 0;
  const citRate = data.revenue > 0 ? (data.incomeTaxPaid / data.revenue) * 100 : 0;
  const debtRatio = data.totalAssets > 0 ? (data.totalLiabilities / data.totalAssets) * 100 : 0;
  const revenueGrowth = data.prevRevenue && data.prevRevenue > 0
    ? ((data.revenue - data.prevRevenue) / data.prevRevenue) * 100
    : null;
  return { grossMargin, vatRate, citRate, debtRatio, revenueGrowth };
}

// 问卷风险项映射（v5版本 - 20题，每题三档：0=无此情况, 1=存在但较轻, 2=存在且严重）
function mapV5QuestionToRisk(key: string, answer: number): RiskItem | null {
  const info = V5_QUESTION_MAPPING[key];
  if (!info) return null;

  // 答案值直接决定风险等级
  let level: RiskLevel;
  let levelIcon: string;
  let impactText: string;

  if (answer >= 2) {
    level = 'high';
    levelIcon = '🔴';
    impactText = `该问题存在严重税务风险，${info.consequence}`;
  } else if (answer === 1) {
    level = 'medium';
    levelIcon = '🟡';
    impactText = `该问题存在一定税务风险（程度较轻），${info.consequence}`;
  } else {
    level = 'low';
    levelIcon = '🟢';
    impactText = '该方面暂未发现明显违规';
  }

  const hasIssue = answer >= 1;

  return {
    name: info.name,
    source: `问卷${key}`,
    module: info.module,
    moduleName: info.moduleName,
    level,
    levelIcon,
    score: answer,
    impact: impactText,
    consequence: hasIssue ? info.consequence : '',
    taxPolicy: hasIssue ? info.taxPolicy : ''
  };
}

// 旧版问卷风险项映射
function mapQuestionToRisk(key: string, score: number): RiskItem | null {
  const info = QUESTION_MAPPING[key];
  if (!info) return null;

  let level: RiskLevel;
  let levelIcon: string;

  if (score <= 2) {
    level = 'high';
    levelIcon = '🔴';
  } else if (score <= 5) {
    level = 'medium';
    levelIcon = '🟡';
  } else {
    level = 'low';
    levelIcon = '🟢';
  }

  let impact = '';
  if (level === 'high') {
    impact = '该问题已造成较高税务风险，需要立即规范处理';
  } else if (level === 'medium') {
    impact = '该问题存在一定风险，建议规范管理';
  } else {
    impact = '该方面暂未发现明显违规';
  }

  return {
    name: info.name,
    source: `问卷${key}`,
    module: info.module,
    moduleName: info.moduleName,
    level,
    levelIcon,
    score,
    impact,
    consequence: level === 'low' ? '' : info.consequence,
    taxPolicy: ''
  };
}

// 交叉验证风险等级映射（v5版本）
interface CrossValidationItem {
  rule: string;
  level: RiskLevel;
  levelIcon: string;
  detail: string;
  consequence: string;
  taxPolicy: string;
}

// v5版本交叉验证计算（基于单期数据）
function calculateV5CrossValidation(
  financialData: V5FinancialData,
  industry: string
): CrossValidationItem[] {
  const result: CrossValidationItem[] = [];

  if (!financialData || financialData.revenue <= 0) return result;

  const metrics = calculateV5Metrics(financialData);
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  const revenue = financialData.revenue;

  // 1. 增值税税负率偏低
  const vatDiff = metrics.vatRate - benchmarks.vatRate.min;
  const vatWarningThreshold = benchmarks.vatRate.min * 0.5;
  if (metrics.vatRate < benchmarks.vatRate.min) {
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
        consequence: `税负率严重偏低，需补缴增值税约${((benchmarks.vatRate.min - metrics.vatRate) / 100 * revenue).toFixed(0)}万元，并处滞纳金`,
        taxPolicy: '《税收征收管理法》第六十三条；行业税负预警标准'
      });
    }
  }

  // 2. 所得税贡献率偏低
  const citDiff = metrics.citRate - benchmarks.citRate.min;
  const citWarningThreshold = benchmarks.citRate.min * 0.5;
  if (metrics.citRate < benchmarks.citRate.min) {
    if (citDiff >= -citWarningThreshold) {
      result.push({
        rule: '所得税贡献率偏低',
        level: 'medium',
        levelIcon: '🟡',
        detail: `所得税贡献率${metrics.citRate.toFixed(2)}%，低于行业下限${benchmarks.citRate.min}%`,
        consequence: '所得税贡献偏低可能面临纳税评估',
        taxPolicy: '《企业所得税法》及行业所得税税负监控标准'
      });
    } else {
      result.push({
        rule: '所得税贡献异常偏低',
        level: 'high',
        levelIcon: '🔴',
        detail: `所得税贡献率${metrics.citRate.toFixed(2)}%，显著低于行业下限${benchmarks.citRate.min}%`,
        consequence: `所得税贡献严重偏低，需核查成本列支和收入确认`,
        taxPolicy: '《企业所得税法》第四十一条；转让定价相关规定'
      });
    }
  }

  // 3. 毛利率偏低
  const grossMarginDiff = metrics.grossMargin - benchmarks.grossMargin.min;
  const grossMarginWarningThreshold = benchmarks.grossMargin.min * 0.5;
  if (metrics.grossMargin < benchmarks.grossMargin.min) {
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

  // 4. 资产负债率偏高
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

// 行业基准对比（v5版本）
interface BenchmarkItem {
  name: string;
  unit: string;
  benchmarkMin: number;
  benchmarkMax: number;
  actual: number;
  status: string;
}

function calculateV5IndustryBenchmarks(
  financialData: V5FinancialData,
  industry: string
): { industry: string; items: BenchmarkItem[] } {
  const items: BenchmarkItem[] = [];
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  const metrics = calculateV5Metrics(financialData);

  items.push({
    name: '毛利率',
    unit: '%',
    benchmarkMin: benchmarks.grossMargin.min,
    benchmarkMax: benchmarks.grossMargin.max,
    actual: parseFloat(metrics.grossMargin.toFixed(1)),
    status: metrics.grossMargin < benchmarks.grossMargin.min ? 'below' : metrics.grossMargin > benchmarks.grossMargin.max ? 'above' : 'normal'
  });

  items.push({
    name: '所得税贡献率',
    unit: '%',
    benchmarkMin: benchmarks.citRate.min,
    benchmarkMax: benchmarks.citRate.max,
    actual: parseFloat(metrics.citRate.toFixed(2)),
    status: metrics.citRate < benchmarks.citRate.min ? 'below' : metrics.citRate > benchmarks.citRate.max ? 'above' : 'normal'
  });

  items.push({
    name: '增值税税负率',
    unit: '%',
    benchmarkMin: benchmarks.vatRate.min,
    benchmarkMax: benchmarks.vatRate.max,
    actual: parseFloat(metrics.vatRate.toFixed(2)),
    status: metrics.vatRate < benchmarks.vatRate.min ? 'below' : metrics.vatRate > benchmarks.vatRate.max ? 'above' : 'normal'
  });

  const debtBenchMax = 70;
  items.push({
    name: '资产负债率',
    unit: '%',
    benchmarkMin: 0,
    benchmarkMax: debtBenchMax,
    actual: parseFloat(metrics.debtRatio.toFixed(1)),
    status: metrics.debtRatio > debtBenchMax ? 'above' : 'normal'
  });

  if (metrics.revenueGrowth !== null) {
    items.push({
      name: '收入增长率',
      unit: '%',
      benchmarkMin: -10,
      benchmarkMax: 50,
      actual: parseFloat(metrics.revenueGrowth.toFixed(1)),
      status: metrics.revenueGrowth < -10 ? 'below' : metrics.revenueGrowth > 50 ? 'above' : 'normal'
    });
  }

  return { industry, items };
}

// 报告内容生成（v5版本JSON结构）
function generateV5ReportContent(params: {
  riskId: string;
  period: string;
  overallLevel: string;
  levelIcon: string;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalItems: number;
  riskItems: RiskItem[];
  crossValidation: CrossValidationItem[];
  industryBenchmarks: { industry: string; items: BenchmarkItem[] };
  financialMetrics: ReturnType<typeof calculateV5Metrics>;
}): string {
  const highRiskItems = params.riskItems.filter(i => i.level === 'high');
  const mediumRiskItems = params.riskItems.filter(i => i.level === 'medium');
  const lowRiskItems = params.riskItems.filter(i => i.level === 'low');

  return JSON.stringify({
    overview: {
      riskId: params.riskId,
      period: params.period,
      level: params.overallLevel,
      levelIcon: params.levelIcon,
      redCount: params.redCount,
      yellowCount: params.yellowCount,
      greenCount: params.greenCount,
      totalItems: params.totalItems
    },
    riskItems: params.riskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.module,
      moduleName: i.moduleName,
      level: i.levelIcon,
      impact: i.impact,
      consequence: i.consequence,
      taxPolicy: i.taxPolicy
    })),
    highRiskItems: highRiskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.moduleName,
      impact: i.impact,
      consequence: i.consequence,
      taxPolicy: i.taxPolicy
    })),
    mediumRiskItems: mediumRiskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.moduleName,
      impact: i.impact,
      consequence: i.consequence,
      taxPolicy: i.taxPolicy
    })),
    lowRiskItems: lowRiskItems.map(i => i.name),
    crossValidation: params.crossValidation.map(c => ({
      rule: c.rule,
      level: c.levelIcon,
      detail: c.detail,
      consequence: c.consequence,
      taxPolicy: c.taxPolicy
    })),
    industryBenchmarks: params.industryBenchmarks,
    financialIndicators: {
      period: params.period,
      grossMargin: params.financialMetrics.grossMargin,
      vatRate: params.financialMetrics.vatRate,
      citRate: params.financialMetrics.citRate,
      debtRatio: params.financialMetrics.debtRatio,
      revenueGrowth: params.financialMetrics.revenueGrowth
    },
    suggestion: ''
  }, null, 2);
}

// 飞书写入
async function writeToFeishu(fields: Record<string, unknown>): Promise<{ success: boolean; error?: string; detail?: any }> {
  const token = await getFeishuToken();
  if (!token) return { success: false, error: 'token获取失败' };

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ fields })
    }
  );

  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    return { success: false, error: `API返回code=${result.code}, msg=${result.msg}`, detail: result };
  }
  return { success: true };
}

// 飞书消息通知
async function sendFeishuNotification(params: {
  riskId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  industry: string;
  riskLevel: string;
}) {
  try {
    const token = await getFeishuToken();
    if (!token) return;
    const { riskId, companyName, contactName, contactPhone, industry, riskLevel } = params;
    const reportUrl = `https://pq3s843fph.coze.site/report?riskId=${riskId}`;
    const content = JSON.stringify({
      config: { wide_screen_mode: true },
      header: { title: { tag: 'plain_text', content: '🔔 新客户风险筛查提交' }, template: 'blue' },
      elements: [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `📋 企业：${companyName || '未填写'}\n👤 联系人：${contactName || '未填写'}\n📱 电话：${contactPhone || '未填写'}\n🏢 行业：${industry || '未填写'}\n⚠️ 风险等级：${riskLevel}\n\n👉 [点击查看报告](${reportUrl})`
        }
      }]
    });
    await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: 'ou_087603bf00f651705ab95a1775b6b1a2', msg_type: 'interactive', content })
    });
  } catch (e) { /* 通知失败不影响主流程 */ }
}

// 主处理函数
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 生成ID和时间
    const riskId = generateRiskId();
    const detectionTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 判断是否为v5版本（通过version字段或新数据结构判断）
    const isV5 = body.version === 'v5' || body.financialData?.periodType;

    let result;

    if (isV5) {
      // ========== v5版本处理逻辑 ==========
      result = await processV5Submission(body, riskId, detectionTime);
    } else {
      // ========== 旧版本处理逻辑（保持兼容） ==========
      result = await processLegacySubmission(body, riskId, detectionTime);
    }

    return NextResponse.json(result);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}

// v5版本提交处理
async function processV5Submission(body: Record<string, unknown>, riskId: string, detectionTime: string) {
  // 解析v5财务数据
  const financialDataRaw = body.financialData as Record<string, unknown>;
  const financialData: V5FinancialData = {
    periodType: String(financialDataRaw?.periodType || 'quarterly'),
    periodValue: String(financialDataRaw?.periodValue || detectionTime.split(' ')[0]),
    revenue: getNumber(financialDataRaw?.revenue),
    cost: getNumber(financialDataRaw?.cost),
    vatPaid: getNumber(financialDataRaw?.vatPaid),
    incomeTaxPaid: getNumber(financialDataRaw?.incomeTaxPaid),
    totalAssets: getNumber(financialDataRaw?.totalAssets),
    totalLiabilities: getNumber(financialDataRaw?.totalLiabilities),
    prevRevenue: financialDataRaw?.prevRevenue ? getNumber(financialDataRaw.prevRevenue) : undefined,
    prevVatPaid: financialDataRaw?.prevVatPaid ? getNumber(financialDataRaw.prevVatPaid) : undefined
  };

  // 获取基本信息
  const industry = String(body.industry || '');
  const revenueScale = String(body.revenueScale || '');
  const enterpriseName = String(body.enterpriseName || '');
  const creditCode = String(body.creditCode || '');
  const contactPerson = String(body.contactPerson || '');
  const contactPhone = String(body.contactPhone || '');
  const period = financialData.periodValue;

  // 解析20题三档答案（0=无此情况, 1=存在但较轻, 2=存在且严重）
  const riskAnswersRaw = body.riskAnswers as Record<string, unknown> || {};
  const riskAnswers: Record<string, number> = {};
  for (let i = 1; i <= 20; i++) {
    const key = `q${i}`;
    const val = Number(riskAnswersRaw[key]);
    riskAnswers[key] = (val >= 0 && val <= 2) ? val : 0;
  }

  // 问卷风险项映射
  const allRiskItems: RiskItem[] = [];
  Object.entries(riskAnswers).forEach(([key, answer]) => {
    const item = mapV5QuestionToRisk(key, answer);
    if (item) allRiskItems.push(item);
  });

  // 问卷风险项（不含交叉验证）
  const highRiskItems = allRiskItems.filter(i => i.level === 'high');
  const mediumRiskItems = allRiskItems.filter(i => i.level === 'medium');
  const lowRiskItems = allRiskItems.filter(i => i.level === 'low');

  // 交叉验证风险（独立展示，不计入概览统计）
  const crossValidation = calculateV5CrossValidation(financialData, industry);

  // 概览统计只算问卷风险项
  const redCount = highRiskItems.length;
  const yellowCount = mediumRiskItems.length;
  const greenCount = lowRiskItems.length;
  const totalItems = 20 + crossValidation.length;

  // 综合风险等级判定
  const { level: overallLevel, icon: levelIcon } = determineOverallLevel(redCount, yellowCount);

  // 行业基准对比
  const industryBenchmarks = calculateV5IndustryBenchmarks(financialData, industry);

  // 计算财务指标
  const financialMetrics = calculateV5Metrics(financialData);

  // 构建飞书字段
  const fields: Record<string, unknown> = {};
  fields['企业名称'] = enterpriseName;
  fields['统一信用代码'] = creditCode;
  fields['联系人'] = contactPerson;
  fields['联系电话'] = contactPhone;
  fields['所属行业'] = industry;
  fields['所属期'] = period;
  fields['年营收规模'] = revenueScale;
  fields['营业收入(万元)'] = financialData.revenue;
  fields['营业成本(万元)'] = financialData.cost;
  fields['实缴增值税(万元)'] = financialData.vatPaid;
  fields['实缴所得税(万元)'] = financialData.incomeTaxPaid;
  fields['总资产(万元)'] = financialData.totalAssets;
  fields['总负债(万元)'] = financialData.totalLiabilities;
  fields['毛利率(%)'] = financialMetrics.grossMargin;
  fields['增值税税负率'] = financialMetrics.vatRate;
  fields['所得税贡献率'] = financialMetrics.citRate;
  fields['资产负债率'] = financialMetrics.debtRatio;
  fields['检测ID'] = riskId;
  fields['检测时间'] = detectionTime;
  fields['报告状态'] = '待审核';
  fields['综合风险等级'] = overallLevel;
  fields['综合得分'] = redCount * 10 + yellowCount * 3;
  fields['高风险项数'] = redCount;
  fields['中风险项数'] = yellowCount;
  fields['低风险项数'] = greenCount;
  // 20题风险程度写入独立字段（0=无此情况, 1=存在但较轻, 2=存在且严重，支持飞书端人工审核修改）
  const QUESTION_FIELD_MAP: Record<string, string> = {
    'q1': 'q1_逾期申报', 'q2': 'q2_连续零申报', 'q3': 'q3_增值税与所得税收入差异',
    'q4': 'q4_连续三年亏损', 'q5': 'q5_异常发票', 'q6': 'q6_发票经营范围不符',
    'q7': 'q7_变票入账', 'q8': 'q8_进销项不匹配', 'q9': 'q9_隐匿收入',
    'q10': 'q10_账外经营', 'q11': 'q11_利润虚高', 'q12': 'q12_库存账实不符',
    'q13': 'q13_个人消费报销', 'q14': 'q14_股东往来款过大', 'q15': 'q15_利润临界值享受小微',
    'q16': 'q16_三无费用', 'q17': 'q17_税收洼地核定', 'q18': 'q18_关联交易价格偏离',
    'q19': 'q19_多层架构转移利润', 'q20': 'q20_非实际员工发工资'
  };
  for (const [qKey, fieldName] of Object.entries(QUESTION_FIELD_MAP)) {
    fields[fieldName] = Number(riskAnswers[qKey]) || 0;
  }

  fields['问卷明细'] = JSON.stringify(riskAnswers);
  fields['财务数据'] = JSON.stringify(financialData);
  fields['财务指标'] = JSON.stringify(financialMetrics);

  // 风险项明细（包含税收政策依据）
  fields['风险项明细'] = [
    ...highRiskItems.map(i => `🔴${i.name}（依据：${i.taxPolicy}）`),
    ...mediumRiskItems.map(i => `🟡${i.name}（依据：${i.taxPolicy}）`),
    ...lowRiskItems.map(i => `🟢${i.name}`)
  ].join('；') || '暂无风险项';

  // 交叉验证
  fields['交叉验证结果'] = crossValidation.length > 0
    ? crossValidation.map(c => `${c.levelIcon}${c.rule}: ${c.detail}（依据：${c.taxPolicy}）`).join('；')
    : '暂无明显矛盾';

  // 报告内容（v5版本JSON结构）
  fields['报告内容JSON'] = generateV5ReportContent({
    riskId,
    period,
    overallLevel,
    levelIcon,
    redCount,
    yellowCount,
    greenCount,
    totalItems,
    riskItems: allRiskItems,
    crossValidation,
    industryBenchmarks,
    financialMetrics
  });

  // 写入飞书并发送通知
  const feishuResult = await writeToFeishu(fields);
  if (feishuResult.success) {
    sendFeishuNotification({
      riskId,
      companyName: String(fields['企业名称'] || ''),
      contactName: String(fields['联系人'] || ''),
      contactPhone: String(fields['联系电话'] || ''),
      industry: String(fields['所属行业'] || ''),
      riskLevel: overallLevel
    });
  }

  return {
    success: true,
    riskId,
    detectionTime,
    overallRiskLevel: overallLevel,
    levelIcon,
    riskCounts: {
      red: redCount,
      yellow: yellowCount,
      green: greenCount,
      total: totalItems
    },
    feishuSaved: feishuResult.success,
    feishuError: feishuResult.error,
    riskItems: allRiskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.module,
      moduleName: i.moduleName,
      level: i.levelIcon,
      impact: i.impact,
      consequence: i.consequence,
      taxPolicy: i.taxPolicy
    })),
    crossValidation,
    industryBenchmarks,
    financialMetrics,
    reportStatus: '待审核'
  };
}

// 旧版本提交处理（保持兼容）
async function processLegacySubmission(body: Record<string, unknown>, riskId: string, detectionTime: string) {
  // 问卷答案
  const invoiceAnswers: Record<string, number> = {};
  const revenueCostAnswers: Record<string, number> = {};
  const publicPrivateAnswers: Record<string, number> = {};
  const taxPolicyAnswers: Record<string, number> = {};

  const parseAnswers = (src: unknown, target: Record<string, number>) => {
    if (src && typeof src === 'object') {
      Object.entries(src as Record<string, unknown>).forEach(([key, val]) => {
        target[key] = Number(val) || 0;
      });
    }
  };

  parseAnswers(body.invoiceAnswers, invoiceAnswers);
  parseAnswers(body.revenueAnswers || body.revenueCostAnswers, revenueCostAnswers);
  parseAnswers(body.publicPrivateAnswers, publicPrivateAnswers);
  parseAnswers(body.taxAnswers, taxPolicyAnswers);

  // 解析财务数据
  let financialData: FinancialPeriod[] = [];
  if (body.financialData && Array.isArray(body.financialData)) {
    financialData = body.financialData.map((d: Record<string, unknown>): FinancialPeriod => ({
      period: String(d.period || ''),
      type: (d.type as 'latest' | 'annual') || 'annual',
      revenue: getNumber(d.revenue),
      cost: getNumber(d.cost),
      profit: getNumber(d.profit),
      vat: getNumber(d.vatPaid ?? d.vat),
      cit: getNumber(d.incomeTaxPaid ?? d.cit),
      totalAssets: getNumber(d.totalAssets),
      totalLiabilities: getNumber(d.totalLiabilities),
      accountsReceivable: getNumber(d.receivables ?? d.accountsReceivable),
      inventory: getNumber(d.inventory),
      advanceReceived: getNumber(d.advanceReceipts ?? d.advanceReceived)
    }));
  }

  // 获取基本信息
  const industry = body.industry || '';
  const revenueScale = body.revenueScale || '';
  const enterpriseName = body.enterpriseName || '';
  const creditCode = body.creditCode || '';
  const contactPerson = body.contactPerson || '';
  const contactPhone = body.contactPhone || '';
  const period = body.period || detectionTime.split(' ')[0];

  // 问卷风险项映射
  const allAnswers = { ...invoiceAnswers, ...revenueCostAnswers, ...publicPrivateAnswers, ...taxPolicyAnswers };
  const allRiskItems: RiskItem[] = [];

  Object.entries(allAnswers).forEach(([key, score]) => {
    const item = mapQuestionToRisk(key, score);
    if (item) allRiskItems.push(item);
  });

  const highRiskItems = allRiskItems.filter(i => i.level === 'high');
  const mediumRiskItems = allRiskItems.filter(i => i.level === 'medium');
  const lowRiskItems = allRiskItems.filter(i => i.level === 'low');

  // 计算指标
  const latestData = financialData.find(d => d.type === 'latest') || financialData[0];
  const grossMargin = latestData && latestData.revenue > 0 ? ((latestData.revenue - latestData.cost) / latestData.revenue) * 100 : 0;
  const vatRate = latestData && latestData.revenue > 0 ? (latestData.vat / latestData.revenue) * 100 : 0;
  const citRate = latestData && latestData.revenue > 0 ? (latestData.cit / latestData.revenue) * 100 : 0;
  const debtRatio = latestData && latestData.totalAssets > 0 ? (latestData.totalLiabilities / latestData.totalAssets) * 100 : 0;

  // 简单判定
  let redCount = highRiskItems.length;
  let yellowCount = mediumRiskItems.length;
  const greenCount = lowRiskItems.length;
  const totalItems = 19;

  const { level: overallLevel, icon: levelIcon } = determineOverallLevel(redCount, yellowCount);

  // 构建飞书字段
  const fields: Record<string, unknown> = {};
  fields['企业名称'] = enterpriseName;
  fields['统一信用代码'] = creditCode;
  fields['联系人'] = contactPerson;
  fields['联系电话'] = contactPhone;
  fields['所属行业'] = industry;
  fields['所属期'] = period;
  fields['年营收规模'] = revenueScale;
  fields['营业收入(万元)'] = latestData?.revenue || 0;
  fields['毛利率(%)'] = grossMargin;
  fields['增值税税负率'] = vatRate;
  fields['所得税贡献率'] = citRate;
  fields['资产负债率'] = debtRatio;
  fields['检测ID'] = riskId;
  fields['检测时间'] = detectionTime;
  fields['报告状态'] = '待审核';
  fields['综合风险等级'] = overallLevel;
  fields['综合得分'] = redCount * 10 + yellowCount * 3;
  fields['高风险项数'] = redCount;
  fields['中风险项数'] = yellowCount;
  fields['低风险项数'] = greenCount;
  fields['问卷明细'] = JSON.stringify(allAnswers);
  fields['风险项明细'] = [
    ...highRiskItems.map(i => `🔴${i.name}`),
    ...mediumRiskItems.map(i => `🟡${i.name}`),
    ...lowRiskItems.map(i => `🟢${i.name}`)
  ].join('；') || '暂无风险项';

  // 写入飞书并发送通知
  const feishuResult = await writeToFeishu(fields);
  if (feishuResult.success) {
    sendFeishuNotification({
      riskId,
      companyName: String(fields['企业名称'] || ''),
      contactName: String(fields['联系人'] || ''),
      contactPhone: String(fields['联系电话'] || ''),
      industry: String(fields['所属行业'] || ''),
      riskLevel: overallLevel
    });
  }

  return {
    success: true,
    riskId,
    detectionTime,
    overallRiskLevel: overallLevel,
    levelIcon,
    riskCounts: { red: redCount, yellow: yellowCount, green: greenCount, total: totalItems },
    feishuSaved: feishuResult.success,
    feishuError: feishuResult.error,
    highRiskItems: highRiskItems.map(i => ({ name: i.name, source: i.source, module: i.moduleName, impact: i.impact, consequence: i.consequence })),
    mediumRiskItems: mediumRiskItems.map(i => ({ name: i.name, source: i.source, module: i.moduleName, impact: i.impact })),
    lowRiskItems: lowRiskItems.map(i => i.name),
    reportStatus: '待审核'
  };
}
