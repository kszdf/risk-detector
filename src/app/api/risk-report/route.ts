import { NextRequest, NextResponse } from 'next/server';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// ===== 行业基准 =====
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

// ===== V5问卷映射 =====
interface V5QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  question: string;
  consequence: string;
  taxPolicy: string;
}

const V5_QUESTION_MAPPING: Record<string, V5QuestionInfo> = {
  'q1': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '近12个月是否存在逾期申报或逾期缴纳税款？', name: '逾期申报', consequence: '按日加收万分之五滞纳金，并处0.5-5倍罚款', taxPolicy: '《税收征收管理法》第六十二条、第六十四条' },
  'q2': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '是否存在连续零申报或负申报超过6个月？', name: '连续零申报超6个月', consequence: '税务机关可认定为异常申报，要求企业进行纳税评估或稽查', taxPolicy: '《税收征收管理法》第三十五条；国税发〔2005〕43号' },
  'q3': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '增值税申报收入与企业所得税申报收入是否存在较大差异且无合理说明？', name: '增值税与所得税收入差异', consequence: '需进行收入差异说明，否则面临纳税调整和补税风险', taxPolicy: '《税收征收管理法》第三十五条；国税发〔2009〕28号' },
  'q4': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '企业是否连续三年及以上亏损但仍持续经营？', name: '连续三年亏损仍经营', consequence: '连续亏损是纳税评估重点关注对象，可能被认定为空壳公司或存在隐匿收入', taxPolicy: '国税发〔2005〕43号；《企业所得税法》第四十七条' },
  'q5': { module: 'invoice', moduleName: '发票管理', question: '是否存在无票采购、取得走逃企业发票或品名不符的异常发票？', name: '异常发票/走逃企业', consequence: '进项税额转出，补缴增值税，0.5-5倍罚款，情节严重追究刑事责任', taxPolicy: '《发票管理办法》第二十二条；国税发〔1995〕192号；国家税务总局公告2014年第39号' },
  'q6': { module: 'invoice', moduleName: '发票管理', question: '是否存在发票开具内容与实际经营范围明显不符？', name: '发票经营范围不符', consequence: '涉嫌虚开增值税发票，补缴税款+罚款，最高可判无期徒刑', taxPolicy: '《发票管理办法》第二十二条；《刑法》第二百零五条' },
  'q7': { module: 'invoice', moduleName: '发票管理', question: '是否存在大额现金交易或通过个人账户收款后"变票"入账？', name: '变票入账', consequence: '按虚开发票论处，补缴税款+罚款，情节严重追究刑事责任', taxPolicy: '《发票管理办法》第二十二条；《税收征收管理法》第六十三条' },
  'q8': { module: 'invoice', moduleName: '发票管理', question: '是否存在进销项品名/数量严重不匹配？', name: '进销项不匹配', consequence: '面临增值税异常抵扣核查，可能要求进项转出并补缴税款', taxPolicy: '国家税务总局公告2014年第39号；国税发〔2005〕43号' },
  'q9': { module: 'revenue', moduleName: '收入与成本', question: '是否存在延迟开票确认收入、部分收入未入账或使用个人账户收款未报税？', name: '隐匿收入/个人账户收款', consequence: '补缴增值税和企业所得税，0.5-5倍罚款，滞纳金', taxPolicy: '《税收征收管理法》第六十三条；《增值税暂行条例》第十九条' },
  'q10': { module: 'revenue', moduleName: '收入与成本', question: '是否存在账外经营？', name: '账外经营', consequence: '按偷税论处，补缴增值税+企业所得税，并处0.5-5倍罚款，滞纳金', taxPolicy: '《税收征收管理法》第六十三条；《会计法》第九条、第十六条' },
  'q11': { module: 'revenue', moduleName: '收入与成本', question: '是否存在利润明显虚高？', name: '利润虚高', consequence: '面临特别纳税调整，可能被要求补缴企业所得税并调整转让定价', taxPolicy: '国税发〔2005〕43号；《企业所得税法》第四十一条' },
  'q12': { module: 'revenue', moduleName: '收入与成本', question: '是否存在库存账实不符？', name: '库存账实不符', consequence: '涉嫌隐匿收入或虚增进项，面临增值税和企业所得税调整', taxPolicy: '《增值税暂行条例》第十条；国税发〔2003〕136号' },
  'q13': { module: 'expense', moduleName: '费用与往来', question: '是否存在使用与经营无关的发票报销？', name: '个人消费报销', consequence: '费用调增，补缴企业所得税，个人所得税', taxPolicy: '《企业所得税法》第八条、第十条；财税〔2003〕158号' },
  'q14': { module: 'expense', moduleName: '费用与往来', question: '是否存在股东与公司之间往来款余额过大？', name: '股东往来款过大', consequence: '视同分红，需代扣代缴20%个人所得税；涉嫌抽逃资金', taxPolicy: '财税〔2003〕158号第二条；《个人所得税法》第二条' },
  'q15': { module: 'expense', moduleName: '费用与往来', question: '是否存在应纳税所得额刚好卡在小微企业标准临界值附近？', name: '利润临界值享受小微', consequence: '如被认定人为调节利润，将追缴优惠减免的税款+滞纳金', taxPolicy: '《企业所得税法》第二十八条；国家税务总局公告2023年第6号' },
  'q16': { module: 'expense', moduleName: '费用与往来', question: '是否存在大额费用列支无合同/无审批/无发票"三无"支撑？', name: '三无费用', consequence: '费用调增，补缴企业所得税；发票不合规不得作为税前扣除凭证', taxPolicy: '《企业所得税法》第八条；《发票管理办法》第二十条' },
  'q17': { module: 'structure', moduleName: '架构与关联交易', question: '是否在税收洼地注册公司并享受核定征收？', name: '税收洼地核定', consequence: '核定征收优惠可能被否定，要求查账征收，补缴全部税款+滞纳金', taxPolicy: '国家税务总局公告2019年第48号' },
  'q18': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在关联方之间资金无偿拆借或价格明显偏离市场价？', name: '关联交易价格偏离', consequence: '转让定价调整风险，需补缴税款+滞纳金+利息', taxPolicy: '《企业所得税法》第四十一条至第四十八条' },
  'q19': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在通过多层架构转移利润至低税率主体？', name: '多层架构转移利润', consequence: '一般反避税调查，追缴全部少缴税款，可能处1-5倍罚款', taxPolicy: '《企业所得税法》第四十七条；国税发〔2009〕2号' },
  'q20': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在向非实际员工发放"工资"？', name: '非实际员工发工资', consequence: '工资不得税前扣除，补缴企业所得税；涉及个税偷逃', taxPolicy: '《个人所得税法》第二条；《企业所得税法》第十条' }
};

