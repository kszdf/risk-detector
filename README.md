# 税智云 · 财税风险检测 API 服务

基于 Next.js 14 + 飞书多维表的财税风险检测后端服务。

## 功能

- ✅ 20题三档风险检测（5大维度）
- ✅ 财务数据交叉验证
- ✅ 行业基准对比
- ✅ 飞书多维表数据存储
- ✅ 飞书机器人消息通知
- ✅ 企业工商信息查询

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/risk-v4-submit` | POST | 提交风险检测 |
| `/api/risk-report` | GET | 获取检测报告（riskId 查询） |
| `/api/company-info` | GET | 企业工商信息查询 |

## 环境变量

复制 `.env.example` 为 `.env.local`，填入飞书配置：

```env
FEISHU_APP_ID=飞书机器人AppID
FEISHU_APP_SECRET=飞书机器人AppSecret
FEISHU_BASE_TOKEN=飞书多维表BaseToken
FEISHU_TABLE_ID=飞书多维表TableID
```

## 本地运行

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## Vercel 一键部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入仓库
3. 配置环境变量
4. 点击 Deploy
