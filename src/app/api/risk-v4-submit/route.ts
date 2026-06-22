import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

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
  '建筑业': { grossMargin: { min: 8, max: 18 }, netMargin: { min: 2, max: 6 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '商务服务业': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 15, max: 30 }, vatRate: { min: 2.5, max: 5.0 }, citRate: { min: 1.0, max: 3.0 } },
  '生活服务业': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.5 }, citRate: { min: 0.5, max: 2.0 } },
  '科技互联网': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '其他': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } }
};

// 问卷题目完整映射（带影响说明和后果）
interface QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  consequence: string;
}

const QUESTION_MAPPING: Record<string, QuestionInfo> = {
  // 模块1：发票与资金流 (inv1-inv5)
  'inv1': { module: 'invoice', moduleName: '发票与资金流', name: '四流不一致', consequence: '按偷税论处，补缴增值税+企业所得税，并处0.5-5倍罚款' },
  'inv2': { module: 'invoice', moduleName: '发票与资金流', name: '私户收款未入账', consequence: '补缴增值税+所得税，0.5-5倍罚款' },
  'inv3': { module: 'invoice', moduleName: '发票与资金流', name: '变名发票', consequence: '按虚开发票论处，补缴税款+罚款，情节严重可追究刑事责任' },
  'inv4': { module: 'invoice', moduleName: '发票与资金流', name: '上游供应商异常', consequence: '进项转出+补缴增值税+罚款' },
  'inv5': { module: 'invoice', moduleName: '发票与资金流', name: '红冲发票异常', consequence: '涉嫌虚开增值税发票，补缴税款+罚款' },
  // 模块2：收入与成本 (rev1-rev4)
  'rev1': { module: 'revenueCost', moduleName: '收入与成本', name: '延迟确认收入', consequence: '补缴增值税+所得税+滞纳金' },
  'rev2': { module: 'revenueCost', moduleName: '收入与成本', name: '替票冲账', consequence: '费用调增+补缴企业所得税+罚款' },
  'rev3': { module: 'revenueCost', moduleName: '收入与成本', name: '个人消费入公司账', consequence: '费用调增+补缴企业所得税+罚款' },
  'rev4': { module: 'revenueCost', moduleName: '收入与成本', name: '存货账实不符', consequence: '涉嫌隐匿收入或虚增成本，补缴税款+罚款' },
  // 模块3：公私账户与股东 (pp1-pp5)
  'pp1': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '股东借款超一年未还', consequence: '视同分红，需代扣代缴20%个人所得税' },
  'pp2': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '利润分配不规范', consequence: '涉嫌逃避个人所得税，补缴+罚款' },
  'pp3': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '关联方资金互转', consequence: '转让定价调整风险，需补缴税款+滞纳金' },
  'pp4': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '大额现金交易', consequence: '资金链异常，触发税务稽查重点关注' },
  'pp5': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '报销替代工资', consequence: '补缴个人所得税+社保，0.5-5倍罚款' },
  // 模块4：税务申报与政策 (tax1-tax5)
  'tax1': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '逾期申报/缴税', consequence: '按日加收万分之五滞纳金，并处0.5-5倍罚款' },
  'tax2': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '小微优惠滥用', consequence: '补缴优惠减免税款+滞纳金+罚款' },
  'tax3': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税收洼地空壳公司', consequence: '核定征收优惠被否定，补缴全部税款+滞纳金' },
  'tax4': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税负率低于行业均值', consequence: '面临纳税评估，补缴+滞纳金+0.5-5倍罚款' },
  'tax5': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '被稽查/纳税评估', consequence: '再次被稽查概率显著提高' }
};

// 辅助函数 = 
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
    const num = parseFloat(value.replace(/[,\s]/g, ''));
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

// 新版财务数据类型（4期分层） = 
interface FinancialPeriod {
  period: string;
  type: 'latest' | 'annual';
  revenue: number;
  cost: number;
  profit: number;
  vat: number;           // 增值税
  cit: number;           // 所得税（企业所得税）
  totalAssets: number;  // 总资产
  totalLiabilities: number; // 总负债
  accountsReceivable: number; // 应收账款
  inventory: number;    // 期末存货
  advanceReceived: number; // 预收账款
}

// 风险项结构 = 
type RiskLevel = 'high' | 'medium' | 'low';

