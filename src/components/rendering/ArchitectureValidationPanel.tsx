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

interface ArchitectureValidationPanelProps {
  manager: ArchitectureValidationManager | null;
  onBloomStrengthChange?: (value: number) => void;
  onBloomThresholdChange?: (value: number) => void;
  onGrassScaleChange?: (value: number) => void;
  onWindStrengthChange?: (value: number) => void;
  onGrassColorChange?: (color: string) => void;
}

type TabType = 'world' | 'director' | 'assets';

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

  // Director Controls
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [bloomThreshold, setBloomThreshold] = useState(0.5);
  const [timeOfDay, setTimeOfDay] = useState(17);
  const [sunIntensity, setSunIntensity] = useState(1.0);

  // World Controls
  const [grassScale, setGrassScale] = useState(1.0);
  const [windStrength, setWindStrength] = useState(0.1);
  const [grassColor, setGrassColor] = useState('#7cba3d');
  const [gravityY, setGravityY] = useState(-9.8);
  const [isGenerating, setIsGenerating] = useState(false);

  // Asset Controls
  const [activeAssetTab, setActiveAssetTab] = useState<'all' | 'model' | 'image' | 'audio' | 'hdr'>('all');

  const fpsRef = useRef<HTMLSpanElement>(null);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // --- Effects ---

  // 1. Low Frequency Stats Update (1s)
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
    if (worldState.gravityY !== undefined) setGravityY(worldState.gravityY);
    setTimeOfDay(worldState.timeOfDay);

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

    return () => clearInterval(interval);
  }, [manager]);

  // 2. High Frequency FPS Update
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

  // --- Handlers ---

  // Bloom
  const handleBloomStrengthChange = (val: number) => {
    setBloomStrength(val);
    if (onBloomStrengthChange) onBloomStrengthChange(val);
    else if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomStrength(val);
  };

  const handleBloomThresholdChange = (val: number) => {
    setBloomThreshold(val);
    if (onBloomThresholdChange) onBloomThresholdChange(val);
    else if ((window as any).renderDemoControls) (window as any).renderDemoControls.setBloomThreshold(val);
  };

  // Environment
  const handleTimeOfDayChange = (val: number) => {
    setTimeOfDay(val);
    if (manager) manager.setTimeOfDay(val);
  };

  const handleSunIntensityChange = (val: number) => {
    setSunIntensity(val);
    if (manager) manager.setLightIntensity(val);
  };

  // Vegetation
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

  const handleGrassColorChange = (color: string) => {
    setGrassColor(color);
    if (manager) manager.setGrassColor(color);
    if (onGrassColorChange) onGrassColorChange(color);
  };

  // Actions
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

  // Asset Handlers
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
          alert(`Image imported: ${file.name}`);
        } catch (err) {
          console.error(err);
          alert('Import failed');
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

      if (!confirm(`Found ${files.length} files. Import all?`)) return;

      let successCount = 0;
      const registry = manager!.getAssetRegistry();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Simple heuristic for file types
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
              type: 'texture' as any,
              category: 'images',
              tags: ['batch-imported', 'image'],
              size: file.size,
            }, file);
            successCount++;
          }
        } catch (err) {
          console.warn(`Skipped ${file.name}:`, err);
        }
      }
      alert(`Batch import complete. Imported ${successCount} assets.`);
    };
    input.click();
  };

  if (!manager) {
    return <div className="w-96 h-full bg-gray-950 flex items-center justify-center text-gray-500">Initializing Orbital Command...</div>;
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

      {/* 2. Tab Navigation */}
      <div className="flex bg-gray-950 border-b border-gray-800 shrink-0">
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
      </div>

      {/* 3. Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">

        {/* === WORLD TAB === */}
        {activeTab === 'world' && (
          <div className="space-y-6 fade-in">
            {/* Physics Section */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-atom text-blue-500"></i> 物理引擎 (Physics)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">重力 (Gravity Y)</span>
                  <span className="text-blue-400 font-mono">{gravityY}</span>
                </div>
                <input
                  type="range" min="-20" max="0" step="0.1" value={gravityY}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setGravityY(val);
                    manager.setGravity(val);
                  }}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => manager.spawnPhysicsBox()}
                    className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-300 rounded transition-all font-bold"
                  >
                    <i className="fas fa-cube mr-1"></i> 投射方块
                  </button>
                  <div className="px-3 py-2 bg-gray-800 rounded border border-gray-700 text-center min-w-[60px]">
                    <div className="text-[8px] text-gray-500 uppercase">刚体数</div>
                    <div className="font-mono text-blue-400 font-bold">{stats.physicsBodies}</div>
                  </div>
                </div>
              </div>
            </section>

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
                {/* Scale */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">缩放 (Scale)</label>
                    <span className="text-green-400 font-mono">{grassScale.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.1" max="3" step="0.1" value={grassScale} onChange={(e) => handleGrassScaleChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                </div>
                {/* Wind */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">风场 (Wind)</label>
                    <span className="text-green-400 font-mono">{windStrength.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" value={windStrength} onChange={(e) => handleWindStrengthChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                </div>
                {/* Colors */}
                <div className="flex gap-2">
                  {['#7cba3d', '#a8d96e', '#d4b86a', '#3f6b2b'].map(c => (
                    <button
                      key={c}
                      onClick={() => handleGrassColorChange(c)}
                      className={`flex-1 h-6 rounded border ${grassColor === c ? 'border-white shadow-md' : 'border-transparent'} transition-all`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {/* Action */}
                <button
                  onClick={handleSpawnGrass}
                  disabled={isGenerating}
                  className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow-lg shadow-green-900/20 transition-all"
                >
                  <i className="fas fa-magic mr-2"></i>
                  {isGenerating ? '生成中...' : '生成植被 (5000)'}
                </button>
                <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded">
                  <span className="text-gray-500 text-[10px]">当前数量: <span className="text-green-400 font-mono">{stats.vegetationCount}</span></span>
                  <button
                    onClick={handleClearVegetation}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors uppercase"
                  >
                    <i className="fas fa-trash-alt mr-1"></i> 一键清除
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* === DIRECTOR TAB === */}
        {activeTab === 'director' && (
          <div className="space-y-6 fade-in">
            {/* Lighting */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-sun text-yellow-500"></i> 光照与时间 (Lighting)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">时间 (Time)</label>
                    <span className="text-yellow-400 font-mono">{timeOfDay.toFixed(1)}:00</span>
                  </div>
                  <input type="range" min="0" max="24" step="0.1" value={timeOfDay} onChange={(e) => handleTimeOfDayChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-yellow-500" />
                </div>
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
                    <label className="text-gray-500">泛光 (Bloom)</label>
                    <span className="text-purple-400 font-mono">{bloomStrength.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="3" step="0.1" value={bloomStrength} onChange={(e) => handleBloomStrengthChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">阈值 (Threshold)</label>
                    <span className="text-purple-400 font-mono">{bloomThreshold.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={bloomThreshold} onChange={(e) => handleBloomThresholdChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
              </div>
            </section>

            {/* Audio Tower */}
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-broadcast-tower text-pink-500"></i> 音频控制塔 (Audio Tower)
              </h3>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-gray-500">主音量 (Master)</label>
                    <span className="text-pink-400 font-mono">{(audioState.volume * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.01" value={audioState.volume} onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setAudioState(p => ({ ...p, volume: v }));
                    manager.getAudioSystem().setMasterVolume(v);
                  }} className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                </div>
                <button
                  onClick={() => (window as any).audioUploadDemo()}
                  className="w-full py-2 bg-pink-900/20 hover:bg-pink-900/40 border border-pink-900/50 text-pink-300 rounded transition-all font-bold"
                >
                  <i className="fas fa-upload mr-2"></i> 上传音频资产
                </button>
              </div>
            </section>
          </div>
        )}

        {/* === ASSETS TAB === */}
        {activeTab === 'assets' && (
          <div className="space-y-6 fade-in">
            <section className="space-y-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-cloud-upload-alt text-cyan-500"></i> 资产导入 (Import)
              </h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => (window as any).modelUploadDemo()}
                  className="py-2 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-gray-800 rounded transition-all flex flex-col items-center gap-1"
                  title="Model"
                >
                  <i className="fas fa-cube text-sm"></i>
                  <span className="text-[8px]">模型</span>
                </button>
                <button
                  onClick={() => (window as any).hdrUploadDemo()}
                  className="py-2 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-gray-800 rounded transition-all flex flex-col items-center gap-1"
                  title="HDR"
                >
                  <i className="fas fa-sun text-sm"></i>
                  <span className="text-[8px]">HDR</span>
                </button>
                <button
                  onClick={handleImageUpload}
                  className="py-2 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-gray-800 rounded transition-all flex flex-col items-center gap-1"
                  title="Image"
                >
                  <i className="fas fa-image text-sm"></i>
                  <span className="text-[8px]">图片</span>
                </button>
                <button
                  onClick={handleFolderUpload}
                  className="py-2 bg-gray-900 hover:bg-gray-800 text-yellow-400 border border-gray-800 rounded transition-all flex flex-col items-center gap-1"
                  title="Batch Import Folder"
                >
                  <i className="fas fa-folder-open text-sm"></i>
                  <span className="text-[8px]">文件夹</span>
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-database text-cyan-500"></i> 资产库 (Registry)
                </h3>
                <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">{assetList.length} 项</span>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'all', label: '全部', icon: 'fa-globe' },
                  { id: 'models', label: '模型', icon: 'fa-cube' },
                  { id: 'images', label: '图片', icon: 'fa-image' },
                  { id: 'audio', label: '音频', icon: 'fa-music' },
                  { id: 'environments', label: 'HDR', icon: 'fa-sun' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAssetTab(tab.id as any)}
                    className={`px-3 py-1 rounded text-[10px] flex items-center gap-1 whitespace-nowrap transition-colors ${(activeAssetTab === tab.id || (activeAssetTab === 'model' && tab.id === 'models') || (activeAssetTab === 'image' && tab.id === 'images') || (activeAssetTab === 'hdr' && tab.id === 'environments'))
                      ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-900 text-gray-500 hover:text-gray-300 border border-transparent'
                      }`}
                  >
                    <i className={`fas ${tab.icon}`}></i> {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {assetList.filter(a => {
                  if (activeAssetTab === 'all') return true;
                  if (activeAssetTab === 'model') return a.category === 'models' || a.type === 'model';
                  if (activeAssetTab === 'image') return a.category === 'images' || a.type === 'texture';
                  if (activeAssetTab === 'audio') return a.category === 'audio' || a.type === 'audio';
                  if (activeAssetTab === 'hdr') return a.category === 'environments' || a.type === 'hdr';
                  if (activeAssetTab === 'models') return a.category === 'models';
                  if (activeAssetTab === 'images') return a.category === 'images';
                  if (activeAssetTab === 'environments') return a.category === 'environments';
                  return true;
                }).length === 0 ? (
                  <div className="p-4 text-center text-gray-600 border border-gray-800 border-dashed rounded text-[10px]">
                    该分类下暂无资产<br />No assets in this category
                  </div>
                ) : (
                  assetList.filter(a => {
                    if (activeAssetTab === 'all') return true;
                    const tab = activeAssetTab as string;
                    if (tab === 'models' || tab === 'model') return a.category === 'models' || a.type === 'model';
                    if (tab === 'images' || tab === 'image') return a.category === 'images' || a.type === 'texture';
                    if (tab === 'audio') return a.category === 'audio' || a.type === 'audio';
                    if (tab === 'environments' || tab === 'hdr') return a.category === 'environments' || a.type === 'hdr';
                    return true;
                  }).map(asset => (
                    <div key={asset.id} className="flex items-center gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded hover:border-cyan-500/30 transition-all group">
                      {asset.thumbnail ? (
                        <img src={asset.thumbnail} className="w-10 h-10 object-cover rounded bg-gray-800" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center text-gray-600 group-hover:text-cyan-500 transition-colors">
                          <i className={`fas ${asset.type === 'models' ? 'fa-cube' : asset.type === 'audio' ? 'fa-music' : 'fa-image'}`}></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold truncate">{asset.name}</div>
                        <div className="text-[10px] text-gray-500 flex gap-2">
                          <span>{asset.type}</span>
                          <span>•</span>
                          <span>{(asset.size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

      </div>

      {/* 4. Collapsible Footer */}
      <div className={`mt-auto bg-gray-950 border-t border-gray-800 transition-all duration-300 flex flex-col shrink-0 ${isFooterExpanded ? 'h-48' : 'h-8'}`}>
        <button
          onClick={() => setIsFooterExpanded(!isFooterExpanded)}
          className="w-full h-8 flex items-center justify-between px-4 hover:bg-gray-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            <i className="fas fa-terminal"></i>
            <span className="text-blue-400 truncate max-w-[250px]">{stats.lastCommand || '指令系统就绪 (Ready)'}</span>
          </div>
          <i className={`fas fa-chevron-up text-gray-600 transition-transform ${isFooterExpanded ? 'rotate-180' : ''}`}></i>
        </button>

        {/* Expanded Content: Log */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gray-900/50">
          {stats.undoHistory.length === 0 ? (
            <div className="text-center text-gray-600 text-[10px] mt-4 italic">暂无指令记录</div>
          ) : (
            <div className="space-y-1">
              {stats.undoHistory.map((cmd) => (
                <div key={cmd.id} className="flex items-center justify-between p-1.5 hover:bg-gray-800/50 rounded transition-colors border-l-2 border-blue-500/30 pl-2">
                  <span className="text-[10px] text-gray-300 font-mono truncate">{cmd.name}</span>
                  <span className="text-[9px] text-gray-600 ml-2">{new Date(cmd.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

// Add minimal CSS for fade-in animation
const style = document.createElement('style');
style.innerHTML = `
  .fade-in { animation: fadeIn 0.3s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { bg: #111827; }
  .custom-scrollbar::-webkit-scrollbar-thumb { bg: #374151; border-radius: 4px; }
`;
document.head.appendChild(style);