// 高风险问题：回答true=🔴
const HIGH_RISK_QUESTIONS = ['q1', 'q2', 'q4', 'q5', 'q6', 'q7', 'q9', 'q10', 'q11', 'q12', 'q14', 'q15', 'q19'];

// ===== 辅助函数 =====
function getNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,\\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function extractFieldValue(field: unknown): unknown {
  if (field === null || field === undefined) return undefined;
  if (typeof field === "string") return field;
  if (typeof field === "number" || typeof field === "boolean") return field;
  if (Array.isArray(field)) {
    return field.map((item: unknown) => {
      if (typeof item === "object" && item !== null && "text" in item) {
        return (item as { text: string }).text;
      }
      return String(item);
    }).join("");
  }
  if (typeof field === "object") {
    const obj = field as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return obj.text;
  }
  return String(field);
}

async function getFeishuToken(): Promise<string | null> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const data = await res.json();
  return data.tenant_access_token || null;
}

// ===== 交叉验证计算 =====
interface CrossValidationItem {
  rule: string;
  level: string;
  levelIcon: string;
  detail: string;
  consequence: string;
  taxPolicy: string;
}

function calculateCrossValidation(
  revenue: number, cost: number, vatPaid: number, incomeTaxPaid: number,
  totalAssets: number, totalLiabilities: number, industry: string
): CrossValidationItem[] {
  const result: CrossValidationItem[] = [];
  if (revenue <= 0) return result;

  const grossMargin = ((revenue - cost) / revenue) * 100;
  const vatRate = (vatPaid / revenue) * 100;
  const citRate = (incomeTaxPaid / revenue) * 100;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];

  // 增值税税负率偏低
  if (vatRate < benchmarks.vatRate.min) {
    const isHigh = (benchmarks.vatRate.min - vatRate) > benchmarks.vatRate.min * 0.5;
    result.push({
      rule: isHigh ? '增值税税负异常偏低' : '增值税税负率偏低',
      level: isHigh ? 'high' : 'medium',
      levelIcon: isHigh ? '🔴' : '🟡',
      detail: `增值税税负率${vatRate.toFixed(2)}%，${isHigh ? '显著' : ''}低于行业下限${benchmarks.vatRate.min}%`,
      consequence: isHigh ? `税负率严重偏低，需补缴增值税约${((benchmarks.vatRate.min - vatRate) / 100 * revenue / 10000).toFixed(0)}万元，并处滞纳金` : '税负率偏低可能面临纳税评估，需合理解释',
      taxPolicy: isHigh ? '《税收征收管理法》第六十三条；行业税负预警标准' : '《增值税暂行条例》及行业税负监控标准'
    });
  }

  // 所得税贡献率偏低
  if (citRate < benchmarks.citRate.min) {
    const isHigh = (benchmarks.citRate.min - citRate) > benchmarks.citRate.min * 0.5;
    result.push({
      rule: isHigh ? '所得税贡献异常偏低' : '所得税贡献率偏低',
      level: isHigh ? 'high' : 'medium',
      levelIcon: isHigh ? '🔴' : '🟡',
      detail: `所得税贡献率${citRate.toFixed(2)}%，${isHigh ? '显著' : ''}低于行业下限${benchmarks.citRate.min}%`,
      consequence: isHigh ? '所得税贡献严重偏低，需核查成本列支和收入确认' : '所得税贡献偏低可能面临纳税评估',
      taxPolicy: isHigh ? '《企业所得税法》第四十一条；转让定价相关规定' : '《企业所得税法》及行业所得税税负监控标准'
    });
  }

  // 毛利率偏低
  if (grossMargin < benchmarks.grossMargin.min) {
    const isHigh = (benchmarks.grossMargin.min - grossMargin) > benchmarks.grossMargin.min * 0.5;
    result.push({
      rule: isHigh ? '毛利率异常偏低' : '毛利率偏低',
      level: isHigh ? 'high' : 'medium',
      levelIcon: isHigh ? '🔴' : '🟡',
      detail: `毛利率${grossMargin.toFixed(1)}%，${isHigh ? '显著' : ''}低于行业下限${benchmarks.grossMargin.min}%`,
      consequence: isHigh ? '毛利率严重偏低，涉嫌隐匿收入或虚增成本，需补缴税款并处0.5-5倍罚款' : '毛利率偏低需有合理商业理由，否则可能面临纳税调整',
      taxPolicy: isHigh ? '《税收征收管理法》第六十三条；《企业所得税法》' : '《企业所得税法》第八条；成本核算相关规定'
    });
  }

  // 资产负债率偏高
  if (debtRatio > 70) {
    result.push({ rule: '资产负债率偏高', level: 'high', levelIcon: '🔴', detail: `资产负债率${debtRatio.toFixed(1)}%，超过70%高风险线`, consequence: '负债率过高，财务风险较大，可能面临资金链断裂风险', taxPolicy: '企业财务风险评估标准' });
  } else if (debtRatio > 60) {
    result.push({ rule: '资产负债率偏高', level: 'medium', levelIcon: '🟡', detail: `资产负债率${debtRatio.toFixed(1)}%，超过60%预警线`, consequence: '负债率偏高需关注偿债能力和资金链安全', taxPolicy: '企业财务风险评估标准' });
  }

  return result;
}

