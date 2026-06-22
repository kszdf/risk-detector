import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ============== 飞书API配置 ==============
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// ============== 行业基准数据 ==============
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

// ============== 问卷题目映射 ==============
const QUESTION_MAPPING: Record<string, { module: string; name: string }> = {
  '1.1': { module: 'invoice', name: '发票流不一致' },
  '1.2': { module: 'invoice', name: '私户收款' },
  '1.3': { module: 'invoice', name: '变名发票' },
  '1.4': { module: 'invoice', name: '上游供应商异常' },
  '1.5': { module: 'invoice', name: '红字发票异常' },
  '2.1': { module: 'revenueCost', name: '预收账款长期挂账' },
  '2.2': { module: 'revenueCost', name: '替票冲账' },
  '2.3': { module: 'revenueCost', name: '股东个人消费入账' },
  '2.4': { module: 'revenueCost', name: '存货账实不符' },
  '2.5': { module: 'revenueCost', name: '当期亏损' },
  '3.1': { module: 'publicPrivate', name: '股东借款超一年未还' },
  '3.2': { module: 'publicPrivate', name: '利润分配不规范' },
  '3.3': { module: 'publicPrivate', name: '关联方资金互转' },
  '3.4': { module: 'publicPrivate', name: '大额现金支付' },
  '3.5': { module: 'publicPrivate', name: '报销替代工资' },
  '4.1': { module: 'taxPolicy', name: '逾期申报/缴税' },
  '4.2': { module: 'taxPolicy', name: '小微优惠超标' },
  '4.3': { module: 'taxPolicy', name: '税收洼地空壳' },
  '4.4': { module: 'taxPolicy', name: '税负率低于行业' },
  '4.5': { module: 'taxPolicy', name: '被稽查/评估' }
};

// ============== 辅助函数 ==============
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

function getString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

