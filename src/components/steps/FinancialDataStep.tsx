'use client';

import React, { useMemo } from 'react';

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

interface FinancialDataStepProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
}

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

const PERIOD_COLORS = [
  { border: '#C2410C', label: '#C2410C' },
  { border: '#3B82F6', label: '#3B82F6' },
  { border: '#10B981', label: '#10B981' },
  { border: '#8B5CF6', label: '#8B5CF6' }
];

const FINANCIAL_FIELDS: Array<{ key: keyof FinancialPeriod; label: string }> = [
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

function safeGetMonthOptions() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const m1 = currentMonth - 2, m2 = currentMonth - 1;
    const y1 = m1 >= 1 ? currentYear : currentYear - 1;
    const y2 = m2 >= 1 ? currentYear : currentYear - 1;
    const adjustedM1 = m1 >= 1 ? m1 : m1 + 12;
    const adjustedM2 = m2 >= 1 ? m2 : m2 + 12;
    return [
      { value: `${y1}-${String(adjustedM1).padStart(2, '0')}`, label: `${y1}年${adjustedM1}月` },
      { value: `${y2}-${String(adjustedM2).padStart(2, '0')}`, label: `${y2}年${adjustedM2}月` }
    ];
  } catch {
    return [{ value: '2026-04', label: '2026年4月' }, { value: '2026-05', label: '2026年5月' }];
  }
}

export default function FinancialDataStep({ formData, setFormData, focusedField, setFocusedField }: FinancialDataStepProps) {
  const yearOptions = useMemo(() => safeGetYearOptions(), []);
  const monthOptions = useMemo(() => safeGetMonthOptions(), []);

  const periodLabels = [
    '最新一期月度数据',
    yearOptions[0]?.label || '2025年12月',
    yearOptions[1]?.label || '2024年12月',
    yearOptions[2]?.label || '2023年12月'
  ];

  const dataCompleteness = useMemo(() => {
    if (!formData.financialData) return { count: 0, msg: '请填写至少一期财务数据' };
    const filledCount = formData.financialData.filter(d => d.revenue > 0 || d.profit > 0).length;
    if (filledCount === 0) return { count: 0, msg: '请填写至少一期财务数据' };
    if (filledCount === 1) return { count: 1, msg: '本次检测仅基于单期数据，无法进行趋势分析。建议补充年度数据以获取更精准诊断。' };
    if (filledCount === 2) return { count: 2, msg: '基于2期数据对比，已识别同比变化趋势。补充更多年度数据可提升诊断精度。' };
    if (filledCount === 3) return { count: 3, msg: '基于3期数据对比，趋势分析可信度较高。' };
    return { count: Math.min(filledCount, 4), msg: '基于4期完整数据，趋势分析最为精准，诊断结果参考价值最高。' };
  }, [formData.financialData]);

  const checkPeriodStarted = (periodIndex: number): boolean => {
    if (periodIndex <= 0) return false;
    const period = formData.financialData?.[periodIndex];
    return !!(period && (period.revenue > 0 || period.profit > 0 || period.totalAssets > 0));
  };

  const handleMonthChange = (newMonth: string) => {
    setFormData(prev => ({
      ...prev,
      latestMonth: newMonth,
      financialData: prev.financialData.map((item, idx) => idx === 0 ? { ...item, period: newMonth } : item)
    }));
  };

  const updateField = (periodIndex: number, field: keyof FinancialPeriod, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => {
      const newData = [...prev.financialData];
      newData[periodIndex] = { ...newData[periodIndex], [field]: numValue };
      return { ...prev, financialData: newData };
    });
  };

  const FieldInput: React.FC<{
    label: string; value: number; onChange: (v: string) => void;
    fieldKey: string; required?: boolean; optional?: boolean;
    periodStarted?: boolean; periodIndex: number;
  }> = ({ label, value, onChange, fieldKey, required, optional, periodStarted, periodIndex }) => {
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
            type="number" step="0.01" min="0"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocusedField(`${periodIndex}-${fieldKey}`)}
            onBlur={() => setFocusedField(null)}
            placeholder="0.00"
            className={`w-full px-3 py-2 text-sm border rounded-lg transition-all text-[#333333] placeholder-[#999999] ${
              isRequired && value === 0 ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border bg-white'
            }`}
            style={{ borderColor: isRequired && value === 0 ? undefined : periodColor.border }}
          />
          {focusedField === `${periodIndex}-${fieldKey}` && FIELD_HINTS[fieldKey] && (
            <div className="absolute z-50 left-0 top-full mt-1 px-3 py-2 text-white text-xs rounded-lg shadow-lg whitespace-nowrap" style={{ backgroundColor: periodColor.label }}>
              {FIELD_HINTS[fieldKey]}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl">💡</span>
        <p className="text-sm text-[#2563EB] leading-relaxed font-medium">
          经营年度数据越完整，对比度越高，风险诊断越精准。建议至少填报2期数据。
        </p>
      </div>

      {dataCompleteness.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">📊</span>
          <div>
            <p className="text-sm text-amber-800 font-medium mb-1">当前数据完整度：{dataCompleteness.count}/4期</p>
            <p className="text-sm text-amber-700">{dataCompleteness.msg}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-[#C2410C] rounded-xl p-5">
        <label className="block text-sm font-medium text-[#333333] mb-3">
          数据所属月份 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.latestMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#C2410C] rounded-lg bg-white focus:border-[#C2410C] focus:ring-2 focus:ring-[#C2410C]/20 text-[#333333]"
        >
          {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      {formData.financialData.map((period, periodIndex) => {
        const isLatest = periodIndex === 0;
        const periodStarted = checkPeriodStarted(periodIndex);
        const periodColor = PERIOD_COLORS[periodIndex];

        return (
          <div key={periodIndex} className="bg-white border-2 rounded-xl p-5" style={{ borderColor: periodColor.border }}>
            <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: periodColor.label }}>
                {periodIndex + 1}
              </span>
              <span style={{ color: periodColor.label }}>{periodLabels[periodIndex]}</span>
              {isLatest && <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: periodColor.label }}>必填</span>}
            </h4>
            <div className="grid grid-cols-2 gap-x-4">
              {FINANCIAL_FIELDS.map(field => (
                <FieldInput
                  key={field.key}
                  label={field.label}
                  value={period[field.key] as number}
                  onChange={(v) => updateField(periodIndex, field.key, v)}
                  fieldKey={field.key}
                  required={isLatest}
                  optional={!isLatest}
                  periodStarted={periodStarted}
                  periodIndex={periodIndex}
                />
              ))}
            </div>
            <p className="text-xs text-[#666666] mt-3">单位：万元</p>
          </div>
        );
      })}
    </div>
  );
}
