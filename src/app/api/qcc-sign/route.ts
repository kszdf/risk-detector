import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

// 企查查API配置（与其他接口保持一致）
function cleanEnvKey(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  if (/^[a-fA-F0-9]{32}$/.test(trimmed)) return trimmed;
  return fallback;
}

const QCC_APP_KEY = cleanEnvKey(process.env.QCC_APP_KEY, 'af2b3e9c39a64a2c9a926e102545adcd');
const QCC_SECRET_KEY = cleanEnvKey(process.env.QCC_SECRET_KEY, 'CABF5EE954826B72B15A7D7DE41979D9');

// 生成企查查API签名Token
function generateQccToken() {
  const timespan = Math.floor(Date.now() / 1000).toString();
  const token = crypto.createHash('md5')
    .update(QCC_APP_KEY + timespan + QCC_SECRET_KEY)
    .digest('hex')
    .toUpperCase();
  return { token, timespan, appKey: QCC_APP_KEY };
}

export async function GET(request: NextRequest) {
  try {
    const { token, timespan, appKey } = generateQccToken();
    
    return NextResponse.json({
      success: true,
      token,
      timespan,
      appKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
