'use client'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react'

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
  creditCode: string
  contactPerson: string
  contactPhone: string
  industry: string
  revenueScale: string
  invoiceAnswers: Record<string, number>
  revenueAnswers: Record<string, number>
  publicPrivateAnswers: Record<string, number>
  taxAnswers: Record<string, number>
  financialData: FinancialPeriod[]
  latestMonth: string
}

// ============ 安全工具函数 ============
// 获取最近2个月份选项（如当前6月，返回5月和4月）
const safeGetLatestMonthOptions = (): { value: string; label: string }[] => {
  try {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1 // 1-12
    const options: { value: string; label: string }[] = []
    
    // 最近2个月
    for (let i = 1; i <= 2; i++) {
      let month = m - i
      let year = y
      if (month <= 0) {
        month = 12 + month
        year = y - 1
      }
      options.push({
        value: `${year}-${String(month).padStart(2, '0')}`,
        label: `${year}年${month}月`
      })
    }
    return options
  } catch { return [{ value: '2026-05', label: '2026年5月' }, { value: '2026-04', label: '2026年4月' }] }
}

// 根据最新月份计算前3个年度选项
const safeGetYearOptions = (latestMonth: string): number[] => {
  try {
    if (!latestMonth) return [2025, 2024, 2023]
    const year = parseInt(latestMonth.split('-')[0])
    if (isNaN(year)) return [2025, 2024, 2023]
    return [year - 1, year - 2, year - 3]
  } catch { return [2025, 2024, 2023] }
}

const safeCreateEmptyPeriod = (period: string, type: 'latest' | 'annual'): FinancialPeriod => ({
  period, type, revenue: '', cost: '', profit: '', vatPaid: '', incomeTaxPaid: '',
  totalAssets: '', totalLiabilities: '', receivables: '', inventory: '', advanceReceipts: ''
})

const safeCreateInitialFormData = (): FormData => {
  try {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const defaultMonth = m >= 3 ? m - 2 : 12 + m - 2
    const latestPeriod = `${y}-${String(defaultMonth).padStart(2, '0')}`
    const years = [y - 1, y - 2, y - 3]
    return {
      enterpriseName: '',
      creditCode: '',
      contactPerson: '',
      contactPhone: '',
      industry: '',
      revenueScale: '',
      invoiceAnswers: {},
      revenueAnswers: {},
      publicPrivateAnswers: {},
      taxAnswers: {},
      financialData: [
        { ...safeCreateEmptyPeriod(latestPeriod, 'latest') },
        { ...safeCreateEmptyPeriod(`${years[0]}-12`, 'annual') },
        { ...safeCreateEmptyPeriod(`${years[1]}-12`, 'annual') },
        { ...safeCreateEmptyPeriod(`${years[2]}-12`, 'annual') },
      ],
      latestMonth: latestPeriod,
    }
  } catch {
    return {
      enterpriseName: '', creditCode: '', contactPerson: '', contactPhone: '',
      industry: '', revenueScale: '',
      invoiceAnswers: {}, revenueAnswers: {}, publicPrivateAnswers: {}, taxAnswers: {},
      financialData: [
        { ...safeCreateEmptyPeriod('2026-04', 'latest') },
        { ...safeCreateEmptyPeriod('2025-12', 'annual') },
        { ...safeCreateEmptyPeriod('2024-12', 'annual') },
        { ...safeCreateEmptyPeriod('2023-12', 'annual') },
      ],
      latestMonth: '2026-04',
    }
  }
}

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
  { id: 'inv2', question: '2. 进货渠道的发票合规性', options: [{ text: '从一般纳税人采购', score: 10 }, { text: '从有资质供应商采购', score: 7 }, { text: '有部分无票渠道', score: 4 }, { text: '大量无票采购', score: 0 }] },
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
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
                style={isSelected ? { backgroundColor: color, borderColor: color } : { backgroundColor: '#ffffff' }}
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
                style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="group absolute right-2 top-1/2 -translate-y-1/2">
                <span className="text-gray-400 cursor-help text-xs">?</span>
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

