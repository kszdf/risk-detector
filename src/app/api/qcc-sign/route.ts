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
function generateQccToken(inputTimespan?: string | null) {
  const timespan = inputTimespan || Math.floor(Date.now() / 1000).toString();
  const token = crypto.createHash('md5')
    .update(QCC_APP_KEY + timespan + QCC_SECRET_KEY)
    .digest('hex')
    .toUpperCase();
  return { token, timespan, appKey: QCC_APP_KEY };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const field = searchParams.get('field');
    const inputTimespan = searchParams.get('timespan');

    const { token, timespan, appKey } = generateQccToken(inputTimespan);

    // 单字段纯文本返回：飞书自动化直接引用body，无需截取
    // ?field=timespan → 返回10位时间戳
    // ?field=token&timespan=xxx → 根据指定timespan计算token，返回32位
    // ?field=debug&timespan=xxx → 调试用，返回接收到的参数和计算结果
    if (field === 'debug') {
      return NextResponse.json({
        received_timespan: inputTimespan,
        received_timespan_length: inputTimespan?.length,
        received_timespan_encoded: encodeURIComponent(inputTimespan || ''),
        calculated_token: token,
        calculated_token_length: token.length,
        app_key: QCC_APP_KEY,
      });
    }
    if (field === 'token') {
      return new NextResponse(token, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    if (field === 'timespan') {
      return new NextResponse(timespan, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 纯文本格式：前32位token + 后10位timespan，方便飞书用LEFT/RIGHT截取
    if (format === 'simple') {
      return new NextResponse(token + timespan, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // 飞书专用格式：返回JSON字符串（顶层就是字符串），飞书JSON格式下body是纯文本
    // 飞书用 LEFT([步骤返回值].body, 32) 取token，RIGHT([步骤返回值].body, 10) 取timespan
    if (format === 'feishu') {
      return new NextResponse(JSON.stringify(token + timespan), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
