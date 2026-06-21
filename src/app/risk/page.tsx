import RiskDetectionModule from '@/components/RiskDetectionModule';

export default function StandaloneRiskPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 顶部标题 */}
      <div className="pt-8 pb-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          税智云 · 财税风险智能检测
        </h1>
        <p className="text-slate-400 text-sm">
          6分钟完成 · 基于《智控征管》预警模型
        </p>
      </div>

      {/* 风险检测表单 */}
      <div className="px-4 pb-8">
        <RiskDetectionModule standalone={true} />
      </div>

      {/* 底部版权 */}
      <div className="py-6 text-center border-t border-slate-700/50">
        <p className="text-slate-500 text-sm">
          由{' '}
          <a
            href="https://pq3s843fph.coze.site"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            税智云
          </a>
          {' '}提供技术支持
        </p>
      </div>
    </div>
  );
}
