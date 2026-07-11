'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const ADMIN_TOKEN_KEY = 'hgttax_admin_token';

interface RiskItem {
  name: string;
  source?: string;
  module?: string;
  moduleName?: string;
  level: string;
  impact?: string;
  consequence?: string;
  taxPolicy?: string;
}

interface BenchmarkItem {
  name: string;
  unit: string;
  benchmarkMin: number;
  benchmarkMax: number;
  actual: number;
  status: string;
}

interface CrossValidationItem {
  rule: string;
  level: string;
  levelIcon?: string;
  detail: string;
  consequence?: string;
  taxPolicy?: string;
}

interface ReportDetail {
  basicInfo: {
    enterpriseName: string;
    creditCode: string;
    industry: string;
    revenueScale?: string;
    contactPerson?: string;
    contactPhone?: string;
    period?: string;
  };
  riskLevel: string;
  riskCounts: {
    red: number;
    yellow: number;
    green: number;
  };
  reportStatus: string;
  mainRiskAreas?: string[];
  reportContent?: {
    overview?: {
      riskId: string;
      period: string;
      level: string;
      levelIcon: string;
      redCount: number;
      yellowCount: number;
      greenCount: number;
    };
    highRiskItems?: RiskItem[];
    mediumRiskItems?: RiskItem[];
    lowRiskItems?: string[];
    crossValidation?: CrossValidationItem[];
    industryBenchmarks?: {
      industry: string;
      items: BenchmarkItem[];
    };
    financialIndicators?: any;
  };
  financialMetrics?: {
    period: string;
    revenue: number;
    cost: number;
    vatPaid: number;
    incomeTaxPaid: number;
    totalAssets: number;
    totalLiabilities: number;
    grossMargin: number;
    vatRate: number;
    citRate: number;
    debtRatio: number;
  };
  createdAt?: string;
  isAdmin?: boolean;
}

