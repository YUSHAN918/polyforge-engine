
import React, { useState, useEffect } from 'react';
import { ModelPrimitive, PrimitiveType, CustomModel, AssetCategory, AssetSubCategory, WorkshopRefType } from '../types';
import { generate3DModel } from '../services/geminiService';

interface ModelWorkshopPanelProps {
  primitives: ModelPrimitive[];
  setPrimitives: React.Dispatch<React.SetStateAction<ModelPrimitive[]>>;
  selectedPrimId: string | null;
  setSelectedPrimId: (id: string | null) => void;
  onSave: (name: string, category: AssetCategory, subCategory: AssetSubCategory) => void;
  onExit: () => void;
  transformMode?: 'translate' | 'rotate' | 'scale';
  setTransformMode?: (mode: 'translate' | 'rotate' | 'scale') => void;
  workshopRefType?: WorkshopRefType;
  setWorkshopRefType?: (type: WorkshopRefType) => void;
  isSnapping?: boolean;
  setIsSnapping?: (val: boolean) => void;
  onUndo?: () => void;
  onDuplicate?: () => void;
  onHistorySave?: () => void; 
  initialData?: { id?: string, name: string, category: AssetCategory, subCategory: AssetSubCategory };
  referenceOpacity?: number;
  setReferenceOpacity?: (val: number) => void;
  // New props for context locking
  lockedCategory?: AssetCategory;
  lockedSubCategory?: AssetSubCategory;
  // New prop for AI Suggestions
  suggestion?: { category: AssetCategory, subCategory: AssetSubCategory } | null;
  // New prop for deleting the model itself
  onDelete?: (id: string) => void;
}

