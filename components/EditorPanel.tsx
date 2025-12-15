
import React, { useState, useEffect } from 'react';
import { CharacterConfig, AppMode, CharacterDimensions, WeaponStyle, AssetCategory, AssetSubCategory, CustomModel, SavedProceduralAction, ActionCategory } from '../types';
import { isNativeAsset } from '../initialData';

interface EditorPanelProps {
  config: CharacterConfig;
  setConfig: React.Dispatch<React.SetStateAction<CharacterConfig>>;
  setMode: (mode: AppMode) => void;
  onFinish: () => void;
  // gearTransforms props removed
  selectedPartId?: string;
  setSelectedPartId?: (id: string) => void;
  focusedParentId?: string;
  setFocusedParentId?: (id: string) => void;
  customModels?: CustomModel[];
  currentStep: 1 | 2 | 3; // UPDATED to 3 steps
  setStep: (step: 1 | 2 | 3) => void;
  weaponCategory: 'one_handed' | 'two_handed' | 'custom';
  setWeaponCategory: (cat: 'one_handed' | 'two_handed' | 'custom') => void;
  onDeleteCustomModel?: (id: string) => void;
  onEditCustomModel?: (id: string, category?: AssetCategory, subCategory?: AssetSubCategory) => void;
  onCreateCustomModel?: (category: AssetCategory, subCategory?: AssetSubCategory) => void;
  onConfigChange?: () => void;
  onHistorySave?: () => void;
  savedProceduralActions?: SavedProceduralAction[]; // NEW
}

