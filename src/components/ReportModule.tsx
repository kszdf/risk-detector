'use client'
import { useEffect, useState } from 'react'

interface RiskItem {
  name: string
  source: string
  module: string
  impact: string
  consequence?: string
  taxPolicy?: string
}

interface CrossValidationItem {
  name: string
  rule?: string
  level: string
  detail: string
  taxPolicy?: string
}

interface BusinessInfo {
  enterpriseName?: string
  creditCode?: string
}

interface CreditCodeAnalysis {
  valid: boolean
  reason?: string
  deptName?: string
  categoryName?: string
  fullType?: string
  regionCode?: string
  regionName?: string
  orgCode?: string
  checkDigit?: string
  expectedCheck?: string
  checksumMismatch?: boolean
}

interface ReportData {
  error?: string
  basicInfo: { enterpriseName: string; contactPerson: string; contactPhone: string; industry: string; revenueScale: string; creditCode: string; period?: string }
  riskLevel: string
  riskCounts: { red: number; yellow: number; green: number }
  reportStatus?: string
  reportContent: {
    overview: { riskId: string; period: string; level: string; levelIcon: string; redCount: number; yellowCount: number; greenCount: number }
    highRiskItems: RiskItem[]
    mediumRiskItems: RiskItem[]
    lowRiskItems: string[]
    trendWarnings: { label: string; level: string; detail: string; consequence: string }[]
    crossValidation: CrossValidationItem[]
    industryBenchmarks: { industry: string; items: { name: string; unit: string; benchmarkMin: number; benchmarkMax: number; actual: number; status: string }[] } | null
    financialIndicators: { period: string; vatRate: number; citRate: number; grossMargin: number; netMargin: number; liabilityRatio: number }[]
  } | null
  createdAt: string
  businessInfo?: BusinessInfo
}

const THEME = {
  primary: '#0f172a',
  primaryLight: '#1e293b',
  accent: '#2563eb',
  accentLight: '#3b82f6',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  dangerLight: '#fef2f2',
  warningLight: '#fffbeb',
  successLight: '#ecfdf5',
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  }
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: '28px 32px',
  marginBottom: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
  border: '1px solid #e2e8f0',
}

// ============ 统一社会信用代码解析 ============
const DEPT_CODES: Record<string, string> = {
  '1': '机构编制机关', '5': '民政部门', '9': '工商部门',
  'Y': '市场监管部门', 'A': '司法行政部门', 'N': '农业农村部门',
}
const CATEGORY_MAP: Record<string, Record<string, string>> = {
  '1': { '1': '机关', '2': '事业单位', '3': '群众团体', '9': '其他' },
  '5': { '1': '社会团体', '2': '民办非企业单位', '3': '基金会', '9': '其他' },
  '9': { '1': '企业', '2': '个体工商户', '3': '农民专业合作社', '9': '其他' },
  'Y': { '1': '企业', '2': '个体工商户', '3': '农民专业合作社', '9': '其他' },
  'A': { '1': '律师执业机构', '2': '公证机构', '9': '其他' },
  'N': { '1': '事业单位', '2': '社会团体', '9': '其他' },
}
const REGION_MAP: Record<string, string> = {
  '110000': '北京市', '110100': '北京市', '120000': '天津市',
  '310000': '上海市', '310100': '上海市', '500000': '重庆市',
  '320000': '江苏省', '320100': '南京市', '320200': '无锡市', '320300': '徐州市',
  '320400': '常州市', '320500': '苏州市', '320600': '南通市', '320700': '连云港市',
  '320800': '淮安市', '320900': '盐城市', '321000': '扬州市', '321100': '镇江市',
  '321200': '泰州市', '321300': '宿迁市',
  '330000': '浙江省', '330100': '杭州市', '330200': '宁波市', '330300': '温州市',
  '330400': '嘉兴市', '330500': '湖州市', '330600': '绍兴市',
  '440000': '广东省', '440100': '广州市', '440300': '深圳市', '440400': '珠海市',
  '440600': '佛山市', '441300': '惠州市', '441900': '东莞市',
  '370000': '山东省', '370100': '济南市', '370200': '青岛市',
  '510000': '四川省', '510100': '成都市', '420000': '湖北省', '420100': '武汉市',
  '430000': '湖南省', '430100': '长沙市', '130000': '河北省', '130100': '石家庄市',
  '410000': '河南省', '410100': '郑州市', '350000': '福建省', '350100': '福州市',
  '350200': '厦门市', '340000': '安徽省', '340100': '合肥市',
  '210000': '辽宁省', '210100': '沈阳市', '210200': '大连市',
  '610000': '陕西省', '610100': '西安市',
}