export default function AdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const riskId = params.id as string;
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // 检查登录状态并获取数据
  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('admin_token');
    
    const adminToken = urlToken || token;
    
    if (urlToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, urlToken);
    }
    
    if (adminToken) {
      setIsLoggedIn(true);
      fetchReport(adminToken);
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, [riskId]);

  // 获取报告详情
  const fetchReport = async (token: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/risk-report?riskId=${riskId}&admin_token=${token}`);
      const data = await res.json();
      
      if (res.status === 403) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setIsLoggedIn(false);
        setError('管理员密钥无效');
      } else if (data.error) {
        setError(data.error);
      } else {
        setReport(data);
      }
    } catch (err) {
      setError('获取报告失败，请稍后重试');
      console.error('Fetch report error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 下载报告
  const downloadReport = () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    window.open(`/api/download-report?riskId=${riskId}&admin_token=${token}`, '_blank');
  };

  // 返回列表
  const goBack = () => {
    router.push('/admin');
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (level: string) => {
    if (level.includes('高') || level.includes('红')) return '#DC2626';
    if (level.includes('中')) return '#F59E0B';
    return '#10B981';
  };

  const getRiskLevelBg = (level: string) => {
    if (level.includes('高') || level.includes('红')) return '#FEE2E2';
    if (level.includes('中')) return '#FEF3C7';
    return '#D1FAE5';
  };

  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ color: '#1F2937', marginBottom: '12px' }}>请先登录管理后台</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>
            您需要先登录管理后台才能查看报告详情
          </p>
          <button
            onClick={() => router.push('/admin')}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            前往登录
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F3F4F6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ color: '#6B7280', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F3F4F6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#1F2937', marginBottom: '12px' }}>获取报告失败</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>{error || '报告不存在'}</p>
          <button
            onClick={goBack}
            style={{
              padding: '10px 24px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  const { basicInfo, riskLevel, riskCounts, reportStatus, reportContent, financialMetrics, createdAt } = report;
  const highRiskItems = reportContent?.highRiskItems || [];
  const mediumRiskItems = reportContent?.mediumRiskItems || [];
  const lowRiskItems = reportContent?.lowRiskItems || [];
  const crossValidation = reportContent?.crossValidation || [];
  const industryBenchmarks = reportContent?.industryBenchmarks;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F3F4F6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 顶部导航 */}
      <div style={{
        background: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={goBack}
              style={{
                padding: '8px 16px',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#4B5563',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ← 返回列表
            </button>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              报告详情 - {basicInfo.enterpriseName || '未命名企业'}
            </h1>
          </div>
          <button
            onClick={downloadReport}
            style={{
              padding: '10px 20px',
              background: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📥 导出Word报告
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* 基本信息卡片 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 600, color: '#1F2937', margin: '0 0 16px 0' }}>
                {basicInfo.enterpriseName || '未命名企业'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: '#6B7280' }}>统一信用代码：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.creditCode || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>所属行业：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.industry || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>年营收规模：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.revenueScale || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>检测ID：</span>
                  <span style={{ color: '#374151', fontFamily: 'monospace' }}>{riskId}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>联系人：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.contactPerson || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>联系电话：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.contactPhone || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>所属期：</span>
                  <span style={{ color: '#374151' }}>{basicInfo.period || '-'}</span>
                </div>
                <div>
                  <span style={{ color: '#6B7280' }}>提交时间：</span>
                  <span style={{ color: '#374151' }}>{createdAt || '-'}</span>
                </div>
              </div>
            </div>
            
            {/* 风险等级展示 */}
            <div style={{
              textAlign: 'center',
              padding: '20px 32px',
              borderRadius: '12px',
              background: getRiskLevelBg(riskLevel),
              minWidth: '180px'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>综合风险等级</div>
              <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: getRiskLevelColor(riskLevel),
                marginBottom: '8px'
              }}>
                {riskLevel || '评估中'}
              </div>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: '9999px',
                fontSize: '12px',
                color: '#4B5563'
              }}>
                状态：{reportStatus}
              </div>
            </div>
          </div>
        </div>

        {/* 风险概览卡片 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1F2937', margin: '0 0 16px 0' }}>
            风险概览
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{
              padding: '20px',
              borderRadius: '10px',
              background: '#FEE2E2',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#DC2626' }}>{riskCounts.red}</div>
              <div style={{ fontSize: '14px', color: '#991B1B', marginTop: '4px' }}>🔴 高风险项</div>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '10px',
              background: '#FEF3C7',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#D97706' }}>{riskCounts.yellow}</div>
              <div style={{ fontSize: '14px', color: '#92400E', marginTop: '4px' }}>🟡 中风险项</div>
            </div>
            <div style={{
              padding: '20px',
              borderRadius: '10px',
              background: '#D1FAE5',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: '#059669' }}>{riskCounts.green}</div>
              <div style={{ fontSize: '14px', color: '#065F46', marginTop: '4px' }}>🟢 低风险项</div>
            </div>
          </div>
        </div>

        {/* 标签切换 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #E5E7EB',
            padding: '0 24px'
          }}>
            {[
              { key: 'overview', label: '📋 详细风险分析' },
              { key: 'financial', label: '📊 财务指标分析' },
              { key: 'cross', label: '🔍 交叉验证结果' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: activeTab === tab.key ? '#3B82F6' : '#6B7280',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid #3B82F6' : '2px solid transparent',
                  marginBottom: '-1px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px' }}>
            {/* 详细风险分析 */}
            {activeTab === 'overview' && (
              <div>
                {/* 高风险项 */}
                {highRiskItems.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#DC2626',
                      margin: '0 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🔴 高风险项 ({highRiskItems.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {highRiskItems.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: '#FEF2F2',
                          border: '1px solid #FECACA'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#991B1B',
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>{item.name}</span>
                            {item.moduleName && (
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 'normal',
                                padding: '2px 8px',
                                background: '#FECACA',
                                borderRadius: '4px',
                                color: '#991B1B'
                              }}>
                                {item.moduleName}
                              </span>
                            )}
                          </div>
                          {item.consequence && (
                            <div style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: 1.6 }}>
                              {item.consequence}
                            </div>
                          )}
                          {item.taxPolicy && (
                            <div style={{
                              fontSize: '12px',
                              color: '#B91C1C',
                              marginTop: '8px',
                              fontStyle: 'italic'
                            }}>
                              政策依据：{item.taxPolicy}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 中风险项 */}
                {mediumRiskItems.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#D97706',
                      margin: '0 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🟡 中风险项 ({mediumRiskItems.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {mediumRiskItems.map((item, idx) => (
                        <div key={idx} style={{
                          padding: '14px 16px',
                          borderRadius: '8px',
                          background: '#FFFBEB',
                          border: '1px solid #FDE68A'
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#92400E',
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}>
                            <span>{item.name}</span>
                            {item.moduleName && (
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 'normal',
                                padding: '2px 8px',
                                background: '#FDE68A',
                                borderRadius: '4px',
                                color: '#92400E'
                              }}>
                                {item.moduleName}
                              </span>
                            )}
                          </div>
                          {item.consequence && (
                            <div style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.5 }}>
                              {item.consequence}
                            </div>
                          )}
                          {item.taxPolicy && (
                            <div style={{
                              fontSize: '12px',
                              color: '#B45309',
                              marginTop: '6px',
                              fontStyle: 'italic'
                            }}>
                              政策依据：{item.taxPolicy}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 低风险项 */}
                {lowRiskItems.length > 0 && (
                  <div>
                    <h4 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#059669',
                      margin: '0 0 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      🟢 合规项 ({lowRiskItems.length})
                    </h4>
                    <div style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0'
                    }}>
                      <div style={{
                        fontSize: '13px',
                        color: '#065F46',
                        lineHeight: 2
                      }}>
                        {lowRiskItems.join('、')}
                      </div>
                    </div>
                  </div>
                )}

                {highRiskItems.length === 0 && mediumRiskItems.length === 0 && lowRiskItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    暂无风险项数据
                  </div>
                )}
              </div>
            )}

            {/* 财务指标分析 */}
            {activeTab === 'financial' && (
              <div>
                {financialMetrics ? (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: '0 0 12px 0' }}>
                        基本财务数据
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>营业收入</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.revenue?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>营业成本</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.cost?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>实缴增值税</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.vatPaid?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>实缴所得税</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.incomeTaxPaid?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>总资产</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.totalAssets?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                        <div style={{ padding: '16px', background: '#F9FAFB', borderRadius: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#6B7280' }}>总负债</div>
                          <div style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', marginTop: '4px' }}>
                            {financialMetrics.totalLiabilities?.toFixed(2) || 0} 万元
                          </div>
                        </div>
                      </div>
                    </div>

                    {industryBenchmarks && industryBenchmarks.items && (
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1F2937', margin: '0 0 12px 0' }}>
                          行业基准对比（{industryBenchmarks.industry}）
                        </h4>
                        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#F9FAFB' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>指标名称</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>企业数值</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>行业正常范围</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>评估结果</th>
                              </tr>
                            </thead>
                            <tbody>
                              {industryBenchmarks.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                                  <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{item.name}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
                                    {item.actual}{item.unit}
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                                    {item.benchmarkMin}{item.unit} ~ {item.benchmarkMax}{item.unit}
                                  </td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: '9999px',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      background: item.status === 'normal' ? '#D1FAE5' : item.status === 'above' ? '#FEF3C7' : '#FEE2E2',
                                      color: item.status === 'normal' ? '#059669' : item.status === 'above' ? '#D97706' : '#DC2626'
                                    }}>
                                      {item.status === 'normal' ? '正常' : item.status === 'above' ? '偏高' : '偏低'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                    暂无财务数据
                  </div>
                )}
              </div>
            )}

            {/* 交叉验证结果 */}
            {activeTab === 'cross' && (
              <div>
                {crossValidation.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {crossValidation.map((item, idx) => {
                      const isHigh = item.level === 'high' || item.levelIcon?.includes('🔴');
                      return (
                        <div key={idx} style={{
                          padding: '16px',
                          borderRadius: '8px',
                          background: isHigh ? '#FEF2F2' : '#FFFBEB',
                          border: `1px solid ${isHigh ? '#FECACA' : '#FDE68A'}`
                        }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: isHigh ? '#991B1B' : '#92400E',
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span>{isHigh ? '🔴' : '🟡'}</span>
                            <span>{item.rule}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: isHigh ? '#7F1D1D' : '#78350F', lineHeight: 1.6 }}>
                            {item.detail}
                          </div>
                          {item.consequence && (
                            <div style={{ fontSize: '13px', color: isHigh ? '#991B1B' : '#92400E', marginTop: '8px' }}>
                              <strong>风险影响：</strong>{item.consequence}
                            </div>
                          )}
                          {item.taxPolicy && (
                            <div style={{
                              fontSize: '12px',
                              color: isHigh ? '#B91C1C' : '#B45309',
                              marginTop: '6px',
                              fontStyle: 'italic'
                            }}>
                              政策依据：{item.taxPolicy}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    background: '#ECFDF5',
                    borderRadius: '8px',
                    border: '1px solid #A7F3D0'
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#065F46' }}>
                      各项指标交叉验证未发现明显异常
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
