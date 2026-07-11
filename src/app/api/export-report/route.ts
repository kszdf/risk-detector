import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, HeadingLevel,
  ImageRun, PageBreak
} from 'docx';
import fs from 'fs';
import path from 'path';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'Z006bk7yuaxWalsdqoeck3mBnTb';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblYYxtHDeBAx15j';

// 管理员密钥
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hgttax_admin_2026';

// 风险等级颜色配置（柔和专业版）
const RISK_COLORS = {
  low: { bg: 'f0fff4', text: '38a169', name: '低风险' },
  medium: { bg: 'fffbeb', text: 'd69e2e', name: '中风险' },
  mediumHigh: { bg: 'fffaF0', text: 'dd6b20', name: '中高风险' },
  high: { bg: 'fff5f5', text: 'c53030', name: '高风险' },
  critical: { bg: 'faf5ff', text: '805ad5', name: '极高风险' }
};

// 模块名称映射
const MODULE_NAMES: Record<string, string> = {
  taxCompliance: '申报与纳税合规',
  invoice: '发票管理',
  revenue: '收入与成本',
  expense: '费用与利润',
  structure: '架构与关联交易'
};

// 五维度20题完整映射（含题目、风险判定、政策条文）
const V5_QUESTIONS: Record<string, { module: string; moduleName: string; question: string; name: string; consequence: string; taxPolicy: string; policyContent: string }> = {
  'q1': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '近12个月是否存在逾期申报或逾期缴纳税款？', name: '逾期申报', consequence: '逾期申报由税务机关责令限期改正，可处2000元以下罚款；逾期缴纳税款按日加收万分之五滞纳金', taxPolicy: '《税收征收管理法》第六十二条、第六十三条', policyContent: '第六十二条：纳税人未按照规定的期限办理纳税申报和报送纳税资料的，或者扣缴义务人未按照规定的期限向税务机关报告代扣代缴、代收代缴税款的，由税务机关责令限期改正，可以处二千元以下的罚款；情节严重的，可以处二千元以上一万元以下的罚款。第六十三条：纳税人伪造、变造、隐匿、擅自销毁帐簿、记帐凭证，或者在帐簿上多列支出或者不列、少列收入，或者经税务机关通知申报而拒不申报或者进行虚假的纳税申报，不缴或者少缴应纳税款的，是偷税。' },
  'q2': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '是否存在连续零申报或负申报超过6个月？', name: '连续零申报超6个月', consequence: '税务机关可认定为异常申报，纳入重点监控，要求企业进行纳税评估或稽查', taxPolicy: '《税收征收管理法》第三十五条', policyContent: '第三十五条：纳税人有下列情形之一的，税务机关有权核定其应纳税额：（一）依照法律、行政法规的规定可以不设置账簿的；（二）依照法律、行政法规的规定应当设置但未设置账簿的；（三）擅自销毁账簿或者拒不提供纳税资料的；（四）虽设置账簿，但账目混乱或者成本资料、收入凭证、费用凭证残缺不全，难以查账的；（五）发生纳税义务，未按照规定的期限办理纳税申报，经税务机关责令限期申报，逾期仍不申报的。' },
  'q3': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '增值税申报收入与企业所得税申报收入是否存在较大差异？', name: '增值税与所得税收入差异', consequence: '税务机关可要求企业提供差异说明，无法合理说明的面临纳税调整和补税风险', taxPolicy: '《税收征收管理法》第三十五条', policyContent: '第三十五条第（五）项：税务机关有权对申报不实的企业核定其应纳税额，要求企业提供合理差异说明。' },
  'q4': { module: 'taxCompliance', moduleName: '申报与纳税合规', question: '企业是否连续三年及以上亏损但仍持续经营？', name: '连续三年亏损仍经营', consequence: '列入纳税评估重点关注对象，税务机关可能怀疑存在隐匿收入或转移利润', taxPolicy: '《企业所得税法》第四十七条', policyContent: '第四十七条：企业实施其他不具有合理商业目的的安排而减少其应纳税收入或者所得额的，税务机关有权按照合理方法调整。' },
  'q5': { module: 'invoice', moduleName: '发票管理', question: '是否存在无票采购、取得走逃企业发票或品名不符的异常发票？', name: '异常发票/走逃企业', consequence: '已抵扣进项税额需转出，补缴增值税及滞纳金；善意取得可免于处罚，恶意取得按偷税处理', taxPolicy: '国家税务总局公告2019年第38号；《发票管理办法》第二十三条', policyContent: '国家税务总局公告2019年第38号：增值税一般纳税人取得列入异常凭证范围的增值税专用发票，尚未申报抵扣进项税额的，暂不允许抵扣；已经申报抵扣的，一律作进项税额转出处理。《发票管理办法》（2023年修订）第二十三条：任何单位和个人应当按照发票管理规定使用发票，不得有下列行为：（二）知道或者应当知道是私自印制、伪造、变造、非法取得或者废止的发票而受让、开具、存放、携带、邮寄、运输。' },
  'q6': { module: 'invoice', moduleName: '发票管理', question: '是否存在发票开具内容与实际经营范围明显不符？', name: '发票经营范围不符', consequence: '涉嫌虚开发票，补缴税款并处0.5-5倍罚款；虚开增值税专用发票的依法追究刑事责任', taxPolicy: '《发票管理办法》第二十一条；《刑法》第二百零五条', policyContent: '《发票管理办法》（2023年修订）第二十一条：任何单位和个人不得有下列虚开发票行为：（一）为他人、为自己开具与实际经营业务情况不符的发票；（二）让他人为自己开具与实际经营业务情况不符的发票；（三）介绍他人开具与实际经营业务情况不符的发票。《刑法》第二百零五条：虚开增值税专用发票或者虚开用于骗取出口退税、抵扣税款的其他发票的，处三年以下有期徒刑或者拘役，并处二万元以上二十万元以下罚金。' },
  'q7': { module: 'invoice', moduleName: '发票管理', question: '是否存在大额现金交易或通过个人账户收款后"变票"入账？', name: '变票入账', consequence: '涉嫌虚开发票或偷税，补缴税款并处0.5-5倍罚款，构成犯罪的依法追究刑事责任', taxPolicy: '《发票管理办法》第二十一条；《税收征收管理法》第六十三条', policyContent: '通过变票入账掩盖真实交易的，按虚开发票和偷税论处。《发票管理办法》（2023年修订）第二十一条明确规定，为他人、为自己开具与实际经营业务情况不符的发票属于虚开发票行为。《税收征收管理法》第六十三条规定偷税行为由税务机关追缴税款、滞纳金，并处不缴或者少缴的税款百分之五十以上五倍以下的罚款。' },
  'q8': { module: 'invoice', moduleName: '发票管理', question: '是否存在进销项品名/数量严重不匹配？', name: '进销项不匹配', consequence: '可能被认定为取得异常凭证，进项税额不得抵扣，需补缴增值税及滞纳金', taxPolicy: '《增值税法》第十六条', policyContent: '《中华人民共和国增值税法》（2026年1月1日起施行）第十六条：进项税额，是指纳税人购进货物、服务、无形资产、不动产支付或者负担的增值税税额。纳税人应当凭法律、行政法规或者国务院规定的增值税扣税凭证从销项税额中抵扣进项税额。进销项严重不匹配的，取得的增值税扣税凭证可能被认定为异常凭证，其进项税额不得抵扣。' },
  'q9': { module: 'revenue', moduleName: '收入与成本', question: '是否存在延迟开票确认收入、部分收入未入账或使用个人账户收款未报税？', name: '隐匿收入/个人账户收款', consequence: '按偷税论处，补缴增值税和企业所得税，按日加收万分之五滞纳金，并处0.5-5倍罚款', taxPolicy: '《税收征收管理法》第六十三条；《增值税法》第二十八条', policyContent: '《中华人民共和国增值税法》（2026年1月1日起施行）第二十八条：发生应税交易，纳税义务发生时间为收讫销售款项或者取得销售款项索取凭据的当日；先开具发票的，为开具发票的当日。隐瞒收入不入账的，按偷税论处。' },
  'q10': { module: 'revenue', moduleName: '收入与成本', question: '是否存在账外经营（部分业务不入账，通过私人账户收支）？', name: '账外经营', consequence: '按偷税论处，补缴增值税和企业所得税，按日加收万分之五滞纳金，并处0.5-5倍罚款', taxPolicy: '《税收征收管理法》第六十三条；《会计法》第九条、第十六条', policyContent: '《会计法》第九条：各单位必须根据实际发生的经济业务事项进行会计核算，填制会计凭证，登记会计帐簿，编制财务会计报告。任何单位不得以虚假的经济业务事项或者资料进行会计核算。第十六条：各单位发生的各项经济业务事项应当在依法设置的会计帐簿上统一登记、核算，不得违反本法和国家统一的会计制度的规定私设会计帐簿登记、核算。' },
  'q11': { module: 'revenue', moduleName: '收入与成本', question: '是否存在毛利率明显偏低或利润异常偏低？', name: '利润偏低', consequence: '税务机关可启动转让定价调查或纳税评估，要求补缴税款并加收利息', taxPolicy: '《企业所得税法》第四十一条', policyContent: '第四十一条：企业与其关联方之间的业务往来，不符合独立交易原则而减少企业或者其关联方应纳税收入或者所得额的，税务机关有权按照合理方法调整。企业与其关联方共同开发、受让无形资产，或者共同提供、接受劳务发生的成本，在计算应纳税所得额时应当按照独立交易原则进行分摊。' },
  'q12': { module: 'revenue', moduleName: '收入与成本', question: '是否存在库存账实不符（账面有货但仓库没货，或仓库有货但账面无记录）？', name: '库存账实不符', consequence: '账面大于实际涉嫌已销售未入账隐匿收入；实际大于账面涉嫌虚增进项抵扣', taxPolicy: '《增值税法》第二十二条', policyContent: '《中华人民共和国增值税法》（2026年1月1日起施行）第二十二条：下列进项税额不得从销项税额中抵扣：（一）适用简易计税方法计税项目对应的进项税额；（二）免征增值税项目对应的进项税额；（三）非正常损失项目对应的进项税额；（四）购进并用于集体福利或者个人消费的货物、服务、无形资产、不动产对应的进项税额。库存账实不符的，账面大于实际可能涉嫌已销售未入账隐匿收入，实际大于账面可能被认定为购进货物用于不得抵扣项目。' },
  'q13': { module: 'expense', moduleName: '费用与利润', question: '是否存在将个人消费（家庭开支、个人购买大件商品等）以公司费用名义报销入账？', name: '个人消费报销', consequence: '相关费用不得税前扣除，需调增应纳税所得额补缴企业所得税，并代扣代缴个人所得税', taxPolicy: '《企业所得税法》第八条、第十条；财税〔2003〕158号', policyContent: '《企业所得税法》第十条：在计算应纳税所得额时，下列支出不得扣除：（八）与取得收入无关的其他支出。财税〔2003〕158号第二条：个人独资企业、合伙企业的个人投资者以企业资金为本人、家庭成员及其相关人员支付与企业生产经营无关的消费性支出及购买汽车、住房等财产性支出，视为企业对个人投资者的利润分配，并入投资者个人的生产、经营所得计征个人所得税。' },
  'q14': { module: 'expense', moduleName: '费用与利润', question: '是否存在股东长期从公司借款不还（超过一年）？', name: '股东往来款过大', consequence: '股东借款年度终了未归还且未用于经营的，视同分红需代扣代缴20%个人所得税', taxPolicy: '财税〔2003〕158号第二条；《个人所得税法》第二条', policyContent: '财税〔2003〕158号第二条第（二）款：纳税年度内个人投资者从其投资的企业（个人独资企业、合伙企业除外）借款，在该纳税年度终了后既不归还，又未用于企业生产经营的，其未归还的借款可视为企业对个人投资者的红利分配，依照"利息、股息、红利所得"项目计征个人所得税（税率20%）。' },
  'q15': { module: 'expense', moduleName: '费用与利润', question: '是否存在利润刚好卡在小型微利企业标准线附近（如应纳税所得额刚好300万以下）？', name: '利润临界值享受小微', consequence: '如被认定为人为调节利润骗取税收优惠，将追缴已享受的减免税款并加收滞纳金', taxPolicy: '《企业所得税法》第二十八条；财政部 税务总局公告2023年第12号', policyContent: '《企业所得税法》第二十八条：符合条件的小型微利企业，减按20%的税率征收企业所得税。财政部 税务总局公告2023年第12号：对小型微利企业减按25%计算应纳税所得额，按20%的税率缴纳企业所得税政策，延续执行至2027年12月31日（实际税负5%）。人为调节利润卡线享受优惠的，税务机关有权进行纳税调整并追缴已减免税款。' },
  'q16': { module: 'expense', moduleName: '费用与利润', question: '是否存在无合法凭证的费用入账（如白条、无发票的收据等）？', name: '三无费用', consequence: '不合规凭证不得作为税前扣除依据，需调增应纳税所得额补缴企业所得税及滞纳金', taxPolicy: '《企业所得税法》第八条；国家税务总局公告2018年第28号', policyContent: '《企业所得税法》第八条：企业实际发生的与取得收入有关的、合理的支出，包括成本、费用、税金、损失和其他支出，准予在计算应纳税所得额时扣除。国家税务总局公告2018年第28号：企业发生支出，应取得税前扣除凭证，作为计算企业所得税应纳税所得额时扣除相关支出的依据；未取得合法有效凭证的，相应支出不得在发生年度税前扣除。' },
  'q17': { module: 'expense', moduleName: '费用与利润', question: '是否存在连续三年亏损但仍持续经营的情况？', name: '连续三年亏损仍经营', consequence: '列入税收风险管理重点关注对象，税务机关可能怀疑存在隐匿收入或转移利润', taxPolicy: '《企业所得税法》第四十七条；《税收征收管理法》第三十五条', policyContent: '《企业所得税法》第四十七条：企业实施其他不具有合理商业目的的安排而减少其应纳税收入或者所得额的，税务机关有权按照合理方法调整。《税收征收管理法》第三十五条：纳税人申报的计税依据明显偏低，又无正当理由的，税务机关有权核定其应纳税额。连续多年亏损仍持续经营的企业，属于税收风险管理重点关注范围。' },
  'q18': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在与关联方之间的交易价格明显偏离市场价格？', name: '关联交易价格偏离', consequence: '税务机关可按独立交易原则进行特别纳税调查调整，补缴税款并加收利息', taxPolicy: '《企业所得税法》第四十一条；国家税务总局公告2017年第6号', policyContent: '《企业所得税法》第四十一条：企业与其关联方之间的业务往来，不符合独立交易原则而减少企业或者其关联方应纳税收入或者所得额的，税务机关有权按照合理方法调整。国家税务总局公告2017年第6号《特别纳税调查调整及相互协商程序管理办法》：税务机关对关联交易进行转让定价调查调整，可采用可比非受控价格法、再销售价格法、成本加成法、交易净利润法、利润分割法及其他符合独立交易原则的方法。' },
  'q19': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在通过多层架构转移利润（如在税收洼地设立空壳公司）？', name: '多层架构转移利润', consequence: '无实质性经营的企业不符合核定征收条件，税务机关有权改为查账征收并追缴税款差额及滞纳金', taxPolicy: '《税收征收管理法》第三十五条；《企业所得税法》第四十七条', policyContent: '《税收征收管理法》第三十五条：纳税人申报的计税依据明显偏低，又无正当理由的，税务机关有权核定其应纳税额。《企业所得税法》第四十七条：企业实施其他不具有合理商业目的的安排而减少其应纳税收入或者所得额的，税务机关有权按照合理方法调整。无实际经营、无实质办公场所、无雇员的"三无"空壳公司，不符合核定征收条件，税务机关有权改为查账征收。' },
  'q20': { module: 'structure', moduleName: '架构与关联交易', question: '是否存在在税收洼地注册核定征收但无实际经营的情况？', name: '税收洼地核定', consequence: '不符合核定征收条件的，税务机关有权改为查账征收并追缴税款差额及滞纳金', taxPolicy: '《税收征收管理法》第三十五条', policyContent: '《税收征收管理法》第三十五条：纳税人有下列情形之一的，税务机关有权核定其应纳税额：（二）依照法律、行政法规的规定应当设置帐簿但未设置的；（六）纳税人申报的计税依据明显偏低，又无正当理由的。近年来税务机关严格规范核定征收范围，对不符合条件的企业逐步改为查账征收方式。' }
};