interface RiskItem {
  name: string;
  source: string;
  module: string;
  level: RiskLevel;
  levelIcon: string;
  score: number;
  impact: string;
  consequence: string;
}

// 财务指标计算 = 
function calculateMetrics(data: FinancialPeriod) {
  const grossMargin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
  const netMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
  // 使用正确字段名: vat 和 cit
  const vatRate = data.revenue > 0 ? (data.vat / data.revenue) * 100 : 0;
  const citRate = data.revenue > 0 ? (data.cit / data.revenue) * 100 : 0;
  const debtRatio = data.totalAssets > 0 ? (data.totalLiabilities / data.totalAssets) * 100 : 0;
  return { grossMargin, netMargin, vatRate, citRate, debtRatio };
}

// 问卷风险项映射 = 
function mapQuestionToRisk(key: string, score: number, answers: Record<string, number>): RiskItem | null {
  const info = QUESTION_MAPPING[key];
  if (!info) return null;
  
  let level: RiskLevel;
  let levelIcon: string;
  
  if (score === 0) {
    level = 'low';
    levelIcon = '🟢';
  } else if (score <= 2) {
    level = 'medium';
    levelIcon = '🟡';
  } else {
    level = 'high';
    levelIcon = '🔴';
  }
  
  // 影响说明
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
    module: info.moduleName,
    level,
    levelIcon,
    score,
    impact,
    consequence: level === 'low' ? '' : info.consequence
  };
}

// 交叉验证风险等级映射 = 
interface CrossValidationItem {
  rule: string;
  level: RiskLevel;
  levelIcon: string;
  detail: string;
  consequence: string;
}

function calculateCrossValidation(
  financialData: FinancialPeriod[],
  industry: string
): CrossValidationItem[] {
  const result: CrossValidationItem[] = [];
  const latestData = financialData.find(d => d.type === 'latest') || financialData[0];
  
  if (!latestData || latestData.revenue <= 0) return result;
  
  const metrics = calculateMetrics(latestData);
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  const revenue = latestData.revenue;
  
  // 1. 延迟确认收入：预收/收入比（使用 correct field name advanceReceived）
  const advanceRatio = latestData.advanceReceived / revenue;
  if (advanceRatio <= 0.2) {
    // 正常，不记录
  } else if (advanceRatio <= 0.3) {
    result.push({
      rule: '预收账款占比偏高',
      level: 'medium',
      levelIcon: '🟡',
      detail: `预收/收入=${(advanceRatio * 100).toFixed(1)}%，介于20%-30%`,
      consequence: `预收账款长期挂账可能涉及延迟确认收入，建议核实业务实质`
    });
  } else {
    result.push({
      rule: '预收账款占比异常',
      level: 'high',
      levelIcon: '🔴',
      detail: `预收/收入=${(advanceRatio * 100).toFixed(1)}%，超过30%`,
      consequence: '预收账款占比异常，涉嫌延迟确认收入，需补缴增值税和企业所得税，并处滞纳金'
    });
  }
  
  // 2. 隐匿收入嫌疑：毛利率
  const grossMarginDiff = metrics.grossMargin - benchmarks.grossMargin.min;
  if (metrics.grossMargin >= benchmarks.grossMargin.min) {
    // 正常
  } else if (grossMarginDiff >= benchmarks.grossMargin.min * 0.5 * -1) {
    result.push({
      rule: '毛利率偏低',
      level: 'medium',
      levelIcon: '🟡',
      detail: `毛利率${metrics.grossMargin.toFixed(1)}%，接近行业下限${benchmarks.grossMargin.min}%`,
      consequence: '毛利率偏低需有合理商业理由，否则可能面临纳税调整'
    });
  } else {
    result.push({
      rule: '隐匿收入嫌疑',
      level: 'high',
      levelIcon: '🔴',
      detail: `毛利率${metrics.grossMargin.toFixed(1)}%，显著低于行业下限${benchmarks.grossMargin.min}%`,
      consequence: '毛利率严重偏低，涉嫌隐匿收入，需补缴增值税和企业所得税，并处0.5-5倍罚款'
    });
  }
  
  // 3. 虚增成本嫌疑：净利率
  const netMarginDiff = metrics.netMargin - benchmarks.netMargin.min;
  if (metrics.netMargin >= benchmarks.netMargin.min) {
    // 正常
  } else if (netMarginDiff >= benchmarks.netMargin.min * 0.5 * -1) {
    result.push({
      rule: '净利率偏低',
      level: 'medium',
      levelIcon: '🟡',
      detail: `净利率${metrics.netMargin.toFixed(1)}%，接近行业下限${benchmarks.netMargin.min}%`,
      consequence: '净利率偏低可能涉及成本核算不规范，建议自查'
    });
  } else {
    result.push({
      rule: '虚增成本嫌疑',
      level: 'high',
      levelIcon: '🔴',
      detail: `净利率${metrics.netMargin.toFixed(1)}%，显著低于行业下限${benchmarks.netMargin.min}%`,
      consequence: '净利率严重偏低，涉嫌虚增成本，需补缴企业所得税并处0.5-5倍罚款'
    });
  }
  
  // 4. 税负偏低：增值税税负率
  const vatDiff = metrics.vatRate - benchmarks.vatRate.min;
  if (metrics.vatRate >= benchmarks.vatRate.min) {
    // 正常
  } else if (vatDiff >= benchmarks.vatRate.min * 0.5 * -1) {
    result.push({
      rule: '增值税税负率偏低',
      level: 'medium',
      levelIcon: '🟡',
      detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，接近行业下限${benchmarks.vatRate.min}%`,
      consequence: '税负率偏低可能面临纳税评估，需合理解释'
    });
  } else {
    result.push({
      rule: '增值税税负异常',
      level: 'high',
      levelIcon: '🔴',
      detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，显著低于行业下限${benchmarks.vatRate.min}%`,
      consequence: `税负率严重偏低，需补缴增值税约${((benchmarks.vatRate.min - metrics.vatRate) / 100 * revenue).toFixed(0)}万元，并处滞纳金`
    });
  }
  
  // 5. 连续亏损：检查多年数据
  const annualData = financialData.filter(d => d.type === 'annual' && d.profit !== undefined && d.profit !== 0);
  const lossYears = annualData.filter(d => d.profit < 0).length;
  if (lossYears === 0) {
    // 正常
  } else if (lossYears === 1) {
    result.push({
      rule: '单年亏损',
      level: 'medium',
      levelIcon: '🟡',
      detail: `近${annualData.length}年中1年亏损，需有合理解释`,
      consequence: '单年亏损需有合理的商业理由，建议准备相关说明材料'
    });
  } else {
    result.push({
      rule: '连续亏损',
      level: 'high',
      levelIcon: '🔴',
      detail: `近${annualData.length}年中${lossYears}年亏损，${lossYears >= 2 ? '连续' : '累计'}亏损`,
      consequence: '连续亏损可能引发税务关注，需准备完税证明和情况说明'
    });
  }
  
  return result;
}

