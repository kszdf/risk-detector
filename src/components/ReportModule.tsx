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

// 高级配色系统
const THEME = {
  primary: '#0f172a',      // 深海军蓝 - 主色
  primaryLight: '#1e293b', // 浅一级
  accent: '#2563eb',       // 品牌蓝
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

export default function ReportModule() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const riskId = params.get('riskId')
    if (!riskId) { setError('缺少riskId参数'); setLoading(false); return }

    fetch(`/api/risk-report?riskId=${riskId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setError('加载失败'); setLoading(false) })
  }, [])

  if (loading) return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, sans-serif', background: THEME.gray[50], minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${THEME.gray[200]}`, borderTopColor: THEME.accent, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: THEME.gray[500], fontSize: 15 }}>正在加载报告...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (error || !data) return <ErrorView message={error || '数据加载失败'} />
  if (data.error) return <ErrorView message={data.error} />

  const { basicInfo, riskLevel, riskCounts, reportContent, createdAt } = data
  const overview = reportContent?.overview
  const totalItems = (riskCounts.red || 0) + (riskCounts.yellow || 0) + (riskCounts.green || 0)
  const displayPeriod = basicInfo.period || overview?.period || createdAt?.split(' ')[0] || '-'

  return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, -apple-system, sans-serif', background: THEME.gray[50], minHeight: '100vh', color: THEME.gray[800], lineHeight: 1.6 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @media print { .no-print { display: none !important } }
      `}</style>

      {/* 顶部导航条 */}
      <div style={{ background: THEME.primary, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${THEME.accent}, #7c3aed)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>慧</div>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 500, letterSpacing: 1 }}>慧根堂财税联盟</span>
        </div>
        <button
          onClick={() => window.print()}
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          📄 打印 / 导出PDF
        </button>
      </div>

      {/* 报告主体 */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* 报告头部 - 渐变背景 */}
        <div style={{
          background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 50%, #1e3a5f 100%)`,
          borderRadius: 16,
          padding: '40px 40px 32px',
          marginBottom: 24,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* 装饰元素 */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>TAX RISK ASSESSMENT REPORT</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>企业财税合规风险筛查报告</h1>

            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: '16px 32px', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>检测编号</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{overview?.riskId || '-'}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>所属期</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{displayPeriod}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>检测时间</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{createdAt || '-'}</span></div>
              <div><span style={{ color: 'rgba(255,255,255,0.5)' }}>企业</span><br /><span style={{ fontWeight: 600, color: '#fff' }}>{basicInfo.enterpriseName || '-'}</span></div>
            </div>
          </div>
        </div>

        {/* 审核状态横幅 */}
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

        {/* 风险等级概览 - 大卡片 */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '32px 40px',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
          border: `1px solid ${THEME.gray[100]}`,
          animation: 'fadeIn 0.4s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ fontSize: 13, color: THEME.gray[500], marginBottom: 8, letterSpacing: 1 }}>综合风险等级</div>
              <div style={{
                fontSize: 36,
                fontWeight: 800,
                color: riskLevel.includes('极') ? THEME.danger : riskLevel.includes('高') ? '#ea580c' : riskLevel.includes('中') ? THEME.warning : THEME.success,
                lineHeight: 1.2,
              }}>
                {riskLevel}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <RiskMeter count={riskCounts.red} total={totalItems} label="高风险" color={THEME.danger} bgColor={THEME.dangerLight} />
              <RiskMeter count={riskCounts.yellow} total={totalItems} label="中风险" color={THEME.warning} bgColor={THEME.warningLight} />
              <RiskMeter count={riskCounts.green} total={totalItems} label="低风险" color={THEME.success} bgColor={THEME.successLight} />
            </div>
          </div>

          {/* 风险比例条 */}
          {totalItems > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: THEME.gray[100] }}>
                <div style={{ width: `${(riskCounts.red / totalItems) * 100}%`, background: `linear-gradient(90deg, ${THEME.danger}, #f87171)`, transition: 'width 0.6s ease' }} />
                <div style={{ width: `${(riskCounts.yellow / totalItems) * 100}%`, background: `linear-gradient(90deg, ${THEME.warning}, #fbbf24)`, transition: 'width 0.6s ease' }} />
                <div style={{ width: `${(riskCounts.green / totalItems) * 100}%`, background: `linear-gradient(90deg, ${THEME.success}, #34d399)`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <Card title="基本信息" icon="📋">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <InfoCell label="企业名称" value={basicInfo.enterpriseName} />
            <InfoCell label="统一信用代码" value={basicInfo.creditCode} mono />
            <InfoCell label="联系人" value={basicInfo.contactPerson} />
            <InfoCell label="联系电话" value={basicInfo.contactPhone} />
            <InfoCell label="所属行业" value={basicInfo.industry} />
            <InfoCell label="年营收规模" value={basicInfo.revenueScale} />
            <InfoCell label="所属期" value={displayPeriod} />
          </div>
        </Card>

        {/* 工商信息 */}
        <Card title="工商信息查询" icon="🏢">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ fontSize: 14, color: THEME.gray[600] }}>
              通过国家企业信用信息公示系统核实企业工商注册信息
            </div>
            <a
              href={`https://www.gsxt.gov.cn/corpquery-search-info.html?keyword=${encodeURIComponent(basicInfo.enterpriseName || basicInfo.creditCode || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.accentLight})`,
                color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.4)' }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.3)' }}
            >
              🔍 查询工商信息
            </a>
          </div>
        </Card>

        {/* 高风险清单 */}
        {reportContent && reportContent.highRiskItems?.length > 0 && (
          <Card title={`高风险项 · ${reportContent.highRiskItems.length}项`} icon="🔴" titleColor={THEME.danger} accent={THEME.danger}>
            {reportContent.highRiskItems.map((item, i) => (
              <RiskItemCard key={i} item={item} level="high" index={i} />
            ))}
          </Card>
        )}

        {/* 中风险清单 */}
        {reportContent && reportContent.mediumRiskItems?.length > 0 && (
          <Card title={`中风险项 · ${reportContent.mediumRiskItems.length}项`} icon="🟡" titleColor={THEME.warning} accent={THEME.warning}>
            {reportContent.mediumRiskItems.map((item, i) => (
              <RiskItemCard key={i} item={item} level="medium" index={i} />
            ))}
          </Card>
        )}

        {/* 低风险清单 */}
        {reportContent && reportContent.lowRiskItems?.length > 0 && (
          <Card title={`低风险项 · ${reportContent.lowRiskItems.length}项`} icon="🟢" titleColor={THEME.success}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {reportContent.lowRiskItems.map((item, i) => (
                <span key={i} style={{
                  background: THEME.successLight,
                  color: '#065f46',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 500,
                  border: `1px solid #a7f3d0`,
                }}>{item}</span>
              ))}
            </div>
          </Card>
        )}

        {/* 交叉验证 */}
        {reportContent && reportContent.crossValidation?.length > 0 && (
          <Card title="交叉验证分析" icon="🔍">
            {reportContent.crossValidation.map((c, i) => (
              <div key={i} style={{
                padding: '16px 0',
                borderBottom: i < reportContent.crossValidation.length - 1 ? `1px solid ${THEME.gray[100]}` : 'none',
              }}>
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
          </Card>
        )}

        {/* 行业基准对比 */}
        {reportContent && reportContent.industryBenchmarks && reportContent.industryBenchmarks.items?.length > 0 && (
          <Card title="行业基准对比" icon="📊" subtitle={`企业实际指标与${reportContent.industryBenchmarks.industry || '该行业'}行业基准范围对比`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
                <thead>
                  <tr>
                    {['指标', '行业基准范围', '企业实际值', '状态'].map(h => (
                      <th key={h} style={{
                        textAlign: h === '指标' ? 'left' : 'center',
                        padding: '12px 16px',
                        background: THEME.gray[50],
                        color: THEME.gray[500],
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${THEME.gray[200]}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportContent.industryBenchmarks.items.map((item, i) => (
                    <tr key={i} style={{ animation: `fadeIn 0.3s ease-out ${i * 0.05}s both` }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500, borderBottom: `1px solid ${THEME.gray[100]}` }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: '14px 16px', color: THEME.gray[500], borderBottom: `1px solid ${THEME.gray[100]}` }}>
                        {item.benchmarkMin} ~ {item.benchmarkMax}{item.unit}
                      </td>
                      <td style={{
                        textAlign: 'center', padding: '14px 16px', fontWeight: 700, fontSize: 15,
                        color: item.status === 'below' ? THEME.danger : item.status === 'above' ? THEME.warning : THEME.success,
                        borderBottom: `1px solid ${THEME.gray[100]}`,
                      }}>
                        {item.actual}{item.unit}
                      </td>
                      <td style={{ textAlign: 'center', padding: '14px 16px', borderBottom: `1px solid ${THEME.gray[100]}` }}>
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
          </Card>
        )}

        {/* 财务指标 */}
        {reportContent && reportContent.financialIndicators?.length > 0 && (
          <Card title="核心财务指标" icon="💰">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14, minWidth: 600 }}>
                <thead>
                  <tr>
                    {['期间', '毛利率', '净利率', '增值税税负率', '所得税贡献率', '资产负债率'].map(h => (
                      <th key={h} style={{
                        textAlign: h === '期间' ? 'center' : 'right',
                        padding: '12px 16px',
                        background: THEME.gray[50],
                        color: THEME.gray[500],
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${THEME.gray[200]}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportContent.financialIndicators.map((ind, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', padding: '14px 16px', fontWeight: 600, borderBottom: `1px solid ${THEME.gray[100]}` }}>{ind.period}</td>
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
          </Card>
        )}

        {/* 免责声明 + 品牌 */}
        <div style={{
          marginTop: 40,
          padding: '24px 32px',
          background: '#fff',
          borderRadius: 12,
          border: `1px solid ${THEME.gray[100]}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ fontSize: 12, color: THEME.gray[400], lineHeight: 1.8, textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: THEME.gray[500] }}>免责声明</strong>
            </div>
            本报告由系统基于企业提供的数据自动生成，仅供参考，不构成任何投资、经营或决策建议。<br />
            最终风险判定以专业财税顾问审核确认为准。
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.gray[100]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, background: `linear-gradient(135deg, ${THEME.accent}, #7c3aed)`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 10 }}>慧</div>
            <span style={{ fontSize: 13, color: THEME.gray[500], fontWeight: 500 }}>慧根堂财税联盟 · 专业财税风险管控</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: THEME.gray[400] }}>
            咨询热线：138-1294-3969 | 邮箱：zhanglaoshi@hgttax.com
          </div>
        </div>

      </div>
    </div>
  )
}

// ====== 子组件 ======

function Card({ title, icon, titleColor, accent, subtitle, children }: {
  title: string; icon?: string; titleColor?: string; accent?: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: '28px 32px',
      marginBottom: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      border: `1px solid ${THEME.gray[100]}`,
      animation: 'fadeIn 0.4s ease-out',
      borderLeft: accent ? `4px solid ${accent}` : undefined,
    }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          margin: 0, fontSize: 17, fontWeight: 700,
          color: titleColor || THEME.gray[800],
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          {title}
        </h2>
        {subtitle && <div style={{ fontSize: 13, color: THEME.gray[500], marginTop: 4 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: '12px 16px', background: THEME.gray[50], borderRadius: 10, border: `1px solid ${THEME.gray[100]}` }}>
      <div style={{ fontSize: 11, color: THEME.gray[400], marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 14, color: THEME.gray[800], fontFamily: mono ? 'monospace' : undefined }}>{value || '-'}</div>
    </div>
  )
}

function RiskMeter({ count, total, label, color, bgColor }: { count: number; total: number; label: string; color: string; bgColor: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 12, color: THEME.gray[500], marginTop: 4 }}>{label}</div>
      <div style={{ height: 4, borderRadius: 2, background: bgColor, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function RiskItemCard({ item, level, index }: { item: RiskItem; level: 'high' | 'medium'; index: number }) {
  const color = level === 'high' ? THEME.danger : THEME.warning
  const bgLight = level === 'high' ? THEME.dangerLight : THEME.warningLight
  return (
    <div style={{
      padding: '20px 0',
      borderBottom: `1px solid ${THEME.gray[100]}`,
      animation: `fadeIn 0.3s ease-out ${index * 0.08}s both`,
    }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
        <span style={{
          background: color, color: '#fff', padding: '3px 10px',
          borderRadius: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
        }}>
          {level === 'high' ? 'HIGH' : 'MEDIUM'}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15, color: THEME.gray[800] }}>{item.name}</span>
      </div>
      <div style={{ fontSize: 12, color: THEME.gray[400], marginBottom: 10 }}>
        来源：{item.source} · 模块：{item.module}
      </div>
      <div style={{ fontSize: 14, color: THEME.gray[600], marginBottom: 6, lineHeight: 1.7 }}>
        <strong style={{ color: THEME.gray[700] }}>风险影响：</strong>{item.impact}
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
  if (status === 'below') return <span style={{ background: THEME.dangerLight, color: '#991b1b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>⚠️ 偏低</span>
  if (status === 'above') return <span style={{ background: THEME.warningLight, color: '#92400e', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>⚡ 偏高</span>
  return <span style={{ background: THEME.successLight, color: '#065f46', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ 正常</span>
}

function ErrorView({ message }: { message: string }) {
  return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, sans-serif', background: THEME.gray[50], minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ color: THEME.danger, fontSize: 16, fontWeight: 500 }}>{message}</div>
      </div>
    </div>
  )
}

function numCellStyle(value: number, min: number, max: number, invertWarning?: boolean): React.CSSProperties {
  const isAbnormal = invertWarning ? value > max : value < min
  return {
    textAlign: 'right', padding: '14px 16px',
    fontWeight: 600, fontSize: 14,
    borderBottom: `1px solid ${THEME.gray[100]}`,
    color: isAbnormal ? THEME.danger : THEME.gray[700],
  }
}
