import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { V5QuestionInfo, V5_QUESTION_MAPPING, REPORT_DISCLAIMER, buildRiskCta } from '@/lib/v5-questions';

export const runtime = 'nodejs';

// 企查查API配置
function cleanEnvKey(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  // 企查查Key为32位十六进制字符串，格式不对则用fallback
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return trimmed;
  return fallback;
}

const QCC_APP_KEY = cleanEnvKey(process.env.QCC_APP_KEY, '');
const QCC_SECRET_KEY = cleanEnvKey(process.env.QCC_SECRET_KEY, '');
const QCC_BASE_URL = 'https://api.qichacha.com';

// 企查查工商信息查询 (ApiCode 410)
// 生成企查查API签名Token
function generateQccToken() {
  const timespan = Math.floor(Date.now() / 1000).toString();
  const token = crypto.createHash('md5').update(QCC_APP_KEY + timespan + QCC_SECRET_KEY).digest('hex').toUpperCase();
  return { token, timespan };
}

// 带重试的企查查API调用（Vercel海外IP访问不稳定，快速失败+重试）
async function fetchQccApi(url: string): Promise<any> {
  let lastError: any = null;
  for (let i = 0; i <= 1; i++) {
    try {
      const { token, timespan } = generateQccToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Token': token, 'Timespan': timespan },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (e) {
      lastError = e;
      if (i < 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  throw lastError;
}

// 企查查模糊搜索（886接口，0.1元/次）
async function fuzzySearchCompany(keyword: string): Promise<{ name: string; creditCode: string } | null> {
  if (!keyword || keyword.length < 2) return null;
  
  const url = new URL(`${QCC_BASE_URL}/FuzzySearch/GetList`);
  url.searchParams.append('key', QCC_APP_KEY);
  url.searchParams.append('searchKey', keyword);

  try {
    const data = await fetchQccApi(url.toString());
    
    if (data.Status === '200' && data.Result && data.Result.length > 0) {
      const first = data.Result[0];
      // 返回第一个最匹配的企业名称和统一信用代码
      return {
        name: first.Name || first.CompanyName || '',
        creditCode: first.CreditCode || ''
      };
    }
    return null;
  } catch (error) {
    console.error('企查查模糊搜索失败:', error);
    return null;
  }
}

async function getQccCompanyInfo(keyword: string): Promise<Record<string, any> | null> {
  if (!keyword || keyword.length < 2) return null;
  
  // 第一步：用关键词模糊搜索，获取匹配企业的信用代码
  let creditCode = '';
  let exactName = keyword;
  
  // 如果关键词本身就是18位信用代码，直接用
  if (/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(keyword)) {
    creditCode = keyword;
  } else {
    // 模糊搜索找最匹配的企业，拿信用代码
    const searchResult = await fuzzySearchCompany(keyword);
    if (searchResult) {
      creditCode = searchResult.creditCode || '';
      exactName = searchResult.name || keyword;
    }
  }
  
  // 第二步：用18位统一信用代码精确查询详情
  if (creditCode) {
    const result = await fetchQccDetail(creditCode);
    if (result) return result;
  }
  
  // 兜底：直接用关键词试一次
  return await fetchQccDetail(keyword);
}

// 企查查详情查询（410接口，0.2元/次）
async function fetchQccDetail(companyName: string): Promise<Record<string, any> | null> {
  if (!companyName) return null;
  
  const url = new URL(`${QCC_BASE_URL}/ECIV4/GetBasicDetailsByName`);
  url.searchParams.append('key', QCC_APP_KEY);
  url.searchParams.append('keyword', companyName);

  try {
    const data = await fetchQccApi(url.toString());
    
    if (data.Status === '200' && data.Result) {
      const r = data.Result;
      return {
        name: r.Name,
        creditCode: r.CreditCode,
        operName: r.OperName,
        startDate: r.StartDate,
        status: r.Status,
        registCapi: r.RegistCapi,
        econKind: r.EconKind,
        address: r.Address,
        scope: r.Scope,
        termStart: r.TermStart,
        termEnd: r.TermEnd,
        belongOrg: r.BelongOrg,
        checkDate: r.CheckDate,
        isOnStock: r.IsOnStock,
        entType: r.EntType,
        recCap: r.RecCap,
        province: r.Province,
        areaCode: r.AreaCode,
        area: r.Area,
        imageUrl: r.ImageUrl,
        source: '企查查'
      };
    }
    return null;
  } catch (error) {
    console.error('企查查详情查询失败:', error);
    return null;
  }
}

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || '';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || '';

// 行业基准数据（7个主行业 + 老数据兼容别名，与小程序端一致）
const INDUSTRY_BENCHMARKS: Record<string, {
  grossMargin: { min: number; max: number };
  netMargin: { min: number; max: number };
  vatRate: { min: number; max: number };
  citRate: { min: number; max: number };
}> = {
  '制造业': { grossMargin: { min: 25, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.8, max: 2.0 } },
  '批发零售业': { grossMargin: { min: 15, max: 30 }, netMargin: { min: 2, max: 8 }, vatRate: { min: 1.0, max: 3.0 }, citRate: { min: 0.3, max: 1.5 } },
  '建筑工程业': { grossMargin: { min: 8, max: 18 }, netMargin: { min: 2, max: 6 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '商务服务业': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 15, max: 30 }, vatRate: { min: 2.5, max: 5.0 }, citRate: { min: 1.0, max: 3.0 } },
  '生活服务业': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.5 }, citRate: { min: 0.5, max: 2.0 } },
  '科技互联网业': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '其他行业': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } },
  // 老数据兼容别名
  '建筑业': { grossMargin: { min: 8, max: 18 }, netMargin: { min: 2, max: 6 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '科技互联网': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '其他': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } }
};

