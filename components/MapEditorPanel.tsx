
import React, { useState, useRef } from 'react';
import { MapConfig, MapItemType, AppMode, AssetTransformMap, CustomModel, SavedCharacter } from '../types';

// Extend prop to include custom models
interface MapEditorPanelProps {
  mapConfig: MapConfig;
  setMapConfig: React.Dispatch<React.SetStateAction<MapConfig>>;
  selectedTool: MapItemType | 'eraser' | 'select'; // Added select
  setSelectedTool: (tool: MapItemType | 'eraser' | 'select') => void;
  setMode: (mode: AppMode) => void;
  assetTransforms?: AssetTransformMap;
  setAssetTransforms?: React.Dispatch<React.SetStateAction<AssetTransformMap>>;
  customModels?: CustomModel[]; 
  savedCharacters?: SavedCharacter[]; // New prop
  selectedEntityCount?: number; 
  onDeleteSelected?: () => void;
  onHistorySave?: () => void; // New Prop for Undo
}

type Category = 'build' | 'small_mob' | 'med_mob' | 'large_mob' | 'tools' | 'custom' | 'npc';

export const MapEditorPanel: React.FC<MapEditorPanelProps> = ({ 
    mapConfig, 
    setMapConfig, 
    selectedTool, 
    setSelectedTool, 
    setMode,
    assetTransforms,
    setAssetTransforms,
    customModels = [],
    savedCharacters = [],
    selectedEntityCount = 0,
    onDeleteSelected,
    onHistorySave
}) => {

  const [activeCategory, setActiveCategory] = useState<Category>('build');
  const [showAssetLab, setShowAssetLab] = useState(false);
  const mapFileRef = useRef<HTMLInputElement>(null);
  const assetConfigFileRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'build', label: '建造', icon: 'fa-shapes' },
    { id: 'custom', label: '自定义模型', icon: 'fa-cubes' },
    { id: 'npc', label: '自定义角色', icon: 'fa-users' },
    { id: 'small_mob', label: '小型怪物', icon: 'fa-frog' },
    { id: 'med_mob', label: '中型怪物', icon: 'fa-dragon' },
    { id: 'large_mob', label: '首领BOSS', icon: 'fa-skull-crossbones' },
  ];

  let tools: { id: MapItemType | 'eraser', label: string, icon?: string, color: string, cat: Category }[] = [
    // Build
    { id: 'wall', label: '墙壁', icon: 'fa-square', color: 'bg-gray-500', cat: 'build' },
    { id: 'tree', label: '树木', icon: 'fa-tree', color: 'bg-green-700', cat: 'build' },
    { id: 'crate', label: '木箱', icon: 'fa-box', color: 'bg-amber-700', cat: 'build' },
    
    // Small Mobs
    { id: 'rabbit', label: '野兔', color: 'bg-gray-300', cat: 'small_mob' },
    { id: 'duck', label: '野鸭', color: 'bg-yellow-500', cat: 'small_mob' },
    { id: 'toad', label: '蛤蟆', color: 'bg-green-500', cat: 'small_mob' },

    // Medium Mobs
    { id: 'boar', label: '野猪', color: 'bg-stone-600', cat: 'med_mob' },
    { id: 'deer', label: '小鹿', color: 'bg-orange-800', cat: 'med_mob' },
    { id: 'goblin', label: '哥布林', color: 'bg-emerald-600', cat: 'med_mob' },

    // Large Mobs
    { id: 'golem', label: '岩石巨人', color: 'bg-slate-500', cat: 'large_mob' },
    { id: 'troll', label: '森林巨魔', color: 'bg-teal-800', cat: 'large_mob' },
    { id: 'dragon', label: '魔龙', color: 'bg-red-800', cat: 'large_mob' },
  ];
  
  // Inject Custom Models
  const customTools = customModels
    .filter(m => m.category === 'map_object' || m.category === 'mob')
    .map(m => ({
        id: m.id,
        label: m.name,
        icon: m.category === 'mob' ? 'fa-ghost' : 'fa-cube',
        color: m.category === 'mob' ? 'bg-red-900' : 'bg-indigo-900',
        cat: 'custom' as Category
    }));

  // Inject Saved Characters
  const charTools = savedCharacters.map(c => ({
      id: c.id!,
      label: c.name,
      icon: 'fa-user-circle',
      color: 'bg-purple-800',
      cat: 'npc' as Category
  }));
    
  // Combine native tools and custom tools
  const allTools = [...tools, ...customTools, ...charTools];

  const clearMap = () => {
      if (confirm('确定要清空地图吗？')) {
          if (onHistorySave) onHistorySave();
          setMapConfig(prev => ({ ...prev, elements: [] }));
      }
  };
  
  // --- MAP IMPORT/EXPORT ---
  const handleExportMap = () => {
      const json = JSON.stringify(mapConfig, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polyforge_map_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportMap = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const json = JSON.parse(text);
              if (json && Array.isArray(json.elements)) {
                  if (onHistorySave) onHistorySave();
                  setMapConfig(json);
                  alert("地图导入成功！");
              } else {
                  alert("文件格式不正确 (Invalid Map Config)");
              }
          } catch (err) {
              alert("导入失败：文件无效");
          }
      };
      reader.readAsText(file);
      if (mapFileRef.current) mapFileRef.current.value = '';
  };

  // --- ASSET CONFIG IMPORT/EXPORT (Transforms) ---
  const handleExportAssetConfig = () => {
      if (!assetTransforms) return;
      const json = JSON.stringify(assetTransforms, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `polyforge_assets_config_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportAssetConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const json = JSON.parse(text);
              if (json && typeof json === 'object') {
                  if (setAssetTransforms) {
                      setAssetTransforms(json);
                      alert("资产配置导入成功！");
                  }
              } else {
                  alert("文件格式不正确 (Invalid Asset Config)");
              }
          } catch (err) {
              alert("导入失败：文件无效");
          }
      };
      reader.readAsText(file);
      if (assetConfigFileRef.current) assetConfigFileRef.current.value = '';
  };
  
  const groundPresets = [
    { id: 'stone', color: '#2a2a2a', label: '地牢 (Stone)', icon: 'fa-dungeon' },
    { id: 'grass', color: '#1a472a', label: '草地 (Grass)', icon: 'fa-leaf' },
    { id: 'dirt', color: '#5d4037', label: '荒土 (Dirt)', icon: 'fa-mountain' },
    { id: 'void', color: '#111111', label: '虚空 (Void)', icon: 'fa-ghost' },
  ];

  // Asset Lab Helper
  const updateAssetTransform = (key: 'scale' | 'rotationY' | 'posY', value: number) => {
      if (!setAssetTransforms || selectedTool === 'eraser' || selectedTool === 'select') return;
      
      setAssetTransforms(prev => {
          const current = prev[selectedTool] || { scale: 1, position: [0,0,0], rotation: [0,0,0] };
          
          let next = { ...current };
          if (key === 'scale') next.scale = value;
          if (key === 'rotationY') next.rotation = [0, value, 0];
          if (key === 'posY') next.position = [0, value, 0];

          return { ...prev, [selectedTool]: next };
      });
  };

  const getAssetTransform = () => {
      if (!assetTransforms || selectedTool === 'eraser' || selectedTool === 'select') return { scale: 1, rotation: [0,0,0], position: [0,0,0] };
      return assetTransforms[selectedTool] || { scale: 1, rotation: [0,0,0], position: [0,0,0] };
  };

  const filteredTools = activeCategory === 'custom' 
    ? allTools.filter(t => t.cat === 'custom')
    : activeCategory === 'npc'
    ? allTools.filter(t => t.cat === 'npc')
    : allTools.filter(t => t.cat === activeCategory);
    
  const currentTransform = getAssetTransform();

  return (
    <div className="absolute top-0 left-0 h-full flex z-20 pointer-events-none">
       
       {/* Category Sidebar */}
       <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4 pointer-events-auto shadow-xl">
          <button
              onClick={() => { setSelectedTool('select'); setActiveCategory('tools' as any); setShowAssetLab(false); }}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedTool === 'select' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
              title="选择工具 (Box Select)"
            >
              <i className="fas fa-mouse-pointer"></i>
          </button>
          
          <div className="h-px w-8 bg-gray-700 my-1"></div>
          
          {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                    setActiveCategory(cat.id as Category);
                    // UX Optimization: Auto-select the first tool in the category
                    const firstTool = allTools.find(t => t.cat === cat.id);
                        
                    if (firstTool) {
                        setSelectedTool(firstTool.id);
                    }
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${activeCategory === cat.id && selectedTool !== 'select' && selectedTool !== 'eraser' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                title={cat.label}
              >
                  <i className={`fas ${cat.icon}`}></i>
              </button>
          ))}
          <div className="h-px w-8 bg-gray-700 my-2"></div>
           <button
            onClick={() => { setSelectedTool('eraser'); setActiveCategory('tools' as any); setShowAssetLab(false); }}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${selectedTool === 'eraser' ? 'bg-red-500 text-white' : 'text-gray-500 hover:text-red-500 hover:bg-gray-800'}`}
            title="橡皮擦"
          >
              <i className="fas fa-eraser"></i>
          </button>
          
          {/* MAP ACTION GROUP */}
          <div className="flex flex-col gap-2 mt-auto pb-4 w-full items-center border-t border-gray-800 pt-4">
              {/* Asset Config IO */}
              <input type="file" ref={assetConfigFileRef} onChange={handleImportAssetConfig} accept=".json" className="hidden" />
              <button
                onClick={handleExportAssetConfig}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all text-purple-500 hover:text-purple-300 hover:bg-gray-800"
                title="导出资产配置 (JSON)"
              >
                  <i className="fas fa-cogs"></i>
              </button>
              <button
                onClick={() => assetConfigFileRef.current?.click()}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all text-purple-500 hover:text-purple-300 hover:bg-gray-800"
                title="导入资产配置 (JSON)"
              >
                  <i className="fas fa-file-code"></i>
              </button>

              <div className="h-px w-6 bg-gray-700 my-1"></div>

              {/* Map IO */}
              <input type="file" ref={mapFileRef} onChange={handleImportMap} accept=".json" className="hidden" />
              
              <button
                onClick={handleExportMap}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all text-gray-500 hover:text-blue-400 hover:bg-gray-800"
                title="导出地图 (JSON)"
              >
                  <i className="fas fa-file-export"></i>
              </button>
              
              <button
                onClick={() => mapFileRef.current?.click()}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all text-gray-500 hover:text-blue-400 hover:bg-gray-800"
                title="导入地图 (JSON)"
              >
                  <i className="fas fa-file-import"></i>
              </button>

              <button
                onClick={clearMap}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all text-gray-500 hover:text-red-500 hover:bg-gray-800"
                title="清空地图"
              >
                  <i className="fas fa-trash-alt"></i>
              </button>
          </div>
       </div>

       {/* Items Drawer */}
       <div className="w-48 bg-gray-900/95 backdrop-blur-md border-r border-gray-700 p-4 pointer-events-auto flex flex-col shadow-2xl animate-slide-in-left">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 pb-2 mb-4">
                {selectedTool === 'select' ? '编辑模式' : categories.find(c => c.id === activeCategory)?.label || '工具'}
            </h3>
            
            {/* GROUND SETTINGS - INSERT HERE */}
            {activeCategory === 'build' && selectedTool !== 'select' && selectedTool !== 'eraser' && (
                <div className="mb-4 pb-4 border-b border-gray-700 animate-fade-in">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        <span>环境风格</span>
                        <div className="w-3 h-3 rounded-full border border-gray-600" style={{backgroundColor: mapConfig.groundColor}}></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {groundPresets.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => { if(onHistorySave) onHistorySave(); setMapConfig(prev => ({ ...prev, groundColor: p.color })); }}
                                className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all ${mapConfig.groundColor === p.color ? 'border-white bg-gray-700 shadow-md scale-105' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}
                                title={p.label}
                            >
                                <div className="w-4 h-4 rounded-full mb-1 shadow-sm" style={{backgroundColor: p.color}}></div>
                                <span className="text-[8px] text-gray-400">{p.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Context Aware Content */}
            {selectedTool === 'select' ? (
                <div className="flex flex-col gap-4 text-center py-4">
                    <i className="fas fa-object-group text-4xl text-gray-700"></i>
                    <p className="text-xs text-gray-400">
                        拖动鼠标框选物体<br/>选中后可批量删除
                    </p>
                    
                    {selectedEntityCount > 0 && (
                        <div className="animate-fade-in bg-gray-800 rounded-xl p-4 border border-gray-700">
                             <div className="text-2xl font-bold text-blue-400 mb-1">{selectedEntityCount}</div>
                             <div className="text-[10px] text-gray-500 uppercase font-bold mb-4">个物体已选中</div>
                             <button 
                                onClick={onDeleteSelected}
                                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold text-xs flex items-center justify-center gap-2"
                             >
                                 <i className="fas fa-trash"></i> 删除选中
                             </button>
                             <div className="mt-2 text-[9px] text-gray-600">快捷键: Delete</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 overflow-y-auto no-scrollbar pb-20">
                    {filteredTools.map((tool) => (
                        <button 
                            key={tool.id}
                            onClick={() => setSelectedTool(tool.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all
                                ${selectedTool === tool.id 
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-full ${tool.color} flex items-center justify-center shadow-md`}>
                                {tool.icon ? <i className={`fas ${tool.icon} text-white text-xs`}></i> : <span className="text-[8px] font-bold text-white/50">3D</span>}
                            </div>
                            <span className="text-[10px] font-medium truncate w-full text-center">{tool.label}</span>
                        </button>
                    ))}
                    {filteredTools.length === 0 && (
                        <div className="col-span-2 text-center text-gray-500 text-xs py-4">
                            {activeCategory === 'npc' ? '暂无保存的角色' : '暂无可用资产'}
                        </div>
                    )}
                </div>
            )}
            
            {/* Asset Lab Toggle */}
            {selectedTool !== 'eraser' && selectedTool !== 'select' && (
                <div className="mt-4 pt-4 border-t border-gray-800">
                    <button 
                        onClick={() => setShowAssetLab(!showAssetLab)}
                        className={`w-full py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${showAssetLab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                    >
                        <i className="fas fa-flask"></i> 资产实验室
                    </button>
                </div>
            )}
            
            <div className="mt-auto pt-4 text-[10px] text-gray-600 border-t border-gray-800">
               {selectedTool === 'select' ? (
                   <>
                       <div className="flex items-center justify-between mb-1">
                         <span>左键拖拽</span> <span className="text-gray-400">框选范围</span>
                       </div>
                       <div className="flex items-center justify-between mb-1">
                         <span>Delete键</span> <span className="text-gray-400">删除选中</span>
                       </div>
                   </>
               ) : (
                   <>
                       <div className="flex items-center justify-between mb-1">
                         <span>左键拖动</span> <span className="text-gray-400">连续放置</span>
                       </div>
                       <div className="flex items-center justify-between mb-1">
                         <span>右键</span> <span className="text-gray-400">删除</span>
                       </div>
                   </>
               )}
               <div className="flex items-center justify-between mb-1">
                 <span>中键</span> <span className="text-gray-400">旋转视角</span>
               </div>
                <div className="flex items-center justify-between">
                 <span>空格+左键</span> <span className="text-gray-400">平移</span>
               </div>
            </div>
       </div>

        {/* Asset Lab Panel */}
        {showAssetLab && selectedTool !== 'eraser' && selectedTool !== 'select' && (
            <div className="w-56 bg-gray-900/95 backdrop-blur-md border-r border-gray-700 p-4 pointer-events-auto shadow-2xl animate-fade-in-right flex flex-col z-30">
                 <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                     <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest"><i className="fas fa-flask"></i> 实验室: {allTools.find(t => t.id === selectedTool)?.label}</h3>
                     <button onClick={() => setShowAssetLab(false)} className="text-gray-500 hover:text-white"><i className="fas fa-times"></i></button>
                 </div>

                 <div className="space-y-4">
                     {/* Scale */}
                     <div>
                         <label className="text-[10px] uppercase text-gray-500 flex justify-between">
                             <span>整体缩放</span>
                             <span className="text-indigo-400">{currentTransform.scale.toFixed(1)}x</span>
                         </label>
                         <input 
                            type="range" min="0.1" max="3.0" step="0.1"
                            value={currentTransform.scale}
                            onChange={(e) => updateAssetTransform('scale', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1"
                         />
                     </div>

                     {/* Rotation Y */}
                     <div>
                         <label className="text-[10px] uppercase text-gray-500 flex justify-between">
                             <span>垂直旋转 (Y)</span>
                             <span className="text-indigo-400">{(currentTransform.rotation[1] * (180/Math.PI)).toFixed(0)}°</span>
                         </label>
                         <input 
                            type="range" min="0" max={Math.PI * 2} step="0.1"
                            value={currentTransform.rotation[1]}
                            onChange={(e) => updateAssetTransform('rotationY', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1"
                         />
                     </div>

                     {/* Position Y */}
                     <div>
                         <label className="text-[10px] uppercase text-gray-500 flex justify-between">
                             <span>垂直偏移 (Y)</span>
                             <span className="text-indigo-400">{currentTransform.position[1].toFixed(2)}</span>
                         </label>
                         <input 
                            type="range" min="-1.0" max="2.0" step="0.05"
                            value={currentTransform.position[1]}
                            onChange={(e) => updateAssetTransform('posY', parseFloat(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-1"
                         />
                     </div>

                     <div className="p-3 bg-indigo-900/20 border border-indigo-900/50 rounded-lg text-[10px] text-indigo-300">
                         <i className="fas fa-info-circle mr-1"></i>
                         调整将实时应用到地图上所有该类型的物体。
                     </div>

                     <button 
                        onClick={handleExportAssetConfig}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded mt-2"
                    >
                        <i className="fas fa-file-export"></i> 导出配置 (JSON)
                    </button>
                 </div>
            </div>
        )}

    </div>
  );
};
