'use client'
import { useEffect, useState } from 'react'

interface ReportData {
  error?: string
  basicInfo: { enterpriseName: string; contactPerson: string; contactPhone: string; industry: string; revenueScale: string; creditCode: string }
  riskLevel: string
  riskCounts: { red: number; yellow: number; green: number }
  reportContent: {
    overview: { riskId: string; period: string; level: string; levelIcon: string; redCount: number; yellowCount: number; greenCount: number }
    highRiskItems: { name: string; source: string; module: string; impact: string; consequence: string }[]
    mediumRiskItems: { name: string; source: string; module: string; impact: string }[]
    lowRiskItems: string[]
    trendWarnings: { label: string; level: string; detail: string; consequence: string }[]
    crossValidation: { name: string; rule?: string; level: string; detail: string }[]
    financialIndicators: { period: string; vatRate: number; citRate: number; grossMargin: number; netMargin: number; liabilityRatio: number }[]
    industryBenchmarks: { name: string; unit: string; benchmarkMin: number; benchmarkMax: number; actual: number; status: string }[] | null
  } | null
  createdAt: string
}

const C = { red: '#ef4444', yellow: '#f59e0b', green: '#22c55e', blue: '#2563eb', gray: '#6b7280', bg: '#ffffff', text: '#1f2937', border: '#e5e7eb' }

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
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('加载失败'); setLoading(false) })
  }, [])

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100, color: C.gray }}>加载中...</div>
  if (error || !data) return <div style={{ textAlign: 'center', marginTop: 100, color: C.red }}>{error || '数据加载失败'}</div>
  if (data.error) return <div style={{ textAlign: 'center', marginTop: 100, color: C.red }}>{data.error}</div>

  const { basicInfo, riskLevel, riskCounts, reportContent, createdAt } = data
  const overview = reportContent?.overview

  return (
    <div style={{ fontFamily: '"Noto Sans SC", system-ui, sans-serif', background: '#f3f4f6', minHeight: '100vh', padding: '20px', color: C.text }}>
      <div style={{ maxWidth: 900, margin: '0 auto', background: C.bg, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {/* 头部 */}
        <div style={{ background: C.blue, color: '#fff', padding: '24px 32px' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>企业财税合规风险筛查报告</h1>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>检测ID：{overview?.riskId || '-'} | 检测时间：{createdAt || '-'}</div>
        </div>
        <div style={{ padding: '24px 32px' }}>
          {/* 基本信息 */}
          <Section title="基本信息">
            <Grid>
              <Item label="企业名称" value={basicInfo.enterpriseName || '-'} />
              <Item label="联系人" value={basicInfo.contactPerson || '-'} />
              <Item label="联系电话" value={basicInfo.contactPhone || '-'} />
              <Item label="所属行业" value={basicInfo.industry || '-'} />
              <Item label="年营收规模" value={basicInfo.revenueScale || '-'} />
              <Item label="统一信用代码" value={basicInfo.creditCode || '-'} />
            </Grid>
          </Section>

          {/* 风险概览 */}
          <Section title="风险概览">
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: riskLevel.includes('极') ? C.red : riskLevel.includes('高') ? '#f97316' : riskLevel.includes('中') ? C.yellow : C.green }}>
                {riskLevel}
              </div>
              <div style={{ fontSize: 18, color: C.gray }}>综合风险等级</div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <RiskBadge count={riskCounts.red} label="高风险" color={C.red} />
              <RiskBadge count={riskCounts.yellow} label="中风险" color={C.yellow} />
              <RiskBadge count={riskCounts.green} label="低风险" color={C.green} />
            </div>
          </Section>

          {/* 高风险清单 */}
          {reportContent && reportContent.highRiskItems?.length > 0 && (
            <Section title={`高风险清单 (${reportContent.highRiskItems.length}项)`} color={C.red}>
              {reportContent.highRiskItems.map((item, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < reportContent.highRiskItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ background: C.red, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>高风险</span>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>来源：{item.source} | 模块：{item.module}</div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}><strong>影响：</strong>{item.impact}</div>
                  <div style={{ fontSize: 14, color: C.red }}><strong>后果：</strong>{item.consequence}</div>
                </div>
              ))}
            </Section>
          )}

          {/* 中风险清单 */}
          {reportContent && reportContent.mediumRiskItems?.length > 0 && (
            <Section title={`中风险清单 (${reportContent.mediumRiskItems.length}项)`} color={C.yellow}>
              {reportContent.mediumRiskItems.map((item, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < reportContent.mediumRiskItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ background: C.yellow, color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>中风险</span>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>来源：{item.source} | 模块：{item.module}</div>
                  <div style={{ fontSize: 14 }}><strong>影响：</strong>{item.impact}</div>
                </div>
              ))}
            </Section>
          )}

          {/* 低风险清单 */}
          {reportContent && reportContent.lowRiskItems?.length > 0 && (
            <Section title={`低风险清单 (${reportContent.lowRiskItems.length}项)`} color={C.green}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {reportContent.lowRiskItems.map((item, i) => (
                  <span key={i} style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 16, fontSize: 13 }}>{item}</span>
                ))}
              </div>
            </Section>
          )}

          {/* 趋势预警 */}
          {reportContent && reportContent.trendWarnings?.length > 0 && (
            <Section title="趋势预警">
              {reportContent.trendWarnings.map((w, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < reportContent.trendWarnings.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ color: w.level === '🔴' ? C.red : C.yellow, marginRight: 8 }}>⚠️</span>
                  <strong>{w.label}</strong>：{w.detail}
                  {w.consequence && <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>建议：{w.consequence}</div>}
                </div>
              ))}
            </Section>
          )}

          {/* 行业基准对比 */}
          {reportContent?.industryBenchmarks && reportContent.industryBenchmarks.items?.length > 0 && (
            <Section title="行业基准对比">
              {reportContent.industryBenchmarks?.industry && (
                <div style={{ fontSize: 13, color: C.gray, marginBottom: 12 }}>
                  行业：{reportContent.industryBenchmarks.industry || basicInfo?.industry}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ textAlign: 'center', padding: 8, borderBottom: `2px solid ${C.border}` }}>指标</th>
                    <th style={{ textAlign: 'center', padding: 8, borderBottom: `2px solid ${C.border}` }}>行业基准范围</th>
                    <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>企业实际值</th>
                    <th style={{ textAlign: 'center', padding: 8, borderBottom: `2px solid ${C.border}` }}>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {reportContent.industryBenchmarks.items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: 'center', padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.name}</td>
                      <td style={{ textAlign: 'center', padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.benchmarkMin}% ~ {item.benchmarkMax}%</td>
                      <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{item.actual?.toFixed(2)}%</td>
                      <td style={{ textAlign: 'center', padding: 8, borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: item.status === 'below' ? '#fef3c7' : item.status === 'above' ? '#fef3c7' : '#dcfce7', color: item.status === 'below' ? '#d97706' : item.status === 'above' ? '#d97706' : '#16a34a' }}>
                          {item.status === 'below' ? '偏低' : item.status === 'above' ? '偏高' : '正常'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 交叉验证 */}
          {reportContent && reportContent.crossValidation?.length > 0 && (
            <Section title="交叉验证">
              {reportContent.crossValidation.map((c, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: i < reportContent.crossValidation.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', gap: 8 }}>
                  <span style={{ color: c.level === '🔴' ? C.red : C.yellow }}>{c.level === '🔴' ? '🔴' : '🟡'}</span>
                  <span><strong>{c.rule || c.name}</strong>：{c.detail}</span>
                </div>
              ))}
            </Section>
          )}

          {/* 财务指标对比 */}
          {reportContent && reportContent.financialIndicators?.length > 0 && (
            <Section title="财务指标对比">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ textAlign: 'center', padding: 8, borderBottom: `2px solid ${C.border}` }}>期间</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>毛利率</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>净利率</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>增值税税负率</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>所得税贡献率</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: `2px solid ${C.border}` }}>资产负债率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportContent.financialIndicators.map((ind, i) => (
                      <tr key={i} style={{ background: i === 0 ? '#eff6ff' : 'transparent' }}>
                        <td style={{ textAlign: 'center', padding: 8, borderBottom: `1px solid ${C.border}`, fontWeight: i === 0 ? 600 : 400 }}>{ind.period}</td>
                        <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{ind.grossMargin?.toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{ind.netMargin?.toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{ind.vatRate?.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{ind.citRate?.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right', padding: 8, borderBottom: `1px solid ${C.border}` }}>{ind.liabilityRatio?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* 底部 */}
          <div style={{ marginTop: 32, padding: '16px', background: '#f9fafb', borderRadius: 8, fontSize: 12, color: C.gray, textAlign: 'center' }}>
            免责声明：本报告仅供参考，不构成任何投资或决策建议。最终结果以专业财税顾问确认为准。<br />
            由慧根堂财税联盟提供技术支持
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: color || '#1f2937', borderBottom: `2px solid ${color || '#2563eb'}`, paddingBottom: 8, marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>{children}</div>
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 8, background: '#f9fafb', borderRadius: 6 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function RiskBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 28, fontWeight: 700, color }}>{count}</span>
      <span style={{ color: '#6b7280' }}>{label}</span>
    </div>
  )
}
