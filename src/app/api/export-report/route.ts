import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, HeadingLevel,
  ImageRun
} from 'docx';
import fs from 'fs';
import path from 'path';

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'Z006bk7yuaxWalsdqoeck3mBnTb';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblYYxtHDeBAx15j';

// 管理员密钥
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hgttax_admin_2026';

// 风险等级颜色配置
const RISK_COLORS = {
  low: { bg: 'D4EDDA', text: '155724', name: '低风险' },
  medium: { bg: 'FFF3CD', text: '856404', name: '中风险' },
  mediumHigh: { bg: 'FFE5B4', text: 'B35A00', name: '中高风险' },
  high: { bg: 'F8D7DA', text: '721C24', name: '高风险' },
  critical: { bg: 'E7C6FF', text: '5A189A', name: '极高风险' }
};

// 模块名称映射
const MODULE_NAMES: Record<string, string> = {
  taxCompliance: '申报与纳税合规',
  invoice: '发票管理',
  revenue: '收入与成本',
  expense: '费用与利润',
  structure: '架构与关联交易'
};

// 获取飞书token
async function getFeishuToken(): Promise<string | null> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const data = await res.json();
  return data.tenant_access_token || null;
}

// 提取飞书字段值
function extractFieldValue(field: unknown): unknown {
  if (field === null || field === undefined) return undefined;
  if (typeof field === 'string') return field;
  if (typeof field === 'number' || typeof field === 'boolean') return field;
  if (Array.isArray(field)) {
    return field.map(item => {
      if (typeof item === 'object' && item !== null && 'text' in item) {
        return (item as { text: string }).text;
      }
      return item;
    }).join('');
  }
  return String(field);
}

function extractFeishuText(field: unknown): string {
  const value = extractFieldValue(field);
  if (value === undefined || value === null) return '';
  return String(value);
}

function extractFeishuNumber(field: unknown): number {
  const value = extractFieldValue(field);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function extractJsonField(field: unknown): any {
  const raw = extractFeishuText(field);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// 根据综合得分获取风险等级
function getRiskLevel(score: number): { level: string; color: typeof RISK_COLORS.low } {
  if (score >= 80) return { level: 'low', color: RISK_COLORS.low };
  if (score >= 60) return { level: 'medium', color: RISK_COLORS.medium };
  if (score >= 40) return { level: 'mediumHigh', color: RISK_COLORS.mediumHigh };
  if (score >= 20) return { level: 'high', color: RISK_COLORS.high };
  return { level: 'critical', color: RISK_COLORS.critical };
}

// 创建标题段落
function createTitle(text: string, size: number = 32, color: string = '1a56db'): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text, bold: true, size: size, color: color })]
  });
}

// 创建一级标题
function createHeading1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a56db', space: 4 }
    },
    children: [new TextRun({ text, bold: true, size: 28, color: '1a56db' })]
  });
}

// 创建二级标题
function createHeading2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 24, color: '2b6cb0' })]
  });
}

// 创建普通段落
function createParagraph(text: string, options: { bold?: boolean; color?: string; size?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text,
      bold: options.bold || false,
      color: options.color || '333333',
      size: options.size || 21
    })]
  });
}

// 创建带标签的信息行
function createInfoRow(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label + '：', bold: true, size: 21, color: '555555' }),
      new TextRun({ text: value || '-', size: 21, color: '333333' })
    ]
  });
}

// 创建表头单元格
function createHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '1a56db' },
    width: { size: 25, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'ffffff', size: 21 })]
    })]
  });
}

