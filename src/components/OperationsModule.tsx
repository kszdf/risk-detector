'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UsersIcon, PlusIcon, TrashIcon, MessageIcon, TagIcon, PhoneIcon, XIcon, CopyIcon, CheckIcon, StarIcon } from '@/components/icons';
import { Customer } from '@/lib/types';
import { getCustomers, saveCustomers, updateCustomer } from '@/lib/storage';

const KEYWORD_REPLIES = [
  { keyword: '自检', material: '企业财税风险自检表', reply: '感谢关注！点击链接填写自检表，5分钟了解公司财税风险点。' },
  { keyword: '排查', material: '往来款排查清单', reply: '私信已发你排查清单，按照表格逐项核查即可。有问题随时问我。' },
  { keyword: '注册资金', material: '注册资金填写指南', reply: '注册资金不是越多越好！给你发份填写指南，帮你避开这个坑。' },
  { keyword: '流程', material: '注册公司流程清单', reply: '私信发你一份完整流程清单，照着做3天拿到执照。' },
  { keyword: '雷点', material: '财税雷点自查清单', reply: '你这问题很关键！先自查这3个雷点，私信发你清单。' },
  { keyword: '代账', material: '代账服务对比表', reply: '代账水深得很！给你发份对比表，帮你选到靠谱的。' },
  { keyword: '税负', material: '企业税负率自测表', reply: '不同行业税负率差异很大！先自测一下，私信发你表格。' },
  { keyword: '公转私', material: '公转私合规指南', reply: '公转私风险大！给你发份合规操作指南，避免踩雷。' },
  { keyword: '雷达', material: '风控触发线清单', reply: '金税四期下这些行为会触发风控！发你清单自查。' },
  { keyword: '股权', material: '股权设计模板', reply: '股权设计决定公司未来！私信发你几种常见方案。' },
  { keyword: '年报', material: '年报填写避坑指南', reply: '年报填错罚款5千-2万！私信发你填写要点。' },
];

const PRIVATE_MESSAGES = {
  first: {
    title: '第一段：标雷点',
    desc: '引发关注，指出潜在风险',
    content: '你好！看了一下你的问题，你公司可能存在XXX风险。这个问题很多人都会踩坑，建议尽快自查一下。',
  },
  second: {
    title: '第二段：给动作',
    desc: '提供价值，引导下一步',
    content: '我这边整理了一份【自查清单】，你私信发「清单」我发给你。按照表格逐项核查，有问题可以随时问我。',
  },
  third: {
    title: '第三段：诊断报价',
    desc: '促成转化，提供解决方案',
    content: '根据你的描述，你公司的情况需要做一次全面财税诊断。我们有专业团队，帮你梳理风险、设计合规方案。要不要约个时间详细聊聊？',
  },
};

const CUSTOMER_LEVELS = [
  { id: 'A', name: 'A级热客', color: 'text-red-400', bg: 'bg-red-500/20', desc: '高意向，活跃互动' },
  { id: 'B', name: 'B级温客', color: 'text-amber-400', bg: 'bg-amber-500/20', desc: '有需求，持续跟进' },
  { id: 'C', name: 'C级凉客', color: 'text-blue-400', bg: 'bg-blue-500/20', desc: '兴趣较低' },
  { id: 'D', name: 'D级无效', color: 'text-gray-400', bg: 'bg-gray-500/20', desc: '非目标客户' },
];

const PRODUCT_SCRIPTS = [
  {
    id: 'register',
    name: 'B类-注册公司',
    type: 'B类入口产品',
    scripts: [
      '注册公司只要XXX元，包含：营业执照、章、税务登记。',
      '现在注册还送一年记账报税，相当于XXX元全包。',
      '整个流程3-5个工作日，全程代办不用你跑。',
    ],
  },
  {
    id: 'accounting',
    name: 'A类-代理记账',
    type: 'A类留存产品',
    scripts: [
      '小规模记账报税XXX元/月，一般纳税人XXX元/月。',
      '包含：记账、报税、发票管理、年报、汇算清缴。',
      '我们有专业会计团队，帮你规避财税风险。',
    ],
  },
  {
    id: 'tax',
    name: 'C类-税务筹划',
    type: 'C类利润产品',
    scripts: [
      '通过合规税筹，可以帮你节省XXX%的税。',
      '我们有专业税务师，量身定制节税方案。',
      '已服务XX家企业，平均节税XX万。',
    ],
  },
  {
    id: 'course',
    name: 'D类-财税课程',
    type: 'D类杠杆产品',
    scripts: [
      '《老板财税必修课》2999元，12节视频课终身学习。',
      '包含：报表解读、税务基础、风险防范、节税技巧。',
      '学完你就是财税达人，再也不怕被坑。',
    ],
  },
];

