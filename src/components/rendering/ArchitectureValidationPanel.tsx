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
  // const [activeAssetTab, setActiveAssetTab] = useState<'all' | 'model' | 'image' | 'audio' | 'hdr'>('all');

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
    setTimeout(() => {
      dispatch(EngineCommandType.SPAWN_VEGETATION, { count, vegType: activeVegType });
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
  const handleExportBundle = () => {
    const name = prompt('捆绑包名称 (Bundle Name):', 'MySceneLevel');
    if (name) dispatch(EngineCommandType.EXPORT_BUNDLE, { name });
  };
  const handleImportBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) dispatch(EngineCommandType.IMPORT_BUNDLE, { file });
  };

  // New Asset Imports (using registry)
  const handleAssetImport = (e: React.ChangeEvent<HTMLInputElement>, category: any) => {
    const file = e.target.files?.[0];
    if (!file || !manager) return;
    const registry = manager.getAssetRegistry();

    if (category === 'models') registry.importModel(file, { category: 'models' });
    else if (category === 'audio') registry.importAudio(file, { category: 'audio' });
    else if (category === 'environments') registry.importHDR(file, { category: 'environments' });
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
                  <button onClick={handleSpawnPhysicsCube} className="w-full py-2 bg-gray-800 rounded border border-gray-700 text-gray-300 hover:bg-gray-700">生成物理箱 (Spawn Physics Box)</button>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => document.getElementById('import_pfb')?.click()} className="col-span-2 py-3 bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 rounded font-bold hover:bg-indigo-900/50 block text-center">
                <i className="fas fa-file-import mr-2"></i> 导入捆绑包 (Import Bundle .pfb)
              </button>
              <input type="file" id="import_pfb" accept=".pfb" className="hidden" onChange={handleImportBundle} />

              <button onClick={handleExportBundle} className="col-span-2 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded hover:bg-gray-700">
                <i className="fas fa-file-export mr-2"></i> 导出捆绑包 (Export Bundle)
              </button>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3">快速导入 (Quick Import)</h3>
              <div className="space-y-2">
                <label className="block w-full py-2 bg-gray-800 text-center rounded cursor-pointer hover:bg-gray-700 text-gray-400">
                  <i className="fas fa-cube mr-2"></i> 导入模型 (Model .glb)
                  <input type="file" className="hidden" accept=".glb,.gltf" onChange={(e) => handleAssetImport(e, 'models')} />
                </label>
                <label className="block w-full py-2 bg-gray-800 text-center rounded cursor-pointer hover:bg-gray-700 text-gray-400">
                  <i className="fas fa-music mr-2"></i> 导入音频 (Audio .mp3)
                  <input type="file" className="hidden" accept=".mp3,.wav,.ogg" onChange={(e) => handleAssetImport(e, 'audio')} />
                </label>
                <label className="block w-full py-2 bg-gray-800 text-center rounded cursor-pointer hover:bg-gray-700 text-gray-400">
                  <i className="fas fa-image mr-2"></i> 导入环境 (HDR .hdr)
                  <input type="file" className="hidden" accept=".hdr" onChange={(e) => handleAssetImport(e, 'environments')} />
                </label>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-3">资产注册表 (Registry) - {stats.assetCount}</h3>
              <div className="max-h-48 overflow-y-auto bg-gray-900 rounded p-2 text-gray-500 font-mono text-[10px]">
                {assetList.map((a, i) => (
                  <div key={i} className="mb-1 truncate hover:text-white cursor-help" title={a?.id || 'Unknown'}>
                    [{a?.metadata?.category || 'Unknown'}] {a?.metadata?.name || 'Untitled Asset'}
                  </div>
                ))}
              </div>
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
    </div>
  );
};
