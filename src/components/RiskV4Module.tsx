'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, ArrowRight, ArrowDown, TrendingUp, TrendingDown, Info } from 'lucide-react'

// ============ 类型定义 ============
interface FinancialPeriod {
  period: string
  type: 'latest' | 'annual'
  revenue: string
  cost: string
  profit: string
  vatPaid: string
  incomeTaxPaid: string
  totalAssets: string
  totalLiabilities: string
  receivables: string
  inventory: string
  advanceReceipts: string
}

interface FormData {
  enterpriseName: string
  contactPerson: string
  contactPhone: string
  customerEmail: string
  industry: string
  revenueScale: string
  invoiceAnswers: Record<string, number>
  revenueAnswers: Record<string, number>
  publicPrivateAnswers: Record<string, number>
  taxAnswers: Record<string, number>
  financialData: FinancialPeriod[]
  latestMonth: string
}

interface RiskItem {
  module: string
  category: string
  item: string
  score: number
  weight: number
  maxScore: number
  actualValue: string
  threshold: string
  description: string
}

interface CrossValidation {
  type: string
  ratio: string
  benchmark: string
  status: '正常' | '异常'
  score: number
}

interface TrendWarning {
  type: string
  current: string
  previous: string
  change: string
  score: number
}

interface ResultData {
  enterpriseName: string
  detectionTime: string
  period: string
  riskScore: number
  maxScore: number
  riskLevel: '低风险' | '中风险' | '高风险' | '极高风险'
  weightedScores: Record<string, number>
  riskItems: RiskItem[]
  crossValidations: CrossValidation[]
  trendWarnings: TrendWarning[]
  estimatedRiskAmount: number
  riskLevelDescription: string
  improvementSuggestions: string[]
  dataCompleteness: string
  reportContent: string
}

// ============ 安全工具函数 ============
const safeGetYearOptions = (): number[] => {
  try {
    const now = new Date()
    return [now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3]
  } catch { return [2025, 2024, 2023] }
}

const safeGetDefaultLatestMonth = (): string => {
  try {
    const now = new Date()
    const month = now.getMonth() + 1
    const defaultMonth = month >= 3 ? month - 2 : 12 + month - 2
    return `${now.getFullYear()}-${String(defaultMonth).padStart(2, '0')}`
  } catch { return '2026-04' }
}

const safeCreateEmptyPeriod = (period: string, type: 'latest' | 'annual'): FinancialPeriod => ({
  period, type, revenue: '', cost: '', profit: '', vatPaid: '', incomeTaxPaid: '',
  totalAssets: '', totalLiabilities: '', receivables: '', inventory: '', advanceReceipts: ''
})

// ============ 步骤定义（6步） ============
const STEPS = [
  { id: 'basic', label: '基本信息', module: 'basic' },
  { id: 'invoice', label: '发票与资金流', module: 'invoice' },
  { id: 'revenue', label: '收入与成本', module: 'revenue' },
  { id: 'publicPrivate', label: '公私账户', module: 'publicPrivate' },
  { id: 'tax', label: '税务申报', module: 'tax' },
  { id: 'financial', label: '财务数据', module: 'financial' },
]

// ============ 问卷题目 ============
const INVOICE_QUESTIONS = [
  { id: 'inv1', question: '1. 进货发票的索取情况', options: [{ text: '全部依法开具', score: 10 }, { text: '大部分有发票', score: 7 }, { text: '只有进项发票', score: 4 }, { text: '无正规发票', score: 0 }] },
  { text: '2. 进货渠道的发票合规性', options: [{ text: '从一般纳税人采购', score: 10 }, { text: '从有资质供应商采购', score: 7 }, { text: '有部分无票渠道', score: 4 }, { text: '大量无票采购', score: 0 }] },
  { id: 'inv3', question: '3. 发票入账的及时性', options: [{ text: '当月发票当月入账', score: 10 }, { text: '偶尔跨期', score: 7 }, { text: '经常跨期', score: 4 }, { text: '长期滞留未入账', score: 0 }] },
  { id: 'inv4', question: '4. 销项发票的开具情况', options: [{ text: '全部依法开具', score: 10 }, { text: '大部分依法开具', score: 7 }, { text: '存在滞后开具', score: 4 }, { text: '账外经营', score: 0 }] },
  { id: 'inv5', question: '5. 资金回流的异常情况', options: [{ text: '无资金回流', score: 10 }, { text: '有少量往来款', score: 7 }, { text: '有资金回流但可解释', score: 4 }, { text: '存在明显资金回流', score: 0 }] },
]

