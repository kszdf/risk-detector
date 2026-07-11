'use client';

import { useState, useEffect } from 'react';

interface ReportItem {
  id: string;
  riskId: string;
  enterpriseName: string;
  creditCode: string;
  industry: string;
  riskLevel: string;
  reportStatus: string;
  submitTime: string;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

interface ListResponse {
  success: boolean;
  data: {
    list: ReportItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    pageToken: string;
  };
  error?: string;
}

const ADMIN_TOKEN_KEY = 'hgttax_admin_token';

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [list, setList] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pageTokens, setPageTokens] = useState<string[]>(['']);

  // 检查登录状态
  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('admin_token');
    
    if (urlToken) {
      localStorage.setItem(ADMIN_TOKEN_KEY, urlToken);
      setIsLoggedIn(true);
    } else if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // 获取列表数据
  const fetchList = async (pageNum: number, searchKeyword: string = keyword) => {
    setLoading(true);
    try {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
      const pageToken = pageTokens[pageNum - 1] || '';
      
      const params = new URLSearchParams({
        admin_token: token,
        page: String(pageNum),
        pageSize: String(pageSize),
        page_token: pageToken
      });
      
      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }

      const res = await fetch(`/api/admin/list?${params.toString()}`);
      const data: ListResponse = await res.json();

      if (data.success) {
        setList(data.data.list);
        setTotal(data.data.total);
        setHasMore(data.data.hasMore);
        setPage(pageNum);
        
        // 保存下一页的page_token
        if (data.data.hasMore && data.data.pageToken) {
          setPageTokens(prev => {
            const newTokens = [...prev];
            newTokens[pageNum] = data.data.pageToken;
            return newTokens;
          });
        }
      } else {
        if (res.status === 403) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setIsLoggedIn(false);
        }
      }
    } catch (error) {
      console.error('Fetch list error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 登录后加载数据
  useEffect(() => {
    if (isLoggedIn) {
      fetchList(1, '');
    }
  }, [isLoggedIn]);

  // 登录处理
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput === 'hgttax_admin_2026') {
      localStorage.setItem(ADMIN_TOKEN_KEY, tokenInput);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('管理员密钥错误');
    }
  };

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPageTokens(['']);
    fetchList(1, searchInput);
  };

  // 查看详情
  const viewDetail = (riskId: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    window.location.href = `/admin/${riskId}?admin_token=${token}`;
  };

  // 下载报告
  const downloadReport = (riskId: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    window.open(`/api/download-report?riskId=${riskId}&admin_token=${token}`, '_blank');
  };

  // 登出
  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsLoggedIn(false);
    setList([]);
  };

  // 获取风险等级颜色
  const getRiskLevelStyle = (level: string) => {
    if (level.includes('高') || level.includes('红')) {
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    } else if (level.includes('中') || level.includes('黄')) {
      return { backgroundColor: '#FEF3C7', color: '#D97706' };
    } else {
      return { backgroundColor: '#D1FAE5', color: '#059669' };
    }
  };

  // 获取报告状态颜色
  const getStatusStyle = (status: string) => {
    if (status === '已审核' || status === '已发送') {
      return { backgroundColor: '#D1FAE5', color: '#059669' };
    } else if (status === '待审核') {
      return { backgroundColor: '#FEF3C7', color: '#D97706' };
    } else if (status === '需补充') {
      return { backgroundColor: '#FEE2E2', color: '#DC2626' };
    }
    return { backgroundColor: '#E5E7EB', color: '#6B7280' };
  };

  // 登录页面
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
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              财税风险检测管理后台
            </h1>
            <p style={{ color: '#6B7280', marginTop: '8px', fontSize: '14px' }}>
              请输入管理员密钥登录
            </p>
          </div>
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="请输入管理员密钥"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                }}
              />
            </div>
            
            {loginError && (
              <div style={{
                color: '#DC2626',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 管理后台主页面
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
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📊</span>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 }}>
              财税风险检测管理后台
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#4B5563',
              cursor: 'pointer'
            }}
          >
            退出登录
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* 搜索栏 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="输入企业名称搜索..."
                style={{
                  flex: 1,
                  maxWidth: '400px',
                  padding: '10px 14px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 24px',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                🔍 搜索
              </button>
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setKeyword('');
                    setPageTokens(['']);
                    fetchList(1, '');
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#4B5563',
                    cursor: 'pointer'
                  }}
                >
                  清除
                </button>
              )}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              共 <span style={{ fontWeight: 600, color: '#1F2937' }}>{total}</span> 条记录
            </div>
          </form>
        </div>

        {/* 数据表格 */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB',
                    width: '60px'
                  }}>
                    序号
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    检测ID
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    企业名称
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB',
                    width: '100px'
                  }}>
                    风险等级
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB',
                    width: '100px'
                  }}>
                    报告状态
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB',
                    width: '160px'
                  }}>
                    提交时间
                  </th>
                  <th style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#6B7280',
                    borderBottom: '1px solid #E5E7EB',
                    width: '160px'
                  }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: '#9CA3AF'
                    }}>
                      加载中...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: '#9CA3AF'
                    }}>
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  list.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        color: '#6B7280'
                      }}>
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: '#6B7280',
                        fontFamily: 'monospace'
                      }}>
                        {item.riskId}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        color: '#1F2937',
                        fontWeight: 500
                      }}>
                        {item.enterpriseName || '-'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 500,
                          ...getRiskLevelStyle(item.riskLevel)
                        }}>
                          {item.riskLevel || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          ...getStatusStyle(item.reportStatus)
                        }}>
                          {item.reportStatus}
                        </span>
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        fontSize: '13px',
                        color: '#6B7280'
                      }}>
                        {item.submitTime || '-'}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        textAlign: 'center'
                      }}>
                        <button
                          onClick={() => viewDetail(item.riskId)}
                          style={{
                            padding: '6px 12px',
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            marginRight: '8px'
                          }}
                        >
                          查看详情
                        </button>
                        <button
                          onClick={() => downloadReport(item.riskId)}
                          style={{
                            padding: '6px 12px',
                            background: '#ECFDF5',
                            color: '#059669',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          下载报告
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {list.length > 0 && (
            <div style={{
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #E5E7EB',
              background: '#FAFAFA'
            }}>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                第 {page} 页，共 {total} 条
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={page === 1 || loading}
                  onClick={() => fetchList(page - 1)}
                  style={{
                    padding: '8px 16px',
                    background: page === 1 || loading ? '#F3F4F6' : 'white',
                    color: page === 1 || loading ? '#9CA3AF' : '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: page === 1 || loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  上一页
                </button>
                <button
                  disabled={!hasMore || loading}
                  onClick={() => fetchList(page + 1)}
                  style={{
                    padding: '8px 16px',
                    background: !hasMore || loading ? '#F3F4F6' : 'white',
                    color: !hasMore || loading ? '#9CA3AF' : '#374151',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: !hasMore || loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
