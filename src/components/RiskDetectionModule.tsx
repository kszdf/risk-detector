'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PercentIcon,
  TargetIcon,
  LightbulbIcon,
  FileTextIcon,
} from '@/components/icons';

// 行业基准数据
const INDUSTRY_BENCHMARKS: Record<string, {
  vatRate: { min: number; max: number; warning: number; label: string };
  citRate: { min: number; max: number; warning: number; label: string };
  grossMargin: { min: number; max: number; warning: number; label: string };
  netMargin: { min: number; max: number; warning: number; label: string };
  debtRatio: { min: number; max: number; warning: number; label: string };
}> = {
  "商贸批发零售": {
    vatRate: { min: 0.9, max: 1.5, warning: 0.63, label: "增值税税负率" },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: "所得税贡献率" },
    grossMargin: { min: 5, max: 20, warning: 5, label: "毛利率" },
    netMargin: { min: 1, max: 4, warning: 0.5, label: "净利率" },
    debtRatio: { min: 40, max: 60, warning: 70, label: "资产负债率" }
  },
  "建筑工程": {
    vatRate: { min: 2.5, max: 3.5, warning: 1.75, label: "增值税税负率" },
    citRate: { min: 1.5, max: 3.0, warning: 1.0, label: "所得税贡献率" },
    grossMargin: { min: 8, max: 15, warning: 8, label: "毛利率" },
    netMargin: { min: 2, max: 6, warning: 1, label: "净利率" },
    debtRatio: { min: 60, max: 80, warning: 85, label: "资产负债率" }
  },
  "制造业": {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: "增值税税负率" },
    citRate: { min: 2.0, max: 4.0, warning: 1.2, label: "所得税贡献率" },
    grossMargin: { min: 15, max: 30, warning: 15, label: "毛利率" },
    netMargin: { min: 3, max: 8, warning: 2, label: "净利率" },
    debtRatio: { min: 40, max: 65, warning: 75, label: "资产负债率" }
  },
  "餐饮住宿": {
    vatRate: { min: 1.5, max: 2.5, warning: 1.05, label: "增值税税负率" },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: "所得税贡献率" },
    grossMargin: { min: 50, max: 65, warning: 50, label: "毛利率" },
    netMargin: { min: 5, max: 15, warning: 3, label: "净利率" },
    debtRatio: { min: 40, max: 60, warning: 70, label: "资产负债率" }
  },
  "服务业·咨询": {
    vatRate: { min: 2.5, max: 4.0, warning: 1.75, label: "增值税税负率" },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: "所得税贡献率" },
    grossMargin: { min: 40, max: 70, warning: 40, label: "毛利率" },
    netMargin: { min: 8, max: 20, warning: 5, label: "净利率" },
    debtRatio: { min: 30, max: 50, warning: 60, label: "资产负债率" }
  },
  "科技·软件": {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: "增值税税负率" },
    citRate: { min: 5.0, max: 12.0, warning: 3.0, label: "所得税贡献率" },
    grossMargin: { min: 40, max: 70, warning: 40, label: "毛利率" },
    netMargin: { min: 10, max: 25, warning: 8, label: "净利率" },
    debtRatio: { min: 30, max: 50, warning: 60, label: "资产负债率" }
  },
  "房地产": {
    vatRate: { min: 3.0, max: 5.0, warning: 2.1, label: "增值税税负率" },
    citRate: { min: 3.0, max: 6.0, warning: 2.0, label: "所得税贡献率" },
    grossMargin: { min: 25, max: 40, warning: 25, label: "毛利率" },
    netMargin: { min: 5, max: 15, warning: 3, label: "净利率" },
    debtRatio: { min: 70, max: 85, warning: 90, label: "资产负债率" }
  }
};

// 行业选项
const INDUSTRIES = [
  "商贸批发零售",
  "建筑工程",
  "制造业",
  "餐饮住宿",
  "服务业·咨询",
  "科技·软件",
  "房地产"
];

// 纳税人身份选项
const TAXPAYER_TYPES = [
  { value: 'general', label: '一般纳税人' },
  { value: 'small', label: '小规模纳税人' },
  { value: 'unknown', label: '不确定' }
];

