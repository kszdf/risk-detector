'use client'
import dynamic from 'next/dynamic'
const ReportModule = dynamic(() => import('@/components/ReportModule'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#666', fontFamily: 'system-ui, sans-serif' }}>
      加载中...
    </div>
  )
})
export default function ReportPage() {
  return <ReportModule />
}
