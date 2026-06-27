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

interface CompanyRiskSummary {
  executedCount: number
  dishonestCount: number
  abnormalOperationCount: number
  hasRisk: boolean
}

interface CompanyInfoData {
  available: boolean
  found: boolean
  companyName?: string
  creditCode?: string
  legalPerson?: string
  registeredCapital?: string
  establishDate?: string
  businessStatus?: string
  companyType?: string
  registeredAddress?: string
  businessScope?: string
  industry?: string
  operationPeriod?: string
  registrationAuthority?: string
  riskSummary?: CompanyRiskSummary
  detailUrl?: string
  gsxtUrl?: string
  message?: string
  error?: string
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

export default function ReportModule() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoData | null>(null)
  const [companyInfoLoading, setCompanyInfoLoading] = useState(false)

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
        // 报告加载完成后，自动查询工商信息
        const name = d.basicInfo?.enterpriseName || ''
        const code = d.basicInfo?.creditCode || ''
        if (name || code) {
          setCompanyInfoLoading(true)
          fetch(`/api/company-info?name=${encodeURIComponent(name)}&creditCode=${encodeURIComponent(code)}`)
            .then(r => r.json())
            .then(info => {
              if (!info.error || info.available) {
                setCompanyInfo(info)
              }
              setCompanyInfoLoading(false)
            })
            .catch(() => setCompanyInfoLoading(false))
        }
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

        {/* 工商信息 */}
        <Section title="工商信息" icon="🏢" accent="#2563eb">
          {companyInfoLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', color: THEME.gray[500] }}>
              <div style={{ width: 20, height: 20, border: '2px solid ' + THEME.gray[200], borderTopColor: THEME.accent, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14 }}>正在查询企业工商信息...</span>
            </div>
          ) : companyInfo?.found ? (
            <div>
              {/* 经营状态标签 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: companyInfo.businessStatus === '存续' || companyInfo.businessStatus === '在业' ? '#ecfdf5' : '#fef2f2',
                  color: companyInfo.businessStatus === '存续' || companyInfo.businessStatus === '在业' ? '#065f46' : '#991b1b',
                  border: '1px solid ' + (companyInfo.businessStatus === '存续' || companyInfo.businessStatus === '在业' ? '#a7f3d0' : '#fecaca'),
                }}>
                  {companyInfo.businessStatus === '存续' || companyInfo.businessStatus === '在业' ? '✅' : '⚠️'}
                  {companyInfo.businessStatus || '未知状态'}
                </span>
                {companyInfo.riskSummary && (
                  <>
                    {companyInfo.riskSummary.dishonestCount > 0 && (
                      <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                        🔴 失信记录 {companyInfo.riskSummary.dishonestCount}条
                      </span>
                    )}
                    {companyInfo.riskSummary.executedCount > 0 && (
                      <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                        🟡 被执行记录 {companyInfo.riskSummary.executedCount}条
                      </span>
                    )}
                    {companyInfo.riskSummary.abnormalOperationCount > 0 && (
                      <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                        ⚠️ 经营异常 {companyInfo.riskSummary.abnormalOperationCount}次
                      </span>
                    )}
                    {!companyInfo.riskSummary.hasRisk && (
                      <span style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                        ✅ 暂无司法风险记录
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* 工商信息详情网格 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <InfoCell label="企业全称" value={companyInfo.companyName || '-'} />
                <InfoCell label="统一社会信用代码" value={companyInfo.creditCode || '-'} mono />
                <InfoCell label="法定代表人" value={companyInfo.legalPerson || '-'} />
                <InfoCell label="注册资本" value={companyInfo.registeredCapital || '-'} />
                <InfoCell label="成立日期" value={companyInfo.establishDate || '-'} />
                <InfoCell label="企业类型" value={companyInfo.companyType || '-'} />
                <InfoCell label="所属行业" value={companyInfo.industry || '-'} />
                <InfoCell label="登记机关" value={companyInfo.registrationAuthority || '-'} />
              </div>

              {/* 注册地址 */}
              {companyInfo.registeredAddress && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>注册地址</div>
                  <div style={{ fontSize: 14, color: '#1e293b' }}>{companyInfo.registeredAddress}</div>
                </div>
              )}

              {/* 经营范围 */}
              {companyInfo.businessScope && (
                <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' as const }}>经营范围</div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, maxHeight: 100, overflowY: 'auto' as const }}>{companyInfo.businessScope}</div>
                </div>
              )}

              {/* 数据来源链接 */}
              <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                {companyInfo.detailUrl && (
                  <a
                    href={companyInfo.detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      background: '#eff6ff', color: '#1e40af', textDecoration: 'none',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    🔍 风鸟企业详情
                  </a>
                )}
                <a
                  href={`https://www.gsxt.gov.cn/corpquery-search-info.html?keyword=${encodeURIComponent(companyInfo.companyName || basicInfo.enterpriseName || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                    background: '#f0fdf4', color: '#166534', textDecoration: 'none',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  🏛️ 国家企业信用信息公示系统
                </a>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: THEME.gray[400] }}>
                数据来源：风鸟企业查询 · 仅供参考，以官方公示为准
              </div>
            </div>
          ) : (
            /* 工商信息查询失败或未配置时的降级展示 */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <InfoCell label="企业名称" value={basicInfo.enterpriseName} />
                <InfoCell label="统一信用代码" value={basicInfo.creditCode} mono />
              </div>
              <a
                href={`https://www.gsxt.gov.cn/corpquery-search-info.html?keyword=${encodeURIComponent(basicInfo.enterpriseName || basicInfo.creditCode || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                }}
              >
                🔍 在国家企信系统查询完整工商信息
              </a>
            </div>
          )}
        </Section>

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
