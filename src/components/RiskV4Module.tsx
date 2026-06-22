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
              src="data:image/png;base64,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EQXNnj37k08+6dGjx+AAA70vn1UqVY8ePVp8jxcaQuQHU6vVTz/99IYNG7g/4yaTafny5ZGRkXa7nb79cTqdixYtIhdTZ86ceeGFF8ilhEql2rNnz4EDB6Tvd926dfQ92gMPPBAeHh4eHu7dlrBj4b3Puemmm/r37+/9NbvdTt+Pd+3alV568eJFupUZafLSok2bNk2bNq1Pnz6rVq1644035s6dyz0NnDVrFp3Wv/32W/q+bP369S+88MJ111134sSJV199lcyPjIycNm1ai7+3CQkJO3bsiIyMVKvVn3/+eXZ2Nn3/PmvWrLvvvlvi067W5oUtW7ZMnDiRbvipUqnefvtt3gtub01NTT7b3sszcODAN99888SJE3T7G0KtVo8ZM6Y99hskQiT9cfdWb7311h133GE0Gr/88svrr7/+o48+mjp1Kn2Z4/F46Iu7xsZGemljY+P//d//kWaoBQUFDzzwgEqlmjFjBtcAwmAwrF27dtCgQdwXLl68+I9//IOOgdxot/FuJTIy0mazpaWlcZd15LGXw+Ggr6e6detGnv216vWOT1VVVd9++y2ZHDFiRFxcnPfXrly5QvdXM5lM9FKn00m36eUlR9rJkydnzJjhdruPHDly1113ffbZZ3v27Jk4cWKXLl2effZZkozq6uoKCgroFQ8ePFhYWLhgwYKYmJh58+YVFBRwjdX/93//V6S1JvcI8sKFC6+99hqd+9LS0iZNmiT+2CsiIiImJqa1bwOam5sLCwufe+4570elyuY1m8325JNPqlQqoV40PDfddJNOpxNqCz1y5MjWNkLsWEIn/XFPgt5+++3bb7+9X79+x44dmzdvXkNDw3333cc1bvBpz5499FM/p9PZvXv3hoYGknG6du3ar18/8ijku+++27t3b/v8KL8YOXIkSaO859krVqxop14fGzduJA8TRC4Bamtr6Ytf3oO26upqelFiYmKLG2lqanrttddI8+bz588vWLBg/fr1e/bscTgcsbGx3Pzm5uYlS5bQjxo4r7/+empq6v333//www8//PDDV69eLS8vT0pKojOU3W73/g0PCwsrKioaM2YKaXazd+9eXrcTb0INXOgXO7fccgt5v8y11h4/fvzatWvFtywuIyNjxowZ3GeR53HHjh0TbwLN07t37+7du9M348Sdd965YsWKEG71EmrpT61WP/HEE1zL59dff538p/7nP//x+erQ5XKtX7+ed2PCXTCSnKjX68n1XVNT04oVK0Kyy+DZs2c/++wzMpmUlET3xKDROSUyMpLXjYy+MFSr1S22bVSpVF988QX9sM9gMLz55pvcbx1JKE6nMy8vj7yWUalUiYmJ3GWa2+3Ozs7+85//nJubGxYW1rlz59GjR/N2YbFYuKadNK7L47Jly7Kzsz0eTxv/K+lmPUajccKECdyLmnfeeeeWV17h9QTXaDTdu3cXOiBut/v06dO868RBgwZx21RWbGzs8uXLead9p06d0tLSunfvHsJNXjghlf6ItWvX0s+zBw0a9NFHH5HriBYdP36c7ijCvQLjzmDyrDA+Pp781T148KBIe5qwsLDevXvL/o1S/Ga2VbZu3Up3Nbty5Qr3qpT29NNPp6am0td3nTt3joyMpL9DOg5yFyw9evTw3texY8dmzZpF/6q/9NJL5PECd9G3ZcuWadOmHT58mMzs3r37xo0b58yZs379ei5fPPvss9988w33NqNVP+z48eP/9Kc/hYWFLVmyRMFXqw0NDcuWLXvllVcuXbrkvdTtdt977715eXneDwQuXbr0zDPP8JL1U089tWjRIqVio4WHhw8fPrw9ttwhhGD6+/nnn1966SXyGxUREfHmm282NzeLP2TRarX333//22+/TeY0NDQ0NTW5XK5r165xc8gNjsfjWbZsWYvVYjgJCQnt2pai/Tidzr/97W/0nBbvp/7whz+kpqbSv9t6vZ5+y3T16lX6miI8PNz7Ysflcs2aNYu+8xo1atTTTz/NXXScPXt2xYoVS5YsOXfuHL2WRqN55513UlJS8vPz9+7dS/5bS0tLS0tLJ0+e/OKLLw4YMEC8KQmhVqufffbZ06dPL1myhMy577774uPj6SPw9defS9ka58qVKxMnTuQ9F+YiJ6fle++9989//vO999674447uFCbm5tLSkqmTp3Ky5gLFy6cPXu2xPZbpHmmz5ild8sLbGWNdhVq6c/pdObm5tJXJdOmTTOZTIMGDfL5t/3xxx83Go2kD8bPP/98+fLl06dPc82AuXOL+808fPgw3SauxTDKy8sltsLzptVqMzIyYmJixL/W2Ni4f//+lStXbtmy5d133+3WrZvEkh7ff/+90KLt27dL/1U/efIk+Xz8+PG0tDTyMpS7gyNLjx07lpaWptFo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" 
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
                <li>• 填1-3年年度数据：出完整筛查报告（含趋势预警+风险金额预估）</li>
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