// 趋势预警风险等级映射 = 
interface TrendWarningItem {
  type: string;
  label: string;
  level: RiskLevel;
  levelIcon: string;
  detail: string;
  consequence: string;
}

function calculateTrendWarnings(financialData: FinancialPeriod[]): TrendWarningItem[] {
  const result: TrendWarningItem[] = [];
  
  if (financialData.length < 2) return result;
  
  // 排序：最新一期在前，年度按时间倒序
  const sorted = [...financialData].sort((a, b) => {
    if (a.type === 'latest' && b.type !== 'latest') return -1;
    if (a.type !== 'latest' && b.type === 'latest') return 1;
    return b.period.localeCompare(a.period);
  });
  
  const current = calculateMetrics(sorted[0]);
  const previous = calculateMetrics(sorted[1]);
  
  // 预警1：增值税税负率骤降（同比降30%-50%为🟡，>50%为🔴）
  if (previous.vatRate > 0) {
    const dropRate = (previous.vatRate - current.vatRate) / previous.vatRate;
    if (dropRate > 0.3) {
      if (dropRate > 0.5) {
        result.push({
          type: 'vat_drop',
          label: '增值税税负骤降',
          level: 'high',
          levelIcon: '🔴',
          detail: `同比下降${(dropRate * 100).toFixed(0)}%（${previous.vatRate.toFixed(2)}%→${current.vatRate.toFixed(2)}%）`,
          consequence: '税负骤降超过50%，涉嫌逃避增值税，需重点核查'
        });
      } else {
        result.push({
          type: 'vat_drop',
          label: '增值税税负下降',
          level: 'medium',
          levelIcon: '🟡',
          detail: `同比下降${(dropRate * 100).toFixed(0)}%（${previous.vatRate.toFixed(2)}%→${current.vatRate.toFixed(2)}%）`,
          consequence: '税负下降需有合理业务原因，建议关注进项抵扣合规性'
        });
      }
    }
  }
  
  // 预警2：所得税贡献率骤降
  if (previous.citRate > 0) {
    const dropRate = (previous.citRate - current.citRate) / previous.citRate;
    if (dropRate > 0.3) {
      if (dropRate > 0.5) {
        result.push({
          type: 'cit_drop',
          label: '所得税贡献骤降',
          level: 'high',
          levelIcon: '🔴',
          detail: `同比下降${(dropRate * 100).toFixed(0)}%（${previous.citRate.toFixed(2)}%→${current.citRate.toFixed(2)}%）`,
          consequence: '所得税贡献骤降超过50%，需核查成本列支和收入确认'
        });
      } else {
        result.push({
          type: 'cit_drop',
          label: '所得税贡献下降',
          level: 'medium',
          levelIcon: '🟡',
          detail: `同比下降${(dropRate * 100).toFixed(0)}%（${previous.citRate.toFixed(2)}%→${current.citRate.toFixed(2)}%）`,
          consequence: '所得税贡献下降需关注成本费用合理性'
        });
      }
    }
  }
  
  // 预警3：毛利率持续下降（需要3+期数据，检查整体下降幅度）
  if (financialData.length >= 3) {
    const third = calculateMetrics(sorted[2]);
    const totalDrop = third.grossMargin - current.grossMargin;
    if (totalDrop > 5) {
      if (totalDrop > 10) {
        result.push({
          type: 'gross_margin_drop',
          label: '毛利率持续恶化',
          level: 'high',
          levelIcon: '🔴',
          detail: `整体下降${totalDrop.toFixed(1)}个百分点（${third.grossMargin.toFixed(1)}%→${current.grossMargin.toFixed(1)}%）`,
          consequence: '毛利率大幅下降超过10个百分点，涉嫌虚增成本'
        });
      } else {
        result.push({
          type: 'gross_margin_drop',
          label: '毛利率下降',
          level: 'medium',
          levelIcon: '🟡',
          detail: `整体下降${totalDrop.toFixed(1)}个百分点（${third.grossMargin.toFixed(1)}%→${current.grossMargin.toFixed(1)}%）`,
          consequence: '毛利率持续下降需关注成本结构变化'
        });
      }
    }
  }
  
  // 预警4：利润萎缩趋势（检查连续下降）
  if (financialData.length >= 3) {
    const third = calculateMetrics(sorted[2]);
    let consecutiveDecline = 0;
    if (third.netMargin > previous.netMargin && previous.netMargin > current.netMargin) {
      consecutiveDecline = 3;
    } else if (previous.netMargin > current.netMargin) {
      consecutiveDecline = 2;
    }
    
    if (consecutiveDecline >= 2) {
      if (consecutiveDecline >= 3) {
        result.push({
          type: 'net_margin_drop',
          label: '利润持续萎缩',
          level: 'high',
          levelIcon: '🔴',
          detail: `净利率连续${consecutiveDecline}期下降（${third.netMargin.toFixed(1)}%→${previous.netMargin.toFixed(1)}%→${current.netMargin.toFixed(1)}%）`,
          consequence: '利润连续下降可能涉及成本虚增或收入隐匿'
        });
      } else {
        result.push({
          type: 'net_margin_drop',
          label: '利润下降趋势',
          level: 'medium',
          levelIcon: '🟡',
          detail: `净利率连续下降，需关注盈利质量`,
          consequence: '利润下降趋势需关注成本费用控制'
        });
      }
    }
  }
  
  // 预警5：负债率攀升
  if (financialData.length >= 3) {
    const third = calculateMetrics(sorted[2]);
    let consecutiveRise = 0;
    if (third.debtRatio < previous.debtRatio && previous.debtRatio < current.debtRatio) {
      consecutiveRise = 3;
    } else if (previous.debtRatio < current.debtRatio) {
      consecutiveRise = 2;
    }
    
    if (consecutiveRise >= 2 && current.debtRatio > 60) {
      if (consecutiveRise >= 3 && current.debtRatio > 70) {
        result.push({
          type: 'debt_ratio_rise',
          label: '负债率持续攀升',
          level: 'high',
          levelIcon: '🔴',
          detail: `资产负债率连续上升至${current.debtRatio.toFixed(1)}%（>70%）`,
          consequence: '负债率持续攀升且超过70%，财务风险较高'
        });
      } else {
        result.push({
          type: 'debt_ratio_rise',
          label: '负债率上升',
          level: 'medium',
          levelIcon: '🟡',
          detail: `资产负债率连续上升至${current.debtRatio.toFixed(1)}%（>60%）`,
          consequence: '负债率上升需关注偿债能力和资金链安全'
        });
      }
    }
  }
  
  return result;
}

