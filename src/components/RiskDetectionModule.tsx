'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ShieldIcon,
  AlertTriangleIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BuildingIcon,
  DollarSignIcon,
  PercentIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  ClipboardIcon,
} from './icons';

interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'extreme' | null;
  label: string;
  color: string;
  bgColor: string;
}

const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 0) return { level: 'low', label: '低风险', color: '#34a853', bgColor: 'rgba(52,168,83,0.15)' };
  if (score <= 2) return { level: 'medium', label: '中风险', color: '#fbbc04', bgColor: 'rgba(251,188,4,0.15)' };
  if (score <= 5) return { level: 'high', label: '高风险', color: '#ea4335', bgColor: 'rgba(234,67,53,0.15)' };
  return { level: 'extreme', label: '极高风险', color: '#5f6368', bgColor: 'rgba(95,99,104,0.15)' };
};

const getRiskLevelSimple = (option: string): RiskLevel => {
  const highRiskKeywords = ['有', '差很多', '被查过', '较多'];
  const mediumRiskKeywords = ['不确定', '有点差距', '少量', '被提醒过'];
  
  if (highRiskKeywords.some(k => option.includes(k))) {
    return { level: 'high', label: '红灯', color: '#ea4335', bgColor: 'rgba(234,67,53,0.15)' };
  }
  if (mediumRiskKeywords.some(k => option.includes(k))) {
    return { level: 'medium', label: '黄灯', color: '#fbbc04', bgColor: 'rgba(251,188,4,0.15)' };
  }
  return { level: 'low', label: '绿灯', color: '#34a853', bgColor: 'rgba(52,168,83,0.15)' };
};

