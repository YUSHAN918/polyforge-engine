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
import { ArchitectureValidationManager } from '../core/ArchitectureValidationManager';

interface ArchitectureValidationPanelProps {
  manager: ArchitectureValidationManager | null;
}

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({ manager }) => {
  const [stats, setStats] = useState({
    entityCount: 0,
    systemCount: 0,
    vegetationCount: 0,
    terrainVertices: 0,
  });
  
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
  const handleSpawnGrass = () => {
    if (!manager) return;
    manager.spawnVegetation(5000);
  };
  
  const handleCreateMountain = () => {
    if (!manager) return;
    manager.createMountain();
  };
  
  const handleCreateValley = () => {
    if (!manager) return;
    manager.createValley();
  };
  
  const handleOneClickDemo = () => {
    if (!manager) return;
    
    console.log('🎬 One-click demo started!');
    
    // 1. 创建山峰
    manager.createMountain();
    
    // 2. 等待 500ms 后生成植被
    setTimeout(() => {
      manager.spawnVegetation(5000);
    }, 500);
    
    // 3. 设置日落时间
    manager.setSunsetTime();
    
    console.log('✓ One-click demo executed!');
  };
  
  if (!manager) {
    return (
      <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden">
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
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
          <i className="fas fa-sliders-h text-purple-400"></i>
          上帝之手
        </h3>
        
        <div className="space-y-2 mb-4">
          <button
            onClick={handleSpawnGrass}
            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-seedling"></i>
            生成草地 (5000)
          </button>
          
          <button
            onClick={handleCreateMountain}
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-mountain"></i>
            创建山峰
          </button>
          
          <button
            onClick={handleCreateValley}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <i className="fas fa-water"></i>
            创建山谷
          </button>
        </div>
        
        <div className="border-t border-gray-800 pt-4">
          <button
            onClick={handleOneClickDemo}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <i className="fas fa-magic"></i>
            一键演示
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            自动创建山峰 + 植被 + 日落光影
          </p>
        </div>
      </div>
    </div>
  );
};