const REVENUE_QUESTIONS = [
  { id: 'rev1', question: '1. 收入的完整性', options: [{ text: '全部确认收入', score: 10 }, { text: '基本完整', score: 7 }, { text: '存在截留', score: 4 }, { text: '大量隐匿', score: 0 }] },
  { id: 'rev2', question: '2. 成本的匹配性', options: [{ text: '成本与收入完全匹配', score: 10 }, { text: '基本匹配', score: 7 }, { text: '成本配比异常', score: 4 }, { text: '严重失配', score: 0 }] },
  { id: 'rev3', question: '3. 往来款的真实性', options: [{ text: '均为真实业务往来', score: 10 }, { text: '大部分真实', score: 7 }, { text: '存在异常挂账', score: 4 }, { text: '虚构往来', score: 0 }] },
  { id: 'rev4', question: '4. 成本发票的合法性', options: [{ text: '全部为合规发票', score: 10 }, { text: '大部分合规', score: 7 }, { text: '存在虚开发票', score: 4 }, { text: '大量虚增进项', score: 0 }] },
]

const PUBLIC_PRIVATE_QUESTIONS = [
  { id: 'pp1', question: '1. 股东借款的合规性', options: [{ text: '无借款或已归还', score: 10 }, { text: '有借款但有协议', score: 7 }, { text: '长期挂账未还', score: 4 }, { text: '存在抽逃资金嫌疑', score: 0 }] },
  { id: 'pp2', question: '2. 公私账户的使用', options: [{ text: '严格分开', score: 10 }, { text: '基本分开', score: 7 }, { text: '有小额混用', score: 4 }, { text: '严重混用', score: 0 }] },
  { id: 'pp3', question: '3. 利润分配的合规性', options: [{ text: '依法分配', score: 10 }, { text: '有部分未分配', score: 7 }, { text: '存在隐匿利润', score: 4 }, { text: '严重违规分配', score: 0 }] },
  { id: 'pp4', question: '4. 股权变更的合规性', options: [{ text: '依法办理', score: 10 }, { text: '基本合规', score: 7 }, { text: '有瑕疵', score: 4 }, { text: '严重违规', score: 0 }] },
  { id: 'pp5', question: '5. 关联交易的公允性', options: [{ text: '定价公允', score: 10 }, { text: '基本合理', score: 7 }, { text: '存在利益输送嫌疑', score: 4 }, { text: '严重损害公司利益', score: 0 }] },
]

const TAX_QUESTIONS = [
  { id: 'tax1', question: '1. 纳税申报的及时性', options: [{ text: '均按时申报', score: 10 }, { text: '偶尔逾期', score: 7 }, { text: '经常逾期', score: 4 }, { text: '长期不报', score: 0 }] },
  { id: 'tax2', question: '2. 税种缴纳的完整性', options: [{ text: '所有税种均缴纳', score: 10 }, { text: '主要税种缴纳', score: 7 }, { text: '存在少缴', score: 4 }, { text: '严重偷逃', score: 0 }] },
  { id: 'tax3', question: '3. 税收优惠的合规性', options: [{ text: '完全合规', score: 10 }, { text: '基本合规', score: 7 }, { text: '存在滥用优惠', score: 4 }, { text: '骗取优惠资格', score: 0 }] },
  { id: 'tax4', question: '4. 报表报送的合规性', options: [{ text: '均按时报送', score: 10 }, { text: '偶尔延误', score: 7 }, { text: '经常延误', score: 4 }, { text: '长期不报', score: 0 }] },
  { id: 'tax5', question: '5. 风险排查的配合度', options: [{ text: '积极主动配合', score: 10 }, { text: '配合', score: 7 }, { text: '被动配合', score: 4 }, { text: '不配合', score: 0 }] },
]