function parseCreditCode(code: string): CreditCodeAnalysis {
  code = (code || '').trim().toUpperCase()
  if (code.length !== 18) {
    return { valid: false, reason: `编码长度为${code.length}位（标准应为18位）` }
  }
  const dept = code[0]
  const category = code[1]
  const regionCode = code.substring(2, 8)
  const orgCode = code.substring(8, 17)
  const checkDigit = code[17]
  const deptName = DEPT_CODES[dept] || `未知部门(${dept})`
  const categoryMap = CATEGORY_MAP[dept] || {}
  const categoryName = categoryMap[category] || `未知类别(${category})`
  const regionName = REGION_MAP[regionCode] || `行政区划${regionCode}`

  // 校验码验证（GB 32100-2015）
  const charset = '0123456789ABCDEFGHJKLMNPQRTUWXY'
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const idx = charset.indexOf(code[i])
    if (idx === -1) return { valid: false, reason: `第${i + 1}位"${code[i]}"不在合法字符集中` }
    sum += idx * weights[i]
  }
  const expectedCheck = charset[(31 - (sum % 31)) % 31]
  const checksumValid = expectedCheck === checkDigit

  return {
    valid: checksumValid,
    checksumMismatch: !checksumValid,
    deptName,
    categoryName,
    fullType: `${deptName} · ${categoryName}`,
    regionCode,
    regionName,
    orgCode,
    checkDigit,
    expectedCheck,
  }
}

