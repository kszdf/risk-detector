'use client';

import React, { useState, useMemo } from 'react';
import { ShieldIcon, AlertTriangleIcon, CheckCircleIcon, XCircleIcon, PhoneIcon, MailIcon, ChevronDownIcon } from '@/components/icons';

// 行业列表
const INDUSTRIES = [
  '商贸批发零售',
  '建筑工程',
  '制造业',
  '餐饮住宿',
  '服务业·咨询',
  '科技·软件',
  '房地产',
];

// 行业基准数据
const INDUSTRY_BENCHMARKS: Record<string, Record<string, { min: number; max: number; warning: number; label: string }>> = {
  '商贸批发零售': {
    vatRate: { min: 0.9, max: 1.5, warning: 0.63, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 5, max: 20, warning: 5, label: '毛利率' },
    netMargin: { min: 1, max: 4, warning: 0.5, label: '净利率' },
    debtRatio: { min: 40, max: 60, warning: 70, label: '资产负债率' },
  },
  '建筑工程': {
    vatRate: { min: 2.5, max: 3.5, warning: 1.75, label: '增值税税负率' },
    citRate: { min: 1.5, max: 3.0, warning: 1.0, label: '所得税贡献率' },
    grossMargin: { min: 8, max: 15, warning: 8, label: '毛利率' },
    netMargin: { min: 2, max: 6, warning: 1, label: '净利率' },
    debtRatio: { min: 60, max: 80, warning: 85, label: '资产负债率' },
  },
  '制造业': {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: '增值税税负率' },
    citRate: { min: 2.0, max: 4.0, warning: 1.2, label: '所得税贡献率' },
    grossMargin: { min: 15, max: 30, warning: 15, label: '毛利率' },
    netMargin: { min: 3, max: 8, warning: 2, label: '净利率' },
    debtRatio: { min: 40, max: 65, warning: 75, label: '资产负债率' },
  },
  '餐饮住宿': {
    vatRate: { min: 1.5, max: 2.5, warning: 1.05, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 50, max: 65, warning: 50, label: '毛利率' },
    netMargin: { min: 5, max: 15, warning: 3, label: '净利率' },
    debtRatio: { min: 40, max: 60, warning: 70, label: '资产负债率' },
  },
  '服务业·咨询': {
    vatRate: { min: 2.5, max: 4.0, warning: 1.75, label: '增值税税负率' },
    citRate: { min: 0.8, max: 2.0, warning: 0.5, label: '所得税贡献率' },
    grossMargin: { min: 40, max: 70, warning: 40, label: '毛利率' },
    netMargin: { min: 8, max: 20, warning: 5, label: '净利率' },
    debtRatio: { min: 30, max: 50, warning: 60, label: '资产负债率' },
  },
  '科技·软件': {
    vatRate: { min: 2.0, max: 3.5, warning: 1.4, label: '增值税税负率' },
    citRate: { min: 5.0, max: 12.0, warning: 3.0, label: '所得税贡献率' },
    grossMargin: { min: 40, max: 70, warning: 40, label: '毛利率' },
    netMargin: { min: 10, max: 25, warning: 8, label: '净利率' },
    debtRatio: { min: 30, max: 50, warning: 60, label: '资产负债率' },
  },
  '房地产': {
    vatRate: { min: 3.0, max: 5.0, warning: 2.1, label: '增值税税负率' },
    citRate: { min: 3.0, max: 6.0, warning: 2.0, label: '所得税贡献率' },
    grossMargin: { min: 25, max: 40, warning: 25, label: '毛利率' },
    netMargin: { min: 5, max: 15, warning: 3, label: '净利率' },
    debtRatio: { min: 70, max: 85, warning: 90, label: '资产负债率' },
  },
};

interface YearData {
  year: string;
  revenue: string;
  cost: string;
  profit: string;
  vat: string;
  incomeTax: string;
  totalAssets: string;
  totalLiabilities: string;
}

interface IndicatorResult {
  name: string;
  value: number;
  benchmarkMin: number;
  benchmarkMax: number;
  benchmarkWarning: number;
  riskLevel: 'green' | 'yellow' | 'red' | 'black';
  deviation: string;
  description: string;
}

interface RiskResult {
  overallLevel: 'low' | 'medium' | 'high' | 'extreme';
  indicators: IndicatorResult[];
  crossWarnings: string[];
  redCount: number;
  blackCount: number;
}

