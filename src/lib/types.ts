// 选题类型
export interface Topic {
  id: string;
  title: string;
  account: 'main' | 'secondary';
  types: string[];
  duration: number;
  heatIndex: number;
  scene: string;
  createdAt: string;
}

// 脚本段落
export interface ScriptSegment {
  timeStart: string;
  timeEnd: string;
  content: string;
  emotion: string;
  isHook: boolean;
}

// 脚本类型
export interface Script {
  id: string;
  topicId: string;
  topicTitle: string;
  segments: ScriptSegment[];
  duration: number;
  style: string[];
  hookPhrase: string;
  cta: string;
  createdAt: string;
}

// 视频记录类型
export interface VideoRecord {
  id: string;
  title: string;
  publishDate: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  privateConversions: number;
  createdAt: string;
}

// 数字人配置
export interface DigitalHuman {
  id: string;
  name: string;
  avatar: string;
}

// 视频生产任务
export interface VideoProductionTask {
  id: string;
  scriptId: string;
  scriptTitle: string;
  digitalHumanId: string;
  digitalHumanName: string;
  background: string;
  subtitleStyle: string;
  bgm: string;
  bgmVolume: number;
  scheduledDate: string;
  status: 'pending' | 'processing' | 'completed';
}

// 评论回复规则
export interface CommentReplyRule {
  id: string;
  keywords: string[];
  replyTemplate: string;
  priority: number;
}

// 私信话术
export interface PrivateMessage {
  id: string;
  stage: 'first' | 'follow' | 'conversion';
  content: string;
}

// 客户分层
export interface CustomerTier {
  id: string;
  name: string;
  description: string;
  criteria: string[];
  color: string;
}

// 产品转化话术
export interface ProductPitch {
  id: string;
  productName: string;
  productType: string;
  pitchContent: string;
  painPoint: string;
  benefit: string;
}

// 导航模块
export type ModuleType = 'topics' | 'scripts' | 'production' | 'analytics' | 'operations';

export interface NavItem {
  id: ModuleType;
  name: string;
  icon: string;
  color: string;
  description: string;
}
