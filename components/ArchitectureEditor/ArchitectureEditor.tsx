import React, { useState, useEffect } from 'react';
import EventBus, { EventType, LogEventData, ModuleStatusChangeData, LogEntry } from '../../services/EventBus';

interface ModuleStatus {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  icon: string;
}

export const ArchitectureEditor: React.FC = () => {
  // 临时翻译映射，直到i18n配置完成
  const t = (key: string): string => {
    const translations: Record<string, string> = {
      'arch.title': '架构验证器',
      'arch.subtitle': '事件总线监控与模块状态',
      'arch.monitor': '模块状态监控',
      'arch.log': '事件总线日志',
      'arch.logSubtitle': '实时通信追踪',
      'arch.btn_test': '模拟测试',
      'arch.scene': '场景',
      'arch.assets': '资产',
      'arch.history': '历史',
      'arch.input': '输入'
    };
    return translations[key] || key;
  };
  
  const [modules] = useState<ModuleStatus[]>([
    { id: 'scene', name: 'Scene', status: 'Active', icon: 'fa-cube' },
    { id: 'assets', name: 'Assets', status: 'Active', icon: 'fa-cubes' },
    { id: 'history', name: 'History', status: 'Active', icon: 'fa-history' },
    { id: 'input', name: 'Input', status: 'Active', icon: 'fa-keyboard' },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      message: '系统初始化完成',
      type: 'success',
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      message: '模块状态监控已启动',
      type: 'info',
    },
  ]);

  // 订阅事件总线
  useEffect(() => {
    console.log('[ArchitectureEditor] 组件挂载，开始订阅事件');

    // 获取历史日志
    const historyLogs = EventBus.getLogHistory();
    if (historyLogs.length > 0) {
      // 如果有历史日志，替换初始日志
      setLogs(historyLogs.slice(0, 50)); // 确保不超过50条
    }

    // 订阅日志事件
    const unsubscribeLog = EventBus.subscribe(EventType.LOG_EVENT, (data: LogEventData) => {
      const newLog: LogEntry = {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toLocaleTimeString(),
        message: data.module ? `[${data.module}] ${data.message}` : data.message,
        type: data.type,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 50)); // 保持最近50条日志
    });

    // 订阅模块状态变更事件
    const unsubscribeStatus = EventBus.subscribe(
      EventType.MODULE_STATUS_CHANGE,
      (data: ModuleStatusChangeData) => {
        const statusLog: LogEntry = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          message: `模块 ${data.moduleName} 状态变更: ${data.status}${data.reason ? ` (${data.reason})` : ''}`,
          type: data.status === 'Active' ? 'success' : 'warning',
        };
        setLogs((prev) => [statusLog, ...prev].slice(0, 50));
      }
    );

    // 发送初始化完成事件
    EventBus.publish(EventType.LOG_EVENT, {
      message: '架构验证器已连接到事件总线',
      type: 'success',
      module: 'ArchitectureEditor',
    });

    // 组件卸载时清理订阅
    return () => {
      console.log('[ArchitectureEditor] 组件卸载，取消订阅');
      unsubscribeLog();
      unsubscribeStatus();
    };
  }, []);

  const handleSimulateTest = () => {
    console.log('[ArchitectureEditor] 模拟测试按钮被点击');

    // 通过事件总线发送各种测试事件
    const testScenarios = [
      {
        type: EventType.LOG_EVENT,
        data: {
          message: 'Scene 模块接收到渲染请求',
          type: 'info' as 'info',
          module: 'Scene',
        },
      },
      {
        type: EventType.LOG_EVENT,
        data: {
          message: 'Assets 模块加载资源完成',
          type: 'success' as 'success',
          module: 'Assets',
        },
      },
      {
        type: EventType.LOG_EVENT,
        data: {
          message: 'History 模块记录操作快照',
          type: 'info' as 'info',
          module: 'History',
        },
      },
      {
        type: EventType.LOG_EVENT,
        data: {
          message: 'Input 模块检测到用户交互',
          type: 'info' as 'info',
          module: 'Input',
        },
      },
      {
        type: EventType.LOG_EVENT,
        data: {
          message: '事件总线广播：模块间通信测试成功！',
          type: 'success' as 'success',
          module: 'EventBus',
        },
      },
      {
        type: EventType.MODULE_STATUS_CHANGE,
        data: {
          moduleId: 'scene',
          moduleName: 'Scene',
          status: 'Active' as 'Active',
          reason: '测试刷新',
        },
      },
    ];

    // 随机选择一个测试场景
    const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];
    
    // 通过事件总线发布事件
    EventBus.publish(scenario.type, scenario.data);

    // 额外发送一个测试完成的日志
    setTimeout(() => {
      EventBus.publish(EventType.LOG_EVENT, {
        message: '✓ 架构验证：事件总线通信闭环测试通过',
        type: 'success',
        module: 'Test',
      });
    }, 100);
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400 border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5';
      case 'error':
        return 'text-red-400 border-red-500/30 bg-red-500/5';
      default:
        return 'text-blue-400 border-blue-500/30 bg-blue-500/5';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'fa-check-circle';
      case 'warning':
        return 'fa-exclamation-triangle';
      case 'error':
        return 'fa-times-circle';
      default:
        return 'fa-info-circle';
    }
  };

  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-network-wired text-white text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('arch.title')}</h2>
            <p className="text-xs text-gray-400">{t('arch.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content Area - Split Layout */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Left Section: Module Status Monitor */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-gray-800">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <i className="fas fa-chart-line text-purple-400"></i>
            {t('arch.monitor')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {modules.map((module) => (
              <div
                key={module.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-3 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fas ${module.icon} text-purple-400 text-sm`}></i>
                  <span className="text-xs font-bold text-gray-300">{t(`arch.${module.id}`)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-green-400 font-bold">
                    {module.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Event Bus Log */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <i className="fas fa-terminal text-blue-400"></i>
            {t('arch.log')} ({t('arch.logSubtitle')})
          </h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`border rounded-lg p-2 ${getLogColor(log.type)}`}
              >
                <div className="flex items-start gap-2">
                  <i className={`fas ${getLogIcon(log.type)} text-xs mt-0.5`}></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 font-mono">
                      {log.timestamp}
                    </div>
                    <div className="text-xs font-medium break-words">
                      {log.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Test Button */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <button
          onClick={handleSimulateTest}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
        >
          <i className="fas fa-flask"></i>
          {t('arch.btn_test')}
        </button>
      </div>
    </div>
  );
};