const INDUSTRY_BENCHMARKS: Record<string, {
  vatRate: { min: number; max: number; warning: number; label: string };
  citRate: { min: number; max: number; warning: number; label: string };
  grossMargin: { min: number; max: number; warning: number; label: string };
  netMargin: { min: number; max: number; warning: number; label: string };
  debtRatio: { min: number; max: number; warning: number; label: string };
  receivablesTurnover: { min: number; max: number; warning: number; label: string };
  inventoryTurnover: { min: number; max: number; warning: number; label: string };
  advanceRatio: { min: number; max: number; warning: number; label: string };
}> = {
  '商贸批发零售': {
    vatRate: { min: 0.9, max: 1.5, warning: 0.63, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 5, max: 20, warning: 5, label: '毛利率' },
    netMargin: { min: 1, max: 4, warning: 0.5, label: '净利率' },
    debtRatio: { min: 40, max: 60, warning: 70, label: '资产负债率' },
    receivablesTurnover: { min: 5, max: 15, warning: 3, label: '应收账款周转率' },
    inventoryTurnover: { min: 4, max: 12, warning: 2, label: '存货周转率' },
    advanceRatio: { min: 0, max: 10, warning: 20, label: '预收账款占比' }
  },
  '建筑工程': {
    vatRate: { min: 2.5, max: 3.5, warning: 1.75, label: '增值税税负率' },
    citRate: { min: 1.5, max: 3.0, warning: 1.0, label: '所得税贡献率' },
    grossMargin: { min: 8, max: 15, warning: 8, label: '毛利率' },
    netMargin: { min: 2, max: 6, warning: 1, label: '净利率' },
    debtRatio: { min: 60, max: 80, warning: 85, label: '资产负债率' },
    receivablesTurnover: { min: 2, max: 6, warning: 1, label: '应收账款周转率' },
    inventoryTurnover: { min: 3, max: 8, warning: 1.5, label: '存货周转率' },
    advanceRatio: { min: 10, max: 30, warning: 40, label: '预收账款占比' }
  },
  '制造业': {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: '增值税税负率' },
    citRate: { min: 2.0, max: 4.0, warning: 1.2, label: '所得税贡献率' },
    grossMargin: { min: 15, max: 30, warning: 15, label: '毛利率' },
    netMargin: { min: 3, max: 8, warning: 2, label: '净利率' },
    debtRatio: { min: 40, max: 65, warning: 75, label: '资产负债率' },
    receivablesTurnover: { min: 3, max: 10, warning: 2, label: '应收账款周转率' },
    inventoryTurnover: { min: 3, max: 8, warning: 1.5, label: '存货周转率' },
    advanceRatio: { min: 0, max: 8, warning: 15, label: '预收账款占比' }
  },
  '餐饮住宿': {
    vatRate: { min: 1.5, max: 2.5, warning: 1.05, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 50, max: 65, warning: 50, label: '毛利率' },
    netMargin: { min: 5, max: 15, warning: 3, label: '净利率' },
    debtRatio: { min: 40, max: 60, warning: 70, label: '资产负债率' },
    receivablesTurnover: { min: 20, max: 50, warning: 10, label: '应收账款周转率' },
    inventoryTurnover: { min: 15, max: 40, warning: 8, label: '存货周转率' },
    advanceRatio: { min: 5, max: 15, warning: 25, label: '预收账款占比' }
  },
  '服务业/咨询': {
    vatRate: { min: 2.5, max: 4.0, warning: 1.75, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 40, max: 70, warning: 40, label: '毛利率' },
    netMargin: { min: 8, max: 20, warning: 5, label: '净利率' },
    debtRatio: { min: 30, max: 50, warning: 60, label: '资产负债率' },
    receivablesTurnover: { min: 3, max: 10, warning: 1.5, label: '应收账款周转率' },
    inventoryTurnover: { min: 0, max: 0, warning: 0, label: '存货周转率' },
    advanceRatio: { min: 10, max: 25, warning: 35, label: '预收账款占比' }
  },
  '科技/软件': {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: '增值税税负率' },
    citRate: { min: 5.0, max: 12.0, warning: 3.0, label: '所得税贡献率' },
    grossMargin: { min: 40, max: 70, warning: 40, label: '毛利率' },
    netMargin: { min: 10, max: 25, warning: 8, label: '净利率' },
    debtRatio: { min: 30, max: 50, warning: 60, label: '资产负债率' },
    receivablesTurnover: { min: 4, max: 12, warning: 2, label: '应收账款周转率' },
    inventoryTurnover: { min: 0, max: 0, warning: 0, label: '存货周转率' },
    advanceRatio: { min: 5, max: 20, warning: 30, label: '预收账款占比' }
  },
  '房地产': {
    vatRate: { min: 3.0, max: 5.0, warning: 2.1, label: '增值税税负率' },
    citRate: { min: 3.0, max: 6.0, warning: 2.0, label: '所得税贡献率' },
    grossMargin: { min: 25, max: 40, warning: 25, label: '毛利率' },
    netMargin: { min: 5, max: 15, warning: 3, label: '净利率' },
    debtRatio: { min: 70, max: 85, warning: 90, label: '资产负债率' },
    receivablesTurnover: { min: 0.5, max: 2, warning: 0.3, label: '应收账款周转率' },
    inventoryTurnover: { min: 0.2, max: 0.8, warning: 0.1, label: '存货周转率' },
    advanceRatio: { min: 20, max: 50, warning: 60, label: '预收账款占比' }
  }
};

const INDUSTRIES = [
  '商贸批发零售',
  '建筑工程',
  '制造业',
  '餐饮住宿',
  '服务业/咨询',
  '科技/软件',
  '房地产'
];

