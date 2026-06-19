import { Topic, Script, VideoRecord, VideoProductionTask, CommentKeywordRule, PrivateMessage, CustomerTier, ProductPitch, VideoMetrics, Customer, RemixRecord } from './types';

const STORAGE_KEYS = {
  TOPICS: 'tax_workbench_topics_v2',
  SCRIPTS: 'tax_workbench_scripts_v2',
  VIDEO_RECORDS: 'tax_workbench_video_records_v2',
  PRODUCTION_TASKS: 'tax_workbench_production_tasks_v2',
  COMMENT_RULES: 'tax_workbench_comment_rules_v2',
  PRIVATE_MESSAGES: 'tax_workbench_private_messages_v2',
  CUSTOMER_TIERS: 'tax_workbench_customer_tiers_v2',
  PRODUCT_PITCHES: 'tax_workbench_product_pitches_v2',
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

export function saveTopic(topic: Topic): void {
  const topics = getTopics();
  const index = topics.findIndex(t => t.id === topic.id);
  if (index >= 0) {
    topics[index] = topic;
  } else {
    topics.unshift(topic);
  }
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
export function getCommentRules(): CommentKeywordRule[] {
  return getFromStorage(STORAGE_KEYS.COMMENT_RULES, []);
}

export function saveCommentRules(rules: CommentKeywordRule[]): void {
  saveToStorage(STORAGE_KEYS.COMMENT_RULES, rules);
}

export function addCommentRule(rule: CommentKeywordRule): void {
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

// Calculate video metrics
export function calculateVideoMetrics(records: VideoRecord[]): VideoMetrics {
  const totals = records.reduce((acc, r) => ({
    views: acc.views + r.views,
    comments: acc.comments + r.comments,
    keywordTriggers: acc.keywordTriggers + r.keywordTriggers,
    privateConsults: acc.privateConsults + r.privateConsults,
    materialsSent: acc.materialsSent + r.materialsSent,
    deepConsults: acc.deepConsults + r.deepConsults,
    transactions: acc.transactions + r.transactions,
  }), { views: 0, comments: 0, keywordTriggers: 0, privateConsults: 0, materialsSent: 0, deepConsults: 0, transactions: 0 });

  return {
    totalViews: totals.views,
    totalComments: totals.comments,
    totalKeywordTriggers: totals.keywordTriggers,
    totalPrivateConsults: totals.privateConsults,
    totalMaterialsSent: totals.materialsSent,
    totalDeepConsults: totals.deepConsults,
    totalTransactions: totals.transactions,
    keywordTriggerRate: totals.views > 0 ? (totals.keywordTriggers / totals.views) * 100 : 0,
    privateConversionRate: totals.keywordTriggers > 0 ? (totals.privateConsults / totals.keywordTriggers) * 100 : 0,
    transactionConversionRate: totals.privateConsults > 0 ? (totals.transactions / totals.privateConsults) * 100 : 0,
  };
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Format number with thousand separator
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

// Get account name
export function getAccountName(account: 'main' | 'secondary'): string {
  return account === 'main' ? '张老师老板财税' : '创业老板的第一站';
}

// Get topic type name
export function getTopicTypeName(type: string, account: 'main' | 'secondary'): string {
  const mainTypes: Record<string, string> = {
    'risk-trigger': '风险触发型',
    'case-analysis': '案例拆解型',
    'policy-interpret': '政策解读型',
    'course-attract': '课程引流型',
  };
  const secondaryTypes: Record<string, string> = {
    'register-avoid': '注册避坑型',
    'process-science': '流程科普型',
    'startup-remind': '创业提醒型',
    'agency-common': '代账常识型',
  };
  return account === 'main' ? mainTypes[type] || type : secondaryTypes[type] || type;
}

// Get framework name
export function getFrameworkName(framework: string): string {
  const names: Record<string, string> = {
    'B': 'B类-注册公司(入口)',
    'A': 'A类-代账服务(留存)',
    'C': 'C类-税务筹划(利润)',
    'D': 'D类-培训课程(杠杆)',
  };
  return names[framework] || framework;
}

// Get audience name
export function getAudienceName(audience: string): string {
  const names: Record<string, string> = {
    'startup': '创业初期老板',
    'small-biz': '小微企业主',
    'medium-biz': '中小企业主',
    'founder': '公司创始人',
    'cfo': '财务负责人',
  };
  return names[audience] || audience;
}

// Get customers from localStorage
export function getCustomers(): Customer[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('customers');
  return data ? JSON.parse(data) : [];
}

// Save customers to localStorage
export function saveCustomers(customers: Customer[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('customers', JSON.stringify(customers));
}

// Add customer
export function addCustomer(customer: Customer): void {
  const customers = getCustomers();
  customers.unshift(customer);
  saveCustomers(customers);
}

// Update customer
export function updateCustomer(id: string, updates: Partial<Customer>): void {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...updates };
    saveCustomers(customers);
  }
}

// Delete customer
export function deleteCustomer(id: string): void {
  const customers = getCustomers().filter(c => c.id !== id);
  saveCustomers(customers);
}

// Update video record (ensures all required fields)
export function updateVideoRecord(id: string, updates: Partial<VideoRecord>): void {
  const records = getVideoRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    saveVideoRecords(records);
  }
}

// Get remix records from localStorage
export function getRemixRecords(): RemixRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('remixRecords');
  return data ? JSON.parse(data) : [];
}

// Save remix records to localStorage
export function saveRemixRecords(records: RemixRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('remixRecords', JSON.stringify(records));
}

// Add remix record
export function addRemixRecord(record: RemixRecord): void {
  const records = getRemixRecords();
  records.unshift(record);
  saveRemixRecords(records);
}

// Update remix record
export function updateRemixRecord(id: string, updates: Partial<RemixRecord>): void {
  const records = getRemixRecords();
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    saveRemixRecords(records);
  }
}

// Delete remix record
export function deleteRemixRecord(id: string): void {
  const records = getRemixRecords().filter(r => r.id !== id);
  saveRemixRecords(records);
}
