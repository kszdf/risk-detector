import { NextResponse } from 'next/server';
import crypto from 'crypto';

function cleanEnvKey(val, fallback) {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return trimmed;
  return fallback;
}

const QCC_APP_KEY = cleanEnvKey(process.env.QCC_APP_KEY, 'af2b3e9c39a64a2c9a926e102545adcd');
const QCC_SECRET_KEY = cleanEnvKey(process.env.QCC_SECRET_KEY, 'CABF5EE954826B72B15A7D7DE41979D9');
const QCC_BASE_URL = 'https://api.qichacha.com';

// 生成企查查API签名Token
function generateToken() {
  const timespan = Math.floor(Date.now() / 1000).toString();
  const tokenStr = QCC_APP_KEY + timespan + QCC_SECRET_KEY;
  const token = crypto.createHash('md5').update(tokenStr).digest('hex').toUpperCase();
  return { token, timespan };
}

// 调用企查查API - 企业工商信息 (ApiCode 410)
export async function getCompanyBasicInfo(keyword) {
  if (!keyword) return null;
  
  const { token, timespan } = generateToken();
  
  const url = new URL(`${QCC_BASE_URL}/ECIV4/GetBasicDetailsByName`);
  url.searchParams.append('key', QCC_APP_KEY);
  url.searchParams.append('keyword', keyword);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Token': token,
        'Timespan': timespan,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.Status === '200' && data.Result) {
      const r = data.Result;
      return {
        name: r.Name,
        creditCode: r.CreditCode,
        operName: r.OperName,
        startDate: r.StartDate,
        status: r.Status,
        registCapi: r.RegistCapi,
        econKind: r.EconKind,
        address: r.Address,
        scope: r.Scope,
        termStart: r.TermStart,
        termEnd: r.TermEnd,
        belongOrg: r.BelongOrg,
        checkDate: r.CheckDate,
        isOnStock: r.IsOnStock,
        entType: r.EntType,
        recCap: r.RecCap,
        province: r.Province,
        areaCode: r.AreaCode,
        area: r.Area,
        imageUrl: r.ImageUrl,
        source: '企查查'
      };
    }
    return null;
  } catch (error) {
    console.error('企查查API调用失败:', error.message);
    return null;
  }
}

// 调用企查查API - 企业模糊搜索 (ApiCode 886)
export async function searchCompany(keyword, pageSize = 5) {
  if (!keyword || keyword.length < 2) return [];
  
  const { token, timespan } = generateToken();
  
  const url = new URL(`${QCC_BASE_URL}/FuzzySearch/GetList`);
  url.searchParams.append('key', QCC_APP_KEY);
  url.searchParams.append('searchKey', keyword);
  url.searchParams.append('pageSize', pageSize);
  url.searchParams.append('pageIndex', 1);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Token': token,
        'Timespan': timespan
      }
    });

    const data = await response.json();
    
    if (data.Status === '200' && data.Result) {
      return data.Result.map(item => ({
        keyNo: item.KeyNo,
        name: item.Name,
        creditCode: item.CreditCode,
        startDate: item.StartDate,
        operName: item.OperName,
        status: item.Status,
        no: item.No,
        address: item.Address
      }));
    }
    return [];
  } catch (error) {
    console.error('企查查搜索失败:', error.message);
    return [];
  }
}

// 统一查询入口：先模糊搜索拿信用代码，再用代码精确查详情
async function getCompanyInfoByKeyword(keyword) {
  if (!keyword || keyword.length < 2) return null;

  // 如果关键词本身就是18位统一信用代码，直接查详情
  if (/^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(keyword)) {
    return await getCompanyBasicInfo(keyword);
  }

  // 第一步：模糊搜索找最匹配的企业，拿信用代码
  const searchResults = await searchCompany(keyword, 1);
  if (searchResults && searchResults.length > 0 && searchResults[0].creditCode) {
    // 第二步：用18位统一信用代码精确查询详情
    const detail = await getCompanyBasicInfo(searchResults[0].creditCode);
    if (detail) return detail;
  }

  // 兜底：直接用关键词试一次
  return await getCompanyBasicInfo(keyword);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword');
  const action = searchParams.get('action') || 'detail';

  if (!keyword) {
    return NextResponse.json({ error: '请提供企业名称或统一社会信用代码' }, { status: 400 });
  }

  if (action === 'search') {
    const results = await searchCompany(keyword);
    return NextResponse.json({ success: true, data: results });
  }

  // 默认查询详情：走信用代码精确查询逻辑
  const detail = await getCompanyInfoByKeyword(keyword);
  if (detail) {
    return NextResponse.json({ success: true, data: detail });
  } else {
    return NextResponse.json({ error: '未找到该企业信息' }, { status: 404 });
  }
}