// 创建数据单元格
function createDataCell(text: string, options: { align?: 'center' | 'left' | 'right'; color?: string; bold?: boolean; bgColor?: string } = {}): TableCell {
  const align = options.align === 'center' ? AlignmentType.CENTER :
                options.align === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT;
  return new TableCell({
    ...(options.bgColor ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: options.bgColor } } : {}),
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({
        text: text || '-',
        size: 20,
        color: options.color || '333333',
        bold: options.bold || false
      })]
    })]
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const riskId = searchParams.get('riskId');
    const adminToken = searchParams.get('admin_token');

    if (!riskId) {
      return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
    }

    // 验证管理员密钥
    if (adminToken !== ADMIN_TOKEN) {
      return NextResponse.json({ error: '管理员密钥无效' }, { status: 403 });
    }

    // 从飞书获取报告数据
    const token = await getFeishuToken();
    if (!token) {
      return NextResponse.json({ error: '获取飞书token失败' }, { status: 500 });
    }

    // 查询飞书记录
    const queryRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          conjunction: 'and',
          conditions: [{ field_name: '检测ID', operator: 'is', value: [riskId] }]
        },
        page_size: 1
      })
    });

    const queryData = await queryRes.json();
    if (!queryData.data?.items || queryData.data.items.length === 0) {
      return NextResponse.json({ error: '未找到该检测报告' }, { status: 404 });
    }

    const record = queryData.data.items[0].fields;

    // 提取数据
    const companyName = extractFeishuText(record['企业名称']);
    const creditCode = extractFeishuText(record['统一信用代码']);
    const contact = extractFeishuText(record['联系人']);
    const phone = extractFeishuText(record['联系电话']);
    const industry = extractFeishuText(record['所属行业']);
    const revenueScale = extractFeishuText(record['年营收规模']);
    const period = extractFeishuText(record['所属期']);
    const testTime = extractFeishuText(record['检测时间']);

    const revenue = extractFeishuNumber(record['营业收入(万元)']);
    const cost = extractFeishuNumber(record['营业成本(万元)']);
    const grossMargin = extractFeishuNumber(record['毛利率']);
    const vatPaid = extractFeishuNumber(record['实缴增值税(万元)']);
    const vatRate = extractFeishuNumber(record['增值税税负率']);
    const citPaid = extractFeishuNumber(record['实缴所得税(万元)']);
    const citRate = extractFeishuNumber(record['所得税贡献率']);
    const totalAssets = extractFeishuNumber(record['总资产(万元)']);
    const totalLiabilities = extractFeishuNumber(record['总负债(万元)']);
    const debtRatio = extractFeishuNumber(record['资产负债率']);

    const totalScore = extractFeishuNumber(record['综合得分']);
    const riskLevel = extractFeishuText(record['综合风险等级']);
    const lowCount = extractFeishuNumber(record['低风险项数']);
    const mediumCount = extractFeishuNumber(record['中风险项数']);
    const highCount = extractFeishuNumber(record['高风险项数']);

    const riskDetails = extractJsonField(record['风险项明细']);
    const reportContent = extractJsonField(record['报告内容']);
    const financialIndicators = extractJsonField(record['财务指标']);
    const crossValidation = extractJsonField(record['交叉验证结果']);
    const businessInfo = extractJsonField(record['工商信息']);

    const { color: riskColor } = getRiskLevel(totalScore);

    // 读取LOGO图片
    let logoImageBuffer: Buffer | null = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
      if (fs.existsSync(logoPath)) {
        logoImageBuffer = fs.readFileSync(logoPath);
      }
    } catch (e) {
      // LOGO读取失败不影响报告生成
    }

    // 构建Word文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [
          // ========== 封面 ==========
          // LOGO
          ...(logoImageBuffer ? [new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            children: [new ImageRun({
              data: logoImageBuffer,
              transformation: { width: 150, height: 150 },
              type: 'jpg'
            })]
          })] : []),

          createTitle('财税风险检测报告', 44, '1a56db'),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'Tax Risk Assessment Report', size: 20, color: '718096', italics: true })]
          }),
          new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [new TextRun({ text: companyName || '__________', bold: true, size: 32, color: '2d3748' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: `统一信用代码：${creditCode || '__________'}`, size: 21, color: '555555' })]
          }),
          new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }),

          // 综合得分展示
          new Table({
            width: { size: 60, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.CENTER,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: riskColor.bg },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '综合得分', bold: true, size: 21, color: riskColor.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: totalScore.toFixed(1), bold: true, size: 48, color: riskColor.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F7FAFC' },
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险等级', bold: true, size: 21, color: '555555' })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: riskLevel || '评估中', bold: true, size: 32, color: riskColor.text })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `检测日期：${testTime || new Date().toLocaleDateString('zh-CN')}`, size: 20, color: '888888' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '慧根堂财税风险咨询 · 专业财税风控服务', size: 18, color: 'aaaaaa' })]
          }),

          // ========== 一、企业基本信息 ==========
          createHeading1('一、企业基本信息'),
          createInfoRow('企业名称', companyName),
          createInfoRow('统一信用代码', creditCode),
          createInfoRow('所属行业', industry),
          createInfoRow('年营收规模', revenueScale),
          createInfoRow('所属期', period),
          createInfoRow('联系人', contact),
          createInfoRow('联系电话', phone),

          // 工商信息（如果有）
          ...(businessInfo && (businessInfo.status || businessInfo.name) ? [
            createHeading2('工商登记信息'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createHeaderCell('登记状态'),
                    createDataCell(businessInfo.status || '-', { align: 'center' }),
                    createHeaderCell('成立日期'),
                    createDataCell(businessInfo.startDate || '-', { align: 'center' })
                  ]
                }),
                new TableRow({
                  children: [
                    createHeaderCell('注册资本'),
                    createDataCell(businessInfo.registCapi || '-', { align: 'center' }),
                    createHeaderCell('法定代表人'),
                    createDataCell(businessInfo.operName || '-', { align: 'center' })
                  ]
                }),
                new TableRow({
                  children: [
                    createHeaderCell('企业类型'),
                    createDataCell(businessInfo.econKind || '-', { align: 'center' }),
                    createHeaderCell('所属地区'),
                    createDataCell(businessInfo.province || '-', { align: 'center' })
                  ]
                }),
                new TableRow({
                  children: [
                    createHeaderCell('注册地址'),
                    new TableCell({
                      columnSpan: 3,
                      children: [new Paragraph({
                        children: [new TextRun({ text: businessInfo.address || '-', size: 20 })]
                      })]
                    })
                  ]
                }),
                new TableRow({
                  children: [
                    createHeaderCell('经营范围'),
                    new TableCell({
                      columnSpan: 3,
                      children: [new Paragraph({
                        children: [new TextRun({ text: businessInfo.scope || '-', size: 19, color: '555555' })]
                      })]
                    })
                  ]
                })
              ]
            })
          ] : []),

          // ========== 二、风险概览 ==========
          createHeading1('二、风险概览'),
          createParagraph('本次检测从申报合规、发票管理、收入成本、费用利润、架构关联五大维度，对企业财税风险进行全面评估。'),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          // 风险统计概览表
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.low.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '低风险', bold: true, size: 22, color: RISK_COLORS.low.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(lowCount || 0), bold: true, size: 36, color: RISK_COLORS.low.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.low.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.medium.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '中风险', bold: true, size: 22, color: RISK_COLORS.medium.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(mediumCount || 0), bold: true, size: 36, color: RISK_COLORS.medium.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.medium.text })]
                      })
                    ]
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: RISK_COLORS.high.bg },
                    width: { size: 33.33, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '高风险', bold: true, size: 22, color: RISK_COLORS.high.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: String(highCount || 0), bold: true, size: 36, color: RISK_COLORS.high.text })]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '项', size: 18, color: RISK_COLORS.high.text })]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          // ========== 三、详细风险分析 ==========
          createHeading1('三、详细风险分析'),

          // 高风险项
          ...(reportContent?.highRiskItems?.length ? [
            createHeading2('🔴 高风险项'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '721C24' },
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险项', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '721C24' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '所属维度', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '721C24' },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险影响与政策依据', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    })
                  ]
                }),
                ...reportContent.highRiskItems.map((item: any) => new TableRow({
                  children: [
                    createDataCell(item.name || '-', { bold: true, color: '721C24' }),
                    createDataCell(item.module || '-', { align: 'center' }),
                    createDataCell(item.consequence || item.impact || '-')
                  ]
                }))
              ]
            }),
            new Paragraph({ spacing: { after: 200 }, children: [] })
          ] : []),

          // 中风险项
          ...(reportContent?.mediumRiskItems?.length ? [
            createHeading2('🟡 中风险项'),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '856404' },
                      width: { size: 30, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险项', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '856404' },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '所属维度', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    }),
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, color: 'auto', fill: '856404' },
                      width: { size: 50, type: WidthType.PERCENTAGE },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: '风险影响与政策依据', bold: true, color: 'ffffff', size: 20 })]
                      })]
                    })
                  ]
                }),
                ...reportContent.mediumRiskItems.map((item: any) => new TableRow({
                  children: [
                    createDataCell(item.name || '-', { bold: true, color: '856404' }),
                    createDataCell(item.module || '-', { align: 'center' }),
                    createDataCell(item.consequence || item.impact || '-')
                  ]
                }))
              ]
            }),
            new Paragraph({ spacing: { after: 200 }, children: [] })
          ] : []),

          // 低风险项（简要列出）
          ...(reportContent?.lowRiskItems?.length ? [
            createHeading2('🟢 合规项（无风险）'),
            createParagraph(`共 ${reportContent.lowRiskItems.length} 项合规：${reportContent.lowRiskItems.join('、')}`)
          ] : []),

          // ========== 四、财务指标分析 ==========
          createHeading1('四、财务指标分析'),
          createParagraph('以下为企业核心财税指标，结合行业基准进行对比分析。'),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('指标名称'),
                  createHeaderCell('企业数值'),
                  createHeaderCell('行业正常范围'),
                  createHeaderCell('评估结果')
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('营业收入', { bold: true }),
                  createDataCell(revenue ? `${revenue.toFixed(2)} 万元` : '-', { align: 'center' }),
                  createDataCell('-', { align: 'center' }),
                  createDataCell('-', { align: 'center' })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('毛利率', { bold: true }),
                  createDataCell(grossMargin ? `${grossMargin.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.grossMarginBenchmark ? `${financialIndicators.grossMarginBenchmark.min}% - ${financialIndicators.grossMarginBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.grossMarginStatus || '-', {
                    align: 'center',
                    color: financialIndicators?.grossMarginStatus === '正常' ? '155724' :
                           financialIndicators?.grossMarginStatus === '偏低' ? '856404' :
                           financialIndicators?.grossMarginStatus === '偏高' ? 'B35A00' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('增值税税负率', { bold: true }),
                  createDataCell(vatRate ? `${vatRate.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.vatRateBenchmark ? `${financialIndicators.vatRateBenchmark.min}% - ${financialIndicators.vatRateBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.vatRateStatus || '-', {
                    align: 'center',
                    color: financialIndicators?.vatRateStatus === '正常' ? '155724' :
                           financialIndicators?.vatRateStatus === '偏低预警' ? '721C24' :
                           financialIndicators?.vatRateStatus === '偏高' ? 'B35A00' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('所得税贡献率', { bold: true }),
                  createDataCell(citRate ? `${citRate.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.citRateBenchmark ? `${financialIndicators.citRateBenchmark.min}% - ${financialIndicators.citRateBenchmark.max}%` : '-', { align: 'center' }),
                  createDataCell(financialIndicators?.citRateStatus || '-', {
                    align: 'center',
                    color: financialIndicators?.citRateStatus === '正常' ? '155724' :
                           financialIndicators?.citRateStatus === '偏低预警' ? '721C24' :
                           financialIndicators?.citRateStatus === '偏高' ? 'B35A00' : '333333'
                  })
                ]
              }),
              new TableRow({
                children: [
                  createDataCell('资产负债率', { bold: true }),
                  createDataCell(debtRatio ? `${debtRatio.toFixed(2)}%` : '-', { align: 'center' }),
                  createDataCell('30% - 60%', { align: 'center' }),
                  createDataCell(
                    debtRatio === 0 ? '-' :
                    debtRatio < 30 ? '偏低（保守）' :
                    debtRatio <= 60 ? '正常' : '偏高（风险）',
                    {
                      align: 'center',
                      color: debtRatio === 0 ? '333333' :
                             debtRatio < 30 ? '856404' :
                             debtRatio <= 60 ? '155724' : '721C24'
                    }
                  )
                ]
              })
            ]
          }),

          // ========== 五、交叉验证结果 ==========
          createHeading1('五、交叉验证结果'),

          reportContent?.crossValidation?.length ? (
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    createHeaderCell('验证项目'),
                    createHeaderCell('等级'),
                    createHeaderCell('详细说明')
                  ]
                }),
                ...reportContent.crossValidation.map((check: any) => new TableRow({
                  children: [
                    createDataCell(check.rule || '-', { bold: true }),
                    new TableCell({
                      shading: {
                        type: ShadingType.CLEAR,
                        color: 'auto',
                        fill: check.level === 'high' || check.levelIcon?.includes('🔴')
                          ? RISK_COLORS.high.bg
                          : RISK_COLORS.medium.bg
                      },
                      children: [new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({
                          text: check.level === 'high' || check.levelIcon?.includes('🔴') ? '高风险' : '中风险',
                          bold: true,
                          color: check.level === 'high' || check.levelIcon?.includes('🔴')
                            ? RISK_COLORS.high.text
                            : RISK_COLORS.medium.text,
                          size: 20
                        })]
                      })]
                    }),
                    createDataCell(check.detail || '-')
                  ]
                }))
              ]
            })
          ) : createParagraph('各项指标交叉验证未发现明显异常。'),

          // ========== 六、建议与说明 ==========
          createHeading1('六、建议与说明'),
          createParagraph('1. 本报告基于企业填写的问卷数据及公开工商信息进行风险评估，仅供参考。'),
          createParagraph('2. 高风险项目建议尽快开展专项自查，必要时寻求专业财税顾问的帮助。'),
          createParagraph('3. 中风险项目应纳入日常税务管理重点关注范围，定期复核。'),
          createParagraph('4. 低风险项目仍需保持合规意识，持续做好日常税务管理工作。'),
          createParagraph('5. 如需进一步的税务风险诊断和应对方案，请联系专业财税顾问。'),

          new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '慧根堂财税风险咨询', size: 20, color: '666666' })]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: '专业财税风控服务提供商', size: 18, color: '999999' })]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `${companyName || '企业'}_财税风险检测报告_${testTime || ''}.docx`.replace(/\s+/g, '_');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
}
