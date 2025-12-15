
import React from 'react';
import { AppMode } from '../types';
import EventBus, { EventType } from '../services/EventBus';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  isAiDocked?: boolean;
  onUndock?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentMode, setMode, isAiDocked, onUndock }) => {
  const navItems = [
    { 
      mode: AppMode.CHARACTER_EDITOR, 
      label: '英雄大厅', 
      icon: 'fa-user-shield', 
      desc: 'Hero Studio' 
    },
    { 
      mode: AppMode.ASSET_LIBRARY, 
      label: '资产库', 
      icon: 'fa-cubes', 
      desc: 'Asset Library' 
    },
    { 
      mode: AppMode.MAP_EDITOR, 
      label: '世界构造', 
      icon: 'fa-globe-asia', 
      desc: 'World Builder' 
    },
    { 
      mode: AppMode.ACTION_STUDIO, 
      label: '演武场', 
      icon: 'fa-film', 
      desc: 'Action Studio' 
    },
    { 
      mode: AppMode.VFX_STUDIO, // NEW
      label: '特效工坊', 
      icon: 'fa-magic', 
      desc: 'VFX Studio' 
    },
    { 
      mode: AppMode.GAMEPLAY, 
      label: '实机演示', 
      icon: 'fa-gamepad', 
      desc: 'Play Mode' 
    },
    { 
      mode: AppMode.ARCHITECTURE_VALIDATOR, 
      label: '架构验证', 
      icon: 'fa-sitemap', 
      desc: 'Architecture Validator' 
    },
  ];

  return (
    <div className="w-20 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 z-50 shadow-2xl relative flex-shrink-0">
      <div className="mb-8 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
        <i className="fas fa-cube text-white text-xl"></i>
      </div>

      <div className="flex flex-col gap-6 w-full px-2">
        {navItems.map((item) => {
          const isActive = currentMode === item.mode || (currentMode === AppMode.MODEL_WORKSHOP && item.mode === AppMode.ASSET_LIBRARY);
          return (
            <button
              key={item.mode}
              onClick={() => {
                setMode(item.mode);
                // 发送日志事件到架构验证器
                EventBus.publish(EventType.LOG_EVENT, {
                  message: `用户切换到了: ${item.label} (${item.desc})`,
                  type: 'info',
                  module: 'Sidebar',
                });
              }}
              className={`group relative w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300
                ${isActive 
                  ? 'bg-gray-800 text-blue-400 shadow-inner' 
                  : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
            >
              <i className={`fas ${item.icon} text-xl mb-1 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}></i>
              <span className="text-[9px] font-bold opacity-80">{item.label}</span>
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* DOCKED SPRITE BUTTON */}
      {isAiDocked && (
          <div className="mt-auto w-full px-2 animate-fade-in-up">
              <button 
                onClick={() => {
                  if (onUndock) onUndock();
                  // 发送日志事件到架构验证器
                  EventBus.publish(EventType.LOG_EVENT, {
                    message: '用户点击了召唤灵枢按钮',
                    type: 'info',
                    module: 'Sidebar',
                  });
                }}
                className="group w-full aspect-square rounded-full flex items-center justify-center bg-gray-900 border border-blue-500/30 shadow-lg shadow-blue-900/20 hover:scale-110 transition-transform relative"
                title="召唤灵枢"
              >
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse group-hover:bg-blue-500/20"></div>
                  <i className="fas fa-sparkles text-blue-400 text-lg animate-spin-slow"></i>
              </button>
          </div>
      )}
    </div>
  );
};
