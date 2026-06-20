// 账号类型
export type AccountType = 'main' | 'secondary';

// 选题类型（按账号区分）
export type MainTopicType = 'risk-trigger' | 'case-analysis' | 'policy-interpret' | 'course-attract';
export type SecondaryTopicType = 'register-avoid' | 'process-science' | 'startup-remind' | 'agency-common';
export type TopicType = MainTopicType | SecondaryTopicType;

// 内容框架类型
export type ContentFramework = 'B' | 'A' | 'C' | 'D'; // B=注册入口, A=代账留存, C=税筹利润, D=课程杠杆

// 目标人群
export type TargetAudience = 'startup' | 'small-biz' | 'medium-biz' | 'founder' | 'cfo';

// 选题状态
export type TopicStatus = 'unused' | 'in-use' | 'discarded';

// 选题
export interface Topic {
  id: string;
  title: string;
  account: AccountType;
  accountName: string;
  type: TopicType;
  typeName: string;
  framework?: ContentFramework;
  coreContent?: string;
  targetAudience: TargetAudience | string;
  targetAudienceName?: string;
  hookPhrase: string; // 自诊钩子格式：打XX发你XX
  conversionPath: string; // 预估转化路径
  status: TopicStatus;
  duration?: number;
  heatIndex?: number;
  source?: string; // 爆款来源
  sourceLabel?: string; // 爆款来源标签
  createdAt: string;
}

// 脚本段落
export interface ScriptSegment {
  timeStart: string;
  timeEnd: string;
  action: string; // 画面动作
  content: string; // 口播文案
  emotion: string;
  isHook: boolean;
  isEmpathy: boolean;
  isCore: boolean;
  isSelfCheck: boolean;
  isCTA: boolean;
}

// 脚本
export interface Script {
  id: string;
  topicId: string;
  topicTitle: string;
  account: AccountType;
  accountName: string;
  segments: ScriptSegment[];
  duration: number;
  style: string;
  hookPhrase: string;
  cta: string;
  createdAt: string;
}

// 数字人配置
export interface DigitalHuman {
  id: string;
  name: string;
  avatar: string;
  provider: 'tencent' | 'guiji' | 'shanjian';
  recommended: boolean;
}

// 视频生产任务
export interface VideoProductionTask {
  id: string;
  scriptId: string;
  scriptTitle: string;
  digitalHumanId: string;
  digitalHumanName: string;
  digitalHumanProvider: string;
  subtitleStyle: string;
  bgmName: string;
  bgmVolume: number;
  scheduledDate: string;
  scheduledTime: string;
  status: 'draft' | 'submitted' | 'rendering' | 'review' | 'exported';
  notes: string;
  createdAt: string;
}

// 视频数据记录
export interface VideoRecord {
  id: string;
  title: string;
  account: AccountType;
  contentType: TopicType;
  framework: ContentFramework;
  publishDate: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  keywordTriggers: number; // 关键词触发数
  privateConsults: number; // 私信咨询量
  materialsSent: number; // 资料发放量
  deepConsults: number; // 深度咨询量
  transactions: number; // 成交量
  createdAt: string;
}

// 计算指标
export interface VideoMetrics {
  totalViews: number;
  totalComments: number;
  totalKeywordTriggers: number;
  totalPrivateConsults: number;
  totalMaterialsSent: number;
  totalDeepConsults: number;
  totalTransactions: number;
  keywordTriggerRate: number; // 关键词触发率
  privateConversionRate: number; // 私信转化率
  transactionConversionRate: number; // 成交转化率
}

// 评论关键词规则
export interface CommentKeywordRule {
  id: string;
  keyword: string;
  replyTemplate: string;
  materialToSend: string;
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
  grade: 'A' | 'B' | 'C' | 'D';
  label: '热客' | '温客' | '凉客' | '无效';
  description: string;
  criteria: string[];
  color: string;
}

// 产品转化话术
export interface ProductPitch {
  id: string;
  productCategory: 'B' | 'A' | 'C' | 'D';
  productName: string;
  pitchContent: string;
  painPoint: string;
  benefit: string;
}

// 优化建议
export interface OptimizationSuggestion {
  type: 'increase' | 'decrease' | 'maintain';
  contentType: TopicType;
  reason: string;
  currentCount: number;
  recommendedCount: number;
}

// 导航模块
export type ModuleType = 'topics' | 'scripts' | 'production' | 'analytics' | 'operations' | 'risk-detection';

export interface NavItem {
  id: ModuleType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

// 客户
export interface Customer {
  id: string;
  sourceVideoId: string;
  sourceVideoTitle: string;
  consultType: string;
  contact: string;
  tier: 'A' | 'B' | 'C' | 'D';
  tierLabel: '热客' | '温客' | '凉客' | '无效';
  followStatus: 'pending' | 'following' | 'converted' | 'lost';
  followStatusLabel: '待跟进' | '跟进中' | '已成交' | '已流失';
  notes: string;
  createdAt: string;
}

// 爆款来源
export type VideoSource = 'douyin' | 'shipinhao' | 'xiaohongshu' | 'kuaishou' | 'bilibili' | 'gongzhonghao' | 'zhihu' | 'other';

export const VIDEO_SOURCE_LABELS: Record<VideoSource, string> = {
  douyin: '抖音',
  shipinhao: '视频号',
  xiaohongshu: '小红书',
  kuaishou: '快手',
  bilibili: 'B站',
  gongzhonghao: '公众号',
  zhihu: '知乎',
  other: '其他',
};

// 爆款二创
export interface RemixRecord {
  id: string;
  url: string;
  transcript: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  statusLabel: '待二创' | '二创中' | '已完成';
  source: string; // 爆款来源(抖音/视频号/小红书/快手/B站/公众号/知乎/其他)
  sourceLabel: string; // 来源标签，同source
  createdAt: string;
  completedAt?: string;
}