// 7大类通用扫描（34项）
const GENERAL_RISK_CATEGORIES = [
  {
    category: "发票类预警",
    icon: "receipt",
    color: "#EF4444",
    lightColor: "rgba(239, 68, 68, 0.1)",
    items: [
      { id: "A1", name: "进销项发票品名是否匹配", options: ["匹配", "部分不匹配", "严重不匹配"], riskLevel: 5, planTag: "需整改" },
      { id: "A2", name: "发票红冲/作废比例是否异常", options: ["正常", "偶有异常", "比例>20%"], riskLevel: 4, planTag: "需关注" },
      { id: "A3", name: "进项发票是否长期滞留不勾选", options: ["无", "少量", "大量滞留"], riskLevel: 3, planTag: "需关注" },
      { id: "A4", name: "是否存在无真实业务的发票", options: ["不存在", "不确定", "存在"], riskLevel: 5, planTag: "需整改" },
      { id: "A5", name: "大额咨询费/服务费是否有真实业务", options: ["全部有", "部分存疑", "无业务支撑"], riskLevel: 4, planTag: "可筹划" }
    ]
  },
  {
    category: "收入类预警",
    icon: "income",
    color: "#F59E0B",
    lightColor: "rgba(245, 158, 11, 0.1)",
    items: [
      { id: "B1", name: "增值税与所得税收入差异是否>10%", options: ["基本一致", "差异10-20%", "差异>20%"], riskLevel: 5, planTag: "需整改" },
      { id: "B2", name: "是否存在私户收款未申报", options: ["无", "偶有", "常见"], riskLevel: 5, planTag: "需整改" },
      { id: "B3", name: "预收账款是否长期挂账不确认收入", options: ["无", "少量挂账", "大量挂账>20%"], riskLevel: 4, planTag: "可筹划" },
      { id: "B4", name: "视同销售业务是否已申报", options: ["已全部申报", "部分遗漏", "未申报"], riskLevel: 4, planTag: "需关注" },
      { id: "B5", name: "收入季度波动是否异常", options: ["正常", "波动较大", "异常波动>30%"], riskLevel: 3, planTag: "需关注" },
      { id: "B6", name: "线上平台流水与申报收入是否匹配", options: ["匹配", "略有差异", "差异较大"], riskLevel: 4, planTag: "需整改" }
    ]
  },
  {
    category: "成本类预警",
    icon: "cost",
    color: "#8B5CF6",
    lightColor: "rgba(139, 92, 246, 0.1)",
    items: [
      { id: "C1", name: "成本费用与取得发票金额是否匹配", options: ["匹配", "部分无票", "大量无票"], riskLevel: 4, planTag: "需整改" },
      { id: "C2", name: "是否存在白条/收据入账", options: ["无", "少量", "较多"], riskLevel: 5, planTag: "需整改" },
      { id: "C3", name: "期末存货是否异常", options: ["正常", "偏高", "为负或远超资本"], riskLevel: 4, planTag: "需关注" },
      { id: "C4", name: "成本与收入变动趋势是否背离", options: ["同步变动", "略有偏离", "严重背离"], riskLevel: 4, planTag: "可筹划" },
      { id: "C5", name: "存货账实是否相符", options: ["相符", "略有差异", "差异较大"], riskLevel: 4, planTag: "需整改" }
    ]
  },
  {
    category: "费用类预警",
    icon: "expense",
    color: "#10B981",
    lightColor: "rgba(16, 185, 129, 0.1)",
    items: [
      { id: "D1", name: "工资薪金与个税申报数据是否匹配", options: ["匹配", "略有差异", "差异较大"], riskLevel: 5, planTag: "需整改" },
      { id: "D2", name: "期间费用'其他'项占比是否过高", options: ["正常", "偏高", "占比>30%"], riskLevel: 3, planTag: "需关注" },
      { id: "D3", name: "业务招待费/差旅费占收入比是否异常", options: ["正常", "偏高", "明显异常"], riskLevel: 3, planTag: "可筹划" },
      { id: "D4", name: "个人消费发票是否混入公司费用", options: ["无", "少量", "较多"], riskLevel: 4, planTag: "需整改" },
      { id: "D5", name: "利息费用扣除与发票是否一致", options: ["一致", "不确定", "不一致"], riskLevel: 3, planTag: "可筹划" }
    ]
  },
  {
    category: "往来款预警",
    icon: "transaction",
    color: "#06B6D4",
    lightColor: "rgba(6, 182, 212, 0.1)",
    items: [
      { id: "E1", name: "应收账款新增是否超过当年收入80%", options: ["未超过", "接近", "超过"], riskLevel: 4, planTag: "需关注" },
      { id: "E2", name: "应付账款新增是否超过当年收入80%", options: ["未超过", "接近", "超过"], riskLevel: 4, planTag: "需关注" },
      { id: "E3", name: "其他应收款是否长期大额挂账", options: ["无", "少量", "大额挂账"], riskLevel: 5, planTag: "可筹划" },
      { id: "E4", name: "其他应付款是否长期挂账无合理解释", options: ["无", "少量", "大额挂账"], riskLevel: 4, planTag: "需关注" },
      { id: "E5", name: "预收账款占收入比是否偏高", options: ["正常", "偏高", "占比>20%"], riskLevel: 4, planTag: "可筹划" }
    ]
  },
  {
    category: "税负类预警",
    icon: "tax",
    color: "#EC4899",
    lightColor: "rgba(236, 72, 153, 0.1)",
    items: [
      { id: "F1", name: "增值税税负率是否长期低于行业水平", options: ["正常", "偏低", "明显偏低"], riskLevel: 5, planTag: "需整改" },
      { id: "F2", name: "企业所得税税负率是否偏低", options: ["正常", "偏低", "明显偏低"], riskLevel: 4, planTag: "可筹划" },
      { id: "F3", name: "销售额与应纳税额变动弹性是否异常", options: ["正常", "不确定", "异常"], riskLevel: 4, planTag: "需关注" },
      { id: "F4", name: "税负率同比波动是否>30%", options: ["正常", "有波动但合理", "异常波动"], riskLevel: 4, planTag: "需关注" }
    ]
  },
  {
    category: "资产类预警",
    icon: "asset",
    color: "#6366F1",
    lightColor: "rgba(99, 102, 241, 0.1)",
    items: [
      { id: "G1", name: "固定资产一次性扣除是否符合规定", options: ["合规", "不确定", "超范围扣除"], riskLevel: 3, planTag: "可筹划" },
      { id: "G2", name: "资产减值损失是否已做纳税调增", options: ["已调增", "部分遗漏", "未调增"], riskLevel: 3, planTag: "需关注" },
      { id: "G3", name: "不征税收入形成的资产折旧是否已调增", options: ["已调增", "不确定", "未调增"], riskLevel: 3, planTag: "可筹划" },
      { id: "G4", name: "无形资产/长期待摊费用摊销是否合规", options: ["合规", "不确定", "不合规"], riskLevel: 3, planTag: "可筹划" }
    ]
  }
];

