/**
 * PolyForge v1.3.0 - ArchitectureValidationPanel
 * 架构验证观测窗口 - Project Orbital Command UI
 * 
 * Layout:
 * - Top HUD: FPS, Entity, Tools
 * - Center Tabs: World, Director, Assets
 * - Bottom Footer: Command Log
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArchitectureValidationManager } from '../../core/ArchitectureValidationManager';
import { CameraMode } from '../../core/components/CameraComponent';
import { ValidationContext } from '../../core/ArchitectureValidationManager';

interface ArchitectureValidationPanelProps {
  manager: ArchitectureValidationManager | null;
  onBloomStrengthChange?: (value: number) => void;
  onBloomThresholdChange?: (value: number) => void;
  onGrassScaleChange?: (value: number) => void;
  onWindStrengthChange?: (value: number) => void;
  onGrassColorChange?: (color: string) => void;
}

type TabType = 'world' | 'director' | 'assets' | 'experience' | 'stats';

export const ArchitectureValidationPanel: React.FC<ArchitectureValidationPanelProps> = ({
  manager,
  onBloomStrengthChange,
  onBloomThresholdChange,
  onGrassScaleChange,
  onWindStrengthChange,
  onGrassColorChange
}) => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<TabType>('world');
  const [currentContext, setCurrentContext] = useState<ValidationContext>(ValidationContext.CREATION);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);

  const [stats, setStats] = useState({
    entityCount: 0,
    systemCount: 0,
    vegetationCount: 0,
    terrainVertices: 0,
    undoCount: 0,
    redoCount: 0,
    lastCommand: '' as string | null,
    hasSave: false,
    physicsInitialized: false,
    physicsBodies: 0,
    assetCount: 0,
    undoHistory: [] as any[],
  });

  const [assetList, setAssetList] = useState<any[]>([]);
  const [audioState, setAudioState] = useState({
    volume: 0.5,
  });

  // 导演控制状态
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.5);
  const [physicsDebugEnabled, setPhysicsDebugEnabled] = useState(false);
  const [audioDebugEnabled, setAudioDebugEnabled] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(17);
  const [sunIntensity, setSunIntensity] = useState(1.0);
  const [cameraMode, setCameraMode] = useState<CameraMode>('orbit');
  const [fov, setFov] = useState(60);
  const [smaaEnabled, setSmaaEnabled] = useState(true);
  const [exposure, setExposure] = useState(1.0);
  const [moveSpeed, setMoveSpeed] = useState(10.0);
  const [forceMultiplier, setForceMultiplier] = useState(25.0);

  // World Controls
  const [grassScale, setGrassScale] = useState(1.0);
  const [windStrength, setWindStrength] = useState(0.1);
  const [grassColor, setGrassColor] = useState('#7cba3d');
  const [flowerColor, setFlowerColor] = useState('#ff69b4'); // 🔥 新增花卉颜色状态
  const [activeVegType, setActiveVegType] = useState<'grass' | 'flower'>('grass'); // 🔥 当前控制类型
  const [gravityY, setGravityY] = useState(-9.8);
  const [isGenerating, setIsGenerating] = useState(false);

  // Asset Controls
  const [activeAssetTab, setActiveAssetTab] = useState<'all' | 'model' | 'image' | 'audio' | 'hdr'>('all');

  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // 🔥 状态锚点：用于避免 React 闭包陷阱和冗余更新
  const stateRef = useRef({
    timeOfDay, bloomStrength, bloomThreshold, grassScale, windStrength, grassColor, flowerColor
  });

  // 每次渲染更新 Ref (保持最新)
  useEffect(() => {
    stateRef.current = { timeOfDay, bloomStrength, bloomThreshold, grassScale, windStrength, grassColor, flowerColor };
  });

  // --- 生命周期与交互逻辑 ---

  // 1. 低频数据统计更新 (1s 周期)
  useEffect(() => {
    if (!manager) return;

    const interval = setInterval(() => {
      const coreStats = manager.getStats();
      const commandStats = manager.getCommandManager().getStats();
      const storageStatus = manager.getStorageManager().hasSave();

      const history = manager.getCommandManager().getHistory(); // Assuming getHistory exists or we use access via undoStack if public, but manager has getCommandManager().
      // The previous file used manager.getCommandHistory() which might be a helper on manager, checking...
      // The previous file had: undoHistory: manager.getCommandHistory().undo.slice(-10).reverse()
      // Let's check ArchitectureValidationManager.ts if needed, but I'll assume getCommandHistory() exists on manager based on previous code.
      // Wait, investigating previous code line 91: manager.getCommandHistory()

      setStats({
        ...coreStats,
        undoCount: commandStats.undoStackSize,
        redoCount: commandStats.redoStackSize,
        lastCommand: commandStats.lastCommand,
        hasSave: storageStatus,
        assetCount: manager.getAssetRegistry().getCacheStats().size,
        undoHistory: manager.getCommandHistory().undo.slice(-20).reverse(), // Last 20
      });

      manager.getAssetRegistry().getAllMetadata().then(list => {
        setAssetList(list);
      });
    }, 1000);

    // Initial Sync
    const worldState = manager.getEnvironmentState();
    setTimeOfDay(worldState.timeOfDay);
    if (worldState.smaaEnabled !== undefined) setSmaaEnabled(worldState.smaaEnabled);
    if (worldState.toneMappingExposure !== undefined) setExposure(worldState.toneMappingExposure);
    if (worldState.physicsDebugEnabled !== undefined) setPhysicsDebugEnabled(worldState.physicsDebugEnabled);
    if (worldState.audioDebugEnabled !== undefined) setAudioDebugEnabled(worldState.audioDebugEnabled);
    if (worldState.gravityY !== undefined) setGravityY(worldState.gravityY);

    // 🔥 同步后处理参数
    if (worldState.bloomStrength !== undefined) {
      setBloomStrength(worldState.bloomStrength);
      manager.getWorldStateManager().setBloomStrength(worldState.bloomStrength); // Force Sync
      if (onBloomStrengthChange) onBloomStrengthChange(worldState.bloomStrength);
      if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomStrength(worldState.bloomStrength);
    }
    if (worldState.bloomThreshold !== undefined) {
      setBloomThreshold(worldState.bloomThreshold);
      manager.getWorldStateManager().setBloomThreshold(worldState.bloomThreshold); // Force Sync
      if (onBloomThresholdChange) onBloomThresholdChange(worldState.bloomThreshold);
      if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomThreshold(worldState.bloomThreshold);
    }

    // 🔥 实时同步监听：确保 UI 随引擎状态（如时间流转）自动更新
    const handleStateChange = (state: any) => {
      // 1. 差分更新：只有数值真正变化时才触发 React重绘
      // 使用 Ref.current 获取最新的本地状态进行对比，避开闭包

      if (Math.abs(state.timeOfDay - stateRef.current.timeOfDay) > 0.05) {
        setTimeOfDay(state.timeOfDay);
      }

      // 容差对比，避免浮点数抖动导致的死循环
      if (Math.abs(state.bloomStrength - stateRef.current.bloomStrength) > 0.001) {
        setBloomStrength(state.bloomStrength);
      }
      if (Math.abs(state.bloomThreshold - stateRef.current.bloomThreshold) > 0.001) {
        setBloomThreshold(state.bloomThreshold);
      }
      if (state.gravityY !== undefined && Math.abs(state.gravityY - gravityY) > 0.01) {
        setGravityY(state.gravityY);
      }

      // 注意：这里由于是展示面板，我们暂不反向通知父级 App.tsx，
      // 除非是由用户拖动引起的变更（见 handleXXXChange 方法）
    };
    manager.getWorldStateManager().onStateChanged(handleStateChange);

    // Initial Vegetation Sync
    const entities = manager.getEntityManager().getAllEntities();
    const vegEntity = entities.find(e => e.hasComponent('Vegetation'));
    if (vegEntity) {
      const vegComp = vegEntity.getComponent('Vegetation') as any;
      if (vegComp && vegComp.config) {
        setGrassScale(vegComp.config.scale || 1.0);
        setWindStrength(vegComp.config.windStrength || 0.1);
        setGrassColor(vegComp.config.baseColor || '#7cba3d');
      }
    }

    // 🔥 同步相机移动参数
    const camEntity = manager.getEntityManager().getAllEntities().find(e => e.hasComponent('Camera'));
    if (camEntity) {
      const cam = camEntity.getComponent('Camera') as any;
      if (cam) {
        if (cam.moveSpeed !== undefined) setMoveSpeed(cam.moveSpeed);
        if (cam.forceMultiplier !== undefined) setForceMultiplier(cam.forceMultiplier);
      }
    }

    // 初始上下文同步
    setCurrentContext(manager.getContext());

    return () => {
      clearInterval(interval);
      manager.getWorldStateManager().offStateChanged(handleStateChange);
    };
  }, [manager]);

  const refreshAssets = () => {
    if (!manager) return;
    manager.getAssetRegistry().getAllMetadata().then(list => {
      setAssetList(list);
    });
  };

  // 2. 高频 FPS 更新循环
  useEffect(() => {
    if (!manager) return;
    const updateFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        if (fpsRef.current) fpsRef.current.textContent = `${fps}`;
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      requestAnimationFrame(updateFPS);
    };
    const animId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animId);
  }, [manager]);

  // --- 交互处理函数 ---

  // 泛光控制
  const handleBloomStrengthChange = (val: number) => {
    setBloomStrength(val);
    if (manager) manager.getWorldStateManager().setBloomStrength(val);
    if (onBloomStrengthChange) onBloomStrengthChange(val);
    else if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomStrength(val);
  };

  const handleBloomThresholdChange = (val: number) => {
    setBloomThreshold(val);
    if (manager) manager.getWorldStateManager().setBloomThreshold(val);
    if (onBloomThresholdChange) onBloomThresholdChange(val);
    else if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomThreshold(val);
  };

  // 物理系统控制
  const handleGravityChange = (val: number) => {
    setGravityY(val);
    if (manager) manager.setGravity(val);
  };

  // 环境控制
  const handleTimeOfDayChange = (val: number) => {
    setTimeOfDay(val);
    if (manager) manager.setTimeOfDay(val);
  };

  const handleSunIntensityChange = (val: number) => {
    setSunIntensity(val);
    if (manager) manager.setLightIntensity(val);
  };

  const handlePhysicsDebugChange = (val: boolean) => {
    setPhysicsDebugEnabled(val);
    if (manager) manager.setPhysicsDebugEnabled(val);
  };

  const handleExplosionTest = () => {
    if (manager) {
      // 在原点上方施加物理爆炸力
      manager.applyPhysicsExplosion([0, 5, 0], 200, 20); // 冲力增强
    }
  };

  /**
   * 🔥 功能找回：生成重力演示方块
   */
  const handleSpawnPhysicsCube = () => {
    if (manager) {
      manager.spawnPhysicsBox();
    }
  };

  // 相机与渲染控制
  const handleCameraModeChange = (mode: string) => {
    const m = mode as CameraMode;
    setCameraMode(m);
    if (manager) {
      manager.setCameraMode(m);
      setCurrentContext(manager.getContext()); // 同步上下文状态

      // 🔥 自动适应 Tab 选项卡
      if (m === 'orbit') {
        setActiveTab('world');
      } else {
        setActiveTab('experience');
      }

      // 🔥 针对编辑器体验：切换到 FP/TP 时重置视角，解决“对准地面”的问题
      if (m === 'firstPerson' || m === 'thirdPerson') {
        const cam = manager.getEntityManager().getAllEntities()
          .find(e => e.hasComponent('Camera'))?.getComponent('Camera') as any;
        if (cam) {
          cam.pitch = 0; // 水平视线
          cam.pivotOffset = [0, 0, 0]; // 重置位移
        }
      }
    }
  };

  const handleContextSwitch = (context: ValidationContext) => {
    if (!manager) return;
    if (context === ValidationContext.CREATION) {
      handleCameraModeChange('orbit');
    } else {
      // 制作人要求：进入体验模块默认使用等距上帝视角 (Isometric)
      handleCameraModeChange('isometric');
    }
  };

  const handleFovChange = (val: number) => {
    setFov(val);
    if (manager) manager.setCameraFOV(val);
  };

  const handleSMAAChange = (val: boolean) => {
    setSmaaEnabled(val);
    if (manager) manager.setSMAAEnabled(val);
  };

  const handleExposureChange = (val: number) => {
    setExposure(val);
    if (manager) manager.setToneMappingExposure(val);
  };

  const handleMoveSpeedChange = (val: number) => {
    setMoveSpeed(val);
    if (manager) {
      const camera = manager.getEntityManager().getAllEntities()
        .find(e => e.hasComponent('Camera'))?.getComponent('Camera') as any;
      if (camera) camera.moveSpeed = val;
    }
  };

  const handleForceMultiplierChange = (val: number) => {
    setForceMultiplier(val);
    if (manager) {
      const camera = manager.getEntityManager().getAllEntities()
        .find(e => e.hasComponent('Camera'))?.getComponent('Camera') as any;
      if (camera) camera.forceMultiplier = val;
    }
  };

  // 植被控制
  const handleGrassScaleChange = (val: number) => {
    setGrassScale(val);
    if (manager) manager.setGrassScale(val);
    if (onGrassScaleChange) onGrassScaleChange(val);
  };

  const handleWindStrengthChange = (val: number) => {
    setWindStrength(val);
    if (manager) manager.setWindStrength(val);
    if (onWindStrengthChange) onWindStrengthChange(val);
  };

  const handleSpawnFlowers = () => {
    if (manager) manager.spawnFlowers(500); // 默认生成 500 朵花
  };

  const handleAudioDebugChange = (val: boolean) => {
    setAudioDebugEnabled(val);
    if (manager) manager.setAudioDebugEnabled(val);
  };

  const handleVegetationColorChange = (color: string) => {
    if (activeVegType === 'grass') {
      setGrassColor(color);
    } else {
      setFlowerColor(color);
    }

    if (manager) {
      manager.getEntityManager().getAllEntities().forEach(entity => {
        const vegetation = entity.getComponent('Vegetation') as any;
        if (vegetation && vegetation.config.type === activeVegType) {
          vegetation.config.baseColor = color;
          vegetation.isDirty = true; // 标记脏以触发重新生成或更新
        }
      });
    }
    if (onGrassColorChange && activeVegType === 'grass') onGrassColorChange(color);
  };

  // 动作类操作
  const handleSpawnGrass = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => { manager.spawnVegetation(5000); setIsGenerating(false); }, 0);
  };

  const handleCreateMountain = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => { manager.createMountain(); setIsGenerating(false); }, 0);
  };

  const handleCreateValley = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => { manager.createValley(); setIsGenerating(false); }, 0);
  };

  const handleFlattenTerrain = () => {
    if (!manager || isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => { manager.flattenTerrain(); setIsGenerating(false); }, 0);
  };

  const handleClearVegetation = () => {
    if (!manager) return;
    if (confirm('确定要清除所有植被吗？(Are you sure to clear all vegetation?)')) {
      manager.clearVegetation();
    }
  };

  // 资产管理逻辑
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        try {
          const registry = manager!.getAssetRegistry();
          await registry.registerAsset({
            name: file.name,
            type: 'texture' as any,
            category: 'images',
            tags: ['image', 'imported'],
            size: file.size,
          }, file);
          alert(`图片导入成功: ${file.name}`);
        } catch (err) {
          console.error(err);
          alert('导入失败');
        }
      }
    };
    input.click();
  };

  const handleFolderUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // @ts-ignore
    input.webkitdirectory = true;
    // @ts-ignore
    input.directory = true;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      if (!confirm(`发现 ${files.length} 个文件，确认全部导入吗？`)) return;

      const registry = manager!.getAssetRegistry();
      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // 依据扩展名自动识别类型
          if (file.name.match(/\.(glb|gltf)$/i)) {
            await registry.importModel(file, { category: 'models' });
            successCount++;
          } else if (file.name.match(/\.(mp3|wav|ogg)$/i)) {
            await registry.importAudio(file, { category: 'audio' });
            successCount++;
          } else if (file.name.match(/\.(hdr)$/i)) {
            await registry.importHDR(file, { category: 'environments' });
            successCount++;
          } else if (file.name.match(/\.(png|jpg|jpeg|webp)$/i)) {
            await registry.registerAsset({
              name: file.name,
              type: 'image' as any,
              category: 'images',
              tags: ['imported', 'image'],
              size: file.size,
            }, file);
            successCount++;
          }
        } catch (err) {
          console.warn(`略过文件 ${file.name}:`, err);
        }
      }

      refreshAssets();
      alert(`批量导入完成。成功导入 ${successCount} 个资产。`);
    };
    input.click();
  };

  const handleExportBundle = async () => {
    const name = prompt('请输入 Bundle 名称 (Enter Bundle Name):', 'MySceneLevel');
    if (!name) return;
    try {
      await manager.exportBundle(name);
    } catch (e) {
      alert('导出失败 (Export Failed)');
      console.error(e);
    }
  };

  /* 🔥 新增：分类型导入处理器与 Bundle 管理 */
  const handleModelUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !manager) return;
      try {
        await manager.getAssetRegistry().importModel(file, { category: 'models' });
        refreshAssets();
        alert(`模型导入成功: ${file.name}`);
      } catch (err) {
        console.error(err);
        alert('导入失败');
      }
    };
    input.click();
  };

  const handleAudioUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mp3,.wav,.ogg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !manager) return;
      try {
        await manager.getAssetRegistry().importAudio(file, { category: 'audio' });
        refreshAssets();
        alert(`音频导入成功: ${file.name}`);
      } catch (err) {
        console.error(err);
        alert('导入失败');
      }
    };
    input.click();
  };

  const handleHDRUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.hdr';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !manager) return;
      try {
        await manager.getAssetRegistry().importHDR(file, { category: 'environments' });
        refreshAssets();
        alert(`HDR 导入成功: ${file.name}`);
      } catch (err) {
        console.error(err);
        alert('导入失败');
      }
    };
    input.click();
  };

  const handleImportBundleLogic = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pfb';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && manager) manager.importBundle(file);
    };
    input.click();
  };

  if (!manager) {
    return <div className="w-96 h-full bg-gray-950 flex items-center justify-center text-gray-500 italic font-mono">
      <i className="fas fa-circle-notch fa-spin mr-2"></i> 正在接入轨道指挥部...
    </div>;
  }

  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden font-sans text-xs select-none shadow-2xl z-50">

      {/* 1. HUD Top Bar (60px) */}
      <div className="h-[60px] bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 shadow-md z-10">
        {/* Left: Stats */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">帧率</span>
            <span ref={fpsRef} className="text-xl font-bold text-green-400 font-mono leading-none">60</span>
          </div>
          <div className="h-6 w-px bg-gray-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">实体数</span>
            <span className="text-xl font-bold text-white font-mono leading-none">{stats.entityCount}</span>
          </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => manager.getCommandManager().undo()}
            disabled={stats.undoCount === 0}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${stats.undoCount > 0 ? 'text-blue-400 hover:bg-blue-900/30' : 'text-gray-700 cursor-not-allowed'}`}
            title="撤销 (Undo)"
          >
            <i className="fas fa-undo"></i>
          </button>
          <button
            onClick={() => manager.getCommandManager().redo()}
            disabled={stats.redoCount === 0}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${stats.redoCount > 0 ? 'text-blue-400 hover:bg-blue-900/30' : 'text-gray-700 cursor-not-allowed'}`}
            title="重做 (Redo)"
          >
            <i className="fas fa-redo"></i>
          </button>
          <div className="h-4 w-px bg-gray-800 mx-1"></div>
          <button
            onClick={() => manager.saveScene()}
            className="w-8 h-8 rounded flex items-center justify-center text-orange-400 hover:bg-orange-900/30 transition-all"
            title="保存快照"
          >
            <i className="fas fa-save"></i>
          </button>
          <button
            onClick={() => { manager.getStorageManager().clear(); window.location.reload(); }}
            className="w-8 h-8 rounded flex items-center justify-center text-red-500 hover:bg-red-900/30 transition-all"
            title="清空重置"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>

      {/* 1.1 Mode Switcher (Creation vs Experience) */}
      <div className="bg-gray-950 p-2 shrink-0">
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => handleContextSwitch(ValidationContext.CREATION)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.CREATION ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <i className="fas fa-tools"></i> 创造 (Creation)
          </button>
          <button
            onClick={() => handleContextSwitch(ValidationContext.EXPERIENCE)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.EXPERIENCE ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <i className="fas fa-play"></i> 体验 (Experience)
          </button>
        </div>
      </div>

      {/* 2. Tab Navigation */}
      <div className="flex bg-gray-950 border-b border-gray-800 shrink-0">
        {currentContext === ValidationContext.CREATION ? (
          <>
            <button
              onClick={() => setActiveTab('world')}
              className={`flex-1 py-3 text-center transition-colors relative ${activeTab === 'world' ? 'text-green-400 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <i className="fas fa-globe"></i> 创世 (World)
              </div>
              {activeTab === 'world' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('director')}
              className={`flex-1 py-3 text-center transition-colors relative ${activeTab === 'director' ? 'text-purple-400 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <i className="fas fa-video"></i> 导演 (Director)
              </div>
              {activeTab === 'director' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={`flex-1 py-3 text-center transition-colors relative ${activeTab === 'assets' ? 'text-cyan-400 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <i className="fas fa-boxes"></i> 资产 (Assets)
              </div>
              {activeTab === 'assets' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('experience')}
              className={`flex-1 py-3 text-center transition-colors relative ${activeTab === 'experience' ? 'text-indigo-400 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <i className="fas fa-gamepad"></i> 玩法 (Play)
              </div>
              {activeTab === 'experience' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-center transition-colors relative ${activeTab === 'stats' ? 'text-orange-400 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <div className="flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-[10px]">
                <i className="fas fa-chart-line"></i> 数据 (Stats)
              </div>
              {activeTab === 'stats' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>}
            </button>
          </>
        )}
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">

        {/* === WORLD TAB === */}
        {currentContext === ValidationContext.CREATION && activeTab === 'world' && (
          <div className="space-y-6 fade-in">
            {/* Terrain Section */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-mountain text-orange-500"></i> 地形雕刻 (Terrain)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCreateMountain} disabled={isGenerating}
                  className="py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-chevron-up"></i> 造山
                </button>
                <button
                  onClick={handleCreateValley} disabled={isGenerating}
                  className="py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-chevron-down"></i> 造谷
                </button>
                <button
                  onClick={handleFlattenTerrain} disabled={isGenerating}
                  className="col-span-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] rounded border border-gray-700 transition-all"
                >
                  夷为平地 (Reset Flat)
                </button>
              </div>
            </section>

            {/* Vegetation Section */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-seedling text-green-500"></i> 植被系统 (Vegetation)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                {/* Scale & Wind */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 block mb-1">缩放 (Scale)</label>
                    <input type="range" min="0.1" max="3" step="0.1" value={grassScale} onChange={(e) => handleGrassScaleChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">风场 (Wind)</label>
                    <input type="range" min="0" max="1" step="0.01" value={windStrength} onChange={(e) => handleWindStrengthChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  </div>
                </div>

                <div className="flex bg-gray-900 rounded-lg p-0.5">
                  <button onClick={() => setActiveVegType('grass')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'grass' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>草地</button>
                  <button onClick={() => setActiveVegType('flower')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'flower' ? 'bg-pink-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>花卉</button>
                </div>

                <div className="flex gap-2">
                  {(activeVegType === 'grass' ? ['#7cba3d', '#a8d96e', '#d4b86a', '#3f6b2b'] : ['#ff69b4', '#ff1493', '#da70d6', '#ffb6c1']).map(c => (
                    <button key={c} onClick={() => handleVegetationColorChange(c)} className={`flex-1 h-6 rounded border ${(activeVegType === 'grass' ? grassColor : flowerColor) === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>

                <button onClick={activeVegType === 'grass' ? handleSpawnGrass : handleSpawnFlowers} disabled={isGenerating} className={`w-full py-2 font-bold rounded shadow-lg transition-all ${activeVegType === 'grass' ? 'bg-green-600 hover:bg-green-500' : 'bg-pink-600 hover:bg-pink-500'} text-white`}>
                  <i className={`fas ${activeVegType === 'grass' ? 'fa-magic' : 'fa-seedling'} mr-2`}></i>
                  {isGenerating ? '生成中...' : (activeVegType === 'grass' ? '生成草地 (5000)' : '种植花朵 (500)')}
                </button>

                <div className="flex justify-between items-center text-[10px] mt-2">
                  <span className="text-gray-500">实例总数: <span className="text-green-400 font-mono">{stats.vegetationCount}</span></span>
                  <button onClick={handleClearVegetation} className="text-red-400 hover:text-red-300 transition-colors uppercase font-bold">清除所有</button>
                </div>
              </div>
            </section>

            {/* 🔥 功能独立：物理演示模块 (Physics) */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-atom text-blue-500"></i> 物理仿真 (Physics)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500 text-[10px]">重力 (Gravity Y)</label>
                    <span className="text-blue-400 font-mono text-[10px]">{gravityY.toFixed(2)} m/s²</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.1"
                    value={gravityY}
                    onChange={(e) => handleGravityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[8px] text-gray-600 mt-1">
                    <span>强重力</span>
                    <span>无重力</span>
                    <span>反重力</span>
                  </div>
                </div>

                <button
                  onClick={handleSpawnPhysicsCube}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-lg transition-all"
                >
                  <i className="fas fa-cube mr-2"></i> 生成重力方块 (Physics Cube)
                </button>
              </div>
            </section>
          </div>
        )}

        {/* === EXPERIENCE TAB === */}
        {currentContext === ValidationContext.EXPERIENCE && activeTab === 'experience' && (
          <div className="space-y-6 fade-in">
            {/* Archetype Selector */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-users-cog text-indigo-500"></i> 玩法原型 (Archetypes)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'firstPerson', label: 'FPS', icon: 'fa-eye' },
                  { id: 'thirdPerson', label: 'TPS', icon: 'fa-user' },
                  { id: 'isometric', label: 'Action RPG', icon: 'fa-chess-rook' },
                  { id: 'sidescroll', label: 'Platformer', icon: 'fa-walking' },
                ].map(arc => (
                  <button
                    key={arc.id}
                    onClick={() => handleCameraModeChange(arc.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${cameraMode === arc.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-lg' : 'bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'}`}
                  >
                    <i className={`fas ${arc.icon} text-xl`}></i>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{arc.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Play Actions */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-play-circle text-green-500"></i> 交互与重置 (Actions)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCameraModeChange(cameraMode)}
                    className="flex-1 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-600/50 text-green-400 rounded transition-all font-bold"
                    title="重新生成角色在相机位置"
                  >
                    <i className="fas fa-sync-alt mr-2"></i> 重生 (Respawn)
                  </button>
                  <button
                    onClick={handleExplosionTest}
                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-400 rounded transition-all font-bold"
                  >
                    <i className="fas fa-bomb mr-2"></i> 爆炸测试
                  </button>
                </div>
                <div className="flex justify-between items-center py-1 border-t border-gray-800 mt-2">
                  <label className="text-gray-400 flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={physicsDebugEnabled} onChange={(e) => handlePhysicsDebugChange(e.target.checked)} className="w-3 h-3 rounded bg-gray-800 border-gray-700 text-indigo-500" />
                    <span>物理碰撞体调试 (Physics Debug)</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Controller Settings */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-gamepad text-blue-500"></i> 控制器参数 (Controller Tuning)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">移动速度 (Move Speed)</label>
                    <span className="text-blue-400 font-mono">{moveSpeed.toFixed(1)}</span>
                  </div>
                  <input type="range" min="1" max="50" step="0.5" value={moveSpeed} onChange={(e) => handleMoveSpeedChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">推力倍率 (Force Mult)</label>
                    <span className="text-blue-400 font-mono">{forceMultiplier.toFixed(1)}</span>
                  </div>
                  <input type="range" min="1" max="100" step="1" value={forceMultiplier} onChange={(e) => handleForceMultiplierChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === DIRECTOR / VISUALS TAB === */}
        {activeTab === 'director' && (
          <div className="space-y-6 fade-in">
            {/* Lighting (Creation Focus or Shared) */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-sun text-yellow-500"></i> 环境光照 (Lighting)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">时间 (Time)</label>
                    <span className="text-yellow-400 font-mono">{timeOfDay.toFixed(1)}:00</span>
                  </div>
                  <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>
                {/* 🔥 功能找回：光照强度控制 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">强度 (Intensity)</label>
                    <span className="text-yellow-400 font-mono">{sunIntensity.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="5" step="0.1" value={sunIntensity} onChange={(e) => handleSunIntensityChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>
              </div>
            </section>

            {/* PostFX */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-camera text-purple-500"></i> 镜头特效 (PostFX)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">泛光强度 (Bloom)</label>
                    <span className="text-purple-400 font-mono">{bloomStrength.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="3" step="0.1" value={bloomStrength} onChange={(e) => handleBloomStrengthChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div className="pb-2 border-b border-gray-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">曝光控制 (Exposure)</label>
                    <span className="text-purple-400 font-mono">{exposure.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0.1" max="4" step="0.1" value={exposure} onChange={(e) => handleExposureChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">抗锯齿 (SMAA)</span>
                  <button onClick={() => handleSMAAChange(!smaaEnabled)} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${smaaEnabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {smaaEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === ASSETS TAB (Redesigned) === */}
        {activeTab === 'assets' && (
          <div className="space-y-4 fade-in h-full flex flex-col">

            {/* Header & Category Tabs (Context Aware) */}
            <div className="flex flex-col gap-2 shrink-0">
              {/* Context Actions Row (Integrated) */}
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-database text-cyan-500"></i> 资产库 (Library)
                </h3>

                {/* Bundle Tools (Mini) */}
                <div className="flex gap-1">
                  <button
                    onClick={handleExportBundle}
                    className="w-6 h-6 bg-gray-800 hover:bg-cyan-900 border border-gray-700 text-cyan-400 rounded flex items-center justify-center transition-all"
                    title="导出 Bundle (Export)"
                  >
                    <i className="fas fa-file-archive text-[10px]"></i>
                  </button>
                  <button
                    onClick={handleImportBundleLogic}
                    className="w-6 h-6 bg-gray-800 hover:bg-orange-900 border border-gray-700 text-orange-400 rounded flex items-center justify-center transition-all"
                    title="导入 Bundle (Import)"
                  >
                    <i className="fas fa-file-import text-[10px]"></i>
                  </button>
                </div>
              </div>

              {/* Integrated Tab + Import Button (Split to avoid overlap) */}
              <div className="flex flex-col gap-2">
                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1 custom-scrollbar w-full">
                  {['all', 'model', 'image', 'audio', 'hdr'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveAssetTab(tab as any)}
                      className={`flex-1 px-3 py-1.5 rounded text-[9px] uppercase font-bold transition-all border shrink-0 text-center ${activeAssetTab === tab ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300' : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-gray-400'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Context Import Button (Full Width separate row) */}
                <button
                  onClick={() => {
                    if (activeAssetTab === 'model') handleModelUpload();
                    else if (activeAssetTab === 'image') handleImageUpload();
                    else if (activeAssetTab === 'audio') handleAudioUpload();
                    else if (activeAssetTab === 'hdr') handleHDRUpload();
                    else handleFolderUpload(); // Batch for 'all'
                  }}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded text-[10px] font-bold border transition-all w-full shadow-lg ${activeAssetTab === 'all' ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' :
                    activeAssetTab === 'model' ? 'bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/30' :
                      activeAssetTab === 'image' ? 'bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/30' :
                        activeAssetTab === 'audio' ? 'bg-yellow-600/20 border-yellow-500 text-yellow-300 hover:bg-yellow-600/30' :
                          'bg-cyan-600/20 border-cyan-500 text-cyan-300 hover:bg-cyan-600/30'
                    }`}
                >
                  <i className={`fas ${activeAssetTab === 'all' ? 'fa-folder-open' :
                    activeAssetTab === 'model' ? 'fa-cube' :
                      activeAssetTab === 'image' ? 'fa-image' :
                        activeAssetTab === 'audio' ? 'fa-music' : 'fa-cloud'
                    }`}></i>
                  <span>
                    {activeAssetTab === 'all' && '批量导入 (Batch Import)'}
                    {activeAssetTab === 'model' && '导入模型 (Import Model)'}
                    {activeAssetTab === 'image' && '导入图片 (Import Image)'}
                    {activeAssetTab === 'audio' && '导入音频 (Import Audio)'}
                    {activeAssetTab === 'hdr' && '导入 HDR (Import HDR)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Asset List with Thumbnails */}
            <div className="flex-1 overflow-y-auto bg-gray-950 border border-gray-800 rounded p-2 space-y-2 custom-scrollbar min-h-[200px]">
              {assetList.filter(a => {
                if (activeAssetTab === 'all') return true;
                const tab = activeAssetTab as string;
                if (tab === 'model') return a.category === 'models' || a.type === 'model';
                if (tab === 'image') return a.category === 'images' || a.type === 'texture';
                if (tab === 'audio') return a.category === 'audio' || a.type === 'audio';
                if (tab === 'hdr') return a.category === 'environments' || a.type === 'hdr';
                return true;
              }).length === 0 ? (
                <div className="p-8 text-center text-gray-700 flex flex-col items-center gap-2 h-full justify-center">
                  <i className="fas fa-ghost text-4xl opacity-20"></i>
                  <span className="text-[10px] italic">资产库空空如也 (Empty Library)</span>
                </div>
              ) : (
                assetList.filter(a => {
                  if (activeAssetTab === 'all') return true;
                  const tab = activeAssetTab as string;
                  if (tab === 'model') return a.category === 'models' || a.type === 'model';
                  if (tab === 'image') return a.category === 'images' || a.type === 'texture';
                  if (tab === 'audio') return a.category === 'audio' || a.type === 'audio';
                  if (tab === 'hdr') return a.category === 'environments' || a.type === 'hdr';
                  return true;
                }).map((asset, idx) => (
                  <div key={asset.id || idx} className="p-2 bg-gray-900/50 border border-gray-800 rounded flex gap-3 items-center group hover:border-cyan-500/30 transition-all cursor-pointer hover:bg-gray-800/50">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 bg-gray-950 rounded border border-gray-800 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {asset.thumbnail ? (
                        <img src={asset.thumbnail} className="w-full h-full object-cover" />
                      ) : (
                        <i className={`fas ${asset.category === 'models' ? 'fa-cube text-blue-900' :
                          asset.category === 'images' ? 'fa-image text-green-900' :
                            asset.category === 'audio' ? 'fa-music text-yellow-900' : 'fa-cloud text-cyan-900'
                          } text-lg`}></i>
                      )}
                      {/* Type Badge */}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 flex items-center justify-center rounded-tl bg-gray-900 border-t border-l border-gray-800 ${asset.category === 'models' ? 'text-blue-500' :
                        asset.category === 'images' ? 'text-green-500' :
                          asset.category === 'audio' ? 'text-yellow-500' : 'text-cyan-500'
                        }`}>
                        <i className={`fas ${asset.category === 'models' ? 'fa-cube' :
                          asset.category === 'images' ? 'fa-image' :
                            asset.category === 'audio' ? 'fa-music' : 'fa-cloud'
                          } text-[6px]`}></i>
                      </div>
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-gray-300 font-bold truncate text-[10px] group-hover:text-cyan-300 transition-colors">{asset.name}</span>
                      <div className="flex items-center gap-2 text-[8px] text-gray-600 uppercase tracking-tighter">
                        <span>{(asset.size / 1024).toFixed(1)}KB</span>
                        <span className="w-px h-2 bg-gray-700"></span>
                        <span>{new Date(asset.createdAt || 0).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Mini Actions */}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-900/50 text-gray-600 hover:text-red-400 rounded">
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* === STATS TAB (Experience Focus) === */}
        {activeTab === 'stats' && (
          <div className="space-y-6 fade-in">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-microchip text-orange-500"></i> ECS 引擎实时数据
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Entities', val: stats.entityCount, icon: 'fa-cube' },
                  { label: 'Physics', val: stats.physicsBodies, icon: 'fa-atom' },
                  { label: 'Vegetation', val: stats.vegetationCount, icon: 'fa-leaf' },
                  { label: 'Systems', val: stats.systemCount, icon: 'fa-cogs' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-900/50 border border-gray-800 p-3 rounded-lg flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-gray-500 uppercase">{s.label}</span>
                      <i className={`fas ${s.icon} text-[8px] text-gray-600`}></i>
                    </div>
                    <div className="text-xl font-bold font-mono text-white">{s.val}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-history text-blue-500"></i> 运行状态 (Status)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-[10px] space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-gray-500">Physics Engine:</span>
                  <span className={stats.physicsInitialized ? "text-green-500" : "text-yellow-600"}>{stats.physicsInitialized ? "RUNNING" : "STOPPED"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Camera:</span>
                  <span className="text-indigo-400 uppercase">{cameraMode}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* 4. Footer: Command History (Expansible) */}
      <div className={`mt-auto bg-gray-950 border-t border-gray-800 transition-all duration-300 flex flex-col shrink-0 ${isFooterExpanded ? 'h-48' : 'h-8'}`}>
        <button
          onClick={() => setIsFooterExpanded(!isFooterExpanded)}
          className="w-full h-8 flex items-center justify-between px-4 hover:bg-gray-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            <i className="fas fa-terminal text-gray-600 group-hover:text-blue-400 transition-colors"></i>
            <span className="text-blue-400 truncate max-w-[200px]">{stats.lastCommand || 'ENGINE READY'}</span>
          </div>
          <i className={`fas ${isFooterExpanded ? 'fa-chevron-down' : 'fa-chevron-up'} text-gray-600`}></i>
        </button>

        {isFooterExpanded && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-900/20">
            <div className="space-y-1">
              {stats.undoHistory.length === 0 ? (
                <div className="text-center text-gray-700 py-8 italic text-[10px]">No command history</div>
              ) : (
                stats.undoHistory.map((cmd: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-1.5 hover:bg-gray-800/50 rounded transition-colors text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span className="text-gray-300 font-mono">{cmd.name}</span>
                    </div>
                    <span className="text-gray-600 text-[9px]">{new Date(cmd.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Add minimal CSS for fade-in animation
const style = document.createElement('style');
style.innerHTML = `
      .fade-in {animation: fadeIn 0.3s ease-out; }
      @keyframes fadeIn {from {opacity: 0; transform: translateY(5px); } to {opacity: 1; transform: translateY(0); } }
      .custom-scrollbar::-webkit-scrollbar {width: 4px; }
      .custom-scrollbar::-webkit-scrollbar-track {bg: #111827; }
      .custom-scrollbar::-webkit-scrollbar-thumb {bg: #374151; border-radius: 4px; }
      `;
document.head.appendChild(style);
