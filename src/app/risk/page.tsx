'use client';

import dynamic from 'next/dynamic';

const RiskV4Module = dynamic(
  () => import('@/components/RiskV4Module'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        color: '#666',
        fontSize: '16px'
      }}>
        加载中...
      </div>
    )
  }
);

export default function RiskPage() {
  return <RiskV4Module />;
}