// 行业专属风险项
const INDUSTRY_RISK_ITEMS: Record<string, Array<{
  id: string;
  name: string;
  type: string;
  options?: string[];
  unit?: string;
  planLevel: string;
}>> = {
  "商贸批发零售": [
    { id: "r1", name: "进销项品名匹配度", type: "select", options: ["高度匹配", "部分不匹配", "明显不匹配"], planLevel: "需整改" },
    { id: "r2", name: "私户收款情况", type: "select", options: ["无", "偶有", "常见"], planLevel: "需整改" },
    { id: "r3", name: "存货周转天数", type: "number", unit: "天", planLevel: "需关注" },
    { id: "r4", name: "未开票收入是否申报", type: "select", options: ["全部申报", "部分申报", "未申报"], planLevel: "需整改" },
    { id: "r5", name: "供应商小规模纳税人占比", type: "number", unit: "%", planLevel: "可筹划" },
    { id: "r6", name: "采购渠道规范性(有无不要票降价)", type: "select", options: ["全部规范", "部分不规范", "大量无票采购"], planLevel: "可筹划" }
  ],
  "建筑工程": [
    { id: "r1", name: "人工成本占总成本比例", type: "number", unit: "%", planLevel: "需关注" },
    { id: "r2", name: "农民工工资发放方式", type: "select", options: ["专户代发", "现金发放", "包工头代发"], planLevel: "可筹划" },
    { id: "r3", name: "异地项目是否合规预缴", type: "select", options: ["全部合规预缴", "部分未预缴", "未预缴"], planLevel: "需整改" },
    { id: "r4", name: "分包抵扣占总进项比例", type: "number", unit: "%", planLevel: "需关注" },
    { id: "r5", name: "甲供材/清包工项目是否选简易计税", type: "select", options: ["合理选择", "未选择", "不清楚"], planLevel: "可筹划" },
    { id: "r6", name: "项目收入确认时点", type: "select", options: ["按完工进度", "按开票时点", "按收款时点"], planLevel: "可筹划" },
    { id: "r7", name: "材料采购有无白条入账", type: "select", options: ["无", "少量", "较多"], planLevel: "需整改" }
  ],
  "制造业": [
    { id: "r1", name: "存货与收入增长是否匹配", type: "select", options: ["同步增长", "存货增速远超收入", "收入增存货降"], planLevel: "需关注" },
    { id: "r2", name: "研发费用加计扣除", type: "select", options: ["正常享受", "突增300%以上", "未享受"], planLevel: "可筹划" },
    { id: "r3", name: "废料/副产品收入是否申报", type: "select", options: ["全部申报", "部分申报", "未申报"], planLevel: "需整改" },
    { id: "r4", name: "固定资产折旧方式", type: "select", options: ["直线法", "加速折旧", "未规范"], planLevel: "可筹划" },
    { id: "r5", name: "委托加工还是自产", type: "select", options: ["全部自产", "部分委托", "大量委托"], planLevel: "可筹划" },
    { id: "r6", name: "原材料采购发票合规率", type: "number", unit: "%", planLevel: "需整改" },
    { id: "r7", name: "仓库账实是否相符", type: "select", options: ["相符", "略有差异", "差异较大"], planLevel: "需整改" }
  ],
  "餐饮住宿": [
    { id: "r1", name: "食材采购发票获取率", type: "number", unit: "%", planLevel: "可筹划" },
    { id: "r2", name: "会员卡/预付卡税务处理", type: "select", options: ["规范处理", "未按期确认收入", "未处理"], planLevel: "可筹划" },
    { id: "r3", name: "房租是否取得合规发票", type: "select", options: ["全部有票", "部分无票", "全部无票"], planLevel: "可筹划" },
    { id: "r4", name: "连锁/多店核算是否独立", type: "select", options: ["独立核算", "混合核算"], planLevel: "可筹划" },
    { id: "r5", name: "外卖平台流水与申报收入差异", type: "select", options: ["基本一致", "差异10%以上", "差异30%以上"], planLevel: "需整改" },
    { id: "r6", name: "员工餐/试菜成本是否单独核算", type: "select", options: ["单独核算", "混入经营成本"], planLevel: "需关注" }
  ],
  "服务业·咨询": [
    { id: "r1", name: "人工成本占总成本比例", type: "number", unit: "%", planLevel: "需关注" },
    { id: "r2", name: "差旅费/业务招待费占收入比", type: "number", unit: "%", planLevel: "可筹划" },
    { id: "r3", name: "关联交易比例", type: "number", unit: "%", planLevel: "可筹划" },
    { id: "r4", name: "服务费列支是否有真实业务支撑", type: "select", options: ["全部有", "部分存疑", "大量无业务"], planLevel: "需整改" },
    { id: "r5", name: "咨询费/劳务费是否代扣代缴个税", type: "select", options: ["全部代扣", "部分遗漏", "未代扣"], planLevel: "需整改" },
    { id: "r6", name: "高管薪酬结构", type: "select", options: ["全部工资", "工资+绩效", "多样结构"], planLevel: "可筹划" }
  ],
  "科技·软件": [
    { id: "r1", name: "软硬件收入是否分开核算", type: "select", options: ["严格分开", "部分混同", "未分开"], planLevel: "可筹划" },
    { id: "r2", name: "增值税即征即退是否合规享受", type: "select", options: ["正常享受", "未享受", "不确定"], planLevel: "可筹划" },
    { id: "r3", name: "研发费用突增比例", type: "number", unit: "%", planLevel: "可筹划" },
    { id: "r4", name: "技术转让收入是否享免税", type: "select", options: ["合规享受", "未享受", "不适用"], planLevel: "可筹划" },
    { id: "r5", name: "高新/双软资质是否有效维护", type: "select", options: ["有效", "即将到期", "已失效"], planLevel: "可筹划" },
    { id: "r6", name: "外包开发费用是否取得合规发票", type: "select", options: ["全部合规", "部分不合规"], planLevel: "需关注" },
    { id: "r7", name: "人力成本占比", type: "number", unit: "%", planLevel: "需关注" }
  ],
  "房地产": [
    { id: "r1", name: "预售与清算阶段税负差异", type: "select", options: ["正常过渡", "长期预缴不清算", "不清楚"], planLevel: "可筹划" },
    { id: "r2", name: "土地成本抵减销售额是否合规", type: "select", options: ["合规", "不确定", "未抵减"], planLevel: "可筹划" },
    { id: "r3", name: "增值税预缴及时性", type: "select", options: ["按期预缴", "偶有延迟", "经常延迟"], planLevel: "需整改" },
    { id: "r4", name: "成本分摊方法", type: "select", options: ["建筑面积法", "层高系数法", "其他"], planLevel: "可筹划" },
    { id: "r5", name: "车位/储藏室税务处理", type: "select", options: ["规范处理", "未单独核算"], planLevel: "可筹划" },
    { id: "r6", name: "甲供材是否选择简易计税", type: "select", options: ["合理选择", "未选择", "不清楚"], planLevel: "可筹划" },
    { id: "r7", name: "项目公司注销前税务清算", type: "select", options: ["已清算", "正在清算", "未清算"], planLevel: "需整改" }
  ]
};

