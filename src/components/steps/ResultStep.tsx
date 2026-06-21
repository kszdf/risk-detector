'use client';

import React from 'react';

interface TrendWarning { type: string; label: string; score: number; detail: string; }
interface TrendData { period: string; revenue: number; grossMargin: number; netMargin: number; vatRate: number; citRate: number; debtRatio: number; trends: Record<string, string>; }
interface CrossValidation { rule: string; conflict: boolean; detail: string; }
interface RiskItem { name: string; taxMin: number; taxMax: number; penaltyMin: number; penaltyMax: number; }
interface EstimatedRiskAmount { items: RiskItem[]; totalTaxMin: number; totalTaxMax: number; totalPenaltyMin: number; totalPenaltyMax: number; totalMin: number; totalMax: number; }

interface ResultData {
  riskId: string;
  overallRiskLevel: string;
  riskScore: number;
  maxScore: number;
  riskDetails: string[];
  moduleScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  weightedScores: { invoice: number; revenueCost: number; publicPrivate: number; taxPolicy: number };
  trendWarnings: TrendWarning[];
  trendData: TrendData[];
  crossValidation: CrossValidation[];
  estimatedRiskAmount: EstimatedRiskAmount | null;
  dataCompletenessMsg: string;
}

interface ResultStepProps {
  result: ResultData;
  formData: { enterpriseName: string; industry: string; revenueScale: string };
  onReset: () => void;
}

export default function ResultStep({ result, formData, onReset }: ResultStepProps) {
  const percentScore = result.maxScore > 0 ? ((result.riskScore / result.maxScore) * 100).toFixed(1) : '0.0';

  const getRiskLevelStyle = (level: string) => {
    if (level === '高风险') return 'bg-red-500';
    if (level === '中风险') return 'bg-amber-500';
    if (level === '低风险') return 'bg-green-500';
    return 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* 结果头部 */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A2E] mb-2">检测报告</h3>
            <p className="text-sm text-[#666666]">企业：{formData.enterpriseName || '-'}</p>
            <p className="text-sm text-[#666666]">行业：{formData.industry} | 规模：{formData.revenueScale}</p>
          </div>
          <div className="text-right">
            <div className={`inline-block px-4 py-2 rounded-lg font-bold text-white ${getRiskLevelStyle(result.overallRiskLevel)}`}>
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
          {[
            { key: 'invoice', label: '发票与资金流', color: 'red' },
            { key: 'revenueCost', label: '收入与成本', color: 'blue' },
            { key: 'publicPrivate', label: '公私账户', color: 'purple' },
            { key: 'taxPolicy', label: '税务申报', color: 'green' }
          ].map(item => (
            <div key={item.key} className={`bg-${item.color}-50 rounded-lg p-4 text-center`}>
              <p className={`text-xs text-${item.color}-600 mb-1`}>{item.label}</p>
              <p className={`text-xl font-bold text-${item.color}-700`}>
                {result.moduleScores?.[item.key as keyof typeof result.moduleScores] ?? 0}
                <span className="text-sm font-normal"> / {item.key === 'invoice' ? '15' : item.key === 'revenueCost' || item.key === 'publicPrivate' ? '13' : '15'}</span>
              </p>
              <p className={`text-xs text-${item.color}-500 mt-1`}>
                加权 {result.weightedScores?.[item.key as keyof typeof result.weightedScores] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 趋势预警 */}
      {result.trendWarnings && result.trendWarnings.length > 0 && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h4 className="text-sm font-semibold text-[#1A1A2E] mb-4">
            趋势预警 (+{result.trendWarnings.length * 3}分)
          </h4>
          <div className="space-y-2">
            {result.trendWarnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm p-3 bg-amber-50 text-amber-800 rounded-lg">
                <span>⚠️</span>
                <span className="font-medium">{w.label}</span>
                <span className="text-amber-600">- {w.detail}</span>
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
                    {['期间', '毛利率', '净利率', '增值税率', '所得税率', '负债率'].map(h => (
                      <th key={h} className={`text-${h === '期间' ? 'left' : 'right'} py-2 text-[#666666] font-medium`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trendData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#F3F4F6]">
                      <td className="py-2 text-[#333333]">{row.period}</td>
                      {['grossMargin', 'netMargin', 'vatRate', 'citRate', 'debtRatio'].map(key => (
                        <td key={key} className="py-2 text-right">
                          {(row[key as keyof TrendData] as number ?? 0).toFixed(key.includes('Margin') || key === 'debtRatio' ? 1 : 2)}%
                          {row.trends?.[key] && (
                            <span className={`ml-1 ${row.trends[key] === '↓' || row.trends[key] === '↑' ? 'text-red-500' : 'text-green-500'}`}>
                              {row.trends[key]}
                            </span>
                          )}
                        </td>
                      ))}
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
              <div key={idx} className={`flex items-start gap-2 text-sm p-2 rounded ${cv.conflict ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
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
                  {['风险项', '补税区间', '罚款区间', '合计区间'].map(h => (
                    <th key={h} className={`text-${h === '风险项' ? 'left' : 'right'} py-2 text-[#666666]`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.estimatedRiskAmount.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[#F3F4F6]">
                    <td className="py-2 text-[#333333]">{item.name}</td>
                    <td className="py-2 text-right text-red-600">{item.taxMin} ~ {item.taxMax}</td>
                    <td className="py-2 text-right text-red-600">{item.penaltyMin} ~ {item.penaltyMax}</td>
                    <td className="py-2 text-right text-red-600 font-medium">{(item.taxMin + item.penaltyMin).toFixed(2)} ~ {(item.taxMax + item.penaltyMax).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-2 text-[#1A1A2E]">合计</td>
                  <td className="py-2 text-right text-red-600">{result.estimatedRiskAmount.totalTaxMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalTaxMax?.toFixed(2)}</td>
                  <td className="py-2 text-right text-red-600">{result.estimatedRiskAmount.totalPenaltyMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalPenaltyMax?.toFixed(2)}</td>
                  <td className="py-2 text-right text-red-600">{result.estimatedRiskAmount.totalMin?.toFixed(2)} ~ {result.estimatedRiskAmount.totalMax?.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button onClick={onReset} className="flex-1 px-6 py-3 text-sm font-medium text-[#333333] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors">
          重新检测
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); alert('报告已复制到剪贴板'); }}
          className="flex-1 px-6 py-3 text-sm font-medium text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors"
        >
          复制报告
        </button>
      </div>
    </div>
  );
}
