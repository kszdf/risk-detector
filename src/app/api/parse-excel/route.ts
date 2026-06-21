import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ParsedFinancialData {
  years: string[];
  revenue?: number;
  cost?: number;
  profit?: number;
  vatPaid?: number;
  incomeTaxPaid?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  receivables?: number;
  advanceReceipts?: number;
  grossMargin?: number;
  netMargin?: number;
  vatRate?: number;
  citRate?: number;
  debtRatio?: number;
}

interface ParseResult {
  success: boolean;
  data?: ParsedFinancialData;
  year?: string;
  reportType?: string;
  error?: string;
}

function findValueByKeywords(row: string[], keywords: string[]): number | undefined {
  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i] || '').trim();
    for (const keyword of keywords) {
      if (cell.includes(keyword)) {
        // 尝试从右侧单元格获取值
        if (i + 1 < row.length) {
          const value = row[i + 1];
          if (typeof value === 'number') return value;
          const numStr = String(value).replace(/[,\s]/g, '').replace(/%/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num)) return num;
        }
        // 尝试从左侧单元格获取值
        if (i > 0) {
          const value = row[i - 1];
          if (typeof value === 'number') return value;
          const numStr = String(value).replace(/[,\s]/g, '').replace(/%/g, '');
          const num = parseFloat(numStr);
          if (!isNaN(num)) return num;
        }
      }
    }
  }
  return undefined;
}

function findYearInRow(row: string[]): string | undefined {
  for (const cell of row) {
    const str = String(cell || '').trim();
    // 匹配4位数年份
    const match = str.match(/\b(19|20)\d{2}\b/);
    if (match) return match[0];
    // 匹配 2023年 格式
    const yearMatch = str.match(/(19|20)\d{2}年/);
    if (yearMatch) return yearMatch[0].replace('年', '');
  }
  return undefined;
}