// ===== 行业基准对比 =====
interface BenchmarkItem {
  name: string;
  unit: string;
  benchmarkMin: number;
  benchmarkMax: number;
  actual: number;
  status: string;
}

function calculateIndustryBenchmarks(
  revenue: number, cost: number, vatPaid: number, incomeTaxPaid: number,
  totalAssets: number, totalLiabilities: number, industry: string
): { industry: string; items: BenchmarkItem[] } {
  const items: BenchmarkItem[] = [];
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];

  const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
  const vatRate = revenue > 0 ? (vatPaid / revenue) * 100 : 0;
  const citRate = revenue > 0 ? (incomeTaxPaid / revenue) * 100 : 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  items.push({ name: '毛利率', unit: '%', benchmarkMin: benchmarks.grossMargin.min, benchmarkMax: benchmarks.grossMargin.max, actual: parseFloat(grossMargin.toFixed(1)), status: grossMargin < benchmarks.grossMargin.min ? 'below' : grossMargin > benchmarks.grossMargin.max ? 'above' : 'normal' });
  items.push({ name: '所得税贡献率', unit: '%', benchmarkMin: benchmarks.citRate.min, benchmarkMax: benchmarks.citRate.max, actual: parseFloat(citRate.toFixed(2)), status: citRate < benchmarks.citRate.min ? 'below' : citRate > benchmarks.citRate.max ? 'above' : 'normal' });
  items.push({ name: '增值税税负率', unit: '%', benchmarkMin: benchmarks.vatRate.min, benchmarkMax: benchmarks.vatRate.max, actual: parseFloat(vatRate.toFixed(2)), status: vatRate < benchmarks.vatRate.min ? 'below' : vatRate > benchmarks.vatRate.max ? 'above' : 'normal' });
  items.push({ name: '资产负债率', unit: '%', benchmarkMin: 0, benchmarkMax: 70, actual: parseFloat(debtRatio.toFixed(1)), status: debtRatio > 70 ? 'above' : 'normal' });

  return { industry, items };
}

