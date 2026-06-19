'use client';

import React, { useState, useEffect } from 'react';
import { 
  LightbulbIcon, FileTextIcon, VideoIcon, BarChartIcon, UsersIcon,
  SettingsIcon, BuildingIcon
} from '@/components/icons';
import TopicsModule from '@/components/TopicsModule';
import ScriptsModule from '@/components/ScriptsModule';
import ProductionModule from '@/components/ProductionModule';
import AnalyticsModule from '@/components/AnalyticsModule';
import OperationsModule from '@/components/OperationsModule';
import { ModuleType, NavItem } from '@/lib/types';

const NAV_ITEMS: NavItem[] = [
  { id: 'topics', name: '找选题', icon: 'Lightbulb', color: 'blue', description: '生成爆款选题' },
  { id: 'scripts', name: '写脚本', icon: 'FileText', color: 'green', description: '编写口播脚本' },
  { id: 'production', name: '做视频', icon: 'Video', color: 'purple', description: '生产数字人视频' },
  { id: 'analytics', name: '看数据', icon: 'BarChart', color: 'amber', description: '分析转化数据' },
  { id: 'operations', name: '管客户', icon: 'Users', color: 'red', description: '管理私域客户' },
];

const IconComponents: Record<string, React.FC<{ className?: string; size?: number }>> = {
  Lightbulb: LightbulbIcon,
  FileText: FileTextIcon,
  Video: VideoIcon,
  BarChart: BarChartIcon,
  Users: UsersIcon,
};

export default function HomePage() {
  const [activeModule, setActiveModule] = useState<ModuleType>('topics');
  const [currentTime, setCurrentTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case 'topics':
        return <TopicsModule />;
      case 'scripts':
        return <ScriptsModule />;
      case 'production':
        return <ProductionModule />;
      case 'analytics':
        return <AnalyticsModule />;
      case 'operations':
        return <OperationsModule />;
      default:
        return <TopicsModule />;
    }
  };

  const colorMap: Record<string, string> = {
    blue: 'module-blue',
    green: 'module-green',
    purple: 'module-purple',
    amber: 'module-amber',
    red: 'module-red',
  };

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <BuildingIcon size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-lg gradient-text">财税短视频获客系统</h1>
              <p className="text-xs text-muted-foreground">Tax Short Video Marketing Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-mono-num">
              {mounted ? currentTime : '--'}
            </div>
            <button className="w-9 h-9 rounded-lg border border-border hover:border-primary/50 transition-colors flex items-center justify-center">
              <SettingsIcon size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="w-64 h-[calc(100vh-64px)] fixed top-16 left-0 border-r border-border bg-card/50 backdrop-blur-sm">
        <nav className="p-4">
          <div className="mb-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">功能模块</h2>
          </div>
          
          <div className="space-y-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeModule === item.id;
              // 获取文字首字母作为图标
              const initial = item.name.charAt(0);
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                    isActive
                      ? `bg-primary/10 border-l-2 border-primary`
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors font-bold text-lg ${
                    isActive
                      ? `bg-primary/20`
                      : 'bg-muted group-hover:bg-muted/80'
                  } ${isActive ? colorMap[item.color] : 'text-muted-foreground'}`}>
                    {initial}
                  </div>
                  <div className="text-left flex-1">
                    <div className={`font-medium text-sm ${isActive ? colorMap[item.color] : ''}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  {isActive && (
                    <div className={`w-2 h-2 rounded-full`} style={{
                      backgroundColor: item.color === 'blue' ? '#3B82F6' : 
                                      item.color === 'green' ? '#10B981' : 
                                      item.color === 'purple' ? '#8B5CF6' : 
                                      item.color === 'amber' ? '#F59E0B' : '#EF4444'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium">系统状态正常</span>
            </div>
            <p className="text-xs text-muted-foreground">所有数据已保存至本地存储</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 pt-16">
        <div className="p-6">
          {/* Module Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>工作台</span>
              <span>/</span>
              <span className="text-foreground">
                {NAV_ITEMS.find(i => i.id === activeModule)?.name}
              </span>
              <span className="text-xs">({
                NAV_ITEMS.find(i => i.id === activeModule)?.description
              })</span>
            </div>
          </div>
          
          {/* Module Content */}
          <div className="min-h-[calc(100vh-180px)]">
            {renderModule()}
          </div>
        </div>
      </main>
    </div>
  );
}