// 综合风险等级判定 = 
function determineOverallLevel(redCount: number, yellowCount: number): { level: string; icon: string } {
  if (redCount >= 5) return { level: '极高风险', icon: '🔴' };
  if (redCount >= 3) return { level: '高风险', icon: '🟠' };
  if (redCount >= 1) return { level: '中风险', icon: '🟡' };
  if (yellowCount >= 5) return { level: '中风险', icon: '🟡' };
  if (yellowCount >= 3) return { level: '中低风险', icon: '🟡' };
  return { level: '低风险', icon: '🟢' };
}

// 获取数据完整度信息 = 
function getDataCompleteness(data: FinancialPeriod[]): { count: number; msg: string } {
  const filledCount = data.filter(d => d.revenue > 0 || d.profit > 0).length;
  
  if (filledCount === 1) {
    return { count: 1, msg: '本次检测仅基于单期数据，无法进行趋势分析。建议补充年度数据以获取更精准诊断。' };
  } else if (filledCount === 2) {
    return { count: 2, msg: '基于2期数据对比，已识别同比变化趋势。补充更多年度数据可提升诊断精度。' };
  } else if (filledCount === 3) {
    return { count: 3, msg: '基于3期数据对比，趋势分析可信度较高。' };
  } else if (filledCount >= 4) {
    return { count: 4, msg: '基于4期完整数据，趋势分析最为精准，诊断结果参考价值最高。' };
  }
  return { count: filledCount, msg: '' };
}

