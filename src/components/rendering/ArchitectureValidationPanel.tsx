/**
 * PolyForge v1.3.0 - ArchitectureValidationPanel
 * 架构验证观测窗口 - UI 控制面板
 * 
 * 功能：
 * - 显示实时统计信息（实体数、FPS、顶点数、植被实例数）
 * - 提供地形和植被控制按钮
 * - 一键演示功能
 * - 使用 useRef 直接操作 DOM 显示高频数据（FPS）
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArchitectureValidationManager } from '../../core/ArchitectureValidationManager';

interface ArchitectureValidationPanelProps {
  manager: ArchitectureValidationManager | null;
  onBloomStrengthChange?: (value: number) => void;
  onBloomThresholdChange?: (value: number) => void;
  onGrassScaleChange?: (value: number) => void;
  onWindStrengthChange?: (value: number) => void;
  onGrassColorChange?: (color: string) => void;
}

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({ 
  manager, 
  onBloomStrengthChange, 
  onBloomThresholdChange,
  onGrassScaleChange,
  onWindStrengthChange,
  onGrassColorChange
}) => {
  const [stats, setStats] = useState({
    entityCount: 0,
    systemCount: 0,
    vegetationCount: 0,
    terrainVertices: 0,
  });
  
  // 🎬 导演级控制状态
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.5);
  const [timeOfDay, setTimeOfDay] = useState(17);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  
  // 🌿 植被控制状态
  const [grassScale, setGrassScale] = useState(1.0);
  const [windStrength, setWindStrength] = useState(0.1);
  const [grassColor, setGrassColor] = useState('#7cba3d'); // 深绿色
  
  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  
  // 更新统计信息（低频，每秒1次）
  useEffect(() => {
    if (!manager) return;
    
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [manager]);
  
  // 更新 FPS（高频，每帧）
  useEffect(() => {
    if (!manager) return;
    
    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        if (fpsRef.current) {
          fpsRef.current.textContent = `${fps}`;
        }
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    const animId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animId);
  }, [manager]);
  
  // 控制按钮
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 🎬 后期特效控制
  const handleBloomStrengthChange = (value: number) => {
    setBloomStrength(value);
    // 优先使用 prop callback，回退到 window 全局控制
    if (onBloomStrengthChange) {
      onBloomStrengthChange(value);
    } else if ((window as any).renderDemoControls) {
      (window as any).renderDemoControls.setBloomStrength(value);
    }
  };
  
  const handleBloomThresholdChange = (value: number) => {
    setBloomThreshold(value);
    // 优先使用 prop callback，回退到 window 全局控制
    if (onBloomThresholdChange) {
      onBloomThresholdChange(value);
    } else if ((window as any).renderDemoControls) {
      (window as any).renderDemoControls.setBloomThreshold(value);
    }
  };
  
  // 🎬 环境导演控制
  const handleTimeOfDayChange = (value: number) => {
    setTimeOfDay(value);
    if (manager) {
      manager.setTimeOfDay(value);
    }
  };
  
  const handleSunIntensityChange = (value: number) => {
    setSunIntensity(value);
    if (manager) {
      manager.setLightIntensity(value);
    }
  };
  
  // 🌿 植被控制
  const handleGrassScaleChange = (value: number) => {
    setGrassScale(value);
    if (manager) {
      manager.setGrassScale(value);
    }
    if (onGrassScaleChange) {
      onGrassScaleChange(value);
    }
  };
  
  const handleWindStrengthChange = (value: number) => {
    setWindStrength(value);
    if (manager) {
      manager.setWindStrength(value);
    }
    if (onWindStrengthChange) {
      onWindStrengthChange(value);
    }
  };
  
  const handleGrassColorChange = (color: string) => {
    setGrassColor(color);
    if (manager) {
      manager.setGrassColor(color);
    }
    if (onGrassColorChange) {
      onGrassColorChange(color);
    }
  };
  
  const handleSpawnGrass = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    
    // 异步生成，避免阻塞 UI
    setTimeout(() => {
      manager.spawnVegetation(5000);
      setIsGenerating(false);
    }, 0);
  };
  
  const handleCreateMountain = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      manager.createMountain();
      setIsGenerating(false);
    }, 0);
  };
  
  const handleCreateValley = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    
    setTimeout(() => {
      manager.createValley();
      setIsGenerating(false);
    }, 0);
  };
  
  const handleOneClickDemo = async () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    
    console.log('🎬 One-click demo started!');
    
    try {
      // 1. 创建山峰（异步）
      await new Promise<void>(resolve => {
        setTimeout(() => {
          manager.createMountain();
          console.log('✓ Mountain created');
          resolve();
        }, 0);
      });
      
      // 2. 等待 500ms 让浏览器喘息
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. 生成植被（异步）
      await new Promise<void>(resolve => {
        setTimeout(() => {
          manager.spawnVegetation(5000);
          console.log('✓ Vegetation spawned');
          resolve();
        }, 0);
      });
      
      // 4. 设置日落时间
      manager.setSunsetTime();
      console.log('✓ Sunset time set');
      
      console.log('✅ One-click demo completed!');
    } catch (error) {
      console.error('❌ One-click demo failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (!manager) {
    return (
      <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden architecture-validation-panel" data-panel="true">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <i className="fas fa-eye text-white text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">架构验证观测窗口</h2>
            <p className="text-xs text-gray-400">v1.3.0 核心引擎预览</p>
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fas fa-chart-bar text-green-400"></i>
          实时统计
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">实体数</div>
            <div className="text-2xl font-bold text-white">{stats.entityCount}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">FPS</div>
            <div className="text-2xl font-bold text-green-400">
              <span ref={fpsRef}>60</span>
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">顶点数</div>
            <div className="text-2xl font-bold text-blue-400">{stats.terrainVertices.toLocaleString()}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">植被实例</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.vegetationCount.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      {/* Controls Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 🎬 后期特效控制 */}
        <div>
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <i className="fas fa-magic text-purple-400"></i>
            后期特效
          </h3>
          
          <div className="space-y-4">
            {/* Bloom Strength */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400">辉光强度</label>
                <span className="text-xs text-purple-400 font-mono">{bloomStrength.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={bloomStrength}
                onChange={(e) => handleBloomStrengthChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-purple"
              />
            </div>
            
            {/* Bloom Threshold */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400">辉光阈值</label>
                <span className="text-xs text-purple-400 font-mono">{bloomThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bloomThreshold}
                onChange={(e) => handleBloomThresholdChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-purple"
              />
            </div>
          </div>
        </div>
        
        {/* 🎬 环境导演控制 */}
        <div className="border-t border-gray-800 pt-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <i className="fas fa-sun text-yellow-400"></i>
            环境导演
          </h3>
          
          <div className="space-y-4">
            {/* Time of Day */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400">时间</label>
                <span className="text-xs text-yellow-400 font-mono">{timeOfDay.toFixed(1)}:00</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={timeOfDay}
                onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-yellow"
              />
            </div>
            
            {/* Sun Intensity */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400">光照强度</label>
                <span className="text-xs text-yellow-400 font-mono">{sunIntensity.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={sunIntensity}
                onChange={(e) => handleSunIntensityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-yellow"
              />
            </div>
          </div>
        </div>
        
        {/* 上帝之手 */}
        <div className="border-t border-gray-800 pt-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fas fa-sliders-h text-green-400"></i>
          上帝之手
        </h3>
        
        {/* 🌿 植被微调控制 */}
        <div className="space-y-4 mb-4 pb-4 border-b border-gray-800">
          {/* Grass Scale */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-400">草地缩放</label>
              <span className="text-xs text-green-400 font-mono">{grassScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={grassScale}
              onChange={(e) => handleGrassScaleChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-green"
            />
          </div>
          
          {/* Wind Strength */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-gray-400">风场强度</label>
              <span className="text-xs text-green-400 font-mono">{windStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={windStrength}
              onChange={(e) => handleWindStrengthChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider-green"
            />
          </div>
          
          {/* Grass Color Presets */}
          <div>
            <div className="text-xs text-gray-400 mb-2">草地颜色</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleGrassColorChange('#7cba3d')}
                className={`py-1.5 rounded text-xs font-bold transition-all ${grassColor === '#7cba3d' ? 'bg-green-600 text-white ring-2 ring-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                深绿
              </button>
              <button
                onClick={() => handleGrassColorChange('#a8d96e')}
                className={`py-1.5 rounded text-xs font-bold transition-all ${grassColor === '#a8d96e' ? 'bg-green-500 text-white ring-2 ring-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                亮绿
              </button>
              <button
                onClick={() => handleGrassColorChange('#d4b86a')}
                className={`py-1.5 rounded text-xs font-bold transition-all ${grassColor === '#d4b86a' ? 'bg-yellow-600 text-white ring-2 ring-yellow-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                枯黄
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={handleSpawnGrass}
            disabled={isGenerating}
            className={`w-full py-2 ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'} text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2`}
          >
            <i className="fas fa-seedling"></i>
            {isGenerating ? '生成中...' : '生成草地 (5000)'}
          </button>
          
          {/* 🔍 调试按钮 */}
          <button
            onClick={() => manager?.debugVegetation()}
            className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-bug"></i>
            🔍 调试植被渲染
          </button>
          
          <button
            onClick={handleCreateMountain}
            disabled={isGenerating}
            className={`w-full py-2 ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-500'} text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2`}
          >
            <i className="fas fa-mountain"></i>
            创建山峰
          </button>
          
          <button
            onClick={handleCreateValley}
            disabled={isGenerating}
            className={`w-full py-2 ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2`}
          >
            <i className="fas fa-water"></i>
            创建山谷
          </button>
        </div>
        
        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={handleOneClickDemo}
            disabled={isGenerating}
            className={`w-full py-3 ${isGenerating ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'} text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2`}
          >
            <i className={`fas ${isGenerating ? 'fa-spinner fa-spin' : 'fa-magic'}`}></i>
            {isGenerating ? '演示进行中...' : '一键演示'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            自动创建山峰 + 植被 + 日落光影
          </p>
        </div>
        </div>
      </div>
      
      {/* 🎨 滑块样式 */}
      <style>{`
        /* Purple Slider */
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea, #db2777);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(147, 51, 234, 0.5);
        }
        
        .slider-purple::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #9333ea, #db2777);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(147, 51, 234, 0.5);
        }
        
        /* Yellow Slider */
        .slider-yellow::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #eab308);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }
        
        .slider-yellow::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #eab308);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
        }
        
        /* Green Slider */
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #22c55e);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
        
        .slider-green::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #22c55e);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  );
};
