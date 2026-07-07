import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

function cleanEnvKey(val, fallback) {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return trimmed;
  return fallback;
}

const QCC_APP_KEY = cleanEnvKey(process.env.QCC_APP_KEY, 'af2b3e9c39a64a2c9a926e102545adcd');
const QCC_SECRET_KEY = cleanEnvKey(process.env.QCC_SECRET_KEY, 'CABF5EE954826B72B15A7D7DE41979D9');
const QCC_BASE_URL = 'https://api.qichacha.com';

function generateToken() {
  const timespan = Math.floor(Date.now() / 1000).toString();
  const token = crypto.createHash('md5').update(QCC_APP_KEY + timespan + QCC_SECRET_KEY).digest('hex').toUpperCase();
  return { token, timespan };
}

// 带重试的企查查调用（Vercel海外IP不稳定，多次重试提高成功率）
async function fetchQccWithRetry(keyword, maxRetries = 3) {
  let lastResult = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { token, timespan } = generateToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const url = new URL(`${QCC_BASE_URL}/ECIV4/GetBasicDetailsByName`);
      url.searchParams.append('key', QCC_APP_KEY);
      url.searchParams.append('keyword', keyword);
      url.searchParams.append('dtype', 'json');
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Token: token, Timespan: timespan },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      // 成功或业务错误（非网络错误）都返回
      if (data && data.Status) {
        return data;
      }
      lastResult = data;
    } catch (e) {
      lastResult = { Status: '999', Message: `网络错误: ${e.message}`, Result: null };
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  return lastResult || { Status: '999', Message: '查询失败', Result: null };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  
  if (!keyword || keyword.length < 2) {
    return NextResponse.json({
      Status: '100',
      Message: '关键词不能为空或太短',
      Result: null
    });
  }
  
  const result = await fetchQccWithRetry(keyword, 3);
  
  // 直接返回原始JSON格式，让飞书直接存到工商信息字段
  return NextResponse.json(result);
}