export const ModelWorkshopPanel: React.FC<ModelWorkshopPanelProps> = ({
  primitives,
  setPrimitives,
  selectedPrimId,
  setSelectedPrimId,
  onSave,
  onExit,
  transformMode = 'translate',
  setTransformMode,
  workshopRefType = 'none',
  setWorkshopRefType,
  isSnapping = false,
  setIsSnapping,
  onUndo,
  onDuplicate,
  onHistorySave,
  initialData,
  referenceOpacity = 0.8,
  setReferenceOpacity,
  lockedCategory,
  lockedSubCategory,
  suggestion,
  onDelete
}) => {
  const [modelName, setModelName] = useState('New Item');
  const [category, setCategory] = useState<AssetCategory>('character_part');
  const [subCategory, setSubCategory] = useState<AssetSubCategory>('head');
  const [creationMode, setCreationMode] = useState<'wearable' | 'standalone'>('wearable');
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  
  // AI Generation State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync selectedPrimId with MultiSelect
  useEffect(() => {
      if (selectedPrimId) {
          if (!multiSelectedIds.has(selectedPrimId)) {
               // If user clicks in 3D (via GameCanvas), ensure it's selected in UI
               setMultiSelectedIds(new Set([selectedPrimId]));
          }
      } else {
          // If singular select is cleared, should we clear multi? 
          // Not necessarily, but for now let's keep it simple.
          if (multiSelectedIds.size === 1) setMultiSelectedIds(new Set());
      }
  }, [selectedPrimId]);

  // Pre-fill data if editing OR if locked
  useEffect(() => {
      if (initialData) {
          setModelName(initialData.name);
          setCategory(initialData.category);
          setSubCategory(initialData.subCategory);
          
          if (initialData.category === 'map_object' || initialData.category === 'mob') {
              setCreationMode('standalone');
          } else {
              setCreationMode('wearable');
          }
      }

      // Enforce lock if provided
      if (lockedCategory && lockedSubCategory) {
          setCategory(lockedCategory);
          setSubCategory(lockedSubCategory);
          setCreationMode('wearable'); // Locked edits (body parts) are always wearable mode
      }
  }, [initialData, lockedCategory, lockedSubCategory]);

  // APPLY AI SUGGESTION
  useEffect(() => {
      if (suggestion && !lockedCategory) {
          setCategory(suggestion.category);
          setSubCategory(suggestion.subCategory);
          
          if (suggestion.category === 'map_object' || suggestion.category === 'mob') {
              setCreationMode('standalone');
          } else {
              setCreationMode('wearable');
          }
      }
  }, [suggestion, lockedCategory]);
  
  // --- CORE UTILS ---
  const addPrimitive = (type: PrimitiveType) => {
      if (onHistorySave) onHistorySave(); 
      if (setTransformMode) setTransformMode('translate');
      
      const newPrim: ModelPrimitive = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          position: [0, 0, 0], 
          rotation: [0, 0, 0],
          scale: [0.5, 0.5, 0.5], 
          color: '#cccccc'
      };
      setPrimitives(prev => [...prev, newPrim]);
      setSelectedPrimId(newPrim.id);
      setMultiSelectedIds(new Set([newPrim.id]));
  };

  const removePrimitive = (id: string) => {
      if (onHistorySave) onHistorySave(); 
      setPrimitives(prev => prev.filter(p => p.id !== id));
      if (selectedPrimId === id) setSelectedPrimId(null);
      setMultiSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const updateColor = (id: string, color: string) => {
      if (onHistorySave) onHistorySave();
      // Apply to all selected if ID is in multi-selection
      if (multiSelectedIds.has(id)) {
          setPrimitives(prev => prev.map(p => multiSelectedIds.has(p.id) ? { ...p, color } : p));
      } else {
          setPrimitives(prev => prev.map(p => p.id === id ? { ...p, color } : p));
      }
  };

  // --- MULTI-SELECT HANDLERS ---
  const handleSelectPrim = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      
      let newSet = new Set(multiSelectedIds);
      
      if (e.shiftKey && selectedPrimId) {
          // Range select
          const startIdx = primitives.findIndex(p => p.id === selectedPrimId);
          const endIdx = primitives.findIndex(p => p.id === id);
          if (startIdx !== -1 && endIdx !== -1) {
              const min = Math.min(startIdx, endIdx);
              const max = Math.max(startIdx, endIdx);
              for (let i = min; i <= max; i++) newSet.add(primitives[i].id);
          }
      } else if (e.ctrlKey || e.metaKey) {
          // Toggle select
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          setSelectedPrimId(id); // Set active for Gizmo
      } else {
          // Single select
          newSet = new Set([id]);
          setSelectedPrimId(id);
      }
      
      setMultiSelectedIds(newSet);
  };

  // --- GROUP / MIRROR LOGIC ---
  const handleGroup = () => {
      if (multiSelectedIds.size < 2) return;
      if (onHistorySave) onHistorySave();
      const groupId = Math.random().toString(36).substr(2, 9);
      setPrimitives(prev => prev.map(p => multiSelectedIds.has(p.id) ? { ...p, groupId } : p));
  };

  const handleUngroup = () => {
      if (multiSelectedIds.size === 0) return;
      if (onHistorySave) onHistorySave();
      setPrimitives(prev => prev.map(p => multiSelectedIds.has(p.id) ? { ...p, groupId: undefined } : p));
  };

  const handleSelectGroup = () => {
      if (!selectedPrimId) return;
      const target = primitives.find(p => p.id === selectedPrimId);
      if (!target || !target.groupId) return;
      
      const groupPeers = primitives.filter(p => p.groupId === target.groupId);
      const newSet = new Set(groupPeers.map(p => p.id));
      setMultiSelectedIds(newSet);
  };

  const handleMirror = () => {
      if (multiSelectedIds.size === 0) return;
      if (onHistorySave) onHistorySave();
      
      const newPrims: ModelPrimitive[] = [];
      const newGroupMap: Record<string, string> = {}; // Map old Group ID -> New Group ID

      primitives.forEach(p => {
          if (multiSelectedIds.has(p.id)) {
              let newGroupId = undefined;
              if (p.groupId) {
                  if (!newGroupMap[p.groupId]) newGroupMap[p.groupId] = Math.random().toString(36).substr(2, 9);
                  newGroupId = newGroupMap[p.groupId];
              }

              const clone: ModelPrimitive = {
                  ...JSON.parse(JSON.stringify(p)),
                  id: Math.random().toString(36).substr(2, 9),
                  groupId: newGroupId,
                  position: [-p.position[0], p.position[1], p.position[2]],
                  rotation: [p.rotation[0], -p.rotation[1], -p.rotation[2]]
              };
              newPrims.push(clone);
          }
      });
      
      setPrimitives(prev => [...prev, ...newPrims]);
  };

  // --- EXPORT/IMPORT ---
  const copyCode = async () => {
      const exportId = initialData?.id || `custom_${category}_${Math.random().toString(36).substr(2, 9)}`;
      const exportModel: CustomModel = {
          id: exportId,
          name: modelName,
          category: category,
          subCategory: subCategory,
          parts: primitives
      };

      const json = JSON.stringify(exportModel, null, 2);
      try {
          await navigator.clipboard.writeText(json);
          alert("已复制完整模型数据 (CustomModel JSON)！");
      } catch (e) {
          prompt("手动复制：", json);
      }
  };

  const handleExport = () => {
      const exportId = initialData?.id || `custom_${category}_${Math.random().toString(36).substr(2, 9)}`;
      const exportModel: CustomModel = {
          id: exportId,
          name: modelName,
          category: category,
          subCategory: subCategory,
          parts: primitives
      };
      
      const json = JSON.stringify(exportModel, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${modelName.replace(/\s+/g, '_')}_model.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const handleAiGenerate = async () => {
      if (!aiPrompt.trim()) return;
      setIsGenerating(true);
      if (onHistorySave) onHistorySave();
      
      const parts = await generate3DModel(aiPrompt);
      if (parts && parts.length > 0) {
          setPrimitives(parts);
          setShowAiModal(false);
          setMultiSelectedIds(new Set()); // Reset selection
      } else {
          alert("生成失败，请重试。");
      }
      setIsGenerating(false);
  };
  
  // Auto-switch logic (Only if NOT locked)
  useEffect(() => {
      if (lockedCategory && lockedSubCategory) return;
      if (!workshopRefType || creationMode === 'standalone') return;
      // Do not auto-switch if a suggestion was just applied, but suggestion effect runs after this usually?
      // Actually, we need to prevent this effect from overriding the suggestion effect if they conflict.
      // But typically workshopRefType is set by App.tsx at the same time as suggestion.
      
      if (workshopRefType === 'head') { setCategory('character_part'); setSubCategory('head'); }
      else if (workshopRefType === 'hand_r') { setCategory('weapon'); setSubCategory('one_handed'); }
      else if (workshopRefType === 'hand_l') { setCategory('shield'); setSubCategory('shield'); }
      else if (['arm_l', 'arm_r', 'forearm_l', 'forearm_r', 'chest', 'hips', 'back', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r'].includes(workshopRefType)) { setCategory('character_part'); setSubCategory('body'); }
  }, [workshopRefType, creationMode, lockedCategory, lockedSubCategory]);

  const renderSubCategorySelector = () => {
      // If Locked, show locked UI instead of selector
      if (lockedCategory && lockedSubCategory) {
          const map: Record<string, string> = {
              'chest': '胸腔', 'hips': '髋部', 'head': '头部', 'eye': '眼睛', 'mouth': '嘴巴', 'hair': '发型',
              'upper_arm': '大臂', 'forearm': '小臂', 'hand': '手部', 'thigh': '大腿', 'calf': '小腿', 'foot': '脚部', 
              'one_handed': '单手武器', 'two_handed': '双手武器', 'shield': '盾牌', 'helm': '头盔', 'mask': '面饰'
          };
          const label = map[lockedSubCategory] || lockedSubCategory;
          
          return (
              <div className="flex items-center justify-center gap-2 mt-2 bg-amber-900/30 border border-amber-600/30 rounded py-2 px-4 mx-4">
                  <i className="fas fa-lock text-amber-500 text-xs"></i>
                  <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">锁定部位: {label}</span>
              </div>
          );
      }

      if (creationMode === 'standalone') {
          return (
             <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar mt-2">
                {[{ id: 'prop', label: '道具' }, { id: 'structure', label: '建筑' }, { id: 'nature', label: '自然' }, { id: 'small', label: '小型怪' }, { id: 'medium', label: '中型怪' }, { id: 'large', label: '大型BOSS' }].map(sub => (
                    <button key={sub.id} onClick={() => { if (sub.id === 'small' || sub.id === 'medium' || sub.id === 'large') setCategory('mob'); else setCategory('map_object'); setSubCategory(sub.id as any); }} className={`px-2 py-1 text-[9px] uppercase font-bold rounded border ${subCategory === sub.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{sub.label}</button>
                ))}
             </div>
          );
      }
      let options = (workshopRefType === 'head' || category === 'character_part' || category === 'helm') 
          ? [{ cat: 'character_part', sub: 'head', label: '头型' }, { cat: 'character_part', sub: 'eye', label: '眼睛' }, { cat: 'character_part', sub: 'mouth', label: '嘴巴' }, { cat: 'character_part', sub: 'hair', label: '头发' }, { cat: 'helm', sub: 'helm', label: '头盔/帽' }, { cat: 'mask', sub: 'mask', label: '面饰' }]
          : (category === 'weapon' || category === 'shield') ? [{ cat: 'weapon', sub: 'one_handed', label: '单手' }, { cat: 'weapon', sub: 'two_handed', label: '双手' }, { cat: 'shield', sub: 'shield', label: '盾牌' }] 
          : [{ cat: 'character_part', sub: 'upper_arm', label: '大臂' }, { cat: 'character_part', sub: 'forearm', label: '小臂' }, { cat: 'character_part', sub: 'hand', label: '手掌' },
             { cat: 'character_part', sub: 'thigh', label: '大腿' }, { cat: 'character_part', sub: 'calf', label: '小腿' }, { cat: 'character_part', sub: 'foot', label: '脚掌' },
             { cat: 'character_part', sub: 'chest', label: '胸腔' }, { cat: 'character_part', sub: 'hips', label: '髋部' }];

      return (
          <div className="flex gap-1 flex-wrap mt-2 justify-center px-4">
              {options.map(opt => (
                  <button key={opt.sub + opt.cat} onClick={() => { setCategory(opt.cat as any); setSubCategory(opt.sub as any); }} className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded border transition-all ${subCategory === opt.sub && category === opt.cat ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{opt.label}</button>
              ))}
          </div>
      );
  };

  const selectedPrim = primitives.find(p => p.id === selectedPrimId);
  const selectedCount = multiSelectedIds.size;

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-gray-950 border-l border-gray-800 flex flex-col z-30 shadow-2xl">
        {/* Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-white font-bold flex items-center gap-2"><i className="fas fa-cubes text-purple-500"></i> 模型工坊 {initialData && <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded">编辑模式</span>}</h2>
            <div className="flex gap-2">
                {/* DELETE BUTTON for the WHOLE MODEL (if editing an existing one) */}
                {initialData && onDelete && (
                    <button onClick={() => onDelete(initialData.id!)} className="px-3 py-1 bg-red-900/30 hover:bg-red-600 text-red-300 hover:text-white text-xs rounded border border-red-800 transition-colors" title="删除整个模型">
                        <i className="fas fa-trash"></i>
                    </button>
                )}
                <button onClick={onExit} className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded border border-gray-700 flex items-center gap-2"><i className="fas fa-arrow-left"></i> 返回</button>
            </div>
        </div>

        {/* Opacity */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-3">
            <i className="fas fa-ghost text-gray-500 text-xs"></i><span className="text-[10px] text-gray-400 uppercase font-bold">参考透明度</span>
            <input type="range" min="0" max="1" step="0.1" value={referenceOpacity} onChange={(e) => setReferenceOpacity && setReferenceOpacity(parseFloat(e.target.value))} className="flex-grow h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
        </div>
        
        {/* Toolbar */}
        <div className="p-2 bg-gray-900 border-b border-gray-800 flex flex-col gap-2">
            <div className="flex justify-between items-center px-2">
                 <div className="flex gap-2">
                    {[{ id: 'translate', icon: 'fa-arrows-alt' }, { id: 'rotate', icon: 'fa-sync-alt' }, { id: 'scale', icon: 'fa-expand-arrows-alt' }].map((tool) => (
                        <button key={tool.id} onClick={() => setTransformMode && setTransformMode(tool.id as any)} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${transformMode === tool.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}><i className={`fas ${tool.icon} text-xs`}></i></button>
                    ))}
                </div>
                <div className="flex gap-1 border-l border-gray-700 pl-2">
                    <button onClick={onUndo} className="w-8 h-8 rounded text-gray-400 hover:text-white hover:bg-gray-700" title="撤销"><i className="fas fa-undo text-xs"></i></button>
                    <button onClick={onDuplicate} className="w-8 h-8 rounded text-gray-400 hover:text-white hover:bg-gray-700" title="复制"><i className="fas fa-clone text-xs"></i></button>
                    <button onClick={() => setIsSnapping && setIsSnapping(!isSnapping)} className={`w-8 h-8 rounded transition-all ${isSnapping ? 'text-green-400 bg-green-900/30' : 'text-gray-400 hover:text-white'}`} title="吸附"><i className="fas fa-magnet text-xs"></i></button>
                </div>
            </div>

            {/* Advanced Tools */}
             <div className="flex justify-between items-center px-2 border-t border-gray-800 pt-2">
                 <div className="flex gap-1">
                      <button onClick={handleGroup} disabled={selectedCount < 2} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-[10px] rounded border border-gray-700" title="编组"><i className="fas fa-object-group mr-1"></i> 编组</button>
                      <button onClick={handleUngroup} disabled={selectedCount === 0} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-[10px] rounded border border-gray-700" title="解组"><i className="fas fa-object-ungroup mr-1"></i> 解组</button>
                 </div>
                 <button onClick={handleMirror} disabled={selectedCount === 0} className="px-2 py-1 bg-gray-800 hover:bg-purple-600 disabled:opacity-50 text-gray-300 hover:text-white text-[10px] rounded border border-gray-700" title="X轴镜像"><i className="fas fa-yin-yang mr-1"></i> 镜像</button>
             </div>
        </div>
        
        {/* Mode Switcher */}
        <div className="p-2 bg-gray-900/80 border-b border-gray-800 flex gap-2 px-4">
             {!lockedCategory && (
                <>
                    <button onClick={() => setCreationMode('wearable')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${creationMode === 'wearable' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-500'}`}>穿戴模式</button>
                    <button onClick={() => setCreationMode('standalone')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded ${creationMode === 'standalone' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'}`}>独立模式</button>
                </>
             )}
             {lockedCategory && (
                 <div className="w-full text-center py-1.5 bg-gray-800 rounded text-[10px] text-gray-400 font-mono">固定编辑模式</div>
             )}
        </div>

        {creationMode === 'wearable' && (<div className="px-4 py-2 bg-purple-900/20 text-center border-b border-gray-800"><p className="text-[10px] text-purple-300"><i className="fas fa-mouse-pointer mr-1"></i> 点击3D模型身体部位以切换编辑区域</p>{renderSubCategorySelector()}</div>)}

        {/* Add Shapes */}
        <div className="p-4 border-b border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 flex justify-between"><span>添加几何体</span><button onClick={() => setShowAiModal(true)} className="text-purple-400 hover:text-white text-[10px] bg-purple-900/30 px-2 py-0.5 rounded border border-purple-800 hover:bg-purple-800">✨ AI 生成</button></h3>
            <div className="grid grid-cols-4 gap-2">
                {[{ type: 'box', icon: 'fa-cube', l: '方块' }, { type: 'sphere', icon: 'fa-circle', l: '球体' }, { type: 'cylinder', icon: 'fa-database', l: '圆柱' }, { type: 'cone', icon: 'fa-caret-up', l: '圆锥' }, { type: 'capsule', icon: 'fa-capsules', l: '胶囊' }, { type: 'tetrahedron', icon: 'fa-mountain', l: '四面体' }, { type: 'plane', icon: 'fa-square', l: '平面' }, { type: 'ring', icon: 'fa-dot-circle', l: '圆环' }].map(item => (
                    <button key={item.type} onClick={() => addPrimitive(item.type as PrimitiveType)} className="flex flex-col items-center justify-center p-2 bg-gray-800 rounded hover:bg-gray-700 border border-gray-700 hover:border-purple-500 group"><i className={`fas ${item.icon} text-gray-400 group-hover:text-purple-400 mb-1 text-[10px]`}></i><span className="text-[8px] text-gray-500 group-hover:text-gray-300">{item.l}</span></button>
                ))}
            </div>
        </div>

        {/* Layer List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-2">
             <div className="flex justify-between items-center mb-2 px-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase">图层 ({primitives.length}) <span className="text-[9px] font-normal text-gray-600 ml-2">Shift多选 / Ctrl加选</span></h3>
             </div>
            <div className="space-y-1">
                {primitives.map((prim, idx) => (
                    <div 
                        key={prim.id}
                        onClick={(e) => handleSelectPrim(prim.id, e)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-xs border ${multiSelectedIds.has(prim.id) ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}`}
                    >
                        <span className="w-4 text-center text-[10px] opacity-50">{idx + 1}</span>
                        <i className={`fas ${prim.type === 'box' ? 'fa-cube' : prim.type === 'sphere' ? 'fa-circle' : 'fa-shapes'} opacity-70 w-4`}></i>
                        <span className="flex-grow capitalize truncate">{prim.groupId ? `[G] ${prim.type}` : prim.type}</span>
                        
                        {prim.groupId && (
                            <button onClick={(e) => { e.stopPropagation(); handleSelectGroup(); }} className="text-[9px] bg-gray-700 px-1 rounded text-gray-300 hover:text-white" title="选中整组">G</button>
                        )}
                        
                        <div className="w-4 h-4 rounded-full overflow-hidden border border-white/20 relative" onClick={(e) => e.stopPropagation()}>
                             <input type="color" value={prim.color} onMouseDown={() => { if(onHistorySave) onHistorySave(); }} onChange={(e) => updateColor(prim.id, e.target.value)} className="absolute -top-1 -left-1 w-6 h-6 p-0 cursor-pointer opacity-0" />
                            <div className="w-full h-full" style={{backgroundColor: prim.color}}></div>
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); removePrimitive(prim.id); }} className="text-gray-600 hover:text-red-500 px-1"><i className="fas fa-trash"></i></button>
                    </div>
                ))}
            </div>
        </div>

        {/* Properties (for single select or common properties) */}
        {selectedCount > 0 && (
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400">颜色</label>
                    <div className="flex-grow flex items-center gap-2 bg-gray-800 p-1 rounded border border-gray-700">
                        {selectedCount === 1 ? (
                            <>
                                <input type="color" value={selectedPrim?.color || '#000'} onMouseDown={() => { if(onHistorySave) onHistorySave(); }} onChange={(e) => updateColor(selectedPrimId!, e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"/>
                                <span className="text-xs text-gray-400 font-mono">{selectedPrim?.color}</span>
                            </>
                        ) : (
                            <span className="text-xs text-gray-500 italic">多选 ({selectedCount})</span>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Export */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
            <h3 className="text-xs font-bold text-purple-400 uppercase mb-2">编译</h3>
            <div className="space-y-3">
                <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none" placeholder="模型名称"/>
                {/* Locked Indicator */}
                <div className={`flex items-center gap-2 text-[10px] text-gray-400 bg-gray-800 p-2 rounded ${lockedCategory ? 'border border-amber-900' : ''}`}>
                    <span>保存为:</span>
                    <span className="text-white font-bold bg-purple-700 px-1.5 rounded uppercase">{category}</span>
                    <span className="text-white font-bold bg-indigo-700 px-1.5 rounded uppercase">{subCategory}</span>
                    {lockedCategory && <i className="fas fa-lock text-amber-500 ml-auto"></i>}
                </div>
                <div className="flex gap-2 pt-2">
                    <button onClick={copyCode} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold uppercase rounded border border-gray-600"><i className="fas fa-copy"></i></button>
                     <button onClick={handleExport} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase rounded border border-blue-500 flex items-center justify-center gap-1"><i className="fas fa-file-export"></i> 导出</button>
                    <button onClick={() => onSave(modelName, category, subCategory)} disabled={primitives.length === 0 || !modelName.trim()} className="flex-[2] py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-bold uppercase rounded shadow-lg flex items-center justify-center gap-2"><i className="fas fa-save"></i> {initialData ? '更新' : '保存'}</button>
                </div>
            </div>
        </div>

        {/* AI Modal */}
        {showAiModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><i className="fas fa-magic text-purple-400"></i> AI 灵感生成器</h3>
                    <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="例如：一把火焰形状的红色大剑..." className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-xs text-white h-24 mb-4 resize-none"/>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded">取消</button>
                        <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2">{isGenerating ? '生成中...' : '生成'}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
