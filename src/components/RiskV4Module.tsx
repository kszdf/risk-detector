'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';

// ============== 类型定义 ==============
interface FinancialPeriod {
  period: string;
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

interface FormData {
  enterpriseName: string;
  contactPerson: string;
  contactPhone: string;
  customerEmail: string;
  industry: string;
  revenueScale: string;
  invoiceAnswers: Record<string, number>;
  revenueCostAnswers: Record<string, number>;
  publicPrivateAnswers: Record<string, number>;
  taxPolicyAnswers: Record<string, number>;
  financialData: FinancialPeriod[];
  latestMonth: string;
}

interface ResultData {
  riskId: string;
  overallRiskLevel: string;
  riskScore: number;
  maxScore: number;
  riskDetails: string[];
  reportStatus: string;
  moduleScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  weightedScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  trendWarnings: Array<{ type: string; label: string; score: number; detail: string }>;
  trendData: Array<{
    period: string;
    revenue: number;
    grossMargin: number;
    netMargin: number;
    vatRate: number;
    citRate: number;
    debtRatio: number;
    trends: Record<string, string>;
  }>;
  crossValidation: Array<{ rule: string; conflict: boolean; detail: string }>;
  estimatedRiskAmount: {
    items: Array<{ name: string; taxMin: number; taxMax: number; penaltyMin: number; penaltyMax: number }>;
    totalTaxMin: number;
    totalTaxMax: number;
    totalPenaltyMin: number;
    totalPenaltyMax: number;
    totalMin: number;
    totalMax: number;
  };
  reportContent: Record<string, unknown>;
  dataCompleteness: number;
  dataCompletenessMsg: string;
}

// ============== 行业基准数据 ==============
const INDUSTRY_BENCHMARKS: Record<string, { vatRate: number; citRate: number; grossMargin: number }> = {
  '制造业': { vatRate: 3.0, citRate: 2.5, grossMargin: 20 },
  '批发零售业': { vatRate: 1.2, citRate: 1.0, grossMargin: 15 },
  '建筑业': { vatRate: 3.0, citRate: 2.0, grossMargin: 12 },
  '商务服务业': { vatRate: 3.0, citRate: 1.5, grossMargin: 40 },
  '生活服务业': { vatRate: 2.0, citRate: 1.0, grossMargin: 35 },
  '科技互联网': { vatRate: 2.5, citRate: 2.0, grossMargin: 50 },
  '其他': { vatRate: 2.0, citRate: 1.5, grossMargin: 20 }
};

// ============== 问卷题目配置 ==============
const INVOICE_QUESTIONS = [
  { id: 'q1', question: '发票流、资金流、合同流、货（服务）流是否完全一致？', options: ['完全一致', '部分不一致', '经常不一致'], scores: [0, 2, 3] },
  { id: 'q2', question: '是否存在用个人账户收取公司营业款未入账？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'q3', question: '近12个月是否接受过"变名发票"？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'q4', question: '增值税进项发票是否出现过上游供应商异常？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'q5', question: '红字发票开具比例是否超过5%？', options: ['未超过', '5%-15%', '超过15%'], scores: [0, 2, 3] }
];

const REVENUE_COST_QUESTIONS = [
  { id: 'r1', question: '是否存在预收账款长期挂账未确认收入？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'r2', question: '是否存在"替票"冲账？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'r3', question: '股东或家人个人消费是否计入公司费用？', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'r4', question: '存货账面与实际盘点差异？', options: ['基本一致', '有差异但有合理解释', '差异较大'], scores: [0, 2, 3] },
  { id: 'r5', question: '最近一年利润总额是否为负？', options: ['否', '是'], scores: [0, 2] }
];

const PUBLIC_PRIVATE_QUESTIONS = [
  { id: 'p1', question: '股东借款超一年未还？', options: ['从未发生', '1年内归还', '超1年未还'], scores: [0, 1, 3] },
  { id: 'p2', question: '利润分配方式？', options: ['有合规分红方案', '部分分红部分挂账', '利润留公司/借款拿钱'], scores: [0, 2, 3] },
  { id: 'p3', question: '关联方资金互转？', options: ['从未发生', '偶尔有有合同', '经常互转无理由'], scores: [0, 1, 3] },
  { id: 'p4', question: '大额现金支付(单笔5万+)?', options: ['从未发生', '偶尔发生', '经常发生'], scores: [0, 2, 3] },
  { id: 'p5', question: '报销替代工资？', options: ['从未发生', '少量员工', '普遍存在'], scores: [0, 2, 3] }
];

const TAX_POLICY_QUESTIONS = [
  { id: 't1', question: '近24个月逾期申报/缴税？', options: ['从未发生', '1次', '2次及以上'], scores: [0, 2, 3] },
  { id: 't2', question: '小微优惠指标是否接近/超过临界值？', options: ['不适用/完全符合', '接近', '已超标仍享受'], scores: [0, 2, 3] },
  { id: 't3', question: '税收洼地空壳公司？', options: ['否', '有注册有部分经营', '有注册无经营'], scores: [0, 1, 3] },
  { id: 't4', question: '税负率是否低于行业平均？', options: ['不低于', '不清楚', '明显偏低'], scores: [0, 2, 3] },
  { id: 't5', question: '近3年是否被稽查/纳税评估？', options: ['否', '是但无问题', '是且有补税/处罚'], scores: [0, 1, 3] }
];

// ============== 财务字段提示信息 ==============
const FIELD_HINTS: Record<string, string> = {
  revenue: '资产负债表附注或利润表第一行「营业收入」',
  cost: '利润表「营业成本」',
  profit: '利润表「利润总额」（税前利润）',
  vatPaid: '增值税申报表主表「应纳税额」或「已缴税额」',
  incomeTaxPaid: '企业所得税年度申报表「实际应纳所得税额」',
  totalAssets: '资产负债表「资产总计」',
  totalLiabilities: '资产负债表「负债合计」',
  receivables: '资产负债表「应收账款」',
  inventory: '资产负债表「存货」',
  advanceReceipts: '资产负债表「预收款项」或「合同负债」'
};

// ============== 步骤配置 ==============
const STEPS = [
  { id: 1, name: '基本信息', icon: '1', color: '#1E3A5F' },
  { id: 2, name: '发票与资金流', icon: '2', color: '#B91C1C' },
  { id: 3, name: '收入成本', icon: '3', color: '#1E40AF' },
  { id: 4, name: '税务申报', icon: '4', color: '#047857' },
  { id: 5, name: '财务数据', icon: '5', color: '#C2410C' }
];

// ============== 财务期间配色 ==============
const PERIOD_COLORS = [
  { border: '#C2410C', bg: 'rgba(194, 65, 12, 0.05)', label: '#C2410C' },  // 最新一期-深橙
  { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.05)', label: '#3B82F6' }, // 第2期-蓝色
  { border: '#10B981', bg: 'rgba(16, 185, 129, 0.05)', label: '#10B981' }, // 第3期-绿色
  { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.05)', label: '#8B5CF6' }  // 第4期-紫色
];

// ============== 安全工具函数 ==============
function safeGetYearOptions(): { value: string; label: string }[] {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (typeof currentYear !== 'number' || currentYear < 2000) {
      return [
        { value: '2025-12', label: '2025年12月' },
        { value: '2024-12', label: '2024年12月' },
        { value: '2023-12', label: '2023年12月' }
      ];
    }
    return [
      { value: `${currentYear - 1}-12`, label: `${currentYear - 1}年12月` },
      { value: `${currentYear - 2}-12`, label: `${currentYear - 2}年12月` },
      { value: `${currentYear - 3}-12`, label: `${currentYear - 3}年12月` }
    ];
  } catch {
    return [
      { value: '2025-12', label: '2025年12月' },
      { value: '2024-12', label: '2024年12月' },
      { value: '2023-12', label: '2023年12月' }
    ];
  }
}

function safeGetMonthOptions(): { value: string; label: string }[] {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (typeof currentYear !== 'number' || typeof currentMonth !== 'number') {
      return [
        { value: '2026-04', label: '2026年4月' },
        { value: '2026-05', label: '2026年5月' }
      ];
    }
    const m1 = currentMonth - 2;
    const m2 = currentMonth - 1;
    const y1 = m1 >= 1 ? currentYear : currentYear - 1;
    const y2 = m2 >= 1 ? currentYear : currentYear - 1;
    const adjustedM1 = m1 >= 1 ? m1 : m1 + 12;
    const adjustedM2 = m2 >= 1 ? m2 : m2 + 12;
    return [
      { value: `${y1}-${String(adjustedM1).padStart(2, '0')}`, label: `${y1}年${adjustedM1}月` },
      { value: `${y2}-${String(adjustedM2).padStart(2, '0')}`, label: `${y2}年${adjustedM2}月` }
    ];
  } catch {
    return [
      { value: '2026-04', label: '2026年4月' },
      { value: '2026-05', label: '2026年5月' }
    ];
  }
}