// Reusable Dimension Slider Component
const DimensionControl = ({ label, value, onChange, min = 0.5, max = 2.0 }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number }) => (
    <div className="group">
        <div className="flex justify-between text-[10px] uppercase font-semibold mb-1">
            <span className="text-gray-500">{label}</span>
            <span className="text-blue-400">{value.toFixed(2)}x</span>
        </div>
        <input 
            type="range" min={min} max={max} step="0.05" 
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))} 
            className="w-full accent-blue-600 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" 
        />
    </div>
);

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
    config, 
    setConfig, 
    setMode, 
    onFinish, 
    selectedPartId,
    setSelectedPartId,
    focusedParentId,
    setFocusedParentId,
    customModels = [],
    currentStep,
    setStep,
    weaponCategory,
    setWeaponCategory,
    onDeleteCustomModel,
    onEditCustomModel,
    onCreateCustomModel,
    onConfigChange,
    onHistorySave,
    savedProceduralActions = []
}) => {
  const [activeBodyTab, setActiveBodyTab] = useState<'head' | 'body'>('head');
  
  // Auto-switch tab based on selection
  useEffect(() => {
      if (selectedPartId) {
          const bodyParts = ['chest', 'hips', 'arm', 'forearm', 'hand', 'thigh', 'calf', 'foot', 'back'];
          if (bodyParts.some(p => selectedPartId.includes(p))) {
              setActiveBodyTab('body');
          } else if (selectedPartId.includes('head') || selectedPartId.includes('eye') || selectedPartId.includes('hair') || selectedPartId.includes('mouth')) {
              setActiveBodyTab('head');
          }
      }
  }, [selectedPartId, focusedParentId]);

  const handleConfigUpdate = (newConfig: CharacterConfig | ((prev: CharacterConfig) => CharacterConfig)) => {
      if (onHistorySave) onHistorySave();
      setConfig(newConfig);
      if (onConfigChange) onConfigChange();
  }

  const updateDimension = (key: keyof CharacterDimensions, value: number) => { handleConfigUpdate(prev => ({ ...prev, dimensions: { ...prev.dimensions, [key]: value } })); };
  const updateColor = (part: keyof CharacterConfig, color: string) => { handleConfigUpdate(prev => ({ ...prev, [part]: color })); };

  const handleWeaponSelect = (weapon: WeaponStyle) => {
      let inferredClass: any = 'none';
      const m = customModels.find(cm => cm.id === weapon);
      
      // Heuristic for class
      if (weapon.includes('sword') || weapon.includes('hammer')) inferredClass = '战士';
      else if (weapon.includes('bow')) inferredClass = '游侠';
      else if (weapon.includes('staff') || weapon.includes('book')) inferredClass = '法师';
      else if (weapon.includes('daggers')) inferredClass = '盗贼';
      
      // If custom, default to Warrior unless it's a known ranged type
      if (m && m.subCategory === 'two_handed') inferredClass = '战士';

      const isTwoHanded = weapon.includes('bow') || weapon === 'staff_orb' || weapon.includes('daggers') || (m && m.subCategory === 'two_handed');
      handleConfigUpdate(prev => ({ ...prev, className: inferredClass, gear: { ...prev.gear, weapon, shield: isTwoHanded ? 'none' : prev.gear.shield } }));
  };

  const switchCategory = (cat: 'one_handed' | 'two_handed' | 'custom') => {
      setWeaponCategory(cat);
      if (cat === 'one_handed') handleConfigUpdate(prev => ({ ...prev, className: '战士', gear: { ...prev.gear, weapon: 'sword_basic', shield: 'shield_round' } }));
      else if (cat === 'two_handed') handleConfigUpdate(prev => ({ ...prev, className: '盗贼', gear: { ...prev.gear, weapon: 'daggers_basic', shield: 'none' } }));
  };

  const handleCustomHelmSelect = (id: string) => { handleConfigUpdate(prev => ({ ...prev, gear: { ...prev.gear, helm: id } })); };
  const handleCustomMaskSelect = (id: string) => { handleConfigUpdate(prev => ({ ...prev, gear: { ...prev.gear, mask: id } })); };
  const handleCustomShieldSelect = (id: string) => { handleConfigUpdate(prev => ({ ...prev, gear: { ...prev.gear, shield: id } })); };

  const onContextualEdit = (cat: AssetCategory, sub: string, currentId?: string, defaultId?: string) => {
     if (!onCreateCustomModel || !onEditCustomModel) return;
     const idToEdit = currentId || defaultId;
     
     if (idToEdit) {
        onEditCustomModel(idToEdit, cat, sub as AssetSubCategory); // Pass context info!
     } else {
        onCreateCustomModel(cat, sub as AssetSubCategory); // Pass context info!
     }
  };

  const handleNextStep = () => { 
      if (currentStep === 1) { 
          if (config.gear.weapon === 'none') { 
              handleConfigUpdate(prev => ({ ...prev, className: '战士', gear: { ...prev.gear, weapon: 'sword_basic', shield: 'shield_round' } })); 
              setWeaponCategory('one_handed'); 
          } 
          setStep(2); 
      } else if (currentStep === 2) { 
          setStep(3); 
      } else {
          onFinish();
      }
  };
  
  const handlePrevStep = () => { 
      if (currentStep === 2) { 
          setStep(1); 
          handleConfigUpdate(prev => ({ ...prev, gear: { ...prev.gear, weapon: 'none', shield: 'none', helm: 'none', mask: 'none' } })); 
      } else if (currentStep === 3) {
          setStep(2);
      }
  };

  const handleActionSelect = (category: 'idle' | 'walk' | 'run' | 'attack', actionId: string) => {
      handleConfigUpdate(prev => ({
          ...prev,
          actionSet: {
              ...prev.actionSet,
              [`${category}Id`]: actionId
          }
      }));
  };

  const handlePartSelect = (id: string) => {
      if (setSelectedPartId) setSelectedPartId(id);
  }

  const EditBtn = ({ cat, sub, id, defaultId }: { cat: AssetCategory, sub: string, id?: string, defaultId?: string }) => (
      <button 
        onClick={() => onContextualEdit(cat, sub, id, defaultId)}
        className="ml-2 w-5 h-5 rounded bg-gray-700 hover:bg-purple-600 text-white flex items-center justify-center transition-colors shadow-lg"
        title="编辑/创建自定义资产"
      >
        <i className="fas fa-pencil-alt text-[9px]"></i>
      </button>
  );

  const PartRow = ({ label, partKey, category, subCategory, transformId, defaultId, icon, showDefault = true }: { label: string, partKey: keyof CharacterConfig, category: AssetCategory, subCategory: string, transformId: string, defaultId?: string, icon?: string, showDefault?: boolean }) => {
      const currentId = config[partKey] as string;
      return (
          <div className="mb-3">
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-2 flex items-center">
                  <span onClick={() => handlePartSelect(transformId)} className="cursor-pointer hover:text-white transition-colors flex items-center gap-1">
                      {icon && <i className={`fas ${icon} text-[10px]`}></i>}
                      {label}
                  </span>
                  <EditBtn cat={category} sub={subCategory} id={currentId} defaultId={defaultId} />
              </label>
              <div className="grid grid-cols-3 gap-2">
                 {showDefault && (
                     <button onClick={() => handleConfigUpdate({...config, [partKey]: undefined})} className={`py-1 text-[10px] rounded border ${!currentId ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>默认/无</button>
                 )}
                 {customModels.filter(m => m.category === category && m.subCategory === subCategory).map(m => {
                     const isNative = isNativeAsset(m.id);
                     return (
                         <button key={m.id} onClick={() => handleConfigUpdate({...config, [partKey]: m.id})} className={`py-1 text-[10px] rounded border truncate px-1 ${currentId === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-purple-600/30 border-purple-500 text-white') : 'bg-gray-800 border-gray-700 text-gray-400'}`}>{m.name}</button>
                     );
                 })}
              </div>
          </div>
      );
  }

  // --- ACTION SELECTOR COMPONENT ---
  const ActionSelector = ({ label, category, currentId }: { label: string, category: ActionCategory, currentId?: string }) => {
      const available = savedProceduralActions.filter(a => a.category === category);
      
      return (
          <div className="mb-4">
              <label className="text-[10px] text-gray-500 uppercase font-semibold mb-2 block">{label}</label>
              <div className="grid grid-cols-2 gap-2">
                  <button 
                      onClick={() => handleActionSelect(category as any, '')}
                      className={`p-2 rounded text-left border text-xs ${!currentId ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                      默认
                  </button>
                  {available.map(act => (
                      <button 
                          key={act.id}
                          onClick={() => handleActionSelect(category as any, act.id)}
                          className={`p-2 rounded text-left border text-xs truncate ${currentId === act.id ? 'bg-purple-600/30 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                      >
                          {act.name}
                      </button>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="w-96 bg-gray-950 border-l border-gray-800 flex flex-col h-full shadow-2xl z-20 relative font-sans flex-shrink-0">
      <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/20"><i className={`fas ${currentStep === 1 ? 'fa-user' : currentStep === 2 ? 'fa-khanda' : 'fa-running'} text-white text-sm`}></i></div>
          <span className="flex-grow">英雄大厅</span>
          <span className="text-xs font-normal text-gray-500 self-end mb-1">步骤 {currentStep}/3</span>
        </h2>
        <div className="w-full h-1 bg-gray-800 mt-4 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(currentStep / 3) * 100}%` }}></div></div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 animate-fade-in relative">
        {currentStep === 1 && (
             <>
                <div className="flex p-1 bg-gray-800 rounded-lg mb-6">
                    <button onClick={() => setActiveBodyTab('head')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeBodyTab === 'head' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>头部构造</button>
                    <button onClick={() => setActiveBodyTab('body')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeBodyTab === 'body' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>躯干与四肢</button>
                </div>
                {activeBodyTab === 'head' && (
                    <div className="animate-fade-in space-y-6">
                        {/* HEAD DIMENSIONS - SIMPLIFIED */}
                        <section className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-2 mb-3 text-gray-400"><i className="fas fa-expand text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">头部大小 (Head Scaling)</h3></div>
                            <div className="space-y-3">
                                <DimensionControl label="整体大小 (Scale)" value={config.dimensions.headScale ?? 1.0} onChange={(v) => updateDimension('headScale', v)} />
                                <div className="text-[10px] text-gray-500 italic mt-2">
                                    <i className="fas fa-info-circle mr-1"></i>
                                    头部大小已固定，不受身体缩放影响。
                                </div>
                            </div>
                        </section>

                        <section>
                             <div className="flex items-center gap-2 mb-2 text-gray-400"><i className="fas fa-cube text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">头型 (Head Shape)</h3><EditBtn cat="character_part" sub="head" id={config.headStyle} defaultId="box" /></div>
                             <div className="grid grid-cols-2 gap-2">
                                {customModels.filter(m => m.category === 'character_part' && m.subCategory === 'head').map(m => {
                                    const isNative = isNativeAsset(m.id);
                                    return (
                                        <button key={m.id} onClick={() => handleConfigUpdate({...config, headStyle: m.id})} className={`py-1 text-xs rounded border ${config.headStyle === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-purple-600/30 border-purple-500 text-white') : 'bg-gray-800 border-gray-700 text-gray-400'}`}>{m.name}</button>
                                    );
                                })}
                             </div>
                        </section>
                        <section>
                            <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-smile text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">五官 & 发型</h3></div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><label className="text-[10px] text-gray-500 uppercase font-semibold mb-2 flex items-center">眼睛 <EditBtn cat="character_part" sub="eye" id={config.eyeStyle} defaultId="dot" /></label>
                                    <div className="flex gap-2 flex-wrap">
                                        {/* Default Eye Option */}
                                         <button onClick={() => handleConfigUpdate({...config, eyeStyle: 'dot'})} className={`w-8 h-8 rounded border flex items-center justify-center text-[8px] overflow-hidden ${config.eyeStyle === 'dot' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`} title="默认">●</button>
                                        
                                        {customModels.filter(m => m.category === 'character_part' && m.subCategory === 'eye').map(m => {
                                            const isNative = isNativeAsset(m.id);
                                            return (
                                                <button key={m.id} onClick={() => handleConfigUpdate({...config, eyeStyle: m.id})} className={`w-8 h-8 rounded border flex items-center justify-center text-[8px] overflow-hidden ${config.eyeStyle === m.id ? (isNative ? 'bg-blue-600 border-blue-500 text-white' : 'bg-purple-600 border-purple-500 text-white') : 'bg-gray-800 border-gray-700 text-gray-500'}`} title={m.name}>★</button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-semibold mb-2 flex items-center">嘴巴 <EditBtn cat="character_part" sub="mouth" id={config.mouthStyle} defaultId="smile" /></label>
                                    <div className="flex gap-2 flex-wrap">
                                         {/* Default Mouth Option */}
                                         <button onClick={() => handleConfigUpdate({...config, mouthStyle: 'smile'})} className={`w-8 h-8 rounded border flex items-center justify-center text-[8px] overflow-hidden ${config.mouthStyle === 'smile' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`} title="默认">︶</button>
                                        
                                        {customModels.filter(m => m.category === 'character_part' && m.subCategory === 'mouth').map(m => {
                                            const isNative = isNativeAsset(m.id);
                                            return (
                                                <button key={m.id} onClick={() => handleConfigUpdate({...config, mouthStyle: m.id})} className={`w-8 h-8 rounded border flex items-center justify-center text-[8px] overflow-hidden ${config.mouthStyle === m.id ? (isNative ? 'bg-blue-600 border-blue-500 text-white' : 'bg-purple-600 border-purple-500 text-white') : 'bg-gray-800 border-gray-700 text-gray-500'}`} title={m.name}>★</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4"><div className="flex justify-between items-end mb-2"><label className="text-[10px] text-gray-500 uppercase font-semibold flex items-center">发型 <EditBtn cat="character_part" sub="hair" id={config.hairStyle} defaultId="flat" /></label><input type="color" value={config.hairColor} onChange={(e) => updateColor('hairColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-gray-700 p-0 bg-transparent" title="发色" /></div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => handleConfigUpdate({...config, hairStyle: 'bald'})} className={`py-2 rounded border text-[10px] truncate ${config.hairStyle === 'bald' ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>光头/默认</button>
                                    {customModels.filter(m => m.category === 'character_part' && m.subCategory === 'hair').map(m => {
                                        const isNative = isNativeAsset(m.id);
                                        return (
                                            <button key={m.id} onClick={() => handleConfigUpdate({...config, hairStyle: m.id})} className={`py-2 rounded border text-[10px] truncate ${config.hairStyle === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500 text-blue-200' : 'bg-purple-600/30 border-purple-500 text-purple-200') : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{m.name}</button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-4"><div className="flex justify-between items-end mb-2"><label className="text-[10px] text-gray-500 uppercase font-semibold block">肤色</label></div><div className="flex items-center gap-3 bg-gray-800 p-2 rounded"><input type="color" value={config.skinColor} onChange={(e) => updateColor('skinColor', e.target.value)} className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-700 p-0" /><span className="text-xs text-gray-300">{config.skinColor}</span></div></div>
                        </section>
                    </div>
                )}
                {activeBodyTab === 'body' && (
                    <div className="animate-fade-in space-y-6">
                        {/* BODY DIMENSIONS */}
                        <section className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                            <div className="flex items-center gap-2 mb-3 text-gray-400"><i className="fas fa-arrows-alt-v text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">体型缩放 (Body Scaling)</h3></div>
                            <div className="space-y-3">
                                <DimensionControl label="整体体型 (Body Scale)" value={config.dimensions.bodyScale ?? 1.0} onChange={(v) => updateDimension('bodyScale', v)} />
                                <div className="grid grid-cols-2 gap-3">
                                    <DimensionControl label="身高拉伸 (Height)" value={config.dimensions.bodyHeight ?? 1.0} onChange={(v) => updateDimension('bodyHeight', v)} />
                                    <DimensionControl label="体宽拉伸 (Width)" value={config.dimensions.bodyWidth ?? 1.0} onChange={(v) => updateDimension('bodyWidth', v)} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="text-center bg-gray-800 p-2 rounded"><input type="color" value={config.bodyColor} onChange={(e) => updateColor('bodyColor', e.target.value)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-700 p-0" /><span className="text-[10px] text-gray-500 mt-2 block">身躯</span></div>
                                <div className="text-center bg-gray-800 p-2 rounded"><input type="color" value={config.limbColor} onChange={(e) => updateColor('limbColor', e.target.value)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-gray-700 p-0" /><span className="text-[10px] text-gray-500 mt-2 block">四肢</span></div>
                            </div>
                        </section>

                        <section className="border-t border-gray-800 pt-6">
                             <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-cubes text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">躯干构造 (Torso)</h3></div>
                             <PartRow label="胸腔 (Chest)" partKey="chestStyle" category="character_part" subCategory="chest" transformId="chest" defaultId="chest_default" icon="fa-cube" showDefault={false} />
                             <PartRow label="髋部 (Hips)" partKey="hipsStyle" category="character_part" subCategory="hips" transformId="hips" defaultId="hips_default" icon="fa-layer-group" showDefault={false} />
                        </section>
                        
                        <section className="border-t border-gray-800 pt-6">
                             <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-hand-rock text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">手臂构造 (Arms)</h3></div>
                             <div className="flex gap-2 mb-2 bg-gray-800/50 p-2 rounded">
                                 <button onClick={() => handlePartSelect('arm_left')} className={`flex-1 py-1 text-[9px] rounded ${selectedPartId?.includes('left') ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Left</button>
                                 <button onClick={() => handlePartSelect('arm_right')} className={`flex-1 py-1 text-[9px] rounded ${selectedPartId?.includes('right') ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Right</button>
                             </div>
                             <PartRow label="大臂 (Upper Arm)" partKey="upperArmStyle" category="character_part" subCategory="upper_arm" transformId="arm_left" defaultId="arm_default" icon="fa-dumbbell" showDefault={false} />
                             <PartRow label="小臂 (Forearm)" partKey="forearmStyle" category="character_part" subCategory="forearm" transformId="forearm_left" defaultId="forearm_default" icon="fa-fist-raised" showDefault={false} />
                             <PartRow label="手掌 (Hand)" partKey="handStyle" category="character_part" subCategory="hand" transformId="hand_left" defaultId="hand_default" icon="fa-hand-paper" showDefault={false} />
                        </section>

                        <section className="border-t border-gray-800 pt-6">
                             <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-shoe-prints text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">腿部构造 (Legs)</h3></div>
                             <PartRow label="大腿 (Thigh)" partKey="thighStyle" category="character_part" subCategory="thigh" transformId="thigh_left" defaultId="thigh_default" icon="fa-running" showDefault={false} />
                             <PartRow label="小腿 (Calf)" partKey="calfStyle" category="character_part" subCategory="calf" transformId="calf_left" defaultId="calf_default" icon="fa-walking" showDefault={false} />
                             <PartRow label="脚掌 (Foot)" partKey="footStyle" category="character_part" subCategory="foot" transformId="foot_left" defaultId="foot_default" icon="fa-shoe-prints" showDefault={false} />
                        </section>
                    </div>
                )}
            </>
        )}
        {currentStep === 2 && (
            <>
                 <section>
                    <div className="flex p-1 bg-gray-800 rounded-lg mb-6"><button onClick={() => switchCategory('one_handed')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${weaponCategory === 'one_handed' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>单手武器</button><button onClick={() => switchCategory('two_handed')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${weaponCategory === 'two_handed' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>双手武器</button></div>
                    <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-hammer text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">选择武器</h3><EditBtn cat="weapon" sub={weaponCategory} id={config.gear.weapon} /></div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {/* No Weapon Option */}
                        <button 
                             onClick={() => handleConfigUpdate({...config, gear: {...config.gear, weapon: 'none'}})} 
                             className={`w-full p-3 rounded-xl border text-left transition-all ${config.gear.weapon === 'none' ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                        >
                             <div className="text-sm font-bold truncate">无 (None)</div>
                             <div className="text-[10px] opacity-70">空手</div>
                        </button>
                        {customModels.filter(m => m.category === 'weapon' && m.subCategory === weaponCategory).map(m => {
                             const isNative = isNativeAsset(m.id);
                             return (
                                 <button key={m.id} onClick={() => handleWeaponSelect(m.id)} className={`w-full p-3 rounded-xl border text-left transition-all ${config.gear.weapon === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500 text-white' : 'bg-purple-600/30 border-purple-500 text-white') : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                    <div className="text-sm font-bold truncate pr-6">{m.name}</div>
                                    <div className="text-[10px] opacity-70">{isNative ? '系统默认' : '自定义'}</div>
                                 </button>
                             );
                        })}
                    </div>
                 </section>
                 {(weaponCategory === 'one_handed' || weaponCategory === 'custom') && (
                     <section className="animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-shield-alt text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">副手盾牌</h3><EditBtn cat="shield" sub="shield" id={config.gear.shield} /></div>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => handleConfigUpdate(p => ({...p, gear: {...p.gear, shield: 'none'}}))} className={`py-2 border rounded text-xs ${config.gear.shield === 'none' ? 'bg-blue-600/30 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>无</button>
                             {customModels.filter(m => m.category === 'shield').map(m => {
                                 const isNative = isNativeAsset(m.id);
                                 return (<button key={m.id} onClick={() => handleCustomShieldSelect(m.id)} className={`w-full py-2 border rounded text-xs ${config.gear.shield === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500' : 'bg-purple-600/30 border-purple-500') : 'bg-gray-800 border-gray-700 text-gray-300'}`}>{m.name}</button>);
                             })}
                        </div>
                     </section>
                 )}
                 <section className="mt-6">
                    <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-hard-hat text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">头部与面饰</h3></div>
                    
                    {/* Headwear */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] text-gray-500 font-bold uppercase">头饰风格 (Headwear)</span>
                             <EditBtn cat="helm" sub="helm" id={config.gear.helm} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleConfigUpdate(p => ({...p, gear: {...p.gear, helm: 'none'}}))} className={`py-2 border rounded text-xs ${config.gear.helm === 'none' ? 'bg-blue-600/30 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>无</button>
                            {customModels.filter(m => m.category === 'helm').map(m => {
                                const isNative = isNativeAsset(m.id);
                                return (<button key={m.id} onClick={() => handleCustomHelmSelect(m.id)} className={`w-full py-2 border rounded text-xs ${config.gear.helm === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500' : 'bg-purple-600/30 border-purple-500') : 'bg-gray-800 border-gray-700 text-gray-300'}`}>{m.name}</button>);
                            })}
                        </div>
                    </div>

                    {/* Face Accessory */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] text-gray-500 font-bold uppercase">面部饰品 (Face Accessory)</span>
                             <EditBtn cat="mask" sub="mask" id={config.gear.mask} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleConfigUpdate(p => ({...p, gear: {...p.gear, mask: 'none'}}))} className={`py-2 border rounded text-xs ${config.gear.mask === 'none' ? 'bg-blue-600/30 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>无</button>
                            {customModels.filter(m => m.category === 'mask').map(m => {
                                const isNative = isNativeAsset(m.id);
                                return (<button key={m.id} onClick={() => handleCustomMaskSelect(m.id)} className={`w-full py-2 border rounded text-xs ${config.gear.mask === m.id ? (isNative ? 'bg-blue-600/30 border-blue-500' : 'bg-purple-600/30 border-purple-500') : 'bg-gray-800 border-gray-700 text-gray-300'}`}>{m.name}</button>);
                            })}
                        </div>
                    </div>
                 </section>
            </>
        )}
        {currentStep === 3 && (
            <div className="animate-fade-in space-y-6">
                <section>
                    <div className="flex items-center gap-2 mb-4 text-gray-400"><i className="fas fa-running text-xs"></i><h3 className="text-xs font-bold uppercase tracking-widest">动作风格 (Motion Style)</h3></div>
                    <p className="text-[10px] text-gray-500 mb-4">为您的角色配置独特的运动和战斗风格。您可以从“演武场”中创建更多自定义风格。</p>
                    
                    <ActionSelector label="待机 (Idle)" category="idle" currentId={config.actionSet?.idleId} />
                    <ActionSelector label="行走 (Walk)" category="walk" currentId={config.actionSet?.walkId} />
                    <ActionSelector label="奔跑 (Run)" category="run" currentId={config.actionSet?.runId} />
                    <ActionSelector label="攻击 (Attack)" category="attack" currentId={config.actionSet?.attackId} />
                </section>
            </div>
        )}
      </div>
      <div className="p-6 bg-gray-900 border-t border-gray-800 flex gap-3 relative">
        {currentStep > 1 && (<button onClick={handlePrevStep} className="w-1/3 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold text-sm rounded-xl transition-all">上一步</button>)}
        <button onClick={() => { if (currentStep < 3) handleNextStep(); else onFinish(); }} className="flex-grow py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-widest uppercase rounded-xl shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]">{currentStep === 1 ? '下一步: 选择武器' : currentStep === 2 ? '下一步: 动作调优' : '确定角色'} <i className={`fas ${currentStep < 3 ? 'fa-arrow-right' : 'fa-check'}`}></i></button>
      </div>
    </div>
  );
};
