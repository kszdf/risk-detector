'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'

// ============ 类型定义 ============
interface FormData {
  enterpriseName: string
  creditCode: string
  contactPerson: string
  contactPhone: string
  industry: string
  revenueScale: string
  financialData: {
    periodType: 'monthly' | 'quarterly' | 'annual'
    periodValue: string
    revenue: string
    cost: string
    vatPaid: string
    incomeTaxPaid: string
    totalAssets: string
    totalLiabilities: string
    prevRevenue: string
    prevVatPaid: string
  }
  riskAnswers: Record<string, boolean>
}

// ============ 常量定义 ============
const STEPS = [
  { id: 'basic', label: '基本信息' },
  { id: 'financial', label: '财务数据' },
  { id: 'risk', label: '风险评估' },
]

const INDUSTRIES = [
  '制造业', '批发零售', '建筑房地产', '信息技术',
  '餐饮住宿', '交通运输', '其他服务业', '农林牧渔', '其他'
]

const REVENUE_SCALES = [
  '500万以下', '500万-2000万', '2000万-1亿', '1亿以上'
]

const PERIOD_TYPES = [
  { value: 'monthly', label: '月度' },
  { value: 'quarterly', label: '季度' },
  { value: 'annual', label: '年度' },
]

// ============ 风险维度定义 ============
const RISK_DIMS = [
  {
    id: 'compliance',
    title: '申报与纳税合规',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    questions: [
      { id: 'q1', text: '近12个月是否存在逾期申报或逾期缴纳税款？' },
      { id: 'q2', text: '是否存在连续零申报或负申报超过6个月？' },
      { id: 'q3', text: '增值税申报收入与企业所得税申报收入是否存在较大差异且无合理说明？' },
      { id: 'q4', text: '企业是否连续三年及以上亏损但仍持续经营？' },
    ]
  },
  {
    id: 'invoice',
    title: '发票管理',
    color: '#D97706',
    bgColor: '#FFFBEB',
    questions: [
      { id: 'q5', text: '是否存在无票采购、取得走逃企业发票或品名不符的异常发票？' },
      { id: 'q6', text: '是否存在发票开具内容与实际经营范围明显不符？' },
      { id: 'q7', text: '是否存在大额现金交易或通过个人账户收款后"变票"入账？' },
      { id: 'q8', text: '是否存在进销项品名/数量严重不匹配（如进项钢材、销项电子产品）？' },
    ]
  },
  {
    id: 'revenue',
    title: '收入与成本',
    color: '#059669',
    bgColor: '#ECFDF5',
    questions: [
      { id: 'q9', text: '是否存在延迟开票确认收入、部分收入未入账或使用个人账户收款未报税？' },
      { id: 'q10', text: '是否存在账外经营（部分业务不入账，通过私人账户收支）？' },
      { id: 'q11', text: '是否存在利润明显虚高（毛利率远超同行但无法合理解释）？' },
      { id: 'q12', text: '是否存在库存账实不符（账面库存远大于实际、或库存长期只增不减）？' },
    ]
  },
  {
    id: 'expense',
    title: '费用与往来',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    questions: [
      { id: 'q13', text: '是否存在使用与经营无关的发票报销、或报销股东/员工个人消费？' },
      { id: 'q14', text: '是否存在股东与公司之间往来款余额过大（其他应收/其他应付占总资产比例异常）？' },
      { id: 'q15', text: '是否存在应纳税所得额刚好卡在小微企业/小型微利企业标准临界值附近？' },
      { id: 'q16', text: '是否存在大额费用列支无合同/无审批/无发票"三无"支撑？' },
    ]
  },
  {
    id: 'structure',
    title: '架构与关联交易',
    color: '#0891B2',
    bgColor: '#ECFEFF',
    questions: [
      { id: 'q17', text: '是否在税收洼地注册公司并享受核定征收？' },
      { id: 'q18', text: '是否存在关联方之间资金无偿拆借、或商品/服务价格明显偏离市场价？' },
      { id: 'q19', text: '是否存在通过多层架构（个独/合伙/壳公司）转移利润至低税率主体？' },
      { id: 'q20', text: '是否存在向非实际员工发放"工资"、或股东/家庭消费在公司列支？' },
    ]
  },
]

const createInitialFormData = (): FormData => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const quarter = Math.ceil(month / 3)
  
  return {
    enterpriseName: '',
    creditCode: '',
    contactPerson: '',
    contactPhone: '',
    industry: '',
    revenueScale: '',
    financialData: {
      periodType: 'quarterly',
      periodValue: `${year}-Q${quarter}`,
      revenue: '',
      cost: '',
      vatPaid: '',
      incomeTaxPaid: '',
      totalAssets: '',
      totalLiabilities: '',
      prevRevenue: '',
      prevVatPaid: '',
    },
    riskAnswers: {
      q1: false, q2: false, q3: false, q4: false,
      q5: false, q6: false, q7: false, q8: false,
      q9: false, q10: false, q11: false, q12: false,
      q13: false, q14: false, q15: false, q16: false,
      q17: false, q18: false, q19: false, q20: false,
    },
  }
}