// ============ 主组件 ============
export default function RiskV4Module() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(safeCreateInitialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [creditCodeError, setCreditCodeError] = useState('')
  
  // 根据最新月份动态计算年度选项
  const yearOptions = useMemo(() => safeGetYearOptions(formData.latestMonth), [formData.latestMonth])
  // 月份选项
  const monthOptions = useMemo(() => safeGetLatestMonthOptions(), [])

  useEffect(() => { setIsHydrated(true) }, [])

  const handleFinancialPeriodChange = useCallback((index: number, field: keyof FinancialPeriod, value: string) => {
    setFormData(prev => {
      const newData = [...prev.financialData]
      newData[index] = { ...newData[index], [field]: value }
      return { ...prev, financialData: newData }
    })
  }, [])

  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!formData.contactPerson.trim()) return '请填写联系人'
      if (!formData.contactPhone.trim()) return '请填写联系电话'
      if (formData.contactPhone.length !== 11) return '联系电话必须是11位手机号码'
      if (!formData.industry) return '请选择所属行业'
      if (!formData.revenueScale) return '请选择营收规模'
    }
    if (step === 1) {
      const answered = Object.keys(formData.invoiceAnswers).length
      if (answered < 5) return '请回答所有发票与资金流问题'
    }
    if (step === 2) {
      const answered = Object.keys(formData.revenueAnswers).length
      if (answered < 4) return '请回答所有收入与成本问题'
    }
    if (step === 3) {
      const answered = Object.keys(formData.publicPrivateAnswers).length
      if (answered < 5) return '请回答所有公私账户问题'
    }
    if (step === 4) {
      const answered = Object.keys(formData.taxAnswers).length
      if (answered < 5) return '请回答所有税务申报问题'
    }
    return null
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const payload = {
        enterpriseName: formData.enterpriseName,
        creditCode: formData.creditCode,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
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
      setSubmitSuccess(true)
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
    return <div className="min-h-screen bg-white flex items-center justify-center" style={{ color: '#666666' }}>加载中...</div>
  }

  // 提交成功确认页面
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1f2937' }}>检测报告已生成</h2>
          <p className="text-lg mb-6" style={{ color: '#4b5563' }}>
            扫码添加顾问微信，免费获取完整报告
          </p>
          <div className="mb-8">
            <img 
              src="data:image/png;base64,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8KysrN9+++2NN954//33TSbT6NGji4qKeDweE0LjcDi5ubktLS0//PCDl5fXG2+88fPPP7e2toaGhu7evbuiomLs2LErVqwICAjA88BisQwGQ0BAwK1bt2bMmLF7924OhwOqdt68eVYvxc/PDy76uO13zuOTKoIgbt68OWnSJJVK5eDgMHDgQJ1O16NHD/h6SJIUCoXz5s27fv36b7/9xuVyHR0dg4KCzp49C9t1vCxt3bpVpVK1qQp9fHxmz5595MiRbdu2HTlyBLTGqVOnevXq9fPPP58/f77NG2OxWOvWrdNoNLBLevrpp19//XWpVNrc3Az4wuXLl3F/pVJ56dIlmqbPnTtHUdSSJUveeuutpKSkhoaGMWPGPP/88+PHj4eea9eunTRp0hdffHH48OGKioo5c+b861//CgoKunDhAkBfarWaoqj169dv3ryZpmmdTicQCDC4CstqS0vLhx9+OGPGDLVaffz4cR6P19ra+vPPPzOV4Pr163v27BkWFubs7Ozn50dRlMVioWm6qanJaDQyH/all15isVh8Pj8oKOjq1atbt251dXXtGoD08Rrv169fh3UCXlh6evrhw4fxX+Pj452cnOLj43/88UeE0PDhwzkcTlBQUGJiolarvXXrFk3TfD5/8eLFRqORy+VaXcJkMjk7O/N4vBs3bmzZsgW+v4SEhH//+99RUVGpqanYMgNhOnHixMcffwwq9Zlnnvn6669JkvT39x88eDBJki0tLSkpKbdu3YLNAWDZJ06cmDt3rpubG5vNXrduXVpa2u3bt19//fWePXsKBILQ0NC8vLzs7GyMFYlEoqCgoKFDh86ZMycqKspisWi1WgzNwxcVFBQUEREBG2GdTgdAFJ6it956C2YDSmho6Isvvpienh4QEHD48OGrV68eP35cpVLhDgUFBTAzFRUVvr6+GLyAj1AoFG7dunXcuHFvvvnmCy+8QJJkamoqPN3jFq/HaLzDegArSlFRkZOT07Zt2/7xj38AMm40Gl999dXY2NgxY8Zs27aNpunJkydTFBUaGrp169YZM2bACzYYDM899xzYsLalR48eaWlp48aN8/T0zMnJWbt2bb9+/VJTUymKsoXyGxoa8JiDBw9+5ZVXVq9eTVGUXq8Hm2/Hjh15eXlwgGM2m/v37x8ZGUnTtFAohNcwbty4hQsXwsYCIXT69Ok2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" 
              alt="顾问微信二维码" 
              className="w-48 h-48 mx-auto rounded-lg border border-gray-200"
            />
          </div>
          <button
            onClick={() => window.location.href = '/risk'}
            className="px-8 py-3 rounded-lg text-white font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            再次检测
          </button>
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
            <h1 className="text-xl font-bold" style={{ color: '#1f2937' }}>企业财税合规风险筛查</h1>
            <span className="text-sm" style={{ color: '#6b7280' }}>第 {currentStep + 1} / {STEPS.length} 步</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, background: getProgressGradient() }} />
          </div>
          <div className="flex justify-between mt-2 text-xs" style={{ color: '#9ca3af' }}>
            {STEPS.map((s, i) => (
              <span key={s.id} className={i <= currentStep ? 'font-medium' : ''} style={{ color: i <= currentStep ? '#2563eb' : '#9ca3af' }}>{s.label}</span>
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
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>企业名称</label>
                <input
                  type="text"
                  value={formData.enterpriseName}
                  onChange={e => setFormData(p => ({ ...p, enterpriseName: e.target.value }))}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="请输入企业全称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>统一信用代码</label>
                <input
                  type="text"
                  value={formData.creditCode}
                  onChange={e => {
                    const v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 18)
                    setFormData(p => ({ ...p, creditCode: v }))
                    if (v.length > 0 && v.length < 18) setCreditCodeError('统一信用代码应为18位大写字母或数字')
                    else setCreditCodeError('')
                  }}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                  className={`w-full px-4 py-2 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${creditCodeError ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="18位统一社会信用代码"
                />
                {creditCodeError && <p className="text-red-500 text-xs mt-1">{creditCodeError}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>联系人 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={e => setFormData(p => ({ ...p, contactPerson: e.target.value }))}
                    style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="请输入联系人姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>联系电话 <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                      setFormData(p => ({ ...p, contactPhone: v }))
                      if (v.length > 0 && v.length < 11) setPhoneError('请输入11位手机号码')
                      else setPhoneError('')
                    }}
                    style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                    className={`w-full px-4 py-2 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${phoneError ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="用于接收检测报告"
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>所属行业 <span className="text-red-500">*</span></label>
                  <select
                    value={formData.industry}
                    onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))}
                    style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
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
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>营收规模 <span className="text-red-500">*</span></label>
                  <select
                    value={formData.revenueScale}
                    onChange={e => setFormData(p => ({ ...p, revenueScale: e.target.value }))}
                    style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
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
            <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div className="font-medium mb-2" style={{ color: '#1e40af' }}>💡 数据越完整，筛查越精准</div>
              <ul className="space-y-1" style={{ color: '#374151' }}>
                <li>• 仅填最新一期：出基础筛查报告（无趋势分析）</li>
                <li>• 填1-3年年度数据：出完整筛查报告（含趋势预警+行业基准对比）</li>
                <li>• 开业3年以上的企业，建议填满3年数据，可获得最完整的风险趋势分析</li>
              </ul>
            </div>
            {/* 最新一期月份选择 */}
            <div className="bg-white rounded-lg p-4 border-2" style={{ borderColor: '#C2410C' }}>
              <div className="flex items-center gap-4">
                <label className="font-medium" style={{ color: '#374151' }}>数据所属月份</label>
                <select
                  value={formData.latestMonth}
                  onChange={e => {
                    const newMonth = e.target.value
                    setFormData(p => {
                      const newData = [...p.financialData]
                      newData[0] = { ...newData[0], period: newMonth }
                      return { ...p, latestMonth: newMonth, financialData: newData }
                    })
                  }}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
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
          <div className="rounded-lg p-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>{error}</div>
        )}

        {/* 导航按钮 */}
        <div className="flex justify-between mt-8">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep(s => s - 1)}
              style={{ backgroundColor: '#ffffff', color: '#374151', border: '1px solid #d1d5db' }}
              className="px-6 py-3 rounded-lg hover:bg-gray-50"
            >
              上一步
            </button>
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
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg text-white font-medium flex items-center gap-2"
              style={{ background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> 提交中...</> : '提交检测'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