export default function ReportModule() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const riskId = params.get('riskId')
    if (!riskId) { setError('缺少riskId参数'); setLoading(false); return }

    fetch('/api/risk-report?riskId=' + riskId)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setError('加载失败'); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, -apple-system, sans-serif', background: THEME.gray[50], minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid ' + THEME.gray[200], borderTopColor: THEME.accent, borderRadius: '50%', margin: '0 auto 16px' }} />
        <div style={{ color: THEME.gray[500], fontSize: 15 }}>正在加载报告...</div>
      </div>
    </div>
  )
  if (error || !data) return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, sans-serif', background: THEME.gray[50], minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: THEME.danger, fontSize: 16, fontWeight: 500 }}>{error || '数据加载失败'}</div>
      </div>
    </div>
  )
  if (data.error) return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, sans-serif', background: THEME.gray[50], minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: THEME.danger, fontSize: 16, fontWeight: 500 }}>{data.error}</div>
      </div>
    </div>
  )

  const { basicInfo, riskLevel, riskCounts, reportContent, createdAt } = data
  const overview = reportContent?.overview
  const totalItems = (riskCounts.red || 0) + (riskCounts.yellow || 0) + (riskCounts.green || 0)
  const displayPeriod = basicInfo.period || overview?.period || (createdAt ? createdAt.split(' ')[0] : '-')

  const riskColor = riskLevel.includes('极') ? THEME.danger : riskLevel.includes('高') ? '#ea580c' : riskLevel.includes('中') ? THEME.warning : THEME.success

  return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, -apple-system, sans-serif', background: THEME.gray[50], minHeight: '100vh', color: THEME.gray[800], lineHeight: 1.6 }}>

      {/* 顶部导航条 */}
      <div style={{ background: THEME.primary, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>慧</div>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 500, letterSpacing: 1 }}>慧根堂财税联盟</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
        >
          打印 / 导出PDF
        </button>
      </div>

      {/* 全局样式 */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      {/* 报告主体 */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* 报告头部 */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e3a5f 100%)',
          borderRadius: 16,
          padding: '40px 40px 32px',
          marginBottom: 24,
          color: '#fff',
          position: 'relative' as const,
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute' as const, top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute' as const, bottom: -30, left: -30, width: 150, height: 150, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

          <div style={{ position: 'relative' as const, zIndex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 8 }}>TAX RISK ASSESSMENT REPORT</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>企业财税合规风险筛查报告</h1>

            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap' as const, gap: '16px 32px', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>检测编号</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{overview?.riskId || '-'}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>所属期</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{displayPeriod}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>检测时间</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{createdAt || '-'}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>企业</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{basicInfo.enterpriseName || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* 审核状态提示 */}
        {data.reportStatus === '待审核' && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid #fbbf24',
            borderRadius: 12,
            padding: '14px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 14,
            color: '#92400e',
          }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <strong>报告审核中</strong> — 当前内容为系统初步筛查结果，将由专业财税顾问确认后发送最终版本。
            </div>
          </div>
        )}

        {/* 风险等级概览 */}
        <div style={{ ...cardStyle, animation: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: THEME.gray[500], marginBottom: 8, letterSpacing: 1 }}>综合风险等级</div>
              <div style={{ fontSize: 42, fontWeight: 800, color: riskColor, lineHeight: 1.2 }}>
                {riskLevel}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <RiskMeter count={riskCounts.red} total={totalItems} label="高风险" color={THEME.danger} bgColor={THEME.dangerLight} />
              <RiskMeter count={riskCounts.yellow} total={totalItems} label="中风险" color={THEME.warning} bgColor={THEME.warningLight} />
              <RiskMeter count={riskCounts.green} total={totalItems} label="低风险" color={THEME.success} bgColor={THEME.successLight} />
            </div>
          </div>

          {totalItems > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: THEME.gray[100] }}>
                <div style={{ width: (riskCounts.red / totalItems) * 100 + '%', background: 'linear-gradient(90deg, #dc2626, #f87171)' }} />
                <div style={{ width: (riskCounts.yellow / totalItems) * 100 + '%', background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />
                <div style={{ width: (riskCounts.green / totalItems) * 100 + '%', background: 'linear-gradient(90deg, #059669, #34d399)' }} />
              </div>
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <Section title="基本信息" icon="📋">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <InfoCell label="企业名称" value={basicInfo.enterpriseName} />
            <InfoCell label="统一信用代码" value={basicInfo.creditCode} mono />
            <InfoCell label="联系人" value={basicInfo.contactPerson} />
            <InfoCell label="联系电话" value={basicInfo.contactPhone} />
            <InfoCell label="所属行业" value={basicInfo.industry} />
            <InfoCell label="年营收规模" value={basicInfo.revenueScale} />
            <InfoCell label="所属期" value={displayPeriod} />
          </div>
        </Section>

        {/* 工商登记信息 */}
        {(() => {
          const code = basicInfo.creditCode || ''
          const analysis = code ? parseCreditCode(code) : null
          const isValidCode = analysis?.valid !== false && code.length === 18
          return (
            <Section title="工商登记信息" icon="🏢" accent="#2563eb">
              {/* 基本信息网格 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: isValidCode ? 16 : 0 }}>
                <InfoCell label="企业全称" value={basicInfo.enterpriseName || '-'} />
                <InfoCell label="统一社会信用代码" value={code || '-'} mono />
                {analysis && isValidCode && (
                  <>
                    <InfoCell label="登记管理部门" value={analysis.deptName || '-'} />
                    <InfoCell label="机构类型" value={analysis.categoryName || '-'} />
                    <InfoCell label="登记机关所在地" value={analysis.regionName || '-'} />
                    <InfoCell label="组织机构代码" value={analysis.orgCode || '-'} mono />
                  </>
                )}
                <InfoCell label="所属行业" value={basicInfo.industry || '-'} />
                <InfoCell label="年营收规模" value={basicInfo.revenueScale || '-'} />
                <InfoCell label="所属期" value={displayPeriod} />
              </div>

              {/* 信用代码校验结果 */}
              {analysis && (
                <div style={{
                  marginTop: 12, padding: '12px 16px', borderRadius: 10,
                  background: analysis.valid ? '#ecfdf5' : '#fef2f2',
                  border: '1px solid ' + (analysis.valid ? '#a7f3d0' : '#fecaca'),
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: analysis.valid ? '#065f46' : '#991b1b', marginBottom: 4 }}>
                    {analysis.valid ? '✅ 统一社会信用代码校验通过' : '⚠️ 统一社会信用代码校验异常'}
                  </div>
                  <div style={{ fontSize: 12, color: analysis.valid ? '#047857' : '#b91c1c', lineHeight: 1.6 }}>
                    {analysis.valid
                      ? `校验码 ${analysis.checkDigit} 符合 GB 32100-2015 标准`
                      : `期望校验码为 ${analysis.expectedCheck}，实际为 ${analysis.checkDigit}${analysis.reason ? '；' + analysis.reason : ''}`}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 11, color: THEME.gray[400] }}>
                数据来源：企业自主申报（基于统一社会信用代码 GB 32100-2015 标准解析）
              </div>
            </Section>
          )
        })()}

        {/* 高风险清单 */}
        {reportContent && reportContent.highRiskItems && reportContent.highRiskItems.length > 0 && (
          <Section title={'高风险项 · ' + reportContent.highRiskItems.length + '项'} icon="🔴" titleColor={THEME.danger} accent={THEME.danger}>
            {reportContent.highRiskItems.map((item, i) => (
              <RiskItemCard key={i} item={item} level="high" index={i} />
            ))}
          </Section>
        )}

        {/* 中风险清单 */}
        {reportContent && reportContent.mediumRiskItems && reportContent.mediumRiskItems.length > 0 && (
          <Section title={'中风险项 · ' + reportContent.mediumRiskItems.length + '项'} icon="🟡" titleColor={THEME.warning} accent={THEME.warning}>
            {reportContent.mediumRiskItems.map((item, i) => (
              <RiskItemCard key={i} item={item} level="medium" index={i} />
            ))}
          </Section>
        )}

        {/* 低风险清单 */}
        {reportContent && reportContent.lowRiskItems && reportContent.lowRiskItems.length > 0 && (
          <Section title={'低风险项 · ' + reportContent.lowRiskItems.length + '项'} icon="🟢" titleColor={THEME.success}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {reportContent.lowRiskItems.map((item, i) => (
                <span key={i} style={{
                  background: THEME.successLight,
                  color: '#065f46',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid #a7f3d0',
                }}>{item}</span>
              ))}
            </div>
          </Section>
        )}

        {/* 趋势预警 */}
        {reportContent && reportContent.trendWarnings && reportContent.trendWarnings.length > 0 && (
          <Section title="趋势预警" icon="⚠️">
            {reportContent.trendWarnings.map((w, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < reportContent.trendWarnings.length - 1 ? '1px solid ' + THEME.gray[100] : 'none' }}>
                <span style={{ color: w.level === 'red' ? THEME.danger : THEME.warning, marginRight: 8 }}>⚠️</span>
                <strong>{w.label}</strong>：{w.detail}
                {w.consequence && <div style={{ fontSize: 13, color: THEME.gray[500], marginTop: 2 }}>建议：{w.consequence}</div>}
              </div>
            ))}
          </Section>
        )}

        {/* 行业基准对比 */}
        {reportContent && reportContent.industryBenchmarks && reportContent.industryBenchmarks.items && reportContent.industryBenchmarks.items.length > 0 && (
          <Section title="行业基准对比" icon="📊" subtitle={'企业实际指标与' + (reportContent.industryBenchmarks.industry || '该行业') + '行业基准范围对比'}>
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'separate' as const, borderSpacing: 0, fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={thStyle('left')}>指标</th>
                    <th style={thStyle('center')}>行业基准范围</th>
                    <th style={thStyle('center')}>企业实际值</th>
                    <th style={thStyle('center')}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {reportContent.industryBenchmarks.items.map((item, i) => (
                    <tr key={i}>
                      <td style={tdStyle()}>{item.name}</td>
                      <td style={{ ...tdStyle(), textAlign: 'center', color: THEME.gray[500] }}>
                        {item.benchmarkMin} ~ {item.benchmarkMax}{item.unit}
                      </td>
                      <td style={{
                        ...tdStyle(),
                        textAlign: 'center', fontWeight: 700, fontSize: 15,
                        color: item.status === 'below' ? THEME.danger : item.status === 'above' ? THEME.warning : THEME.success,
                      }}>
                        {item.actual}{item.unit}
                      </td>
                      <td style={{ ...tdStyle(), textAlign: 'center' }}>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16, padding: '12px 16px', background: THEME.gray[50], borderRadius: 8, fontSize: 12, color: THEME.gray[500], display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span>偏低可能面临税务关注（如税负率过低触发纳税评估），偏高可能存在成本核算异常。建议结合专业顾问综合判断。</span>
            </div>
          </Section>
        )}

        {/* 交叉验证 */}
        {reportContent && reportContent.crossValidation && reportContent.crossValidation.length > 0 && (
          <Section title="交叉验证分析" icon="🔍">
            {reportContent.crossValidation.map((c, i) => (
              <div key={i} style={{ padding: '16px 0', borderBottom: i < reportContent.crossValidation.length - 1 ? '1px solid ' + THEME.gray[100] : 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: c.level === 'red' ? THEME.dangerLight : THEME.warningLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, flexShrink: 0, marginTop: 2,
                  }}>
                    {c.level === 'red' ? '🔴' : '🟡'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.rule || c.name}</div>
                    <div style={{ fontSize: 14, color: THEME.gray[600] }}>{c.detail}</div>
                    {c.taxPolicy && <PolicyBox text={c.taxPolicy} />}
                  </div>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* 财务指标 */}
        {reportContent && reportContent.financialIndicators && reportContent.financialIndicators.length > 0 && (
          <Section title="核心财务指标" icon="💰">
            <div style={{ overflowX: 'auto' as const }}>
              <table style={{ width: '100%', borderCollapse: 'separate' as const, borderSpacing: 0, fontSize: 14, minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={thStyle('center')}>期间</th>
                    <th style={thStyle('right')}>毛利率</th>
                    <th style={thStyle('right')}>净利率</th>
                    <th style={thStyle('right')}>增值税税负率</th>
                    <th style={thStyle('right')}>所得税贡献率</th>
                    <th style={thStyle('right')}>资产负债率</th>
                  </tr>
                </thead>
                <tbody>
                  {reportContent.financialIndicators.map((ind, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle(), textAlign: 'center', fontWeight: 600 }}>{ind.period}</td>
                      <td style={numCellStyle(ind.grossMargin, 50, 70)}>{ind.grossMargin?.toFixed(1)}%</td>
                      <td style={numCellStyle(ind.netMargin, 5, 20)}>{ind.netMargin?.toFixed(1)}%</td>
                      <td style={numCellStyle(ind.vatRate, 1.5, 4)}>{ind.vatRate?.toFixed(2)}%</td>
                      <td style={numCellStyle(ind.citRate, 0.8, 2.5)}>{ind.citRate?.toFixed(2)}%</td>
                      <td style={numCellStyle(ind.liabilityRatio, 30, 70, true)}>{ind.liabilityRatio?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* 底部 */}
        <div style={{
          marginTop: 40,
          padding: '24px 32px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid ' + THEME.gray[100],
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: 12, color: THEME.gray[400], lineHeight: 1.8, textAlign: 'center' as const }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: THEME.gray[500] }}>免责声明</strong>
            </div>
            本报告由系统基于企业提供的数据自动生成，仅供参考，不构成任何投资、经营或决策建议。<br />
            最终风险判定以专业财税顾问审核确认为准。
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid ' + THEME.gray[100], display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 10 }}>慧</div>
            <span style={{ fontSize: 13, color: THEME.gray[500], fontWeight: 500 }}>慧根堂财税联盟 · 专业财税风险管控</span>
          </div>
          <div style={{ textAlign: 'center' as const, marginTop: 8, fontSize: 11, color: THEME.gray[400] }}>
            咨询热线：138-1294-3969 | 邮箱：zhanglaoshi@hgttax.com
          </div>
        </div>

      </div>
    </div>
  )
}

function thStyle(align: string): React.CSSProperties {
  return {
    textAlign: align as React.CSSProperties['textAlign'],
    padding: '12px 16px',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    borderBottom: '1px solid #e2e8f0',
  }
}

function tdStyle(): React.CSSProperties {
  return {
    padding: '14px 16px',
    borderBottom: '1px solid #f1f5f9',
  }
}

function numCellStyle(value: number, min: number, max: number, invertWarning?: boolean): React.CSSProperties {
  const isAbnormal = invertWarning ? value > max : value < min
  return {
    textAlign: 'right' as const,
    padding: '14px 16px',
    fontWeight: 600,
    fontSize: 14,
    borderBottom: '1px solid #f1f5f9',
    color: isAbnormal ? '#dc2626' : '#334155',
  }
}

function Section({ title, icon, titleColor, accent, subtitle, children }: {
  title: string; icon?: string; titleColor?: string; accent?: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div style={{ ...cardStyle, borderLeft: accent ? '4px solid ' + accent : undefined }}>
      <h2 style={{
        margin: '0 0 20px 0', fontSize: 17, fontWeight: 700,
        color: titleColor || '#1e293b',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        {title}
      </h2>
      {subtitle && <div style={{ fontSize: 13, color: '#64748b', marginTop: -12, marginBottom: 16 }}>{subtitle}</div>}
      {children}
    </div>
  )
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', fontFamily: mono ? 'monospace' : undefined }}>{value || '-'}</div>
    </div>
  )
}

function RiskMeter({ count, total, label, color, bgColor }: { count: number; total: number; label: string; color: string; bgColor: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ textAlign: 'center' as const, minWidth: 80 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
      <div style={{ height: 4, borderRadius: 2, background: bgColor, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color }} />
      </div>
    </div>
  )
}

function RiskItemCard({ item, level, index }: { item: RiskItem; level: 'high' | 'medium'; index: number }) {
  const color = level === 'high' ? THEME.danger : THEME.warning
  const bgLight = level === 'high' ? THEME.dangerLight : THEME.warningLight
  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
        <span style={{
          background: color, color: '#fff', padding: '3px 10px',
          borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        }}>
          {level === 'high' ? 'HIGH' : 'MEDIUM'}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{item.name}</span>
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        来源：{item.source} · 模块：{item.module}
      </div>
      <div style={{ fontSize: 14, color: '#475569', marginBottom: 4, lineHeight: 1.7 }}>
        <strong style={{ color: '#334155' }}>风险影响：</strong>{item.impact}
      </div>
      {item.consequence && (
        <div style={{
          padding: '10px 14px', background: bgLight, borderRadius: 8,
          fontSize: 13, color, fontWeight: 500, marginBottom: 8, lineHeight: 1.6,
        }}>
          ⚠️ {item.consequence}
        </div>
      )}
      {item.taxPolicy && <PolicyBox text={item.taxPolicy} />}
    </div>
  )
}

function PolicyBox({ text }: { text: string }) {
  return (
    <div style={{
      marginTop: 10, padding: '10px 14px',
      background: '#eff6ff', borderRadius: 8,
      fontSize: 12, color: '#1e40af', lineHeight: 1.6,
      borderLeft: '3px solid #2563eb',
    }}>
      <span style={{ fontWeight: 700 }}>📜 税收政策依据：</span>{text}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'below') return <span style={{ background: '#fef2f2', color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>⚠️ 偏低</span>
  if (status === 'above') return <span style={{ background: '#fffbeb', color: '#92400e', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>⚡ 偏高</span>
  return <span style={{ background: '#ecfdf5', color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ 正常</span>
}