const FINANCIAL_FIELDS = [
  { key: 'revenue', label: '营业收入', source: '利润表第1行', unit: '万元' },
  { key: 'cost', label: '营业成本', source: '利润表第2行', unit: '万元' },
  { key: 'profit', label: '利润总额', source: '利润表倒数第3行', unit: '万元' },
  { key: 'vat', label: '实缴增值税', source: '纳税申报表/应交税费明细', unit: '万元' },
  { key: 'cit', label: '实缴企业所得税', source: '纳税申报表/应交税费明细', unit: '万元' },
  { key: 'totalAssets', label: '总资产', source: '资产负债表左下角合计', unit: '万元' },
  { key: 'totalLiabilities', label: '总负债', source: '资产负债表右下角合计', unit: '万元' },
  { key: 'receivables', label: '应收账款', source: '资产负债表流动资产行', unit: '万元' },
  { key: 'inventory', label: '期末存货', source: '资产负债表流动资产行', unit: '万元' },
  { key: 'advancePayment', label: '预收账款', source: '资产负债表流动负债行', unit: '万元' }
];

const RISK_QUESTIONS = [
  { id: 'q1', question: '公司有没有用老板个人卡收过钱？', options: ['没有', '有', '不确定'] },
  { id: 'q2', question: '老板从公司拿钱，有没有超过一年没还的？', options: ['没有', '有', '不确定'] },
  { id: 'q3', question: '账上有没有长期挂着的往来款？', options: ['没有', '有', '不确定'] },
  { id: 'q4', question: '买东西有没有不要发票便宜点的情况？', options: ['没有', '有', '不确定'] },
  { id: 'q5', question: '工资和个税申报数对得上吗？', options: ['对得上', '有点差距', '差很多'] },
  { id: 'q6', question: '成本里有没发票的部分吗？', options: ['没有', '少量', '较多'] },
  { id: 'q7', question: '最近3年有没有被税务找过？', options: ['没有被找过', '被提醒过', '被查过'] }
];

interface RiskQuestionAnswer {
  id: string;
  selected: string;
  riskLevel: 'low' | 'medium' | 'high' | null;
}