// ============ 子组件 ============
const QuestionnaireSection = ({ questions, answers, onChange, color }: {
  questions: typeof INVOICE_QUESTIONS
  answers: Record<string, number>
  onChange: (id: string, score: number) => void
  color: string
}) => (
  <div className="space-y-4">
    {questions.map((q, qi) => (
      <div key={q.id || qi} className="bg-white rounded-lg p-4 border border-gray-200">
        <p className="font-medium text-gray-800 mb-3">{q.question}</p>
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt, oi) => {
            const isSelected = answers[q.id || String(qi)] === opt.score
            return (
              <button
                key={oi}
                onClick={() => onChange(q.id || String(qi), opt.score)}
                className={`px-4 py-2 rounded-lg border-2 text-left text-sm transition-all ${
                  isSelected
                    ? 'border-current text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                }`}
                style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
              >
                {opt.text}
              </button>
            )
          })}
        </div>
      </div>
    ))}
  </div>
)

const FinancialPeriodInput = ({ period, data, onChange, color, isRequired, label }: {
  period: string
  data: FinancialPeriod
  onChange: (field: string, value: string) => void
  color: string
  isRequired: boolean
  label: string
}) => {
  const fields = [
    { key: 'revenue', label: '营业收入', tip: '资产负债表附注或利润表第一行「营业收入」' },
    { key: 'cost', label: '营业成本', tip: '利润表「营业成本」' },
    { key: 'profit', label: '利润总额', tip: '利润表「利润总额」（税前利润）' },
    { key: 'vatPaid', label: '实缴增值税', tip: '增值税申报表主表「应纳税额」或「已缴税额」' },
    { key: 'incomeTaxPaid', label: '实缴所得税', tip: '企业所得税年度申报表「实际应纳所得税额」' },
    { key: 'totalAssets', label: '总资产', tip: '资产负债表「资产总计」' },
    { key: 'totalLiabilities', label: '总负债', tip: '资产负债表「负债合计」' },
    { key: 'receivables', label: '应收账款', tip: '资产负债表「应收账款」' },
    { key: 'inventory', label: '期末存货', tip: '资产负债表「存货」' },
    { key: 'advanceReceipts', label: '预收账款', tip: '资产负债表「预收款项」或「合同负债」' },
  ]
  return (
    <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: color }}>
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold" style={{ color }}>{label}</span>
        {!isRequired && <span className="text-xs text-gray-500">可选</span>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className="relative">
            <label className="text-xs text-gray-600 mb-1 block">
              {f.label}{isRequired && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                value={data[f.key as keyof FinancialPeriod] as string}
                onChange={e => onChange(f.key, e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                <Info className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="hidden group-hover:block absolute right-0 bottom-full mb-1 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10">
                  {f.tip}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ResultReport = ({ result }: { result: ResultData }) => {
  const getPercentScore = () => {
    if (!result.maxScore) return 0
    return Math.round((result.riskScore / result.maxScore) * 1000) / 10
  }
  const getRiskColor = () => {
    switch (result.riskLevel) {
      case '低风险': return 'text-green-600 bg-green-50'
      case '中风险': return 'text-amber-600 bg-amber-50'
      case '高风险': return 'text-orange-600 bg-orange-50'
      default: return 'text-red-600 bg-red-50'
    }
  }
  const moduleScores = Object.entries(result.weightedScores || {}).map(([k, v]) => ({ name: k, score: v }))

  return (
    <div className="space-y-6">
      {/* 报告头部 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{result.enterpriseName}</h2>
            <p className="text-gray-500 text-sm mt-1">检测时间: {result.detectionTime}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-bold ${getRiskColor()}`}>
            {result.riskLevel}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{result.riskScore}</div>
            <div className="text-sm text-gray-600">风险得分</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{result.maxScore}</div>
            <div className="text-sm text-gray-600">满分</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{getPercentScore()}分</div>
            <div className="text-sm text-gray-600">百分制</div>
          </div>
        </div>
      </div>

      {/* 数据完整度提示 */}
      {result.dataCompleteness && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          {result.dataCompleteness}
        </div>
      )}

      {/* 预估风险金额 */}
      {result.estimatedRiskAmount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-600 font-bold">预估风险金额</div>
          <div className="text-2xl font-bold text-red-700 mt-1">
            ¥{result.estimatedRiskAmount.toLocaleString()}万元
          </div>
        </div>
      )}

      {/* 模块得分 */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">风险分布</h3>
        <div className="space-y-3">
          {moduleScores.map(m => {
            const percent = result.maxScore ? (m.score / result.maxScore) * 100 : 0
            return (
              <div key={m.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{m.name}</span>
                  <span className="text-gray-500">{m.score}分</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${percent}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 风险项明细 */}
      {result.riskItems && result.riskItems.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">风险项明细</h3>
          <div className="space-y-3">
            {result.riskItems.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{item.item}</div>
                  <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 趋势分析 */}
      {result.trendWarnings && result.trendWarnings.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">趋势预警</h3>
          <div className="space-y-3">
            {result.trendWarnings.map((tw, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{tw.type}</div>
                  <div className="text-sm text-gray-600">
                    当前: {tw.current} | 上期: {tw.previous}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 改进建议 */}
      {result.improvementSuggestions && result.improvementSuggestions.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">改进建议</h3>
          <ul className="space-y-2">
            {result.improvementSuggestions.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============ 主组件 ============
export default function RiskV4Module() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  const yearOptions = useMemo(() => safeGetYearOptions(), [])
  const defaultLatestMonth = useMemo(() => safeGetDefaultLatestMonth(), [])

  const [formData, setFormData] = useState<FormData>(() => {
    const latest = safeCreateEmptyPeriod(defaultLatestMonth, 'latest')
    return {
      enterpriseName: '', contactPerson: '', contactPhone: '', customerEmail: '',
      industry: '', revenueScale: '',
      invoiceAnswers: {}, revenueAnswers: {}, publicPrivateAnswers: {}, taxAnswers: {},
      financialData: [
        latest,
        safeCreateEmptyPeriod(`${yearOptions[0]}-12`, 'annual'),
        safeCreateEmptyPeriod(`${yearOptions[1]}-12`, 'annual'),
        safeCreateEmptyPeriod(`${yearOptions[2]}-12`, 'annual'),
      ],
      latestMonth: defaultLatestMonth,
    }
  })

  useEffect(() => { setIsHydrated(true) }, [])

  const handleFinancialChange = useCallback((periodIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const newData = [...prev.financialData]
      newData[periodIndex] = { ...newData[periodIndex], [field]: value }
      return { ...prev, financialData: newData }
    })
  }, [])

  const handleFinancialPeriodChange = useCallback((periodIndex: number, field: keyof FinancialPeriod, value: string) => {
    setFormData(prev => {
      const newData = [...prev.financialData]
      newData[periodIndex] = { ...newData[periodIndex], [field]: value }
      return { ...prev, financialData: newData }
    })
  }, [])

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!formData.enterpriseName.trim()) return '请输入企业名称'
      if (!formData.contactPerson.trim()) return '请输入联系人'
      const phone = formData.contactPhone.replace(/\D/g, '')
      if (phone.length > 0 && phone.length !== 11) return '请输入11位手机号码'
      if (!formData.industry) return '请选择所属行业'
      if (!formData.revenueScale) return '请选择营收规模'
    }
    if (step === 1) {
      const answered = Object.keys(formData.invoiceAnswers).length
      if (answered < 5) return '请完成所有发票与资金流问题'
    }
    if (step === 2) {
      const answered = Object.keys(formData.revenueAnswers).length
      if (answered < 4) return '请完成所有收入与成本问题'
    }
    if (step === 3) {
      const answered = Object.keys(formData.publicPrivateAnswers).length
      if (answered < 5) return '请完成所有公私账户问题'
    }
    if (step === 4) {
      const answered = Object.keys(formData.taxAnswers).length
      if (answered < 5) return '请完成所有税务申报问题'
    }
    if (step === 5) {
      const latest = formData.financialData[0]
      const required = ['revenue', 'cost', 'profit', 'vatPaid', 'incomeTaxPaid', 'totalAssets', 'totalLiabilities', 'receivables', 'inventory', 'advanceReceipts']
      for (const r of required) {
        if (!latest[r as keyof FinancialPeriod]) return '请填写最新一期全部必填字段'
      }
    }
    return null
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        enterpriseName: formData.enterpriseName,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        customerEmail: formData.customerEmail,
        industry: formData.industry,
        revenueScale: formData.revenueScale,
        invoiceAnswers: formData.invoiceAnswers,
        revenueAnswers: formData.revenueAnswers,
        publicPrivateAnswers: formData.publicPrivateAnswers,
        taxAnswers: formData.taxAnswers,
        financialData: formData.financialData,
        latestMonth: formData.latestMonth,
      }
      const res = await fetch('/api/risk-v4-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '提交失败')
      setResult(data.result)
    } catch (err: any) {
      setError(err.message || '检测失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getProgressGradient = () => {
    const colors = ['#B91C1C', '#1E40AF', '#6D28D9', '#047857', '#C2410C']
    return `linear-gradient(to right, ${colors.slice(0, currentStep + 1).join(', ')})`
  }

  if (!isHydrated) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-500">加载中...</div>
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">风险检测报告</h1>
          </div>
          <ResultReport result={result} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部进度条 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">企业风险检测 V4</h1>
            <span className="text-sm text-gray-500">第 {currentStep + 1} / {STEPS.length} 步</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, background: getProgressGradient() }} />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            {STEPS.map((s, i) => (
              <span key={s.id} className={i <= currentStep ? 'text-blue-600 font-medium' : ''}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="max-w-4xl mx-auto p-6">
        {/* 步骤0: 基本信息 */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#1E3A5F' }}>
              <h2 className="text-xl font-bold" style={{ color: '#1E3A5F' }}>基本信息</h2>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企业名称 <span className="text-red-500">*</span></label>
                <input type="text" value={formData.enterpriseName} onChange={e => setFormData(p => ({ ...p, enterpriseName: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请输入企业全称" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人 <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.contactPerson} onChange={e => setFormData(p => ({ ...p, contactPerson: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="请输入联系人姓名" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 <span className="text-red-500">*</span></label>
                  <input type="tel" value={formData.contactPhone} onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                    setFormData(p => ({ ...p, contactPhone: v }))
                    if (v.length > 0 && v.length < 11) setPhoneError('请输入11位手机号码')
                    else setPhoneError('')
                  }} className={`w-full px-4 py-2 border rounded-lg focus:ring-2 ${phoneError ? 'border-red-500 ring-red-200' : 'border-gray-300 focus:ring-blue-500'}`} placeholder="用于接收检测报告" />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱（选填）</label>
                <input type="email" value={formData.customerEmail} onChange={e => setFormData(p => ({ ...p, customerEmail: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="用于接收电子报告" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属行业 <span className="text-red-500">*</span></label>
                  <select value={formData.industry} onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择行业</option>
                    <option value="制造业">制造业</option>
                    <option value="批发零售">批发零售</option>
                    <option value="建筑房地产">建筑房地产</option>
                    <option value="交通运输">交通运输</option>
                    <option value="餐饮住宿">餐饮住宿</option>
                    <option value="信息技术">信息技术</option>
                    <option value="其他服务业">其他服务业</option>
                    <option value="农林牧渔">农林牧渔</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">营收规模 <span className="text-red-500">*</span></label>
                  <select value={formData.revenueScale} onChange={e => setFormData(p => ({ ...p, revenueScale: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">请选择规模</option>
                    <option value="小规模（500万以下）">小规模（500万以下）</option>
                    <option value="中小（500万-2000万）">中小（500万-2000万）</option>
                    <option value="中型（2000万-1亿）">中型（2000万-1亿）</option>
                    <option value="大型（1亿以上）">大型（1亿以上）</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 步骤1: 发票与资金流 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#B91C1C' }}>
              <h2 className="text-xl font-bold" style={{ color: '#B91C1C' }}>发票与资金流</h2>
            </div>
            <QuestionnaireSection questions={INVOICE_QUESTIONS} answers={formData.invoiceAnswers} onChange={(id, score) => setFormData(p => ({ ...p, invoiceAnswers: { ...p.invoiceAnswers, [id]: score } }))} color="#B91C1C" />
          </div>
        )}

        {/* 步骤2: 收入与成本 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#1E40AF' }}>
              <h2 className="text-xl font-bold" style={{ color: '#1E40AF' }}>收入与成本</h2>
            </div>
            <QuestionnaireSection questions={REVENUE_QUESTIONS} answers={formData.revenueAnswers} onChange={(id, score) => setFormData(p => ({ ...p, revenueAnswers: { ...p.revenueAnswers, [id]: score } }))} color="#1E40AF" />
          </div>
        )}

        {/* 步骤3: 公私账户与股东 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#6D28D9' }}>
              <h2 className="text-xl font-bold" style={{ color: '#6D28D9' }}>公私账户与股东</h2>
            </div>
            <QuestionnaireSection questions={PUBLIC_PRIVATE_QUESTIONS} answers={formData.publicPrivateAnswers} onChange={(id, score) => setFormData(p => ({ ...p, publicPrivateAnswers: { ...p.publicPrivateAnswers, [id]: score } }))} color="#6D28D9" />
          </div>
        )}

        {/* 步骤4: 税务申报 */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#047857' }}>
              <h2 className="text-xl font-bold" style={{ color: '#047857' }}>税务申报</h2>
            </div>
            <QuestionnaireSection questions={TAX_QUESTIONS} answers={formData.taxAnswers} onChange={(id, score) => setFormData(p => ({ ...p, taxAnswers: { ...p.taxAnswers, [id]: score } }))} color="#047857" />
          </div>
        )}

        {/* 步骤5: 财务数据 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b-2 pb-2" style={{ borderColor: '#C2410C' }}>
              <h2 className="text-xl font-bold" style={{ color: '#C2410C' }}>财务数据</h2>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
              💡 经营年度数据越完整，对比度越高，风险诊断越精准。建议至少填报2期数据。
            </div>
            {/* 最新一期月份选择 */}
            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#C2410C' }}>
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700">数据所属月份</label>
                <select value={formData.latestMonth} onChange={e => {
                  const newMonth = e.target.value
                  setFormData(p => {
                    const newData = [...p.financialData]
                    newData[0] = { ...newData[0], period: newMonth }
                    return { ...p, latestMonth: newMonth, financialData: newData }
                  })
                }} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                  <option value="2026-04">2026-04</option>
                  <option value="2026-05">2026-05</option>
                </select>
              </div>
            </div>
            {/* 4期财务数据 */}
            <FinancialPeriodInput period={formData.financialData[0].period} data={formData.financialData[0]} onChange={(f, v) => handleFinancialPeriodChange(0, f as keyof FinancialPeriod, v)} color="#C2410C" isRequired={true} label={`最新一期 ${formData.financialData[0].period}`} />
            {yearOptions.map((y, i) => (
              <FinancialPeriodInput key={y} period={`${y}-12`} data={formData.financialData[i + 1]} onChange={(f, v) => handleFinancialPeriodChange(i + 1, f as keyof FinancialPeriod, v)} color={['#3B82F6', '#10B981', '#8B5CF6'][i]} isRequired={false} label={`${y}年12月`} />
            ))}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {/* 导航按钮 */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 ? (
            <button onClick={() => setCurrentStep(s => s - 1)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">上一步</button>
          ) : <div />}
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => { const e = validateStep(currentStep); if (e) { setError(e); return }; setError(null); setCurrentStep(s => s + 1) }}
              className="px-6 py-3 rounded-lg text-white font-medium flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              下一步 <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 rounded-lg text-white font-medium flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 检测中...</> : '提交检测'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
