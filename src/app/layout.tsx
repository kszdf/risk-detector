import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '税智云 · 财税风险检测',
  description: '基于20年财税实战经验，20道题快速识别企业税务风险',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