const RISK_COLORS = {
  green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: '低风险' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: '中风险' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '高风险' },
  black: { bg: 'bg-gray-800/50', text: 'text-gray-300', border: 'border-gray-600/30', label: '极高风险' },
};

const OVERALL_COLORS = {
  low: { bg: 'from-green-500/20 to-green-600/20', text: 'text-green-400', label: '低风险' },
  medium: { bg: 'from-yellow-500/20 to-yellow-600/20', text: 'text-yellow-400', label: '中风险' },
  high: { bg: 'from-red-500/20 to-red-600/20', text: 'text-red-400', label: '高风险' },
  extreme: { bg: 'from-gray-800/50 to-gray-900/50', text: 'text-gray-300', label: '极高风险' },
};

export default function RiskDetectionModule() {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [expanded, setExpanded] = useState(true);

  // 生成近三年数据
  const currentYear = new Date().getFullYear();
  const [yearData, setYearData] = useState<YearData[]>([
    { year: String(currentYear - 2), revenue: '', cost: '', profit: '', vat: '', incomeTax: '', totalAssets: '', totalLiabilities: '' },
    { year: String(currentYear - 1), revenue: '', cost: '', profit: '', vat: '', incomeTax: '', totalAssets: '', totalLiabilities: '' },
    { year: String(currentYear), revenue: '', cost: '', profit: '', vat: '', incomeTax: '', totalAssets: '', totalLiabilities: '' },
  ]);

  const [result, setResult] = useState<RiskResult | null>(null);

  const updateYearData = (index: number, field: keyof YearData, value: string) => {
    setYearData(prev => prev.map((y, i) => i === index ? { ...y, [field]: value } : y));
  };

  // 计算指标
  const calculateIndicator = (
    name: string,
    value: number,
    benchmark: { min: number; max: number; warning: number },
    higherIsRisky: boolean = false
  ): IndicatorResult => {
    let riskLevel: 'green' | 'yellow' | 'red' | 'black' = 'green';
    let deviation = '';
    let description = '';

    const { min, max, warning } = benchmark;

    if (higherIsRisky) {
      // 资产负债率：高于上限才危险
      if (value > max * 1.3) {
        riskLevel = 'black';
        deviation = `高于行业上限${((value - max) / max * 100).toFixed(0)}%`;
        description = '资产负债率严重超标，企业偿债风险极高';
      } else if (value > max) {
        riskLevel = 'red';
        deviation = `高于行业上限${((value - max) / max * 100).toFixed(0)}%`;
        description = '资产负债率超过行业上限，存在较大偿债风险';
      } else if (value > max * 0.9) {
        riskLevel = 'yellow';
        deviation = `接近行业上限`;
        description = '资产负债率偏高，需关注债务结构';
      } else {
        riskLevel = 'green';
        deviation = '在正常范围内';
        description = '资产负债率处于行业健康区间';
      }
    } else {
      // 正常指标：过低危险
      const mid = (min + max) / 2;
      const deviationPercent = mid > 0 ? ((value - mid) / mid * 100).toFixed(0) : 0;

      if (value < warning * 0.6) {
        riskLevel = 'black';
        deviation = `低于预警值${Math.abs(((value - warning * 0.6) / (warning * 0.6) * 100)).toFixed(0)}%`;
        description = `${name}极低，存在严重税务风险`;
      } else if (value < warning) {
        riskLevel = 'red';
        deviation = `低于预警值`;
        description = `${name}低于行业预警值，可能存在隐匿收入或虚增成本`;
      } else if (value < min || value > max * 1.3) {
        riskLevel = 'red';
        if (value < min) {
          deviation = `低于行业下限${Math.abs(Number(deviationPercent))}%`;
        } else {
          deviation = `高于行业上限${(Number(deviationPercent)).toFixed(0)}%`;
        }
        description = `${name}偏离正常区间`;
      } else if ((value < min * 1.1 && value >= min) || (value > max && value <= max * 1.15)) {
        riskLevel = 'yellow';
        if (value < min) {
          deviation = `略低于行业下限`;
        } else {
          deviation = `略高于行业上限`;
        }
        description = `${name}偏离正常区间，需关注`;
      } else {
        riskLevel = 'green';
        deviation = '在正常范围内';
        description = `${name}处于行业健康区间`;
      }
    }

    return { name, value, benchmarkMin: min, benchmarkMax: max, benchmarkWarning: warning, riskLevel, deviation, description };
  };

  // 检测结果
  const detectRisks = (): RiskResult | null => {
    if (!industry || !yearData.some(y => y.revenue && y.vat && y.cost)) {
      return null;
    }

    const benchmarks = INDUSTRY_BENCHMARKS[industry];
    if (!benchmarks) return null;

    const indicators: IndicatorResult[] = [];
    const crossWarnings: string[] = [];
    let redCount = 0;
    let blackCount = 0;

    // 使用最新有数据的年份计算主要指标
    const latestData = [...yearData].reverse().find(y => y.revenue && parseFloat(y.revenue) > 0);
    if (!latestData) return null;

    const revenue = parseFloat(latestData.revenue);
    const cost = parseFloat(latestData.cost);
    const profit = parseFloat(latestData.profit);
    const vat = parseFloat(latestData.vat);
    const incomeTax = parseFloat(latestData.incomeTax);
    const totalAssets = parseFloat(latestData.totalAssets);
    const totalLiabilities = parseFloat(latestData.totalLiabilities);

    // 计算指标
    const vatRate = revenue > 0 ? (vat / revenue) * 100 : 0;
    const citRate = revenue > 0 ? (incomeTax / revenue) * 100 : 0;
    const grossMargin = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

    // 增值税税负率
    indicators.push(calculateIndicator('增值税税负率', vatRate, benchmarks.vatRate));
    // 所得税贡献率
    indicators.push(calculateIndicator('所得税贡献率', citRate, benchmarks.citRate));
    // 毛利率
    indicators.push(calculateIndicator('毛利率', grossMargin, benchmarks.grossMargin));
    // 净利率
    indicators.push(calculateIndicator('净利率', netMargin, benchmarks.netMargin));
    // 资产负债率
    indicators.push(calculateIndicator('资产负债率', debtRatio, benchmarks.debtRatio, true));

    // 统计红灯黑灯
    indicators.forEach(ind => {
      if (ind.riskLevel === 'red') redCount++;
      if (ind.riskLevel === 'black') blackCount++;
    });

    // 交叉预警
    const vatIndicator = indicators.find(i => i.name === '增值税税负率');
    const grossIndicator = indicators.find(i => i.name === '毛利率');
    const citIndicator = indicators.find(i => i.name === '所得税贡献率');

    if (vatIndicator && grossIndicator) {
      if (vatIndicator.riskLevel === 'red' && grossIndicator.riskLevel === 'red') {
        crossWarnings.push('⚠️ 增值税税负率低 + 毛利率低：可能存在隐匿收入+虚增成本的复合风险');
        redCount++;
      }
      if (vatIndicator.riskLevel === 'yellow' && grossIndicator.riskLevel === 'red') {
        crossWarnings.push('⚡ 增值税税负率高 + 毛利率低：可能存在进项抵扣不足问题');
      }
    }

    if (grossIndicator && citIndicator) {
      if (grossIndicator.riskLevel === 'red' && citIndicator.riskLevel === 'red') {
        crossWarnings.push('⚠️ 毛利率高 + 所得税贡献率低：可能存在虚列费用的复合风险');
        redCount++;
      }
    }

    // 多年度趋势预警
    const validYears = yearData.filter(y => y.revenue && parseFloat(y.revenue) > 0);
    if (validYears.length >= 2) {
      // 检查毛利率趋势
      const margins = validYears.map(y => {
        const rev = parseFloat(y.revenue);
        const cst = parseFloat(y.cost);
        return rev > 0 ? ((rev - cst) / rev) * 100 : 0;
      });
      if (margins.every((m, i) => i === 0 || m <= margins[i - 1])) {
        crossWarnings.push('⚠️ 毛利率连续下降：需关注盈利能力变化趋势');
        redCount++;
      }
    }

    // 综合等级
    let overallLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (blackCount >= 2 || blackCount >= 1 && redCount >= 2) {
      overallLevel = 'extreme';
    } else if (redCount >= 3 || blackCount >= 1) {
      overallLevel = 'high';
    } else if (redCount >= 1 || blackCount >= 1) {
      overallLevel = 'medium';
    }

    return { overallLevel, indicators, crossWarnings, redCount, blackCount };
  };

  const handleDetect = () => {
    const riskResult = detectRisks();
    setResult(riskResult);
    if (riskResult) {
      setStep(3);
    }
  };

  const handleContact = () => {
    window.open('tel:138-1294-3969', '_self');
  };

  const handleEmail = () => {
    window.open('mailto:zhanglaoshi@hgttax.com', '_self');
  };

  const canProceedStep2 = yearData.some(y => y.revenue && y.cost && y.profit && y.vat && y.incomeTax);

  const getLightIcon = (level: string) => {
    switch (level) {
      case 'green': return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'yellow': return <AlertTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'red': return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'black': return <XCircleIcon className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 风险检测标题 */}
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4 mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <ShieldIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F1F5F9]">企业财税风险检测</h2>
              <p className="text-sm text-[#94A3B8]">基于金税四期公开预警参数分析</p>
            </div>
          </div>
          <span className={`text-[#94A3B8] transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <ChevronDownIcon className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="flex items-center gap-4 mb-6">
        {['基本信息', '财务数据', '检测结果'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step > i + 1 ? 'bg-green-500/20 text-green-400' :
              step === i + 1 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
              'bg-[#161A22] text-[#64748B]'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${step >= i + 1 ? 'text-[#F1F5F9]' : 'text-[#64748B]'}`}>{s}</span>
            {i < 2 && <div className={`w-12 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-[#2A303C]'}`} />}
          </div>
        ))}
      </div>

      {/* 步骤1：基本信息 */}
      {step === 1 && expanded && (
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6">
          <h3 className="text-base font-semibold text-[#F1F5F9] mb-4">第一步：填写企业信息</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1.5">企业名称 <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="请输入企业全称"
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#64748B] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1.5">所属行业 <span className="text-red-400">*</span></label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9]"
              >
                <option value="">请选择行业</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1.5">联系人 <span className="text-[#64748B]">(选填)</span></label>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="请输入联系人姓名"
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#64748B]"
              />
            </div>
            
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1.5">联系电话 <span className="text-[#64748B]">(选填)</span></label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="请输入联系电话"
                className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#64748B]"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!companyName || !industry}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
            >
              下一步：填写财务数据
            </button>
          </div>
        </div>
      )}

      {/* 步骤2：财务数据 */}
      {step === 2 && expanded && (
        <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6">
          <h3 className="text-base font-semibold text-[#F1F5F9] mb-4">第二步：填写近三年财务数据</h3>
          <p className="text-sm text-[#94A3B8] mb-6">至少填写1年的完整数据即可提交检测，数据越完整分析越准确</p>
          
          <div className="space-y-6">
            {yearData.map((year, index) => (
              <div key={year.year} className="bg-[#0D0F14] rounded-xl p-4 border border-[#2A303C]">
                <h4 className="text-sm font-medium text-[#3B82F6] mb-4">{year.year}年度</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">营业收入 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.revenue}
                        onChange={e => updateYearData(index, 'revenue', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">营业成本 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.cost}
                        onChange={e => updateYearData(index, 'cost', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">利润总额 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.profit}
                        onChange={e => updateYearData(index, 'profit', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">实缴增值税 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.vat}
                        onChange={e => updateYearData(index, 'vat', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">实缴企业所得税 <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.incomeTax}
                        onChange={e => updateYearData(index, 'incomeTax', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">总资产</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.totalAssets}
                        onChange={e => updateYearData(index, 'totalAssets', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-1">总负债</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={year.totalLiabilities}
                        onChange={e => updateYearData(index, 'totalLiabilities', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#161A22] border border-[#2A303C] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#64748B]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">万元</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 border border-[#2A303C] text-[#94A3B8] rounded-lg hover:bg-[#2A303C]/50 transition-colors text-sm"
            >
              上一步
            </button>
            <button
              onClick={handleDetect}
              disabled={!canProceedStep2}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm font-medium"
            >
              开始检测
            </button>
          </div>
        </div>
      )}

      {/* 步骤3：检测结果 */}
      {step === 3 && result && expanded && (
        <div className="space-y-6">
          {/* 综合风险等级 */}
          <div className={`bg-gradient-to-br ${OVERALL_COLORS[result.overallLevel].bg} border border-[#2A303C] rounded-xl p-6 text-center`}>
            <div className="inline-flex flex-col items-center">
              <div className={`w-24 h-24 rounded-full bg-[#161A22] border-4 ${result.overallLevel === 'low' ? 'border-green-500' : result.overallLevel === 'medium' ? 'border-yellow-500' : result.overallLevel === 'high' ? 'border-red-500' : 'border-gray-500'} flex items-center justify-center mb-4`}>
                <ShieldIcon className={`w-12 h-12 ${OVERALL_COLORS[result.overallLevel].text}`} />
              </div>
              <h2 className={`text-2xl font-bold ${OVERALL_COLORS[result.overallLevel].text} mb-2`}>
                {OVERALL_COLORS[result.overallLevel].label}
              </h2>
              <p className="text-sm text-[#94A3B8]">基于金税四期公开预警参数分析</p>
            </div>
          </div>

          {/* 指标卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.indicators.map((indicator, index) => (
              <div 
                key={index}
                className={`bg-[#161A22] border rounded-xl p-4 ${RISK_COLORS[indicator.riskLevel].border}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#94A3B8]">{indicator.name}</span>
                  {getLightIcon(indicator.riskLevel)}
                </div>
                
                <div className="text-2xl font-bold text-[#F1F5F9] mb-2">
                  {indicator.value.toFixed(2)}%
                </div>
                
                <div className="text-xs text-[#64748B] mb-2">
                  行业区间：{indicator.benchmarkMin}% - {indicator.benchmarkMax}%
                </div>
                
                <div className={`text-xs ${RISK_COLORS[indicator.riskLevel].text}`}>
                  {indicator.deviation}
                </div>
                
                <div className="mt-2 pt-2 border-t border-[#2A303C]">
                  <div className="flex gap-1">
                    {['green', 'yellow', 'red', 'black'].map(level => (
                      <div 
                        key={level}
                        className={`h-1.5 flex-1 rounded-full ${
                          indicator.riskLevel === 'green' && level === 'green' ? 'bg-green-500' :
                          indicator.riskLevel === 'yellow' && level === 'yellow' ? 'bg-yellow-500' :
                          indicator.riskLevel === 'red' && level === 'red' ? 'bg-red-500' :
                          indicator.riskLevel === 'black' && level === 'black' ? 'bg-gray-500' :
                          'bg-[#2A303C]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 交叉预警 */}
          {result.crossWarnings.length > 0 && (
            <div className="bg-[#161A22] border border-[#F59E0B]/30 rounded-xl p-4">
              <h4 className="text-sm font-medium text-yellow-400 mb-3">⚠️ 交叉预警分析</h4>
              <ul className="space-y-2">
                {result.crossWarnings.map((warning, index) => (
                  <li key={index} className="text-sm text-[#94A3B8]">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 风险项明细 */}
          {(result.redCount > 0 || result.blackCount > 0) && (
            <div className="bg-[#161A22] border border-red-500/30 rounded-xl p-4">
              <h4 className="text-sm font-medium text-red-400 mb-3">📋 风险项明细</h4>
              <ul className="space-y-2">
                {result.indicators.filter(i => i.riskLevel === 'red' || i.riskLevel === 'black').map((ind, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className={`${RISK_COLORS[ind.riskLevel].text} mt-0.5`}>
                      {ind.riskLevel === 'black' ? '🔴' : '🟠'}
                    </span>
                    <div>
                      <span className="text-[#F1F5F9]">{ind.name}：</span>
                      <span className="text-[#94A3B8]">{ind.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-[#F1F5F9] mb-2">获取完整风险检测报告</h4>
              <p className="text-sm text-[#94A3B8]">专业财税顾问一对一解读，提供整改建议</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleContact}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <PhoneIcon className="w-5 h-5" />
                <span>138-1294-3969</span>
              </button>
              
              <button
                onClick={handleEmail}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
              >
                <MailIcon className="w-5 h-5" />
                <span>zhanglaoshi@hgttax.com</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 border border-[#2A303C] text-[#94A3B8] rounded-lg hover:bg-[#2A303C]/50 transition-colors text-sm"
            >
              修改数据
            </button>
            <button
              onClick={() => setExpanded(false)}
              className="px-6 py-2.5 border border-[#2A303C] text-[#94A3B8] rounded-lg hover:bg-[#2A303C]/50 transition-colors text-sm"
            >
              收起结果
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