// ===== 风险等级判定 =====
function determineOverallLevel(redCount: number, yellowCount: number): { level: string; icon: string } {
  if (redCount >= 4) return { level: '高风险', icon: '🔴' };
  if (redCount >= 2) return { level: '中高风险', icon: '🟠' };
  if (redCount >= 1 || yellowCount >= 1) return { level: '中风险', icon: '🟡' };
  return { level: '低风险', icon: '🟢' };
}

// ===== 主处理 =====
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskId = searchParams.get('riskId');
    if (!riskId) {
      return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
    }

    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ error: '获取飞书Token失败' }, { status: 500 });
    }

    // 1. 从飞书读取记录（使用 POST search API）
    const searchRes = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: {
            conjunction: "and",
            conditions: [
              {
                field_name: "检测ID",
                operator: "is",
                value: [riskId],
              },
            ],
          },
        }),
      }
    );
    const searchData = await searchRes.json();

    if (!searchData.data?.items?.length) {
      return NextResponse.json({ error: '未找到该检测记录' }, { status: 404 });
    }

    const fields: Record<string, any> = searchData.data.items[0].fields;

    // 2. 报告状态
    const reportStatus = String(extractFieldValue(fields['报告状态']) || '待审核');

    // 3. 构建basicInfo
    const basicInfo = {
      enterpriseName: String(extractFieldValue(fields['企业名称']) || ''),
      contactPerson: String(extractFieldValue(fields['联系人']) || ''),
      contactPhone: String(extractFieldValue(fields['联系电话']) || ''),
      industry: String(extractFieldValue(fields['所属行业']) || ''),
      revenueScale: String(extractFieldValue(fields['年营收规模']) || ''),
      creditCode: String(extractFieldValue(fields['统一信用代码']) || ''),
    };

    // 4. 读取20个checkbox，构建riskItems
    const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q20'];

    const highRiskItems: { name: string; source: string; module: string; impact: string; consequence: string; taxPolicy: string; level: string }[] = [];
    const mediumRiskItems: { name: string; source: string; module: string; impact: string; consequence: string; taxPolicy: string; level: string }[] = [];
    const lowRiskNames: string[] = [];

    // 飞书checkbox字段名映射（与submit写入的QUESTION_FIELD_MAP一致）
    const QUESTION_FIELD_MAP: Record<string, string> = {
      'q1': 'q1_逾期申报', 'q2': 'q2_连续零申报', 'q3': 'q3_增值税与所得税收入差异',
      'q4': 'q4_连续三年亏损', 'q5': 'q5_异常发票', 'q6': 'q6_发票经营范围不符',
      'q7': 'q7_变票入账', 'q8': 'q8_进销项不匹配', 'q9': 'q9_隐匿收入',
      'q10': 'q10_账外经营', 'q11': 'q11_利润虚高', 'q12': 'q12_库存账实不符',
      'q13': 'q13_个人消费报销', 'q14': 'q14_股东往来款过大', 'q15': 'q15_利润临界值享受小微',
      'q16': 'q16_三无费用', 'q17': 'q17_税收洼地核定', 'q18': 'q18_关联交易价格偏离',
      'q19': 'q19_多层架构转移利润', 'q20': 'q20_非实际员工发工资'
    };

    for (const key of questionKeys) {
      const info = V5_QUESTION_MAPPING[key];
      if (!info) continue;

      const fieldName = QUESTION_FIELD_MAP[key] || `${key}_${info.name}`;
      const answer = Boolean(fields[fieldName]);

      if (answer) {
        const isHighRisk = HIGH_RISK_QUESTIONS.includes(key);
        const level = isHighRisk ? 'high' : 'medium';
        const levelIcon = isHighRisk ? '🔴' : '🟡';
        const item = {
          name: info.name,
          source: `问卷${key}`,
          module: info.module,
          impact: info.consequence,
          consequence: info.consequence,
          taxPolicy: info.taxPolicy,
          level: levelIcon,
        };
        if (isHighRisk) {
          highRiskItems.push(item);
        } else {
          mediumRiskItems.push(item);
        }
      } else {
        lowRiskNames.push(info.name);
      }
    }

    // 交叉验证中的高风险项也计入
    const redCount = highRiskItems.length;
    const yellowCount = mediumRiskItems.length;
    const greenCount = lowRiskNames.length;

    const { level: overallLevel, icon: levelIcon } = determineOverallLevel(redCount, yellowCount);

    // 5. 读取财务指标
    const revenue = getNumber(fields['营业收入(万元)']);
    const cost = getNumber(fields['营业成本(万元)']);
    const vatPaid = getNumber(fields['实缴增值税(万元)']);
    const incomeTaxPaid = getNumber(fields['实缴所得税(万元)']);
    const totalAssets = getNumber(fields['总资产(万元)']);
    const totalLiabilities = getNumber(fields['总负债(万元)']);
    const period = String(extractFieldValue(fields['所属期']) || '');

    // 6. 计算财务指标
    const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const vatRate = revenue > 0 ? (vatPaid / revenue) * 100 : 0;
    const citRate = revenue > 0 ? (incomeTaxPaid / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? ((revenue - cost - incomeTaxPaid) / revenue) * 100 : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    // 7. 交叉验证
    let crossValidation: CrossValidationItem[];
    const existingCrossValidation = extractFieldValue(fields['交叉验证结果']);
    if (existingCrossValidation && typeof existingCrossValidation === 'string') {
      try {
        crossValidation = JSON.parse(existingCrossValidation);
      } catch {
        crossValidation = calculateCrossValidation(revenue, cost, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities, basicInfo.industry);
      }
    } else {
      crossValidation = calculateCrossValidation(revenue, cost, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities, basicInfo.industry);
    }

    // 将交叉验证的高风险项也加入highRiskItems
    for (const cv of crossValidation) {
      if (cv.level === 'high') {
        highRiskItems.push({
          name: cv.rule,
          source: '交叉验证',
          module: 'financial',
          impact: cv.consequence,
          consequence: cv.consequence,
          taxPolicy: cv.taxPolicy,
          level: '🔴',
        });
      } else if (cv.level === 'medium') {
        mediumRiskItems.push({
          name: cv.rule,
          source: '交叉验证',
          module: 'financial',
          impact: cv.consequence,
          consequence: cv.consequence,
          taxPolicy: cv.taxPolicy,
          level: '🟡',
        });
      }
    }

    // 8. 行业基准对比
    const industryBenchmarks = calculateIndustryBenchmarks(revenue, cost, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities, basicInfo.industry);

    // 9. 构建返回JSON
    const createdAt = fields['创建时间'] ? new Date(fields['创建时间'] as number).toISOString() : '';

    const result = {
      basicInfo,
      riskLevel: overallLevel,
      riskCounts: { red: redCount, yellow: yellowCount, green: greenCount },
      reportContent: {
        overview: {
          riskId,
          period,
          level: overallLevel,
          levelIcon,
          redCount,
          yellowCount,
          greenCount,
        },
        highRiskItems,
        mediumRiskItems,
        lowRiskItems: lowRiskNames,
        trendWarnings: [] as { label: string; level: string; detail: string; consequence: string }[],
        crossValidation: crossValidation.map(cv => ({
          name: cv.rule,
          rule: cv.rule,
          level: cv.level === 'high' ? 'red' : 'yellow',
          detail: cv.detail,
          taxPolicy: cv.taxPolicy,
        })),
        industryBenchmarks,
        financialIndicators: [{
          period,
          grossMargin: parseFloat(grossMargin.toFixed(1)),
          vatRate: parseFloat(vatRate.toFixed(2)),
          citRate: parseFloat(citRate.toFixed(2)),
          netMargin: parseFloat(netMargin.toFixed(1)),
          liabilityRatio: parseFloat(debtRatio.toFixed(1)),
        }],
      },
      createdAt,
      reportStatus,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('risk-report error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
