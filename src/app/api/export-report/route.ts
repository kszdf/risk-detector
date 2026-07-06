import { NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType,
  PageBreak, LevelFormat, convertInchesToTwip
} from 'docx';

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'cli_aabfc053e138dcd6';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '0rsQSZKNf1FoZvGQQJCqnhIqjdAmJeaC';
const FEISHU_BASE_TOKEN = process.env.FEISHU_BASE_TOKEN || 'O2kRbtdK7aOGV9sUgYAcwMyqnve';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblvg4VWPMt6yCjX';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hgttax_admin_2026';

// 获取飞书access_token
async function getFeishuToken(): Promise<string> {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET })
  });
  const data = await res.json();
  return data.tenant_access_token;
}

// 从飞书读取检测记录
async function getRecordFromFeishu(riskId: string, token: string) {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_BASE_TOKEN}/tables/${FEISHU_TABLE_ID}/records/search`,
    {
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
    }
  );
  const data = await res.json();
  if (data.code !== 0 || !data.data?.items?.length) return null;
  return data.data.items[0].fields;
}

// 颜色常量
const COLORS = {
  primary: '1a56db',
  success: '0e9f6e',
  warning: 'd97706',
  danger: 'dc2626',
  purple: '7c3aed',
  gray: '6b7280',
  lightGray: 'f3f4f6',
  white: 'ffffff'
};

// 获取风险等级对应的颜色
function getLevelColor(level: string): string {
  switch (level) {
    case '低风险': return COLORS.success;
    case '中风险': return COLORS.warning;
    case '中高风险': return 'ea580c';
    case '高风险': return COLORS.danger;
    case '极高风险': return COLORS.purple;
    default: return COLORS.gray;
  }
}

// 创建标题段落
function createTitle(text: string, level: number = 1): Paragraph {
  const sizes: Record<number, number> = { 1: 32, 2: 24, 3: 20 };
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children: [new TextRun({ text, bold: true, size: sizes[level] || 20, color: COLORS.primary })],
    spacing: { before: 200, after: 150 }
  });
}

// 创建普通段落
function createPara(text: string, options: { bold?: boolean; color?: string; size?: number } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: options.bold || false,
      color: options.color || '333333',
      size: options.size || 21
    })],
    spacing: { before: 60, after: 60 }
  });
}

// 创建带标签的行（标签+值）
function createLabelValueRow(label: string, value: string, valueColor?: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, color: '555555' })],
          spacing: { before: 60, after: 60 }
        })]
      }),
      new TableCell({
        width: { size: 75, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: value || '-', size: 20, color: valueColor || '333333' })],
          spacing: { before: 60, after: 60 }
        })]
      })
    ]
  });
}

// 创建表头行
function createHeaderRow(cells: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cells.map(text => new TableCell({
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.primary },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, size: 20, color: COLORS.white })]
      })]
    }))
  });
}

// 创建数据行
function createDataRow(cells: string[], alignCenter?: boolean): TableRow {
  return new TableRow({
    children: cells.map(text => new TableCell({
      children: [new Paragraph({
        alignment: alignCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: text || '-', size: 20 })]
      })]
    }))
  });
}

// 表格边框样式
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
  left: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
  right: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'e5e7eb' }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riskId = searchParams.get('riskId');
  const adminToken = searchParams.get('admin_token');

  if (!riskId) {
    return NextResponse.json({ error: '缺少riskId参数' }, { status: 400 });
  }

  // 验证管理员权限
  const isAdmin = adminToken === ADMIN_TOKEN;

  try {
    const feishuToken = await getFeishuToken();
    const record = await getRecordFromFeishu(riskId, feishuToken);

    if (!record) {
      return NextResponse.json({ error: '未找到该检测记录' }, { status: 404 });
    }

    // 提取字段值（飞书返回的是数组，取第一个）
    const getVal = (key: string) => {
      const val = record[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const enterpriseName = getVal('企业名称') as string;
    const industry = getVal('所属行业') as string;
    const creditCode = getVal('统一信用代码') as string;
    const overallLevel = getVal('综合风险等级') as string;
    const reportStatus = getVal('报告状态') as string;
    const totalScore = getVal('综合得分') as number;
    const highCount = getVal('高风险项数') as number;
    const mediumCount = getVal('中风险项数') as number;
    const lowCount = getVal('低风险项数') as number;
    const detectionTime = getVal('检测时间') as string;
    const contactPerson = getVal('联系人') as string;
    const contactPhone = getVal('联系电话') as string;
    const revenueScale = getVal('年营收规模') as string;
    const riskItemsText = getVal('风险项明细') as string;
    const crossValidation = getVal('交叉验证结果') as string;

    // 财务指标
    const revenue = getVal('营业收入(万元)') as number;
    const cost = getVal('营业成本(万元)') as number;
    const grossMargin = getVal('毛利率') as number;
    const vatRate = getVal('增值税税负率') as number;
    const citRate = getVal('所得税贡献率') as number;
    const debtRatio = getVal('资产负债率') as number;
    const totalAssets = getVal('总资产(万元)') as number;
    const totalLiabilities = getVal('总负债(万元)') as number;
    const vatPaid = getVal('实缴增值税(万元)') as number;
    const incomeTaxPaid = getVal('实缴所得税(万元)') as number;

    const levelColor = getLevelColor(overallLevel);

    // 构建文档内容
    const children: any[] = [];

    // ===== 封面 =====
    children.push(
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '企业财税风险检测报告', bold: true, size: 48, color: COLORS.primary })],
        spacing: { after: 400 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: enterpriseName || '企业名称', size: 32, color: '333333' })],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `检测时间：${detectionTime || '-'}`, size: 22, color: COLORS.gray })],
        spacing: { after: 600 }
      }),
      // 风险等级徽章
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
    );

    // 风险等级表格（居中显示的大标签）
    children.push(
      new Table({
        width: { size: 40, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: tableBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: levelColor },
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `综合风险等级：${overallLevel || '未评估'}`, bold: true, size: 28, color: COLORS.white })],
                  spacing: { before: 200, after: 200 }
                })]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { before: 400 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: `风险项：${highCount || 0}高 / ${mediumCount || 0}中 / ${lowCount || 0}低`,
          size: 22, color: COLORS.gray
        })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: `综合得分：${totalScore || 0}分`,
          size: 22, color: COLORS.gray
        })],
        spacing: { after: 1500 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: '慧根堂财税风险检测系统',
          size: 20, color: COLORS.gray
        })]
      }),
      // 分页
      new Paragraph({ children: [new PageBreak()] })
    );

    // ===== 第一部分：企业基本信息 =====
    children.push(createTitle('一、企业基本信息', 1));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          createLabelValueRow('企业名称', enterpriseName),
          createLabelValueRow('统一信用代码', creditCode),
          createLabelValueRow('所属行业', industry),
          createLabelValueRow('年营收规模', revenueScale),
          createLabelValueRow('联系人', contactPerson),
          createLabelValueRow('联系电话', contactPhone),
          createLabelValueRow('检测时间', detectionTime),
          createLabelValueRow('报告状态', reportStatus)
        ]
      })
    );

    // ===== 第二部分：风险概览 =====
    children.push(createTitle('二、风险概览', 1));
    children.push(createPara(`经系统检测，该企业综合风险等级为【${overallLevel || '未评估'}】。`, { bold: true, color: levelColor }));
    children.push(createPara('风险项统计如下：'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          createHeaderRow(['风险等级', '数量', '说明']),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '🔴 高风险', bold: true, color: COLORS.danger, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(highCount || 0), bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '存在重大税务风险，建议立即整改', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '🟡 中风险', bold: true, color: COLORS.warning, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(mediumCount || 0), bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '存在一定税务隐患，建议关注优化', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '🟢 低风险', bold: true, color: COLORS.success, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(lowCount || 0), bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '整体合规情况良好，继续保持', size: 20 })] })] })
            ]
          })
        ]
      })
    );

    // ===== 第三部分：详细风险分析 =====
    children.push(createTitle('三、详细风险分析', 1));

    if (riskItemsText && riskItemsText !== '暂无风险项') {
      // 解析风险项（按分号分隔）
      const items = riskItemsText.split('；').filter(Boolean);
      children.push(createPara(`共检测到 ${items.length} 项风险点，具体如下：`));

      let itemIndex = 1;
      for (const item of items) {
        const trimmed = item.trim();
        if (!trimmed) continue;

        let riskColor = COLORS.gray;
        let riskLabel = '';
        if (trimmed.startsWith('🔴')) { riskColor = COLORS.danger; riskLabel = '高风险'; }
        else if (trimmed.startsWith('🟡')) { riskColor = COLORS.warning; riskLabel = '中风险'; }
        else if (trimmed.startsWith('🟢')) { riskColor = COLORS.success; riskLabel = '低风险'; }

        const itemText = trimmed.replace(/^[🔴🟡🟢]/, '').trim();

        children.push(
          new Paragraph({
            spacing: { before: 150, after: 60 },
            children: [new TextRun({ text: `${itemIndex}. [${riskLabel}] ${itemText.split('（依据：')[0]}`, bold: true, size: 21, color: riskColor })]
          })
        );

        // 提取政策依据
        const policyMatch = itemText.match(/（依据：(.+?)）/);
        if (policyMatch) {
          children.push(
            new Paragraph({
              spacing: { before: 30, after: 60 },
              indent: { left: 400 },
              children: [new TextRun({ text: `📚 政策依据：${policyMatch[1]}`, size: 18, color: COLORS.gray })]
            })
          );
        }
        itemIndex++;
      }
    } else {
      children.push(createPara('未检测到明显风险项，企业整体财税状况良好。', { color: COLORS.success }));
    }

    // ===== 第四部分：财务指标分析 =====
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(createTitle('四、财务指标分析', 1));
    children.push(createPara('以下为企业核心财务指标数据：'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          createHeaderRow(['指标名称', '数值', '指标名称', '数值']),
          new TableRow({
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '营业收入', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: revenue !== undefined ? `${revenue} 万元` : '-', size: 20 })] })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '营业成本', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: cost !== undefined ? `${cost} 万元` : '-', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '毛利率', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: grossMargin !== undefined ? `${grossMargin}%` : '-', size: 20 })] })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '资产负债率', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: debtRatio !== undefined ? `${debtRatio}%` : '-', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '增值税税负率', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: vatRate !== undefined ? `${vatRate}%` : '-', size: 20 })] })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '所得税贡献率', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: citRate !== undefined ? `${citRate}%` : '-', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '实缴增值税', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: vatPaid !== undefined ? `${vatPaid} 万元` : '-', size: 20 })] })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '实缴所得税', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: incomeTaxPaid !== undefined ? `${incomeTaxPaid} 万元` : '-', size: 20 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '总资产', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: totalAssets !== undefined ? `${totalAssets} 万元` : '-', size: 20 })] })] }),
              new TableCell({ shading: { type: ShadingType.CLEAR, color: 'auto', fill: COLORS.lightGray }, children: [new Paragraph({ children: [new TextRun({ text: '总负债', bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: totalLiabilities !== undefined ? `${totalLiabilities} 万元` : '-', size: 20 })] })] })
            ]
          })
        ]
      })
    );

    // ===== 第五部分：交叉验证 =====
    children.push(createTitle('五、交叉验证分析', 1));
    if (crossValidation && crossValidation !== '暂无明显矛盾') {
      const items = crossValidation.split('；').filter(Boolean);
      children.push(createPara(`检测到 ${items.length} 项数据交叉验证异常：`));
      for (let i = 0; i < items.length; i++) {
        const item = items[i].trim();
        if (!item) continue;
        children.push(createPara(`${i + 1}. ${item.replace(/^[🔴🟡🟢]/, '')}`));
      }
    } else {
      children.push(createPara('各项财务数据交叉验证无明显矛盾，数据一致性较好。', { color: COLORS.success }));
    }

    // ===== 页脚说明 =====
    children.push(new Paragraph({ spacing: { before: 600 } }));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({
          text: '— 报告完 —',
          size: 20, color: COLORS.gray
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: '本报告由慧根堂财税风险检测系统自动生成，仅供参考，不构成税务建议。',
          size: 18, color: COLORS.gray
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: '如需专业税务咨询，请联系慧根堂财税顾问。',
          size: 18, color: COLORS.gray
        })]
      })
    );

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        children
      }]
    });

    // 生成Buffer
    const buffer = await Packer.toBuffer(doc);

    // 返回下载
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="财税风险检测报告_${enterpriseName || riskId}.docx"`
      }
    });

  } catch (error: any) {
    console.error('导出报告失败:', error);
    return NextResponse.json({ error: '导出失败: ' + error.message }, { status: 500 });
  }
}