async function parseExcelFile(buffer: Buffer): Promise<ParseResult[]> {
  // 动态导入 xlsx
  const xlsx = require('xlsx');
  
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const results: ParseResult[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      if (!jsonData || jsonData.length === 0) continue;
      
      // 尝试识别报表类型
      let reportType = 'unknown';
      let year: string | undefined;
      const data: ParsedFinancialData = { years: [] };
      
      for (const row of jsonData) {
        if (!row || row.length === 0) continue;
        
        // 识别报表类型
        if (reportType === 'unknown') {
          const rowText = row.join(' ');
          
          if (rowText.includes('利润表') || rowText.includes('损益表')) {
            reportType = 'income_statement';
          } else if (rowText.includes('资产负债表') || rowText.includes('财务状况')) {
            reportType = 'balance_sheet';
          } else if (rowText.includes('增值税') && rowText.includes('申报')) {
            reportType = 'vat_return';
          } else if (rowText.includes('所得税') && rowText.includes('申报')) {
            reportType = 'cit_return';
          }
        }
        
        // 提取年份
        if (!year) {
          year = findYearInRow(row);
          if (year) data.years.push(year);
        }
        
        // 提取财务数据
        // 利润表字段
        const revenueVal = findValueByKeywords(row, ['营业收入', '主营业务收入', '销售商品、提供劳务收到的现金']);
        if (revenueVal !== undefined && data.revenue === undefined) data.revenue = revenueVal;
        
        const costVal = findValueByKeywords(row, ['营业成本', '主营业务成本', '销售商品、提供劳务支付的现金']);
        if (costVal !== undefined && data.cost === undefined) data.cost = costVal;
        
        const profitVal = findValueByKeywords(row, ['利润总额', '净利润', '营业利润']);
        if (profitVal !== undefined && data.profit === undefined) data.profit = profitVal;
        
        // 资产负债表字段
        const assetsVal = findValueByKeywords(row, ['资产总计', '资产合计', '所有者权益合计']);
        if (assetsVal !== undefined && data.totalAssets === undefined) data.totalAssets = assetsVal;
        
        const liabilitiesVal = findValueByKeywords(row, ['负债合计', '负债总计', '流动负债合计']);
        if (liabilitiesVal !== undefined && data.totalLiabilities === undefined) data.totalLiabilities = liabilitiesVal;
        
        const receivablesVal = findValueByKeywords(row, ['应收账款', '应收款项']);
        if (receivablesVal !== undefined && data.receivables === undefined) data.receivables = receivablesVal;
        
        const advanceVal = findValueByKeywords(row, ['预收账款', '预收款项', '合同负债']);
        if (advanceVal !== undefined && data.advanceReceipts === undefined) data.advanceReceipts = advanceVal;
        
        // 增值税申报表字段
        const vatVal = findValueByKeywords(row, ['应纳增值税', '已交增值税', '本期应交', '实缴增值税']);
        if (vatVal !== undefined && data.vatPaid === undefined) data.vatPaid = vatVal;
        
        // 所得税申报表字段
        const citVal = findValueByKeywords(row, ['应纳所得税', '本期应纳', '实缴所得税', '实际已预缴']);
        if (citVal !== undefined && data.incomeTaxPaid === undefined) data.incomeTaxPaid = citVal;
      }
      
      if (reportType !== 'unknown' && year) {
        results.push({
          success: true,
          data,
          year,
          reportType
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Excel解析失败:', error);
    return [{
      success: false,
      error: error instanceof Error ? error.message : '解析失败'
    }];
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 });
    }
    
    const allResults: ParseResult[] = [];
    
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const results = await parseExcelFile(buffer);
      allResults.push(...results);
    }
    
    // 合并同一年份的数据
    const mergedData: Record<string, ParsedFinancialData> = {};
    
    for (const result of allResults) {
      if (!result.success || !result.data || !result.year) continue;
      
      const year = result.year;
      if (!mergedData[year]) {
        mergedData[year] = { years: [year] };
      }
      
      const data = result.data;
      if (data.revenue !== undefined) mergedData[year].revenue = data.revenue;
      if (data.cost !== undefined) mergedData[year].cost = data.cost;
      if (data.profit !== undefined) mergedData[year].profit = data.profit;
      if (data.vatPaid !== undefined) mergedData[year].vatPaid = data.vatPaid;
      if (data.incomeTaxPaid !== undefined) mergedData[year].incomeTaxPaid = data.incomeTaxPaid;
      if (data.totalAssets !== undefined) mergedData[year].totalAssets = data.totalAssets;
      if (data.totalLiabilities !== undefined) mergedData[year].totalLiabilities = data.totalLiabilities;
      if (data.receivables !== undefined) mergedData[year].receivables = data.receivables;
      if (data.advanceReceipts !== undefined) mergedData[year].advanceReceipts = data.advanceReceipts;
      
      // 自动计算指标
      if (mergedData[year].revenue && mergedData[year].cost) {
        mergedData[year].grossMargin = 
          ((mergedData[year].revenue! - mergedData[year].cost!) / mergedData[year].revenue!) * 100;
      }
      if (mergedData[year].revenue && mergedData[year].profit) {
        mergedData[year].netMargin = (mergedData[year].profit! / mergedData[year].revenue!) * 100;
      }
      if (mergedData[year].revenue && mergedData[year].vatPaid) {
        mergedData[year].vatRate = (mergedData[year].vatPaid! / mergedData[year].revenue!) * 100;
      }
      if (mergedData[year].revenue && mergedData[year].incomeTaxPaid) {
        mergedData[year].citRate = (mergedData[year].incomeTaxPaid! / mergedData[year].revenue!) * 100;
      }
      if (mergedData[year].totalAssets && mergedData[year].totalLiabilities) {
        mergedData[year].debtRatio = (mergedData[year].totalLiabilities! / mergedData[year].totalAssets!) * 100;
      }
    }
    
    // 按年份排序（最新在前）
    const sortedYears = Object.keys(mergedData).sort((a, b) => parseInt(b) - parseInt(a));
    const parsedData = sortedYears.map(year => mergedData[year]);
    
    return NextResponse.json({
      success: true,
      data: parsedData,
      years: sortedYears,
      totalFiles: files.length,
      parsedSheets: allResults.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('解析请求失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '服务器错误'
    }, { status: 500 });
  }
}
