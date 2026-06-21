'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import BasicInfoStep from './steps/BasicInfoStep';
import QuestionnaireStep from './steps/QuestionnaireStep';
import FinancialDataStep from './steps/FinancialDataStep';
import ResultStep from './steps/ResultStep';

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
  latestMonth: string;
  financialData: FinancialPeriod[];
}

interface ResultData {
  riskId: string;
  overallRiskLevel: string;
  riskScore: number;
  maxScore: number;
  riskDetails: string[];
  moduleScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  weightedScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  trendWarnings: Array<{ type: string; label: string; score: number; detail: string }>;
  trendData: Array<{ period: string; revenue: number; grossMargin: number; netMargin: number; vatRate: number; citRate: number; debtRatio: number; trends: Record<string, string> }>;
  crossValidation: Array<{ rule: string; conflict: boolean; detail: string }>;
  estimatedRiskAmount: { items: Array<{ name: string; taxMin: number; taxMax: number; penaltyMin: number; penaltyMax: number }>; totalTaxMin: number; totalTaxMax: number; totalPenaltyMin: number; totalPenaltyMax: number; totalMin: number; totalMax: number } | null;
  dataCompletenessMsg: string;
}

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

// ============== 步骤配置 ==============
const STEPS = [
  { id: 1, name: '基本信息', icon: '1', color: '#1E3A5F' },
  { id: 2, name: '发票与资金流', icon: '2', color: '#B91C1C' },
  { id: 3, name: '收入成本', icon: '3', color: '#1E40AF' },
  { id: 4, name: '税务申报', icon: '4', color: '#047857' },
  { id: 5, name: '财务数据', icon: '5', color: '#C2410C' }
];

// ============== 安全工具函数 ==============
function safeGetYearOptions() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    if (typeof currentYear !== 'number' || currentYear < 2000) {
      return [{ value: '2025-12', label: '2025年12月' }, { value: '2024-12', label: '2024年12月' }, { value: '2023-12', label: '2023年12月' }];
    }
    return [
      { value: `${currentYear - 1}-12`, label: `${currentYear - 1}年12月` },
      { value: `${currentYear - 2}-12`, label: `${currentYear - 2}年12月` },
      { value: `${currentYear - 3}-12`, label: `${currentYear - 3}年12月` }
    ];
  } catch {
    return [{ value: '2025-12', label: '2025年12月' }, { value: '2024-12', label: '2024年12月' }, { value: '2023-12', label: '2023年12月' }];
  }
}

function safeGetDefaultLatestMonth() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const m1 = currentMonth - 2;
    const y1 = m1 >= 1 ? currentYear : currentYear - 1;
    const adjustedM1 = m1 >= 1 ? m1 : m1 + 12;
    return `${y1}-${String(adjustedM1).padStart(2, '0')}`;
  } catch {
    return '2026-04';
  }
}

