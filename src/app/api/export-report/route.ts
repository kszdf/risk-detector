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
    // 提取并转换企查查工商信息
    // 兼容三种格式：旧格式(Result=基础信息) / 410+213格式(basicInfo+annualReport) / 2006合作风险排查格式(Result.VerifyResult+Data)
    const rawBusinessInfo = extractJsonField(record['工商信息']);
    
    // 判断是否为2006格式
    const isRiskScanFormat = rawBusinessInfo?.Result?.VerifyResult !== undefined
      && rawBusinessInfo?.Result?.Data !== undefined;
    
    let businessInfo: any = null;
    let annualReport: any = null;
    let riskScanData: any = null;
    
    if (isRiskScanFormat) {
      const riskData = rawBusinessInfo.Result.Data;
      businessInfo = transformQccInfo(riskData);
      annualReport = null; // 2006没有详细年报
      riskScanData = transformRiskScanData(riskData);
    } else {
      const basicResult = rawBusinessInfo?.basicInfo || rawBusinessInfo?.Result || null;
      businessInfo = basicResult ? transformQccInfo(basicResult) : null;
      const annualReportList = rawBusinessInfo?.annualReport || [];
      annualReport = annualReportList.length > 0 ? transformAnnualReport(annualReportList) : null;
    }

    function transformQccInfo(result: any) {
      if (!result) return null;
      return {
        name: result.Name || '',
        status: result.Status || '',
        creditCode: result.CreditCode || '',
        regNo: result.No || '',
        orgNo: result.OrgNo || '',
        operName: result.OperName || '',
        taxpayerType: result.TaxpayerType || '',
        personScope: result.PersonScope || '',
        insuredCount: result.InsuredCount || '',
        registCapi: result.RegistCapi || '',
        registeredCapital: result.RegisteredCapital || '',
        paidUpCapital: result.PaidUpCapital ? (result.PaidUpCapital + (result.PaidUpCapitalUnit || '') + (result.PaidUpCapitalCCY === 'CNY' ? '元人民币' : '')) : '',
        realCapi: result.RealCapi || '',
        startDate: result.StartDate ? result.StartDate.split(' ')[0] : '',
        checkDate: result.CheckDate ? result.CheckDate.split(' ')[0] : '',
        termStart: result.TermStart ? result.TermStart.split(' ')[0] : '',
        termEnd: result.TermEnd ? result.TermEnd.split(' ')[0] : '',
        econKind: result.EconKind || '',
        entType: result.EntType || '',
        belongOrg: result.BelongOrg || '',
        isSmall: result.IsSmall || '',
        scale: result.Scale || '',
        companyType: result.CompanyType || '',
        areaCode: result.AreaCode || '',
        address: result.Address || '',
        scope: result.Scope || '',
        province: result.Area?.Province || result.Province || '',
        city: result.Area?.City || result.City || '',
        county: result.Area?.County || result.County || '',
        industry: result.Industry?.Industry || '',
        subIndustry: result.Industry?.SubIndustry || '',
        qccIndustry: result.QccIndustry?.CName || result.QccIndustry?.BName || '',
        stockInfo: result.StockInfo ? {
          stockNumber: result.StockInfo.StockNumber || '',
          stockType: result.StockInfo.StockType || ''
        } : null,
        contactInfo: result.ContactInfo ? {
          tel: result.ContactInfo.Tel || '',
          email: result.ContactInfo.Email || ''
        } : null,
        originalName: Array.isArray(result.OriginalName) ? result.OriginalName.map((n: any) => n.Name || n).filter(Boolean) : [],
        imageUrl: result.ImageUrl || '',
        taxNo: result.TaxNo || '',
        imExCode: result.ImExCode || '',
        englishName: result.EnglishName || ''
      };
    }

    // 转换2006全量风险数据
    function transformRiskScanData(data: any) {
      if (!data) return null;
      return {
        // 工商扩展
        partners: Array.isArray(data.PartnerList) ? data.PartnerList.slice(0, 20).map((p: any) => ({
          name: p.StockName || '',
          type: p.StockType || '',
          percent: p.StockPercent || '',
          shouldCapi: p.ShouldCapi || '',
          subscribedCapital: p.SubscribedCapital || '',
          stakeDate: p.StakeDate ? p.StakeDate.split(' ')[0] : '',
          creditCode: p.CreditCode || '',
          area: p.Area || ''
        })) : [],
        employees: Array.isArray(data.EmployeeList) ? data.EmployeeList.slice(0, 20).map((e: any) => ({
          name: e.Name || '',
          job: e.Job || ''
        })) : [],
        branches: Array.isArray(data.BranchList) ? data.BranchList.slice(0, 20).map((b: any) => ({
          name: b.Name || '',
          creditCode: b.CreditCode || '',
          operName: b.OperName || '',
          startDate: b.StartDate ? b.StartDate.split(' ')[0] : '',
          status: b.Status || ''
        })) : [],
        changes: Array.isArray(data.ChangeList) ? data.ChangeList.slice(0, 20).map((c: any) => ({
          projectName: c.ProjectName || '',
          changeSubject: c.ChangeSubject || '',
          changeDate: c.ChangeDate ? c.ChangeDate.split(' ')[0] : '',
          before: Array.isArray(c.BeforeList) ? c.BeforeList.join('；') : '',
          after: Array.isArray(c.AfterList) ? c.AfterList.join('；') : ''
        })) : [],
        investments: Array.isArray(data.InvestmentList) ? data.InvestmentList.slice(0, 20).map((i: any) => ({
          name: i.Name || '',
          status: i.Status || '',
          fundedRatio: i.FundedRatio || '',
          shouldCapi: i.ShouldCapi || '',
          industry: i.Industry?.SubIndustry || i.Industry?.Industry || '',
          startDate: i.StartDate ? i.StartDate.split(' ')[0] : ''
        })) : [],
        adminLicenses: Array.isArray(data.AdminLicenseList) ? data.AdminLicenseList.slice(0, 10).map((a: any) => ({
          docNo: a.LicensDocNo || '',
          docName: a.LicensDocName || '',
          validityFrom: a.ValidityFrom ? a.ValidityFrom.split(' ')[0] : '',
          validityTo: a.ValidityTo ? a.ValidityTo.split(' ')[0] : '',
          office: a.LicensOffice || '',
          content: a.LicensContent || ''
        })) : [],
        tags: Array.isArray(data.TagList) ? data.TagList.map((t: any) => t.Name || '').filter(Boolean) : [],
        revokeInfo: data.RevokeInfo ? {
          cancelDate: data.RevokeInfo.CancelDate ? data.RevokeInfo.CancelDate.split(' ')[0] : '',
          cancelReason: data.RevokeInfo.CancelReason || '',
          revokeDate: data.RevokeInfo.RevokeDate ? data.RevokeInfo.RevokeDate.split(' ')[0] : '',
          revokeReason: data.RevokeInfo.RevokeReason || ''
        } : null,
        parent: data.Parent ? {
          name: data.Parent.Name || '',
          operName: data.Parent.OperName || '',
          status: data.Parent.Status || '',
          registCapi: data.Parent.RegistCapi || ''
        } : null,
        beneficiaries: Array.isArray(data.BeneficiaryList) ? data.BeneficiaryList.slice(0, 10).map((b: any) => ({
          name: b.Name || '',
          finalBenefitPercent: b.FinalBenefitPercent || '',
          reason: b.Reason || ''
        })) : [],
        actualControllers: Array.isArray(data.ActualControllerList) ? data.ActualControllerList.slice(0, 10).map((a: any) => ({
          name: a.Name || '',
          finalBenefitPercent: a.FinalBenefitPercent || '',
          controlPercent: a.ControlPercent || '',
          isActual: a.IsActual || ''
        })) : [],
        groupInfo: data.GroupInfo ? { name: data.GroupInfo.Name || '' } : null,
        mainProducts: Array.isArray(data.MainProductList) ? data.MainProductList : [],
        approveSites: Array.isArray(data.ApproveSiteList) ? data.ApproveSiteList.slice(0, 10).map((s: any) => ({
          name: s.Name || '',
          webAddress: s.WebAddress || '',
          domainName: s.DomainName || '',
          licenseNo: s.LesenceNo || ''
        })) : [],
        // 税务风险
        taxCreditList: Array.isArray(data.TaxCreditList) ? data.TaxCreditList.slice(0, 10).map((t: any) => ({
          year: t.Year || '',
          level: t.Level || '',
          org: t.Org || ''
        })) : [],
        taxOweNotice: data.TaxOweNotice ? {
          totalCount: Number(data.TaxOweNotice.TotalCount) || 0,
          totalAmount: data.TaxOweNotice.TotalAmount || '',
          items: Array.isArray(data.TaxOweNotice.DataList) ? data.TaxOweNotice.DataList.slice(0, 10).map((i: any) => ({
            title: i.Title || '',
            amount: i.Amount || '',
            newAmount: i.NewAmount || '',
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : '',
            publishOffice: i.PublishOffice || ''
          })) : []
        } : null,
        taxIllegal: data.TaxIllegal ? {
          totalCount: Number(data.TaxIllegal.TotalCount) || 0,
          items: Array.isArray(data.TaxIllegal.DataList) ? data.TaxIllegal.DataList.slice(0, 10).map((i: any) => ({
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : '',
            caseNature: i.CaseNature || '',
            taxGov: i.TaxGov || '',
            illegalContent: i.IllegalContent || '',
            punishContent: i.PunishContent || ''
          })) : []
        } : null,
        taxAbnormal: data.TaxAbnormal ? {
          totalCount: Number(data.TaxAbnormal.TotalCount) || 0,
          items: Array.isArray(data.TaxAbnormal.DataList) ? data.TaxAbnormal.DataList.slice(0, 10).map((i: any) => ({
            taxNo: i.TaxNo || '',
            addOffice: i.AddOffice || '',
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : ''
          })) : []
        } : null,
        taxHurry: data.TaxHurry ? {
          totalCount: Number(data.TaxHurry.TotalCount) || 0,
          items: Array.isArray(data.TaxHurry.DataList) ? data.TaxHurry.DataList.slice(0, 5).map((i: any) => ({
            taxCategory: i.TaxCategory || '',
            taxOwedAmt: i.TaxOwedAmt || '',
            deadlineDate: i.DeadlineDate ? i.DeadlineDate.split(' ')[0] : '',
            taxAuthority: i.TaxAuthority || ''
          })) : []
        } : null,
        // 监管与司法风险
        adminPenalty: data.AdminPenalty ? {
          totalCount: Number(data.AdminPenalty.TotalCount) || 0,
          totalAmount: data.AdminPenalty.TotalAmount || '',
          items: Array.isArray(data.AdminPenalty.DataList) ? data.AdminPenalty.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            reason: i.PunishReason || '',
            result: i.PunishResult || '',
            amount: i.PunishAmt || '',
            office: i.PunishOffice || '',
            date: i.PunishDate ? i.PunishDate.split(' ')[0] : ''
          })) : []
        } : null,
        exception: data.Exception ? {
          totalCount: Number(data.Exception.TotalCount) || 0,
          items: Array.isArray(data.Exception.DataList) ? data.Exception.DataList.slice(0, 10).map((i: any) => ({
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : '',
            addOffice: i.AddOffice || '',
            addReason: i.AddReason || ''
          })) : []
        } : null,
        seriousIllegal: data.SeriousIllegal ? {
          totalCount: Number(data.SeriousIllegal.TotalCount) || 0,
          items: Array.isArray(data.SeriousIllegal.DataList) ? data.SeriousIllegal.DataList.slice(0, 10).map((i: any) => ({
            addDate: i.AddDate ? i.AddDate.split(' ')[0] : '',
            addOffice: i.AddOffice || '',
            addReason: i.AddReason || ''
          })) : []
        } : null,
        shiXin: data.ShiXin ? {
          totalCount: Number(data.ShiXin.TotalCount) || 0,
          totalAmount: data.ShiXin.TotalAmount || '',
          items: Array.isArray(data.ShiXin.DataList) ? data.ShiXin.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            executeCourt: i.ExecuteCourt || '',
            amount: i.Amount || '',
            executeStatus: i.ExecuteStatus || '',
            actionRemark: i.ActionRemark || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : ''
          })) : []
        } : null,
        zhiXing: data.ZhiXing ? {
          totalCount: Number(data.ZhiXing.TotalCount) || 0,
          totalAmount: data.ZhiXing.TotalAmount || '',
          items: Array.isArray(data.ZhiXing.DataList) ? data.ZhiXing.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            biaoDi: i.BiaoDi || '',
            executeCourt: i.ExecuteCourt || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : ''
          })) : []
        } : null,
        equityFreeze: data.EquityFreeze ? {
          totalCount: Number(data.EquityFreeze.TotalCount) || 0,
          items: Array.isArray(data.EquityFreeze.DataList) ? data.EquityFreeze.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            beExecuted: i.BeExecuted || '',
            freezeCompany: i.FreezeCompany || '',
            equityAmount: i.EquityAmount || '',
            executeCourt: i.ExecuteCourt || '',
            status: i.Status || '',
            freezeStartDate: i.FreezeStartDate ? i.FreezeStartDate.split(' ')[0] : '',
            freezeEndDate: i.FreezeEndDate ? i.FreezeEndDate.split(' ')[0] : ''
          })) : []
        } : null,
        equityPledge: data.EquityPledge ? {
          totalCount: Number(data.EquityPledge.TotalCount) || 0,
          items: Array.isArray(data.EquityPledge.DataList) ? data.EquityPledge.DataList.slice(0, 10).map((i: any) => ({
            registerNo: i.RegisterNo || '',
            pledgorList: Array.isArray(i.PledgorList) ? i.PledgorList.join('、') : '',
            pledgeeList: Array.isArray(i.PledgeeList) ? i.PledgeeList.join('、') : '',
            relatedCompany: i.RelatedCompany || '',
            pledgedAmount: i.PledgedAmount || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : '',
            status: i.Status || ''
          })) : []
        } : null,
        bankruptcy: data.Bankruptcy ? {
          totalCount: Number(data.Bankruptcy.TotalCount) || 0,
          items: Array.isArray(data.Bankruptcy.DataList) ? data.Bankruptcy.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            publicDate: i.PublicDate ? i.PublicDate.split(' ')[0] : '',
            applicantList: Array.isArray(i.ApplicantList) ? i.ApplicantList.join('、') : '',
            respondentList: Array.isArray(i.RespondentList) ? i.RespondentList.join('、') : ''
          })) : []
        } : null,
        sumptuary: data.Sumptuary ? {
          totalCount: Number(data.Sumptuary.TotalCount) || 0,
          totalAmount: data.Sumptuary.TotalAmount || '',
          items: Array.isArray(data.Sumptuary.DataList) ? data.Sumptuary.DataList.slice(0, 10).map((i: any) => ({
            caseNo: i.CaseNo || '',
            companyName: i.CompanyName || '',
            relatedName: i.RelatedName || '',
            applicant: i.Applicant || '',
            amount: i.Amount || '',
            executeCourt: i.ExecuteCourt || '',
            publicDate: i.PublicDate ? i.PublicDate.split(' ')[0] : ''
          })) : []
        } : null,
        envPunishment: data.EnvPunishment ? {
          totalCount: Number(data.EnvPunishment.TotalCount) || 0,
          totalAmount: data.EnvPunishment.TotalAmount || '',
          items: Array.isArray(data.EnvPunishment.DataList) ? data.EnvPunishment.DataList.slice(0, 10).map((i: any) => ({
            docNo: i.DocNo || '',
            reason: i.PunishReason || '',
            result: i.PunishResult || '',
            amount: i.PunishAmt || '',
            office: i.PunishOffice || '',
            date: i.PunishDate ? i.PunishDate.split(' ')[0] : ''
          })) : []
        } : null,
        chattelMortgage: data.ChattelMortgage ? {
          totalCount: Number(data.ChattelMortgage.TotalCount) || 0,
          items: Array.isArray(data.ChattelMortgage.DataList) ? data.ChattelMortgage.DataList.slice(0, 10).map((i: any) => ({
            registerNo: i.RegisterNo || '',
            status: i.Status || '',
            registerDate: i.RegisterDate ? i.RegisterDate.split(' ')[0] : '',
            secureClaimsAmount: i.SecureClaimsAmount || '',
            pledgor: Array.isArray(i.Pledger) ? i.Pledger.join('、') : '',
            pledgee: Array.isArray(i.Pledgee) ? i.Pledgee.join('、') : '',
            debtTerm: i.DebtTerm || ''
          })) : []
        } : null,
        liquidation: data.Liquidation ? {
          leader: data.Liquidation.Leader || '',
          member: data.Liquidation.Member || ''
        } : null,
        publicSecurityNotice: data.PublicSecurityNotice ? {
          totalCount: Number(data.PublicSecurityNotice.TotalCount) || 0,
          items: Array.isArray(data.PublicSecurityNotice.DataList) ? data.PublicSecurityNotice.DataList.slice(0, 5).map((i: any) => ({
            name: i.Name || '',
            caseReason: i.CaseReason || '',
            publishOffice: i.PublishOffice || '',
            publishDate: i.PublishDate ? i.PublishDate.split(' ')[0] : ''
          })) : []
        } : null,
        // 财务数据
        financialInformation: data.FinancialInformation ? {
          accountTitle: data.FinancialInformation.AccountTitle || '',
          amount: data.FinancialInformation.Amount || '',
          year: data.FinancialInformation.Year || ''
        } : null,
        // 产业链
        industryChainList: Array.isArray(data.IndustryChainList) ? data.IndustryChainList.map((c: any) => ({
          industryChainName: c.IndustryChainName || ''
        })) : []
      };
    }

    // 转换年报数据（取最新一年有详细信息的）
    function transformAnnualReport(reportList: any[]) {
      if (!reportList || reportList.length === 0) return null;
      
      const latest = reportList.find((r: any) => r.HasDetailInfo === 'True' || r.HasDetailInfo === true) 
        || reportList[0];
      
      if (!latest) return null;
      
      const basic = latest.BasicInfoData || {};
      const assets = latest.AssetsData || {};
      const social = latest.SocialInsurance || {};
      const partners = latest.PartnerList || [];
      const investments = latest.InvestInfoList || [];
      const stockChanges = latest.StockChangeList || [];
      const websites = latest.WebSiteList || [];
      const changes = latest.ChangeList || [];
      
      return {
        year: latest.Year || '',
        publishDate: latest.PublishDate ? latest.PublishDate.split(' ')[0] : '',
        employeeCount: basic.EmployeeCount || '',
        hasWebSite: basic.HasWebSite || '',
        status: basic.Status || '',
        totalAssets: assets.TotalAssets || '',
        totalEquity: assets.TotalOwnersEquity || '',
        totalLiabilities: assets.TotalLiabilities || '',
        revenue: assets.GrossTradingIncome || '',
        mainBusinessIncome: assets.MainBusinessIncome || '',
        totalProfit: assets.TotalProfit || '',
        netProfit: assets.NetProfit || '',
        totalTax: assets.TotalTaxAmount || '',
        governmentSubsidy: assets.GovernmentSubsidy || '',
        partners: partners.map((p: any) => ({
          name: p.Name || '',
          shouldCapi: p.ShouldCapi || '',
          shouldDate: p.ShouldDate || '',
          shouldType: p.ShouldType || '',
          realCapi: p.RealCapi || '',
          realDate: p.RealDate || '',
          realType: p.RealType || ''
        })),
        investments: investments.map((i: any) => ({
          name: i.Name || '',
          regNo: i.RegNo || ''
        })),
        stockChanges: stockChanges.map((s: any) => ({
          name: s.Name || '',
          before: s.Before || '',
          after: s.After || '',
          changeDate: s.ChangeDate ? s.ChangeDate.split(' ')[0] : ''
        })),
        websites: websites.map((w: any) => ({
          type: w.Type || '',
          name: w.Name || '',
          webSite: w.WebSite || ''
        })),
        changes: changes.map((c: any) => ({
          changeName: c.ChangeName || '',
          before: c.Before || '',
          after: c.After || '',
          changeDate: c.ChangeDate ? c.ChangeDate.split(' ')[0] : ''
        })),
        socialInsurance: {
          urbanBasicIns: social.UrbanBasicIns || '',
          employeeBasicIns: social.EmployeeBasicIns || '',
          maternityIns: social.MaternityIns || '',
          unemploymentIns: social.UnemploymentIns || '',
          industrialInjuryIns: social.IndustrialInjuryIns || ''
        }
      };
    }

    // 动态生成工商信息表格行（有数据才显示）
    function buildBusinessInfoRows(info: any): TableRow[] {
      const rows: TableRow[] = [];
      const scaleMap: Record<string, string> = { L: '大型', M: '中型', S: '小型', XS: '微型' };
      const companyTypeMap: Record<string, string> = {
        '1': '中央企业', '2': '地方国有企业', '3': '中央部委', '4': '地方政府',
        '5': '民营企业', '6': '其他', '7': '事业单位', '8': '个体工商户'
      };
      const pairs: [string, string, string, string][] = [
        // [左标签, 左值, 右标签, 右值]
        ['登记状态', info.status, '成立日期', info.startDate],
        ['法定代表人', info.operName, '企业类型', info.econKind],
        ['注册资本', info.registCapi, '实缴资本', info.paidUpCapital || info.realCapi],
        ['统一社会信用代码', info.creditCode, '注册号', info.regNo],
        ['纳税人识别号', info.taxNo, '组织机构代码', info.orgNo],
        ['纳税人资质', info.taxpayerType, '人员规模', info.personScope || (info.scale ? scaleMap[info.scale] : '')],
        ['参保人数', info.insuredCount + (info.insuredCount ? '人' : ''), '企业规模', info.scale ? scaleMap[info.scale] + '企业' : ''],
        ['登记机关', info.belongOrg, '核准日期', info.checkDate],
        ['司库企业属性', info.companyType ? companyTypeMap[info.companyType] || info.companyType : '', '小微企业', info.isSmall === '1' ? '是' : info.isSmall === '0' ? '否' : ''],
        ['进出口企业代码', info.imExCode, '英文名', info.englishName],
      ];

      for (const [leftLabel, leftVal, rightLabel, rightVal] of pairs) {
        const hasLeft = leftVal && leftVal !== '-';
        const hasRight = rightVal && rightVal !== '-';
        if (!hasLeft && !hasRight) continue;

        if (hasLeft && hasRight) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(leftLabel),
              createDataCell(leftVal, { align: 'center' }),
              createHeaderCell(rightLabel),
              createDataCell(rightVal, { align: 'center' })
            ]
          }));
        } else if (hasLeft) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(leftLabel),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  children: [new TextRun({ text: leftVal, size: 20 })]
                })]
              })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(rightLabel),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  children: [new TextRun({ text: rightVal, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      // 营业期限
      if (info.termStart || info.termEnd) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('营业期限'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({
                  text: (info.termStart || '-') + ' 至 ' + (info.termEnd || '长期'),
                  size: 20
                })]
              })]
            })
          ]
        }));
      }

      // 曾用名
      if (info.originalName && info.originalName.length > 0) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('曾用名'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.originalName.join(' → '), size: 20, color: '666666' })]
              })]
            })
          ]
        }));
      }

      // 上市信息
      if (info.isOnStock) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('上市状态'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({
                  text: '已上市' + (info.stockNumber ? ' · 股票代码：' + info.stockNumber : ''),
                  size: 20
                })]
              })]
            })
          ]
        }));
      }

      // 注册地址
      if (info.address) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('注册地址'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.address, size: 20 })]
              })]
            })
          ]
        }));
      }

      // 经营范围
      if (info.scope) {
        rows.push(new TableRow({
          children: [
            createHeaderCell('经营范围'),
            new TableCell({
              columnSpan: 3,
              children: [new Paragraph({
                children: [new TextRun({ text: info.scope, size: 19, color: '555555' })]
              })]
            })
          ]
        }));
      }

      return rows;
    }

    // 判断是否有有效的年报财务数据
    function hasAnnualFinancialData(report: any): boolean {
      if (!report) return false;
      const fields = ['totalAssets', 'revenue', 'totalProfit', 'netProfit', 'totalTax', 'totalLiabilities', 'totalEquity'];
      return fields.some(f => report[f] && report[f] !== '-' && report[f] !== '企业选择不公示' && report[f] !== '');
    }

    // 构建年报财务数据表格行
    function buildAnnualFinanceRows(report: any): TableRow[] {
      const rows: TableRow[] = [];
      const items: [string, string][] = [
        ['资产总额', report.totalAssets],
        ['负债总额', report.totalLiabilities],
        ['所有者权益合计', report.totalEquity],
        ['营业总收入', report.revenue],
        ['利润总额', report.totalProfit],
        ['净利润', report.netProfit],
        ['纳税总额', report.totalTax],
        ['政府补助', report.governmentSubsidy]
      ];

      const validItems = items.filter(([, val]) => val && val !== '-' && val !== '企业选择不公示' && val !== '');
      
      // 两两一行显示
      for (let i = 0; i < validItems.length; i += 2) {
        const [label1, val1] = validItems[i];
        const [label2, val2] = validItems[i + 1] || ['', ''];
        
        if (validItems[i + 1]) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              createDataCell(val1, { align: 'center' }),
              createHeaderCell(label2),
              createDataCell(val2, { align: 'center' })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: val1, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      return rows;
    }

    // 判断是否有社保数据
    function hasSocialInsuranceData(social: any): boolean {
      if (!social) return false;
      const fields = ['urbanBasicIns', 'employeeBasicIns', 'maternityIns', 'unemploymentIns', 'industrialInjuryIns'];
      return fields.some(f => social[f] && social[f] !== '-' && social[f] !== '');
    }

    // 构建社保信息表格行
    function buildAnnualSocialRows(social: any): TableRow[] {
      const rows: TableRow[] = [];
      const items: [string, string][] = [
        ['养老保险', social.urbanBasicIns],
        ['医疗保险', social.employeeBasicIns],
        ['失业保险', social.unemploymentIns],
        ['工伤保险', social.industrialInjuryIns],
        ['生育保险', social.maternityIns]
      ];

      const validItems = items.filter(([, val]) => val && val !== '-' && val !== '');

      for (let i = 0; i < validItems.length; i += 2) {
        const [label1, val1] = validItems[i];
        const [label2, val2] = validItems[i + 1] || ['', ''];
        
        if (validItems[i + 1]) {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              createDataCell(val1, { align: 'center' }),
              createHeaderCell(label2),
              createDataCell(val2, { align: 'center' })
            ]
          }));
        } else {
          rows.push(new TableRow({
            children: [
              createHeaderCell(label1),
              new TableCell({
                columnSpan: 3,
                children: [new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: val1, size: 20 })]
                })]
              })
            ]
          }));
        }
      }

      return rows;
    }

    // 构建2006合作风险扫描的全部模块（自适应：有数据才显示）
    function buildRiskScanSections(risk: any): any[] {
      const sections: any[] = [];

      // ===== 一、工商扩展信息 =====
      // 1. 股东信息
      if (risk.partners?.length > 0) {
        sections.push(createHeading2('股东信息'));
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('股东名称'),
              createHeaderCell('类型'),
              createHeaderCell('持股比例'),
              createHeaderCell('认缴出资'),
              createHeaderCell('首次持股日期')
            ]
          }),
          ...risk.partners.map((p: any) => new TableRow({
            children: [
              createDataCell(p.name || '-'),
              createDataCell(p.type || '-', { align: 'center' }),
              createDataCell(p.percent || '-', { align: 'center', bold: true, color: '1a56db' }),
              createDataCell(p.shouldCapi || p.subscribedCapital || '-', { align: 'center' }),
              createDataCell(p.stakeDate || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 2. 主要人员
      if (risk.employees?.length > 0) {
        sections.push(createHeading2('主要人员'));
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('姓名'),
              createHeaderCell('职务')
            ]
          }),
          ...risk.employees.map((e: any) => new TableRow({
            children: [
              createDataCell(e.name || '-'),
              createDataCell(e.job || '-', { align: 'center' })
            ]
          }))
        ];
        // 两列并排显示，节省空间
        const twoColRows: TableRow[] = [];
        for (let i = 0; i < risk.employees.length; i += 2) {
          const e1 = risk.employees[i];
          const e2 = risk.employees[i + 1];
          twoColRows.push(new TableRow({
            children: [
              createHeaderCell('姓名'),
              createDataCell(e1?.name || '-'),
              createHeaderCell('职务'),
              createDataCell(e1?.job || '-'),
              ...(e2 ? [
                createHeaderCell('姓名'),
                createDataCell(e2.name || '-'),
                createHeaderCell('职务'),
                createDataCell(e2.job || '-')
              ] : [
                new TableCell({ columnSpan: 4, children: [new Paragraph({ children: [new TextRun({ text: '', size: 20 })] })] })
              ])
            ]
          }));
        }
        // 还是用简洁的两列吧
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 3. 工商变更记录（最多10条）
      if (risk.changes?.length > 0) {
        sections.push(createHeading2('工商变更记录'));
        const changeItems = risk.changes.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('变更日期'),
              createHeaderCell('变更事项'),
              createHeaderCell('变更前'),
              createHeaderCell('变更后')
            ]
          }),
          ...changeItems.map((c: any) => new TableRow({
            children: [
              createDataCell(c.changeDate || '-', { align: 'center' }),
              createDataCell(c.projectName || c.changeSubject || '-', { bold: true }),
              createDataCell((c.before || '').substring(0, 60), { size: 18, color: '888888' }),
              createDataCell((c.after || '').substring(0, 60), { size: 18, color: '2b6cb0' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        if (risk.changes.length > 10) {
          sections.push(createParagraph(`（共${risk.changes.length}条变更记录，仅展示前10条）`, { size: 18, color: '999999' }));
        }
      }

      // 4. 对外投资（最多10条）
      if (risk.investments?.length > 0) {
        sections.push(createHeading2('对外投资'));
        const invItems = risk.investments.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('被投资企业'),
              createHeaderCell('持股比例'),
              createHeaderCell('认缴出资'),
              createHeaderCell('状态'),
              createHeaderCell('所属行业')
            ]
          }),
          ...invItems.map((i: any) => new TableRow({
            children: [
              createDataCell(i.name || '-'),
              createDataCell(i.fundedRatio || '-', { align: 'center', bold: true, color: '1a56db' }),
              createDataCell(i.shouldCapi || '-', { align: 'center' }),
              createDataCell(i.status || '-', { align: 'center' }),
              createDataCell(i.industry || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // 5. 分支机构（最多10条）
      if (risk.branches?.length > 0) {
        sections.push(createHeading2('分支机构'));
        const branchItems = risk.branches.slice(0, 10);
        const rows = [
          new TableRow({
            children: [
              createHeaderCell('分支机构名称'),
              createHeaderCell('负责人'),
              createHeaderCell('成立日期'),
              createHeaderCell('登记状态')
            ]
          }),
          ...branchItems.map((b: any) => new TableRow({
            children: [
              createDataCell(b.name || '-'),
              createDataCell(b.operName || '-', { align: 'center' }),
              createDataCell(b.startDate || '-', { align: 'center' }),
              createDataCell(b.status || '-', { align: 'center' })
            ]
          }))
        ];
        sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
      }

      // ===== 二、税务风险信息（重点高亮） =====
      const hasTaxRisk = (risk.taxCreditList?.length > 0) ||
        (risk.taxOweNotice?.totalCount > 0) ||
        (risk.taxIllegal?.totalCount > 0) ||
        (risk.taxAbnormal?.totalCount > 0) ||
        (risk.taxHurry?.totalCount > 0);

      if (hasTaxRisk) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'c53030', space: 4 } },
          children: [new TextRun({ text: '税务风险信息', bold: true, size: 26, color: 'c53030' })]
        }));

        // 纳税信用等级
        if (risk.taxCreditList?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '📊 纳税信用等级', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('评价年度'),
                createHeaderCell('信用等级'),
                createHeaderCell('评价单位')
              ]
            }),
            ...risk.taxCreditList.map((t: any) => new TableRow({
              children: [
                createDataCell(t.year || '-', { align: 'center' }),
                createDataCell(t.level || '-', { align: 'center', bold: true, 
                  color: t.level === 'A' ? '155724' : 
                         t.level === 'B' ? '2b6cb0' :
                         t.level === 'M' ? '856404' :
                         t.level === 'C' ? 'B35A00' :
                         t.level === 'D' ? '721C24' : '333333'
                }),
                createDataCell(t.org || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 欠税公告（红色重点）
        if (risk.taxOweNotice?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚠️ 欠税公告（${risk.taxOweNotice.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('欠税税种'),
                createHeaderCell('欠税金额'),
                createHeaderCell('发布机关'),
                createHeaderCell('发布日期')
              ]
            }),
            ...risk.taxOweNotice.items.slice(0, 10).map((item: any) => new TableRow({
              children: [
                createDataCell(item.title || '-'),
                createDataCell(item.amount || '-', { align: 'center', bold: true, color: 'c53030' }),
                createDataCell(item.publishOffice || '-', { align: 'center' }),
                createDataCell(item.publishDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
          if (risk.taxOweNotice.totalCount > 10) {
            sections.push(createParagraph(`（共${risk.taxOweNotice.totalCount}条，仅展示前10条）`, { size: 18, color: '999999' }));
          }
        }

        // 税收违法（红色重点）
        if (risk.taxIllegal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚨 税收违法（${risk.taxIllegal.totalCount}条）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          risk.taxIllegal.items.slice(0, 5).forEach((item: any, idx: number) => {
            sections.push(createParagraph(
              `【${idx + 1}】${item.caseNature || ''}（${item.taxGov || ''}）`,
              { bold: true, color: '9b2c2c' }
            ));
            if (item.illegalContent) {
              sections.push(createParagraph(`违法事实：${item.illegalContent.substring(0, 200)}`, { size: 19, color: '555555' }));
            }
            if (item.punishContent) {
              sections.push(createParagraph(`处理结果：${item.punishContent.substring(0, 200)}`, { size: 19, color: '9b2c2c' }));
            }
            if (item.publishDate) {
              sections.push(createParagraph(`发布日期：${item.publishDate}`, { size: 18, color: '999999' }));
            }
          });
        }

        // 税务非正常户
        if (risk.taxAbnormal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🔴 税务非正常户（${risk.taxAbnormal.totalCount}条）`, bold: true, size: 22, color: 'c53030' })
          ] }));
          risk.taxAbnormal.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `纳税人识别号：${item.taxNo || '-'} | 认定机关：${item.addOffice || '-'} | 认定日期：${item.addDate || '-'}`,
              { size: 20 }
            ));
          });
        }

        // 税务催缴
        if (risk.taxHurry?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⏰ 税务催缴（${risk.taxHurry.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.taxHurry.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `税种：${item.taxCategory || '-'} | 欠税额：${item.taxOwedAmt || '-'} | 限期：${item.deadlineDate || '-'} | 税务机关：${item.taxAuthority || '-'}`,
              { size: 20 }
            ));
          });
        }
      }

      // ===== 三、监管与司法风险 =====
      const hasLegalRisk = (risk.adminPenalty?.totalCount > 0) ||
        (risk.exception?.totalCount > 0) ||
        (risk.seriousIllegal?.totalCount > 0) ||
        (risk.shiXin?.totalCount > 0) ||
        (risk.zhiXing?.totalCount > 0) ||
        (risk.equityFreeze?.totalCount > 0) ||
        (risk.equityPledge?.totalCount > 0) ||
        (risk.bankruptcy?.totalCount > 0) ||
        (risk.sumptuary?.totalCount > 0) ||
        (risk.envPunishment?.totalCount > 0) ||
        (risk.chattelMortgage?.totalCount > 0) ||
        risk.liquidation ||
        (risk.publicSecurityNotice?.totalCount > 0);

      if (hasLegalRisk) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'c05621', space: 4 } },
          children: [new TextRun({ text: '监管与司法风险信息', bold: true, size: 26, color: 'c05621' })]
        }));

        // 行政处罚
        if (risk.adminPenalty?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `⚖️ 行政处罚（${risk.adminPenalty.totalCount}条 / 涉案金额约${risk.adminPenalty.totalAmount || '0'}万元）`, bold: true, size: 22, color: 'c05621' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('处罚日期'),
                createHeaderCell('处罚事由'),
                createHeaderCell('处罚结果'),
                createHeaderCell('处罚机关')
              ]
            }),
            ...risk.adminPenalty.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.date || '-', { align: 'center' }),
                createDataCell((item.reason || '').substring(0, 50), { size: 19 }),
                createDataCell((item.result || '').substring(0, 50) || item.amount + '元', { size: 19, color: 'c05621' }),
                createDataCell((item.office || '').substring(0, 20), { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
          if (risk.adminPenalty.totalCount > 5) {
            sections.push(createParagraph(`（共${risk.adminPenalty.totalCount}条，仅展示前5条）`, { size: 18, color: '999999' }));
          }
        }

        // 经营异常
        if (risk.exception?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚠️ 经营异常（${risk.exception.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('列入日期'),
                createHeaderCell('列入原因'),
                createHeaderCell('列入机关')
              ]
            }),
            ...risk.exception.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.addDate || '-', { align: 'center' }),
                createDataCell(item.addReason || '-'),
                createDataCell(item.addOffice || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 严重违法
        if (risk.seriousIllegal?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚫 严重违法失信（${risk.seriousIllegal.totalCount}条）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          risk.seriousIllegal.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.addReason || ''}（${item.addOffice || ''}，${item.addDate || ''}）`,
              { size: 20 }
            ));
          });
        }

        // 失信被执行人
        if (risk.shiXin?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⛔ 失信被执行人（${risk.shiXin.totalCount}条 / 涉案金额约${risk.shiXin.totalAmount || '0'}万元）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('案号'),
                createHeaderCell('执行法院'),
                createHeaderCell('涉案金额'),
                createHeaderCell('履行情况')
              ]
            }),
            ...risk.shiXin.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell((item.caseNo || '').substring(0, 30), { size: 18 }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.amount ? item.amount + '元' : '-', { align: 'center', bold: true, color: '9b2c2c' }),
                createDataCell(item.executeStatus || '-', { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 被执行人
        if (risk.zhiXing?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `📋 被执行人（${risk.zhiXing.totalCount}条 / 涉案金额约${risk.zhiXing.totalAmount || '0'}万元）`, bold: true, size: 22, color: 'c05621' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('案号'),
                createHeaderCell('执行法院'),
                createHeaderCell('执行标的'),
                createHeaderCell('立案日期')
              ]
            }),
            ...risk.zhiXing.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell((item.caseNo || '').substring(0, 30), { size: 18 }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.biaoDi ? item.biaoDi + '元' : '-', { align: 'center' }),
                createDataCell(item.registerDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 股权冻结
        if (risk.equityFreeze?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `❄️ 股权冻结（${risk.equityFreeze.totalCount}条）`, bold: true, size: 22, color: 'c05621' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('被执行人'),
                createHeaderCell('冻结股权数额'),
                createHeaderCell('执行法院'),
                createHeaderCell('冻结期限')
              ]
            }),
            ...risk.equityFreeze.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.beExecuted || '-'),
                createDataCell(item.equityAmount || '-', { align: 'center', bold: true }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell((item.freezeStartDate || '') + ' ~ ' + (item.freezeEndDate || ''), { align: 'center', size: 18 })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 破产重整
        if (risk.bankruptcy?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `💀 破产重整（${risk.bankruptcy.totalCount}条）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          risk.bankruptcy.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.caseNo || ''} | 申请人：${item.applicantList || '-'} | 被申请人：${item.respondentList || '-'} | ${item.publicDate || ''}`,
              { size: 20 }
            ));
          });
        }

        // 限制高消费
        if (risk.sumptuary?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🚫 限制高消费（${risk.sumptuary.totalCount}条）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          const rows = [
            new TableRow({
              children: [
                createHeaderCell('涉案主体'),
                createHeaderCell('关联人员'),
                createHeaderCell('执行法院'),
                createHeaderCell('发布日期')
              ]
            }),
            ...risk.sumptuary.items.slice(0, 5).map((item: any) => new TableRow({
              children: [
                createDataCell(item.companyName || '-'),
                createDataCell(item.relatedName || '-', { align: 'center' }),
                createDataCell((item.executeCourt || '').substring(0, 20), { align: 'center', size: 18 }),
                createDataCell(item.publicDate || '-', { align: 'center' })
              ]
            }))
          ];
          sections.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
        }

        // 环保处罚
        if (risk.envPunishment?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🌿 环保处罚（${risk.envPunishment.totalCount}条）`, bold: true, size: 22, color: '276749' })
          ] }));
          risk.envPunishment.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.reason?.substring(0, 80) || ''}（处罚：${item.result?.substring(0, 50) || item.amount + '元'}，${item.office || ''}，${item.date || ''}）`,
              { size: 19 }
            ));
          });
        }

        // 股权出质
        if (risk.equityPledge?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `📌 股权出质（${risk.equityPledge.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.equityPledge.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• 出质人：${item.pledgorList || '-'} | 质权人：${item.pledgeeList || '-'} | 数额：${item.pledgedAmount || '-'} | 状态：${item.status || '-'} | 登记日期：${item.registerDate || ''}`,
              { size: 19 }
            ));
          });
        }

        // 动产抵押
        if (risk.chattelMortgage?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `🏭 动产抵押（${risk.chattelMortgage.totalCount}条）`, bold: true, size: 22, color: 'd69e2e' })
          ] }));
          risk.chattelMortgage.items.slice(0, 5).forEach((item: any) => {
            sections.push(createParagraph(
              `• 登记号：${item.registerNo || '-'} | 担保债权：${item.secureClaimsAmount || '-'} | 抵押人：${item.pledgor || '-'} | 状态：${item.status || '-'} | 期限：${item.debtTerm || ''}`,
              { size: 19 }
            ));
          });
        }

        // 清算信息
        if (risk.liquidation) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `⚰️ 清算信息`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          sections.push(createInfoRow('清算组负责人', risk.liquidation.leader || '-'));
          sections.push(createInfoRow('清算组成员', risk.liquidation.member || '-'));
        }

        // 公安通告
        if (risk.publicSecurityNotice?.totalCount > 0) {
          sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
            new TextRun({ text: `👮 公安通告（${risk.publicSecurityNotice.totalCount}条）`, bold: true, size: 22, color: '9b2c2c' })
          ] }));
          risk.publicSecurityNotice.items.slice(0, 3).forEach((item: any) => {
            sections.push(createParagraph(
              `• ${item.name || ''}：${item.caseReason || ''}（${item.publishOffice || ''}，${item.publishDate || ''}）`,
              { size: 20 }
            ));
          });
        }
      }

      // ===== 四、其他信息 =====
      const hasOtherInfo = (risk.tags?.length > 0) ||
        (risk.adminLicenses?.length > 0) ||
        (risk.approveSites?.length > 0) ||
        risk.financialInformation ||
        (risk.beneficiaries?.length > 0) ||
        (risk.actualControllers?.length > 0) ||
        risk.parent ||
        risk.groupInfo ||
        (risk.mainProducts?.length > 0);

      if (hasOtherInfo) {
        sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        sections.push(new Paragraph({
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2b6cb0', space: 4 } },
          children: [new TextRun({ text: '其他信息', bold: true, size: 26, color: '2b6cb0' })]
        }));

        // 企业标签
        if (risk.tags?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 50 }, children: [
            new TextRun({ text: '🏷️ 企业标签：', bold: true, size: 20, color: '555555' }),
            new TextRun({ text: risk.tags.join(' | '), size: 20, color: '2b6cb0' })
          ] }));
        }

        // 受益所有人
        if (risk.beneficiaries?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '👤 受益所有人', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.beneficiaries.slice(0, 5).forEach((b: any) => {
            sections.push(createParagraph(
              `• ${b.name || '-'} | 最终受益股份：${b.finalBenefitPercent || '-'}${b.reason ? ` | 判定理由：${b.reason.substring(0, 50)}` : ''}`,
              { size: 19 }
            ));
          });
        }

        // 实际控制人
        if (risk.actualControllers?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: '🎯 实际控制人', bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.actualControllers.slice(0, 5).forEach((a: any) => {
            sections.push(createParagraph(
              `• ${a.name || ''}（${a.isActual === '1' ? '实际控制人' : '疑似实际控制人'}）| 持股：${a.finalBenefitPercent || '-'} | 表决权：${a.controlPercent || '-'}`,
              { size: 19 }
            ));
          });
        }

        // 总公司
        if (risk.parent) {
          sections.push(createInfoRow('总公司', `${risk.parent.name || '-'}（${risk.parent.status || '-'}，注册资本：${risk.parent.registCapi || '-'}）`));
        }

        // 所属集团
        if (risk.groupInfo?.name) {
          sections.push(createInfoRow('所属集团', risk.groupInfo.name));
        }

        // 行政许可
        if (risk.adminLicenses?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `📜 行政许可（${risk.adminLicenses.length}条）`, bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.adminLicenses.slice(0, 5).forEach((a: any) => {
            sections.push(createParagraph(
              `• ${a.docName || a.docNo || ''}（${a.office || ''}）：有效期${a.validityFrom || '-'}至${a.validityTo || '-'}`,
              { size: 19 }
            ));
          });
        }

        // 财务数据（2006只有一条简要数据）
        if (risk.financialInformation) {
          sections.push(createHeading2('公开财务数据'));
          sections.push(createInfoRow('数据科目', risk.financialInformation.accountTitle || '-'));
          sections.push(createInfoRow('数额', risk.financialInformation.amount || '-'));
          sections.push(createInfoRow('年份', risk.financialInformation.year || '-'));
          sections.push(createParagraph('数据来源：企业公开披露信息，仅供参考', { size: 18, color: '999999' }));
        }

        // 主营产品
        if (risk.mainProducts?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 50 }, children: [
            new TextRun({ text: '📦 主营产品：', bold: true, size: 20, color: '555555' }),
            new TextRun({ text: risk.mainProducts.slice(0, 5).join('、'), size: 20, color: '333333' })
          ] }));
        }

        // 备案网站
        if (risk.approveSites?.length > 0) {
          sections.push(new Paragraph({ spacing: { before: 200, after: 100 }, children: [
            new TextRun({ text: `🌐 备案网站（${risk.approveSites.length}个）`, bold: true, size: 22, color: '2b6cb0' })
          ] }));
          risk.approveSites.slice(0, 5).forEach((s: any) => {
            sections.push(createParagraph(
              `• ${s.name || '-'}：${s.webAddress || ''}（${s.licenseNo || ''}）`,
              { size: 19 }
            ));
          });
        }
      }

      // 数据来源说明
      if (sections.length > 0) {
        sections.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [
          new TextRun({ text: '※ 以上工商及风险数据来源于企查查公开信息，仅供参考，具体以官方公示为准。', italics: true, size: 18, color: '999999' })
        ] }));
      }

      return sections;
    }

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
              rows: buildBusinessInfoRows(businessInfo)
            })
          ] : []),

          // 2006风险扫描扩展模块（仅2006格式有数据时显示）
          ...(riskScanData ? buildRiskScanSections(riskScanData) : []),

          // 年报信息（如果有，410+213格式）
          ...(annualReport ? [
            createHeading2(`年报数据（${annualReport.year || '最新'}）`),
            createParagraph(`数据来源：企业工商公示年报，发布日期：${annualReport.publishDate || '未公示'}`, { size: 18, color: '888888' }),

            // 年报财务数据
            ...(hasAnnualFinancialData(annualReport) ? [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: buildAnnualFinanceRows(annualReport)
              })
            ] : []),

            // 股东出资信息
            ...(annualReport.partners && annualReport.partners.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('股东及出资信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('股东名称'),
                      createHeaderCell('认缴出资额'),
                      createHeaderCell('认缴时间'),
                      createHeaderCell('实缴出资额'),
                      createHeaderCell('实缴时间')
                    ]
                  }),
                  ...annualReport.partners.map((p: any) => new TableRow({
                    children: [
                      createDataCell(p.name || '-'),
                      createDataCell(p.shouldCapi ? p.shouldCapi + '万元' : '-', { align: 'center' }),
                      createDataCell(p.shouldDate || '-', { align: 'center' }),
                      createDataCell(p.realCapi ? p.realCapi + '万元' : '-', { align: 'center' }),
                      createDataCell(p.realDate || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 社保缴纳信息
            ...(hasSocialInsuranceData(annualReport.socialInsurance) ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('社保缴纳信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: buildAnnualSocialRows(annualReport.socialInsurance)
              })
            ] : []),

            // 对外投资信息
            ...(annualReport.investments && annualReport.investments.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('对外投资信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('序号'),
                      createHeaderCell('被投资企业名称'),
                      createHeaderCell('统一社会信用代码/注册号')
                    ]
                  }),
                  ...annualReport.investments.map((inv: any, idx: number) => new TableRow({
                    children: [
                      createDataCell(String(idx + 1), { align: 'center' }),
                      createDataCell(inv.name || '-'),
                      createDataCell(inv.regNo || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 股权变更信息
            ...(annualReport.stockChanges && annualReport.stockChanges.length > 0 ? [
              new Paragraph({ spacing: { before: 300, after: 100 }, children: [] }),
              createHeading2('股权变更信息'),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      createHeaderCell('股东'),
                      createHeaderCell('变更前比例'),
                      createHeaderCell('变更后比例'),
                      createHeaderCell('变更日期')
                    ]
                  }),
                  ...annualReport.stockChanges.map((s: any) => new TableRow({
                    children: [
                      createDataCell(s.name || '-'),
                      createDataCell(s.before || '-', { align: 'center' }),
                      createDataCell(s.after || '-', { align: 'center' }),
                      createDataCell(s.changeDate || '-', { align: 'center' })
                    ]
                  }))
                ]
              })
            ] : []),

            // 从业人数等补充信息
            ...(annualReport.employeeCount && annualReport.employeeCount !== '企业选择不公示' ? [
              new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),
              createInfoRow('从业人数', annualReport.employeeCount)
            ] : [])
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
