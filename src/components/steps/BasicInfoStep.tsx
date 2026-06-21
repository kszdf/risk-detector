'use client';

import React from 'react';

interface FinancialPeriod {
  period: string;
  type: 'latest' | 'annual';
  revenue: number;
  cost: number;
  profit: number;
  vatPaid: number;
  incomeTaxPaid: number;
  totalAssets: number;
  totalLiabilities: number;
  receivables: number;
  inventory: number;
  advanceReceipts: number;
}

interface FormData {
  enterpriseName: string;
  contactPerson: string;
  contactPhone: string;
  customerEmail: string;
  industry: string;
  revenueScale: string;
  invoiceAnswers: Record<string, number>;
  revenueCostAnswers: Record<string, number>;
  publicPrivateAnswers: Record<string, number>;
  taxPolicyAnswers: Record<string, number>;
  latestMonth: string;
  financialData: FinancialPeriod[];
}

interface BasicInfoStepProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  phoneError: string;
}

export default function BasicInfoStep({ formData, setFormData, phoneError }: BasicInfoStepProps) {
  const update = (field: keyof Pick<FormData, 'enterpriseName' | 'contactPerson' | 'contactPhone' | 'customerEmail' | 'industry' | 'revenueScale'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (value: string) => {
    const val = value.replace(/\D/g, '').slice(0, 11);
    update('contactPhone', val);
    if (val && val.length !== 11) {
      // 错误由父组件管理
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          企业名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.enterpriseName}
          onChange={(e) => update('enterpriseName', e.target.value)}
          placeholder="请输入企业名称"
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333] placeholder-[#999999]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-1">
            联系人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="请输入联系人姓名"
            className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333] placeholder-[#999999]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#333333] mb-1">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="请输入手机号码"
            className={`w-full px-4 py-2.5 text-sm border rounded-lg bg-white focus:ring-2 text-[#333333] placeholder-[#999999] ${
              phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-[#E5E7EB] focus:border-[#1E3A5F] focus:ring-[#1E3A5F]/20'
            }`}
          />
          {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          行业类型 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.industry}
          onChange={(e) => update('industry', e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333]"
        >
          <option value="">请选择行业类型</option>
          <option value="制造业">制造业</option>
          <option value="批发零售业">批发零售业</option>
          <option value="建筑业">建筑业</option>
          <option value="商务服务业">商务服务业</option>
          <option value="生活服务业">生活服务业</option>
          <option value="科技互联网">科技互联网</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[#333333] mb-1">
          年营收规模 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.revenueScale}
          onChange={(e) => update('revenueScale', e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 text-[#333333]"
        >
          <option value="">请选择年营收规模</option>
          <option value="500万以下">500万以下</option>
          <option value="500-2000万">500-2000万</option>
          <option value="2000万-1亿">2000万-1亿</option>
          <option value="1亿以上">1亿以上</option>
        </select>
      </div>
    </div>
  );
}