function generateRiskId(): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RC${datePart}${random}`;
}

// ============== 新版财务数据类型（4期分层） ==============
interface FinancialPeriod {
  period: string;  // "2026-04" 或 "2025-12"
  type: 'latest' | 'annual';
  revenue: number;
  cost: number;
  profit: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
  receivables: number;
  inventory: number;
  advanceReceipts: number;
}

interface TrendData {
  period: string;
  revenue: number;
  grossMargin: number;
  netMargin: number;
  vatRate: number;
  citRate: number;
  debtRatio: number;
  trends: {
    grossMargin: string;
    netMargin: string;
    vatRate: string;
    citRate: string;
    debtRatio: string;
  };
}

interface EstimatedRiskItem {
  name: string;
  detail: string;
  taxMin: number;
  taxMax: number;
  penaltyMin: number;
  penaltyMax: number;
}

// ============== 财务指标计算 ==============
function calculateMetrics(data: FinancialPeriod) {
  const grossMargin = data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0;
  const netMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
  const vatRate = data.revenue > 0 ? (data.vatPaid / data.revenue) * 100 : 0;
  const citRate = data.revenue > 0 ? (data.incomeTaxPaid / data.revenue) * 100 : 0;
  const debtRatio = data.totalAssets > 0 ? (data.totalLiabilities / data.totalAssets) * 100 : 0;
  return { grossMargin, netMargin, vatRate, citRate, debtRatio };
}

// ============== 趋势数据计算（基于比率） ==============
function calculateTrendData(financialData: FinancialPeriod[]): TrendData[] {
  // 按时间排序：最新一期在前，然后按年度倒序
  const sorted = [...financialData].sort((a, b) => {
    // 最新一期排最前
    if (a.type === 'latest' && b.type !== 'latest') return -1;
    if (a.type !== 'latest' && b.type === 'latest') return 1;
    // 都是年度或最新一期，按period倒序
    return b.period.localeCompare(a.period);
  });
  
  return sorted.map((data, idx) => {
    const metrics = calculateMetrics(data);
    const trends: Record<string, string> = { grossMargin: '→', netMargin: '→', vatRate: '→', citRate: '→', debtRatio: '→' };
    
    if (idx < sorted.length - 1) {
      const prev = calculateMetrics(sorted[idx + 1]);
      const threshold = 5; // 百分点变化阈值
      
      // 毛利率变化
      if (metrics.grossMargin - prev.grossMargin > threshold) trends.grossMargin = '↗';
      else if (prev.grossMargin - metrics.grossMargin > threshold) trends.grossMargin = '↘';
      
      // 净利率变化
      if (metrics.netMargin - prev.netMargin > threshold) trends.netMargin = '↗';
      else if (prev.netMargin - metrics.netMargin > threshold) trends.netMargin = '↘';
      
      // 增值税税负率变化
      if (metrics.vatRate - prev.vatRate > threshold) trends.vatRate = '↗';
      else if (prev.vatRate - metrics.vatRate > threshold) trends.vatRate = '↘';
      
      // 所得税贡献率变化
      if (metrics.citRate - prev.citRate > threshold) trends.citRate = '↗';
      else if (prev.citRate - metrics.citRate > threshold) trends.citRate = '↘';
      
      // 资产负债率变化
      if (metrics.debtRatio - prev.debtRatio > threshold) trends.debtRatio = '↗';
      else if (prev.debtRatio - metrics.debtRatio > threshold) trends.debtRatio = '↘';
    }
    
    return {
      period: data.period,
      revenue: data.revenue,
      ...metrics,
      trends: trends as TrendData['trends']
    };
  });
}

// ============== 获取数据完整度信息 ==============
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

// ============== 核心风险计算（新版） ==============
interface RiskResult {
  baseScore: number;
  weightedScore: number;
  trendScore: number;
  totalScore: number;
  level: string;
  maxScore: number;
  riskDetails: string[];
  trendWarnings: Array<{ type: string; label: string; score: number; detail: string }>;
  estimatedRisk: EstimatedRiskItem[];
  crossValidation: Array<{ rule: string; conflict: boolean; detail: string }>;
  moduleScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
}

function calculateRisk(
  invoiceAnswers: Record<string, number>,
  revenueCostAnswers: Record<string, number>,
  publicPrivateAnswers: Record<string, number>,
  taxPolicyAnswers: Record<string, number>,
  financialData: FinancialPeriod[],
  industry: string
): RiskResult {
  // 1. 计算模块原始得分
  const module1 = Object.values(invoiceAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module2 = Object.values(revenueCostAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module3 = Object.values(publicPrivateAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module4 = Object.values(taxPolicyAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  
  const moduleScores = { invoice: module1, revenueCost: module2, publicPrivate: module3, taxPolicy: module4 };
  
  // 基础评分：module1×2 + module2×1.67 + module3×1.67 + module4×1.33
  const weightedScore = module1 * 2 + module2 * 1.67 + module3 * 1.67 + module4 * 1.33;
  
  // 2. 计算数据完整度和maxScore
  const { count: dataCount } = getDataCompleteness(financialData);
  let maxScore: number;
  let maxTrendWarnings = 0;
  
  switch (dataCount) {
    case 1:
      maxScore = 115;
      maxTrendWarnings = 0;
      break;
    case 2:
      maxScore = 121;
      maxTrendWarnings = 2; // 税负骤降 + 所得税骤降
      break;
    case 3:
      maxScore = 127;
      maxTrendWarnings = 4;
      break;
    default:
      maxScore = 130;
      maxTrendWarnings = 5; // 全部5条
  }
  
  // 基准得分（不含趋势预警）
  const baseScore = weightedScore;
  
  // 3. 计算交叉验证（基于最新一期数据，每项+3分）
  const crossValidation: Array<{ rule: string; conflict: boolean; detail: string }> = [];
  const latestData = financialData.find(d => d.type === 'latest') || financialData[0];
  const latestMetrics = latestData ? calculateMetrics(latestData) : null;
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  
  if (latestMetrics && latestData) {
    // 延迟确认收入
    if (latestData.revenue > 0 && latestData.advanceReceipts / latestData.revenue > 0.2) {
      if (invoiceAnswers['1.1'] === 0 || revenueCostAnswers['2.1'] === 0) {
        crossValidation.push({ 
          rule: '延迟确认收入', 
          conflict: true, 
          detail: '问卷称一致但预收占比>20%' 
        });
      }
    }
    
    // 隐匿收入嫌疑
    if ((invoiceAnswers['1.1'] === 0 || invoiceAnswers['1.1'] === undefined) && 
        latestMetrics.grossMargin < benchmarks.grossMargin.min * 0.5) {
      crossValidation.push({ 
        rule: '隐匿收入嫌疑', 
        conflict: true, 
        detail: '毛利率低于行业下限50%' 
      });
    }
    
    // 虚增成本嫌疑
    if ((revenueCostAnswers['2.2'] === 0 || revenueCostAnswers['2.2'] === undefined) && 
        latestMetrics.netMargin < benchmarks.netMargin.min * 0.5) {
      crossValidation.push({ 
        rule: '虚增成本嫌疑', 
        conflict: true, 
        detail: '净利率低于行业下限50%' 
      });
    }
    
    // 税负偏低
    if ((taxPolicyAnswers['4.4'] === 0 || taxPolicyAnswers['4.4'] === undefined) && 
        latestMetrics.vatRate < benchmarks.vatRate.min) {
      crossValidation.push({ 
        rule: '税负偏低', 
        conflict: true, 
        detail: '增值税税负率低于行业下限' 
      });
    }
    
    // 连续亏损
    if ((revenueCostAnswers['2.5'] === 0 || revenueCostAnswers['2.5'] === undefined) && 
        financialData.length >= 2) {
      const annualData = financialData.filter(d => d.type === 'annual' && d.profit !== undefined);
      if (annualData.length >= 2) {
        const sorted = annualData.sort((a, b) => b.period.localeCompare(a.period));
        if (sorted[0].profit < 0 && sorted[1].profit < 0) {
          crossValidation.push({ 
            rule: '连续亏损', 
            conflict: true, 
            detail: '近2年利润均为负' 
          });
        }
      }
    }
  }
  
  const crossValidationScore = crossValidation.length * 3;
  
  // 4. 计算趋势预警（基于比率指标，每条+3分）
  const trendWarnings: Array<{ type: string; label: string; score: number; detail: string }> = [];
  let trendScore = 0;
  
  if (financialData.length >= 2) {
    // 排序：最新一期在前，年度按时间倒序
    const sorted = [...financialData].sort((a, b) => {
      if (a.type === 'latest' && b.type !== 'latest') return -1;
      if (a.type !== 'latest' && b.type === 'latest') return 1;
      return b.period.localeCompare(a.period);
    });
    
    const current = calculateMetrics(sorted[0]);
    const previous = calculateMetrics(sorted[1]);
    
    // 预警1：增值税税负率骤降（最新一期 < 上年12月 × 50%）
    if (previous.vatRate > 0 && current.vatRate < previous.vatRate * 0.5 && trendWarnings.length < maxTrendWarnings) {
      trendWarnings.push({
        type: 'vat_drop',
        label: '增值税税负骤降',
        score: 3,
        detail: `最新一期税负率${current.vatRate.toFixed(2)}% < 上年12月${previous.vatRate.toFixed(2)}%的50%`
      });
      trendScore += 3;
    }
    
    // 预警2：所得税贡献率骤降
    if (previous.citRate > 0 && current.citRate < previous.citRate * 0.5 && trendWarnings.length < maxTrendWarnings) {
      trendWarnings.push({
        type: 'cit_drop',
        label: '所得税贡献骤降',
        score: 3,
        detail: `最新一期贡献率${current.citRate.toFixed(2)}% < 上年12月${previous.citRate.toFixed(2)}%的50%`
      });
      trendScore += 3;
    }
    
    // 预警3：毛利率连续下降（需要3+期数据）
    if (financialData.length >= 3 && trendWarnings.length < maxTrendWarnings) {
      const third = calculateMetrics(sorted[2]);
      if (third.grossMargin > previous.grossMargin && previous.grossMargin > current.grossMargin) {
        trendWarnings.push({
          type: 'gross_margin_drop',
          label: '毛利率持续恶化',
          score: 3,
          detail: '连续2期下降'
        });
        trendScore += 3;
      }
    }
    
    // 预警4：利润萎缩趋势（需要3+期数据）
    if (financialData.length >= 3 && trendWarnings.length < maxTrendWarnings) {
      const third = calculateMetrics(sorted[2]);
      if (third.netMargin > previous.netMargin && previous.netMargin > current.netMargin) {
        trendWarnings.push({
          type: 'net_margin_drop',
          label: '利润持续萎缩',
          score: 3,
          detail: '净利率连续下降'
        });
        trendScore += 3;
      }
    }
    
    // 预警5：负债率持续攀升（需要3+期数据）
    if (financialData.length >= 3 && trendWarnings.length < maxTrendWarnings) {
      const third = calculateMetrics(sorted[2]);
      if (third.debtRatio < previous.debtRatio && previous.debtRatio < current.debtRatio) {
        trendWarnings.push({
          type: 'debt_ratio_rise',
          label: '负债率持续攀升',
          score: 3,
          detail: '资产负债率连续上升'
        });
        trendScore += 3;
      }
    }
  }
  
  // 5. 总分 = 加权得分 + 交叉验证加分 + 趋势预警加分
  const totalScore = baseScore + crossValidationScore + trendScore;
  
  // 6. 风险等级判定
  let level: string;
  if (totalScore <= 20) level = '低风险';
  else if (totalScore <= 45) level = '中风险';
  else if (totalScore <= 70) level = '高风险';
  else level = '极高风险';
  
  // 7. 风险项明细
  const riskDetails: string[] = [];
  
  Object.entries(invoiceAnswers).forEach(([key, val]) => {
    if (val > 0 && QUESTION_MAPPING[key]) {
      riskDetails.push(`${QUESTION_MAPPING[key].name}(+${val}分)`);
    }
  });
  Object.entries(revenueCostAnswers).forEach(([key, val]) => {
    if (val > 0 && QUESTION_MAPPING[key]) {
      riskDetails.push(`${QUESTION_MAPPING[key].name}(+${val}分)`);
    }
  });
  Object.entries(publicPrivateAnswers).forEach(([key, val]) => {
    if (val > 0 && QUESTION_MAPPING[key]) {
      riskDetails.push(`${QUESTION_MAPPING[key].name}(+${val}分)`);
    }
  });
  Object.entries(taxPolicyAnswers).forEach(([key, val]) => {
    if (val > 0 && QUESTION_MAPPING[key]) {
      riskDetails.push(`${QUESTION_MAPPING[key].name}(+${val}分)`);
    }
  });
  
  // 8. 预估风险金额
  const estimatedRisk: EstimatedRiskItem[] = [];
  const revenue = latestData?.revenue || 0;
  
  if (latestMetrics && latestData && revenue > 0) {
    // 增值税税负偏低
    if (latestMetrics.vatRate < benchmarks.vatRate.min) {
      const diff = (benchmarks.vatRate.min - latestMetrics.vatRate) / 100 * revenue;
      estimatedRisk.push({
        name: '增值税税负偏低',
        detail: `实际${latestMetrics.vatRate.toFixed(2)}%，行业下限${benchmarks.vatRate.min}%`,
        taxMin: diff * 0.8,
        taxMax: diff * 1.2,
        penaltyMin: diff * 0.5,
        penaltyMax: diff * 5
      });
    }
    
    // 所得税贡献偏低
    if (latestMetrics.citRate < benchmarks.citRate.min) {
      const diff = (benchmarks.citRate.min - latestMetrics.citRate) / 100 * revenue;
      estimatedRisk.push({
        name: '所得税贡献偏低',
        detail: `实际${latestMetrics.citRate.toFixed(2)}%，行业下限${benchmarks.citRate.min}%`,
        taxMin: diff * 0.8,
        taxMax: diff * 1.2,
        penaltyMin: diff * 0.5,
        penaltyMax: diff * 5
      });
    }
    
    // 毛利率偏低
    if (latestMetrics.grossMargin < benchmarks.grossMargin.min) {
      const diff = (benchmarks.grossMargin.min - latestMetrics.grossMargin) / 100 * revenue;
      estimatedRisk.push({
        name: '毛利率偏低',
        detail: `实际${latestMetrics.grossMargin.toFixed(1)}%，行业下限${benchmarks.grossMargin.min}%`,
        taxMin: diff * 0.5,
        taxMax: diff * 1.5,
        penaltyMin: diff * 0.5,
        penaltyMax: diff * 3
      });
    }
  }
  
  // 基于问卷模块得分估算风险
  if (module1 > 0) {
    const base = revenue * 0.01;
    estimatedRisk.push({
      name: '发票与资金流风险',
      detail: `问卷得分${module1}分`,
      taxMin: base * module1 * 0.5,
      taxMax: base * module1 * 2,
      penaltyMin: base * module1 * 0.5,
      penaltyMax: base * module1 * 5
    });
  }
  
  if (module2 > 0) {
    const base = revenue * 0.01;
    estimatedRisk.push({
      name: '收入与成本合规风险',
      detail: `问卷得分${module2}分`,
      taxMin: base * module2 * 0.5,
      taxMax: base * module2 * 2,
      penaltyMin: base * module2 * 0.5,
      penaltyMax: base * module2 * 5
    });
  }
  
  if (module3 > 0) {
    const base = revenue * 0.01;
    estimatedRisk.push({
      name: '公私账户与股东风险',
      detail: `问卷得分${module3}分`,
      taxMin: base * module3 * 0.3,
      taxMax: base * module3 * 1.5,
      penaltyMin: base * module3 * 0.5,
      penaltyMax: base * module3 * 5
    });
  }
  
  if (module4 > 0) {
    const base = revenue * 0.01;
    estimatedRisk.push({
      name: '税务申报与政策风险',
      detail: `问卷得分${module4}分`,
      taxMin: base * module4 * 0.5,
      taxMax: base * module4 * 2,
      penaltyMin: base * module4 * 0.5,
      penaltyMax: base * module4 * 5
    });
  }
  
  return {
    baseScore,
    weightedScore,
    trendScore,
    totalScore,
    level,
    maxScore,
    riskDetails,
    trendWarnings,
    estimatedRisk,
    crossValidation,
    moduleScores
  };
}

// ============== 报告内容生成 ==============
function generateReportContent(
  riskId: string,
  period: string,
  score: number,
  maxScore: number,
  level: string,
  moduleScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number },
  trendData: TrendData[],
  trendWarnings: Array<{ type: string; label: string; score: number; detail: string }>,
  riskDetails: string[],
  estimatedRisk: EstimatedRiskItem[],
  crossValidation: Array<{ rule: string; conflict: boolean; detail: string }>,
  dataCompleteness: { count: number; msg: string }
): string {
  const totalTaxMin = estimatedRisk.reduce((s, r) => s + r.taxMin, 0);
  const totalTaxMax = estimatedRisk.reduce((s, r) => s + r.taxMax, 0);
  const penaltyMin = estimatedRisk.reduce((s, r) => s + r.penaltyMin, 0);
  const penaltyMax = estimatedRisk.reduce((s, r) => s + r.penaltyMax, 0);
  
  return JSON.stringify({
    overview: { riskId, period, score, maxScore, level, percentageScore: maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : '0' },
    dataCompleteness,
    radar: moduleScores,
    trend: trendData,
    trendWarnings,
    riskDetails: riskDetails.map(d => ({ name: d, score: 0 })),
    estimatedRiskAmount: {
      items: estimatedRisk,
      totalTaxMin: Math.round(totalTaxMin),
      totalTaxMax: Math.round(totalTaxMax),
      totalPenaltyMin: Math.round(penaltyMin),
      totalPenaltyMax: Math.round(penaltyMax),
      totalMin: Math.round(totalTaxMin),
      totalMax: Math.round(totalTaxMax + penaltyMax)
    },
    crossValidation: crossValidation.map(c => ({ ...c, detail: c.detail || '' })),
    suggestion: ''
  }, null, 2);
}

// ============== 飞书写入 ==============
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

// ============== 主处理函数 ==============
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('收到V4检测数据:', JSON.stringify(body, null, 2));
    
    // 生成ID和时间
    const riskId = generateRiskId();
    const detectionTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // 解析问卷答案
    const invoiceAnswers: Record<string, number> = {};
    const revenueCostAnswers: Record<string, number> = {};
    const publicPrivateAnswers: Record<string, number> = {};
    const taxPolicyAnswers: Record<string, number> = {};
    
    // 优先解析扁平格式
    if (body.invoiceAnswers && typeof body.invoiceAnswers === 'object') {
      Object.entries(body.invoiceAnswers).forEach(([key, val]) => {
        invoiceAnswers[key] = Number(val) || 0;
      });
    }
    if (body.revenueCostAnswers && typeof body.revenueCostAnswers === 'object') {
      Object.entries(body.revenueCostAnswers).forEach(([key, val]) => {
        revenueCostAnswers[key] = Number(val) || 0;
      });
    }
    if (body.publicPrivateAnswers && typeof body.publicPrivateAnswers === 'object') {
      Object.entries(body.publicPrivateAnswers).forEach(([key, val]) => {
        publicPrivateAnswers[key] = Number(val) || 0;
      });
    }
    if (body.taxPolicyAnswers && typeof body.taxPolicyAnswers === 'object') {
      Object.entries(body.taxPolicyAnswers).forEach(([key, val]) => {
        taxPolicyAnswers[key] = Number(val) || 0;
      });
    }
    
    // 补充解析questionnaire格式
    if (body.questionnaire && typeof body.questionnaire === 'object') {
      Object.entries(body.questionnaire).forEach(([key, val]: [string, unknown]) => {
        const q = val as { score?: number; answer?: string };
        let score = q.score ?? 0;
        if (!score && typeof q.answer === 'string') {
          if (q.answer.includes('从未') || q.answer.includes('否') || q.answer.includes('完全')) {
            score = 0;
          } else if (q.answer.includes('偶尔') || q.answer.includes('1次') || q.answer.includes('接近')) {
            score = 2;
          } else {
            score = 3;
          }
        }
        
        if (key.startsWith('1.')) {
          invoiceAnswers[key] = score;
        } else if (key.startsWith('2.')) {
          revenueCostAnswers[key] = score;
        } else if (key.startsWith('3.')) {
          publicPrivateAnswers[key] = score;
        } else if (key.startsWith('4.')) {
          taxPolicyAnswers[key] = score;
        }
      });
    }
    
    // 解析新版财务数据（4期分层）
    let financialData: FinancialPeriod[] = [];
    if (body.financialData && Array.isArray(body.financialData)) {
      financialData = body.financialData.map((d: Record<string, unknown>): FinancialPeriod => ({
        period: String(d.period || ''),
        type: (d.type as 'latest' | 'annual') || 'annual',
        revenue: getNumber(d.revenue),
        cost: getNumber(d.cost),
        profit: getNumber(d.profit),
        vatPaid: getNumber(d.vatPaid),
        incomeTaxPaid: getNumber(d.incomeTaxPaid),
        totalAssets: getNumber(d.totalAssets),
        totalLiabilities: getNumber(d.totalLiabilities || d.totalDebt),
        receivables: getNumber(d.receivables || d.accountsReceivable),
        inventory: getNumber(d.inventory),
        advanceReceipts: getNumber(d.advanceReceipts || d.advanceReceivable)
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
    
    // 所属期：使用请求体中的period值（最新一期月份）
    const period = body.period || detectionTime.split(' ')[0];
    
    // 计算风险
    const riskResult = calculateRisk(
      invoiceAnswers,
      revenueCostAnswers,
      publicPrivateAnswers,
      taxPolicyAnswers,
      financialData,
      industry
    );
    
    // 计算趋势数据
    const trendData = calculateTrendData(financialData);
    const latestData = financialData.find(d => d.type === 'latest') || financialData[0];
    const latestMetrics = latestData ? calculateMetrics(latestData) : null;
    
    // 数据完整度
    const dataCompleteness = getDataCompleteness(financialData);
    
    // 构建飞书字段
    const fields: Record<string, unknown> = {};
    
    // 基本信息
    fields['企业名称'] = enterpriseName;
    fields['统一信用代码'] = creditCode;
    fields['联系人'] = contactPerson;
    fields['联系电话'] = contactPhone;
    fields['客户邮箱'] = customerEmail;
    fields['所属行业'] = industry;
    fields['所属期'] = period; // 写最新一期月份
    fields['年营收规模'] = revenueScale;
    
    // 财务数据（最新一期）
    fields['营业收入(万元)'] = latestData?.revenue || 0;
    fields['营业成本(万元)'] = latestData?.cost || 0;
    fields['利润总额(万元)'] = latestData?.profit || 0;
    fields['实缴增值税(万元)'] = latestData?.vatPaid || 0;
    fields['实缴所得税(万元)'] = latestData?.incomeTaxPaid || 0;
    fields['总资产(万元)'] = latestData?.totalAssets || 0;
    fields['总负债(万元)'] = latestData?.totalLiabilities || 0;
    fields['应收账款(万元)'] = latestData?.receivables || 0;
    fields['预收账款(万元)'] = latestData?.advanceReceipts || 0;
    
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
    fields['综合风险等级'] = riskResult.level;
    fields['综合得分'] = riskResult.totalScore;
    
    // 问卷明细
    fields['问卷明细'] = JSON.stringify({
      invoice: invoiceAnswers,
      revenueCost: revenueCostAnswers,
      publicPrivate: publicPrivateAnswers,
      taxPolicy: taxPolicyAnswers,
      moduleScores: riskResult.moduleScores
    });
    
    // 新版年度财务数据 - 完整存储4期数据
    fields['年度财务数据'] = JSON.stringify(financialData);
    
    // 数据完整度
    fields['数据完整度'] = dataCompleteness.msg;
    
    // 财务指标JSON
    fields['财务指标'] = JSON.stringify(latestMetrics);
    
    // 交叉验证结果
    fields['交叉验证结果'] = riskResult.crossValidation.length > 0 
      ? riskResult.crossValidation.map(c => `${c.rule}: ${c.detail}`).join('；') 
      : '暂无明显矛盾';
    
    // 风险项明细
    fields['风险项明细'] = riskResult.riskDetails.join('；') || '暂无风险项';
    
    // 报告内容（包含百分制等价分）
    fields['报告内容'] = generateReportContent(
      riskId,
      period,
      riskResult.totalScore,
      riskResult.maxScore,
      riskResult.level,
      riskResult.moduleScores,
      trendData,
      riskResult.trendWarnings,
      riskResult.riskDetails,
      riskResult.estimatedRisk,
      riskResult.crossValidation,
      dataCompleteness
    );
    
    console.log('写入飞书字段:', JSON.stringify(fields, null, 2));
    
    // 写入飞书
    const feishuSuccess = await writeToFeishu(fields);
    
    return NextResponse.json({
      success: true,
      riskId,
      detectionTime,
      overallRiskLevel: riskResult.level,
      riskScore: riskResult.totalScore,
      maxScore: riskResult.maxScore,
      weightedScore: riskResult.weightedScore,
      moduleScores: riskResult.moduleScores,
      riskDetails: riskResult.riskDetails,
      trendWarnings: riskResult.trendWarnings,
      crossValidation: riskResult.crossValidation,
      estimatedRiskAmount: {
        items: riskResult.estimatedRisk,
        totalTaxMin: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.taxMin, 0)),
        totalTaxMax: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.taxMax, 0)),
        totalPenaltyMin: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.penaltyMin, 0)),
        totalPenaltyMax: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.penaltyMax, 0)),
        totalMin: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.taxMin, 0)),
        totalMax: Math.round(riskResult.estimatedRisk.reduce((s, r) => s + r.taxMax + r.penaltyMax, 0))
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