// 答案选项文案
const ANSWER_OPTIONS = ['无此情况', '存在但程度较轻', '存在且较为严重'];
const ANSWER_COLORS = ['38a169', 'd69e2e', 'c53030']; // 绿/黄/红（柔和版）

// 行业基准数据（7个行业 + 兜底）
const INDUSTRY_BENCHMARKS: Record<string, {
  grossMargin: { min: number; max: number };
  vatRate: { min: number; max: number };
  citRate: { min: number; max: number };
}> = {
  '制造业': { grossMargin: { min: 25, max: 40 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.8, max: 2.0 } },
  '批发零售业': { grossMargin: { min: 15, max: 30 }, vatRate: { min: 1.0, max: 3.0 }, citRate: { min: 0.3, max: 1.5 } },
  '建筑工程业': { grossMargin: { min: 8, max: 18 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '商务服务业': { grossMargin: { min: 40, max: 60 }, vatRate: { min: 2.5, max: 5.0 }, citRate: { min: 1.0, max: 3.0 } },
  '生活服务业': { grossMargin: { min: 30, max: 50 }, vatRate: { min: 2.0, max: 4.5 }, citRate: { min: 0.5, max: 2.0 } },
  '科技互联网业': { grossMargin: { min: 50, max: 70 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '其他行业': { grossMargin: { min: 20, max: 40 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } },
  '建筑业': { grossMargin: { min: 8, max: 18 }, vatRate: { min: 1.5, max: 3.5 }, citRate: { min: 0.5, max: 1.5 } },
  '科技互联网': { grossMargin: { min: 50, max: 70 }, vatRate: { min: 1.5, max: 4.0 }, citRate: { min: 0.8, max: 2.5 } },
  '其他': { grossMargin: { min: 20, max: 40 }, vatRate: { min: 2.0, max: 4.0 }, citRate: { min: 0.5, max: 2.0 } }
};

// 计算行业基准对比结果
function calcIndustryBenchmark(industry: string, grossMargin: number, vatRate: number, citRate: number) {
  const bench = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS['其他行业'];
  
  const gmStatus = grossMargin === 0 ? '-' :
    grossMargin < bench.grossMargin.min ? '偏低' :
    grossMargin > bench.grossMargin.max ? '偏高' : '正常';
  
  const vatStatus = vatRate === 0 ? '-' :
    vatRate < bench.vatRate.min ? '偏低预警' :
    vatRate > bench.vatRate.max ? '偏高' : '正常';
  
  const citStatus = citRate === 0 ? '-' :
    citRate < bench.citRate.min ? '偏低预警' :
    citRate > bench.citRate.max ? '偏高' : '正常';
  
  return {
    grossMarginBenchmark: bench.grossMargin,
    vatRateBenchmark: bench.vatRate,
    citRateBenchmark: bench.citRate,
    grossMarginStatus: gmStatus,
    vatRateStatus: vatStatus,
    citRateStatus: citStatus
  };
}

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

function extractFeishuText(field: unknown): string {
  const value = extractFieldValue(field);
  if (value === undefined || value === null) return '';
  return String(value);
}

function extractFeishuNumber(field: unknown): number {
  const value = extractFieldValue(field);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function extractJsonField(field: unknown): any {
  const raw = extractFeishuText(field);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// 根据综合得分获取风险等级
function getRiskLevel(score: number): { level: string; color: typeof RISK_COLORS.low } {
  if (score >= 80) return { level: 'low', color: RISK_COLORS.low };
  if (score >= 60) return { level: 'medium', color: RISK_COLORS.medium };
  if (score >= 40) return { level: 'mediumHigh', color: RISK_COLORS.mediumHigh };
  if (score >= 20) return { level: 'high', color: RISK_COLORS.high };
  return { level: 'critical', color: RISK_COLORS.critical };
}

// 创建标题段落
function createTitle(text: string, size: number = 32, color: string = '2b6cb0'): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size: size, color: color })]
  });
}

// 创建一级标题
function createHeading1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '2b6cb0', space: 4 }
    },
    children: [new TextRun({ text, bold: true, size: 28, color: '2b6cb0' })]
  });
}

// 创建二级标题
function createHeading2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 24, color: '3182ce' })]
  });
}

// 创建普通段落
function createParagraph(text: string, options: { bold?: boolean; color?: string; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text,
      bold: options.bold || false,
      color: options.color || '333333',
      size: options.size || 21
    })]
  });
}

// 创建带标签的信息行
function createInfoRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + '：', bold: true, size: 21, color: '555555' }),
      new TextRun({ text: value || '-', size: 21, color: '333333' })
    ]
  });
}

// 创建表头单元格
function createHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '2b6cb0' },
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'ffffff', size: 21 })]
    })]
  });
}

// 创建数据单元格
function createDataCell(text: string, options: { align?: 'center' | 'left' | 'right'; color?: string; bold?: boolean; bgColor?: string } = {}): TableCell {
  const align = options.align === 'center' ? AlignmentType.CENTER :
                options.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT;
  return new TableCell({
    ...(options.bgColor ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: options.bgColor } } : {}),
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({
        text: text || '-',
        size: 20,
        color: options.color || '333333',
        bold: options.bold || false
      })]
    })]
  });
}

// 创建带差异高亮的单元格（用于变更记录对比）
function createDiffCell(mainText: string, compareText: string, isAfter: boolean): TableCell {
  if (!mainText) return createDataCell('-', { size: 18, color: '888888' } as any);
  
  // 按分号分割成条目
  const mainItems = mainText.split(/[；;]/).filter(s => s.trim());
  const compItems = compareText.split(/[；;]/).filter(s => s.trim());
  
  // 如果条目太少（无法有效对比），直接返回全文
  if (mainItems.length <= 1 && compItems.length <= 1) {
    return createDataCell(mainText, {
      size: 18,
      color: isAfter ? '2b6cb0' : '888888'
    } as any);
  }
  
  // 提取每条的键名（冒号前部分）
  const extractKey = (item: string): string => {
    const idx = item.indexOf('：');
    const idx2 = item.indexOf(':');
    const cutIdx = idx >= 0 ? idx : (idx2 >= 0 ? idx2 : -1);
    return cutIdx >= 0 ? item.substring(0, cutIdx).trim() : item.trim();
  };
  
  // 建立对比端的 key→value 映射
  const compMap = new Map<string, string>();
  compItems.forEach(item => {
    const key = extractKey(item);
    if (key) compMap.set(key, item.trim());
  });
  
  // 生成带样式的 TextRun 数组
  const runs: TextRun[] = [];
  mainItems.forEach((item, i) => {
    const key = extractKey(item);
    const compItem = key ? compMap.get(key) : undefined;
    const isChanged = !compItem || compItem !== item.trim();
    
    runs.push(new TextRun({
      text: item.trim() + (i < mainItems.length - 1 ? '；' : ''),
      size: 18,
      color: isChanged ? (isAfter ? 'DC2626' : '666666') : (isAfter ? '2b6cb0' : '999999'),
      bold: isChanged && isAfter,
      highlight: isChanged ? 'yellow' : undefined
    }));
  });
  
  return new TableCell({
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 276 },
      children: runs
    })]
  });
}