function safeGetDefaultLatestMonth(): string {
  const options = safeGetMonthOptions();
  return options[0]?.value || '2026-04';
}

function safeCreateEmptyPeriod(period: string, type: 'latest' | 'annual'): FinancialPeriod {
  return {
    period,
    type,
    revenue: 0,
    cost: 0,
    profit: 0,
    vatPaid: 0,
    incomeTaxPaid: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    receivables: 0,
    inventory: 0,
    advanceReceipts: 0
  };
}

// ============== 组件 ==============
interface RiskV4ModuleProps {
  compact?: boolean;
}

export default function RiskV4Module({ compact = false }: RiskV4ModuleProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState('');
  
  // 初始化选项
  const yearOptions = useMemo(() => safeGetYearOptions(), []);
  const monthOptions = useMemo(() => safeGetMonthOptions(), []);
  const defaultMonth = useMemo(() => safeGetDefaultLatestMonth(), []);
  
  // 初始化表单数据
  const getInitialFormData = useCallback((): FormData => {
    const defaultYear = safeGetYearOptions();
    return {
      enterpriseName: '',
      contactPerson: '',
      contactPhone: '',
      customerEmail: '',
      industry: '',
      revenueScale: '',
      invoiceAnswers: {},
      revenueCostAnswers: {},
      publicPrivateAnswers: {},
      taxPolicyAnswers: {},
      latestMonth: defaultMonth,
      financialData: [
        safeCreateEmptyPeriod(defaultMonth, 'latest'),
        safeCreateEmptyPeriod(defaultYear[0]?.value || '2025-12', 'annual'),
        safeCreateEmptyPeriod(defaultYear[1]?.value || '2024-12', 'annual'),
        safeCreateEmptyPeriod(defaultYear[2]?.value || '2023-12', 'annual')
      ]
    };
  }, [defaultMonth]);
  
  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedTopics, setSavedTopics] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // 处理水合完成
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // 计算数据完整度
  const dataCompleteness = useMemo(() => {
    if (!formData.financialData) return { count: 0, msg: '' };
    const filledCount = formData.financialData.filter(d => d.revenue > 0 || d.profit > 0).length;
    
    if (filledCount === 0) return { count: 0, msg: '请填写至少一期财务数据' };
    if (filledCount === 1) return { count: 1, msg: '本次检测仅基于单期数据，无法进行趋势分析。建议补充年度数据以获取更精准诊断。' };
    if (filledCount === 2) return { count: 2, msg: '基于2期数据对比，已识别同比变化趋势。补充更多年度数据可提升诊断精度。' };
    if (filledCount === 3) return { count: 3, msg: '基于3期数据对比，趋势分析可信度较高。' };
    return { count: Math.min(filledCount, 4), msg: '基于4期完整数据，趋势分析最为精准，诊断结果参考价值最高。' };
  }, [formData.financialData]);
  
  // 处理月份变更
  const handleLatestMonthChange = useCallback((newMonth: string) => {
    setFormData(prev => ({
      ...prev,
      latestMonth: newMonth,
      financialData: prev.financialData.map((item, idx) => 
        idx === 0 ? { ...item, period: newMonth } : item
      )
    }));
  }, []);
  
  // 检查可选期是否已开始填写
  const checkAnnualPeriodStarted = useCallback((periodIndex: number): boolean => {
    if (periodIndex <= 0 || !formData.financialData) return false;
    const period = formData.financialData[periodIndex];
    return period && (period.revenue > 0 || period.profit > 0 || period.totalAssets > 0);
  }, [formData.financialData]);
  
  // 更新财务数据
  const updateFinancialField = useCallback((periodIndex: number, field: keyof FinancialPeriod, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => {
      const newData = [...prev.financialData];
      newData[periodIndex] = { ...newData[periodIndex], [field]: numValue };
      return { ...prev, financialData: newData };
    });
  }, []);
  
  // 获取当前步骤的模块颜色
  const getCurrentModuleColor = () => {
    return STEPS[currentStep - 1]?.color || '#1E3A5F';
  };
  
  // 输入组件（带悬浮提示）
  const FieldInput: React.FC<{
    label: string;
    value: number;
    onChange: (value: string) => void;
    fieldKey: string;
    required?: boolean;
    optional?: boolean;
    periodStarted?: boolean;
    periodIndex: number;
    periodLabel: string;
  }> = ({ label, value, onChange, fieldKey, required, optional, periodStarted, periodIndex, periodLabel }) => {
    const isRequired = required || (optional && periodStarted);
    const isFieldStarted = periodStarted && periodIndex > 0;
    const periodColor = PERIOD_COLORS[periodIndex] || PERIOD_COLORS[0];
    
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm font-medium text-[#333333]">{label}</span>
          {isRequired && <span className="text-red-500">*</span>}
          {optional && !isFieldStarted && <span className="text-xs text-[#666666] bg-gray-100 px-1.5 py-0.5 rounded">可选</span>}
          {isFieldStarted && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">必填</span>}
        </div>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocusedField(`${periodIndex}-${fieldKey}`)}
            onBlur={() => setFocusedField(null)}
            placeholder="0.00"
            className={`w-full px-3 py-2 text-sm border rounded-lg transition-all ${
              isRequired && value === 0
                ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                : `border-[${periodColor.border}] bg-white focus:ring-2`
            } text-[#333333] placeholder-[#999999]`}
            style={{
              borderColor: isRequired && value === 0 ? undefined : periodColor.border
            }}
          />
          {focusedField === `${periodIndex}-${fieldKey}` && FIELD_HINTS[fieldKey] && (
            <div 
              className="absolute z-50 left-0 top-full mt-1 px-3 py-2 text-white text-xs rounded-lg shadow-lg whitespace-nowrap"
              style={{ backgroundColor: periodColor.label }}
            >
              {FIELD_HINTS[fieldKey]}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // 渲染步骤1：基本信息
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          企业名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.enterpriseName}
          onChange={(e) => setFormData({...formData, enterpriseName: e.target.value})}
          placeholder="请输入企业名称"
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333] placeholder-[#999999]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-1">
            联系人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
            placeholder="请输入联系人姓名"
            className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333] placeholder-[#999999]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-1">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 11);
              setFormData({...formData, contactPhone: val});
              if (val && val.length !== 11) {
                setPhoneError('请输入11位手机号码');
              } else {
                setPhoneError('');
              }
            }}
            placeholder="请输入手机号码"
            className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-white focus:ring-2 text-[#333333] placeholder-[#999999] ${
              phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#E5E7EB] focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/20'
            }`}
          />
          {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          行业类型 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333]"
        >
          <option value="">请选择行业类型</option>
          <option value="制造业">制造业</option>
          <option value="批发零售业">批发零售业</option>
          <option value="建筑业">建筑业</option>
          <option value="商务服务业">商务服务业</option>
          <option value="生活服务业">生活服务业</option>
          <option value="科技互联网">科技互联网</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          年营收规模 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.revenueScale}
          onChange={(e) => setFormData({...formData, revenueScale: e.target.value})}
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333]"
        >
          <option value="">请选择年营收规模</option>
          <option value="500万以下">500万以下</option>
          <option value="500-2000万">500-2000万</option>
          <option value="2000万-1亿">2000万-1亿</option>
          <option value="1亿以上">1亿以上</option>
        </select>
      </div>
    </div>
  );
  
  // 渲染步骤2-4：问卷模块
  const renderQuestionnaire = (
    questions: typeof INVOICE_QUESTIONS,
    answers: Record<string, number>,
    setAnswer: (id: string, score: number) => void,
    moduleName: string
  ) => {
    // 根据模块名称获取对应颜色
    const getModuleColors = () => {
      if (moduleName === '发票') return { border: '#B91C1C', bg: 'rgba(185, 28, 28, 0.08)', text: '#B91C1C' };
      if (moduleName === '收入成本') return { border: '#1E40AF', bg: 'rgba(30, 64, 175, 0.08)', text: '#1E40AF' };
      if (moduleName === '公私账户') return { border: '#6D28D9', bg: 'rgba(109, 40, 217, 0.08)', text: '#6D28D9' };
      if (moduleName === '税务') return { border: '#047857', bg: 'rgba(4, 120, 87, 0.08)', text: '#047857' };
      return { border: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)', text: '#2563EB' };
    };
    const colors = getModuleColors();
    
    return (
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <p className="text-sm font-medium text-[#1A1A2E] mb-3 leading-relaxed">{q.question}</p>
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer(q.id, q.scores[idx])}
                  className={`w-full px-4 py-2.5 text-sm text-left rounded-lg border transition-all ${
                    answers[q.id] === q.scores[idx]
                      ? 'border-current font-medium'
                      : 'border-[#E5E7EB] bg-white text-[#333333] hover:border-current/50'
                  }`}
                  style={{
                    borderColor: answers[q.id] === q.scores[idx] ? colors.border : undefined,
                    backgroundColor: answers[q.id] === q.scores[idx] ? colors.bg : undefined,
                    color: answers[q.id] === q.scores[idx] ? colors.text : undefined
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染步骤5：财务数据
  const renderStep5 = () => {
    const periodLabels = [
      '最新一期月度数据',
      yearOptions[0]?.label || '2025年12月',
      yearOptions[1]?.label || '2024年12月',
      yearOptions[2]?.label || '2023年12月'
    ];
    
    const periodTypes: ('latest' | 'annual')[] = ['latest', 'annual', 'annual', 'annual'];
    
    return (
      <div className="space-y-6">
        {/* 重要提示 */}
        <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <p className="text-sm text-[#2563EB] leading-relaxed font-medium">
            经营年度数据越完整，对比度越高，风险诊断越精准。建议至少填报2期数据。
          </p>
        </div>
        
        {/* 数据完整度 */}
        {dataCompleteness.count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm text-amber-800 font-medium mb-1">当前数据完整度：{dataCompleteness.count}/4期</p>
              <p className="text-sm text-amber-700">{dataCompleteness.msg}</p>
            </div>
          </div>
        )}
        
        {/* 最新一期月份选择 */}
        <div className="bg-white border border-[#C2410C] rounded-xl p-5">
          <label className="block text-sm font-medium text-[#333333] mb-3">
            数据所属月份 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.latestMonth}
            onChange={(e) => handleLatestMonthChange(e.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-[#C2410C] rounded-lg bg-white focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 text-[#333333]"
          >
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        
        {/* 4期财务数据 */}
        {formData.financialData.map((period, periodIndex) => {
          const isLatest = periodTypes[periodIndex] === 'latest';
          const periodStarted = checkAnnualPeriodStarted(periodIndex);
          const periodLabel = periodLabels[periodIndex];
          const periodColor = PERIOD_COLORS[periodIndex];
          
          const fields: Array<{ key: keyof FinancialPeriod; label: string }> = [
            { key: 'revenue', label: '营业收入' },
            { key: 'cost', label: '营业成本' },
            { key: 'profit', label: '利润总额' },
            { key: 'vatPaid', label: '实缴增值税' },
            { key: 'incomeTaxPaid', label: '实缴所得税' },
            { key: 'totalAssets', label: '总资产' },
            { key: 'totalLiabilities', label: '总负债' },
            { key: 'receivables', label: '应收账款' },
            { key: 'inventory', label: '期末存货' },
            { key: 'advanceReceipts', label: '预收账款' }
          ];
          
          return (
            <div 
              key={periodIndex} 
              className="bg-white border-2 rounded-xl p-5"
              style={{ borderColor: periodColor.border }}
            >
              <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
                <span 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: periodColor.label }}
                >
                  {periodIndex + 1}
                </span>
                <span style={{ color: periodColor.label }}>{periodLabel}</span>
                {isLatest && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: periodColor.label }}
                  >
                    必填
                  </span>
                )}
              </h4>
              
              <div className="grid grid-cols-2 gap-x-4">
                {fields.map(field => (
                  <FieldInput
                    key={field.key}
                    label={field.label}
                    value={period[field.key] as number}
                    onChange={(val) => updateFinancialField(periodIndex, field.key, val)}
                    fieldKey={field.key}
                    required={isLatest}
                    optional={!isLatest}
                    periodStarted={periodStarted}
                    periodIndex={periodIndex}
                    periodLabel={periodLabel}
                  />
                ))}
              </div>
              
              {/* 单位提示 */}
              <p className="text-xs text-[#666666] mt-3">单位：万元</p>
            </div>
          );
        })}
      </div>
    );
  };
  
  // 渲染结果
  const renderResult = () => {
    if (!result) return null;
    
    const percentScore = result.maxScore > 0 ? ((result.riskScore / result.maxScore) * 100).toFixed(1) : '0.0';
    
    return (
      <div className="space-y-6">
        {/* 结果头部 */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">检测报告</h3>
              <p className="text-sm text-[#666666]">
                企业：{formData.enterpriseName || '-'}
              </p>
              <p className="text-sm text-[#666666]">
                行业：{formData.industry} | 规模：{formData.revenueScale}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-block px-4 py-2 rounded-lg font-bold text-white ${
                result.overallRiskLevel === '高风险' ? 'bg-red-500' :
                result.overallRiskLevel === '中风险' ? 'bg-amber-500' :
                result.overallRiskLevel === '低风险' ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                {result.overallRiskLevel}
              </div>
            </div>
          </div>
          
          {/* 综合得分 */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-[#666666] mb-2">综合风险评分</p>
              <p className="text-4xl font-bold text-[#1A1A2E] mb-1">
                {result.riskScore ?? 0}
                <span className="text-lg font-normal text-[#666666]"> / {result.maxScore ?? 115}</span>
              </p>
              <p className="text-sm text-[#666666]">
                百分制等价分：<span className="font-bold text-[#2563EB]">{percentScore}分</span>
              </p>
              <p className="text-xs text-[#999999] mt-2">
                （基于{result.maxScore}分制，{percentScore}% = {result.riskScore}/{result.maxScore} × 100）
              </p>
            </div>
          </div>
          
          {/* 数据完整度提示 */}
          {result.dataCompletenessMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800">{result.dataCompletenessMsg}</p>
            </div>
          )}
          
          {/* 模块得分 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-xs text-red-600 mb-1">发票与资金流</p>
              <p className="text-xl font-bold text-red-700">
                {result.moduleScores?.invoice ?? 0}
                <span className="text-sm font-normal"> / 15</span>
              </p>
              <p className="text-xs text-red-500 mt-1">
                加权 {result.weightedScores?.invoice ?? 0}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-blue-600 mb-1">收入与成本</p>
              <p className="text-xl font-bold text-blue-700">
                {result.moduleScores?.revenueCost ?? 0}
                <span className="text-sm font-normal"> / 13</span>
              </p>
              <p className="text-xs text-blue-500 mt-1">
                加权 {result.weightedScores?.revenueCost ?? 0}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-xs text-purple-600 mb-1">公私账户</p>
              <p className="text-xl font-bold text-purple-700">
                {result.moduleScores?.publicPrivate ?? 0}
                <span className="text-sm font-normal"> / 13</span>
              </p>
              <p className="text-xs text-purple-500 mt-1">
                加权 {result.weightedScores?.publicPrivate ?? 0}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-green-600 mb-1">税务申报</p>
              <p className="text-xl font-bold text-green-700">
                {result.moduleScores?.taxPolicy ?? 0}
                <span className="text-sm font-normal"> / 15</span>
              </p>
              <p className="text-xs text-green-500 mt-1">
                加权 {result.weightedScores?.taxPolicy ?? 0}
              </p>
            </div>
          </div>
        </div>
        
        {/* 趋势预警 */}
        {result.trendWarnings && result.trendWarnings.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">
              趋势预警 (+{result.trendWarnings.length * 3}分)
            </h4>
            <div className="space-y-2">
              {result.trendWarnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm p-3 bg-amber-50 text-amber-800 rounded-lg">
                  <span>⚠️</span>
                  <span className="font-medium">{warning.label}</span>
                  <span className="text-amber-600">- {warning.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 趋势分析 */}
        {result.trendData && result.trendData.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">财务比率趋势分析</h4>
            {result.trendData.length === 1 ? (
              <p className="text-sm text-[#666666] text-center py-4">数据不足，无法进行趋势分析</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-2 text-[#666666] font-medium">期间</th>
                      <th className="text-right py-2 text-[#666666] font-medium">毛利率</th>
                      <th className="text-right py-2 text-[#666666] font-medium">净利率</th>
                      <th className="text-right py-2 text-[#666666] font-medium">增值税率</th>
                      <th className="text-right py-2 text-[#666666] font-medium">所得税率</th>
                      <th className="text-right py-2 text-[#666666] font-medium">负债率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trendData.map((row, idx) => (
                      <tr key={idx} className="border-b border-[#F3F4F6]">
                        <td className="py-2 text-[#333333]">{row.period}</td>
                        <td className="py-2 text-right">
                          {(row.grossMargin ?? 0).toFixed(1)}%
                          {row.trends?.grossMargin && (
                            <span className={`ml-1 ${row.trends.grossMargin === '↓' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends.grossMargin}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {(row.netMargin ?? 0).toFixed(1)}%
                          {row.trends?.netMargin && (
                            <span className={`ml-1 ${row.trends.netMargin === '↓' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends.netMargin}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {(row.vatRate ?? 0).toFixed(2)}%
                          {row.trends?.vatRate && (
                            <span className={`ml-1 ${row.trends.vatRate === '↓' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends.vatRate}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {(row.citRate ?? 0).toFixed(2)}%
                          {row.trends?.citRate && (
                            <span className={`ml-1 ${row.trends.citRate === '↓' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends.citRate}
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {(row.debtRatio ?? 0).toFixed(1)}%
                          {row.trends?.debtRatio && (
                            <span className={`ml-1 ${row.trends.debtRatio === '↑' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends.debtRatio}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* 交叉验证 */}
        {result.crossValidation && result.crossValidation.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">数据交叉验证 (+{result.crossValidation.length * 3}分)</h4>
            <div className="space-y-2">
              {result.crossValidation.map((cv, idx) => (
                <div key={idx} className={`flex items-start gap-2 text-sm p-2 rounded ${
                  cv.conflict ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
                }`}>
                  <span>{cv.conflict ? '❌' : '✓'}</span>
                  <span>{cv.rule || cv.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 风险明细 */}
        {result.riskDetails && result.riskDetails.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">风险明细</h4>
            <ul className="space-y-2">
              {result.riskDetails.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-[#333333]">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 预估风险金额 */}
        {result.estimatedRiskAmount && result.estimatedRiskAmount.items && result.estimatedRiskAmount.items.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">预估风险金额（万元）</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-2 text-[#666666]">风险项</th>
                    <th className="text-right py-2 text-[#666666]">补税区间</th>
                    <th className="text-right py-2 text-[#666666]">罚款区间</th>
                    <th className="text-right py-2 text-[#666666]">合计区间</th>
                  </tr>
                </thead>
                <tbody>
                  {result.estimatedRiskAmount.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#F3F4F6]">
                      <td className="py-2 text-[#333333]">{item.name}</td>
                      <td className="py-2 text-right text-red-600">{item.taxMin} ~ {item.taxMax}</td>
                      <td className="py-2 text-right text-red-600">{item.penaltyMin} ~ {item.penaltyMax}</td>
                      <td className="py-2 text-right text-red-600 font-medium">
                        {(item.taxMin + item.penaltyMin).toFixed(2)} ~ {(item.taxMax + item.penaltyMax).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-2 text-[#1A1A2E]">合计</td>
                    <td className="py-2 text-right text-red-600">
                      {result.estimatedRiskAmount.totalTaxMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalTaxMax?.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {result.estimatedRiskAmount.totalPenaltyMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalPenaltyMax?.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {result.estimatedRiskAmount.totalMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalMax?.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={() => { setResult(null); setCurrentStep(1); }}
            className="flex-1 px-6 py-3 text-sm font-medium text-[#333333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors"
          >
            重新检测
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(result, null, 2));
              alert('报告已复制到剪贴板');
            }}
            className="flex-1 px-6 py-3 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors"
          >
            复制报告
          </button>
        </div>
      </div>
    );
  };
  
  // 提交表单
  const handleSubmit = async () => {
    // 手机号校验
    if (!formData.contactPhone || formData.contactPhone.length !== 11) {
      setPhoneError('请输入11位手机号码');
      setCurrentStep(1);
      return;
    }
    
    // 财务数据校验：最新一期必填
    const latestPeriod = formData.financialData[0];
    const requiredFields: Array<keyof FinancialPeriod> = ['revenue', 'cost', 'profit', 'vatPaid', 'incomeTaxPaid', 'totalAssets', 'totalLiabilities', 'receivables', 'inventory', 'advanceReceipts'];
    const missingFields = requiredFields.filter(field => !latestPeriod[field] || latestPeriod[field] === 0);
    
    if (missingFields.length > 0) {
      alert(`请填写最新一期财务数据：${missingFields.join('、')}`);
      setCurrentStep(5);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/risk-v4-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 设置答案
  const setAnswer = (type: 'invoice' | 'revenueCost' | 'publicPrivate' | 'taxPolicy', id: string, score: number) => {
    const keyMap = {
      invoice: 'invoiceAnswers' as keyof FormData,
      revenueCost: 'revenueCostAnswers' as keyof FormData,
      publicPrivate: 'publicPrivateAnswers' as keyof FormData,
      taxPolicy: 'taxPolicyAnswers' as keyof FormData
    };
    const key = keyMap[type];
    setFormData(prev => ({
      ...prev,
      [key]: { ...(prev[key] as Record<string, number>), [id]: score }
    }));
  };
  
  // 计算模块分数
  const getModuleScore = (answers: Record<string, number>, questions: typeof INVOICE_QUESTIONS): number => {
    return questions.reduce((sum, q) => sum + (answers[q.id] || 0), 0);
  };
  
  // 渲染
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#666666]">加载中...</div>
      </div>
    );
  }
  
  const currentModuleColor = getCurrentModuleColor();
  
  return (
    <div className={`min-h-screen ${compact ? 'bg-transparent' : 'bg-white'}`}>
      {!compact && (
        <header className="bg-white border-b border-[#E5E7EB] px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">张</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1A1A2E]">财税风险检测</h1>
                <p className="text-xs text-[#666666]">企业财税健康诊断</p>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className={`${compact ? 'p-0' : 'max-w-5xl mx-auto px-6 py-8'}`}>
        {result ? (
          renderResult()
        ) : (
          <>
            {/* 步骤指示器 - 渐变进度条 */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {STEPS.map((step, idx) => {
                  const isActive = currentStep >= step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                          style={{
                            backgroundColor: isActive ? step.color : '#E5E7EB',
                            color: isActive ? 'white' : '#666666'
                          }}
                        >
                          {step.icon}
                        </div>
                        <span 
                          className="text-xs mt-2 transition-colors"
                          style={{ color: isActive ? step.color : '#999999' }}
                        >
                          {step.name}
                        </span>
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className="flex-1 h-1 mx-2 rounded relative overflow-hidden">
                          {/* 背景灰 */}
                          <div className="absolute inset-0 bg-[#E5E7EB] rounded" />
                          {/* 渐变进度 */}
                          {currentStep > step.id && (
                            <div 
                              className="absolute inset-y-0 left-0 rounded"
                              style={{
                                width: '100%',
                                background: 'linear-gradient(to right, #B91C1C, #1E40AF, #6D28D9, #047857)'
                              }}
                            />
                          )}
                          {currentStep === step.id && (
                            <div 
                              className="absolute inset-y-0 left-0 rounded"
                              style={{
                                width: '50%',
                                background: `linear-gradient(to right, ${step.color}, ${STEPS[idx + 1]?.color || step.color})`
                              }}
                            />
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            
            {/* 步骤内容 */}
            <div 
              className="bg-white rounded-xl border-2 p-6 mb-6"
              style={{ borderColor: currentModuleColor }}
            >
              <h2 
                className="text-lg font-semibold mb-6"
                style={{ color: currentModuleColor }}
              >
                {STEPS[currentStep - 1].name}
              </h2>
              
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderQuestionnaire(INVOICE_QUESTIONS, formData.invoiceAnswers, (id, score) => setAnswer('invoice', id, score), '发票')}
              {currentStep === 3 && renderQuestionnaire(REVENUE_COST_QUESTIONS, formData.revenueCostAnswers, (id, score) => setAnswer('revenueCost', id, score), '收入成本')}
              {currentStep === 4 && renderQuestionnaire(TAX_POLICY_QUESTIONS, formData.taxPolicyAnswers, (id, score) => setAnswer('taxPolicy', id, score), '税务')}
              {currentStep === 5 && renderStep5()}
            </div>
            
            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            
            {/* 按钮 */}
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="px-6 py-3 text-sm font-medium text-[#333333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors"
                >
                  上一步
                </button>
              )}
              {currentStep < 5 && (
                <button
                  onClick={() => setCurrentStep(s => s + 1)}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: currentModuleColor }}
                >
                  下一步
                </button>
              )}
              {currentStep === 5 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-6 py-3 text-sm font-medium text-white bg-[#C2410C] rounded-lg hover:bg-[#9A3412] transition-colors disabled:opacity-50"
                >
                  {loading ? '提交中...' : '提交检测'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