// 预估风险金额计算（仅基于🔴🟡项）==============
interface EstimatedRiskItem {
  name: string;
  level: string;
  detail: string;
  amountMin: number;
  amountMax: number;
}

function calculateEstimatedRisk(
  redItems: RiskItem[],
  mediumItems: RiskItem[],
  crossValidation: CrossValidationItem[],
  trendWarnings: TrendWarningItem[],
  revenue: number
): EstimatedRiskItem[] {
  const result: EstimatedRiskItem[] = [];
  
  // 基于高风险项估算
  if (redItems.length > 0) {
    // 按模块分组估算
    const moduleGroups = new Map<string, RiskItem[]>();
    redItems.forEach(item => {
      const existing = moduleGroups.get(item.module) || [];
      existing.push(item);
      moduleGroups.set(item.module, existing);
    });
    
    moduleGroups.forEach((items, module) => {
      const base = revenue * 0.01;
      result.push({
        name: `${module}高风险项`,
        level: '🔴高风险',
        detail: `${items.length}项高风险因素`,
        amountMin: Math.round(base * items.length * 50),  // 万元
        amountMax: Math.round(base * items.length * 500)
      });
    });
  }
  
  // 基于中等风险项估算
  if (mediumItems.length > 0) {
    const base = revenue * 0.005;
    result.push({
      name: '中等风险因素',
      level: '🟡中风险',
      detail: `${mediumItems.length}项中等风险因素`,
      amountMin: Math.round(base * mediumItems.length * 10),
      amountMax: Math.round(base * mediumItems.length * 100)
    });
  }
  
  // 基于交叉验证风险
  const redCross = crossValidation.filter(c => c.level === 'high');
  if (redCross.length > 0 && revenue > 0) {
    result.push({
      name: '财务指标异常',
      level: '🔴高风险',
      detail: `${redCross.length}项财务指标严重偏离行业均值`,
      amountMin: Math.round(revenue * 0.05),
      amountMax: Math.round(revenue * 0.3)
    });
  }
  
  // 基于趋势预警风险
  const redTrend = trendWarnings.filter(t => t.level === 'high');
  if (redTrend.length > 0 && revenue > 0) {
    result.push({
      name: '风险趋势恶化',
      level: '🔴高风险',
      detail: `${redTrend.length}项关键指标趋势恶化`,
      amountMin: Math.round(revenue * 0.02),
      amountMax: Math.round(revenue * 0.15)
    });
  }
  
  return result;
}