// 获取通用扫描项总数
const TOTAL_GENERAL_ITEMS = GENERAL_RISK_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0);

// 类型定义
interface FinancialData {
  year: string;
  revenue: string;
  cost: string;
  profit: string;
  vatPaid: string;
  citPaid: string;
  totalAssets: string;
  totalLiabilities: string;
}

interface RiskDetectionModuleProps {
  onBack?: () => void;
}

// 工具函数
const getRiskColor = (level: 'low' | 'medium' | 'high' | 'critical'): string => {
  switch (level) {
    case 'low': return '#34A853';
    case 'medium': return '#FBBC04';
    case 'high': return '#EA4335';
    case 'critical': return '#5F6368';
    default: return '#94A3B8';
  }
};

const getRiskBgColor = (level: 'low' | 'medium' | 'high' | 'critical'): string => {
  switch (level) {
    case 'low': return 'rgba(52, 168, 83, 0.15)';
    case 'medium': return 'rgba(251, 188, 4, 0.15)';
    case 'high': return 'rgba(234, 67, 53, 0.15)';
    case 'critical': return 'rgba(95, 99, 104, 0.15)';
    default: return 'rgba(148, 163, 184, 0.15)';
  }
};

const getRiskLabel = (level: 'low' | 'medium' | 'high' | 'critical'): string => {
  switch (level) {
    case 'low': return '低风险';
    case 'medium': return '中风险';
    case 'high': return '高风险';
    case 'critical': return '极高风险';
    default: return '未知';
  }
};

const getPlanTagColor = (tag: string): { bg: string; text: string } => {
  switch (tag) {
    case '可筹划': return { bg: 'rgba(52, 168, 83, 0.15)', text: '#34A853' };
    case '需关注': return { bg: 'rgba(251, 188, 4, 0.15)', text: '#F59E0B' };
    case '需整改': return { bg: 'rgba(234, 67, 53, 0.15)', text: '#EA4335' };
    default: return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8' };
  }
};