function safeCreateEmptyPeriod(period: string, type: 'latest' | 'annual'): FinancialPeriod {
  return {
    period, type,
    revenue: 0, cost: 0, profit: 0, vatPaid: 0, incomeTaxPaid: 0,
    totalAssets: 0, totalLiabilities: 0, receivables: 0, inventory: 0, advanceReceipts: 0
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
  const [isHydrated, setIsHydrated] = useState(false);

  const defaultMonth = useMemo(() => safeGetDefaultLatestMonth(), []);
  const yearOptions = useMemo(() => safeGetYearOptions(), []);

  const getInitialFormData = useCallback((): FormData => {
    return {
      enterpriseName: '', contactPerson: '', contactPhone: '', customerEmail: '',
      industry: '', revenueScale: '',
      invoiceAnswers: {}, revenueCostAnswers: {}, publicPrivateAnswers: {}, taxPolicyAnswers: {},
      latestMonth: defaultMonth,
      financialData: [
        safeCreateEmptyPeriod(defaultMonth, 'latest'),
        safeCreateEmptyPeriod(yearOptions[0]?.value || '2025-12', 'annual'),
        safeCreateEmptyPeriod(yearOptions[1]?.value || '2024-12', 'annual'),
        safeCreateEmptyPeriod(yearOptions[2]?.value || '2023-12', 'annual')
      ]
    };
  }, [defaultMonth, yearOptions]);

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setIsHydrated(true); }, []);

  // 设置答案
  const setAnswer = useCallback((type: 'invoice' | 'revenueCost' | 'publicPrivate' | 'taxPolicy', id: string, score: number) => {
    const keyMap = { invoice: 'invoiceAnswers', revenueCost: 'revenueCostAnswers', publicPrivate: 'publicPrivateAnswers', taxPolicy: 'taxPolicyAnswers' };
    const key = keyMap[type] as keyof FormData;
    setFormData(prev => ({ ...prev, [key]: { ...(prev[key] as Record<string, number>), [id]: score } }));
  }, []);

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.contactPhone || formData.contactPhone.length !== 11) {
      setPhoneError('请输入11位手机号码');
      setCurrentStep(1);
      return;
    }
    const latestPeriod = formData.financialData[0];
    const requiredFields: Array<keyof FinancialPeriod> = ['revenue', 'cost', 'profit', 'vatPaid', 'incomeTaxPaid', 'totalAssets', 'totalLiabilities', 'receivables', 'inventory', 'advanceReceipts'];
    const missingFields = requiredFields.filter(field => !latestPeriod[field]);
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前步骤颜色
  const getCurrentModuleColor = () => STEPS[currentStep - 1]?.color || '#1E3A5F';

  // 渲染进度条
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = currentStep >= step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{ backgroundColor: isActive ? step.color : '#E5E7EB', color: isActive ? 'white' : '#666666' }}>
                  {step.icon}
                </div>
                <span className="text-xs mt-2 transition-colors" style={{ color: isActive ? step.color : '#999999' }}>
                  {step.name}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-2 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#E5E7EB] rounded" />
                  {currentStep > step.id && (
                    <div className="absolute inset-y-0 left-0 rounded" style={{ width: '100%', background: 'linear-gradient(to right, #B91C1C, #1E40AF, #6D28D9, #047857)' }} />
                  )}
                  {currentStep === step.id && (
                    <div className="absolute inset-y-0 left-0 rounded" style={{ width: '50%', background: `linear-gradient(to right, ${step.color}, ${STEPS[idx + 1]?.color || step.color})` }} />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  if (!isHydrated) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-[#666666]">加载中...</div></div>;
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
          <ResultStep
            result={result}
            formData={{ enterpriseName: formData.enterpriseName, industry: formData.industry, revenueScale: formData.revenueScale }}
            onReset={() => { setResult(null); setCurrentStep(1); }}
          />
        ) : (
          <>
            {renderProgressBar()}

            <div className="bg-white rounded-xl border-2 p-6 mb-6" style={{ borderColor: currentModuleColor }}>
              <h2 className="text-lg font-semibold mb-6" style={{ color: currentModuleColor }}>
                {STEPS[currentStep - 1].name}
              </h2>

              {currentStep === 1 && <BasicInfoStep formData={formData} setFormData={setFormData} phoneError={phoneError} />}
              {currentStep === 2 && <QuestionnaireStep questions={INVOICE_QUESTIONS} answers={formData.invoiceAnswers} setAnswer={(id, score) => setAnswer('invoice', id, score)} moduleName="发票" />}
              {currentStep === 3 && <QuestionnaireStep questions={REVENUE_COST_QUESTIONS} answers={formData.revenueCostAnswers} setAnswer={(id, score) => setAnswer('revenueCost', id, score)} moduleName="收入成本" />}
              {currentStep === 4 && <QuestionnaireStep questions={TAX_POLICY_QUESTIONS} answers={formData.taxPolicyAnswers} setAnswer={(id, score) => setAnswer('taxPolicy', id, score)} moduleName="税务" />}
              {currentStep === 5 && <FinancialDataStep formData={formData} setFormData={setFormData} focusedField={focusedField} setFocusedField={setFocusedField} />}
            </div>

            {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

            <div className="flex gap-3">
              {currentStep > 1 && (
                <button onClick={() => setCurrentStep(s => s - 1)} className="px-6 py-3 text-sm font-medium text-[#333333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors">
                  上一步
                </button>
              )}
              {currentStep < 5 && (
                <button onClick={() => setCurrentStep(s => s + 1)} className="flex-1 px-6 py-3 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors" style={{ backgroundColor: currentModuleColor }}>
                  下一步
                </button>
              )}
              {currentStep === 5 && (
                <button onClick={handleSubmit} disabled={loading} className="flex-1 px-6 py-3 text-sm font-medium text-white bg-[#C2410C] rounded-lg hover:bg-[#9A3412] transition-colors disabled:opacity-50">
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
