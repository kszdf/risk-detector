export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '3rem',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>税智云 · 财税风险检测</h1>
        <p style={{ opacity: 0.9, marginBottom: '2rem', lineHeight: 1.6 }}>
          基于 20 年财税实战经验，20 道题快速识别企业税务风险。
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '1rem 1.5rem', 
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            API 服务运行中
          </div>
          <div style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '1rem 1.5rem', 
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            飞书多维表已连接
          </div>
        </div>
      </div>
      <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.7 }}>
        © 慧根堂财税联盟 · 张老师财税工作室
      </p>
    </main>
  );
}
