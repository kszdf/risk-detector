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
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RC${datePart}${random}`;
}

// ============== 数据计算 ==============
interface FinancialDataInput {
  year: number;
  revenue: number;
  cost: number;
  profit: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
  receivables?: number;
  advanceReceipts?: number;
}

interface Metrics {
  grossMargin: number;
  netMargin: number;
  vatRate: number;
  citRate: number;
  debtRatio: number;
}

function calculateMetrics(data: FinancialDataInput): Metrics {
  const { revenue, cost, profit, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities } = data;
  return {
    grossMargin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    netMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
    vatRate: revenue > 0 ? (vatPaid / revenue) * 100 : 0,
    citRate: revenue > 0 ? (incomeTaxPaid / revenue) * 100 : 0,
    debtRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
  };
}

interface TrendData {
  year: number;
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

function calculateTrendData(financialData: FinancialDataInput[]): TrendData[] {
  if (!financialData || financialData.length === 0) return [];
  
  const sorted = [...financialData].sort((a, b) => b.year - a.year);
  
  return sorted.map((data, index) => {
    const metrics = calculateMetrics(data);
    const prevMetrics = index < sorted.length - 1 ? calculateMetrics(sorted[index + 1]) : null;
    
    const trends: TrendData['trends'] = {
      grossMargin: '→',
      netMargin: '→',
      vatRate: '→',
      citRate: '→',
      debtRatio: '→'
    };
    
    if (prevMetrics) {
      const threshold = 5;
      const grossMarginChange = metrics.grossMargin - prevMetrics.grossMargin;
      trends.grossMargin = Math.abs(grossMarginChange) > threshold ? (grossMarginChange > 0 ? '↗' : '↘') : '→';
      
      const netMarginChange = metrics.netMargin - prevMetrics.netMargin;
      trends.netMargin = Math.abs(netMarginChange) > threshold ? (netMarginChange > 0 ? '↗' : '↘') : '→';
      
      const vatRateChange = metrics.vatRate - prevMetrics.vatRate;
      trends.vatRate = Math.abs(vatRateChange) > threshold ? (vatRateChange > 0 ? '↗' : '↘') : '→';
      
      const citRateChange = metrics.citRate - prevMetrics.citRate;
      trends.citRate = Math.abs(citRateChange) > threshold ? (citRateChange > 0 ? '↗' : '↘') : '→';
      
      const debtRatioChange = metrics.debtRatio - prevMetrics.debtRatio;
      trends.debtRatio = Math.abs(debtRatioChange) > threshold ? (debtRatioChange > 0 ? '↗' : '↘') : '→';
    }
    
    return {
      year: data.year,
      revenue: data.revenue,
      grossMargin: metrics.grossMargin,
      netMargin: metrics.netMargin,
      vatRate: metrics.vatRate,
      citRate: metrics.citRate,
      debtRatio: metrics.debtRatio,
      trends
    };
  });
}

// ============== 风险计算 ==============
interface RiskResult {
  baseScore: number;          // 基础得分（问卷+交叉验证）
  trendScore: number;         // 趋势预警加分
  totalScore: number;         // 总分
  level: string;              // 风险等级
  maxScore: number;           // 满分
  riskDetails: string[];      // 风险项明细
  trendWarnings: string[];    // 趋势预警项
  estimatedRisk: EstimatedRiskItem[];  // 预估风险金额
  crossValidation: string[];  // 交叉验证结果
}

interface EstimatedRiskItem {
  name: string;
  estimatedTaxMin: number;
  estimatedTaxMax: number;
  penaltyMin: number;
  penaltyMax: number;
}

function calculateRiskLevel(baseScore: number, trendScore: number): { level: string; maxScore: number } {
  const totalScore = baseScore + trendScore;
  const has3Year = false; // 后续根据数据判断
  
  if (totalScore <= 20) return { level: '低风险', maxScore: 115 };
  if (totalScore <= 45) return { level: '中风险', maxScore: 115 };
  if (totalScore <= 70) return { level: '高风险', maxScore: 115 };
  return { level: '极高风险', maxScore: 115 };
}

function calculateRisk(
  invoiceAnswers: Record<string, number>,
  revenueCostAnswers: Record<string, number>,
  publicPrivateAnswers: Record<string, number>,
  taxPolicyAnswers: Record<string, number>,
  financialData: FinancialDataInput[],
  industry: string,
  maxPossibleScore: number
): RiskResult {
  // 1. 计算模块得分
  const module1 = Object.values(invoiceAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module2 = Object.values(revenueCostAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module3 = Object.values(publicPrivateAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  const module4 = Object.values(taxPolicyAnswers).reduce((s, v) => s + (Number(v) || 0), 0);
  
  // 2. 计算交叉验证（每项+3分）
  const crossValidation: string[] = [];
  const latestData = financialData.length > 0 ? financialData[0] : null;
  const latestMetrics = latestData ? calculateMetrics(latestData) : null;
  const benchmarks = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他'];
  
  if (latestMetrics) {
    // 延迟确认收入
    if (latestData!.revenue > 0 && latestData!.advanceReceipts! / latestData!.revenue > 0.2) {
      if (invoiceAnswers['q1'] === 0 || revenueCostAnswers['r1'] === 0) {
        crossValidation.push('延迟确认收入');
      }
    }
    
    // 隐匿收入嫌疑
    if (invoiceAnswers['q1'] === 0 && latestMetrics.grossMargin < benchmarks.grossMargin.min * 0.5) {
      crossValidation.push('隐匿收入嫌疑');
    }
    
    // 虚增成本嫌疑
    if (revenueCostAnswers['r2'] === 0 && latestMetrics.netMargin < benchmarks.netMargin.min * 0.5) {
      crossValidation.push('虚增成本嫌疑');
    }
    
    // 税负偏低
    if (taxPolicyAnswers['t4'] === 0 && latestMetrics.vatRate < benchmarks.vatRate.min) {
      crossValidation.push('税负偏低');
    }
    
    // 连续亏损
    if (revenueCostAnswers['r5'] === 0) {
      const hasLoss2Years = financialData.length >= 2 && financialData.every(d => d.profit < 0);
      if (hasLoss2Years) {
        crossValidation.push('连续亏损');
      }
    }
  }
  
  const crossValidationScore = crossValidation.length * 3;
  
  // 3. 基础得分（问卷得分 + 交叉验证加分）
  const baseScore = module1 + module2 + module3 + module4 + crossValidationScore;
  
  // 4. 计算趋势预警
  const trendWarnings: string[] = [];
  let trendScore = 0;
  
  if (financialData.length >= 2) {
    const sorted = [...financialData].sort((a, b) => b.year - a.year);
    const current = calculateMetrics(sorted[0]);
    const previous = calculateMetrics(sorted[1]);
    
    // 税负骤降（同比降幅>30%）
    if (previous.vatRate > 0 && (previous.vatRate - current.vatRate) / previous.vatRate > 0.3) {
      trendWarnings.push('增值税税负骤降');
      trendScore += 3;
    }
    
    // 所得税贡献骤降
    if (previous.citRate > 0 && (previous.citRate - current.citRate) / previous.citRate > 0.3) {
      trendWarnings.push('所得税贡献骤降');
      trendScore += 3;
    }
    
    // 毛利率连降（连续2年下降）
    if (financialData.length >= 3) {
      const third = calculateMetrics(sorted[2]);
      if (third.grossMargin > previous.grossMargin && previous.grossMargin > current.grossMargin) {
        trendWarnings.push('毛利率持续恶化');
        trendScore += 3;
      }
    }
    
    // 利润持续萎缩
    if (sorted.every(d => d.profit < 0) && sorted.length >= 2) {
      // 如果利润已经连续为负，不重复计分
      if (revenueCostAnswers['r5'] === 0) {
        trendWarnings.push('利润持续萎缩');
        trendScore += 2;
      }
    }
    
    // 负债率攀升
    if (current.debtRatio > 70 && previous.debtRatio > 70 && current.debtRatio > previous.debtRatio) {
      trendWarnings.push('债务风险加大');
      trendScore += 2;
    }
  }
  
  // 5. 总分
  const totalScore = baseScore + trendScore;
  
  // 6. 风险等级
  const { level, maxScore } = calculateRiskLevel(baseScore, trendScore);
  
  // 7. 风险项明细
  const riskDetails: string[] = [];
  if (module1 >= 9) riskDetails.push('发票与资金流风险高');
  if (module2 >= 9) riskDetails.push('收入与成本合规风险高');
  if (module3 >= 9) riskDetails.push('公私账户与股东风险高');
  if (module4 >= 9) riskDetails.push('税务申报与政策风险高');
  if (latestMetrics) {
    if (latestMetrics.grossMargin < benchmarks.grossMargin.min * 0.5) riskDetails.push('毛利率异常偏低');
    if (latestMetrics.vatRate < benchmarks.vatRate.min * 0.5) riskDetails.push('增值税税负率异常偏低');
  }
  
  // 8. 预估风险金额
  const estimatedRisk: EstimatedRiskItem[] = [];
  const revenue = latestData?.revenue || 0;
  
  if (module1 > 0) {
    // 发票风险预估
    const taxBase = revenue * 0.02;
    estimatedRisk.push({
      name: '发票与资金流风险',
      estimatedTaxMin: taxBase * 0.5,
      estimatedTaxMax: taxBase * 2,
      penaltyMin: taxBase * 0.5,
      penaltyMax: taxBase * 5
    });
  }
  
  if (module2 > 0) {
    // 成本风险预估
    const taxBase = revenue * 0.03;
    estimatedRisk.push({
      name: '收入与成本合规风险',
      estimatedTaxMin: taxBase * 0.5,
      estimatedTaxMax: taxBase * 2,
      penaltyMin: taxBase * 0.5,
      penaltyMax: taxBase * 5
    });
  }
  
  if (module3 > 0) {
    // 公私账户风险预估
    const taxBase = revenue * 0.02;
    estimatedRisk.push({
      name: '公私账户与股东风险',
      estimatedTaxMin: taxBase * 0.3,
      estimatedTaxMax: taxBase * 1.5,
      penaltyMin: taxBase * 0.5,
      penaltyMax: taxBase * 5
    });
  }
  
  if (latestMetrics) {
    // 税负偏低风险
    if (latestMetrics.vatRate < benchmarks.vatRate.min) {
      const diff = (benchmarks.vatRate.min - latestMetrics.vatRate) * revenue;
      estimatedRisk.push({
        name: '增值税税负偏低',
        estimatedTaxMin: diff * 0.8,
        estimatedTaxMax: diff * 1.2,
        penaltyMin: diff * 0.5,
        penaltyMax: diff * 5
      });
    }
    
    if (latestMetrics.citRate < benchmarks.citRate.min) {
      const diff = (benchmarks.citRate.min - latestMetrics.citRate) * revenue;
      estimatedRisk.push({
        name: '所得税贡献偏低',
        estimatedTaxMin: diff * 0.8,
        estimatedTaxMax: diff * 1.2,
        penaltyMin: diff * 0.5,
        penaltyMax: diff * 5
      });
    }
  }
  
  return {
    baseScore,
    trendScore,
    totalScore,
    level,
    maxScore,
    riskDetails,
    trendWarnings,
    estimatedRisk,
    crossValidation
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
  trendWarnings: string[],
  riskDetails: string[],
  estimatedRisk: EstimatedRiskItem[],
  crossValidation: string[]
): string {
  const top5Risks = riskDetails.slice(0, 5).map((name, idx) => {
    const keys = Object.keys(moduleScores) as Array<keyof typeof moduleScores>;
    return {
      name,
      score: moduleScores[keys[idx]] || 0
    };
  });
  
  const totalMin = estimatedRisk.reduce((s, r) => s + r.estimatedTaxMin + s * 0.0005 * 365, 0);
  const totalMax = estimatedRisk.reduce((s, r) => s + r.estimatedTaxMax + s * 0.0005 * 365 + r.penaltyMax, 0);
  
  return JSON.stringify({
    overview: { riskId, period, score, maxScore, level },
    radar: moduleScores,
    trend: trendData,
    trendWarnings,
    top5Risks,
    estimatedRiskAmount: {
      items: estimatedRisk,
      totalMin: Math.round(totalMin),
      totalMax: Math.round(totalMax)
    },
    crossValidation: crossValidation.map(rule => ({ rule, conflict: true, detail: '' })),
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
    
    if (body.questionnaire) {
      Object.entries(body.questionnaire).forEach(([key, val]: [string, unknown]) => {
        const q = val as { score?: number };
        if (key.startsWith('1.')) invoiceAnswers[key] = q.score || 0;
        else if (key.startsWith('2.')) revenueCostAnswers[key] = q.score || 0;
        else if (key.startsWith('3.')) publicPrivateAnswers[key] = q.score || 0;
        else if (key.startsWith('4.')) taxPolicyAnswers[key] = q.score || 0;
      });
    }
    
    // 解析财务数据
    const financialData: FinancialDataInput[] = (body.financialData || []).map((d: {
      year?: number; revenue?: number; cost?: number; profit?: number;
      vatPaid?: number; incomeTaxPaid?: number; totalAssets?: number;
      totalDebt?: number; totalLiabilities?: number; accountsReceivable?: number;
      advanceReceipts?: number;
    }) => ({
      year: d.year || new Date().getFullYear(),
      revenue: getNumber(d.revenue),
      cost: getNumber(d.cost),
      profit: getNumber(d.profit),
      vatPaid: getNumber(d.vatPaid),
      incomeTaxPaid: getNumber(d.incomeTaxPaid),
      totalAssets: getNumber(d.totalAssets),
      totalLiabilities: getNumber(d.totalDebt || d.totalLiabilities),
      receivables: getNumber(d.accountsReceivable),
      advanceReceipts: getNumber(d.advanceReceipts)
    }));
    
    // 获取行业和规模
    const industry = body.basicInfo?.industry || '';
    const revenueScale = body.basicInfo?.revenueScale || '';
    
    // 计算maxScore（根据数据年份判断）
    const maxScore = financialData.length >= 3 ? 128 : 115;
    
    // 计算风险
    const riskResult = calculateRisk(
      invoiceAnswers,
      revenueCostAnswers,
      publicPrivateAnswers,
      taxPolicyAnswers,
      financialData,
      industry,
      maxScore
    );
    
    // 计算趋势数据
    const trendData = calculateTrendData(financialData);
    const latestData = financialData[0];
    const latestMetrics = latestData ? calculateMetrics(latestData) : null;
    
    // 构建飞书字段
    const fields: Record<string, unknown> = {};
    
    // 基本信息
    fields['企业名称'] = getString(body.basicInfo?.companyName) || '';
    fields['联系人'] = getString(body.basicInfo?.contactName) || '';
    fields['联系电话'] = getString(body.basicInfo?.contactPhone) || '';
    fields['客户邮箱'] = getString(body.basicInfo?.email) || '';
    fields['所属行业'] = industry;
    fields['所属期'] = detectionTime.split(' ')[0];
    fields['年营收规模'] = revenueScale;
    
    // 财务数据（最新年度）
    if (latestData) {
      fields['营业收入(万元)'] = latestData.revenue;
      fields['营业成本(万元)'] = latestData.cost;
      fields['利润总额(万元)'] = latestData.profit;
      fields['实缴增值税(万元)'] = latestData.vatPaid;
      fields['实缴所得税(万元)'] = latestData.incomeTaxPaid;
      fields['总资产(万元)'] = latestData.totalAssets;
      fields['总负债(万元)'] = latestData.totalLiabilities;
      fields['应收账款(万元)'] = latestData.receivables || 0;
      fields['预收账款(万元)'] = latestData.advanceReceipts || 0;
    }
    
    // 风险指标
    if (latestMetrics) {
      fields['毛利率'] = Math.round(latestMetrics.grossMargin * 100) / 100;
      fields['净利率'] = Math.round(latestMetrics.netMargin * 100) / 100;
      fields['增值税税负率'] = Math.round(latestMetrics.vatRate * 100) / 100;
      fields['所得税贡献率'] = Math.round(latestMetrics.citRate * 100) / 100;
      fields['资产负债率'] = Math.round(latestMetrics.debtRatio * 100) / 100;
    }
    
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
      taxPolicy: taxPolicyAnswers
    });
    
    // 年度财务数据
    fields['年度财务数据'] = JSON.stringify(financialData);
    
    // 财务指标
    fields['财务指标'] = JSON.stringify(latestMetrics);
    
    // 交叉验证结果
    fields['交叉验证结果'] = riskResult.crossValidation.length > 0 
      ? riskResult.crossValidation.join('；') 
      : '暂无明显趋势异常';
    
    // 风险项明细
    fields['风险项明细'] = riskResult.riskDetails.length > 0
      ? riskResult.riskDetails.join('；')
      : '暂无高风险项';
    
    // 报告内容
    fields['报告内容'] = generateReportContent(
      riskId,
      `所属期: ${detectionTime}`,
      riskResult.totalScore,
      riskResult.maxScore,
      riskResult.level,
      {
        invoice: Object.values(invoiceAnswers).reduce((s, v) => s + v, 0),
        revenueCost: Object.values(revenueCostAnswers).reduce((s, v) => s + v, 0),
        publicPrivate: Object.values(publicPrivateAnswers).reduce((s, v) => s + v, 0),
        taxPolicy: Object.values(taxPolicyAnswers).reduce((s, v) => s + v, 0)
      },
      trendData,
      riskResult.trendWarnings,
      riskResult.riskDetails,
      riskResult.estimatedRisk,
      riskResult.crossValidation
    );
    
    console.log('写入飞书字段:', JSON.stringify(fields, null, 2));
    
    // 写入飞书
    const success = await writeToFeishu(fields);
    
    return NextResponse.json({
      success,
      riskId,
      detectionTime,
      level: riskResult.level,
      totalScore: riskResult.totalScore,
      baseScore: riskResult.baseScore,
      trendScore: riskResult.trendScore,
      maxScore: riskResult.maxScore,
      moduleScores: {
        invoice: Object.values(invoiceAnswers).reduce((s, v) => s + v, 0),
        revenueCost: Object.values(revenueCostAnswers).reduce((s, v) => s + v, 0),
        publicPrivate: Object.values(publicPrivateAnswers).reduce((s, v) => s + v, 0),
        taxPolicy: Object.values(taxPolicyAnswers).reduce((s, v) => s + v, 0)
      },
      trendData,
      riskDetails: riskResult.riskDetails,
      trendWarnings: riskResult.trendWarnings,
      estimatedRisk: riskResult.estimatedRisk,
      crossValidation: riskResult.crossValidation
    });
    
  } catch (error) {
    console.error('处理V4检测失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}
