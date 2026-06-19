import { Topic, Script, VideoRecord, VideoProductionTask, CommentReplyRule, PrivateMessage, CustomerTier, ProductPitch } from './types';

const STORAGE_KEYS = {
  TOPICS: 'tax_workbench_topics',
  SCRIPTS: 'tax_workbench_scripts',
  VIDEO_RECORDS: 'tax_workbench_video_records',
  PRODUCTION_TASKS: 'tax_workbench_production_tasks',
  COMMENT_RULES: 'tax_workbench_comment_rules',
  PRIVATE_MESSAGES: 'tax_workbench_private_messages',
  CUSTOMER_TIERS: 'tax_workbench_customer_tiers',
  PRODUCT_PITCHES: 'tax_workbench_product_pitches',
} as const;

// Generic helpers
function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// Topics
export function getTopics(): Topic[] {
  return getFromStorage(STORAGE_KEYS.TOPICS, []);
}

export function saveTopics(topics: Topic[]): void {
  saveToStorage(STORAGE_KEYS.TOPICS, topics);
}

export function addTopic(topic: Topic): void {
  const topics = getTopics();
  topics.unshift(topic);
  saveTopics(topics);
}

export function deleteTopic(id: string): void {
  const topics = getTopics().filter(t => t.id !== id);
  saveTopics(topics);
}

// Scripts
export function getScripts(): Script[] {
  return getFromStorage(STORAGE_KEYS.SCRIPTS, []);
}

export function saveScripts(scripts: Script[]): void {
  saveToStorage(STORAGE_KEYS.SCRIPTS, scripts);
}

export function addScript(script: Script): void {
  const scripts = getScripts();
  scripts.unshift(script);
  saveScripts(scripts);
}

export function deleteScript(id: string): void {
  const scripts = getScripts().filter(s => s.id !== id);
  saveScripts(scripts);
}

// Video Records
export function getVideoRecords(): VideoRecord[] {
  return getFromStorage(STORAGE_KEYS.VIDEO_RECORDS, []);
}

export function saveVideoRecords(records: VideoRecord[]): void {
  saveToStorage(STORAGE_KEYS.VIDEO_RECORDS, records);
}

export function addVideoRecord(record: VideoRecord): void {
  const records = getVideoRecords();
  records.unshift(record);
  saveVideoRecords(records);
}

export function deleteVideoRecord(id: string): void {
  const records = getVideoRecords().filter(r => r.id !== id);
  saveVideoRecords(records);
}

// Production Tasks
export function getProductionTasks(): VideoProductionTask[] {
  return getFromStorage(STORAGE_KEYS.PRODUCTION_TASKS, []);
}

export function saveProductionTasks(tasks: VideoProductionTask[]): void {
  saveToStorage(STORAGE_KEYS.PRODUCTION_TASKS, tasks);
}

export function addProductionTask(task: VideoProductionTask): void {
  const tasks = getProductionTasks();
  tasks.unshift(task);
  saveProductionTasks(tasks);
}

export function updateProductionTask(id: string, updates: Partial<VideoProductionTask>): void {
  const tasks = getProductionTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveProductionTasks(tasks);
  }
}

export function deleteProductionTask(id: string): void {
  const tasks = getProductionTasks().filter(t => t.id !== id);
  saveProductionTasks(tasks);
}

// Comment Rules
export function getCommentRules(): CommentReplyRule[] {
  return getFromStorage(STORAGE_KEYS.COMMENT_RULES, []);
}

export function saveCommentRules(rules: CommentReplyRule[]): void {
  saveToStorage(STORAGE_KEYS.COMMENT_RULES, rules);
}

export function addCommentRule(rule: CommentReplyRule): void {
  const rules = getCommentRules();
  rules.unshift(rule);
  saveCommentRules(rules);
}

export function deleteCommentRule(id: string): void {
  const rules = getCommentRules().filter(r => r.id !== id);
  saveCommentRules(rules);
}

// Private Messages
export function getPrivateMessages(): PrivateMessage[] {
  return getFromStorage(STORAGE_KEYS.PRIVATE_MESSAGES, []);
}

export function savePrivateMessages(messages: PrivateMessage[]): void {
  saveToStorage(STORAGE_KEYS.PRIVATE_MESSAGES, messages);
}

export function updatePrivateMessages(messages: PrivateMessage[]): void {
  savePrivateMessages(messages);
}

// Customer Tiers
export function getCustomerTiers(): CustomerTier[] {
  return getFromStorage(STORAGE_KEYS.CUSTOMER_TIERS, []);
}

export function saveCustomerTiers(tiers: CustomerTier[]): void {
  saveToStorage(STORAGE_KEYS.CUSTOMER_TIERS, tiers);
}

export function updateCustomerTiers(tiers: CustomerTier[]): void {
  saveCustomerTiers(tiers);
}

// Product Pitches
export function getProductPitches(): ProductPitch[] {
  return getFromStorage(STORAGE_KEYS.PRODUCT_PITCHES, []);
}

export function saveProductPitches(pitches: ProductPitch[]): void {
  saveToStorage(STORAGE_KEYS.PRODUCT_PITCHES, pitches);
}

export function addProductPitch(pitch: ProductPitch): void {
  const pitches = getProductPitches();
  pitches.unshift(pitch);
  saveProductPitches(pitches);
}

export function deleteProductPitch(id: string): void {
  const pitches = getProductPitches().filter(p => p.id !== id);
  saveProductPitches(pitches);
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Format number with thousand separator
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

// Calculate conversion rate
export function calculateConversionRate(conversions: number, views: number): string {
  if (views === 0) return '0%';
  return ((conversions / views) * 100).toFixed(2) + '%';
}
