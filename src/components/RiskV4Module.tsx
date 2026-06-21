'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ============== 类型定义 ==============
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
  financialData: Array<{
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
  }>;
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
    year: number;
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
  advanceReceipts: '资产负债表「预收款项」或「合同负债」'
};

// ============== 步骤配置 ==============
const STEPS = [
  { id: 1, name: '基本信息', icon: '1' },
  { id: 2, name: '发票与资金流', icon: '2' },
  { id: 3, name: '收入成本', icon: '3' },
  { id: 4, name: '税务申报', icon: '4' },
  { id: 5, name: '财务数据', icon: '5' }
];

// ============== 主组件 ==============
export default function RiskV4Module({ compact = false, onBack }: { compact?: boolean; onBack?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const currentYear = new Date().getFullYear();
  const [phoneError, setPhoneError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
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
    financialData: [
      { year: currentYear, revenue: 0, cost: 0, profit: 0, vatPaid: 0, incomeTaxPaid: 0, totalAssets: 0, totalLiabilities: 0, receivables: 0, advanceReceipts: 0 },
      { year: currentYear - 1, revenue: 0, cost: 0, profit: 0, vatPaid: 0, incomeTaxPaid: 0, totalAssets: 0, totalLiabilities: 0 },
      { year: currentYear - 2, revenue: 0, cost: 0, profit: 0, vatPaid: 0, incomeTaxPaid: 0, totalAssets: 0, totalLiabilities: 0 }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 计算问卷得分
  const moduleScores = useMemo(() => {
    const invoice = Object.values(formData.invoiceAnswers).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const revenueCost = Object.values(formData.revenueCostAnswers).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const publicPrivate = Object.values(formData.publicPrivateAnswers).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const taxPolicy = Object.values(formData.taxPolicyAnswers).reduce((sum, v) => sum + (Number(v) || 0), 0);
    return { invoice, revenueCost, publicPrivate, taxPolicy };
  }, [formData]);

  // 更新表单数据
  const updateFormData = useCallback((field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // BUG3: 手机号校验
    if (field === 'contactPhone') {
      const phone = String(value || '');
      if (phone && !/^\d{11}$/.test(phone)) {
        setPhoneError('请输入11位手机号码');
      } else {
        setPhoneError('');
      }
    }
  }, []);

  // 更新问卷答案
  const updateAnswer = useCallback((module: 'invoiceAnswers' | 'revenueCostAnswers' | 'publicPrivateAnswers' | 'taxPolicyAnswers', id: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      [module]: { ...prev[module], [id]: score }
    }));
  }, []);

  // 更新财务数据
  const updateFinancialData = useCallback((index: number, field: string, value: number) => {
    setFormData(prev => {
      const newData = [...prev.financialData];
      newData[index] = { ...newData[index], [field]: value };
      return { ...prev, financialData: newData };
    });
  }, []);

  // BUG3: 手机号校验函数
  const validatePhone = useCallback((phone: string): boolean => {
    if (!phone) return false;
    if (!/^\d{11}$/.test(phone)) {
      setPhoneError('请输入11位手机号码');
      return false;
    }
    setPhoneError('');
    return true;
  }, []);

  // 提交检测
  const handleSubmit = async () => {
    // BUG3: 提交前再次校验手机号
    if (!validatePhone(formData.contactPhone)) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 构建问卷对象（兼容两种格式）
      const questionnaire: Record<string, { answer: string; score: number }> = {};
      Object.entries(formData.invoiceAnswers).forEach(([k, v]) => {
        const q = INVOICE_QUESTIONS.find(item => item.id === k);
        const idx = q ? INVOICE_QUESTIONS.indexOf(q) + 1 : 0;
        questionnaire[`1.${idx}`] = { answer: q?.options[v / 2] || '', score: v };
      });
      Object.entries(formData.revenueCostAnswers).forEach(([k, v]) => {
        const q = REVENUE_COST_QUESTIONS.find(item => item.id === k);
        const idx = q ? REVENUE_COST_QUESTIONS.indexOf(q) + 1 : 0;
        questionnaire[`2.${idx}`] = { answer: q?.options[v <= 2 ? (v / 2 > 0 ? 1 : 0) : 2] || '', score: v };
      });
      Object.entries(formData.publicPrivateAnswers).forEach(([k, v]) => {
        const q = PUBLIC_PRIVATE_QUESTIONS.find(item => item.id === k);
        const idx = q ? PUBLIC_PRIVATE_QUESTIONS.indexOf(q) + 1 : 0;
        questionnaire[`3.${idx}`] = { answer: q?.options[0] || '', score: v };
      });
      Object.entries(formData.taxPolicyAnswers).forEach(([k, v]) => {
        const q = TAX_POLICY_QUESTIONS.find(item => item.id === k);
        const idx = q ? TAX_POLICY_QUESTIONS.indexOf(q) + 1 : 0;
        questionnaire[`4.${idx}`] = { answer: q?.options[0] || '', score: v };
      });
      
      // 只发送有数据的年份
      const validFinancialData = formData.financialData.filter(d => d.revenue > 0);
      
      const response = await fetch('/api/risk-v4-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enterpriseName: formData.enterpriseName,
          contactPerson: formData.contactPerson,
          contactPhone: formData.contactPhone,
          customerEmail: formData.customerEmail,
          industry: formData.industry,
          revenueScale: formData.revenueScale,
          invoiceAnswers: formData.invoiceAnswers,
          revenueCostAnswers: formData.revenueCostAnswers,
          publicPrivateAnswers: formData.publicPrivateAnswers,
          taxPolicyAnswers: formData.taxPolicyAnswers,
          questionnaire,
          financialData: validFinancialData.length > 0 ? validFinancialData : [{
            year: currentYear,
            revenue: formData.financialData[0].revenue,
            cost: formData.financialData[0].cost,
            profit: formData.financialData[0].profit,
            vatPaid: formData.financialData[0].vatPaid,
            incomeTaxPaid: formData.financialData[0].incomeTaxPaid,
            totalAssets: formData.financialData[0].totalAssets,
            totalLiabilities: formData.financialData[0].totalLiabilities,
            receivables: formData.financialData[0].receivables,
            advanceReceipts: formData.financialData[0].advanceReceipts
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setCurrentStep(6);
      } else {
        setError(data.error || '提交失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 验证步骤
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.contactPerson && formData.contactPhone && formData.industry && formData.revenueScale && validatePhone(formData.contactPhone);
      case 2:
        return INVOICE_QUESTIONS.every(q => formData.invoiceAnswers[q.id] !== undefined);
      case 3:
        return REVENUE_COST_QUESTIONS.every(q => formData.revenueCostAnswers[q.id] !== undefined) &&
               PUBLIC_PRIVATE_QUESTIONS.every(q => formData.publicPrivateAnswers[q.id] !== undefined);
      case 4:
        return TAX_POLICY_QUESTIONS.every(q => formData.taxPolicyAnswers[q.id] !== undefined);
      case 5:
        return formData.financialData[0].revenue > 0 && formData.financialData[0].cost > 0 && formData.financialData[0].profit > 0;
      default:
        return true;
    }
  }, [currentStep, formData, validatePhone]);

  // ============== 渲染步骤内容 ==============
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // 基本信息
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">基本信息与所属期</h2>
              <p className="text-[#666666]">填写企业信息，系统将根据行业匹配风险基准</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-[#666666] mb-2">企业名称</label>
                <input type="text" value={formData.enterpriseName} onChange={(e) => updateFormData('enterpriseName', e.target.value)}
                  placeholder="选填，首次检测可不填"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#1A1A2E] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-2">联系人 <span className="text-[#EF4444]">*</span></label>
                <input type="text" value={formData.contactPerson} onChange={(e) => updateFormData('contactPerson', e.target.value)}
                  placeholder="必填" className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#1A1A2E] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-2">联系电话 <span className="text-[#EF4444]">*</span></label>
                <input type="tel" value={formData.contactPhone} onChange={(e) => updateFormData('contactPhone', e.target.value)}
                  placeholder="必填，11位手机号" className={`w-full bg-white border rounded-lg px-4 py-3 text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 ${phoneError ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20' : 'border-[#E5E7EB] focus:border-[#2563EB] focus:ring-[#2563EB]/20'}`} />
                {phoneError && <p className="text-[#EF4444] text-xs mt-1">{phoneError}</p>}
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-2">客户邮箱</label>
                <input type="email" value={formData.customerEmail} onChange={(e) => updateFormData('customerEmail', e.target.value)}
                  placeholder="选填，用于接收完整检测报告"
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#1A1A2E] placeholder-[#9CA3AF] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20" />
              </div>
              <div>
                <label className="block text-sm text-[#666666] mb-2">所属行业 <span className="text-[#EF4444]">*</span></label>
                <select value={formData.industry} onChange={(e) => updateFormData('industry', e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#1A1A2E] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                  <option value="">请选择行业</option>
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
                <label className="block text-sm text-[#666666] mb-2">年营收规模 <span className="text-[#EF4444]">*</span></label>
                <select value={formData.revenueScale} onChange={(e) => updateFormData('revenueScale', e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-lg px-4 py-3 text-[#1A1A2E] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                  <option value="">请选择规模</option>
                  <option value="500万以下">500万以下</option>
                  <option value="500-3000万">500-3000万</option>
                  <option value="3000万-1亿">3000万-1亿</option>
                  <option value="1亿以上">1亿以上</option>
                </select>
              </div>
            </div>
            
            {formData.industry && (
              <div className="mt-6 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                <h4 className="text-[#2563EB] font-medium mb-2">{formData.industry} 行业基准参考</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-[#666666]">增值税税负率:</span><span className="text-[#1A1A2E] ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.vatRate || 2.0}%</span></div>
                  <div><span className="text-[#666666]">所得税贡献率:</span><span className="text-[#1A1A2E] ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.citRate || 1.5}%</span></div>
                  <div><span className="text-[#666666]">毛利率:</span><span className="text-[#1A1A2E] ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.grossMargin || 20}%</span></div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // 发票与资金流风险
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">发票与资金流风险诊断</h2>
              <p className="text-[#666666]">权重30%，满分15分（加权后30分）</p>
            </div>
            
            <div className="space-y-4">
              {INVOICE_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 bg-[#EFF6FF] text-[#2563EB] rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">{idx + 1}</span>
                    <span className="text-[#1A1A2E]">{q.question}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button key={optIdx} onClick={() => updateAnswer('invoiceAnswers', q.id, q.scores[optIdx])}
                        className={`px-4 py-3 rounded-lg border text-sm transition-all ${formData.invoiceAnswers[q.id] === q.scores[optIdx] ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#666666] hover:border-[#D1D5DB]'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg text-center">
              <span className="text-[#666666]">当前得分: </span>
              <span className="text-[#2563EB] font-bold text-xl">{moduleScores.invoice}</span>
              <span className="text-[#666666]"> / 15分（加权后 {Math.round(moduleScores.invoice * 2)}分）</span>
            </div>
          </div>
        );

      case 3: // 收入成本 + 公私账户
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">收入成本 + 公私账户风险</h2>
              <p className="text-[#666666]">权重50%，满分15分（加权后50分）</p>
            </div>
            
            {/* 收入与成本 */}
            <div>
              <h3 className="text-lg font-medium text-[#059669] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#D1FAE5] rounded-full flex items-center justify-center text-sm">A</span>
                收入与成本合规风险（权重25%）
              </h3>
              <div className="space-y-4">
                {REVENUE_COST_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 bg-[#D1FAE5] text-[#059669] rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">{idx + 1}</span>
                      <span className="text-[#1A1A2E]">{q.question}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <button key={optIdx} onClick={() => updateAnswer('revenueCostAnswers', q.id, q.scores[optIdx])}
                          className={`px-4 py-3 rounded-lg border text-sm transition-all ${formData.revenueCostAnswers[q.id] === q.scores[optIdx] ? 'bg-[#D1FAE5] border-[#059669] text-[#059669]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#666666] hover:border-[#D1D5DB]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 公私账户 */}
            <div>
              <h3 className="text-lg font-medium text-[#7C3AED] mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-[#EDE9FE] rounded-full flex items-center justify-center text-sm">B</span>
                公私账户与股东风险（权重25%）
              </h3>
              <div className="space-y-4">
                {PUBLIC_PRIVATE_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 bg-[#EDE9FE] text-[#7C3AED] rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">{idx + 1}</span>
                      <span className="text-[#1A1A2E]">{q.question}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <button key={optIdx} onClick={() => updateAnswer('publicPrivateAnswers', q.id, q.scores[optIdx])}
                          className={`px-4 py-3 rounded-lg border text-sm transition-all ${formData.publicPrivateAnswers[q.id] === q.scores[optIdx] ? 'bg-[#EDE9FE] border-[#7C3AED] text-[#7C3AED]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#666666] hover:border-[#D1D5DB]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg text-center">
              <span className="text-[#666666]">当前得分: </span>
              <span className="text-[#7C3AED] font-bold text-xl">{moduleScores.revenueCost + moduleScores.publicPrivate}</span>
              <span className="text-[#666666]"> / 15分（加权后 {Math.round((moduleScores.revenueCost + moduleScores.publicPrivate) * 1.67)}分）</span>
            </div>
          </div>
        );

      case 4: // 税务申报
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">税务申报与政策适用风险</h2>
              <p className="text-[#666666]">权重20%，满分15分（加权后20分）</p>
            </div>
            
            <div className="space-y-4">
              {TAX_POLICY_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 bg-[#FEF3C7] text-[#D97706] rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">{idx + 1}</span>
                    <span className="text-[#1A1A2E]">{q.question}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button key={optIdx} onClick={() => updateAnswer('taxPolicyAnswers', q.id, q.scores[optIdx])}
                        className={`px-4 py-3 rounded-lg border text-sm transition-all ${formData.taxPolicyAnswers[q.id] === q.scores[optIdx] ? 'bg-[#FEF3C7] border-[#D97706] text-[#D97706]' : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#666666] hover:border-[#D1D5DB]'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg text-center">
              <span className="text-[#666666]">当前得分: </span>
              <span className="text-[#D97706] font-bold text-xl">{moduleScores.taxPolicy}</span>
              <span className="text-[#666666]"> / 15分（加权后 {Math.round(moduleScores.taxPolicy * 1.33)}分）</span>
            </div>
          </div>
        );

      case 5: // 财务数据 - BUG2: 删除Excel上传，纯手工填列+悬浮提示
        const latestData = formData.financialData[0];
        const calculateMetrics = (d: typeof latestData) => ({
          grossMargin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
          netMargin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
          vatRate: d.revenue > 0 ? (d.vatPaid / d.revenue) * 100 : 0,
          citRate: d.revenue > 0 ? (d.incomeTaxPaid / d.revenue) * 100 : 0,
          debtRatio: d.totalAssets > 0 ? (d.totalLiabilities / d.totalAssets) * 100 : 0
        });
        const metrics = calculateMetrics(latestData);
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">关键财务数据</h2>
              <p className="text-[#666666]">填写最近年度（必填）和前1-2年数据（选填），系统将自动计算趋势</p>
            </div>
            
            {/* BUG2: 财务数据表格 - 纯手工填列+悬浮提示 */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
              <h4 className="text-lg font-medium text-[#1A1A2E] mb-4">手工填列</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="text-left py-3 px-2 text-[#666666] font-medium">字段</th>
                      {formData.financialData.map((d, idx) => (
                        <th key={idx} className={`text-center py-3 px-2 font-medium ${idx === 0 ? 'text-[#2563EB]' : 'text-[#666666]'}`}>
                          {idx === 0 ? '最近年度（必填）' : '前一年（选填）'}<br />
                          <span className="text-xs">{d.year}年</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'revenue', label: '营业收入(万元)', required: true },
                      { key: 'cost', label: '营业成本(万元)', required: true },
                      { key: 'profit', label: '利润总额(万元)', required: true },
                      { key: 'vatPaid', label: '实缴增值税(万元)', required: true },
                      { key: 'incomeTaxPaid', label: '实缴所得税(万元)', required: true },
                      { key: 'totalAssets', label: '总资产(万元)', required: true },
                      { key: 'totalLiabilities', label: '总负债(万元)', required: true },
                      { key: 'receivables', label: '应收账款(万元)', required: false },
                      { key: 'advanceReceipts', label: '预收账款(万元)', required: false }
                    ].map((field) => (
                      <tr key={field.key} className="border-b border-[#F3F4F6]/50">
                        <td className="py-3 px-2 text-[#666666]">
                          {field.label}
                          {field.required && <span className="text-[#EF4444] ml-1">*</span>}
                        </td>
                        {formData.financialData.map((d, idx) => (
                          <td key={idx} className="py-2 px-2 relative">
                            <input
                              type="number"
                              value={d[field.key as keyof typeof d] as number || ''}
                              onChange={(e) => updateFinancialData(idx, field.key, parseFloat(e.target.value) || 0)}
                              onFocus={() => setFocusedField(`${idx}-${field.key}`)}
                              onBlur={() => setFocusedField(null)}
                              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded px-3 py-2 text-[#1A1A2E] text-sm focus:bg-white focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                            {/* BUG2: 悬浮提示 */}
                            {focusedField === `${idx}-${field.key}` && FIELD_HINTS[field.key] && (
                              <div className="absolute left-0 top-full mt-1 p-2 bg-[#1A1A2E] text-white text-xs rounded-lg shadow-lg z-10 whitespace-nowrap">
                                {FIELD_HINTS[field.key]}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* 自动计算指标 */}
            {latestData.revenue > 0 && (
              <div className="bg-gradient-to-r from-[#EFF6FF] to-[#EDE9FE] border border-[#BFDBFE] rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-medium text-[#1A1A2E] mb-4">自动计算指标（最近年度）</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#2563EB]">{metrics.grossMargin.toFixed(1)}%</div>
                    <div className="text-sm text-[#666666]">毛利率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#059669]">{metrics.netMargin.toFixed(1)}%</div>
                    <div className="text-sm text-[#666666]">净利率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#D97706]">{metrics.vatRate.toFixed(2)}%</div>
                    <div className="text-sm text-[#666666]">增值税税负率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#7C3AED]">{metrics.citRate.toFixed(2)}%</div>
                    <div className="text-sm text-[#666666]">所得税贡献率</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#DC2626]">{metrics.debtRatio.toFixed(1)}%</div>
                    <div className="text-sm text-[#666666]">资产负债率</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6: // 结果页 - BUG1: 安全访问所有属性
        if (!result) return null;
        
        const riskColors: Record<string, { bg: string; border: string; text: string }> = {
          '低风险': { bg: 'bg-[#D1FAE5]', border: 'border-[#10B981]', text: 'text-[#059669]' },
          '中风险': { bg: 'bg-[#FEF3C7]', border: 'border-[#D97706]', text: 'text-[#D97706]' },
          '高风险': { bg: 'bg-[#FED7AA]', border: 'border-[#EA580C]', text: 'text-[#EA580C]' },
          '极高风险': { bg: 'bg-[#FEE2E2]', border: 'border-[#DC2626]', text: 'text-[#DC2626]' }
        };
        const colorConfig = riskColors[result.overallRiskLevel] || riskColors['中风险'];
        
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">税务风险智能检测报告</h2>
              <p className="text-[#666666]">基于《智控征管》预警模型 × 金税四期公开参数</p>
              <p className="text-[#9CA3AF] text-sm mt-1">检测ID: {result.riskId || 'N/A'}</p>
            </div>
            
            {/* 综合风险等级 */}
            <div className={`${colorConfig.bg} border-2 ${colorConfig.border} rounded-2xl p-8 text-center`}>
              <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl border-2 ${colorConfig.border}`}>
                <div className={`text-6xl font-bold ${colorConfig.text}`}>{result.riskScore ?? 0}</div>
                <div className="text-xl text-[#666666]">分</div>
                <div className="text-2xl text-[#9CA3AF] mx-2">/</div>
                <div className="text-2xl text-[#666666]">{result.maxScore ?? 115}</div>
                <div className={`text-3xl font-bold ml-4 ${colorConfig.text}`}>{result.overallRiskLevel || '未知'}</div>
              </div>
            </div>
            
            {/* 模块得分 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-[#2563EB]">{result.weightedScores?.invoice ?? 0}</div>
                <div className="text-sm text-[#666666]">发票与资金流（加权分）</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-[#059669]">{result.weightedScores?.revenueCost ?? 0}</div>
                <div className="text-sm text-[#666666]">收入与成本（加权分）</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-[#7C3AED]">{result.weightedScores?.publicPrivate ?? 0}</div>
                <div className="text-sm text-[#666666]">公私账户（加权分）</div>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-[#D97706]">{result.weightedScores?.taxPolicy ?? 0}</div>
                <div className="text-sm text-[#666666]">税务申报（加权分）</div>
              </div>
            </div>
            
            {/* 3年数据对比表格 */}
            {result.trendData && result.trendData.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm">
                <h4 className="text-lg font-medium text-[#1A1A2E] mb-4">财务指标趋势分析</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB]">
                        <th className="text-left py-3 px-3 text-[#666666] font-medium">指标</th>
                        {result.trendData.map((d, idx) => (
                          <th key={idx} className="text-center py-3 px-3 font-medium text-[#1A1A2E]">{d.year}年</th>
                        ))}
                        <th className="text-center py-3 px-3 text-[#666666] font-medium">趋势</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'grossMargin', label: '毛利率', unit: '%', decimals: 1 },
                        { key: 'netMargin', label: '净利率', unit: '%', decimals: 1 },
                        { key: 'vatRate', label: '增值税税负率', unit: '%', decimals: 2 },
                        { key: 'citRate', label: '所得税贡献率', unit: '%', decimals: 2 },
                        { key: 'debtRatio', label: '资产负债率', unit: '%', decimals: 1 }
                      ].map(field => (
                        <tr key={field.key} className="border-b border-[#F3F4F6]/50">
                          <td className="py-3 px-3 text-[#666666]">{field.label}</td>
                          {result.trendData.map((d, idx) => {
                            const val = d[field.key as keyof typeof d] as number;
                            return (
                              <td key={idx} className="py-3 px-3 text-center text-[#1A1A2E]">
                                {(isNaN(val) ? 0 : val).toFixed(field.decimals)}{field.unit}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-center">
                            {result.trendData.length > 1 && result.trendData[0]?.trends?.[field.key] && (
                              <span className={`text-lg ${
                                result.trendData[0].trends[field.key] === '↗' ? 'text-[#DC2626]' :
                                result.trendData[0].trends[field.key] === '↘' ? 'text-[#059669]' : 'text-[#9CA3AF]'
                              }`}>
                                {result.trendData[0].trends[field.key]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* 趋势预警 */}
            {result.trendWarnings && result.trendWarnings.length > 0 && (
              <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-6">
                <h4 className="text-lg font-medium text-[#D97706] mb-3">趋势预警</h4>
                <ul className="space-y-2">
                  {result.trendWarnings.map((w, idx) => (
                    <li key={idx} className="text-[#92400E] flex items-start gap-2">
                      <span className="font-medium">[{w.label || '预警'} +{w.score ?? 0}分]</span>
                      <span>{w.detail || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 交叉验证结果 */}
            {result.crossValidation && result.crossValidation.length > 0 && (
              <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl p-6">
                <h4 className="text-lg font-medium text-[#DC2626] mb-3">交叉验证矛盾</h4>
                <ul className="space-y-2">
                  {result.crossValidation.filter(c => c.conflict).map((c, idx) => (
                    <li key={idx} className="text-[#991B1B] flex items-start gap-2">
                      <span>⚠️</span>
                      <span><strong>{c.rule || ''}:</strong> {c.detail || ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 预估风险金额 */}
            {result.estimatedRiskAmount && result.estimatedRiskAmount.items && result.estimatedRiskAmount.items.length > 0 && (
              <div className="bg-gradient-to-r from-[#FEE2E2] to-[#FEF3C7] border border-[#FCA5A5] rounded-xl p-6">
                <h4 className="text-lg font-medium text-[#DC2626] mb-4">预估风险金额</h4>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-[#FCA5A5]/50">
                      <th className="text-left py-2 text-[#666666]">风险项</th>
                      <th className="text-right py-2 text-[#666666]">预估补税</th>
                      <th className="text-right py-2 text-[#666666]">罚款(0.5-5倍)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.estimatedRiskAmount.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-[#FCA5A5]/30">
                        <td className="py-2 text-[#991B1B]">{item.name || '未知'}</td>
                        <td className="py-2 text-right text-[#92400E]">{item.taxMin ?? 0}-{item.taxMax ?? 0}万元</td>
                        <td className="py-2 text-right text-[#92400E]">{item.penaltyMin ?? 0}-{item.penaltyMax ?? 0}万元</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-2 text-[#1A1A2E]">合计</td>
                      <td className="py-2 text-right text-[#92400E]">{result.estimatedRiskAmount.totalTaxMin ?? 0}-{result.estimatedRiskAmount.totalTaxMax ?? 0}万元</td>
                      <td className="py-2 text-right text-[#92400E]">{result.estimatedRiskAmount.totalPenaltyMin ?? 0}-{result.estimatedRiskAmount.totalPenaltyMax ?? 0}万元</td>
                    </tr>
                  </tbody>
                </table>
                <div className="bg-white/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#DC2626]">
                    预估总风险金额：{result.estimatedRiskAmount.totalMin ?? 0}-{result.estimatedRiskAmount.totalMax ?? 0}万元
                  </div>
                  <div className="text-sm text-[#666666] mt-2">含补税+滞纳金（约18%）+罚款</div>
                </div>
              </div>
            )}
            
            {/* CTA */}
            <div className="bg-gradient-to-r from-[#EFF6FF] to-[#EDE9FE] border border-[#BFDBFE] rounded-xl p-6 text-center shadow-sm">
              <div className="text-[#1A1A2E] font-bold text-lg mb-4">联系张老师，获取专业筹划方案 + 完整检测报告</div>
              <div className="text-[#666666] mb-4">
                <span className="text-xl mr-4">📞 138-1294-3969</span>
                <span className="text-xl">✉️ zhanglaoshi@hgttax.com</span>
              </div>
              <div className="text-sm text-[#9CA3AF]">
                报告状态: {result.reportStatus || '待审核'} | 检测时间: {new Date().toLocaleString('zh-CN')}
              </div>
            </div>
            
            {compact && onBack && (
              <div className="text-center">
                <button onClick={onBack} className="px-6 py-3 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#1A1A2E] rounded-lg transition-colors">返回首页</button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {!compact && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A2E] mb-2">税智云·财税风险智能检测</h1>
            <p className="text-[#666666]">6分钟完成，基于《智控征管》预警模型</p>
          </div>
        </div>
      )}
      
      <div className={compact ? '' : 'max-w-4xl mx-auto px-4'}>
        {/* 步骤指示器 - BUG4: 蓝色系简洁风格 */}
        {currentStep < 6 && (
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                {idx > 0 && <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-[#2563EB]' : 'bg-[#E5E7EB]'}`} />}
                <button onClick={() => step.id < currentStep && setCurrentStep(step.id)} disabled={step.id > currentStep}
                  className={`flex flex-col items-center min-w-[60px] ${step.id === currentStep ? 'text-[#2563EB]' : step.id < currentStep ? 'text-[#10B981] cursor-pointer' : 'text-[#9CA3AF]'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step.id === currentStep ? 'border-[#2563EB] bg-[#EFF6FF]' : step.id < currentStep ? 'border-[#10B981] bg-[#D1FAE5]' : 'border-[#E5E7EB]'}`}>
                    {step.id < currentStep ? '✓' : step.icon}
                  </div>
                  <span className="text-xs mt-1 whitespace-nowrap">{step.name}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
        
        {/* 内容区 - BUG4: 白色卡片+淡阴影 */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8 shadow-sm">
          {error && (
            <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg text-[#DC2626]">{error}</div>
          )}
          {renderStepContent()}
        </div>
        
        {/* 导航按钮 */}
        {currentStep < 6 && (
          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))} disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${currentStep === 1 ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed' : 'bg-white border border-[#E5E7EB] text-[#1A1A2E] hover:bg-[#F9FAFB]'}`}>
              上一步
            </button>
            
            {currentStep < 5 ? (
              <button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!canProceed()}
                className={`px-8 py-3 rounded-lg font-bold transition-colors ${canProceed() ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm' : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'}`}>
                下一步
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}
                className={`px-8 py-3 rounded-lg font-bold transition-colors ${canProceed() && !isSubmitting ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm' : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'}`}>
                {isSubmitting ? '提交检测中...' : '提交检测'}
              </button>
            )}
          </div>
        )}
      </div>
      
      {!compact && (
        <div className="text-center py-8 text-[#9CA3AF] text-sm">
          由 <Link href="/" className="text-[#2563EB] hover:underline">税智云</Link> 提供技术支持
        </div>
      )}
    </div>
  );
}
