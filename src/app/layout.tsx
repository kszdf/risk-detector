import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '财税短视频获客系统工作台',
    template: '%s | 财税获客系统',
  },
  description: '专为财税行业打造的高端短视频获客工作台，集成选题生成、脚本生成、视频生产、数据监控、私域运营五大核心功能。',
  keywords: ['财税', '短视频', '获客', '小红书', '抖音', '视频脚本', '私域运营'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