// v5版本问卷题目完整映射（带税收政策依据）- 20题版本


// 旧版问卷题目完整映射（兼容旧格式）
interface QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  consequence: string;
}

const QUESTION_MAPPING: Record<string, QuestionInfo> = {
  'inv1': { module: 'invoice', moduleName: '发票与资金流', name: '四流不一致', consequence: '合同流、发票流、资金流、货物流不一致属异常线索，需核实业务实质；如查实存在虚假交易或不列、少列收入，按《税收征收管理法》第六十三条追缴税款、按日加收万分之五滞纳金，并处不缴或者少缴税款百分之五十以上五倍以下罚款' },
  'inv2': { module: 'invoice', moduleName: '发票与资金流', name: '私户收款未入账', consequence: '如经查实通过个人账户收取经营款项未入账，按《税收征收管理法》第六十三条认定为偷税，追缴增值税及企业所得税、按日加收万分之五滞纳金，并处不缴或者少缴税款百分之五十以上五倍以下罚款' },
  'inv3': { module: 'invoice', moduleName: '发票与资金流', name: '变名发票', consequence: '如被认定为虚开发票，由税务机关没收违法所得；虚开金额在1万元以下的，可以并处5万元以下罚款；超过1万元的，并处5万元以上50万元以下罚款（《发票管理办法》第三十五条）；构成犯罪的依法追究刑事责任' },
  'inv4': { module: 'invoice', moduleName: '发票与资金流', name: '上游供应商异常', consequence: '取得不符合规定的发票，对应进项税额不得抵扣（《增值税法》第十六条），需作进项转出并补缴增值税及滞纳金；相关支出不得税前扣除（国家税务总局公告2018年第28号）' },
  'inv5': { module: 'invoice', moduleName: '发票与资金流', name: '红冲发票异常', consequence: '频繁、大额或异常红冲属发票风险监控指标，需说明合理商业理由；如查实为虚开发票，按《发票管理办法》第三十五条处罚；构成犯罪的依法追究刑事责任' },
  'rev1': { module: 'revenueCost', moduleName: '收入与成本', name: '延迟确认收入', consequence: '纳税义务发生时间为收讫销售款项或取得索取销售款项凭据当日，先开具发票的为开具发票当日（《增值税法》第二十八条）；延迟确认的需补缴增值税及企业所得税并按日加收万分之五滞纳金' },
  'rev2': { module: 'revenueCost', moduleName: '收入与成本', name: '替票冲账', consequence: '不符合规定的发票不得作为财务报销凭证（《发票管理办法》第二十条），相关支出不得税前扣除，需调增应纳税所得额补缴企业所得税及滞纳金' },
  'rev3': { module: 'revenueCost', moduleName: '收入与成本', name: '个人消费入公司账', consequence: '与取得收入无关的支出不得税前扣除（《企业所得税法》第十条），需调增应纳税所得额补缴企业所得税；属个人所得性质的还应依法代扣代缴个人所得税' },
  'rev4': { module: 'revenueCost', moduleName: '收入与成本', name: '存货账实不符', consequence: '账实不符且无正当理由的，税务机关有权核定应纳税额（《税收征收管理法》第三十五条）；如查实为少计收入或虚增成本，按第六十三条处理' },
  'pp1': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '股东借款纳税年度终了未归还', consequence: '个人投资者从其投资企业借款，在纳税年度终了后既不归还又未用于企业生产经营的，视为利润分配，按"利息、股息、红利所得"项目依20%税率计征个人所得税（财税〔2003〕158号第二条）' },
  'pp2': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '利润分配不规范', consequence: '如经查实未依法代扣代缴个人所得税，按《税收征收管理法》第六十九条处应扣未扣、应收未收税款百分之五十以上三倍以下罚款，并补缴税款及滞纳金' },
  'pp3': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '关联方资金互转', consequence: '关联方资金往来不符合独立交易原则而减少应纳税收入或所得额的，税务机关可作特别纳税调整，补征税款并按国务院规定加收利息（《企业所得税法》第四十一条至第四十八条）' },
  'pp4': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '大额现金交易', consequence: '大额现金交易属资金流异常监控指标，可能触发税务稽查重点关注，需准备交易真实性证明材料' },
  'pp5': { module: 'publicPrivate', moduleName: '公私账户与股东', name: '报销替代工资', consequence: '以报销形式发放工资薪金，企业应依法代扣代缴个人所得税；应扣未扣的，处应扣未扣、应收未收税款百分之五十以上三倍以下罚款（《税收征收管理法》第六十九条）；纳税人不进行纳税申报造成不缴或者少缴的，处百分之五十以上五倍以下罚款（第六十四条第二款）；同时涉及社保缴费基数合规问题' },
  'tax1': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '逾期申报/缴税', consequence: '逾期申报由税务机关责令限期改正，可以处二千元以下罚款；情节严重的，可以处二千元以上一万元以下罚款（《税收征收管理法》第六十二条）。逾期缴纳税款从滞纳之日起按日加收万分之五滞纳金（第三十二条）' },
  'tax2': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '小微优惠滥用', consequence: '如经查实不符合小型微利企业条件而享受优惠的，追缴已减免税款并加收滞纳金；小型微利企业条件为年应纳税所得额不超过300万元、从业人数不超过300人、资产总额不超过5000万元（财政部 税务总局公告2023年第12号）' },
  'tax3': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税收洼地空壳公司', consequence: '持有股权、股票、合伙企业财产份额等权益性投资的个人独资企业、合伙企业一律适用查账征收（财政部 税务总局公告2021年第41号）；无实质性经营、计税依据明显偏低又无正当理由的，税务机关有权核定应纳税额并补征税款及滞纳金' },
  'tax4': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '税负率低于行业参考区间', consequence: '税负率低于行业参考区间属纳税评估重点关注指标，需准备合理商业理由说明；如经核实存在少计收入、虚增进项或计税错误，方按《增值税法》第二十条、《税收征收管理法》第三十五条核定或按第六十三条处理（行业参考区间非税务机关法定预警值，不构成补税依据）' },
  'tax5': { module: 'taxPolicy', moduleName: '税务申报与政策', name: '被稽查/纳税评估', consequence: '曾被稽查或纳税评估的企业属重点监控对象，后续被再次选取检查的概率提高，建议完善票据与账簿管理' }
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
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000); // 北京时间
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
  // 纳税人身份：general=一般纳税人，small=小规模纳税人
  // 用途：小规模纳税人适用征收率并可享受免税、减征优惠，与一般纳税人口径的行业税负率不可直接对比
  taxpayerType?: 'general' | 'small';
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
  estimate?: boolean;
  estimateBasis?: string;
}

