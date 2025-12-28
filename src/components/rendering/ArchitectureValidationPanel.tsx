/**
 * PolyForge v1.3.0 - ArchitectureValidationPanel
 * 架构验证观测窗口 - Project Orbital Command UI
 * 
 * "Guard Rail Compliance": strict dispatch(command) only.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ValidationContext } from '../../core/ArchitectureValidationManager';
import { IArchitectureFacade } from '../../core/IArchitectureFacade'; // Use Interface
import { EngineCommandType } from '../../core/EngineCommand';
import { CameraMode } from '../../core/components/CameraComponent';
import { FileSystemService } from '../../core/assets/FileSystemService';

interface ArchitectureValidationPanelProps {
  manager: IArchitectureFacade | null; // Strict typing
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
  const [currentContext, setCurrentContext] = useState<string>(ValidationContext.CREATION);
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

  // 导演控制状态
  const [bloomStrength, setBloomStrength] = useState(0.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.85);
  const [physicsDebugEnabled, setPhysicsDebugEnabled] = useState(false);
  const [audioDebugEnabled, setAudioDebugEnabled] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(12);
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
  const [flowerColor, setFlowerColor] = useState('#ff69b4');
  const [activeVegType, setActiveVegType] = useState<'grass' | 'flower'>('grass');
  const [gravityY, setGravityY] = useState(-9.8);
  const [isGenerating, setIsGenerating] = useState(false);

  // Asset Controls
  const [activeAssetTab, setActiveAssetTab] = useState<'all' | 'models' | 'audio' | 'environments' | 'textures'>('all');
  const [assetViewMode, setAssetViewMode] = useState<'grid' | 'list' | 'compact'>('grid');

  // 🔥 UX Polish States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [showConfirm, setShowConfirm] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // --- Sync Loop ---
  useEffect(() => {
    if (!manager) return;

    const interval = setInterval(() => {
      // 1. Pull Stats
      const coreStats = manager.getStats();
      const cmdMgr = manager.getCommandManager();
      const storageMgr = manager.getStorageManager();
      const registry = manager.getAssetRegistry();

      setStats({
        ...coreStats,
        undoCount: cmdMgr.getStats().undoStackSize,
        redoCount: cmdMgr.getStats().redoStackSize,
        lastCommand: cmdMgr.getStats().lastCommand,
        hasSave: storageMgr.hasSave(),
        assetCount: registry.getCacheStats().size,
        undoHistory: cmdMgr.getHistory().undo.slice(-20).reverse(),
      });

      // 2. Pull Asset List (Async)
      registry.getAllMetadata().then(list => setAssetList(list));

      // 3. Pull World State
      const state = manager.getEnvironmentState();
      setTimeOfDay(state.timeOfDay);
      setBloomStrength(state.bloomStrength);
      setBloomThreshold(state.bloomThreshold);
      setGravityY(state.gravityY);
      setSunIntensity(state.lightIntensity);
      setSmaaEnabled(state.smaaEnabled);
      setExposure(state.toneMappingExposure);
      setPhysicsDebugEnabled(state.physicsDebugEnabled);
      setAudioDebugEnabled(state.audioDebugEnabled);

      // 4. Pull Context
      setCurrentContext(manager.getContext());

    }, 500); // 2Hz Sync

    return () => clearInterval(interval);
  }, [manager]);

  // FPS Loop
  useEffect(() => {
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
  }, []);


  // --- Dispatch Handlers ---

  const dispatch = (type: EngineCommandType, payload?: any) => {
    if (manager) {
      manager.dispatch({ type, ...payload });
    }
  };

  // Environment
  const handleTimeOfDayChange = (val: number) => {
    setTimeOfDay(val);
    dispatch(EngineCommandType.SET_TIME_OF_DAY, { hour: val });
  };
  const handleSunIntensityChange = (val: number) => {
    setSunIntensity(val);
    dispatch(EngineCommandType.SET_LIGHT_INTENSITY, { intensity: val });
  };
  const handleBloomStrengthChange = (val: number) => {
    setBloomStrength(val);
    dispatch(EngineCommandType.SET_BLOOM_STRENGTH, { strength: val });
    if (onBloomStrengthChange) onBloomStrengthChange(val);
  };
  const handleBloomThresholdChange = (val: number) => {
    setBloomThreshold(val);
    dispatch(EngineCommandType.SET_BLOOM_THRESHOLD, { threshold: val });
    if (onBloomThresholdChange) onBloomThresholdChange(val);
  };
  const handleGravityChange = (val: number) => {
    setGravityY(val);
    dispatch(EngineCommandType.SET_GRAVITY, { value: val });
  };
  const handlePhysicsDebugChange = (val: boolean) => {
    setPhysicsDebugEnabled(val);
    dispatch(EngineCommandType.TOGGLE_PHYSICS_DEBUG, { enabled: val });
  };
  const handleAudioDebugChange = (val: boolean) => {
    setAudioDebugEnabled(val);
    dispatch(EngineCommandType.TOGGLE_AUDIO_DEBUG, { enabled: val });
  };

  // Camera
  const handleCameraModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    dispatch(EngineCommandType.SET_CAMERA_MODE, { mode });

    if (mode === 'orbit') setActiveTab('world');
    else setActiveTab('experience');
  };
  const handleContextSwitch = (ctx: string) => {
    if (ctx === ValidationContext.CREATION) handleCameraModeChange('orbit');
    else handleCameraModeChange('isometric');
  };
  const handleFovChange = (val: number) => {
    setFov(val);
    dispatch(EngineCommandType.SET_CAMERA_FOV, { fov: val });
  };
  const handleSMAAChange = (val: boolean) => {
    setSmaaEnabled(val);
    dispatch(EngineCommandType.SET_SMAA_ENABLED, { enabled: val });
  };
  const handleExposureChange = (val: number) => {
    setExposure(val);
    dispatch(EngineCommandType.SET_TONE_MAPPING_EXPOSURE, { exposure: val });
  };
  const handleMoveSpeedChange = (val: number) => {
    setMoveSpeed(val);
    dispatch(EngineCommandType.SET_MOVE_SPEED, { speed: val });
  };
  const handleForceMultiplierChange = (val: number) => {
    setForceMultiplier(val);
    dispatch(EngineCommandType.SET_FORCE_MULTIPLIER, { multiplier: val });
  };

  // Vegetation
  const handleGrassScaleChange = (val: number) => {
    setGrassScale(val);
    dispatch(EngineCommandType.SET_GRASS_SCALE, { scale: val });
    if (onGrassScaleChange) onGrassScaleChange(val);
  };
  const handleWindStrengthChange = (val: number) => {
    setWindStrength(val);
    dispatch(EngineCommandType.SET_WIND_STRENGTH, { strength: val });
    if (onWindStrengthChange) onWindStrengthChange(val);
  };
  const handleVegetationColorChange = (color: string) => {
    if (activeVegType === 'grass') {
      setGrassColor(color);
      dispatch(EngineCommandType.SET_GRASS_COLOR, { color });
      if (onGrassColorChange) onGrassColorChange(color);
    } else {
      setFlowerColor(color);
      dispatch(EngineCommandType.SET_FLOWER_COLOR, { color }); // The Missing Link
    }
  };
  const handleSpawnVegetation = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    // 5000 for grass, 500 for flowers
    const count = activeVegType === 'grass' ? 5000 : 500;
    const color = activeVegType === 'grass' ? grassColor : flowerColor; // 🔥 Capture current color
    setTimeout(() => {
      dispatch(EngineCommandType.SPAWN_VEGETATION, { count, vegType: activeVegType, color }); // ✅ Pass color
      setIsGenerating(false);
    }, 0);
  };
  const handleClearVegetation = () => {
    if (confirm('确定要清除所有植被吗？ (Are you sure to clear all vegetation?)')) {
      dispatch(EngineCommandType.CLEAR_VEGETATION);
    }
  };

  // Action Buttons
  const handleCreateMountain = () => dispatch(EngineCommandType.CREATE_MOUNTAIN);
  const handleCreateValley = () => dispatch(EngineCommandType.CREATE_VALLEY);
  const handleFlattenTerrain = () => dispatch(EngineCommandType.FLATTEN_TERRAIN);
  const handleSpawnPhysicsCube = () => dispatch(EngineCommandType.SPAWN_PHYSICS_BOX);
  const handleExplosionTest = () => dispatch(EngineCommandType.APPLY_PHYSICS_EXPLOSION, { position: [0, 5, 0], force: 200, radius: 20 });

  // System
  const handleUndo = () => dispatch(EngineCommandType.UNDO);
  const handleRedo = () => dispatch(EngineCommandType.REDO);
  const handleSave = () => dispatch(EngineCommandType.SAVE_SCENE);
  const handleReset = () => dispatch(EngineCommandType.RESET_SCENE);
  // --- Bundling with Safety & UX ---
  const handleExportBundle = async () => {
    const name = prompt('捆绑包名称 (Bundle Name):', 'MySceneLevel');
    if (!name) return;

    setIsLoading(true);
    setLoadingText('正在打包导出 (Bundling)...');
    try {
      await dispatch(EngineCommandType.EXPORT_BUNDLE, { name });
      setNotification({ message: `导出成功: ${name}.pfb`, type: 'success' });
    } catch (err) {
      console.error(err);
      setNotification({ message: '导出失败 (Export Failed)', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 清空 input 使得同一个文件可以再次选择
    e.target.value = '';

    setShowConfirm({
      message: '确定要导入该生态包吗？当前场景将被覆盖。\n(Import this bundle? Current scene will be overwritten.)',
      onConfirm: async () => {
        setIsLoading(true);
        setLoadingText('正在解析生态包 (Parsing Bundle)...');
        try {
          await dispatch(EngineCommandType.IMPORT_BUNDLE, { file });
          setNotification({ message: '导入成功 (Import Complete)', type: 'success' });
          // Force refresh world state UI
          if (manager) {
            const state = manager.getEnvironmentState();
            setGravityY(state.gravityY);
          }
        } catch (err) {
          console.error(err);
          setNotification({ message: '导入失败 (Import Failed)', type: 'error' });
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // New Asset Imports (using registry)
  const handleAssetImport = (e: React.ChangeEvent<HTMLInputElement>, category: any) => {
    const file = e.target.files?.[0];
    if (!file || !manager) return;
    const registry = manager.getAssetRegistry();

    if (category === 'models') registry.importModel(file, { category: 'models' });
    else if (category === 'audio') registry.importAudio(file, { category: 'audio' });
    else if (category === 'environments') registry.importHDR(file, { category: 'environments' });
    else if (category === 'textures') registry.importTexture(file, { category: 'textures' });
  };

  const handleBatchImport = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (!manager) return;
    const registry = manager.getAssetRegistry();

    try {
      if (e) {
        // Simple file select (if used via input)
        const file = e.target.files?.[0];
        if (file) {
          const type = FileSystemService.getFileType(file.name);
          if (type === 'model') registry.importModel(file, { category: 'models' });
          else if (type === 'audio') registry.importAudio(file, { category: 'audio' });
          else if (type === 'hdr') registry.importHDR(file, { category: 'environments' });
          else if (type === 'texture') registry.importTexture(file, { category: 'textures' });
        }
      } else {
        // Modern Directory Picker (Power Feature)
        const dirHandle = await FileSystemService.selectDirectory();
        if (dirHandle) {
          const files = await FileSystemService.scanDirectory(dirHandle);
          if (files.length > 0) {
            await FileSystemService.batchImport(files, registry);
            console.log(`[ArchitectureValidationPanel] Batch import of ${files.length} assets completed`);
          }
        }
      }
    } catch (err) {
      console.error('[ArchitectureValidationPanel] Import Error:', err);
    }
  };

  const handleAssetDelete = (id: string) => {
    if (confirm(`确定要删除资产 ${id} 吗？ (Delete this asset?)`)) {
      if (manager) {
        manager.getAssetRegistry().deleteAsset(id);
      }
    }
  };

  // ... Render ...
  if (!manager) {
    return <div className="w-96 h-full bg-gray-950 flex items-center justify-center text-gray-500 italic font-mono">
      <i className="fas fa-circle-notch fa-spin mr-2"></i> 正在连接至轨道指令中心...
    </div>;
  }

  return (
    <div className="w-96 h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden font-sans text-xs select-none shadow-2xl z-50">

      {/* 1. HUD */}
      <div className="h-[60px] bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">FPS</span>
            <span ref={fpsRef} className="text-xl font-bold text-green-400 font-mono leading-none">60</span>
          </div>
          <div className="h-6 w-px bg-gray-800"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">ENTITIES</span>
            <span className="text-xl font-bold text-white font-mono leading-none">{stats.entityCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleUndo} disabled={stats.undoCount === 0} className={`w-8 h-8 rounded flex items-center justify-center ${stats.undoCount > 0 ? 'text-blue-400 hover:bg-blue-900/30' : 'text-gray-700'}`}><i className="fas fa-undo"></i></button>
          <button onClick={handleRedo} disabled={stats.redoCount === 0} className={`w-8 h-8 rounded flex items-center justify-center ${stats.redoCount > 0 ? 'text-blue-400 hover:bg-blue-900/30' : 'text-gray-700'}`}><i className="fas fa-redo"></i></button>
          <div className="h-4 w-px bg-gray-800 mx-1"></div>
          <button onClick={handleSave} className="w-8 h-8 rounded flex items-center justify-center text-orange-400 hover:bg-orange-900/30"><i className="fas fa-save"></i></button>
          <button onClick={handleReset} className="w-8 h-8 rounded flex items-center justify-center text-red-500 hover:bg-red-900/30"><i className="fas fa-trash-alt"></i></button>
        </div>
      </div>

      {/* 1.1 Context Switch */}
      <div className="bg-gray-950 p-2 shrink-0">
        <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button onClick={() => handleContextSwitch(ValidationContext.CREATION)} className={`flex-1 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.CREATION ? 'bg-blue-600 text-white' : 'text-gray-500'}`}><i className="fas fa-tools mr-1"></i> 创造模式</button>
          <button onClick={() => handleContextSwitch(ValidationContext.EXPERIENCE)} className={`flex-1 py-2 rounded-md font-bold uppercase tracking-wider text-[10px] ${currentContext === ValidationContext.EXPERIENCE ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}><i className="fas fa-play mr-1"></i> 体验模式</button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex bg-gray-950 border-b border-gray-800 shrink-0">
        {currentContext === ValidationContext.CREATION ? (
          <>
            <button onClick={() => setActiveTab('world')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'world' ? 'text-green-400 bg-gray-900/50 border-b-2 border-green-500' : 'text-gray-500'}`}><i className="fas fa-globe mr-1"></i> 世界</button>
            <button onClick={() => setActiveTab('director')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'director' ? 'text-purple-400 bg-gray-900/50 border-b-2 border-purple-500' : 'text-gray-500'}`}><i className="fas fa-video mr-1"></i> 导演</button>
            <button onClick={() => setActiveTab('assets')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'assets' ? 'text-cyan-400 bg-gray-900/50 border-b-2 border-cyan-500' : 'text-gray-500'}`}><i className="fas fa-boxes mr-1"></i> 资产</button>
          </>
        ) : (
          <>
            <button onClick={() => setActiveTab('experience')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'experience' ? 'text-indigo-400 bg-gray-900/50 border-b-2 border-indigo-500' : 'text-gray-500'}`}><i className="fas fa-gamepad mr-1"></i> 游玩</button>
            <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'stats' ? 'text-orange-400 bg-gray-900/50 border-b-2 border-orange-500' : 'text-gray-500'}`}><i className="fas fa-chart-line mr-1"></i> 统计</button>
          </>
        )}
      </div>

      {/* 3. Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

        {/* === WORLD === */}
        {activeTab === 'world' && (
          <>
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-mountain text-orange-500 mr-2"></i> 地形编辑 (Terraform)</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCreateMountain} disabled={isGenerating} className="py-3 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700"><i className="fas fa-chevron-up mr-2"></i> 隆起 (Raise)</button>
                <button onClick={handleCreateValley} disabled={isGenerating} className="py-3 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:bg-gray-700"><i className="fas fa-chevron-down mr-2"></i> 凹陷 (Lower)</button>
                <button onClick={handleFlattenTerrain} disabled={isGenerating} className="col-span-2 py-2 bg-gray-800 text-gray-400 text-[10px] rounded border border-gray-700 hover:bg-gray-700">平整地形 (Flatten)</button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-seedling text-green-500 mr-2"></i> 生态系统 (Ecosystem)</h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 block mb-1">缩放 (Scale)</label>
                    <input type="range" min="0.1" max="3" step="0.1" value={grassScale} onChange={(e) => handleGrassScaleChange(parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">风力 (Wind)</label>
                    <input type="range" min="0" max="1" step="0.01" value={windStrength} onChange={(e) => handleWindStrengthChange(parseFloat(e.target.value))} className="w-full accent-green-500" />
                  </div>
                </div>

                <div className="flex bg-gray-900 rounded-lg p-0.5">
                  <button onClick={() => setActiveVegType('grass')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'grass' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>草丛 (Grass)</button>
                  <button onClick={() => setActiveVegType('flower')} className={`flex-1 py-1 text-[9px] uppercase font-bold rounded ${activeVegType === 'flower' ? 'bg-pink-600 text-white' : 'text-gray-500'}`}>花朵 (Flowers)</button>
                </div>

                <div className="flex gap-2">
                  {(activeVegType === 'grass' ? ['#7cba3d', '#a8d96e', '#d4b86a', '#3f6b2b'] : ['#ff69b4', '#ff1493', '#da70d6', '#ffb6c1']).map(c => (
                    <button key={c} onClick={() => handleVegetationColorChange(c)} className={`flex-1 h-6 rounded border ${(activeVegType === 'grass' ? grassColor : flowerColor) === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                  ))}
                </div>

                <button onClick={handleSpawnVegetation} disabled={isGenerating} className={`w-full py-2 font-bold rounded shadow-lg text-white ${activeVegType === 'grass' ? 'bg-green-600 hover:bg-green-500' : 'bg-pink-600 hover:bg-pink-500'}`}>
                  {isGenerating ? '生成中...' : (activeVegType === 'grass' ? '生成草丛 (Spawn Grass - 5000)' : '种植花朵 (Plant Flowers - 500)')}
                </button>
                <button onClick={handleClearVegetation} className="w-full text-red-400 text-[10px] uppercase font-bold hover:text-red-300">清除所有植被 (Clear All)</button>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest"><i className="fas fa-cubes text-blue-500 mr-2"></i> 物理系统 (Physics)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div className="space-y-2">
                  <button onClick={handleSpawnPhysicsCube} className="w-full py-2 bg-blue-900/30 rounded border border-blue-500/30 text-blue-300 font-bold hover:bg-blue-900/50 shadow-lg shadow-blue-500/10">
                    <i className="fas fa-cube mr-2"></i> 生成蓝色重力方块 (Gravity Cube)
                  </button>
                  <button onClick={handleExplosionTest} className="w-full py-2 bg-red-900/30 rounded border border-red-900/50 text-red-400 hover:bg-red-900/50">测试爆炸 (Test Explosion)</button>
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">重力 (Gravity Y)</label>
                  <input type="range" min="-20" max="0" step="0.1" value={gravityY} onChange={(e) => handleGravityChange(parseFloat(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">物理调试 (Physics Debug)</span>
                  <input type="checkbox" checked={physicsDebugEnabled} onChange={(e) => handlePhysicsDebugChange(e.target.checked)} className="accent-blue-500" />
                </div>
              </div>
            </section>
          </>
        )}

        {/* === DIRECTOR === */}
        {activeTab === 'director' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">大气环境 (Atmosphere)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1 flex justify-between"><span>时间 (Time)</span> <span className="text-white font-mono">{timeOfDay.toFixed(1)}h</span></label>
                  <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))} className="w-full accent-orange-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">光照强度 (Sun Intensity)</label>
                  <input type="range" min="0" max="5" step="0.1" value={sunIntensity} onChange={(e) => handleSunIntensityChange(parseFloat(e.target.value))} className="w-full accent-yellow-500" />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">后处理 (Post Processing)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1">辉光强度 (Bloom Strength)</label>
                  <input type="range" min="0" max="3" step="0.1" value={bloomStrength} onChange={(e) => handleBloomStrengthChange(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">辉光阈值 (Bloom Threshold)</label>
                  <input type="range" min="0" max="1" step="0.05" value={bloomThreshold} onChange={(e) => handleBloomThresholdChange(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">曝光 (Exposure)</label>
                  <input type="range" min="0" max="5" step="0.1" value={exposure} onChange={(e) => handleExposureChange(parseFloat(e.target.value))} className="w-full accent-gray-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">SMAA 抗锯齿 (Anti-Aliasing)</span>
                  <input type="checkbox" checked={smaaEnabled} onChange={(e) => handleSMAAChange(e.target.checked)} className="accent-green-500" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === ASSETS === */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* 1. Asset Navigation Header (Tabs + Dynamic Import + View Switches) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* Categorized Tabs */}
                <div className="flex-grow flex bg-gray-900/50 rounded-xl p-1 border border-gray-800 backdrop-blur-md">
                  {(['all', 'models', 'textures', 'audio', 'environments'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveAssetTab(tab)}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 ${activeAssetTab === tab ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'}`}
                    >
                      {tab === 'all' ? '全部' : tab === 'models' ? '模型' : tab === 'audio' ? '音频' : tab === 'textures' ? '图片' : '环境'}
                    </button>
                  ))}
                </div>

                {/* View Mode Switches */}
                <div className="flex bg-gray-900/80 rounded-xl p-1 border border-gray-800">
                  {(['grid', 'compact', 'list'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setAssetViewMode(mode)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${assetViewMode === mode ? 'text-cyan-400 bg-cyan-950/30' : 'text-gray-600 hover:text-gray-400'}`}
                      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`}
                    >
                      <i className={`fas ${mode === 'grid' ? 'fa-th-large' : mode === 'list' ? 'fa-list' : 'fa-th'} text-[10px]`}></i>
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Class Dynamic Import Center */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center justify-between p-3 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center">
                      <i className={`fas ${activeAssetTab === 'all' ? 'fa-folder-open' :
                        activeAssetTab === 'models' ? 'fa-cube' :
                          activeAssetTab === 'textures' ? 'fa-image' :
                            activeAssetTab === 'audio' ? 'fa-music' : 'fa-mountain'
                        } mr-2 text-cyan-500`}></i>
                      {activeAssetTab === 'all' ? '全息资产导入' : `${activeAssetTab === 'models' ? '模型' : activeAssetTab === 'textures' ? '图片' : activeAssetTab === 'audio' ? '音频' : '环境'}专项导入`}
                    </span>
                    <span className="text-[7px] text-gray-700 font-mono mt-0.5 opacity-60">DYNAMIC SMART CLASSIFICATION ACTIVATED</span>
                  </div>

                  <div className="flex gap-2">
                    {/* Batch Folder Import (Only for 'All') */}
                    {activeAssetTab === 'all' && (
                      <button
                        onClick={() => handleBatchImport()}
                        className="px-3 py-1.5 bg-indigo-900/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[9px] font-bold hover:bg-indigo-900/40 transition-all flex items-center"
                      >
                        <i className="fas fa-folder-plus mr-1.5"></i> 扫库
                      </button>
                    )}

                    {/* Primary Import Button */}
                    <label className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-[9px] font-bold hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                      <i className="fas fa-plus-circle mr-1.5"></i> 导入
                      <input
                        type="file"
                        className="hidden"
                        accept={
                          activeAssetTab === 'all' ? '*' :
                            activeAssetTab === 'models' ? '.glb,.gltf' :
                              activeAssetTab === 'textures' ? '.png,.jpg,.jpeg,.webp' :
                                activeAssetTab === 'audio' ? '.mp3,.wav,.ogg' : '.hdr'
                        }
                        onChange={(e) => {
                          if (activeAssetTab === 'all') handleBatchImport(e); // Smart auto-classify
                          else handleAssetImport(e, activeAssetTab);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Asset Registry Dashboard */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-black uppercase tracking-[0.2em] leading-none text-gray-700">Registry</span>
                  <div className="h-2 w-2 rounded-full bg-cyan-500/50 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  <span className="opacity-30">SNAPSHOT_SYNC_0.8s</span>
                  <span className="bg-gray-900 px-2 py-0.5 rounded border border-gray-800 text-cyan-400">{stats.assetCount}</span>
                </div>
              </div>

              <div className={`max-h-[480px] overflow-y-auto no-scrollbar pr-1 pb-10 transition-all duration-500 ${assetViewMode === 'grid' ? 'grid grid-cols-2 gap-3' :
                assetViewMode === 'compact' ? 'grid grid-cols-4 gap-2' :
                  'flex flex-col gap-1'
                }`}>
                {assetList
                  .filter(a => {
                    if (activeAssetTab === 'all') return true;

                    const cat = (a.category || '').toLowerCase().trim();
                    const tab = activeAssetTab.toLowerCase();

                    // 🔥 终极兼容: 归一化比较 + 别名支持
                    if (tab === 'textures') {
                      return cat === 'textures' || cat === 'texture' || cat === 'image' || cat === 'images' || cat === 'png' || cat === 'jpg';
                    }
                    if (tab === 'models') {
                      return cat === 'models' || cat === 'model' || cat === 'glb' || cat === 'gltf';
                    }
                    if (tab === 'audio') {
                      return cat === 'audio' || cat === 'sound' || cat === 'music' || cat === 'mp3';
                    }

                    return cat === tab || cat.includes(tab);
                  })
                  .map((asset, i) => (
                    <div key={i} className={`group transition-all duration-300 ${assetViewMode === 'grid' ? 'bg-gray-900/40 border border-gray-800 rounded-2xl p-3 flex flex-col gap-2 hover:border-cyan-500/40 hover:bg-gray-800/50 hover:-translate-y-1 shadow-lg' :
                      assetViewMode === 'compact' ? 'bg-gray-900/30 border border-gray-800/50 rounded-lg p-1 aspect-square hover:border-cyan-500/50 transition-all cursor-crosshair' :
                        'bg-gray-900/20 hover:bg-gray-800/40 border border-gray-800/20 hover:border-cyan-900/30 rounded-lg px-3 py-2 flex items-center justify-between group'
                      }`}>

                      {/* Visual Content */}
                      {(assetViewMode === 'grid' || assetViewMode === 'compact') && (
                        <div className={`w-full bg-gray-950 rounded-xl flex items-center justify-center relative overflow-hidden ring-1 ring-gray-800/50 group-hover:ring-cyan-900/40 transition-all ${assetViewMode === 'grid' ? 'aspect-square' : 'h-full'
                          }`}>
                          {asset.thumbnail ? (
                            <img src={asset.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt="" />
                          ) : (
                            <div className="flex flex-col items-center justify-center opacity-10 group-hover:opacity-30 transition-opacity">
                              <i className={`fas ${asset.category === 'models' ? 'fa-cube' :
                                asset.category === 'audio' ? 'fa-music' :
                                  asset.category === 'textures' ? 'fa-image' :
                                    asset.category === 'environments' ? 'fa-mountain' : 'fa-box'
                                } ${assetViewMode === 'grid' ? 'text-4xl' : 'text-xl'}`}></i>
                            </div>
                          )}

                          {assetViewMode === 'grid' && (
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-950/90 rounded-md text-[7px] text-cyan-400 font-bold uppercase tracking-tighter border border-cyan-500/20 whitespace-nowrap backdrop-blur-sm z-10 shadow-xl">
                              {asset.category === 'environments' ? 'HDR' : asset.category.replace(/s$/, '').toUpperCase()}
                            </div>
                          )}

                          {/* Floating Delete Mini Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAssetDelete(asset.id); }}
                            className="absolute bottom-1 right-1 w-5 h-5 bg-red-950/80 text-red-400 rounded-md flex items-center justify-center text-[7px] opacity-0 group-hover:opacity-100 hover:bg-red-900 transition-all z-20 border border-red-500/20"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      )}

                      {/* Text Content - Grid */}
                      {assetViewMode === 'grid' && (
                        <div className="flex flex-col px-0.5">
                          <span className="text-[10px] text-gray-400 font-bold truncate group-hover:text-white transition-colors" title={asset.name}>{asset.name}</span>
                          <span className="text-[7px] text-gray-600 font-mono truncate uppercase mt-0.5 tracking-widest">{asset.id.split('_').pop()}</span>
                        </div>
                      )}

                      {/* Text Content - List */}
                      {assetViewMode === 'list' && (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-cyan-700">
                              {(() => {
                                const cat = (asset.category || '').toLowerCase().trim();
                                const isModel = cat === 'models' || cat === 'model' || cat === 'glb';
                                const isAudio = cat === 'audio' || cat === 'music' || cat === 'sound';
                                const isTexture = cat === 'textures' || cat === 'texture' || cat === 'image' || cat === 'images';

                                return <i className={`fas ${isModel ? 'fa-cube' : isAudio ? 'fa-music' : isTexture ? 'fa-image' : 'fa-mountain'} text-[10px]`}></i>;
                              })()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-gray-300 font-bold group-hover:text-cyan-400 transition-colors">{asset.name}</span>
                              <span className="text-[7px] text-gray-600 font-mono uppercase">{asset.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[7px] bg-gray-950 px-1.5 py-0.5 rounded border border-gray-800 text-gray-500 uppercase font-bold tracking-tighter">{asset.category}</span>
                            <button onClick={() => handleAssetDelete(asset.id)} className="text-[10px] text-gray-700 hover:text-red-500 transition-colors px-2 opacity-0 group-hover:opacity-100"><i className="fas fa-trash-alt"></i></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                {assetList.filter(a => {
                  if (activeAssetTab === 'all') return true;

                  const cat = (a.category || '').toLowerCase().trim();
                  const tab = activeAssetTab.toLowerCase();

                  if (tab === 'textures') {
                    return cat === 'textures' || cat === 'texture' || cat === 'image' || cat === 'images' || cat === 'png' || cat === 'jpg';
                  }
                  if (tab === 'models') {
                    return cat === 'models' || cat === 'model' || cat === 'glb' || cat === 'gltf';
                  }
                  if (tab === 'audio') {
                    return cat === 'audio' || cat === 'sound' || cat === 'music' || cat === 'mp3';
                  }

                  return cat === tab || cat.includes(tab);
                }).length === 0 && (
                    <div className={`${assetViewMode === 'grid' ? 'col-span-2' : assetViewMode === 'compact' ? 'col-span-4' : ''} py-20 flex flex-col items-center justify-center text-gray-700 bg-gray-950/40 rounded-3xl border-2 border-dashed border-gray-900/50 backdrop-blur-sm`}>
                      <div className="relative mb-4">
                        <i className="fas fa-ghost text-4xl opacity-10"></i>
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-cyan-500/20 rounded-full animate-ping"></div>
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-[0.4em] opacity-30">Registry Empty</span>
                      <span className="text-[8px] mt-2 opacity-10 italic">SYNC_STATUS: IDLE // SCANNING_FAIL</span>
                    </div>
                  )}
              </div>
            </div>

            {/* 4. Global Scene Actions (Refined) */}
            <div className="pt-6 border-t border-gray-900/50 grid grid-cols-2 gap-4">
              <button
                onClick={() => document.getElementById('import_pfb')?.click()}
                className="group relative py-3 bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-900/30 transition-all flex items-center justify-center overflow-hidden"
              >
                <div className="absolute inset-x-0 h-[1px] top-0 bg-indigo-400/20"></div>
                <i className="fas fa-dna mr-2 group-hover:rotate-180 transition-transform duration-700"></i> 生态包导入 (.pfb)
              </button>
              <button
                onClick={handleExportBundle}
                className="group relative py-3 bg-gray-900/40 border border-gray-800 text-gray-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:text-white hover:bg-gray-800/60 transition-all flex items-center justify-center"
              >
                <i className="fas fa-download mr-2 group-hover:translate-y-0.5 transition-transform"></i> 全量导出
              </button>
              <input type="file" id="import_pfb" accept=".pfb" className="hidden" onChange={handleImportBundle} />
            </div>
          </div>
        )}

        {/* === EXPERIENCE === */}
        {activeTab === 'experience' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">相机模式 (Camera Mode)</h3>
              <div className="grid grid-cols-2 gap-2">
                {(['firstPerson', 'thirdPerson', 'isometric', 'topDown'] as CameraMode[]).map(m => {
                  const names: Record<string, string> = {
                    firstPerson: '第一人称 (FPS)',
                    thirdPerson: '第三人称 (TPS)',
                    isometric: '上帝视角 (ISO)',
                    topDown: '俯视 (Top)'
                  };
                  return (
                    <button key={m} onClick={() => handleCameraModeChange(m)} className={`py-4 rounded border font-bold text-[10px] ${cameraMode === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}>
                      {names[m] || m}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">玩法配置 (Gameplay Config)</h3>
              <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-4">
                <div>
                  <label className="text-gray-500 block mb-1">视场角 (FOV)</label>
                  <input type="range" min="30" max="120" value={fov} onChange={(e) => handleFovChange(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">移动速度 (Speed)</label>
                  <input type="range" min="1" max="50" value={moveSpeed} onChange={(e) => handleMoveSpeedChange(parseFloat(e.target.value))} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <label className="text-gray-500 block mb-1">力度倍率 (Force Multiplier)</label>
                  <input type="range" min="1" max="100" value={forceMultiplier} onChange={(e) => handleForceMultiplierChange(parseFloat(e.target.value))} className="w-full accent-red-500" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === STATS === */}
        {activeTab === 'stats' && (
          <div className="space-y-4 font-mono text-gray-400">
            <div className="bg-gray-900 p-3 rounded border border-gray-800">
              <div className="text-white font-bold mb-2 border-b border-gray-700 pb-1">核心指标 (Core Metrics)</div>
              <div className="grid grid-cols-2 gap-y-1">
                <span>实体 (Entities):</span> <span className="text-right text-green-400">{stats.entityCount}</span>
                <span>系统 (Systems):</span> <span className="text-right text-green-400">{stats.systemCount}</span>
                <span>植被 (Veg):</span> <span className="text-right text-green-400">{stats.vegetationCount}</span>
                <span>顶点 (Verts):</span> <span className="text-right text-green-400">{stats.terrainVertices.toLocaleString()}</span>
                <span>刚体 (Bodies):</span> <span className="text-right text-green-400">{stats.physicsBodies}</span>
              </div>
            </div>

            <div className="bg-gray-900 p-3 rounded border border-gray-800">
              <div className="text-white font-bold mb-2 border-b border-gray-700 pb-1">指令日志 (Command Log)</div>
              <div className="space-y-1 opacity-70">
                {stats.undoHistory.length === 0 ? <div className="italic text-gray-600">无记录 (No history)</div> : stats.undoHistory.map((cmd, i) => (
                  <div key={i} className="text-[10px] truncate border-l-2 border-blue-500 pl-2 mb-1">
                    {cmd.type}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer Log (Collapsed by default, maybe show last command) */}
      <div className="h-6 bg-gray-950 border-t border-gray-900 text-[10px] text-gray-600 px-2 flex items-center select-none">
        <span className="font-bold mr-2">最新指令 (LAST CMD):</span> {stats.lastCommand || '就绪 (READY)'}
      </div>

      {/* --- UX Overlays --- */}

      {/* 1. Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fadeIn">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <span className="text-indigo-400 font-bold tracking-widest text-[10px] uppercase animate-pulse">{loadingText}</span>
        </div>
      )}

      {/* 2. Confirmation Modal */}
      {showConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-sm w-full">
            <h3 className="text-orange-500 font-bold uppercase tracking-wider mb-2 flex items-center">
              <i className="fas fa-exclamation-triangle mr-2"></i> 警告 (Warning)
            </h3>
            <p className="text-gray-300 text-[11px] mb-6 whitespace-pre-line leading-relaxed">
              {showConfirm.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-[10px] font-bold uppercase"
              >
                取消 (Cancel)
              </button>
              <button
                onClick={() => {
                  showConfirm.onConfirm();
                  setShowConfirm(null);
                }}
                className="flex-1 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-500/30 text-red-400 rounded text-[10px] font-bold uppercase"
              >
                确认 (Confirm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Notification Toast */}
      {notification && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md flex items-center gap-2 animate-slideDown z-50 ${notification.type === 'success' ? 'bg-green-900/80 border-green-500/50 text-green-300' :
          notification.type === 'error' ? 'bg-red-900/80 border-red-500/50 text-red-300' :
            'bg-blue-900/80 border-blue-500/50 text-blue-300'
          }`}>
          <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' :
            notification.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'
            }`}></i>
          <span className="text-[10px] font-bold">{notification.message}</span>
        </div>
      )}
    </div>
  );
};