export default function RiskDetectionModule({ onBack }: RiskDetectionModuleProps) {
  // 步骤状态
  const [currentStep, setCurrentStep] = useState(1);
  
  // 基本信息
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxpayerType, setTaxpayerType] = useState('unknown');
  
  // 财务数据（3年）
  const currentYear = new Date().getFullYear();
  const [financialData, setFinancialData] = useState<FinancialData[]>([
    { year: String(currentYear - 2), revenue: '', cost: '', profit: '', vatPaid: '', citPaid: '', totalAssets: '', totalLiabilities: '' },
    { year: String(currentYear - 1), revenue: '', cost: '', profit: '', vatPaid: '', citPaid: '', totalAssets: '', totalLiabilities: '' },
    { year: String(currentYear), revenue: '', cost: '', profit: '', vatPaid: '', citPaid: '', totalAssets: '', totalLiabilities: '' }
  ]);
  
  // 通用风险扫描答案
  const [generalAnswers, setGeneralAnswers] = useState<Record<string, number>>({});
  
  // 行业风险答案
  const [industryAnswers, setIndustryAnswers] = useState<Record<string, string | number>>({});
  
  // 问卷展开状态
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedIndustry, setExpandedIndustry] = useState(false);
  
  // 检测结果
  const [showResults, setShowResults] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // 计算财务指标
  const financialMetrics = useMemo(() => {
    if (!industry) return [];
    
    const benchmarks = INDUSTRY_BENCHMARKS[industry];
    if (!benchmarks) return [];
    
    const metrics: Array<{
      key: string;
      label: string;
      values: { year: string; value: number; status: 'low' | 'medium' | 'high' | 'critical' | null }[];
      benchmark: { min: number; max: number; warning: number };
    }> = [];
    
    const metricKeys = ['vatRate', 'citRate', 'grossMargin', 'netMargin', 'debtRatio'] as const;
    
    metricKeys.forEach(key => {
      const benchmark = benchmarks[key];
      const values = financialData.map(fd => {
        const revenue = parseFloat(fd.revenue) || 0;
        if (revenue === 0) return { year: fd.year, value: 0, status: null as null };
        
        let value = 0;
        switch (key) {
          case 'vatRate':
            value = ((parseFloat(fd.vatPaid) || 0) / revenue) * 100;
            break;
          case 'citRate':
            value = ((parseFloat(fd.citPaid) || 0) / revenue) * 100;
            break;
          case 'grossMargin':
            value = ((revenue - (parseFloat(fd.cost) || 0)) / revenue) * 100;
            break;
          case 'netMargin':
            value = ((parseFloat(fd.profit) || 0) / revenue) * 100;
            break;
          case 'debtRatio':
            value = ((parseFloat(fd.totalLiabilities) || 0) / (parseFloat(fd.totalAssets) || 1)) * 100;
            break;
        }
        
        // 风险判定
        let status: 'low' | 'medium' | 'high' | 'critical' | null = null;
        if (value > 0) {
          if (key === 'debtRatio') {
            // 资产负债率：高于上限才危险
            if (value > benchmark.warning * 0.6 && value <= benchmark.warning) status = 'medium';
            else if (value > benchmark.warning && value <= benchmark.max * 1.3) status = 'high';
            else if (value > benchmark.max * 1.3) status = 'critical';
            else if (value <= benchmark.max && value >= benchmark.min) status = 'low';
            else status = 'medium';
          } else {
            // 其他指标：低于下限才危险
            if (value < benchmark.warning * 0.6) status = 'critical';
            else if (value < benchmark.warning) status = 'high';
            else if (value < benchmark.min || value > benchmark.max) {
              const deviation = value < benchmark.min 
                ? (benchmark.min - value) / benchmark.min
                : (value - benchmark.max) / benchmark.max;
              status = deviation > 0.3 ? 'high' : 'medium';
            } else {
              status = 'low';
            }
          }
        }
        
        return { year: fd.year, value, status };
      });
      
      metrics.push({ key, label: benchmark.label, values, benchmark });
    });
    
    return metrics;
  }, [industry, financialData]);
  
  // 计算通用扫描风险
  const generalScanRisks = useMemo(() => {
    const risks: Array<{
      category: string;
      color: string;
      lightColor: string;
      items: Array<{
        id: string;
        name: string;
        selectedOption: string | null;
        riskLevel: 'low' | 'medium' | 'high' | null;
        planTag: string;
      }>;
      totalItems: number;
      riskItems: number;
      planItems: number;
    }> = [];
    
    let totalRiskItems = 0;
    let totalPlanItems = 0;
    
    GENERAL_RISK_CATEGORIES.forEach(cat => {
      const items = cat.items.map(item => {
        const selectedIndex = generalAnswers[item.id] ?? -1;
        let riskLevel: 'low' | 'medium' | 'high' | null = null;
        
        if (selectedIndex >= 0) {
          if (selectedIndex === 0) {
            riskLevel = 'low';
          } else if (selectedIndex === cat.items.length - 1) {
            riskLevel = 'high';
          } else {
            riskLevel = 'medium';
          }
        }
        
        if (riskLevel === 'high' && item.planTag === '可筹划') totalPlanItems++;
        else if (riskLevel === 'high') totalRiskItems++;
        
        return {
          id: item.id,
          name: item.name,
          selectedOption: selectedIndex >= 0 ? item.options[selectedIndex] : null,
          riskLevel,
          planTag: item.planTag
        };
      });
      
      const riskCount = items.filter(i => i.riskLevel === 'high').length;
      const planCount = items.filter(i => i.riskLevel === 'high' && i.planTag === '可筹划').length;
      
      risks.push({
        category: cat.category,
        color: cat.color,
        lightColor: cat.lightColor,
        items,
        totalItems: items.length,
        riskItems: riskCount,
        planItems: planCount
      });
    });
    
    return { categories: risks, totalRiskItems, totalPlanItems };
  }, [generalAnswers]);
  
  // 计算行业风险
  const industryScanRisks = useMemo(() => {
    if (!industry) return { items: [], riskItems: 0, planItems: 0 };
    
    const industryItems = INDUSTRY_RISK_ITEMS[industry] || [];
    let riskItems = 0;
    let planItems = 0;
    
    const items = industryItems.map(item => {
      const answer = industryAnswers[item.id];
      let riskLevel: 'low' | 'medium' | 'high' | null = null;
      
      if (answer !== undefined && answer !== '') {
        const options = item.options || [];
        const selectedIndex = typeof answer === 'number' ? answer : options.indexOf(String(answer));
        
        if (selectedIndex === 0) {
          riskLevel = 'low';
        } else if (selectedIndex === options.length - 1) {
          riskLevel = 'high';
          if (item.planLevel === '可筹划') planItems++;
          else riskItems++;
        } else if (selectedIndex > 0) {
          riskLevel = 'medium';
        }
      }
      
      return {
        ...item,
        answer: answer ?? null,
        riskLevel
      };
    });
    
    return { items, riskItems, planItems };
  }, [industry, industryAnswers]);
  
  // 综合风险等级
  const overallRiskLevel = useMemo((): 'low' | 'medium' | 'high' | 'critical' => {
    let score = 0;
    
    // 财务指标风险（每个红灯+1，黑灯+2）
    financialMetrics.forEach(metric => {
      metric.values.forEach(v => {
        if (v.status === 'high') score += 1;
        else if (v.status === 'critical') score += 2;
      });
    });
    
    // 通用扫描风险（最后选项+1，中间+0.5，可筹划项高风险只+0.5）
    generalScanRisks.categories.forEach(cat => {
      cat.items.forEach(item => {
        if (item.riskLevel === 'high') {
          score += item.planTag === '可筹划' ? 0.5 : 1;
        } else if (item.riskLevel === 'medium') {
          score += 0.25;
        }
      });
    });
    
    // 行业扫描风险
    industryScanRisks.items.forEach(item => {
      if (item.riskLevel === 'high') {
        score += item.planLevel === '可筹划' ? 0.5 : 1;
      } else if (item.riskLevel === 'medium') {
        score += 0.25;
      }
    });
    
    if (score === 0) return 'low';
    if (score <= 3) return 'medium';
    if (score <= 6) return 'high';
    return 'critical';
  }, [financialMetrics, generalScanRisks, industryScanRisks]);
  
  // 计算总分异常项
  const totalAnomalies = useMemo(() => {
    let count = 0;
    financialMetrics.forEach(m => {
      m.values.forEach(v => {
        if (v.status === 'high' || v.status === 'critical') count++;
      });
    });
    generalScanRisks.categories.forEach(cat => {
      count += cat.items.filter(i => i.riskLevel === 'high' || i.riskLevel === 'medium').length;
    });
    count += industryScanRisks.items.filter(i => i.riskLevel === 'high' || i.riskLevel === 'medium').length;
    return count;
  }, [financialMetrics, generalScanRisks, industryScanRisks]);
  
  // 步骤验证
  const canProceedStep1 = companyName.trim() !== '' && industry !== '';
  const canProceedStep2 = financialData.some(fd => {
    const revenue = parseFloat(fd.revenue) || 0;
    return revenue > 0;
  });
  
  // 更新财务数据
  const updateFinancialData = (index: number, field: keyof FinancialData, value: string) => {
    const newData = [...financialData];
    newData[index] = { ...newData[index], [field]: value };
    setFinancialData(newData);
  };
  
  // 切换分类展开
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };
  
  // 更新通用扫描答案
  const updateGeneralAnswer = (id: string, optionIndex: number) => {
    setGeneralAnswers(prev => ({ ...prev, [id]: optionIndex }));
  };
  
  // 更新行业扫描答案
  const updateIndustryAnswer = (id: string, value: string | number) => {
    setIndustryAnswers(prev => ({ ...prev, [id]: value }));
  };
  
  // 下一步
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowResults(true);
    }
  };
  
  // 上一步
  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // 开始检测
  const handleStartDetection = () => {
    setShowResults(true);
  };
  
  // 复制报告ID
  const handleCopyReportId = () => {
    const reportId = `RSK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    navigator.clipboard.writeText(reportId);
  };
  
  // 步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: '基本信息' },
      { num: 2, label: '财务数据' },
      { num: 3, label: '风险扫描' },
      { num: 4, label: '检测结果' }
    ];
    
    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.num}>
            <button
              onClick={() => step.num < currentStep && setCurrentStep(step.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                currentStep === step.num
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                  : step.num < currentStep
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30 cursor-pointer hover:bg-green-500/20'
                  : 'bg-[#161A22] text-[#94A3B8] border border-[#2A303C]'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === step.num
                  ? 'bg-blue-500 text-white'
                  : step.num < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-[#2A303C] text-[#94A3B8]'
              }`}>
                {step.num < currentStep ? '✓' : step.num}
              </span>
              <span className="font-medium hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                step.num < currentStep ? 'bg-green-500' : 'bg-[#2A303C]'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  // 渲染基本信息步骤
  const renderStep1 = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">基本信息</h2>
        <p className="text-[#94A3B8]">填写企业基本信息，用于生成专属风险报告</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            企业名称 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="请输入企业全称"
            className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white placeholder-[#4B5563] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            所属行业 <span className="text-red-400">*</span>
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">请选择行业</option>
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            所得税纳税人身份
          </label>
          <select
            value={taxpayerType}
            onChange={(e) => setTaxpayerType(e.target.value)}
            className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          >
            {TAXPAYER_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
              联系人
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="选填"
              className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white placeholder-[#4B5563] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">
              联系电话
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="选填"
              className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white placeholder-[#4B5563] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#94A3B8] mb-2">
            客户邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="用于接收完整检测报告"
            className="w-full px-4 py-3 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-white placeholder-[#4B5563] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
  
  // 渲染财务数据步骤
  const renderStep2 = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">财务数据</h2>
        <p className="text-[#94A3B8]">填写近三年财务数据，系统将自动与行业基准比对</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[#2A303C]">
              <th className="text-left py-3 px-4 text-[#94A3B8] font-medium w-32">年份</th>
              {financialData.map((fd, index) => (
                <th key={index} className="text-center py-3 px-2 text-white font-medium">
                  {fd.year}年
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'revenue', label: '营业收入(万元)', placeholder: '0' },
              { key: 'cost', label: '营业成本(万元)', placeholder: '0' },
              { key: 'profit', label: '利润总额(万元)', placeholder: '0' },
              { key: 'vatPaid', label: '实缴增值税(万元)', placeholder: '0' },
              { key: 'citPaid', label: '实缴企业所得税(万元)', placeholder: '0' },
              { key: 'totalAssets', label: '总资产(万元)', placeholder: '0' },
              { key: 'totalLiabilities', label: '总负债(万元)', placeholder: '0' }
            ].map(row => (
              <tr key={row.key} className="border-b border-[#2A303C]/50">
                <td className="py-3 px-4 text-[#94A3B8] text-sm">{row.label}</td>
                {financialData.map((fd, index) => (
                  <td key={index} className="py-3 px-2">
                    <input
                      type="number"
                      value={fd[row.key as keyof FinancialData]}
                      onChange={(e) => updateFinancialData(index, row.key as keyof FinancialData, e.target.value)}
                      placeholder={row.placeholder}
                      className="w-full px-3 py-2 bg-[#0D0F14] border border-[#2A303C] rounded text-white text-center focus:border-blue-500 outline-none transition-all"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
        <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
          <span className="text-amber-400">💡</span>
          <span>提示：至少填写1年数据即可提交，建议填写3年数据以获得更准确的比对结果</span>
        </div>
      </div>
    </div>
  );
  
  // 渲染风险扫描步骤
  const renderStep3 = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">风险扫描问卷</h2>
        <p className="text-[#94A3B8]">基于《智控征管》100项预警框架 × 金税四期公开预警参数</p>
        <p className="text-[#4B5563] text-sm mt-1">共{TOTAL_GENERAL_ITEMS}项通用扫描 + {industry ? (INDUSTRY_RISK_ITEMS[industry]?.length || 0) : 0}项行业专属</p>
      </div>
      
      <div className="space-y-4">
        {/* 7大类通用扫描 */}
        {GENERAL_RISK_CATEGORIES.map(cat => {
          const isExpanded = expandedCategories[cat.category] ?? false;
          const answeredCount = cat.items.filter(item => generalAnswers[item.id] !== undefined).length;
          
          return (
            <div key={cat.category} className="border border-[#2A303C] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#161A22] transition-colors"
                style={{ backgroundColor: isExpanded ? cat.lightColor : undefined }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-white">{cat.category}</span>
                  <span className="text-[#94A3B8] text-sm">
                    ({answeredCount}/{cat.items.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#94A3B8]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#94A3B8]" />
                )}
              </button>
              
              {isExpanded && (
                <div className="border-t border-[#2A303C] bg-[#0D0F14]/50">
                  {cat.items.map(item => {
                    const selectedIndex = generalAnswers[item.id] ?? -1;
                    const tagColors = getPlanTagColor(item.planTag);
                    
                    return (
                      <div key={item.id} className="p-4 border-b border-[#2A303C]/30 last:border-b-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <span className="text-white text-sm">{item.name}</span>
                          <span
                            className="px-2 py-0.5 rounded text-xs whitespace-nowrap"
                            style={{ backgroundColor: tagColors.bg, color: tagColors.text }}
                          >
                            {item.planTag}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => updateGeneralAnswer(item.id, idx)}
                              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                selectedIndex === idx
                                  ? idx === 0
                                    ? 'bg-green-500/20 text-green-400 border border-green-500'
                                    : idx === item.options.length - 1
                                    ? 'bg-red-500/20 text-red-400 border border-red-500'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                                  : 'bg-[#161A22] text-[#94A3B8] border border-[#2A303C] hover:border-[#4B5563]'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* 行业专属扫描 */}
        {industry && INDUSTRY_RISK_ITEMS[industry] && (
          <div className="border border-[#2A303C] rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedIndustry(!expandedIndustry)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#161A22] transition-colors"
              style={{ backgroundColor: expandedIndustry ? 'rgba(26, 115, 232, 0.1)' : undefined }}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-medium text-white">{industry}专属风险诊断</span>
                <span className="text-[#94A3B8] text-sm">
                  ({Object.keys(industryAnswers).length}/{INDUSTRY_RISK_ITEMS[industry].length})
                </span>
              </div>
              {expandedIndustry ? (
                <ChevronUpIcon className="w-5 h-5 text-[#94A3B8]" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-[#94A3B8]" />
              )}
            </button>
            
            {expandedIndustry && (
              <div className="border-t border-[#2A303C] bg-[#0D0F14]/50">
                {INDUSTRY_RISK_ITEMS[industry].map(item => {
                  const answer = industryAnswers[item.id];
                  const tagColors = getPlanTagColor(item.planLevel);
                  const isSelected = answer !== undefined && answer !== '';
                  
                  return (
                    <div key={item.id} className="p-4 border-b border-[#2A303C]/30 last:border-b-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="text-white text-sm">{item.name}</span>
                        <span
                          className="px-2 py-0.5 rounded text-xs whitespace-nowrap"
                          style={{ backgroundColor: tagColors.bg, color: tagColors.text }}
                        >
                          {item.planLevel}
                        </span>
                      </div>
                      
                      {item.type === 'select' && item.options ? (
                        <div className="flex flex-wrap gap-2">
                          {item.options.map((option, idx) => {
                            const selectedOption = typeof answer === 'number' ? answer : 
                              answer ? item.options?.indexOf(String(answer)) : -1;
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => updateIndustryAnswer(item.id, option)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                  selectedOption === idx
                                    ? idx === 0
                                      ? 'bg-green-500/20 text-green-400 border border-green-500'
                                      : idx === (item.options?.length ?? 0) - 1
                                      ? 'bg-red-500/20 text-red-400 border border-red-500'
                                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                                    : 'bg-[#161A22] text-[#94A3B8] border border-[#2A303C] hover:border-[#4B5563]'
                                }`}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={typeof answer === 'number' ? answer : (answer || '')}
                          onChange={(e) => updateIndustryAnswer(item.id, parseFloat(e.target.value) || 0)}
                          placeholder={`请输入${item.unit || ''}`}
                          className="w-full sm:w-40 px-3 py-2 bg-[#161A22] border border-[#2A303C] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                        />
                      )}
                      {item.unit && !item.options && (
                        <span className="text-[#94A3B8] text-sm ml-2">{item.unit}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
  
  // 渲染检测结果步骤
  const renderStep4 = () => {
    const riskColor = getRiskColor(overallRiskLevel);
    const riskBg = getRiskBgColor(overallRiskLevel);
    
    return (
      <div className="max-w-5xl mx-auto">
        {/* 顶部仪表盘 */}
        <div className="text-center mb-8">
          <div
            className="inline-flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 mb-4"
            style={{ borderColor: riskColor, backgroundColor: riskBg }}
          >
            <ShieldIcon className="w-12 h-12 mb-1" />
            <span className="text-2xl font-bold" style={{ color: riskColor }}>
              {getRiskLabel(overallRiskLevel)}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">综合风险等级</h2>
          <p className="text-[#94A3B8] text-sm">基于《智控征管》100项风险预警框架 × 金税四期公开预警参数</p>
          <p className="text-[#4B5563] text-sm mt-1">
            共扫描{TOTAL_GENERAL_ITEMS + (industry ? (INDUSTRY_RISK_ITEMS[industry]?.length || 0) : 0)}项风险指标，发现{totalAnomalies}项异常
          </p>
        </div>
        
        {/* 统计摘要 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <TrendingUpIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-[#94A3B8] text-sm">可筹划项</p>
                <p className="text-2xl font-bold text-green-400">
                  {generalScanRisks.totalPlanItems + industryScanRisks.planItems}
                </p>
              </div>
            </div>
            <p className="text-[#4B5563] text-xs mt-2">可通过税务筹划优化税负</p>
          </div>
          
          <div className="p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangleIcon className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-[#94A3B8] text-sm">需整改项</p>
                <p className="text-2xl font-bold text-red-400">
                  {generalScanRisks.totalRiskItems + industryScanRisks.riskItems + 
                    financialMetrics.reduce((sum, m) => sum + m.values.filter(v => v.status === 'high' || v.status === 'critical').length, 0)}
                </p>
              </div>
            </div>
            <p className="text-[#4B5563] text-xs mt-2">稽查概率较高，建议立即处理</p>
          </div>
          
          <div className="p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <TargetIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[#94A3B8] text-sm">总分</p>
                <p className="text-2xl font-bold text-blue-400">{totalAnomalies}</p>
              </div>
            </div>
            <p className="text-[#4B5563] text-xs mt-2">风险评分（越低越好）</p>
          </div>
        </div>
        
        {/* 财务数据比对 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4">财务数据比对</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {financialMetrics.map(metric => {
              const latestValue = metric.values.find(v => v.value > 0);
              const status = latestValue?.status || 'low';
              const color = getRiskColor(status);
              
              return (
                <div key={metric.key} className="p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#94A3B8] text-sm">{metric.label}</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color }}>
                    {latestValue ? `${latestValue.value.toFixed(1)}%` : '--'}
                  </p>
                  <p className="text-[#4B5563] text-xs">
                    行业区间: {metric.benchmark.min}% - {metric.benchmark.max}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 风险扫描结果 */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4">风险扫描结果</h3>
          <div className="space-y-3">
            {generalScanRisks.categories.map(cat => {
              const isExpanded = expandedCategories[cat.category] ?? false;
              const hasRisk = cat.riskItems > 0;
              
              return (
                <div key={cat.category} className="border border-[#2A303C] rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat.category)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[#161A22] transition-colors"
                    style={{ backgroundColor: hasRisk ? cat.lightColor : undefined }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-white">{cat.category}</span>
                      <span className="text-[#94A3B8] text-sm">
                        {cat.riskItems > 0 ? (
                          <span className="text-red-400">⚠ {cat.riskItems}项异常</span>
                        ) : (
                          <span className="text-green-400">✓ 正常</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {cat.planItems > 0 && (
                        <span className="text-green-400 text-sm">可筹划: {cat.planItems}</span>
                      )}
                      {isExpanded ? (
                        <ChevronUpIcon className="w-5 h-5 text-[#94A3B8]" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-[#94A3B8]" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-[#2A303C] bg-[#0D0F14]/50">
                      {cat.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border-b border-[#2A303C]/30 last:border-b-0">
                          <span className="text-white text-sm">{item.name}</span>
                          <div className="flex items-center gap-3">
                            {item.selectedOption && (
                              <span className="text-[#94A3B8] text-sm">{item.selectedOption}</span>
                            )}
                            {item.riskLevel && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getRiskColor(item.riskLevel) }}
                              />
                            )}
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: getPlanTagColor(item.planTag).bg,
                                color: getPlanTagColor(item.planTag).text
                              }}
                            >
                              {item.planTag}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 行业专属诊断 */}
        {industry && industryScanRisks.items.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-white mb-4">{industry}专属风险诊断</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {industryScanRisks.items.map(item => {
                const tagColors = getPlanTagColor(item.planLevel);
                
                return (
                  <div key={item.id} className="p-4 bg-[#161A22] rounded-lg border border-[#2A303C]">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white text-sm">{item.name}</span>
                      {item.riskLevel && (
                        <div
                          className="w-2 h-2 rounded-full mt-1.5"
                          style={{ backgroundColor: getRiskColor(item.riskLevel) }}
                        />
                      )}
                    </div>
                    {item.answer !== null && (
                      <p className="text-[#94A3B8] text-sm mb-2">
                        {typeof item.answer === 'number' ? `${item.answer}${item.unit || ''}` : item.answer}
                      </p>
                    )}
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ backgroundColor: tagColors.bg, color: tagColors.text }}
                    >
                      {item.planLevel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* CTA区域 */}
        <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/30">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-white mb-2">获取专业解决方案</h3>
            <p className="text-[#94A3B8]">
              联系张老师，获取针对您企业的专属税务筹划方案 + 完整检测报告
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:138-1294-3969"
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              <PhoneIcon className="w-5 h-5" />
              138-1294-3969
            </a>
            <a
              href="mailto:zhanglaoshi@hgttax.com"
              className="flex items-center gap-2 px-6 py-3 bg-[#161A22] hover:bg-[#1F2937] text-white font-medium rounded-lg border border-[#2A303C] transition-colors"
            >
              <MailIcon className="w-5 h-5" />
              zhanglaoshi@hgttax.com
            </a>
          </div>
        </div>
      </div>
    );
  };
  
  // 主渲染
  if (showResults) {
    return (
      <div className="min-h-screen bg-[#0D0F14] text-white">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* 顶部导航 */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setShowResults(false)}
              className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>返回修改</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">税务风险智能检测</h1>
              <p className="text-[#94A3B8] text-sm">基于《智控征管》100项预警框架</p>
            </div>
            <div className="w-24" />
          </div>
          
          {renderStep4()}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0D0F14] text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>返回首页</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">税务风险智能检测</h1>
            <p className="text-[#94A3B8] text-sm">基于《智控征管》100项预警框架</p>
          </div>
          <div className="w-24" />
        </div>
        
        {/* 步骤指示器 */}
        {renderStepIndicator()}
        
        {/* 步骤内容 */}
        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
        
        {/* 底部按钮 */}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={goToPrevStep}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? 'bg-[#161A22] text-[#4B5563] cursor-not-allowed'
                : 'bg-[#161A22] text-white hover:bg-[#1F2937] border border-[#2A303C]'
            }`}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            上一步
          </button>
          
          <button
            onClick={goToNextStep}
            disabled={
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2)
            }
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              (currentStep === 1 && !canProceedStep1) ||
              (currentStep === 2 && !canProceedStep2)
                ? 'bg-[#2A303C] text-[#4B5563] cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {currentStep === 3 ? '开始检测' : '下一步'}
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
