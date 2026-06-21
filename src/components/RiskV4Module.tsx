'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ============== 类型定义 ==============
interface FormData {
  // 步骤1: 基本信息
  enterpriseName: string;
  contactPerson: string;
  contactPhone: string;
  customerEmail: string;
  industry: string;
  revenueScale: string;
  
  // 步骤2-4: 问卷答案
  invoiceAnswers: Record<string, number>;
  revenueCostAnswers: Record<string, number>;
  publicPrivateAnswers: Record<string, number>;
  taxPolicyAnswers: Record<string, number>;
  
  // 步骤5: 财务数据
  revenue: number;
  cost: number;
  profit: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
  receivables: number;
  advanceReceipts: number;
}

interface ResultData {
  riskId: string;
  overallRiskLevel: string;
  riskScore: number;
  estimatedRiskAmount: number;
  riskDetails: string[];
  trendWarnings: string[];
  reportStatus: string;
  moduleScores: {
    invoice: number;
    revenueCost: number;
    publicPrivate: number;
    taxPolicy: number;
  };
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
    revenue: 0,
    cost: 0,
    profit: 0,
    vatPaid: 0,
    incomeTaxPaid: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    receivables: 0,
    advanceReceipts: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 计算财务指标
  const financialMetrics = useMemo(() => {
    const { revenue, cost, profit, vatPaid, incomeTaxPaid, totalAssets, totalLiabilities } = formData;
    
    const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const vatRate = revenue > 0 ? (vatPaid / revenue) * 100 : 0;
    const citRate = revenue > 0 ? (incomeTaxPaid / revenue) * 100 : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    
    return { grossMargin, netMargin, vatRate, citRate, debtRatio };
  }, [formData]);

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
  }, []);

  // 更新问卷答案
  const updateAnswer = useCallback((module: 'invoiceAnswers' | 'revenueCostAnswers' | 'publicPrivateAnswers' | 'taxPolicyAnswers', id: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      [module]: { ...prev[module], [id]: score }
    }));
  }, []);

  // 处理Excel上传
  const handleExcelUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const formDataUpload = new FormData();
    Array.from(files).forEach(file => {
      formDataUpload.append('files', file);
    });
    
    try {
      const response = await fetch('/api/parse-excel', {
        method: 'POST',
        body: formDataUpload
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        const latest = data.data[0]; // 取最新年份
        setFormData(prev => ({
          ...prev,
          revenue: latest.revenue || prev.revenue,
          cost: latest.cost || prev.cost,
          profit: latest.profit || prev.profit,
          vatPaid: latest.vatPaid || prev.vatPaid,
          incomeTaxPaid: latest.incomeTaxPaid || prev.incomeTaxPaid,
          totalAssets: latest.totalAssets || prev.totalAssets,
          totalLiabilities: latest.totalLiabilities || prev.totalLiabilities,
          receivables: latest.receivables || prev.receivables,
          advanceReceipts: latest.advanceReceipts || prev.advanceReceipts
        }));
      }
    } catch (err) {
      console.error('Excel解析失败:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // 提交检测
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
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
          revenue: formData.revenue,
          cost: formData.cost,
          profit: formData.profit,
          vatPaid: formData.vatPaid,
          incomeTaxPaid: formData.incomeTaxPaid,
          totalAssets: formData.totalAssets,
          totalLiabilities: formData.totalLiabilities,
          receivables: formData.receivables,
          advanceReceipts: formData.advanceReceipts,
          grossMargin: financialMetrics.grossMargin,
          netMargin: financialMetrics.netMargin,
          vatRate: financialMetrics.vatRate,
          citRate: financialMetrics.citRate,
          debtRatio: financialMetrics.debtRatio
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          riskId: data.riskId,
          overallRiskLevel: data.overallRiskLevel,
          riskScore: data.riskScore,
          estimatedRiskAmount: data.estimatedRiskAmount,
          riskDetails: data.riskDetails || [],
          trendWarnings: data.trendWarnings || [],
          reportStatus: data.reportStatus,
          moduleScores
        });
        setCurrentStep(6); // 结果页
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
        return formData.contactPerson && formData.contactPhone && formData.industry && formData.revenueScale;
      case 2:
        return INVOICE_QUESTIONS.every(q => formData.invoiceAnswers[q.id] !== undefined);
      case 3:
        return REVENUE_COST_QUESTIONS.every(q => formData.revenueCostAnswers[q.id] !== undefined) &&
               PUBLIC_PRIVATE_QUESTIONS.every(q => formData.publicPrivateAnswers[q.id] !== undefined);
      case 4:
        return TAX_POLICY_QUESTIONS.every(q => formData.taxPolicyAnswers[q.id] !== undefined);
      case 5:
        return formData.revenue > 0 && formData.cost > 0 && formData.profit > 0;
      default:
        return true;
    }
  }, [currentStep, formData]);

  // 渲染风险等级徽章
  const renderRiskBadge = (level: string, score: number) => {
    const colors: Record<string, string> = {
      '低风险': 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
      '中风险': 'bg-amber-500/20 border-amber-500 text-amber-400',
      '高风险': 'bg-orange-500/20 border-orange-500 text-orange-400',
      '极高风险': 'bg-red-500/20 border-red-500 text-red-400'
    };
    
    return (
      <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl border-2 ${colors[level] || colors['中风险']}`}>
        <div className="text-5xl font-bold">{score}</div>
        <div className="text-xl">/ 100</div>
        <div className="text-2xl font-bold ml-4">{level}</div>
      </div>
    );
  };

  // ============== 渲染步骤内容 ==============
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // 基本信息
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">基本信息与所属期</h2>
              <p className="text-slate-400">填写企业信息，系统将根据行业匹配风险基准</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">企业名称</label>
                <input
                  type="text"
                  value={formData.enterpriseName}
                  onChange={(e) => updateFormData('enterpriseName', e.target.value)}
                  placeholder="选填，首次检测可不填"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">联系人 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => updateFormData('contactPerson', e.target.value)}
                  placeholder="必填"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">联系电话 <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => updateFormData('contactPhone', e.target.value)}
                  placeholder="必填，手机号"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">客户邮箱</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateFormData('customerEmail', e.target.value)}
                  placeholder="选填，用于接收完整检测报告"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">所属行业 <span className="text-red-400">*</span></label>
                <select
                  value={formData.industry}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
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
                <label className="block text-sm text-slate-400 mb-2">年营收规模 <span className="text-red-400">*</span></label>
                <select
                  value={formData.revenueScale}
                  onChange={(e) => updateFormData('revenueScale', e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">请选择规模</option>
                  <option value="500万以下">500万以下</option>
                  <option value="500-3000万">500-3000万</option>
                  <option value="3000万-1亿">3000万-1亿</option>
                  <option value="1亿以上">1亿以上</option>
                </select>
              </div>
            </div>
            
            {formData.industry && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">📊 {formData.industry} 行业基准参考</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">增值税税负率:</span>
                    <span className="text-white ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.vatRate || 2.0}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">所得税贡献率:</span>
                    <span className="text-white ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.citRate || 1.5}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400">毛利率:</span>
                    <span className="text-white ml-2">{INDUSTRY_BENCHMARKS[formData.industry]?.grossMargin || 20}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // 发票与资金流风险
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">发票与资金流风险诊断</h2>
              <p className="text-slate-400">权重30%，满分30分</p>
            </div>
            
            <div className="space-y-4">
              {INVOICE_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-white">{q.question}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => updateAnswer('invoiceAnswers', q.id, q.scores[optIdx])}
                        className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                          formData.invoiceAnswers[q.id] === q.scores[optIdx]
                            ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                            : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg text-center">
              <span className="text-slate-400">当前得分: </span>
              <span className="text-blue-400 font-bold text-xl">{moduleScores.invoice}</span>
              <span className="text-slate-400"> / 30分</span>
            </div>
          </div>
        );

      case 3: // 收入成本 + 公私账户
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">收入成本 + 公私账户风险</h2>
              <p className="text-slate-400">权重50%，满分50分</p>
            </div>
            
            {/* 收入与成本 */}
            <div>
              <h3 className="text-lg font-medium text-emerald-400 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-sm">A</span>
                收入与成本合规风险（权重25%）
              </h3>
              <div className="space-y-4">
                {REVENUE_COST_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-white">{q.question}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => updateAnswer('revenueCostAnswers', q.id, q.scores[optIdx])}
                          className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                            formData.revenueCostAnswers[q.id] === q.scores[optIdx]
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
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
              <h3 className="text-lg font-medium text-purple-400 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-sm">B</span>
                公私账户与股东风险（权重25%）
              </h3>
              <div className="space-y-4">
                {PUBLIC_PRIVATE_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-white">{q.question}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {q.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => updateAnswer('publicPrivateAnswers', q.id, q.scores[optIdx])}
                          className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                            formData.publicPrivateAnswers[q.id] === q.scores[optIdx]
                              ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                              : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg text-center">
              <span className="text-slate-400">当前得分: </span>
              <span className="text-purple-400 font-bold text-xl">{moduleScores.revenueCost + moduleScores.publicPrivate}</span>
              <span className="text-slate-400"> / 50分</span>
            </div>
          </div>
        );

      case 4: // 税务申报
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">税务申报与政策适用风险</h2>
              <p className="text-slate-400">权重20%，满分20分</p>
            </div>
            
            <div className="space-y-4">
              {TAX_POLICY_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-white">{q.question}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button
                        key={optIdx}
                        onClick={() => updateAnswer('taxPolicyAnswers', q.id, q.scores[optIdx])}
                        className={`px-4 py-3 rounded-lg border text-sm transition-all ${
                          formData.taxPolicyAnswers[q.id] === q.scores[optIdx]
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg text-center">
              <span className="text-slate-400">当前得分: </span>
              <span className="text-amber-400 font-bold text-xl">{moduleScores.taxPolicy}</span>
              <span className="text-slate-400"> / 20分</span>
            </div>
          </div>
        );

      case 5: // 财务数据
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">关键财务数据</h2>
              <p className="text-slate-400">上传近3年报表，系统将自动识别财务指标异动趋势</p>
            </div>
            
            {/* Excel上传区域 */}
            <div className="mb-8">
              <label className="block text-sm text-slate-400 mb-3">方式一：上传Excel报表（推荐）</label>
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  multiple
                  onChange={(e) => handleExcelUpload(e.target.files)}
                  className="hidden"
                  id="excel-upload"
                  disabled={isUploading}
                />
                <label htmlFor="excel-upload" className="cursor-pointer">
                  {isUploading ? (
                    <div className="text-blue-400">解析中...</div>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">📊</div>
                      <div className="text-white mb-2">把你手上的报表文件拖进来</div>
                      <div className="text-slate-400 text-sm">支持 Excel/CSV 文件，可多选</div>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            {/* 手动填列 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h4 className="text-lg font-medium text-white mb-4">方式二：手动填列（最近年度数据）</h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">营业收入(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.revenue || ''}
                    onChange={(e) => updateFormData('revenue', parseFloat(e.target.value) || 0)}
                    placeholder="利润表第1行"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">营业成本(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.cost || ''}
                    onChange={(e) => updateFormData('cost', parseFloat(e.target.value) || 0)}
                    placeholder="利润表第2行"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">利润总额(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.profit || ''}
                    onChange={(e) => updateFormData('profit', parseFloat(e.target.value) || 0)}
                    placeholder="利润表倒数第3行"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">实缴增值税(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.vatPaid || ''}
                    onChange={(e) => updateFormData('vatPaid', parseFloat(e.target.value) || 0)}
                    placeholder="纳税申报表/应交税费明细"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">实缴所得税(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.incomeTaxPaid || ''}
                    onChange={(e) => updateFormData('incomeTaxPaid', parseFloat(e.target.value) || 0)}
                    placeholder="纳税申报表/应交税费明细"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">总资产(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.totalAssets || ''}
                    onChange={(e) => updateFormData('totalAssets', parseFloat(e.target.value) || 0)}
                    placeholder="资产负债表左下角合计"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">总负债(万元) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={formData.totalLiabilities || ''}
                    onChange={(e) => updateFormData('totalLiabilities', parseFloat(e.target.value) || 0)}
                    placeholder="资产负债表右下角合计"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">应收账款(万元)</label>
                  <input
                    type="number"
                    value={formData.receivables || ''}
                    onChange={(e) => updateFormData('receivables', parseFloat(e.target.value) || 0)}
                    placeholder="资产负债表流动资产行"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-slate-400 mb-2">预收账款(万元)</label>
                  <input
                    type="number"
                    value={formData.advanceReceipts || ''}
                    onChange={(e) => updateFormData('advanceReceipts', parseFloat(e.target.value) || 0)}
                    placeholder="资产负债表流动负债行"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            
            {/* 自动计算指标 */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
              <h4 className="text-lg font-medium text-white mb-4">📊 自动计算指标</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{financialMetrics.grossMargin.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">毛利率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{financialMetrics.netMargin.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">净利率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{financialMetrics.vatRate.toFixed(2)}%</div>
                  <div className="text-sm text-slate-400">增值税税负率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{financialMetrics.citRate.toFixed(2)}%</div>
                  <div className="text-sm text-slate-400">所得税贡献率</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-400">{financialMetrics.debtRatio.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">资产负债率</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 6: // 结果页
        if (!result) return null;
        
        const riskColors: Record<string, string> = {
          '低风险': 'emerald',
          '中风险': 'amber',
          '高风险': 'orange',
          '极高风险': 'red'
        };
        const color = riskColors[result.overallRiskLevel] || 'amber';
        
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">税务风险智能检测报告</h2>
              <p className="text-slate-400">基于《智控征管》预警模型 × 金税四期公开参数</p>
              <p className="text-slate-500 text-sm mt-1">检测ID: {result.riskId}</p>
            </div>
            
            {/* 综合风险等级 */}
            <div className={`bg-${color}-500/10 border-2 border-${color}-500/50 rounded-2xl p-8 text-center`}>
              <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-2xl border-2 bg-${color}-500/20`}>
                <div className={`text-6xl font-bold text-${color}-400`}>{result.riskScore}</div>
                <div className="text-xl text-slate-300">/ 100</div>
                <div className={`text-3xl font-bold ml-4 text-${color}-400`}>{result.overallRiskLevel}</div>
              </div>
            </div>
            
            {/* 模块得分 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{result.moduleScores.invoice}</div>
                <div className="text-sm text-slate-400">发票与资金流</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{result.moduleScores.revenueCost}</div>
                <div className="text-sm text-slate-400">收入与成本</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{result.moduleScores.publicPrivate}</div>
                <div className="text-sm text-slate-400">公私账户</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{result.moduleScores.taxPolicy}</div>
                <div className="text-sm text-slate-400">税务申报</div>
              </div>
            </div>
            
            {/* 财务指标 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h4 className="text-lg font-medium text-white mb-4">财务指标分析</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{financialMetrics.grossMargin.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">毛利率</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{financialMetrics.netMargin.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">净利率</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{financialMetrics.vatRate.toFixed(2)}%</div>
                  <div className="text-xs text-slate-400">增值税税负率</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{financialMetrics.citRate.toFixed(2)}%</div>
                  <div className="text-xs text-slate-400">所得税贡献率</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white">{financialMetrics.debtRatio.toFixed(1)}%</div>
                  <div className="text-xs text-slate-400">资产负债率</div>
                </div>
              </div>
            </div>
            
            {/* 风险项明细 */}
            {result.riskDetails.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                <h4 className="text-lg font-medium text-red-400 mb-3">⚠️ 风险项明细</h4>
                <ul className="space-y-2">
                  {result.riskDetails.map((detail, idx) => (
                    <li key={idx} className="text-red-300 flex items-start gap-2">
                      <span>•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 趋势预警 */}
            {result.trendWarnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
                <h4 className="text-lg font-medium text-amber-400 mb-3">🔶 趋势预警</h4>
                <ul className="space-y-2">
                  {result.trendWarnings.map((warning, idx) => (
                    <li key={idx} className="text-amber-300 flex items-start gap-2">
                      <span>•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* 预估风险金额 */}
            {result.estimatedRiskAmount > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
                <div className="text-sm text-slate-400 mb-2">预估潜在补税风险金额</div>
                <div className="text-3xl font-bold text-rose-400">{result.estimatedRiskAmount.toFixed(2)} 万元</div>
              </div>
            )}
            
            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-6 text-center">
              <div className="text-white font-bold text-lg mb-4">联系张老师，获取专业筹划方案 + 完整检测报告</div>
              <div className="text-slate-400 mb-4">
                <span className="text-xl mr-4">📞 138-1294-3969</span>
                <span className="text-xl">✉️ zhanglaoshi@hgttax.com</span>
              </div>
              <div className="text-sm text-slate-500">
                报告状态: {result.reportStatus} | 检测时间: {new Date().toLocaleString('zh-CN')}
              </div>
            </div>
            
            {compact && onBack && (
              <div className="text-center">
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  返回首页
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {!compact && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">税智云·财税风险智能检测</h1>
            <p className="text-slate-400">6分钟完成，基于《智控征管》预警模型</p>
          </div>
        </div>
      )}
      
      <div className={compact ? '' : 'max-w-4xl mx-auto px-4'}>
        {/* 步骤指示器 */}
        {currentStep < 6 && (
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-blue-500' : 'bg-slate-700'}`} />
                )}
                <button
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex flex-col items-center min-w-[60px] ${
                    step.id === currentStep ? 'text-blue-400' : 
                    step.id < currentStep ? 'text-green-400 cursor-pointer' : 'text-slate-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                    step.id === currentStep ? 'border-blue-500 bg-blue-500/20' :
                    step.id < currentStep ? 'border-green-500 bg-green-500/20' : 'border-slate-600'
                  }`}>
                    {step.id < currentStep ? '✓' : step.icon}
                  </div>
                  <span className="text-xs mt-1 whitespace-nowrap">{step.name}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
        
        {/* 内容区 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}
          
          {renderStepContent()}
        </div>
        
        {/* 导航按钮 */}
        {currentStep < 6 && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 1 
                  ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              上一步
            </button>
            
            {currentStep < 5 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className={`px-8 py-3 rounded-lg font-bold transition-colors ${
                  canProceed()
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                下一步
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`px-8 py-3 rounded-lg font-bold transition-colors ${
                  canProceed() && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? '提交检测中...' : '提交检测'}
              </button>
            )}
          </div>
        )}
        
        {/* 返回首页 */}
        {currentStep === 6 && compact && onBack && (
          <div className="text-center mt-6">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
      
      {!compact && (
        <div className="text-center py-8 text-slate-500 text-sm">
          由 <Link href="/" className="text-blue-400 hover:underline">税智云</Link> 提供技术支持
        </div>
      )}
    </div>
  );
}