// 报告内容生成（新版JSON结构）==============
function generateReportContent(params: {
  riskId: string;
  period: string;
  overallLevel: string;
  levelIcon: string;
  redCount: number;
  yellowCount: number;
  greenCount: number;
  totalItems: number;
  highRiskItems: RiskItem[];
  mediumRiskItems: RiskItem[];
  lowRiskItems: string[];
  trend: Array<{ period: string; metrics: ReturnType<typeof calculateMetrics> }>;
  trendWarnings: TrendWarningItem[];
  estimatedRisk: EstimatedRiskItem[];
  crossValidation: CrossValidationItem[];
  dataCompleteness: { count: number; msg: string };
}): string {
  const totalAmountMin = params.estimatedRisk.reduce((s, r) => s + r.amountMin, 0);
  const totalAmountMax = params.estimatedRisk.reduce((s, r2) => s + r2.amountMax, 0);
  
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
    dataCompleteness: params.dataCompleteness,
    highRiskItems: params.highRiskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.module,
      impact: i.impact,
      consequence: i.consequence
    })),
    mediumRiskItems: params.mediumRiskItems.map(i => ({
      name: i.name,
      source: i.source,
      module: i.module,
      impact: i.impact
    })),
    lowRiskItems: params.lowRiskItems,
    trend: params.trend.map(t => ({
      period: t.period,
      ...t.metrics
    })),
    trendWarnings: params.trendWarnings.map(w => ({
      label: w.label,
      level: w.levelIcon,
      detail: w.detail,
      consequence: w.consequence
    })),
    estimatedRiskAmount: {
      items: params.estimatedRisk,
      totalMin: totalAmountMin,
      totalMax: totalAmountMax
    },
    crossValidation: params.crossValidation.map(c => ({
      rule: c.rule,
      level: c.levelIcon,
      detail: c.detail,
      consequence: c.consequence
    })),
    suggestion: ''
  }, null, 2);
}

// 飞书写入 = 
async function writeToFeishu(fields: Record<string, unknown>): Promise<boolean> {
  const token = await getFeishuToken();
  if (!token) return false;
  
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
    console.error('飞书写入失败:', result);
    return false;
  }
  return true;
}

// 飞书消息通知
async function sendFeishuNotification(params: { riskId: string; companyName: string; contactName: string; contactPhone: string; industry: string; riskLevel: string }) {
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
        text: { tag: 'lark_md', content: `📋 企业：${companyName || '未填写'}\n👤 联系人：${contactName || '未填写'}\n📱 电话：${contactPhone || '未填写'}\n🏢 行业：${industry || '未填写'}\n⚠️ 风险等级：${riskLevel}\n\n👉 [点击查看报告](${reportUrl})` }
      }]
    });
    await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ receive_id: 'ou_087603bf00f651705ab95a1775b6b1a2', msg_type: 'interactive', content })
    });
  } catch (e) { console.error('通知发送失败:', e); }
}