// 报告免责声明（与前端约定：结果页底部固定位 + 报告页脚 + 每个预估数字旁 + 每条处罚法条后展示）

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

  // 1. 增值税税负率偏离行业参考区间
  //    口径说明：①行业参考区间为行业经验与公开统计整理的非官方参考值，非税务机关法定预警值，仅作风险提示；
  //    ②税负率偏离本身不是补税依据，补税依据只能是查实少计收入、虚增进项或计税错误；
  //    ③小规模纳税人适用征收率及免税优惠，不适用一般纳税人口径的行业税负率对比。
  const isSmallTaxpayer = financialData.taxpayerType === 'small';
  const vatDiff = metrics.vatRate - benchmarks.vatRate.min;
  const vatWarningThreshold = benchmarks.vatRate.min * 0.5;
  const vatDeviation = (benchmarks.vatRate.min - metrics.vatRate).toFixed(2);
  if (metrics.vatRate < benchmarks.vatRate.min) {
    if (isSmallTaxpayer) {
      result.push({
        rule: '增值税税负率低于行业参考区间（小规模纳税人）',
        level: 'medium',
        levelIcon: '🟡',
        detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，低于行业参考区间下限${benchmarks.vatRate.min}%，偏离${vatDeviation}个百分点`,
        consequence: '贵单位为小规模纳税人，适用3%征收率，并可享受月销售额10万元以下免征增值税、适用3%征收率的应税销售收入减按1%征收等优惠（财政部 税务总局公告2023年第19号，执行至2027年12月31日），与一般纳税人口径的行业参考区间不可直接对比，本项仅作提示。如年应征增值税销售额已超过500万元，应及时办理一般纳税人登记',
        taxPolicy: '《增值税法》第九条（小规模纳税人标准）、第十一条（征收率3%）、第二十三条（起征点免征）；财政部 税务总局公告2023年第19号',
        estimate: true,
        estimateBasis: '行业参考区间为行业经验与公开统计整理的非官方参考值，且小规模纳税人适用征收率与免税政策，本项偏离度不适用于贵单位，仅作提示。'
      });
    } else if (vatDiff >= -vatWarningThreshold) {
      result.push({
        rule: '增值税税负率偏低',
        level: 'medium',
        levelIcon: '🟡',
        detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，低于行业参考区间下限${benchmarks.vatRate.min}%，偏离${vatDeviation}个百分点`,
        consequence: '税负率低于行业参考区间，属纳税评估重点关注指标，需准备合理商业理由说明（如集中采购导致进项较大、存货增加、享受即征即退或免税政策等）',
        taxPolicy: '《增值税法》第二十条；《税收征收管理法》第三十五条（注：行业参考区间为经验与公开统计整理，非税务机关法定预警值）'
      });
    } else {
      result.push({
        rule: '增值税税负异常偏低',
        level: 'high',
        levelIcon: '🔴',
        detail: `增值税税负率${metrics.vatRate.toFixed(2)}%，显著低于行业参考区间下限${benchmarks.vatRate.min}%，偏离${vatDeviation}个百分点`,
        consequence: '税负率显著低于行业参考区间，属纳税评估重点关注指标，需准备合理商业理由说明；如经核实存在少计收入、虚增进项或计税错误，按《增值税法》第二十条、《税收征收管理法》第三十五条核定，或按第六十三条追缴税款、按日加收万分之五滞纳金并处罚款。本项不提供补税金额结论',
        taxPolicy: '《增值税法》第二十条（销售额明显偏低且无正当理由可核定）；《税收征收管理法》第三十五条、第六十三条（注：行业参考区间非税务机关法定预警值，不构成补税依据）',
        estimate: true,
        estimateBasis: `行业参考区间下限${benchmarks.vatRate.min}%为行业经验与公开统计整理的非官方参考值，与贵企业实际税负率${metrics.vatRate.toFixed(2)}%的偏离度（${vatDeviation}个百分点）仅用于风险提示，不代表应补税额；实际是否补税取决于是否查实少计收入、虚增进项或计税错误，并需考虑进项抵扣、留抵、免税及优惠政策的适用。`
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
        detail: `毛利率${metrics.grossMargin.toFixed(1)}%，显著低于行业参考区间下限${benchmarks.grossMargin.min}%`,
        consequence: '毛利率显著低于行业参考区间，属纳税评估重点关注指标，需准备合理商业理由说明（如促销让利、原材料涨价、新工艺投入、存货跌价等）；如经查实存在在账簿上不列、少列收入或多列支出等偷税情形，方适用《税收征收管理法》第六十三条追缴税款、按日加收万分之五滞纳金，并处不缴或者少缴税款百分之五十以上五倍以下罚款',
        taxPolicy: '《企业所得税法》第八条；《增值税法》第二十条、《税收征收管理法》第三十五条；如查实偷税适用第六十三条（注：行业参考区间非税务机关法定预警值）',
        estimate: true,
        estimateBasis: '行业参考区间为行业经验与公开统计整理的非官方参考值，毛利率偏离仅作风险提示；毛利率偏低本身不构成偷税，是否适用《税收征收管理法》第六十三条取决于是否查实具体偷税手段。'
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
      taxPolicy: '非税务指标：属企业财务健康预警，不计入税务风险等级判定'
    });
  } else if (metrics.debtRatio > 60) {
    result.push({
      rule: '资产负债率偏高',
      level: 'medium',
      levelIcon: '🟡',
      detail: `资产负债率${metrics.debtRatio.toFixed(1)}%，超过60%预警线`,
      consequence: '负债率偏高需关注偿债能力和资金链安全',
      taxPolicy: '非税务指标：属企业财务健康预警，不计入税务风险等级判定'
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
// 飞书字段列表缓存（避免每次写入都查字段）
let feishuFieldCache: { names: Set<string>; expireAt: number } | null = null;

async function getFeishuFieldNames(token: string): Promise<Set<string>> {
  const now = Date.now();
  if (feishuFieldCache && feishuFieldCache.expireAt > now) {
    return feishuFieldCache.names;
  }

  try {
    const res = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/fields?page_size=100`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await res.json();
    if (data.code === 0 && data.data?.items) {
      const names = new Set(data.data.items.map((f: any) => f.field_name));
      feishuFieldCache = { names, expireAt: now + 3600 * 1000 }; // 缓存1小时
      return names;
    }
  } catch (e) {
    console.error('获取飞书字段列表失败:', e);
  }
  // 获取失败时返回空集合，不过滤字段（保持原行为）
  return new Set();
}

async function writeToFeishu(fields: Record<string, unknown>): Promise<{ success: boolean; error?: string; detail?: any; filtered?: string[] }> {
  const token = await getFeishuToken();
  if (!token) return { success: false, error: 'token获取失败' };

  // 获取存在的字段列表，过滤掉不存在的字段（避免FieldNameNotFound导致整条写入失败）
  const existingFields = await getFeishuFieldNames(token);
  let filteredFields = fields;
  let filtered: string[] = [];
  
  if (existingFields.size > 0) {
    const filteredObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (existingFields.has(key)) {
        filteredObj[key] = value;
      } else {
        filtered.push(key);
      }
    }
    filteredFields = filteredObj;
    if (filtered.length > 0) {
      console.warn('写入飞书时跳过不存在的字段:', filtered);
    }
  }

  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ fields: filteredFields })
    }
  );

  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    return { success: false, error: `API返回code=${result.code}, msg=${result.msg}`, detail: result, filtered };
  }
  return { success: true, filtered };
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
    const content = JSON.stringify({
      config: { wide_screen_mode: true },
      header: { title: { tag: 'plain_text', content: '🔔 新客户风险筛查提交' }, template: 'blue' },
      elements: [{
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `📋 企业：${companyName || '未填写'}\n👤 联系人：${contactName || '未填写'}\n📱 电话：${contactPhone || '未填写'}\n🏢 行业：${industry || '未填写'}\n⚠️ 风险等级：${riskLevel}\n🆔 检测ID：${riskId}\n\n👉 请登录飞书多维表查看完整报告详情`
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

    // 生成ID和时间（转成北京时间，避免海外节点时区问题）
    const riskId = generateRiskId();
    const nowBeijing = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const detectionTime = nowBeijing.toISOString().replace('T', ' ').slice(0, 19);

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

  // 提交时不调用企查查（Vercel海外节点访问国内API不稳定）
  // 工商信息查询、名称/代码交叉校验统一由国内定时脚本（qcc-sync.js）异步回填
  // 通常10分钟内完成，回填后「工商信息」和「名称代码校验状态」字段会更新
  let nameCreditCheck = {
    status: 'pending',
    qccName: '',
    qccCreditCode: '',
    userEnteredName: enterpriseName,
    userEnteredCreditCode: creditCode,
    finalName: enterpriseName,
    finalCreditCode: creditCode
  };
  const qccCompanyInfo = null;

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

  // 构建飞书字段（v5问卷检测流程）
  const fields: Record<string, unknown> = {};
  // 使用交叉校验后的最终企业名称和信用代码（以工商登记信息为准）
  fields['企业名称'] = nameCreditCheck.finalName || enterpriseName;
  fields['统一信用代码'] = nameCreditCheck.finalCreditCode || creditCode;
  // 状态值映射为飞书单选选项文本
  const statusMap: Record<string, string> = {
    'match': '一致',
    'mismatch': '不一致',
    'one_empty': '自动补全',
    'pending': '待校验',
    'none': '未校验'
  };
  fields['名称代码校验状态'] = statusMap[nameCreditCheck.status] || '未校验';
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
  fields['毛利率'] = financialMetrics.grossMargin;
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

  fields['问卷明细'] = JSON.stringify(riskAnswers);
  fields['年度财务数据'] = JSON.stringify(financialData);
  fields['财务指标'] = JSON.stringify(financialMetrics);

  // 企查查工商信息（只写JSON字段，减少字段依赖）
  if (qccCompanyInfo) {
    fields['工商信息'] = JSON.stringify(qccCompanyInfo);
  }

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
  fields['报告内容'] = generateV5ReportContent({
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
    await sendFeishuNotification({
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
    enterpriseName: nameCreditCheck.finalName || enterpriseName,
    creditCode: nameCreditCheck.finalCreditCode || creditCode,
    nameCreditCheck,
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
    reportStatus: '待审核',
    qccCompanyInfo,
    disclaimer: REPORT_DISCLAIMER,
    cta: buildRiskCta(overallLevel, riskId)
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
  fields['毛利率'] = grossMargin;
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
    await sendFeishuNotification({
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
