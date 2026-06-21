import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 飞书 API 配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// 获取飞书 tenant_access_token
async function getFeishuToken(): Promise<string | null> {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      })
    });
    
    const data = await response.json();
    return data.tenant_access_token || null;
  } catch (error) {
    console.error('获取飞书token失败:', error);
    return null;
  }
}

// 安全获取数值
function getNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[,\s]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// 安全获取字符串
function getString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  return String(value);
}

// 生成检测ID
function generateRiskId(): string {
  const now = new Date();
  const datePart = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RC${datePart}${random}`;
}

// 计算风险等级
function calculateRiskLevel(score: number): string {
  if (score >= 80) return '低风险';
  if (score >= 60) return '中风险';
  if (score >= 40) return '高风险';
  return '极高风险';
}

// 生成交叉验证结果
function generateCrossValidation(
  module1Score: number,
  module2Score: number,
  module3Score: number,
  module4Score: number,
  revenue: number,
  profit: number,
  grossMargin: number,
  citRate: number
): string[] {
  const warnings: string[] = [];
  
  // 发票+成本双重风险
  if (module1Score > 10 && module2Score > 10) {
    warnings.push('发票风险+成本风险双重叠加');
  }
  
  // 毛利率高+所得税低
  if (grossMargin > 30 && citRate < 1) {
    warnings.push('毛利率偏高但所得税贡献率偏低');
  }
  
  // 利润为负但有税
  if (profit < 0 && citRate > 0.5) {
    warnings.push('利润为负但仍有所得税');
  }
  
  // 多模块高风险
  const highRiskModules = [module1Score, module2Score, module3Score, module4Score].filter(s => s > 15);
  if (highRiskModules.length >= 3) {
    warnings.push('多模块高风险叠加');
  }
  
  return warnings;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('收到V4检测数据:', JSON.stringify(body, null, 2));
    
    // 生成检测ID
    const riskId = generateRiskId();
    const detectionTime = new Date().toISOString().replace('T', ' ').slice(0, 19);
    
    // 提取问卷答案
    const invoiceAnswers = body.invoiceAnswers || {};
    const revenueCostAnswers = body.revenueCostAnswers || {};
    const publicPrivateAnswers = body.publicPrivateAnswers || {};
    const taxPolicyAnswers = body.taxPolicyAnswers || {};
    
    // 计算模块得分
    const module1Score = Object.values(invoiceAnswers).reduce((sum: number, v: unknown) => sum + (Number(v) || 0), 0);
    const module2Score = Object.values(revenueCostAnswers).reduce((sum: number, v: unknown) => sum + (Number(v) || 0), 0);
    const module3Score = Object.values(publicPrivateAnswers).reduce((sum: number, v: unknown) => sum + (Number(v) || 0), 0);
    const module4Score = Object.values(taxPolicyAnswers).reduce((sum: number, v: unknown) => sum + (Number(v) || 0), 0);
    
    // 总分（满分100）
    const totalScore = module1Score * 2 + module2Score * 1.67 + module3Score * 1.67 + module4Score * 1.33;
    const normalizedScore = Math.min(100, totalScore);
    
    // 风险等级
    const overallRiskLevel = calculateRiskLevel(normalizedScore);
    
    // 财务数据
    const revenue = getNumber(body.revenue);
    const grossMargin = getNumber(body.grossMargin);
    const vatRate = getNumber(body.vatRate);
    const citRate = getNumber(body.citRate);
    const debtRatio = getNumber(body.debtRatio);
    const netMargin = getNumber(body.netMargin);
    
    // 问卷明细（合并所有问卷答案）
    const questionnaireDetail = {
      invoice: invoiceAnswers,
      revenueCost: revenueCostAnswers,
      publicPrivate: publicPrivateAnswers,
      taxPolicy: taxPolicyAnswers,
      moduleScores: {
        invoice: module1Score,
        revenueCost: module2Score,
        publicPrivate: module3Score,
        taxPolicy: module4Score
      }
    };
    
    // 年度财务数据
    const yearData = {
      revenue: revenue,
      cost: getNumber(body.cost),
      profit: getNumber(body.profit),
      vatPaid: getNumber(body.vatPaid),
      incomeTaxPaid: getNumber(body.incomeTaxPaid),
      totalAssets: getNumber(body.totalAssets),
      totalLiabilities: getNumber(body.totalLiabilities),
      receivables: getNumber(body.receivables),
      advanceReceipts: getNumber(body.advanceReceipts)
    };
    
    // 财务指标
    const financialMetrics = {
      grossMargin: grossMargin,
      netMargin: netMargin,
      vatRate: vatRate,
      citRate: citRate,
      debtRatio: debtRatio
    };
    
    // 生成交叉验证结果
    const crossValidation = generateCrossValidation(
      module1Score,
      module2Score,
      module3Score,
      module4Score,
      revenue,
      getNumber(body.profit),
      grossMargin,
      citRate
    );
    
    // 生成风险项明细
    const riskDetails: string[] = [];
    if (module1Score >= 9) riskDetails.push('发票与资金流风险高');
    if (module2Score >= 9) riskDetails.push('收入与成本合规风险高');
    if (module3Score >= 9) riskDetails.push('公私账户与股东风险高');
    if (module4Score >= 9) riskDetails.push('税务申报与政策风险高');
    if (grossMargin < 5) riskDetails.push('毛利率异常偏低');
    if (vatRate < 0.5) riskDetails.push('增值税税负率异常偏低');
    
    // 构建飞书字段数据（只使用飞书实际存在的字段）
    const fields: Record<string, unknown> = {};
    
    // 基本信息
    fields['企业名称'] = getString(body.enterpriseName) || '';
    fields['联系人'] = getString(body.contactPerson) || '';
    fields['联系电话'] = getString(body.contactPhone) || '';
    fields['客户邮箱'] = getString(body.customerEmail) || '';
    fields['所属行业'] = getString(body.industry) || '';
    
    // V4新增字段
    fields['所属期'] = detectionTime.split(' ')[0];
    fields['年营收规模'] = getString(body.revenueScale) || '';
    fields['问卷明细'] = JSON.stringify(questionnaireDetail);
    fields['年度财务数据'] = JSON.stringify(yearData);
    fields['财务指标'] = JSON.stringify(financialMetrics);
    fields['交叉验证结果'] = crossValidation.length > 0 ? crossValidation.join('；') : '暂无明显趋势异常';
    fields['综合得分'] = Math.round(normalizedScore);
    
    // 财务数据
    fields['营业收入(万元)'] = revenue;
    fields['营业成本(万元)'] = getNumber(body.cost);
    fields['利润总额(万元)'] = getNumber(body.profit);
    fields['实缴增值税(万元)'] = getNumber(body.vatPaid);
    fields['实缴所得税(万元)'] = getNumber(body.incomeTaxPaid);
    fields['总资产(万元)'] = getNumber(body.totalAssets);
    fields['总负债(万元)'] = getNumber(body.totalLiabilities);
    fields['应收账款(万元)'] = getNumber(body.receivables);
    fields['预收账款(万元)'] = getNumber(body.advanceReceipts);
    
    // 风险指标
    fields['毛利率'] = grossMargin;
    fields['净利率'] = netMargin;
    fields['增值税税负率'] = vatRate;
    fields['所得税贡献率'] = citRate;
    fields['资产负债率'] = debtRatio;
    
    // 报告信息
    fields['检测ID'] = riskId;
    fields['检测时间'] = detectionTime;
    fields['报告状态'] = '待审核';
    fields['综合风险等级'] = overallRiskLevel;
    
    // 风险结果
    fields['风险项明细'] = riskDetails.length > 0 ? riskDetails.join('；') : '暂无高风险项';
    
    console.log('写入飞书字段:', JSON.stringify(fields, null, 2));
    
    // 获取飞书token
    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ success: false, error: '飞书认证失败' }, { status: 500 });
    }
    
    // 写入飞书多维表格
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fields })
      }
    );
    
    const result = await response.json();
    
    if (!response.ok || result.code !== 0) {
      console.error('飞书写入失败:', result);
      return NextResponse.json({
        success: false,
        error: result.msg || '飞书写入失败'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      riskId,
      detectionTime,
      overallRiskLevel,
      riskScore: Math.round(normalizedScore),
      moduleScores: {
        invoice: module1Score,
        revenueCost: module2Score,
        publicPrivate: module3Score,
        taxPolicy: module4Score
      },
      riskDetails,
      crossValidation,
      reportStatus: '待审核'
    });
    
  } catch (error) {
    console.error('处理V4检测失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}