// 构建五大维度答题详情区块
function buildDimensionSection(dimName: string, questionKeys: string[], answers: Record<string, number>): any[] {
  const items: any[] = [];
  
  // 维度标题
  items.push(createHeading2(dimName));
  
  // 统计该维度高/中/低风险数量
  let highCount = 0, mediumCount = 0, lowCount = 0;
  questionKeys.forEach(key => {
    const ans = answers[key] ?? 0;
    if (ans >= 2) highCount++;
    else if (ans === 1) mediumCount++;
    else lowCount++;
  });
  
  // 维度概览
  items.push(new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({ text: `共 ${questionKeys.length} 题`, size: 19, color: '666666' }),
      new TextRun({ text: `  🔴高风险 ${highCount}项`, bold: true, size: 19, color: RISK_COLORS.high.text }),
      new TextRun({ text: `  🟡中风险 ${mediumCount}项`, bold: true, size: 19, color: RISK_COLORS.medium.text }),
      new TextRun({ text: `  🟢低风险 ${lowCount}项`, bold: true, size: 19, color: RISK_COLORS.low.text }),
    ]
  }));
  
  // 逐题展示
  questionKeys.forEach((qKey, idx) => {
    const qInfo = V5_QUESTIONS[qKey];
    const answer = answers[qKey] ?? 0;
    const answerText = ANSWER_OPTIONS[answer] || '未知';
    const answerColor = ANSWER_COLORS[answer] || '333333';
    const levelText = answer >= 2 ? '高风险' : answer === 1 ? '中风险' : '低风险';
    const levelColor = answer >= 2 ? RISK_COLORS.high.text : answer === 1 ? RISK_COLORS.medium.text : RISK_COLORS.low.text;
    const levelIcon = answer >= 2 ? '🔴' : answer === 1 ? '🟡' : '🟢';
    
    if (!qInfo) return;
    
    // 题目标题
    items.push(new Paragraph({
      spacing: { before: 200, after: 80 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F7FAFC' },
      children: [
        new TextRun({ text: `${idx + 1}. ${qInfo.question}`, bold: true, size: 20, color: '2d3748' }),
      ]
    }));
    
    // 用户选项 + 风险判定
    items.push(new Paragraph({
      spacing: { after: 60, left: 200 },
      children: [
        new TextRun({ text: '您的选择：', bold: true, size: 18, color: '555555' }),
        new TextRun({ text: answerText, bold: true, size: 18, color: answerColor }),
        new TextRun({ text: '   |   ', size: 18, color: 'cccccc' }),
        new TextRun({ text: '风险判定：', bold: true, size: 18, color: '555555' }),
        new TextRun({ text: `${levelIcon} ${levelText}`, bold: true, size: 18, color: levelColor }),
      ]
    }));
    
    // 风险影响（仅中高风险显示）
    if (answer >= 1) {
      items.push(new Paragraph({
        spacing: { after: 60, left: 200 },
        children: [
          new TextRun({ text: '风险影响：', bold: true, size: 18, color: '555555' }),
          new TextRun({ text: qInfo.consequence, size: 18, color: '444444' }),
        ]
      }));
    }
    
    // 政策依据及具体条文
    items.push(new Paragraph({
      spacing: { after: 60, left: 200 },
      children: [
        new TextRun({ text: '政策依据：', bold: true, size: 18, color: '555555' }),
        new TextRun({ text: qInfo.taxPolicy, size: 18, color: '2b6cb0' }),
      ]
    }));
    
    // 政策具体条文
    items.push(new Paragraph({
      spacing: { after: 160, left: 400 },
      children: [
        new TextRun({ text: qInfo.policyContent, size: 17, color: '666666', italics: true }),
      ]
    }));
  });
  
  return items;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskId = searchParams.get('riskId');
    const adminToken = searchParams.get('admin_token');

    if (!riskId) {
      return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
    }

    // 验证管理员密钥
    if (adminToken !== ADMIN_TOKEN) {
      return NextResponse.json({ error: '管理员密钥无效' }, { status: 403 });
    }

    // 从飞书获取报告数据
    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ error: '获取飞书token失败' }, { status: 500 });
    }

    // 查询飞书记录
    const queryRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: '检测ID', operator: 'is', value: [riskId] }]
        },
        page_size: 1
      })
    });

    const queryData = await queryRes.json();
    if (!queryData.data?.items || queryData.data.items.length === 0) {
      return NextResponse.json({ error: '未找到该检测报告' }, { status: 404 });
    }

    const recordItem = queryData.data.items[0];
    const record = recordItem.fields;
    const recordId = recordItem.record_id;

    // 检查是否已有完整报告附件：有就直接从飞书下载返回，避免重复生成
    const reportAttachment = record['完整报告'];
    if (reportAttachment && Array.isArray(reportAttachment) && reportAttachment.length > 0) {
      const fileToken = reportAttachment[0].file_token;
      const fileName = reportAttachment[0].name || '财税风险检测报告.docx';
      if (fileToken) {
        try {
          const downloadRes = await fetch(`https://open.feishu.cn/open-apis/drive/v1/medias/${fileToken}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (downloadRes.ok) {
            const fileBuffer = await downloadRes.arrayBuffer();
            return new NextResponse(Buffer.from(fileBuffer), {
              status: 200,
              headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
                'X-Report-Source': 'feishu-attachment'
              }
            });
          }
        } catch (e) {
          // 下载失败，继续走生成流程
          console.warn('从飞书下载附件失败，将重新生成报告:', e);
        }
      }
    }

    // 提取数据
    const companyName = extractFeishuText(record['企业名称']);
    const creditCode = extractFeishuText(record['统一信用代码']);
    const contact = extractFeishuText(record['联系人']);
    const phone = extractFeishuText(record['联系电话']);
    const industry = extractFeishuText(record['所属行业']);
    const revenueScale = extractFeishuText(record['年营收规模']);
    const period = extractFeishuText(record['所属期']);
    const testTime = extractFeishuText(record['检测时间']);

    const revenue = extractFeishuNumber(record['营业收入(万元)']);
    const cost = extractFeishuNumber(record['营业成本(万元)']);
    const grossMargin = extractFeishuNumber(record['毛利率']);
    const vatPaid = extractFeishuNumber(record['实缴增值税(万元)']);
    const vatRate = extractFeishuNumber(record['增值税税负率']);
    const citPaid = extractFeishuNumber(record['实缴所得税(万元)']);
    const citRate = extractFeishuNumber(record['所得税贡献率']);
    const totalAssets = extractFeishuNumber(record['总资产(万元)']);
    const totalLiabilities = extractFeishuNumber(record['总负债(万元)']);
    const debtRatio = extractFeishuNumber(record['资产负债率']);

    const totalScore = extractFeishuNumber(record['综合得分']);
    const riskLevel = extractFeishuText(record['综合风险等级']);
    const lowCount = extractFeishuNumber(record['低风险项数']);
    const mediumCount = extractFeishuNumber(record['中风险项数']);
    const highCount = extractFeishuNumber(record['高风险项数']);

    const riskDetails = extractJsonField(record['风险项明细']);
    const reportContent = extractJsonField(record['报告内容']);
    const financialIndicators = extractJsonField(record['财务指标']);
    const crossValidation = extractJsonField(record['交叉验证结果']);
    
    // 计算行业基准对比（不依赖飞书字段结构，直接本地计算，避免结构不一致导致显示为空）
    const industryBench = calcIndustryBenchmark(industry, grossMargin, vatRate, citRate);
    const benchData = { ...industryBench, ...(financialIndicators || {}) };
    
    // 读取问卷明细（20道题答案）
    const surveyDetailRaw = extractJsonField(record['问卷明细']);
    const surveyAnswers: Record<string, number> = {};
    if (surveyDetailRaw && typeof surveyDetailRaw === 'object') {
      for (let i = 1; i <= 20; i++) {
        const key = `q${i}`;
        surveyAnswers[key] = Number(surveyDetailRaw[key]) || 0;
      }
    }
    // 提取并转换企查查工商信息
    // 兼容三种格式：旧格式(Result=基础信息) / 410+213格式(basicInfo+annualReport) / 2006合作风险排查格式(Result.VerifyResult+Data)
    const rawBusinessInfo = extractJsonField(record['工商信息']);
    
    // 判断是否为2006格式
    const isRiskScanFormat = rawBusinessInfo?.Result?.VerifyResult !== undefined
      && rawBusinessInfo?.Result?.Data !== undefined;
    
    let businessInfo: any = null;
    let annualReport: any = null;
    let riskScanData: any = null;
    
    if (isRiskScanFormat) {
      const riskData = rawBusinessInfo.Result.Data;
      businessInfo = transformQccInfo(riskData);
      annualReport = null; // 2006没有详细年报
      riskScanData = transformRiskScanData(riskData);
    } else {
      const basicResult = rawBusinessInfo?.basicInfo || rawBusinessInfo?.Result || null;
      businessInfo = basicResult ? transformQccInfo(basicResult) : null;
      const annualReportList = rawBusinessInfo?.annualReport || [];
      annualReport = annualReportList.length > 0 ? transformAnnualReport(annualReportList) : null;
    }

    function transformQccInfo(result: any) {
      if (!result) return null;
      return {
        name: result.Name || '',
        status: result.Status || '',
        creditCode: result.CreditCode || '',
        regNo: result.No || '',
        orgNo: result.OrgNo || '',
        operName: result.OperName || '',
        taxpayerType: result.TaxpayerType || '',
        personScope: result.PersonScope || '',
        insuredCount: result.InsuredCount || '',
        registCapi: result.RegistCapi || '',
        registeredCapital: result.RegisteredCapital || '',
        paidUpCapital: result.PaidUpCapital ? (result.PaidUpCapital + (result.PaidUpCapitalUnit || '') + (result.PaidUpCapitalCCY === 'CNY' ? '元人民币' : '')) : '',
        realCapi: result.RealCapi || '',
        startDate: result.StartDate ? result.StartDate.split(' ')[0] : '',
        checkDate: result.CheckDate ? result.CheckDate.split(' ')[0] : '',
        termStart: result.TermStart ? result.TermStart.split(' ')[0] : '',
        termEnd: result.TermEnd ? result.TermEnd.split(' ')[0] : '',
        econKind: result.EconKind || '',
        entType: result.EntType || '',
        belongOrg: result.BelongOrg || '',
        isSmall: result.IsSmall || '',
        scale: result.Scale || '',
        companyType: result.CompanyType || '',
        areaCode: result.AreaCode || '',
        address: result.Address || '',
        scope: result.Scope || '',
        province: result.Area?.Province || result.Province || '',
        city: result.Area?.City || result.City || '',
        county: result.Area?.County || result.County || '',
        industry: result.Industry?.Industry || '',
        subIndustry: result.Industry?.SubIndustry || '',
        qccIndustry: result.QccIndustry?.CName || result.QccIndustry?.BName || '',
        stockInfo: result.StockInfo ? {
          stockNumber: result.StockInfo.StockNumber || '',
          stockType: result.StockInfo.StockType || ''
        } : null,
        contactInfo: result.ContactInfo ? {
          tel: result.ContactInfo.Tel || '',
          email: result.ContactInfo.Email || ''
        } : null,
        originalName: Array.isArray(result.OriginalName) ? result.OriginalName.map((n: any) => n.Name || n).filter(Boolean) : [],
        imageUrl: result.ImageUrl || '',
        taxNo: result.TaxNo || '',
        imExCode: result.ImExCode || '',
        englishName: result.EnglishName || ''
      };
    }

    // 转换2006全量风险数据
    function transformRiskScanData(data: any) {
      if (!data) return null;
      return {
        // 工商扩展
        partners: Array.isArray(data.PartnerList) ? data.PartnerList.slice(0, 20).map((p: any) => ({
          name: p.StockName || '',
          type: p.StockType || '',
          percent: p.StockPercent || '',
          shouldCapi: p.ShouldCapi || '',
          subscribedCapital: p.SubscribedCapital || '',
          stakeDate: p.StakeDate ? p.StakeDate.split(' ')[0] : '',
          creditCode: p.CreditCode || '',
          area: p.Area || ''
        })) : [],
        employees: Array.isArray(data.EmployeeList) ? data.EmployeeList.slice(0, 20).map((e: any) => ({
          name: e.Name || '',
          job: e.Job || ''
        })) : [],
        branches: Array.isArray(data.BranchList) ? data.BranchList.slice(0, 20).map((b: any) => ({
          name: b.Name || '',
          creditCode: b.CreditCode || '',
          operName: b.OperName || '',
          startDate: b.StartDate ? b.StartDate.split(' ')[0] : '',
          status: b.Status || ''
        })) : [],
        changes: Array.isArray(data.ChangeList) ? data.ChangeList.slice(0, 20).map((c: any) => ({
          projectName: c.ProjectName || '',
          changeSubject: c.ChangeSubject || '',
          changeDate: c.ChangeDate ? c.ChangeDate.split(' ')[0] : '',
          before: Array.isArray(c.BeforeList) ? c.BeforeList.join('；') : '',
          after: Array.isArray(c.AfterList) ? c.AfterList.join('；') : ''
        })) : [],
        investments: Array.isArray(data.InvestmentList) ? data.InvestmentList.slice(0, 20).map((i: any) => ({
          name: i.Name || '',
          status: i.Status || '',
          fundedRatio: i.FundedRatio || '',
          shouldCapi: i.ShouldCapi || '',
          industry: i.Industry?.SubIndustry || i.Industry?.Industry || '',
          startDate: i.StartDate ? i.StartDate.split(' ')[0] : ''
        })) : [],
        adminLicenses: Array.isArray(data.AdminLicenseList) ? data.AdminLicenseList.slice(0, 10).map((a: any) => ({
          docNo: a.LicensDocNo || '',
          docName: a.LicensDocName || '',
          validityFrom: a.ValidityFrom ? a.ValidityFrom.split(' ')[0] : '',
          validityTo: a.ValidityTo ? a.ValidityTo.split(' ')[0] : '',
          office: a.LicensOffice || '',
          content: a.LicensContent || ''
        })) : [],
        tags: Array.isArray(data.TagList) ? data.TagList.map((t: any) => t.Name || '').filter(Boolean) : [],
        revokeInfo: data.RevokeInfo ? {
          cancelDate: data.RevokeInfo.CancelDate ? data.RevokeInfo.CancelDate.split(' ')[0] : '',
          cancelReason: data.RevokeInfo.CancelReason || '',
          revokeDate: data.RevokeInfo.RevokeDate ? data.RevokeInfo.RevokeDate.split(' ')[0] : '',
          revokeReason: data.RevokeInfo.RevokeReason || ''
        } : null,
        parent: data.Parent ? {
          name: data.Parent.Name || '',
          operName: data.Parent.OperName || '',
          status: data.Parent.Status || '',
          registCapi: data.Parent.RegistCapi || ''
        } : null,
        beneficiaries: Array.isArray(data.BeneficiaryList) ? data.BeneficiaryList.slice(0, 10).map((b: any) => ({
          name: b.Name || '',
          finalBenefitPercent: b.FinalBenefitPercent || '',
          reason: b.Reason || ''
        })) : [],
        actualControllers: Array.isArray(data.ActualControllerList) ? data.ActualControllerList.slice(0, 10).map((a: any) => ({
          name: a.Name || '',
          finalBenefitPercent: a.FinalBenefitPercent || '',
          controlPercent: a.ControlPercent || '',
          isActual: a.IsActual || ''
        })) : [],
        groupInfo: data.GroupInfo ? { name: data.GroupInfo.Name || '' } : null,
        mainProducts: Array.isArray(data.MainProductList) ? data.MainProductList : [],
        approveSites: Array.isArray(data.ApproveSiteList) ? data.ApproveSiteList.slice(0, 10).map((s: any) => ({
          name: s.Name || '',
          webAddress: s.WebAddress || '',
          domainName: s.DomainName || '',
          licenseNo: s.LesenceNo || ''
        })) : [],
        // 税务风险
        taxCreditList: Array.isArray(data.TaxCreditList) ? data.TaxCreditList.slice(0, 10).map((t: any) => ({
          year: t.Year || '',
          level: t.Level || '',
          org: t.Org || ''
        })) : [],
        taxOweNotice: data.TaxOweNotice ? {
          totalCount: Number(data.TaxOweNotice.TotalCount) || 0,
          totalAmount: data.TaxOweNotice.TotalAmount || '',
          items: Array.isArray(data.TaxOweNotice.DataList) ? data.TaxOweNotice.DataList.slice(0, 10).map((i: any) => ({
            title: i.Title || '',
            amount: i.Amount || '',
            newAmount: i.NewAmount || '',
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : '',
            publishOffice: i.PublishOffice || ''
          })) : []
        } : null,
        taxIllegal: data.TaxIllegal ? {
          totalCount: Number(data.TaxIllegal.TotalCount) || 0,
          items: Array.isArray(data.TaxIllegal.DataList) ? data.TaxIllegal.DataList.slice(0, 10).map((i: any) => ({
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : '',
            caseNature: i.CaseNature || '',
            taxGov: i.TaxGov || '',
            illegalContent: i.IllegalContent || '',
            punishContent: i.PunishContent || ''
          })) : []
        } : null,
        taxAbnormal: data.TaxAbnormal ? {
          totalCount: Number(data.TaxAbnormal.TotalCount) || 0,
          items: Array.isArray(data.TaxAbnormal.DataList) ? data.TaxAbnormal.DataList.slice(0, 10).map((i: any) => ({
            taxNo: i.TaxNo || '',
            addOffice: i.AddOffice || '',
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : ''
          })) : []
        } : null,
        taxHurry: data.TaxHurry ? {
          totalCount: Number(data.TaxHurry.TotalCount) || 0,
          items: Array.isArray(data.TaxHurry.DataList) ? data.TaxHurry.DataList.slice(0, 5).map((i: any) => ({
            taxCategory: i.TaxCategory || '',
            taxOwedAmt: i.TaxOwedAmt || '',
            deadlineDate: i.DeadlineDate ? i.DeadlineDate.split(' ')[0] : '',
            taxAuthority: i.TaxAuthority || ''
          })) : []
        } : null,
        // 监管与司法风险
        adminPenalty: data.AdminPenalty ? {
          totalCount: Number(data.AdminPenalty.TotalCount) || 0,
          totalAmount: data.AdminPenalty.TotalAmount || '',
          items: Array.isArray(data.AdminPenalty.DataList) ? data.AdminPenalty.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            reason: i.PunishReason || '',
            result: i.PunishResult || '',
            amount: i.PunishAmt || '',
            office: i.PunishOffice || '',
            date: i.PunishDate ? i.PunishDate.split(' ')[0] : ''
          })) : []
        } : null,
        exception: data.Exception ? {
          totalCount: Number(data.Exception.TotalCount) || 0,
          items: Array.isArray(data.Exception.DataList) ? data.Exception.DataList.slice(0, 10).map((i: any) => ({
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : '',
            addOffice: i.AddOffice || '',
            addReason: i.AddReason || ''
          })) : []
        } : null,
        seriousIllegal: data.SeriousIllegal ? {
          totalCount: Number(data.SeriousIllegal.TotalCount) || 0,
          items: Array.isArray(data.SeriousIllegal.DataList) ? data.SeriousIllegal.DataList.slice(0, 10).map((i: any) => ({
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : '',
            addOffice: i.AddOffice || '',
            addReason: i.AddReason || ''
          })) : []
        } : null,
        shiXin: data.ShiXin ? {
          totalCount: Number(data.ShiXin.TotalCount) || 0,
          totalAmount: data.ShiXin.TotalAmount || '',
          items: Array.isArray(data.ShiXin.DataList) ? data.ShiXin.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            executeCourt: i.ExecuteCourt || '',
            amount: i.Amount || '',
            executeStatus: i.ExecuteStatus || '',
            actionRemark: i.ActionRemark || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : ''
          })) : []
        } : null,
        zhiXing: data.ZhiXing ? {
          totalCount: Number(data.ZhiXing.TotalCount) || 0,
          totalAmount: data.ZhiXing.TotalAmount || '',
          items: Array.isArray(data.ZhiXing.DataList) ? data.ZhiXing.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            biaoDi: i.BiaoDi || '',
            executeCourt: i.ExecuteCourt || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : ''
          })) : []
        } : null,
        equityFreeze: data.EquityFreeze ? {
          totalCount: Number(data.EquityFreeze.TotalCount) || 0,
          items: Array.isArray(data.EquityFreeze.DataList) ? data.EquityFreeze.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            beExecuted: i.BeExecuted || '',
            freezeCompany: i.FreezeCompany || '',
            equityAmount: i.EquityAmount || '',
            executeCourt: i.ExecuteCourt || '',
            status: i.Status || '',
            freezeStartDate: i.FreezeStartDate ? i.FreezeStartDate.split(' ')[0] : '',
            freezeEndDate: i.FreezeEndDate ? i.FreezeEndDate.split(' ')[0] : ''
          })) : []
        } : null,
        equityPledge: data.EquityPledge ? {
          totalCount: Number(data.EquityPledge.TotalCount) || 0,
          items: Array.isArray(data.EquityPledge.DataList) ? data.EquityPledge.DataList.slice(0, 10).map((i: any) => ({
            registerNo: i.RegisterNo || '',
            pledgorList: Array.isArray(i.PledgorList) ? i.PledgorList.join('、') : '',
            pledgeeList: Array.isArray(i.PledgeeList) ? i.PledgeeList.join('、') : '',
            relatedCompany: i.RelatedCompany || '',
            pledgedAmount: i.PledgedAmount || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : '',
            status: i.Status || ''
          })) : []
        } : null,
        bankruptcy: data.Bankruptcy ? {
          totalCount: Number(data.Bankruptcy.TotalCount) || 0,
          items: Array.isArray(data.Bankruptcy.DataList) ? data.Bankruptcy.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            publicDate: i.PublicDate ? i.PublicDate.split(' ')[0] : '',
            applicantList: Array.isArray(i.ApplicantList) ? i.ApplicantList.join('、') : '',
            respondentList: Array.isArray(i.RespondentList) ? i.RespondentList.join('、') : ''
          })) : []
        } : null,
        sumptuary: data.Sumptuary ? {
          totalCount: Number(data.Sumptuary.TotalCount) || 0,
          totalAmount: data.Sumptuary.TotalAmount || '',
          items: Array.isArray(data.Sumptuary.DataList) ? data.Sumptuary.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            companyName: i.CompanyName || '',
            relatedName: i.RelatedName || '',
            applicant: i.Applicant || '',
            amount: i.Amount || '',
            executeCourt: i.ExecuteCourt || '',
            publicDate: i.PublicDate ? i.PublicDate.split(' ')[0] : ''
          })) : []
        } : null,
        envPunishment: data.EnvPunishment ? {
          totalCount: Number(data.EnvPunishment.TotalCount) || 0,
          totalAmount: data.EnvPunishment.TotalAmount || '',
          items: Array.isArray(data.EnvPunishment.DataList) ? data.EnvPunishment.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            reason: i.PunishReason || '',
            result: i.PunishResult || '',
            amount: i.PunishAmt || '',
            office: i.PunishOffice || '',
            date: i.PunishDate ? i.PunishDate.split(' ')[0] : ''
          })) : []
        } : null,
        chattelMortgage: data.ChattelMortgage ? {
          totalCount: Number(data.ChattelMortgage.TotalCount) || 0,
          items: Array.isArray(data.ChattelMortgage.DataList) ? data.ChattelMortgage.DataList.slice(0, 10).map((i: any) => ({
            registerNo: i.RegisterNo || '',
            status: i.Status || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : '',
            secureClaimsAmount: i.SecureClaimsAmount || '',
            pledgor: Array.isArray(i.Pledger) ? i.Pledger.join('、') : '',
            pledgee: Array.isArray(i.Pledgee) ? i.Pledgee.join('、') : '',
            debtTerm: i.DebtTerm || ''
          })) : []
        } : null,
        liquidation: data.Liquidation ? {
          leader: data.Liquidation.Leader || '',
          member: data.Liquidation.Member || ''
        } : null,
        publicSecurityNotice: data.PublicSecurityNotice ? {
          totalCount: Number(data.PublicSecurityNotice.TotalCount) || 0,
          items: Array.isArray(data.PublicSecurityNotice.DataList) ? data.PublicSecurityNotice.DataList.slice(0, 5).map((i: any) => ({
            name: i.Name || '',
            caseReason: i.CaseReason || '',
            publishOffice: i.PublishOffice || '',
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : ''
          })) : []
        } : null,
        // 财务数据
        financialInformation: data.FinancialInformation ? {
          accountTitle: data.FinancialInformation.AccountTitle || '',
          amount: data.FinancialInformation.Amount || '',
          year: data.FinancialInformation.Year || ''
        } : null,
        // 产业链
        industryChainList: Array.isArray(data.IndustryChainList) ? data.IndustryChainList.map((c: any) => ({
          industryChainName: c.IndustryChainName || ''
        })) : []
      };
    }

    // 转换年报数据（取最新一年有详细信息的）
    function transformAnnualReport(reportList: any[]) {
      if (!reportList || reportList.length === 0) return null;
      
      const latest = reportList.find((r: any) => r.HasDetailInfo === 'True' || r.HasDetailInfo === true) 
        || reportList[0];
      
      if (!latest) return null;
      
      const basic = latest.BasicInfoData || {};
      const assets = latest.AssetsData || {};
      const social = latest.SocialInsurance || {};
      const partners = latest.PartnerList || [];
      const investments = latest.InvestInfoList || [];
      const stockChanges = latest.StockChangeList || [];
      const websites = latest.WebSiteList || [];
      const changes = latest.ChangeList || [];
      
      return {
        year: latest.Year || '',
        publishDate: latest.PublishDate ? latest.PublishDate.split(' ')[0] : '',
        employeeCount: basic.EmployeeCount || '',
        hasWebSite: basic.HasWebSite || '',
        status: basic.Status || '',
        totalAssets: assets.TotalAssets || '',
        totalEquity: assets.TotalOwnersEquity || '',
        totalLiabilities: assets.TotalLiabilities || '',
        revenue: assets.GrossTradingIncome || '',
        mainBusinessIncome: assets.MainBusinessIncome || '',
        totalProfit: assets.TotalProfit || '',
        netProfit: assets.NetProfit || '',
        totalTax: assets.TotalTaxAmount || '',
        governmentSubsidy: assets.GovernmentSubsidy || '',
        partners: partners.map((p: any) => ({
          name: p.Name || '',
          shouldCapi: p.ShouldCapi || '',
          shouldDate: p.ShouldDate || '',
          shouldType: p.ShouldType || '',
          realCapi: p.RealCapi || '',
          realDate: p.RealDate || '',
          realType: p.RealType || ''
        })),
        investments: investments.map((i: any) => ({
          name: i.Name || '',
          regNo: i.RegNo || ''
        })),
        stockChanges: stockChanges.map((s: any) => ({
          name: s.Name || '',
          before: s.Before || '',
          after: s.After || '',
          changeDate: s.ChangeDate ? s.ChangeDate.split(' ')[0] : ''
        })),
        websites: websites.map((w: any) => ({
          type: w.Type || '',
          name: w.Name || '',
          webSite: w.WebSite || ''
        })),
        changes: changes.map((c: any) => ({
          changeName: c.ChangeName || '',
          before: c.Before || '',
          after: c.After || '',
          changeDate: c.ChangeDate ? c.ChangeDate.split(' ')[0] : ''
        })),
        socialInsurance: {
          urbanBasicIns: social.UrbanBasicIns || '',
          employeeBasicIns: social.EmployeeBasicIns || '',
          maternityIns: social.MaternityIns || '',
          unemploymentIns: social.UnemploymentIns || '',
          industrialInjuryIns: social.IndustrialInjuryIns || ''
        }
      };
    }

    // 动态生成工商信息表格行（有数据才显示）
    // 构建企业工商信息表格行（v2 - 补全联系方式/地区/行业）
    function buildBusinessInfoRows(info: any): TableRow[] {
      const rows: TableRow[] = [];
      const scaleMap: Record<string, string> = { L: '大型', M: '中型', S: '小型', XS: '微型' };
      const companyTypeMap: Record<string, string> = {
        '1': '中央企业', '2': '地方国有企业', '3': '中央部委', '4': '地方政府',
        '5': '民营企业', '6': '其他', '7': '事业单位', '8': '个体工商户'
      };
      const pairs: [string, string, string, string][] = [
        // [左标签, 左值, 右标签, 右值]
        ['登记状态', info.status, '成立日期', info.startDate],
        ['法定代表人', info.operName, '企业类型', info.econKind],
        ['注册资本', info.registCapi, '实缴资本', info.paidUpCapital || info.realCapi],
        ['统一社会信用代码', info.creditCode, '注册号', info.regNo],
        ['纳税人识别号', info.taxNo, '组织机构代码', info.orgNo],
        ['纳税人资质', info.taxpayerType, '人员规模', info.personScope || (info.scale ? scaleMap[info.scale] : '')],
        ['参保人数', info.insuredCount + (info.insuredCount ? '人' : ''), '企业规模', info.scale ? scaleMap[info.scale] + '企业' : ''],
        ['登记机关', info.belongOrg, '核准日期', info.checkDate],
        ['司库企业属性', info.companyType ? companyTypeMap[info.companyType] || info.companyType : '', '小微企业', info.isSmall === '1' ? '是' : info.isSmall === '0' ? '否' : ''],
        ['进出口企业代码', info.imExCode, '英文名', info.englishName],
      ];

      for (const [leftLabel, leftVal, rightLabel, rightVal] of pairs) {
        const hasLeft = leftVal && leftVal !== '-';
        const hasRight = rightVal && rightVal !== '-';
        if (!hasLeft && !hasRight) continue;

        if (hasLeft && hasRight) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(leftLabel),
              createDataCell(leftVal, { align: 'center' }),
              createHeaderCell(rightLabel),
              createDataCell(rightVal, { align: 'center' })
            ]
          }));
        } else if (hasLeft) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(leftLabel),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  children: [new TextRun({ text: leftVal, size: 20 })]
                })]
              })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(rightLabel),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  children: [new TextRun({ text: rightVal, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      // 营业期限
      if (info.termStart || info.termEnd) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('营业期限'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({
                  text: (info.termStart || '-') + ' 至 ' + (info.termEnd || '长期'),
                  size: 20
                })]
              })]
            })
          ]
        }));
      }

      // 曾用名
      if (info.originalName && info.originalName.length > 0) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('曾用名'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.originalName.join(' → '), size: 20, color: '666666' })]
              })]
            })
          ]
        }));
      }

      // 上市信息
      if (info.isOnStock) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('上市状态'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({
                  text: '已上市' + (info.stockNumber ? ' · 股票代码：' + info.stockNumber : ''),
                  size: 20
                })]
              })]
            })
          ]
        }));
      }

      // 注册地址
      if (info.address) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('注册地址'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.address, size: 20 })]
              })]
            })
          ]
        }));
      }

      // 经营范围
      if (info.scope) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('经营范围'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.scope, size: 19, color: '555555' })]
              })]
            })
          ]
        }));
      }

      // 联系方式
      const tel = info.contactInfo?.tel;
      const email = info.contactInfo?.email;
      if (tel || email) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('联系电话'),
            createDataCell(tel || '-', { align: 'center' }),
            createHeaderCell('电子邮箱'),
            createDataCell(email || '-', { align: 'center' })
          ]
        }));
      }

      // 所属地区
      if (info.province || info.city || info.county) {
        const region = [info.province, info.city, info.county].filter(Boolean).join(' / ');
        const industry = [info.industry, info.subIndustry].filter(Boolean).join(' · ');
        rows.push(new TableRow({
          children: [
            createHeaderCell('所属地区'),
            createDataCell(region, { align: 'center' }),
            createHeaderCell('所属行业'),
            createDataCell(industry || '-', { align: 'center' })
          ]
        }));
      }

      return rows;
    }

    // 判断是否有有效的年报财务数据
    function hasAnnualFinancialData(report: any): boolean {
      if (!report) return false;
      const fields = ['totalAssets', 'revenue', 'totalProfit', 'netProfit', 'totalTax', 'totalLiabilities', 'totalEquity'];
      return fields.some(f => report[f] && report[f] !== '-' && report[f] !== '企业选择不公示' && report[f] !== '');
    }

    // 构建年报财务数据表格行
    function buildAnnualFinanceRows(report: any): TableRow[] {
      const rows: TableRow[] = [];
      const items: [string, string][] = [
        ['资产总额', report.totalAssets],
        ['负债总额', report.totalLiabilities],
        ['所有者权益合计', report.totalEquity],
        ['营业总收入', report.revenue],
        ['利润总额', report.totalProfit],
        ['净利润', report.netProfit],
        ['纳税总额', report.totalTax],
        ['政府补助', report.governmentSubsidy]
      ];

      const validItems = items.filter(([, val]) => val && val !== '-' && val !== '企业选择不公示' && val !== '');
      
      // 两两一行显示
      for (let i = 0; i < validItems.length; i += 2) {
        const [label1, val1] = validItems[i];
        const [label2, val2] = validItems[i + 1] || ['', ''];
        
        if (validItems[i + 1]) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              createDataCell(val1, { align: 'center' }),
              createHeaderCell(label2),
              createDataCell(val2, { align: 'center' })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: val1, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      return rows;
    }

    // 判断是否有社保数据
    function hasSocialInsuranceData(social: any): boolean {
      if (!social) return false;
      const fields = ['urbanBasicIns', 'employeeBasicIns', 'maternityIns', 'unemploymentIns', 'industrialInjuryIns'];
      return fields.some(f => social[f] && social[f] !== '-' && social[f] !== '');
    }

    // 构建社保信息表格行
    function buildAnnualSocialRows(social: any): TableRow[] {
      const rows: TableRow[] = [];
      const items: [string, string][] = [
        ['养老保险', social.urbanBasicIns],
        ['医疗保险', social.employeeBasicIns],
        ['失业保险', social.unemploymentIns],
        ['工伤保险', social.industrialInjuryIns],
        ['生育保险', social.maternityIns]
      ];

      const validItems = items.filter(([, val]) => val && val !== '-' && val !== '');

      for (let i = 0; i < validItems.length; i += 2) {
        const [label1, val1] = validItems[i];
        const [label2, val2] = validItems[i + 1] || ['', ''];
        
        if (validItems[i + 1]) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              createDataCell(val1, { align: 'center' }),
              createHeaderCell(label2),
              createDataCell(val2, { align: 'center' })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: val1, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      return rows;
    }

    // 构建2006合作风险扫描的全部模块（自适应：有数据才显示）
    function buildRiskScanSections(risk: any): any[] {
      const sections: any[] = [];

      // ===== 一、工商扩展信息 =====
      // 1. 股东信息
      if (risk.partners?.length > 0) {
        sections.push(createHeading2('股东信息'));
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('股东名称'),
              createHeaderCell('类型'),
              createHeaderCell('持股比例'),
              createHeaderCell('认缴出资'),
              createHeaderCell('首次持股日期')
            ]
          }),
          ...risk.partners.map((p: any) => new TableRow({
            children: [
              createDataCell(p.name || '-'),
              createDataCell(p.type || '-', { align: 'center' }),
              createDataCell(p.percent || '-', { align: 'center', bold: true, color: '2b6cb0' }),
              createDataCell(p.shouldCapi || p.subscribedCapital || '-', { align: 'center' }),
              createDataCell(p.stakeDate || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        // 数据来源备注
        sections.push(new Paragraph({
          children: [
            new TextRun({
              text: '注：股东信息来源于公开工商数据，持股比例、出资额、出资日期等详细信息因数据源限制可能不完整，如需完整信息请进一步查询。',
              size: 18,
              color: '888888',
              italics: true
            })
          ],
          spacing: { before: 120, after: 200 }
        }));
      }

      // 2. 主要人员
      if (risk.employees?.length > 0) {
        sections.push(createHeading2('主要人员'));
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('姓名'),
              createHeaderCell('职务')
            ]
          }),
          ...risk.employees.map((e: any) => new TableRow({
            children: [
              createDataCell(e.name || '-'),
              createDataCell(e.job || '-', { align: 'center' })
            ]
          }))
        ];
        // 两列并排显示，节省空间
        const twoColRows: TableRow[] = [];
        for (let i = 0; i < risk.employees.length; i += 2) {
          const e1 = risk.employees[i];
          const e2 = risk.employees[i + 1];
          twoColRows.push(new TableRow({
            children: [
              createHeaderCell('姓名'),
              createDataCell(e1?.name || '-'),
              createHeaderCell('职务'),
              createDataCell(e1?.job || '-'),
              ...(e2 ? [
                createHeaderCell('姓名'),
                createDataCell(e2.name || '-'),
                createHeaderCell('职务'),
                createDataCell(e2.job || '-')
              ] : [
                new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] })
              ])
            ]
          }));
        }
        // 还是用简洁的两列吧
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 3. 工商变更记录（最多10条）
      if (risk.changes?.length > 0) {
        sections.push(createHeading2('工商变更记录'));
        const changeItems = risk.changes.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('变更日期'),
              createHeaderCell('变更事项'),
              createHeaderCell('变更前'),
              createHeaderCell('变更后')
            ]
          }),
          ...changeItems.map((c: any) => {
            const beforeText = c.before || '';
            const afterText = c.after || '';
            return new TableRow({
              children: [
                createDataCell(c.changeDate || '-', { align: 'center' }),
                createDataCell(c.projectName || c.changeSubject || '-', { bold: true }),
                createDiffCell(beforeText, afterText, false),
                createDiffCell(afterText, beforeText, true)
              ]
            });
          })
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        if (risk.changes.length > 10) {
          sections.push(createParagraph(`（共${risk.changes.length}条变更记录，仅展示前10条）`, { size: 18, color: '999999' }));
        }
      }

      // 4. 对外投资（最多10条）
      if (risk.investments?.length > 0) {
        sections.push(createHeading2('对外投资'));
        const invItems = risk.investments.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('被投资企业'),
              createHeaderCell('持股比例'),
              createHeaderCell('认缴出资'),
              createHeaderCell('状态'),
              createHeaderCell('所属行业')
            ]
          }),
          ...invItems.map((i: any) => new TableRow({
            children: [
              createDataCell(i.name || '-'),
              createDataCell(i.fundedRatio || '-', { align: 'center', bold: true, color: '2b6cb0' }),
              createDataCell(i.shouldCapi || '-', { align: 'center' }),
              createDataCell(i.status || '-', { align: 'center' }),
              createDataCell(i.industry || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 5. 分支机构（最多10条）
      if (risk.branches?.length > 0) {
        sections.push(createHeading2('分支机构'));
        const branchItems = risk.branches.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('分支机构名称'),
              createHeaderCell('负责人'),
              createHeaderCell('成立日期'),
              createHeaderCell('登记状态')
            ]
          }),
          ...branchItems.map((b: any) => new TableRow({
            children: [
              createDataCell(b.name || '-'),
              createDataCell(b.operName || '-', { align: 'center' }),
              createDataCell(b.startDate || '-', { align: 'center' }),
              createDataCell(b.status || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 6. 行政许可资质
      if (risk.adminLicenses?.length > 0) {
        sections.push(createHeading2('行政许可资质'));
        const licItems = risk.adminLicenses.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('许可文件编号'),
              createHeaderCell('许可文件名称'),
              createHeaderCell('决定机关'),
              createHeaderCell('有效期至')
            ]
          }),
          ...licItems.map((l: any) => new TableRow({
            children: [
              createDataCell(l.docNo || l.licenceNo || l.fileNumber || '-', { size: 18 }),
              createDataCell(l.docName || l.licenceName || l.title || '-', { size: 18 }),
              createDataCell(l.office || l.department || l.organ || '-', { align: 'center', size: 18 }),
              createDataCell(l.validityTo || l.validTo || l.expireDate || '-', { align: 'center', size: 18 })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // ===== 企业核心人员补充 =====
      // 7. 实际控制人
      if (risk.actualControllers?.length > 0) {
        sections.push(createHeading2('实际控制人'));
        risk.actualControllers.slice(0, 5).forEach((p: any, idx: number) => {
          const name = p.name || p.personName || '-';
          const ratio = p.controlPercent || p.finalBenefitPercent || p.holdingRatio || p.ratio || '';
          const desc = ratio ? `（持股/控制比例：${ratio}）` : '';
          sections.push(createParagraph(`【${idx + 1}】${name}${desc}`, { size: 20 }));
        });
      }

      // 8. 受益人
      if (risk.beneficiaries?.length > 0) {
        sections.push(createHeading2('最终受益人'));
        risk.beneficiaries.slice(0, 5).forEach((p: any, idx: number) => {
          const name = p.name || p.personName || '-';
          const ratio = p.finalBenefitPercent || p.holdingRatio || p.ratio || '';
          const reason = p.reason ? ` · ${p.reason}` : '';
          const desc = ratio ? `（受益比例：${ratio}${reason}）` : '';
          sections.push(createParagraph(`【${idx + 1}】${name}${desc}`, { size: 20 }));
        });
      }

      // ===== 经营信息 =====
      // 9. 主营产品/业务
      if (risk.mainProducts?.length > 0) {
        sections.push(createHeading2('主营产品/业务'));
        const productNames = risk.mainProducts.map((p: any) => {
          if (typeof p === 'string') return p;
          return p.name || p.productName || p.prodName || '';
        }).filter(Boolean).slice(0, 15);
        if (productNames.length > 0) {
          sections.push(createParagraph('• ' + productNames.join('　• '), { size: 19, color: '555555' }));
        }
      }

      // 10. 企业标签
      if (risk.tags?.length > 0) {
        sections.push(createHeading2('企业标签'));
        const tagNames = risk.tags.map((t: any) => {
          if (typeof t === 'string') return t;
          return t.name || t.tagName || t.tag || '';
        }).filter(Boolean);
        if (tagNames.length > 0) {
          sections.push(createParagraph('🏷️ ' + tagNames.join('　|　'), { size: 19, color: '2b6cb0' }));
        }
      }

      // ===== 二、税务风险信息（重点高亮） =====
      const hasTaxRisk = (risk.taxCreditList?.length > 0) ||
        (risk.taxOweNotice?.totalCount > 0) ||
        (risk.taxIllegal?.totalCount > 0) ||
        (risk.taxAbnormal?.totalCount > 0) ||
        (risk.taxHurry?.totalCount > 0);

      if (hasTaxRisk) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'c53030', space: 4 } },
          children: [new TextRun({ text: '税务风险信息', bold: true, size: 26, color: 'c53030' })]
        }));

        // 纳税信用等级
        if (risk.taxCreditList?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '📊 纳税信用等级', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('评价年度'),
                createHeaderCell('信用等级'),
                createHeaderCell('评价单位')
              ]
            }),
            ...risk.taxCreditList.map((t: any) => new TableRow({
              children: [
                createDataCell(t.year || '-', { align: 'center' }),
                createDataCell(t.level || '-', { align: 'center', bold: true, 
                  color: t.level === 'A' ? '38a169' : 
                         t.level === 'B' ? '2b6cb0' :
                         t.level === 'M' ? 'd69e2e' :
                         t.level === 'C' ? 'dd6b20' :
                         t.level === 'D' ? 'c53030' : '333333'
                }),
                createDataCell(t.org || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 欠税公告（红色重点）
        if (risk.taxOweNotice?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚠️ 欠税公告（${risk.taxOweNotice.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('欠税税种'),
                createHeaderCell('欠税金额'),
                createHeaderCell('发布机关'),
                createHeaderCell('发布日期')
              ]
            }),
            ...risk.taxOweNotice.items.slice(0, 10).map((item: any) => new TableRow({
              children: [
                createDataCell(item.title || '-'),
                createDataCell(item.amount || '-', { align: 'center', bold: true, color: 'c53030' }),
                createDataCell(item.publishOffice || '-', { align: 'center' }),
                createDataCell(item.publishDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
          if (risk.taxOweNotice.totalCount > 10) {
            sections.push(createParagraph(`（共${risk.taxOweNotice.totalCount}条，仅展示前10条）`, { size: 18, color: '999999' }));
          }
        }

        // 税收违法（红色重点）
        if (risk.taxIllegal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚨 税收违法（${risk.taxIllegal.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.taxIllegal.items.slice(0, 5).forEach((item: any, idx: number) => {
            sections.push(createParagraph(
              `【${idx + 1}】${item.caseNature || ''}（${item.taxGov || ''}）`,
              { bold: true, color: 'c53030' }
            ));
            if (item.illegalContent) {
              sections.push(createParagraph(`违法事实：${item.illegalContent.substring(0, 200)}`, { size: 19, color: '555555' }));
            }
            if (item.punishContent) {
              sections.push(createParagraph(`处理结果：${item.punishContent.substring(0, 200)}`, { size: 19, color: 'c53030' }));
            }
            if (item.publishDate) {
              sections.push(createParagraph(`发布日期：${item.publishDate}`, { size: 18, color: '999999' }));
            }
          });
        }

        // 税务非正常户
        if (risk.taxAbnormal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🔴 税务非正常户（${risk.taxAbnormal.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.taxAbnormal.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `纳税人识别号：${item.taxNo || '-'} | 认定机关：${item.addOffice || '-'} | 认定日期：${item.addDate || '-'}`,
              { size: 20 }
            ));
          });
        }

        // 税务催缴
        if (risk.taxHurry?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⏰ 税务催缴（${risk.taxHurry.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.taxHurry.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `税种：${item.taxCategory || '-'} | 欠税额：${item.taxOwedAmt || '-'} | 限期：${item.deadlineDate || '-'} | 税务机关：${item.taxAuthority || '-'}`,
              { size: 20 }
            ));
          });
        }
      }

      // ===== 三、监管与司法风险 =====
      const hasLegalRisk = (risk.adminPenalty?.totalCount > 0) ||
        (risk.exception?.totalCount > 0) ||
        (risk.seriousIllegal?.totalCount > 0) ||
        (risk.shiXin?.totalCount > 0) ||
        (risk.zhiXing?.totalCount > 0) ||
        (risk.equityFreeze?.totalCount > 0) ||
        (risk.equityPledge?.totalCount > 0) ||
        (risk.bankruptcy?.totalCount > 0) ||
        (risk.sumptuary?.totalCount > 0) ||
        (risk.envPunishment?.totalCount > 0) ||
        (risk.chattelMortgage?.totalCount > 0) ||
        risk.liquidation ||
        (risk.publicSecurityNotice?.totalCount > 0);

      if (hasLegalRisk) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'dd6b20', space: 4 } },
          children: [new TextRun({ text: '监管与司法风险信息', bold: true, size: 26, color: 'dd6b20' })]
        }));

        // 行政处罚
        if (risk.adminPenalty?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `⚖️ 行政处罚（${risk.adminPenalty.totalCount}条 / 涉案金额约${risk.adminPenalty.totalAmount || '0'}万元）`, bold: true, size: 22, color: 'dd6b20' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('处罚日期'),
                createHeaderCell('处罚事由'),
                createHeaderCell('处罚结果'),
                createHeaderCell('处罚机关')
              ]
            }),
            ...risk.adminPenalty.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.date || '-', { align: 'center' }),
                createDataCell((item.reason || '').substring(0, 50), { size: 19 }),
                createDataCell((item.result || '').substring(0, 50) || item.amount + '元', { size: 19, color: 'dd6b20' }),
                createDataCell((item.office || '').substring(0, 20), { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
          if (risk.adminPenalty.totalCount > 5) {
            sections.push(createParagraph(`（共${risk.adminPenalty.totalCount}条，仅展示前5条）`, { size: 18, color: '999999' }));
          }
        }

        // 经营异常
        if (risk.exception?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚠️ 经营异常（${risk.exception.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('列入日期'),
                createHeaderCell('列入原因'),
                createHeaderCell('列入机关')
              ]
            }),
            ...risk.exception.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.addDate || '-', { align: 'center' }),
                createDataCell(item.addReason || '-'),
                createDataCell(item.addOffice || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 严重违法
        if (risk.seriousIllegal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚫 严重违法失信（${risk.seriousIllegal.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.seriousIllegal.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.addReason || ''}（${item.addOffice || ''}，${item.addDate || ''}）`,
              { size: 20 }
            ));
          });
        }

        // 失信被执行人
        if (risk.shiXin?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⛔ 失信被执行人（${risk.shiXin.totalCount}条 / 涉案金额约${risk.shiXin.totalAmount || '0'}万元）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('案号'),
                createHeaderCell('执行法院'),
                createHeaderCell('涉案金额'),
                createHeaderCell('履行情况')
              ]
            }),
            ...risk.shiXin.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell((item.caseNo || '').substring(0, 30), { size: 18 }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.amount ? item.amount + '元' : '-', { align: 'center', bold: true, color: 'c53030' }),
                createDataCell(item.executeStatus || '-', { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 被执行人
        if (risk.zhiXing?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `📋 被执行人（${risk.zhiXing.totalCount}条 / 涉案金额约${risk.zhiXing.totalAmount || '0'}万元）`, bold: true, size: 22, color: 'dd6b20' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('案号'),
                createHeaderCell('执行法院'),
                createHeaderCell('执行标的'),
                createHeaderCell('立案日期')
              ]
            }),
            ...risk.zhiXing.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell((item.caseNo || '').substring(0, 30), { size: 18 }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.biaoDi ? item.biaoDi + '元' : '-', { align: 'center' }),
                createDataCell(item.registerDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 股权冻结
        if (risk.equityFreeze?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `❄️ 股权冻结（${risk.equityFreeze.totalCount}条）`, bold: true, size: 22, color: 'dd6b20' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('被执行人'),
                createHeaderCell('冻结股权数额'),
                createHeaderCell('执行法院'),
                createHeaderCell('冻结期限')
              ]
            }),
            ...risk.equityFreeze.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.beExecuted || '-'),
                createDataCell(item.equityAmount || '-', { align: 'center', bold: true }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell((item.freezeStartDate || '') + ' ~ ' + (item.freezeEndDate || ''), { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 破产重整
        if (risk.bankruptcy?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `💀 破产重整（${risk.bankruptcy.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.bankruptcy.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.caseNo || ''} | 申请人：${item.applicantList || '-'} | 被申请人：${item.respondentList || '-'} | ${item.publicDate || ''}`,
              { size: 20 }
            ));
          });
        }

        // 限制高消费
        if (risk.sumptuary?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚫 限制高消费（${risk.sumptuary.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('涉案主体'),
                createHeaderCell('关联人员'),
                createHeaderCell('执行法院'),
                createHeaderCell('发布日期')
              ]
            }),
            ...risk.sumptuary.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.companyName || '-'),
                createDataCell(item.relatedName || '-', { align: 'center' }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.publicDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 环保处罚
        if (risk.envPunishment?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🌿 环保处罚（${risk.envPunishment.totalCount}条）`, bold: true, size: 22, color: '38a169' })
          ] }));
          risk.envPunishment.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.reason?.substring(0, 80) || ''}（处罚：${item.result?.substring(0, 50) || item.amount + '元'}，${item.office || ''}，${item.date || ''}）`,
              { size: 19 }
            ));
          });
        }

        // 股权出质
        if (risk.equityPledge?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `📌 股权出质（${risk.equityPledge.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.equityPledge.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• 出质人：${item.pledgorList || '-'} | 质权人：${item.pledgeeList || '-'} | 数额：${item.pledgedAmount || '-'} | 状态：${item.status || '-'} | 登记日期：${item.registerDate || ''}`,
              { size: 19 }
            ));
          });
        }

        // 动产抵押
        if (risk.chattelMortgage?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🏭 动产抵押（${risk.chattelMortgage.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.chattelMortgage.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• 登记号：${item.registerNo || '-'} | 担保债权：${item.secureClaimsAmount || '-'} | 抵押人：${item.pledgor || '-'} | 状态：${item.status || '-'} | 期限：${item.debtTerm || ''}`,
              { size: 19 }
            ));
          });
        }

        // 清算信息
        if (risk.liquidation) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚰️ 清算信息`, bold: true, size: 22, color: 'c53030' })
          ] }));
          sections.push(createInfoRow('清算组负责人', risk.liquidation.leader || '-'));
          sections.push(createInfoRow('清算组成员', risk.liquidation.member || '-'));
        }

        // 公安通告
        if (risk.publicSecurityNotice?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `👮 公安通告（${risk.publicSecurityNotice.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.publicSecurityNotice.items.slice(0, 3).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.name || ''}：${item.caseReason || ''}（${item.publishOffice || ''}，${item.publishDate || ''}）`,
              { size: 20 }
            ));
          });
        }
      }

      // ===== 四、其他信息 =====
      const hasOtherInfo = (risk.tags?.length > 0) ||
        (risk.adminLicenses?.length > 0) ||
        (risk.approveSites?.length > 0) ||
        risk.financialInformation ||
        (risk.beneficiaries?.length > 0) ||
        (risk.actualControllers?.length > 0) ||
        risk.parent ||
        risk.groupInfo ||
        (risk.mainProducts?.length > 0);

      if (hasOtherInfo) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2b6cb0', space: 4 } },
          children: [new TextRun({ text: '其他信息', bold: true, size: 26, color: '2b6cb0' })]
        }));

        // 企业标签
        if (risk.tags?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 50 }, children: [
            new TextRun({ text: '🏷️ 企业标签：', bold: true, size: 20, color: '555555' }),
            new TextRun({ text: risk.tags.join(' | '), size: 20, color: '2b6cb0' })
          ] }));
        }

        // 受益所有人
        if (risk.beneficiaries?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '👤 受益所有人', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.beneficiaries.slice(0, 5).forEach((b: any) => {
            sections.push(createParagraph(
              `• ${b.name || '-'} | 最终受益股份：${b.finalBenefitPercent || '-'}${b.reason ? ` | 判定理由：${b.reason.substring(0, 50)}` : ''}`,
              { size: 19 }
            ));
          });
        }

        // 实际控制人
        if (risk.actualControllers?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '🎯 实际控制人', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.actualControllers.slice(0, 5).forEach((a: any) => {
            sections.push(createParagraph(
              `• ${a.name || ''}（${a.isActual === '1' ? '实际控制人' : '疑似实际控制人'}）| 持股：${a.finalBenefitPercent || '-'} | 表决权：${a.controlPercent || '-'}`,
              { size: 19 }
            ));
          });
        }

        // 总公司
        if (risk.parent) {
          sections.push(createInfoRow('总公司', `${risk.parent.name || '-'}（${risk.parent.status || '-'}，注册资本：${risk.parent.registCapi || '-'}）`));
        }

        // 所属集团
        if (risk.groupInfo?.name) {
          sections.push(createInfoRow('所属集团', risk.groupInfo.name));
        }

        // 行政许可
        if (risk.adminLicenses?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `📜 行政许可（${risk.adminLicenses.length}条）`, bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.adminLicenses.slice(0, 5).forEach((a: any) => {
            sections.push(createParagraph(
              `• ${a.docName || a.docNo || ''}（${a.office || ''}）：有效期${a.validityFrom || '-'}至${a.validityTo || '-'}`,
              { size: 19 }
            ));
          });
        }

        // 财务数据（2006只有一条简要数据）
        if (risk.financialInformation) {
          sections.push(createHeading2('公开财务数据'));
          sections.push(createInfoRow('数据科目', risk.financialInformation.accountTitle || '-'));
          sections.push(createInfoRow('数额', risk.financialInformation.amount || '-'));
          sections.push(createInfoRow('年份', risk.financialInformation.year || '-'));
          sections.push(createParagraph('数据来源：企业公开披露信息，仅供参考', { size: 18, color: '999999' }));
        }

        // 主营产品
        if (risk.mainProducts?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 50 }, children: [
            new TextRun({ text: '📦 主营产品：', bold: true, size: 20, color: '555555' }),
            new TextRun({ text: risk.mainProducts.slice(0, 5).join('、'), size: 20, color: '333333' })
          ] }));
        }

        // 备案网站
        if (risk.approveSites?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `🌐 备案网站（${risk.approveSites.length}个）`, bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.approveSites.slice(0, 5).forEach((s: any) => {
            sections.push(createParagraph(
              `• ${s.name || '-'}：${s.webAddress || ''}（${s.licenseNo || ''}）`,
              { size: 19 }
            ));
          });
        }
      }

      // 数据来源说明
      if (sections.length > 0) {
        sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
          new TextRun({ text: '※ 以上工商及风险数据来源于企查查公开信息，仅供参考，具体以官方公示为准。', italics: true, size: 18, color: '999999' })
        ] }));
      }

      return sections;
    }

    const { color: riskColor } = getRiskLevel(totalScore);

    // 读取LOGO图片
    let logoImageBuffer: Buffer | null = null;
    let qrImageBuffer: Buffer | null = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        logoImageBuffer = fs.readFileSync(logoPath);
      }
      const qrPath = path.join(process.cwd(), 'public', 'wechat-qr.png');
      if (fs.existsSync(qrPath)) {
        qrImageBuffer = fs.readFileSync(qrPath);
      }
    } catch (e) {
      // 图片读取失败不影响报告生成
    }

    // 构建Word文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          // ========== 封面 ==========
          // 顶部留白
          new Paragraph({ spacing: { before: 600 }, children: [] }),

          // LOGO（顶部居中，品牌锚点）
          ...(logoImageBuffer ? [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new ImageRun({
              data: logoImageBuffer,
              transformation: { width: 120, height: 120 },
              type: 'jpg'
            })]
          })] : []),

          // 主标题
          createTitle('财税风险检测报告', 48, '2b6cb0'),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Tax Risk Assessment Report', size: 20, color: '718096', italics: true })]
          }),

          // 分隔线（视觉停顿，区分标题区与企业信息区）
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 500, after: 500 },
            children: [new TextRun({ text: '——————————', size: 20, color: 'cbd5e0' })]
          }),

          // 企业名称（第二层级，报告主体）
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: companyName || '__________', bold: true, size: 32, color: '2d3748' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `统一社会信用代码：${creditCode || '__________'}`, size: 20, color: '718096' })]
          }),

          // 综合得分卡片（视觉重心，报告核心结论）
          new Paragraph({ spacing: { before: 1000, after: 200 }, children: [] }),
          new Table({
            width: { size: 55, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: riskColor.bg },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 120 },
                        children: [new TextRun({ text: '综合得分', bold: true, size: 20, color: riskColor.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [new TextRun({ text: totalScore.toFixed(1), bold: true, size: 48, color: riskColor.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F7FAFC' },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 120 },
                        children: [new TextRun({ text: '风险等级', bold: true, size: 20, color: '718096' })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [new TextRun({ text: riskLevel || '评估中', bold: true, size: 32, color: riskColor.text })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // 底部信息（检测日期 + 机构名）
          new Paragraph({ spacing: { before: 1200, after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: `检测日期：${testTime || new Date().toLocaleDateString('zh-CN')}`, size: 20, color: 'a0aec0' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '慧根堂财税风险咨询', size: 18, color: 'cbd5e0' })]
          }),

          // 封面分页
          new Paragraph({
            children: [new PageBreak()]
          }),

          // ========== 一、企业档案 ==========
          createHeading1('一、企业档案'),
          createHeading2('检测基本信息'),
          createInfoRow('企业名称', companyName),
          createInfoRow('统一信用代码', creditCode),
          createInfoRow('所属行业', industry),
          createInfoRow('年营收规模', revenueScale),
          createInfoRow('所属期', period),
          createInfoRow('联系人', contact),
          createInfoRow('联系电话', phone),

          // 工商信息（如果有）
          ...(businessInfo && (businessInfo.status || businessInfo.name) ? [
            createHeading2('工商登记信息'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: buildBusinessInfoRows(businessInfo)
            })
          ] : []),

          // 2006风险扫描扩展模块（仅2006格式有数据时显示）
          ...(riskScanData ? buildRiskScanSections(riskScanData) : []),

          // 年报信息（如果有，410+213格式）
          ...(annualReport ? [
            createHeading2(`年报数据（${annualReport.year || '最新'}）`),
            createParagraph(`数据来源：企业工商公示年报，发布日期：${annualReport.publishDate || '未公示'}`, { size: 18, color: '888888' }),

            // 年报财务数据
            ...(hasAnnualFinancialData(annualReport) ? [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: buildAnnualFinanceRows(annualReport)
              })
            ] : []),

            // 股东出资信息
            ...(annualReport.partners && annualReport.partners.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('股东及出资信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('股东名称'),
                      createHeaderCell('认缴出资额'),
                      createHeaderCell('认缴时间'),
                      createHeaderCell('实缴出资额'),
                      createHeaderCell('实缴时间')
                    ]
                  }),
                  ...annualReport.partners.map((p: any) => new TableRow({
                    children: [
                      createDataCell(p.name || '-'),
                      createDataCell(p.shouldCapi ? p.shouldCapi + '万元' : '-', { align: 'center' }),
                      createDataCell(p.shouldDate || '-', { align: 'center' }),
                      createDataCell(p.realCapi ? p.realCapi + '万元' : '-', { align: 'center' }),
                      createDataCell(p.realDate || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 社保缴纳信息
            ...(hasSocialInsuranceData(annualReport.socialInsurance) ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('社保缴纳信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: buildAnnualSocialRows(annualReport.socialInsurance)
              })
            ] : []),

            // 对外投资信息
            ...(annualReport.investments && annualReport.investments.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('对外投资信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('序号'),
                      createHeaderCell('被投资企业名称'),
                      createHeaderCell('统一社会信用代码/注册号')
                    ]
                  }),
                  ...annualReport.investments.map((inv: any, idx: number) => new TableRow({
                    children: [
                      createDataCell(String(idx + 1), { align: 'center' }),
                      createDataCell(inv.name || '-'),
                      createDataCell(inv.regNo || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 股权变更信息
            ...(annualReport.stockChanges && annualReport.stockChanges.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('股权变更信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('股东'),
                      createHeaderCell('变更前比例'),
                      createHeaderCell('变更后比例'),
                      createHeaderCell('变更日期')
                    ]
                  }),
                  ...annualReport.stockChanges.map((s: any) => new TableRow({
                    children: [
                      createDataCell(s.name || '-'),
                      createDataCell(s.before || '-', { align: 'center' }),
                      createDataCell(s.after || '-', { align: 'center' }),
                      createDataCell(s.changeDate || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 从业人数等补充信息
            ...(annualReport.employeeCount && annualReport.employeeCount !== '企业选择不公示' ? [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
              createInfoRow('从业人数', annualReport.employeeCount)
            ] : [])
          ] : []),

          // ========== 二、风险概览 ==========
          createHeading1('二、风险概览'),
          createParagraph('本次检测从申报合规、发票管理、收入成本、费用利润、架构关联五大维度，对企业财税风险进行全面评估。'),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          // 风险统计概览表
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.low.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '低风险', bold: true, size: 22, color: RISK_COLORS.low.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(lowCount || 0), bold: true, size: 36, color: RISK_COLORS.low.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.low.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.medium.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '中风险', bold: true, size: 22, color: RISK_COLORS.medium.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(mediumCount || 0), bold: true, size: 36, color: RISK_COLORS.medium.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.medium.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.high.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '高风险', bold: true, size: 22, color: RISK_COLORS.high.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(highCount || 0), bold: true, size: 36, color: RISK_COLORS.high.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.high.text })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ========== 三、五大维度答题详情 ==========
          createHeading1('三、五大维度答题详情'),
          createParagraph('以下为本次检测20道问卷题目的答题情况、风险等级判定及相关税收政策依据，按五大维度分组展示。'),

          // 维度一：申报与纳税合规
          ...buildDimensionSection('申报与纳税合规',
            ['q1', 'q2', 'q3', 'q4'], surveyAnswers),

          // 维度二：发票管理
          ...buildDimensionSection('发票管理',
            ['q5', 'q6', 'q7', 'q8'], surveyAnswers),

          // 维度三：收入与成本
          ...buildDimensionSection('收入与成本',
            ['q9', 'q10', 'q11', 'q12'], surveyAnswers),

          // 维度四：费用与利润
          ...buildDimensionSection('费用与利润',
            ['q13', 'q14', 'q15', 'q16', 'q17'], surveyAnswers),

          // 维度五：架构与关联交易
          ...buildDimensionSection('架构与关联交易',
            ['q18', 'q19', 'q20'], surveyAnswers),

          // ========== 四、详细风险分析 ==========
          createHeading1('四、详细风险分析'),

          // 高风险项
          ...(reportContent?.highRiskItems?.length ? [
            createHeading2('🔴 高风险项'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fff5f5' },
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险项', bold: true, color: 'c53030', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fff5f5' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '所属维度', bold: true, color: 'c53030', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fff5f5' },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险影响与政策依据', bold: true, color: 'c53030', size: 20 })]
                      })]
                    })
                  ]
                }),
                ...reportContent.highRiskItems.map((item: any) => new TableRow({
                  children: [
                    createDataCell(item.name || '-', { bold: true, color: 'c53030' }),
                    createDataCell(item.module || '-', { align: 'center' }),
                    createDataCell(item.consequence || item.impact || '-')
                  ]
                }))
              ]
            }),
            new Paragraph({ spacing: { after: 200 }, children: [] })
          ] : []),

          // 中风险项
          ...(reportContent?.mediumRiskItems?.length ? [
            createHeading2('🟡 中风险项'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fffbeb' },
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险项', bold: true, color: 'd69e2e', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fffbeb' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '所属维度', bold: true, color: 'd69e2e', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'fffbeb' },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险影响与政策依据', bold: true, color: 'd69e2e', size: 20 })]
                      })]
                    })
                  ]
                }),
                ...reportContent.mediumRiskItems.map((item: any) => new TableRow({
                  children: [
                    createDataCell(item.name || '-', { bold: true, color: 'd69e2e' }),
                    createDataCell(item.module || '-', { align: 'center' }),
                    createDataCell(item.consequence || item.impact || '-')
                  ]
                }))
              ]
            }),
            new Paragraph({ spacing: { after: 200 }, children: [] })
          ] : []),

          // 低风险项（简要列出）
          ...(reportContent?.lowRiskItems?.length ? [
            createHeading2('🟢 合规项（无风险）'),
            createParagraph(`共 ${reportContent.lowRiskItems.length} 项合规：${reportContent.lowRiskItems.join('、')}`)
          ] : []),

          // ========== 五、财务指标分析 ==========
          createHeading1('五、财务指标分析'),

          // 5.1 客户填写的财务数据
          createHeading2('5.1 客户填写的财务数据'),
          createParagraph('以下为客户在检测时填写的原始财务数据：'),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('数据项目'),
                  createHeaderCell('金额（万元）')
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('营业收入', { bold: true }),
                  createDataCell(revenue ? `${revenue.toFixed(2)}` : '-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('营业成本', { bold: true }),
                  createDataCell(cost ? `${cost.toFixed(2)}` : '-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('实缴增值税', { bold: true }),
                  createDataCell(vatPaid ? `${vatPaid.toFixed(2)}` : '-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('实缴企业所得税', { bold: true }),
                  createDataCell(citPaid ? `${citPaid.toFixed(2)}` : '-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('总资产', { bold: true }),
                  createDataCell(totalAssets ? `${totalAssets.toFixed(2)}` : '-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('总负债', { bold: true }),
                  createDataCell(totalLiabilities ? `${totalLiabilities.toFixed(2)}` : '-', { align: 'center' })
                ]
              })
            ]
          }),

          createParagraph(''),

          // 5.2 财务指标与行业标准对比
          createHeading2('5.2 财务指标与行业标准对比'),
          createParagraph('基于上述财务数据计算核心指标，结合行业基准进行对比分析：'),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('指标名称'),
                  createHeaderCell('企业数值'),
                  createHeaderCell('行业正常范围'),
                  createHeaderCell('评估结果')
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('毛利率', { bold: true }),
                  createDataCell(grossMargin ? `${grossMargin.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(benchData.grossMarginBenchmark ? `${benchData.grossMarginBenchmark.min}% - ${benchData.grossMarginBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(benchData.grossMarginStatus || '-', {
                    align: 'center',
                    color: benchData.grossMarginStatus === '正常' ? '38a169' :
                           benchData.grossMarginStatus === '偏低' ? 'd69e2e' :
                           benchData.grossMarginStatus === '偏高' ? 'dd6b20' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('增值税税负率', { bold: true }),
                  createDataCell(vatRate ? `${vatRate.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(benchData.vatRateBenchmark ? `${benchData.vatRateBenchmark.min}% - ${benchData.vatRateBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(benchData.vatRateStatus || '-', {
                    align: 'center',
                    color: benchData.vatRateStatus === '正常' ? '38a169' :
                           benchData.vatRateStatus === '偏低预警' ? 'c53030' :
                           benchData.vatRateStatus === '偏高' ? 'dd6b20' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('所得税贡献率', { bold: true }),
                  createDataCell(citRate ? `${citRate.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(benchData.citRateBenchmark ? `${benchData.citRateBenchmark.min}% - ${benchData.citRateBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(benchData.citRateStatus || '-', {
                    align: 'center',
                    color: benchData.citRateStatus === '正常' ? '38a169' :
                           benchData.citRateStatus === '偏低预警' ? 'c53030' :
                           benchData.citRateStatus === '偏高' ? 'dd6b20' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('资产负债率', { bold: true }),
                  createDataCell(debtRatio ? `${debtRatio.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell('30% - 60%', { align: 'center' }),
                  createDataCell(
                    debtRatio === 0 ? '-' :
                    debtRatio < 30 ? '偏低（保守）' :
                    debtRatio <= 60 ? '正常' : '偏高（风险）',
                    {
                      align: 'center',
                      color: debtRatio === 0 ? '333333' :
                             debtRatio < 30 ? 'd69e2e' :
                             debtRatio <= 60 ? '38a169' : 'c53030'
                    }
                  )
                ]
              })
            ]
          }),

          // ========== 六、交叉验证结果 ==========
          createHeading1('六、交叉验证结果'),

          reportContent?.crossValidation?.length ? (
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createHeaderCell('验证项目'),
                    createHeaderCell('等级'),
                    createHeaderCell('详细说明')
                  ]
                }),
                ...reportContent.crossValidation.map((check: any) => new TableRow({
                  children: [
                    createDataCell(check.rule || '-', { bold: true }),
                    new TableCell({
                      shading: {
                        type: ShadingType.CLEAR,
                        color: 'auto',
                        fill: check.level === 'high' || check.levelIcon?.includes('🔴')
                          ? RISK_COLORS.high.bg
                          : RISK_COLORS.medium.bg
                      },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({
                          text: check.level === 'high' || check.levelIcon?.includes('🔴') ? '高风险' : '中风险',
                          bold: true,
                          color: check.level === 'high' || check.levelIcon?.includes('🔴')
                            ? RISK_COLORS.high.text
                            : RISK_COLORS.medium.text,
                          size: 20
                        })]
                      })]
                    }),
                    createDataCell(check.detail || '-')
                  ]
                }))
              ]
            })
          ) : createParagraph('各项指标交叉验证未发现明显异常。'),

          // ========== 七、建议与说明 ==========
          createHeading1('七、建议与说明'),
          createParagraph('1. 本报告基于企业填写的问卷数据及公开工商信息进行风险评估，仅供参考。'),
          createParagraph('2. 高风险项目建议尽快开展专项自查，必要时寻求专业财税顾问的帮助。'),
          createParagraph('3. 中风险项目应纳入日常税务管理重点关注范围，定期复核。'),
          createParagraph('4. 低风险项目仍需保持合规意识，持续做好日常税务管理工作。'),
          createParagraph('5. 如需进一步的税务风险诊断和应对方案，请联系专业财税顾问。'),

          new Paragraph({ spacing: { before: 800, after: 200 }, children: [] }),
          
          // 分隔线
          new Paragraph({
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '2b6cb0', space: 4 }
            },
            spacing: { after: 300 },
            children: []
          }),

          // 落款 - 联系方式
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: '慧根堂财税风险咨询', bold: true, size: 24, color: '2b6cb0' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: '专业财税风控服务提供商', size: 19, color: '718096' })]
          }),
          
          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '联系人：', bold: true, size: 20, color: '555555' }),
              new TextRun({ text: '张老师', size: 20, color: '2d3748' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: '咨询电话：', bold: true, size: 20, color: '555555' }),
              new TextRun({ text: '138-1294-3969', size: 20, color: '2d3748' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({ text: '微信咨询：', bold: true, size: 20, color: '555555' }),
              new TextRun({ text: '扫码添加专业顾问', size: 20, color: '2d3748' })
            ]
          }),

          // 微信二维码
          ...(qrImageBuffer ? [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new ImageRun({
              data: qrImageBuffer,
              transformation: { width: 130, height: 130 },
              type: 'png'
            })]
          })] : []),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '本报告仅供参考，不构成正式税务意见。具体涉税事项请以税务机关认定为准。', size: 16, color: 'aaaaaa' })]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${companyName || '企业'}_财税风险检测报告_${testTime || ''}.docx`.replace(/\s+/g, '_');

    // 上传到飞书多维表附件字段，避免下次重复生成
    try {
      if (token && recordId) {
        // 1. 上传文件到飞书云空间
        const formData = new FormData();
        formData.append('file_name', fileName);
        formData.append('parent_type', 'bitable_file');
        formData.append('parent_node', FEISHU_BASE_TOKEN);
        formData.append('size', String(buffer.length));
        // 将Buffer转成Blob
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        formData.append('file', blob, fileName);

        const uploadRes = await fetch('https://open.feishu.cn/open-apis/drive/v1/medias/upload_all', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        const uploadData = await uploadRes.json();

        if (uploadData.code === 0 && uploadData.data?.file_token) {
          const fileToken = uploadData.data.file_token;

          // 2. 更新多维表记录，写入附件字段
          await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/${recordId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              fields: {
                '完整报告': [{ file_token: fileToken, name: fileName }]
              }
            })
          });
        }
      }
    } catch (uploadErr) {
      // 上传失败不影响返回报告，只打日志
      console.warn('上传报告到飞书附件失败:', uploadErr);
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