// 主处理函数 = 
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 生成ID和时间
    const riskId = generateRiskId();
    const detectionTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // 问卷答案从 body.questionnaire 读取
    const questionnaire = body.questionnaire || {};
    
    // 解析问卷答案（支持对象格式 {inv1: 3, inv2: 3, ...}）
    const invoiceAnswers: Record<string, number> = {};
    const revenueCostAnswers: Record<string, number> = {};
    const publicPrivateAnswers: Record<string, number> = {};
    const taxPolicyAnswers: Record<string, number> = {};
    
    // 解析问卷答案
    const parseAnswers = (src: unknown, target: Record<string, number>) => {
      if (src && typeof src === 'object') {
        Object.entries(src as Record<string, unknown>).forEach(([key, val]) => {
          target[key] = Number(val) || 0;
        });
      }
    };
    
    parseAnswers(questionnaire.invoiceAnswers, invoiceAnswers);
    parseAnswers(questionnaire.revenueCostAnswers, revenueCostAnswers);
    parseAnswers(questionnaire.publicPrivateAnswers, publicPrivateAnswers);
    parseAnswers(questionnaire.taxPolicyAnswers, taxPolicyAnswers);
    
    // 解析财务数据（使用前端实际字段名）
    let financialData: FinancialPeriod[] = [];
    if (body.financialData && Array.isArray(body.financialData)) {
      financialData = body.financialData.map((d: Record<string, unknown>): FinancialPeriod => ({
        period: String(d.period || ''),
        type: (d.type as 'latest' | 'annual') || 'annual',
        revenue: getNumber(d.revenue),
        cost: getNumber(d.cost),
        profit: getNumber(d.profit),
        vat: getNumber(d.vat),
        cit: getNumber(d.cit),
        totalAssets: getNumber(d.totalAssets),
        totalLiabilities: getNumber(d.totalLiabilities),
        accountsReceivable: getNumber(d.accountsReceivable),
        inventory: getNumber(d.inventory),
        advanceReceived: getNumber(d.advanceReceived)
      }));
    }
    
    // 获取基本信息
    const industry = body.industry || '';
    const revenueScale = body.revenueScale || '';
    const enterpriseName = body.enterpriseName || '';
    const creditCode = body.creditCode || '';
    const contactPerson = body.contactPerson || '';
    const contactPhone = body.contactPhone || '';
    const customerEmail = body.customerEmail || '';
    const period = body.period || detectionTime.split(' ')[0];
    
    // ===== 高中低风险评分 =====
    
    // 1. 问卷风险项映射
    const allAnswers = { ...invoiceAnswers, ...revenueCostAnswers, ...publicPrivateAnswers, ...taxPolicyAnswers };
    const allRiskItems: RiskItem[] = [];
    
    Object.entries(allAnswers).forEach(([key, score]) => {
      const item = mapQuestionToRisk(key, score, allAnswers);
      if (item) allRiskItems.push(item);
    });
    
    const highRiskItems = allRiskItems.filter(i => i.level === 'high');
    const mediumRiskItems = allRiskItems.filter(i => i.level === 'medium');
    const lowRiskItems = allRiskItems.filter(i => i.level === 'low');
    
    // 2. 交叉验证风险
    const crossValidation = calculateCrossValidation(financialData, industry);
    const redCrossValidation = crossValidation.filter(c => c.level === 'high');
    const yellowCrossValidation = crossValidation.filter(c => c.level === 'medium');
    
    // 3. 趋势预警风险
    const trendWarnings = calculateTrendWarnings(financialData);
    const redTrendWarnings = trendWarnings.filter(t => t.level === 'high');
    const yellowTrendWarnings = trendWarnings.filter(t => t.level === 'medium');
    
    // 4. 综合计数
    const redCount = highRiskItems.length + redCrossValidation.length + redTrendWarnings.length;
    const yellowCount = mediumRiskItems.length + yellowCrossValidation.length + yellowTrendWarnings.length;
    const greenCount = lowRiskItems.length;
    const totalItems = 20; // 问卷20题
    
    // 5. 综合风险等级判定
    const { level: overallLevel, icon: levelIcon } = determineOverallLevel(redCount, yellowCount);
    
    // 6. 计算趋势数据
    const latestData = financialData.find(d => d.type === 'latest') || financialData[0];
    const latestMetrics = latestData ? calculateMetrics(latestData) : null;
    const trendData = financialData.map(d => ({
      period: d.period,
      metrics: calculateMetrics(d)
    })).reverse(); // 按时间正序排列
    
    // 7. 预估风险金额
    const estimatedRisk = calculateEstimatedRisk(
      highRiskItems,
      mediumRiskItems,
      crossValidation,
      trendWarnings,
      latestData?.revenue || 0
    );
    
    // 8. 数据完整度
    const dataCompleteness = getDataCompleteness(financialData);
    
    // ===== 构建飞书字段 =====
    const fields: Record<string, unknown> = {};
    
    // 基本信息
    fields['企业名称'] = enterpriseName;
    fields['统一信用代码'] = creditCode;
    fields['联系人'] = contactPerson;
    fields['联系电话'] = contactPhone;
    fields['客户邮箱'] = customerEmail;
    fields['所属行业'] = industry;
    fields['所属期'] = period;
    fields['年营收规模'] = revenueScale;
    
    // 财务数据
    fields['营业收入(万元)'] = latestData?.revenue || 0;
    fields['营业成本(万元)'] = latestData?.cost || 0;
    fields['利润总额(万元)'] = latestData?.profit || 0;
    fields['实缴增值税(万元)'] = latestData?.vat || 0;
    fields['实缴所得税(万元)'] = latestData?.cit || 0;
    fields['总资产(万元)'] = latestData?.totalAssets || 0;
    fields['总负债(万元)'] = latestData?.totalLiabilities || 0;
    fields['应收账款(万元)'] = latestData?.accountsReceivable || 0;
    fields['预收账款(万元)'] = latestData?.advanceReceived || 0;
    
    // 财务指标
    fields['毛利率'] = latestMetrics?.grossMargin || 0;
    fields['净利率'] = latestMetrics?.netMargin || 0;
    fields['增值税税负率'] = latestMetrics?.vatRate || 0;
    fields['所得税贡献率'] = latestMetrics?.citRate || 0;
    fields['资产负债率'] = latestMetrics?.debtRatio || 0;
    
    // 报告信息
    fields['检测ID'] = riskId;
    fields['检测时间'] = detectionTime;
    fields['报告状态'] = '待审核';
    fields['综合风险等级'] = overallLevel;
    
    // 综合得分改为 redCount×10 + yellowCount×3
    fields['综合得分'] = redCount * 10 + yellowCount * 3;
    
    // 风险统计
    fields['高风险项数'] = redCount;
    fields['中风险项数'] = yellowCount;
    fields['低风险项数'] = greenCount;
    
    // 问卷明细
    fields['问卷明细'] = JSON.stringify({
      invoice: invoiceAnswers,
      revenueCost: revenueCostAnswers,
      publicPrivate: publicPrivateAnswers,
      taxPolicy: taxPolicyAnswers
    });
    
    // 财务数据
    fields['年度财务数据'] = JSON.stringify(financialData);
    fields['数据完整度'] = dataCompleteness.msg;
    fields['财务指标'] = JSON.stringify(latestMetrics);
    
    // 风险项明细
    fields['风险项明细'] = [
      ...highRiskItems.map(i => `🔴${i.name}`),
      ...mediumRiskItems.map(i => `🟡${i.name}`),
      ...lowRiskItems.map(i => `🟢${i.name}`)
    ].join('；') || '暂无风险项';
    
    // 交叉验证
    fields['交叉验证结果'] = crossValidation.length > 0
      ? crossValidation.map(c => `${c.levelIcon}${c.rule}: ${c.detail}`).join('；')
      : '暂无明显矛盾';
    
    // 趋势预警
    fields['趋势预警'] = trendWarnings.length > 0
      ? trendWarnings.map(w => `${w.levelIcon}${w.label}`).join('；')
      : '暂无趋势预警';
    
    // 报告内容（新版JSON结构）
    fields['报告内容'] = generateReportContent({
      riskId,
      period,
      overallLevel,
      levelIcon,
      redCount,
      yellowCount,
      greenCount,
      totalItems,
      highRiskItems,
      mediumRiskItems,
      lowRiskItems: lowRiskItems.map(i => i.name),
      trend: trendData,
      trendWarnings,
      estimatedRisk,
      crossValidation,
      dataCompleteness
    });
    
    // 写入飞书并发送通知
    const feishuSuccess = await writeToFeishu(fields);
    if (feishuSuccess) {
      sendFeishuNotification({ riskId, companyName: String(fields['企业名称'] || ''), contactName: String(fields['联系人'] || ''), contactPhone: String(fields['联系电话'] || ''), industry: String(fields['所属行业'] || ''), riskLevel: overallLevel });
    }
    
    return NextResponse.json({
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
      highRiskItems: highRiskItems.map(i => ({
        name: i.name,
        source: i.source,
        module: i.module,
        impact: i.impact,
        consequence: i.consequence
      })),
      mediumRiskItems: mediumRiskItems.map(i => ({
        name: i.name,
        source: i.source,
        module: i.module,
        impact: i.impact
      })),
      lowRiskItems: lowRiskItems.map(i => i.name),
      crossValidation,
      trendWarnings,
      estimatedRiskAmount: {
        items: estimatedRisk,
        totalMin: estimatedRisk.reduce((s, r) => s + r.amountMin, 0),
        totalMax: estimatedRisk.reduce((s, r) => s + r.amountMax, 0)
      },
      trendData,
      dataCompleteness,
      reportStatus: '待审核',
      feishuSaved: feishuSuccess
    });
    
  } catch (error) {
    console.error('处理V4检测失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}
