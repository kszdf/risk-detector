// 共享模块：v5 问卷题目映射 + 报告免责声明 + 风险分级 CTA
// 原在 risk-report / risk-v4-submit 两份接口各写一套，统一到此，避免改题不同步、改一处漏一处。

export interface V5QuestionInfo {
  module: string;
  moduleName: string;
  name: string;
  question: string;
  consequence: string;
  taxPolicy: string;
}

export const V5_QUESTION_MAPPING: Record<string, V5QuestionInfo> = {
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

// 报告免责声明（与前端约定：结果页底部固定位 + 报告页脚 + 每个预估数字旁 + 每条处罚法条后展示）
export const REPORT_DISCLAIMER = '本报告由系统依据公开税收法规与行业通用指标自动测算生成，仅供企业税务健康自查参考，不构成税务处理决定或权威专业意见；具体税务处理以主管税务机关认定及持证税务师意见为准。测算口径均为公开规则，数据来自您自主填报，可作为与专业顾问沟通的初步依据。';

export type RiskSeverity = 'high' | 'medium' | 'low';

// 把各接口里不一致的风险等级表示（中文"高风险"/emoji"🔴"等）归一化
export function normalizeSeverity(level: string): RiskSeverity {
  if (level.includes('高') || level.includes('🔴')) return 'high';
  if (level.includes('中') || level.includes('🟡') || level.includes('🟠')) return 'medium';
  return 'low';
}

// 按风险等级生成升单引导（前端据 variant 渲染 红/黄/灰 样式 + 极简表单）
export function buildRiskCta(level: string, riskId: string) {
  const severity = normalizeSeverity(level);
  if (severity === 'high') {
    return {
      variant: 'danger',
      title: '建议尽快预约一对一税务风险研判',
      description: '检测发现高风险项，涉及补税、滞纳金乃至罚款风险，建议由专业税务师结合您的实际账目出具可执行的整改路径。',
      form: { fields: ['name', 'phone', 'description'], hint: '填写后顾问将在 24 小时内与您联系' },
      sla: '24 小时内回复',
      riskId
    };
  }
  if (severity === 'medium') {
    return {
      variant: 'warning',
      title: '可预约轻咨询进一步确认',
      description: '存在中度风险项，建议补充资料由顾问判断是否需要调整。',
      form: { fields: ['name', 'phone', 'description'], hint: '填写后顾问将在 1 个工作日内与您联系' },
      sla: '1 个工作日内回复',
      riskId
    };
  }
  return {
    variant: 'normal',
    title: '暂未发现高风险，建议保持合规自查',
    description: '当前指标未见明显异常，建议持续关注申报与票据合规。',
    form: null,
    sla: '',
    riskId
  };
}