// ============ 子组件 ============
interface NumberInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  tip?: string
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, required, placeholder = '0', tip }) => (
  <div>
    <label className="text-sm text-gray-600 mb-1.5 block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">万元</span>
    </div>
    {tip && <p className="text-xs text-gray-500 mt-1">{tip}</p>}
  </div>
)

interface TextInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  error?: string
  maxLength?: number
}

const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, required, placeholder, error, maxLength }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value.slice(0, maxLength))}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${error ? 'border-red-500' : 'border-gray-300'}`}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
)

interface YesNoToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  color: string
}

const YesNoToggle: React.FC<YesNoToggleProps> = ({ value, onChange, color }) => (
  <div className="flex rounded-lg overflow-hidden border border-gray-200">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
        value === false ? 'bg-green-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      否
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
        value === true ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
      style={value === true ? { backgroundColor: color, borderColor: color } : {}}
    >
      是
    </button>
  </div>
)

// ============ 主组件 ============
export default function RiskV4Module() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(createInitialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [riskId, setRiskId] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState('')
  const [creditCodeError, setCreditCodeError] = useState('')
  const router = useRouter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 更新财务数据字段
  const updateFinancialField = (field: keyof FormData['financialData'], value: string) => {
    setFormData(prev => ({
      ...prev,
      financialData: { ...prev.financialData, [field]: value }
    }))
  }

  // 更新风险答案
  const updateRiskAnswer = (questionId: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      riskAnswers: { ...prev.riskAnswers, [questionId]: value }
    }))
  }

  // 验证步骤
  const validateStep = (step: number): string | null => {
    if (step === 0) {
      if (!formData.contactPerson.trim()) return '请填写联系人'
      if (!formData.contactPhone.trim()) return '请填写联系电话'
      if (!/^1\d{10}$/.test(formData.contactPhone)) return '联系电话必须是11位手机号码'
      if (!formData.industry) return '请选择所属行业'
      if (!formData.revenueScale) return '请选择营收规模'
    }
    if (step === 1) {
      if (!formData.financialData.revenue) return '请填写本期营业收入'
      if (!formData.financialData.totalAssets) return '请填写资产总额'
      if (!formData.financialData.totalLiabilities) return '请填写负债总额'
    }
    return null
  }

  // 提交表单
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
        financialData: formData.financialData,
        riskAnswers: formData.riskAnswers,
        version: 'v5'
      }
      
      const res = await fetch('/api/risk-v4-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || '提交失败')
      }
      
      if (data.riskId) {
        setRiskId(data.riskId)
        setSubmitSuccess(true)
      } else {
        throw new Error('未获取到报告ID')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '提交失败，请重试'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 进度渐变
  const getProgressGradient = () => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981']
    return `linear-gradient(to right, ${colors.slice(0, currentStep + 1).join(', ')})`
  }

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  // 提交成功 - 立即跳转
  if (submitSuccess && riskId) {
    router.push(`/report?riskId=${riskId}`)
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="animate-pulse flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部进度条 */}
      <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">企业税务风险筛查</h1>
            <span className="text-sm text-gray-500">第 {currentStep + 1} / {STEPS.length} 步</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%`, background: getProgressGradient() }} 
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((s, i) => (
              <span 
                key={s.id} 
                className={`text-xs ${i <= currentStep ? 'font-medium' : ''}`}
                style={{ color: i <= currentStep ? '#3B82F6' : '#9CA3AF' }}
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-2xl mx-auto p-4">
        {/* ========== 步骤1: 基本信息 ========== */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">基本信息</h2>
              
              <div className="space-y-4">
                <TextInput
                  label="企业名称"
                  value={formData.enterpriseName}
                  onChange={v => setFormData(p => ({ ...p, enterpriseName: v }))}
                  placeholder="请输入企业全称"
                />

                <TextInput
                  label="统一社会信用代码"
                  value={formData.creditCode}
                  onChange={v => {
                    const val = v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 18)
                    setFormData(p => ({ ...p, creditCode: val }))
                    if (val.length > 0 && val.length < 18) setCreditCodeError('统一社会信用代码应为18位')
                    else setCreditCodeError('')
                  }}
                  placeholder="18位统一社会信用代码（选填）"
                  error={creditCodeError}
                />

                <div className="grid grid-cols-2 gap-4">
                  <TextInput
                    label="联系人"
                    value={formData.contactPerson}
                    onChange={v => setFormData(p => ({ ...p, contactPerson: v }))}
                    required
                    placeholder="请输入联系人姓名"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      联系电话<span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setFormData(p => ({ ...p, contactPhone: v }))
                        if (v.length > 0 && v.length < 11) setPhoneError('请输入11位手机号')
                        else setPhoneError('')
                      }}
                      placeholder="用于接收检测报告"
                      className={`w-full px-4 py-2.5 border rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${phoneError ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      所属行业<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.industry}
                      onChange={e => setFormData(p => ({ ...p, industry: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      <option value="">请选择行业</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      营收规模<span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.revenueScale}
                      onChange={e => setFormData(p => ({ ...p, revenueScale: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      <option value="">请选择规模</option>
                      {REVENUE_SCALES.map(scale => (
                        <option key={scale} value={scale}>{scale}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 步骤2: 财务数据 ========== */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">财务数据</h2>
              
              <div className="space-y-5">
                {/* 数据期间 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">数据所属期间<span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    <select
                      value={formData.financialData.periodType}
                      onChange={e => updateFinancialField('periodType', e.target.value as 'monthly' | 'quarterly' | 'annual')}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    >
                      {PERIOD_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formData.financialData.periodValue}
                      onChange={e => updateFinancialField('periodValue', e.target.value)}
                      placeholder={formData.financialData.periodType === 'quarterly' ? '2026-Q2' : formData.financialData.periodType === 'annual' ? '2026' : '2026-06'}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    示例：{formData.financialData.periodType === 'quarterly' ? '季度数据如 2026-Q2，半年数据如 2026-H1' : formData.financialData.periodType === 'annual' ? '年度数据如 2025' : '月度数据如 2026-06'}
                  </p>
                </div>

                {/* 本期数据 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm">本期数据（必填）</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <NumberInput
                      label="本期营业收入"
                      value={formData.financialData.revenue}
                      onChange={v => updateFinancialField('revenue', v)}
                      required
                      tip="利润表「营业收入」"
                    />
                    <NumberInput
                      label="本期营业成本"
                      value={formData.financialData.cost}
                      onChange={v => updateFinancialField('cost', v)}
                      tip="利润表「营业成本」"
                    />
                    <NumberInput
                      label="本期实缴增值税"
                      value={formData.financialData.vatPaid}
                      onChange={v => updateFinancialField('vatPaid', v)}
                      tip="增值税申报表「已缴税额」"
                    />
                    <NumberInput
                      label="本期实缴所得税"
                      value={formData.financialData.incomeTaxPaid}
                      onChange={v => updateFinancialField('incomeTaxPaid', v)}
                      tip="企业所得税申报表「实际应纳税额」"
                    />
                    <NumberInput
                      label="最新资产总额"
                      value={formData.financialData.totalAssets}
                      onChange={v => updateFinancialField('totalAssets', v)}
                      required
                      tip="资产负债表「资产总计」"
                    />
                    <NumberInput
                      label="最新负债总额"
                      value={formData.financialData.totalLiabilities}
                      onChange={v => updateFinancialField('totalLiabilities', v)}
                      required
                      tip="资产负债表「负债合计」"
                    />
                  </div>
                </div>

                {/* 上期数据 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-800 mb-3 text-sm">上期数据（选填，用于趋势分析）</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <NumberInput
                      label="上期营业收入"
                      value={formData.financialData.prevRevenue}
                      onChange={v => updateFinancialField('prevRevenue', v)}
                      tip="有助于分析收入变化趋势"
                    />
                    <NumberInput
                      label="上期实缴增值税"
                      value={formData.financialData.prevVatPaid}
                      onChange={v => updateFinancialField('prevVatPaid', v)}
                      tip="有助于分析税负变化趋势"
                    />
                  </div>
                </div>

                {/* 提示 */}
                <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>数据来源于企业财务报表或税务申报表，金额单位为"万元"。数据越完整，筛查越精准。</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== 步骤3: 风险评估 ========== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
              <p className="text-sm text-amber-800">
                <span className="font-medium">提示：</span>请根据企业实际情况判断以下20项风险指标。存在风险请选择"是"，无风险请选择"否"。
              </p>
            </div>

            {RISK_DIMS.map((dim, dimIndex) => (
              <div 
                key={dim.id}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm"
              >
                <div 
                  className="px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: dim.bgColor, borderBottom: `2px solid ${dim.color}` }}
                >
                  <span 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: dim.color }}
                  >
                    {dimIndex + 1}
                  </span>
                  <h3 className="font-medium text-gray-900">{dim.title}</h3>
                </div>
                <div className="p-4 space-y-3">
                  {dim.questions.map((q) => (
                    <div key={q.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed">{q.text}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <YesNoToggle
                          value={formData.riskAnswers[q.id] || false}
                          onChange={v => updateRiskAnswer(q.id, v)}
                          color={dim.color}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 rounded-lg p-4 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* 导航按钮 */}
        <div className="flex justify-between mt-8 pb-8">
          {currentStep > 0 ? (
            <button
              onClick={() => { setError(null); setCurrentStep(s => s - 1) }}
              className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一步
            </button>
          ) : <div />}
          
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => {
                const err = validateStep(currentStep)
                if (err) { setError(err); return }
                setError(null)
                setCurrentStep(s => s + 1)
              }}
              className="px-8 py-3 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              下一步
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl text-white font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ 
                background: isSubmitting 
                  ? '#9CA3AF' 
                  : 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  提交检测
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