export default function RiskDetectionModule() {
  const [step, setStep] = useState(1);
  
  // Step 1: 基本信息
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Step 2: 财务数据 + 风险问卷
  const [financialData, setFinancialData] = useState<Record<string, string>>({});
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});
  
  // Step 3: 检测结果
  const [riskScore, setRiskScore] = useState(0);
  const [financialResults, setFinancialResults] = useState<any[]>([]);
  const [questionResults, setQuestionResults] = useState<RiskQuestionAnswer[]>([]);
  
  // 保存状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const updateFinancialData = (key: string, value: string) => {
    setFinancialData(prev => ({ ...prev, [key]: value }));
  };

  const updateRiskAnswer = (id: string, answer: string) => {
    setRiskAnswers(prev => ({ ...prev, [id]: answer }));
  };

  const calculateResults = async () => {
    const revenue = parseFloat(financialData.revenue) || 0;
    const cost = parseFloat(financialData.cost) || 0;
    const profit = parseFloat(financialData.profit) || 0;
    const vat = parseFloat(financialData.vat) || 0;
    const cit = parseFloat(financialData.cit) || 0;
    const totalAssets = parseFloat(financialData.totalAssets) || 0;
    const totalLiabilities = parseFloat(financialData.totalLiabilities) || 0;
    const receivables = parseFloat(financialData.receivables) || 0;
    const inventory = parseFloat(financialData.inventory) || 0;
    const advancePayment = parseFloat(financialData.advancePayment) || 0;

    const benchmark = INDUSTRY_BENCHMARKS[industry];
    if (!benchmark || revenue === 0) return;

    // 计算8项指标
    const vatRate = revenue > 0 ? (vat / revenue) * 100 : 0;
    const citRate = revenue > 0 ? (cit / revenue) * 100 : 0;
    const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    const receivablesTurnover = receivables > 0 ? revenue / receivables : 0;
    const inventoryTurnover = inventory > 0 ? cost / inventory : 0;
    const advanceRatio = revenue > 0 ? (advancePayment / revenue) * 100 : 0;

    type MetricBenchmark = { min: number; max: number; warning: number; label: string };
    
    const metrics: { key: string; value: number; benchmark: MetricBenchmark; name: string; unit: string; inverted?: boolean }[] = [
      { key: 'vatRate', value: vatRate, benchmark: benchmark.vatRate, name: '增值税税负率', unit: '%' },
      { key: 'citRate', value: citRate, benchmark: benchmark.citRate, name: '所得税贡献率', unit: '%' },
      { key: 'grossMargin', value: grossMargin, benchmark: benchmark.grossMargin, name: '毛利率', unit: '%' },
      { key: 'netMargin', value: netMargin, benchmark: benchmark.netMargin, name: '净利率', unit: '%' },
      { key: 'debtRatio', value: debtRatio, benchmark: benchmark.debtRatio, name: '资产负债率', unit: '%', inverted: true },
      { key: 'receivablesTurnover', value: receivablesTurnover, benchmark: benchmark.receivablesTurnover, name: '应收账款周转率', unit: '次' },
      { key: 'inventoryTurnover', value: inventoryTurnover, benchmark: benchmark.inventoryTurnover, name: '存货周转率', unit: '次' },
      { key: 'advanceRatio', value: advanceRatio, benchmark: benchmark.advanceRatio, name: '预收账款占比', unit: '%' }
    ];

    const results = metrics.map(m => {
      const { min, max, warning } = m.benchmark;
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let deviation = 0;
      
      if (m.key === 'inventoryTurnover' && inventory === 0) {
        return { ...m, riskLevel: 'low', deviation: 0, status: '不适用' };
      }
      if (m.key === 'receivablesTurnover' && receivables === 0) {
        return { ...m, riskLevel: 'low', deviation: 0, status: '不适用' };
      }

      if (m.inverted) {
        // 资产负债率：高于上限才危险
        if (m.value > warning * 0.6) riskLevel = 'high';
        else if (m.value > max) riskLevel = 'medium';
        else if (m.value > min) riskLevel = 'low';
        deviation = m.value > max ? ((m.value - max) / max) * 100 : 0;
      } else {
        // 其他指标：低于下限才危险
        if (m.value < warning * 0.6) riskLevel = 'high';
        else if (m.value < min) riskLevel = 'medium';
        else if (m.value <= max) riskLevel = 'low';
        deviation = m.value < min ? ((min - m.value) / min) * 100 : 0;
      }

      return { 
        ...m, 
        riskLevel, 
        deviation,
        range: `${min.toFixed(1)}-${max.toFixed(1)}${m.unit}`
      };
    });

    // 计算财务指标得分
    const financialScore = results.reduce((score, r) => {
      if (r.riskLevel === 'high') return score + 1;
      return score;
    }, 0);

    // 计算风险问题得分
    const questionResultsData: RiskQuestionAnswer[] = RISK_QUESTIONS.map(q => {
      const selected = riskAnswers[q.id] || '';
      const riskLevel = selected ? getRiskLevelSimple(selected).level as 'low' | 'medium' | 'high' : null;
      return { id: q.id, selected, riskLevel };
    });

    const questionScore = questionResultsData.reduce((score, q) => {
      if (q.riskLevel === 'high') return score + 1;
      if (q.riskLevel === 'medium') return score + 0.5;
      return score;
    }, 0);

    const totalScore = financialScore + questionScore;

    setFinancialResults(results);
    setQuestionResults(questionResultsData);
    setRiskScore(totalScore);
    setStep(3);
    setSaveStatus('saving');
    setSaveMessage('正在保存...');

    // 保存到飞书
    const saveResult = await saveToFeishu(revenue, cost, profit, vat, cit, totalAssets, totalLiabilities, receivables, inventory, advancePayment, results, questionResultsData, totalScore);
    
    if (saveResult.success) {
      setSaveStatus('success');
      setSaveMessage(`报告已保存，ID: ${saveResult.detectionId}`);
    } else {
      setSaveStatus('error');
      setSaveMessage(saveResult.error || '保存失败，请重试');
    }
  };

  // 保存到飞书（通过后端API）
  const saveToFeishu = async (
    revenue: number, cost: number, profit: number, vat: number, cit: number,
    totalAssets: number, totalLiabilities: number, receivables: number, inventory: number, advancePayment: number,
    results: any[], questions: RiskQuestionAnswer[], totalScore: number
  ) => {
    try {
      // 风险项明细
      const riskItems = questions
        .filter(q => q.riskLevel !== 'low')
        .map(q => `${q.id}:${q.selected}`)
        .join(';');

      // 财务指标结果JSON
      const generalRiskResults = JSON.stringify(
        results.map(r => ({
          key: r.key,
          name: r.name,
          value: r.value,
          riskLevel: r.riskLevel,
          range: r.range
        }))
      );

      // 风险问卷结果JSON
      const industryRiskResults = JSON.stringify(
        questions.map(q => ({
          id: q.id,
          question: q.selected,
          riskLevel: q.riskLevel
        }))
      );

      // 计算8项财务指标
      const vatRate = revenue > 0 ? (vat / revenue) * 100 : 0;
      const citRate = revenue > 0 ? (cit / revenue) * 100 : 0;
      const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

      const response = await fetch('/api/risk-detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // 基本信息
          enterpriseName: companyName,
          contactPerson: '',
          contactPhone: contactPhone,
          customerEmail: '',
          industry: industry,
          detectionYear: new Date().getFullYear(),
          
          // 财务数据
          revenue,
          cost,
          profit,
          vat,
          cit,
          totalAssets,
          totalLiabilities,
          receivables,
          inventory,
          advancePayment,
          
          // 财务指标
          vatRate: vatRate.toFixed(2),
          citRate: citRate.toFixed(2),
          grossMargin: grossMargin.toFixed(2),
          netMargin: netMargin.toFixed(2),
          debtRatio: debtRatio.toFixed(2),
          
          // 风险信息
          riskScore: totalScore,
          riskDetails: riskItems || '无明显风险',
          generalRiskResults,
          industryRiskResults,
          reportStatus: '待审核'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, detectionId: data.data?.detectionId };
      } else {
        return { success: false, error: data.error || '保存失败' };
      }
    } catch (err) {
      console.error('保存失败:', err);
      return { success: false, error: '网络错误，请重试' };
    }
  };

  const canProceed = () => {
    if (step === 1) {
      return companyName && industry && contactPhone;
    }
    if (step === 2) {
      // 至少填一个财务数字
      return Object.values(financialData).some(v => v && parseFloat(v) > 0);
    }
    return true;
  };

  const riskLevelInfo = getRiskLevel(riskScore);
  const planCount = questionResults.filter(q => q.riskLevel === 'medium').length;
  const riskCount = questionResults.filter(q => q.riskLevel === 'high').length;

  return (
    <div className="h-full flex flex-col bg-[#0D0F14]">
      {/* Header */}
      <div className="p-6 border-b border-[#2A303C]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
            <ShieldIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#F1F5F9]">税务风险智能检测</h2>
            <p className="text-xs text-[#94A3B8]">6分钟完成 · 基于《智控征管》预警模型</p>
          </div>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <button
                onClick={() => s < step && setStep(s)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
                  step === s ? 'bg-[#3B82F6] text-white' :
                  s < step ? 'bg-[#2A303C] text-[#94A3B8] cursor-pointer hover:bg-[#3B82F6]/30' :
                  'bg-[#1a1d24] text-[#64748b]'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                  step === s ? 'bg-white/20' :
                  s < step ? 'bg-[#3B82F6]/30' : ''
                )}>
                  {s}
                </span>
                <span className="hidden sm:inline">
                  {s === 1 ? '基本信息' : s === 2 ? '财务+问卷' : '检测结果'}
                </span>
              </button>
              {s < 3 && <div className={cn('w-8 h-0.5', step > s ? 'bg-[#3B82F6]' : 'bg-[#2A303C]')} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Step 1: 基本信息 */}
        {step === 1 && (
          <div className="max-w-lg mx-auto space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#F1F5F9]">
                企业名称 <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="请输入企业名称"
                className="w-full px-4 py-3 bg-[#161A22] border border-[#2A303C] rounded-lg text-[#F1F5F9] placeholder-[#64748b] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#F1F5F9]">
                所属行业 <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full px-4 py-3 bg-[#161A22] border border-[#2A303C] rounded-lg text-[#F1F5F9] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-all appearance-none"
                >
                  <option value="">请选择所属行业</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#F1F5F9]">
                联系电话 <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                placeholder="用于接收检测报告"
                className="w-full px-4 py-3 bg-[#161A22] border border-[#2A303C] rounded-lg text-[#F1F5F9] placeholder-[#64748b] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6] transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 2: 财务数据 + 风险问卷 */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* 10个财务数字 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-6">
              <h3 className="text-base font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <DollarSignIcon className="w-5 h-5 text-[#3B82F6]" />
                财务数据（单位：万元）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FINANCIAL_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1">
                    <label className="block text-sm text-[#94A3B8]">
                      {field.label}
                      <span className="text-[#64748b] text-xs ml-2">（{field.source}）</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={financialData[field.key] || ''}
                        onChange={e => updateFinancialData(field.key, e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-[#0D0F14] border border-[#2A303C] rounded-lg text-[#F1F5F9] placeholder-[#64748b] focus:border-[#3B82F6] focus:outline-none text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748b]">
                        {field.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[#64748b]">
                💡 提示：数据来自企业报表，至少填写营业收入即可开始检测
              </p>
            </div>

            {/* 7个风险问题 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-6">
              <h3 className="text-base font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-[#F59E0B]" />
                风险问卷（7道题）
              </h3>
              <div className="space-y-4">
                {RISK_QUESTIONS.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-[#0D0F14] rounded-lg border border-[#2A303C]">
                    <p className="text-sm text-[#F1F5F9] mb-3">
                      <span className="text-[#3B82F6] font-mono mr-2">{idx + 1}.</span>
                      {q.question}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => updateRiskAnswer(q.id, opt)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm transition-all',
                            riskAnswers[q.id] === opt
                              ? 'bg-[#3B82F6] text-white'
                              : 'bg-[#1a1d24] text-[#94A3B8] hover:bg-[#2A303C]'
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: 检测结果 */}
        {step === 3 && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* 顶部综合风险等级 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-8 text-center">
              <div 
                className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4"
                style={{ backgroundColor: riskLevelInfo.bgColor, border: `3px solid ${riskLevelInfo.color}` }}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: riskLevelInfo.color }}>
                    {riskScore.toFixed(1)}
                  </div>
                  <div className="text-xs" style={{ color: riskLevelInfo.color }}>风险分</div>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: riskLevelInfo.color }}>
                {riskLevelInfo.label}
              </h3>
              <p className="text-sm text-[#94A3B8]">
                基于《智控征管》预警模型 × 金税四期公开参数
              </p>
            </div>

            {/* 8项财务指标 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-6">
              <h3 className="text-base font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <PercentIcon className="w-5 h-5 text-[#3B82F6]" />
                财务指标分析
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {financialResults.map((result, idx) => {
                  const riskColors: Record<string, string> = {
                    low: '#34a853',
                    medium: '#fbbc04',
                    high: '#ea4335'
                  };
                  const color = riskColors[result.riskLevel] || '#34a853';
                  
                  return (
                    <div 
                      key={idx}
                      className="p-4 bg-[#0D0F14] rounded-lg border border-[#2A303C]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#94A3B8] truncate">{result.name}</span>
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                      <div className="text-xl font-bold text-[#F1F5F9]">
                        {result.value.toFixed(1)}
                        <span className="text-xs text-[#64748b] ml-1">{result.unit}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#64748b]">
                        行业区间: {result.range || '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7个风险问题结果 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-6">
              <h3 className="text-base font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-[#F59E0B]" />
                风险问卷结果
              </h3>
              <div className="space-y-3">
                {questionResults.map((qr, idx) => {
                  const q = RISK_QUESTIONS.find(x => x.id === qr.id);
                  const riskColors: Record<string, string> = {
                    low: '#34a853',
                    medium: '#fbbc04',
                    high: '#ea4335'
                  };
                  const color = qr.riskLevel ? riskColors[qr.riskLevel] : '#64748b';
                  
                  return (
                    <div 
                      key={qr.id}
                      className="flex items-center gap-3 p-3 bg-[#0D0F14] rounded-lg"
                    >
                      <span className="text-sm text-[#94A3B8] w-6">{idx + 1}.</span>
                      <span className="flex-1 text-sm text-[#F1F5F9]">{q?.question}</span>
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {qr.selected || '未回答'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 统计摘要 */}
            <div className="bg-[#161A22] rounded-xl border border-[#2A303C] p-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(52,168,83,0.15)]">
                  <TrendingUpIcon className="w-5 h-5 text-[#34a853]" />
                  <span className="text-[#34a853] text-sm">
                    发现 <strong>{planCount}</strong> 项可筹划风险
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(234,67,53,0.15)]">
                  <TrendingDownIcon className="w-5 h-5 text-[#ea4335]" />
                  <span className="text-[#ea4335] text-sm">
                    发现 <strong>{riskCount}</strong> 项需整改风险
                  </span>
                </div>
              </div>
            </div>

            {/* 保存状态提示 */}
            {saveStatus !== 'idle' && (
              <div className={cn(
                'rounded-lg p-4 text-center',
                saveStatus === 'saving' && 'bg-[#2A303C]/50',
                saveStatus === 'success' && 'bg-[rgba(52,168,83,0.15)]',
                saveStatus === 'error' && 'bg-[rgba(234,67,53,0.15)]'
              )}>
                {saveStatus === 'saving' && (
                  <span className="text-[#94A3B8]">保存中...</span>
                )}
                {saveStatus === 'success' && (
                  <div className="flex items-center justify-center gap-2 text-[#34a853]">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>{saveMessage}</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center justify-center gap-2 text-[#ea4335]">
                    <AlertTriangleIcon className="w-5 h-5" />
                    <span>{saveMessage}</span>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 rounded-xl border border-[#3B82F6]/30 p-6 text-center">
              <h4 className="text-lg font-semibold text-[#F1F5F9] mb-2">
                需要专业指导？
              </h4>
              <p className="text-sm text-[#94A3B8] mb-4">
                联系张老师，获取筹划方案 + 完整检测报告
              </p>
              <div className="flex flex-wrap gap-4 justify-center mb-4">
                <a 
                  href="tel:138-1294-3969"
                  className="flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-colors"
                >
                  <PhoneIcon className="w-5 h-5" />
                  138-1294-3969
                </a>
                <a 
                  href="mailto:zhanglaoshi@hgttax.com"
                  className="flex items-center gap-2 px-6 py-3 bg-[#161A22] border border-[#2A303C] hover:border-[#3B82F6] text-[#F1F5F9] rounded-lg transition-colors"
                >
                  <MailIcon className="w-5 h-5" />
                  zhanglaoshi@hgttax.com
                </a>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-[#94A3B8] hover:text-[#3B82F6] transition-colors"
              >
                重新检测
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-[#2A303C]">
        <div className="flex justify-between max-w-lg mx-auto">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-6 py-3 bg-[#161A22] border border-[#2A303C] text-[#94A3B8] rounded-lg hover:border-[#3B82F6] hover:text-[#F1F5F9] transition-all"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              上一步
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={async () => {
                if (step === 2) {
                  await calculateResults();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={!canProceed()}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-lg transition-all',
                canProceed()
                  ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white'
                  : 'bg-[#2A303C] text-[#64748b] cursor-not-allowed'
              )}
            >
              {step === 2 ? '开始检测' : '下一步'}
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
