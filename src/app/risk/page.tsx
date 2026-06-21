import dynamic from 'next/dynamic';

const RiskV4Module = dynamic(() => import('@/components/RiskV4Module'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-[#666666]">加载中...</div>
    </div>
  )
});

export default function RiskPage() {
  return <RiskV4Module compact={true} />;
}
