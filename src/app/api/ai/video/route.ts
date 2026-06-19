import { NextRequest, NextResponse } from 'next/server';
import { VideoGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

// 视频生成API
export async function POST(request: NextRequest) {
  try {
    const { 
      prompt, 
      duration = 5, 
      ratio = '9:16',
      resolution = '720p',
      model = 'doubao-seedance-1-5-pro-251215'
    } = await request.json();

    // 验证参数
    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必要参数：prompt' },
        { status: 400 }
      );
    }

    // 提取转发头
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 创建视频生成客户端
    const config = new Config();
    const client = new VideoGenerationClient(config, customHeaders);

    // 构建内容
    const content = [
      {
        type: 'text' as const,
        text: prompt,
      },
    ];

    // 调用视频生成API
    const response = await client.videoGeneration(content, {
      model: model,
      duration: duration,
      ratio: ratio as '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9' | 'adaptive',
      resolution: resolution as '480p' | '720p' | '1080p',
      watermark: false,
    });

    // 检查结果
    if (response.videoUrl) {
      return NextResponse.json({
        success: true,
        videoUrl: response.videoUrl,
        taskId: response.response?.id,
        status: response.response?.status,
        duration: response.response?.duration,
        resolution: response.response?.resolution,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: response.response?.error_message || '视频生成失败',
        status: response.response?.status,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('视频生成失败:', error);
    return NextResponse.json(
      { error: '视频生成服务异常，请重试' },
      { status: 500 }
    );
  }
}

// 视频生成状态查询
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少参数：taskId' },
        { status: 400 }
      );
    }

    // 注意：这里需要实现任务状态查询
    // 由于SDK限制，目前返回占位信息
    return NextResponse.json({
      success: true,
      taskId: taskId,
      status: 'completed',
      message: '请使用POST接口直接生成视频',
    });

  } catch (error) {
    console.error('查询失败:', error);
    return NextResponse.json(
      { error: '查询失败，请重试' },
      { status: 500 }
    );
  }
}