export default function OperationsModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'keywords' | 'private' | 'customers' | 'products'>('keywords');

  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  const stats = useMemo(() => ({
    total: customers.length,
    hot: customers.filter(c => c.tier === 'A').length,
    warm: customers.filter(c => c.tier === 'B').length,
    cold: customers.filter(c => c.tier === 'C' || c.tier === 'D').length,
  }), [customers]);

  const handleAddCustomer = (customer: Customer) => {
    saveCustomers([customer, ...customers]);
    setCustomers([customer, ...customers]);
  };

  const handleUpdateLevel = (id: string, tier: Customer['tier']) => {
    const updated = customers.map(c => c.id === id ? { ...c, tier } : c);
    saveCustomers(updated);
    setCustomers(updated);
  };

  const handleDelete = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    saveCustomers(updated);
    setCustomers(updated);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab导航 */}
      <div className="flex gap-1 mb-6 bg-[#0D0F14] p-1 rounded-lg">
        {[
          { id: 'keywords', label: '关键词回复' },
          { id: 'private', label: '私信话术' },
          { id: 'customers', label: '客户管理' },
          { id: 'products', label: '产品话术' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#161A22] text-[#F1F5F9]'
                : 'text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 关键词回复 */}
      {activeTab === 'keywords' && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-3 gap-3">
            {KEYWORD_REPLIES.map(item => (
              <div key={item.keyword} className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
                <div className="p-3 bg-[#10B981]/10 border-b border-[#2A303C]">
                  <span className="px-3 py-1 bg-[#10B981] text-white text-sm font-bold rounded-full">
                    {item.keyword}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div>
                    <div className="text-xs text-[#94A3B8] mb-1">发放资料</div>
                    <div className="px-2 py-1 bg-[#10B981]/20 text-[#10B981] text-sm rounded">
                      {item.material}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8] mb-1">回复话术</div>
                    <div className="p-2 bg-[#0D0F14] rounded-lg">
                      <p className="text-sm text-[#F1F5F9]">{item.reply}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(item.reply)}
                    className="w-full flex items-center justify-center gap-1 py-1.5 bg-[#2A303C] rounded-lg text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
                  >
                    <CopyIcon className="w-3 h-3" />
                    复制话术
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 私信话术 */}
      {activeTab === 'private' && (
        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {Object.entries(PRIVATE_MESSAGES).map(([key, msg]) => (
              <div key={key} className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#3B82F6]/10 border-b border-[#2A303C]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[#F1F5F9] font-medium">{msg.title}</h3>
                      <p className="text-sm text-[#94A3B8]">{msg.desc}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(msg.content)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#3B82F6] rounded-lg text-sm text-white"
                    >
                      <CopyIcon className="w-4 h-4" />
                      复制
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[#F1F5F9] leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 客户管理 */}
      {activeTab === 'customers' && (
        <div className="flex-1 flex flex-col">
          {/* 统计 */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[#F1F5F9]">{stats.total}</div>
              <div className="text-xs text-[#94A3B8]">总客户</div>
            </div>
            <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-red-400">{stats.hot}</div>
              <div className="text-xs text-[#94A3B8]">A级热客</div>
            </div>
            <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-amber-400">{stats.warm}</div>
              <div className="text-xs text-[#94A3B8]">B级温客</div>
            </div>
            <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-400">{stats.cold}</div>
              <div className="text-xs text-[#94A3B8]">C级凉客</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#F1F5F9]">客户列表</h3>
            <AddCustomerModal onAdd={handleAddCustomer} />
          </div>

          <div className="flex-1 overflow-auto">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#94A3B8]">
                <UsersIcon className="w-10 h-10 mb-3 opacity-50" />
                <p>暂无客户</p>
                <p className="text-sm mt-1">点击上方按钮添加</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map(customer => {
                  const tierCfg = CUSTOMER_LEVELS.find(l => l.id === customer.tier) || CUSTOMER_LEVELS[2];
                  return (
                    <div key={customer.id} className="bg-[#161A22] border border-[#2A303C] rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[#F1F5F9] font-medium">{customer.contact}</h4>
                            <span className={`px-2 py-0.5 text-xs rounded ${tierCfg.bg} ${tierCfg.color}`}>
                              {tierCfg.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#94A3B8]">
                            {customer.sourceVideoTitle && <span>来源：{customer.sourceVideoTitle}</span>}
                            {customer.consultType && <span>咨询：{customer.consultType}</span>}
                          </div>
                          {customer.notes && (
                            <p className="mt-2 text-sm text-[#94A3B8] bg-[#0D0F14] rounded-lg p-2">
                              {customer.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={customer.tier}
                            onChange={e => updateCustomer(customer.id, { tier: e.target.value as Customer['tier'] })}
                            className="bg-[#0D0F14] border border-[#2A303C] rounded px-2 py-1 text-xs text-[#F1F5F9]"
                          >
                            {CUSTOMER_LEVELS.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                          <button onClick={() => handleDelete(customer.id)} className="p-1 hover:bg-red-500/20 rounded">
                            <TrashIcon className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 产品话术 */}
      {activeTab === 'products' && (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            {PRODUCT_SCRIPTS.map(product => (
              <div key={product.id} className="bg-[#161A22] border border-[#2A303C] rounded-xl overflow-hidden">
                <div className="p-4 bg-[#8B5CF6]/10 border-b border-[#2A303C]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#F1F5F9] font-medium">{product.name}</h3>
                    <span className="px-2 py-0.5 text-xs bg-[#8B5CF6]/30 text-purple-400 rounded">
                      {product.type}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {product.scripts.map((script, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#8B5CF6]/30 text-[#8B5CF6] text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-[#F1F5F9]">{script}</p>
                        <button
                          onClick={() => handleCopy(script)}
                          className="mt-1 flex items-center gap-1 text-xs text-[#94A3B8] hover:text-[#F1F5F9]"
                        >
                          <CopyIcon className="w-3 h-3" />
                          复制
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddCustomerModal({ onAdd }: { onAdd: (c: Customer) => void }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [sourceVideo, setSourceVideo] = useState('');
  const [consultType, setConsultType] = useState('');
  const [tier, setTier] = useState<Customer['tier']>('B');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name) return;
    const customer: Customer = {
      id: `customer_${Date.now()}`,
      sourceVideoId: '',
      sourceVideoTitle: sourceVideo,
      consultType,
      contact: name,
      tier: tier as Customer['tier'],
      tierLabel: tier === 'A' ? '热客' : tier === 'B' ? '温客' : tier === 'C' ? '凉客' : '无效',
      followStatus: 'pending',
      followStatusLabel: '待跟进',
      notes,
      createdAt: new Date().toISOString(),
    };
    onAdd(customer);
    setShow(false);
    setName('');
    setSourceVideo('');
    setConsultType('');
    setTier('B');
    setNotes('');
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white rounded-lg text-sm"
      >
        <PlusIcon className="w-4 h-4" />
        添加客户
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#161A22] border border-[#2A303C] rounded-xl p-6 w-[450px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#F1F5F9]">添加客户</h3>
          <button onClick={() => setShow(false)} className="p-1 hover:bg-[#2A303C] rounded">
            <XIcon className="w-5 h-5 text-[#94A3B8]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">客户名称 *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="客户姓名/公司名"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">来源视频</label>
            <input
              value={sourceVideo}
              onChange={e => setSourceVideo(e.target.value)}
              placeholder="从哪个视频来的"
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            />
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">咨询类型</label>
            <select
              value={consultType}
              onChange={e => setConsultType(e.target.value)}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              <option value="">选择类型...</option>
              <option value="注册公司">注册公司</option>
              <option value="代理记账">代理记账</option>
              <option value="税务筹划">税务筹划</option>
              <option value="资质办理">资质办理</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">客户等级</label>
            <select
              value={tier}
              onChange={e => setTier(e.target.value as Customer['tier'])}
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9]"
            >
              {CUSTOMER_LEVELS.map(l => (
                <option key={l.id} value={l.id}>{l.name} - {l.desc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#94A3B8] mb-1">备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="跟进记录..."
              className="w-full bg-[#0D0F14] border border-[#2A303C] rounded-lg px-3 py-2 text-[#F1F5F9] h-20 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShow(false)} className="px-4 py-2 text-[#94A3B8]">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!name}
            className="px-4 py-2 bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
