'use server';

import { NextRequest, NextResponse } from 'next/server';

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
  '建筑业': { grossMargin: { min: 10, max: 20 }, netMargin: { min: 3, max: 8 }, vatRate: { min: 2.5, max: 4.5 }, citRate: { min: 0.5, max: 1.5 } },
  '建筑': { grossMargin: { min: 10, max: 20 }, netMargin: { min: 3, max: 8 }, vatRate: { min: 2.5, max: 4.5 }, citRate: { min: 0.5, max: 1.5 } },
  '房地产业': { grossMargin: { min: 20, max: 35 }, netMargin: { min: 8, max: 18 }, vatRate: { min: 4.0, max: 6.0 }, citRate: { min: 1.0, max: 2.5 } },
  '房地产': { grossMargin: { min: 20, max: 35 }, netMargin: { min: 8, max: 18 }, vatRate: { min: 4.0, max: 6.0 }, citRate: { min: 1.0, max: 2.5 } },
  '信息技术服务业': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 3.0, max: 5.0 }, citRate: { min: 0.5, max: 1.5 } },
  '信息技术': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 3.0, max: 5.0 }, citRate: { min: 0.5, max: 1.5 } },
  '软件': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 3.0, max: 5.0 }, citRate: { min: 0.5, max: 1.5 } },
  '餐饮住宿业': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '餐饮': { grossMargin: { min: 50, max: 70 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '物流仓储业': { grossMargin: { min: 15, max: 25 }, netMargin: { min: 3, max: 8 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '物流': { grossMargin: { min: 15, max: 25 }, netMargin: { min: 3, max: 8 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '医疗健康': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 8, max: 20 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '教育培训': { grossMargin: { min: 40, max: 60 }, netMargin: { min: 10, max: 25 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '文化娱乐': { grossMargin: { min: 30, max: 50 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
  '农业': { grossMargin: { min: 20, max: 35 }, netMargin: { min: 5, max: 12 }, vatRate: { min: 1.0, max: 3.0 }, citRate: { min: 0.3, max: 1.0 } },
  '其他': { grossMargin: { min: 20, max: 40 }, netMargin: { min: 5, max: 15 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 1.5 } },
};

// 飞书token缓存
let feishuTokenCache: { token: string; expire: number } | null = null;

async function getFeishuToken(): Promise<string> {
  if (feishuTokenCache && Date.now() < feishuTokenCache.expire) {
    return feishuTokenCache.token;
  }
  
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
  });
  
  const data = await res.json();
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`获取飞书token失败: ${data.msg || 'unknown error'}`);
  }
  
  feishuTokenCache = { token: data.tenant_access_token, expire: Date.now() + (data.expire - 300) * 1000 };
  return data.tenant_access_token;
}

// 解析统一社会信用代码
function parseCreditCode(code: string) {
  if (!code || code.length !== 18) return { valid: false, error: '信用代码长度应为18位' };
  
  const charset = '0123456789ABCDEFGHJKLMNPQRTUWXY';
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
  
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const idx = charset.indexOf(code[i]);
    if (idx < 0) return { valid: false, error: `第${i+1}位字符非法: ${code[i]}` };
    sum += idx * weights[i];
  }
  
  const checkChar = charset[(31 - sum % 31) % 31];
  const valid = checkChar === code[17];
  
  const deptMap: Record<string, string> = { '1': '机构编制机关', '5': '民政部门', '9': '工商部门', 'Y': '市场监管部门', 'A': '司法行政部门', 'N': '农业农村部门' };
  const categoryMap: Record<string, Record<string, string>> = {
    '1': { '1': '机关', '2': '事业单位' },
    '5': { '1': '社会团体', '2': '民办非企业', '3': '基金会' },
    '9': { '1': '企业', '2': '个体工商户', '3': '农民专业合作社' },
    'Y': { '1': '企业', '2': '个体工商户' },
  };
  
  const REGION_MAP: Record<string, string> = {
    '110000': '北京市', '120000': '天津市', '310000': '上海市', '500000': '重庆市',
    '320000': '江苏省', '320500': '苏州市', '320100': '南京市', '330000': '浙江省',
    '330100': '杭州市', '440000': '广东省', '440100': '广州市', '440300': '深圳市',
  };
  
  const deptCode = code[0];
  const categoryCode = code[1];
  const regionCode = code.substring(2, 8);
  
  return {
    valid,
    checksumMismatch: !valid,
    deptName: deptMap[deptCode] || '未知部门',
    categoryName: categoryMap[deptCode]?.[categoryCode] || '未知类别',
    fullType: `${deptMap[deptCode] || '未知'} · ${categoryMap[deptCode]?.[categoryCode] || '未知'}`,
    regionCode,
    regionName: REGION_MAP[regionCode] || REGION_MAP[regionCode.substring(0, 4) + '00'] || '未知地区',
    orgCode: code.substring(8, 17),
    checkDigit: code[17],
    expectedCheck: checkChar,
  };
}

// 风险等级提取（兼容旧版boolean）
function extractFeishuRiskLevel(value: any): number {
  if (typeof value === 'number') return value >= 0 && value <= 2 ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    if (value === 'true') return 1;
    if (value === 'false') return 0;
    const num = parseInt(value);
    return num >= 0 && num <= 2 ? num : 0;
  }
  return 0;
}

// 风险后果描述（V8修正版）
const RISK_CONSEQUENCES: Record<string, { title: string; consequence: string; taxPolicy: string; module: string }> = {
  q1: { title: '逾期申报', module: 'taxCompliance',
    consequence: '逾期申报定额罚款2000元以下；逾期缴纳按日加收万分之五滞纳金',
    taxPolicy: '《税收征收管理法》第六十二条（逾期申报罚款）、第六十三条（逾期缴纳滞纳金）' },
  q2: { title: '隐瞒收入', module: 'taxCompliance',
    consequence: '按偷税处理，补缴税款+滞纳金+0.5-5倍罚款，情节严重追究刑事责任',
    taxPolicy: '《税收征收管理法》第六十三条' },
  q3: { title: '虚列成本', module: 'taxCompliance',
    consequence: '调增应纳税所得额，补缴企业所得税+滞纳金，涉嫌偷税的处0.5-5倍罚款',
    taxPolicy: '《税收征收管理法》第六十三条、《企业所得税法》第八条' },
  q4: { title: '连续亏损', module: 'taxCompliance',
    consequence: '列入纳税评估重点对象，税务机关怀疑隐匿收入或转移利润',
    taxPolicy: '《税收征收管理法》第三十五条（核定征收）、《企业所得税法》第四十七条' },
  q5: { title: '异常发票', module: 'invoiceRisk',
    consequence: '善意取得可免予处罚但需补税；恶意取得按偷税处理，0.5-5倍罚款+追究刑责',
    taxPolicy: '《发票管理办法》第二十一条、《国家税务总局关于纳税人善意取得虚开增值税专用发票处理问题的通知》' },
  q6: { title: '发票经营范围不符', module: 'invoiceRisk',
    consequence: '虚开增值税专用发票的依法追究刑事责任；虚开普通发票的可处1-5倍罚款',
    taxPolicy: '《发票管理办法》第二十二条、《刑法》第二百零五条' },
  q7: { title: '变票入账', module: 'invoiceRisk',
    consequence: '涉嫌虚开发票或偷税，补缴税款+滞纳金+罚款，情节严重追究刑事责任',
    taxPolicy: '《发票管理办法》第二十二条、《刑法》第二百零五条' },
  q8: { title: '进项税异常', module: 'invoiceRisk',
    consequence: '进项税额转出，补缴增值税+滞纳金，涉嫌虚开的按偷税处理',
    taxPolicy: '《增值税暂行条例》第九条、《税收征收管理法》第六十三条' },
  q9: { title: '增值税税负异常', module: 'taxBurden',
    consequence: '触发税务预警，税务机关要求说明理由或进行纳税评估',
    taxPolicy: '《税收征收管理法》第三十五条（核定征收）' },
  q10: { title: '企业所得税税负异常', module: 'taxBurden',
    consequence: '列入纳税评估对象，可能被核定征收或稽查',
    taxPolicy: '《税收征收管理法》第三十五条、《企业所得税核定征收办法》' },
  q11: { title: '利润偏低', module: 'taxBurden',
    consequence: '触发转让定价调查，税务机关有权进行特别纳税调整',
    taxPolicy: '《企业所得税法》第四十一条、第四十七条（特别纳税调整）' },
  q12: { title: '增值税申报异常', module: 'taxBurden',
    consequence: '触发税务预警，可能被要求提供说明或接受纳税评估',
    taxPolicy: '《税收征收管理法》第二十五条、第三十五条' },
  q13: { title: '个人消费报销', module: 'financialIrregularity',
    consequence: '调增应纳税所得额，补缴企业所得税+个人所得税+滞纳金+罚款',
    taxPolicy: '《企业所得税法》第八条、第十条、《个人所得税法》第二条' },
  q14: { title: '私户收款', module: 'financialIrregularity',
    consequence: '隐瞒收入按偷税处理，补缴税款+滞纳金+0.5-5倍罚款，情节严重追究刑责',
    taxPolicy: '《税收征收管理法》第六十三条、《刑法》第二百零一条' },
  q15: { title: '两套账', module: 'financialIrregularity',
    consequence: '按偷税处理，补缴税款+滞纳金+0.5-5倍罚款，情节严重追究刑事责任',
    taxPolicy: '《税收征收管理法》第六十三条、《会计法》第四十二条' },
  q16: { title: '账实不符', module: 'financialIrregularity',
    consequence: '纳税调整，补缴税款+滞纳金，涉嫌偷税的处0.5-5倍罚款',
    taxPolicy: '《税收征收管理法》第三十五条、第六十三条' },
  q17: { title: '税收洼地', module: 'architectureRisk',
    consequence: '不符合实质性运营要求的，补缴税款差额及滞纳金',
    taxPolicy: '《企业所得税法》第四十七条、《财政部 税务总局关于海南自由贸易港企业所得税优惠政策的通知》' },
  q18: { title: '关联交易', module: 'architectureRisk',
    consequence: '税务机关有权进行特别纳税调整，补缴税款+利息',
    taxPolicy: '《企业所得税法》第四十一条、第四十三条（关联交易申报）' },
  q19: { title: '多层架构', module: 'architectureRisk',
    consequence: '一般反避税调整，补缴税款+按人民币贷款基准利率加收利息（无罚款）',
    taxPolicy: '《企业所得税法》第四十七条、《一般反避税管理办法（试行）》' },
  q20: { title: '虚假工资', module: 'architectureRisk',
    consequence: '按偷税处理，补缴税款+滞纳金+0.5-5倍罚款，情节严重追究刑事责任',
    taxPolicy: '《税收征收管理法》第六十三条、《刑法》第二百零一条' },
};

// 风险等级映射
function mapRiskLevel(answer: number, questionKey: string): { level: string; impact: string; consequence: string; taxPolicy: string } {
  const riskInfo = RISK_CONSEQUENCES[questionKey];
  if (!riskInfo) return { level: 'low', impact: '该方面暂未发现明显违规', consequence: '', taxPolicy: '' };
  
  if (answer === 0) {
    return { level: 'low', impact: '该方面暂未发现明显违规', consequence: '', taxPolicy: '' };
  } else if (answer === 1) {
    return { level: 'medium', impact: `存在「${riskInfo.title}」风险（程度较轻），${riskInfo.consequence}`, consequence: riskInfo.consequence, taxPolicy: riskInfo.taxPolicy };
  } else {
    return { level: 'high', impact: `存在「${riskInfo.title}」风险（严重），${riskInfo.consequence}`, consequence: riskInfo.consequence, taxPolicy: riskInfo.taxPolicy };
  }
}

export async function submitRiskAssessment(formData: any) {
  try {
    // 验证必填字段
    const { enterpriseName, creditCode, contactPerson, contactPhone, industry, revenueScale, financialData, riskAnswers } = formData;
    
    if (!enterpriseName || !creditCode || !contactPerson || !contactPhone) {
      return { error: '请填写所有必填字段' };
    }
    
    // 验证信用代码
    const creditCodeAnalysis = parseCreditCode(creditCode);
    if (!creditCodeAnalysis.valid) {
      return { error: '统一社会信用代码格式不正确' };
    }
    
    // 生成riskId
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const riskId = `RC${timestamp}`;
    
    // 构建风险项
    const riskItems: any[] = [];
    const questionKeys = Object.keys(riskAnswers || {}).filter(k => k.startsWith('q'));
    
    for (const qKey of questionKeys) {
      const answer = Number(riskAnswers[qKey]) || 0;
      if (answer < 0 || answer > 2) continue;
      
      const riskInfo = RISK_CONSEQUENCES[qKey];
      if (!riskInfo) continue;
      
      const riskLevel = mapRiskLevel(answer, qKey);
      
      if (answer > 0) {
        riskItems.push({
          questionKey: qKey,
          title: riskInfo.title,
          level: riskLevel.level,
          impact: riskLevel.impact,
          consequence: riskLevel.consequence,
          taxPolicy: riskLevel.taxPolicy,
          module: riskInfo.module,
        });
      }
    }
    
    // 统计风险等级
    const highCount = riskItems.filter(r => r.level === 'high').length;
    const mediumCount = riskItems.filter(r => r.level === 'medium').length;
    const lowCount = riskItems.filter(r => r.level === 'low').length;
    
    // 构建报告内容
    const reportContent = {
      riskId,
      enterpriseName,
      creditCode,
      contactPerson,
      contactPhone,
      industry,
      revenueScale,
      financialData,
      riskItems,
      summary: {
        total: riskItems.length,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      createdAt: now.toISOString(),
    };
    
    // 获取飞书token
    const token = await getFeishuToken();
    
    // 写入飞书多维表
    const fields: Record<string, any> = {
      '检测ID': riskId,
      '企业名称': enterpriseName,
      '统一信用代码': creditCode,
      '联系人': contactPerson,
      '联系电话': contactPhone,
      '所属行业': industry,
      '年营收规模': revenueScale,
      '高风险项数': highCount,
      '中风险项数': mediumCount,
      '低风险项数': lowCount,
      '报告内容JSON': JSON.stringify(reportContent),
      '提交时间': now.toISOString(),
    };
    
    // 写入风险答案（通过 QUESTION_FIELD_MAP 映射飞书字段名）
    const QUESTION_FIELD_MAP: Record<string, string> = {
      'q1': 'q1_逾期申报', 'q2': 'q2_连续零申报', 'q3': 'q3_增值税与所得税收入差异',
      'q4': 'q4_连续三年亏损', 'q5': 'q5_异常发票', 'q6': 'q6_发票经营范围不符',
      'q7': 'q7_变票入账', 'q8': 'q8_进销项不匹配', 'q9': 'q9_隐匿收入',
      'q10': 'q10_账外经营', 'q11': 'q11_利润虚高', 'q12': 'q12_库存账实不符',
      'q13': 'q13_个人消费报销', 'q14': 'q14_股东往来款过大', 'q15': 'q15_利润临界值享受小微',
      'q16': 'q16_三无费用', 'q17': 'q17_税收洼地核定', 'q18': 'q18_关联交易价格偏离',
      'q19': 'q19_多层架构转移利润', 'q20': 'q20_非实际员工发工资'
    };
    for (const qKey of questionKeys) {
      const fieldName = QUESTION_FIELD_MAP[qKey] || qKey;
      fields[fieldName] = Number(riskAnswers[qKey]) || 0;
    }
    
    const feishuRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    
    const feishuData = await feishuRes.json();
    const feishuSaved = feishuData.code === 0;
    
    return {
      riskId,
      success: true,
      feishuSaved,
      summary: reportContent.summary,
      riskItems: riskItems.map(r => ({
        questionKey: r.questionKey,
        title: r.title,
        level: r.level,
        impact: r.impact,
      })),
    };
  } catch (error: any) {
    console.error('提交失败:', error);
    return { error: error.message || '提交失败' };
  }
}
