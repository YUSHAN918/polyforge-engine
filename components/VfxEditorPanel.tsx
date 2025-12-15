
import React, { useState, useEffect, useRef } from 'react';
import { VfxAsset, VfxEmitterConfig, VfxShape, CustomModel, VfxTestParams, VfxBindingMap, VfxType } from '../types';
import { generateVfxConfig } from '../services/geminiService';

interface VfxEditorPanelProps {
    vfxAssets: VfxAsset[];
    setVfxAssets: React.Dispatch<React.SetStateAction<VfxAsset[]>>;
    onExit: () => void;
    customModels: CustomModel[];
    // Shared State Control
    currentVfxAssetId: string | null;
    setCurrentVfxAssetId: (id: string | null) => void;
    testParams: VfxTestParams;
    setTestParams: React.Dispatch<React.SetStateAction<VfxTestParams>>;
    
    // NEW: Actions
    onBindVfx: (modelId: string, slot: 'equip' | 'projectile' | 'impact', vfxId: string) => void;
    onDeleteVfx: (vfxId: string) => void;

    // NEW: Gizmo Support Props
    selectedEmitterId: string | null;
    setSelectedEmitterId: (id: string | null) => void;
    onUpdateEmitter?: (emitterId: string, updates: Partial<VfxEmitterConfig>) => void;
}

export const VfxEditorPanel: React.FC<VfxEditorPanelProps> = ({ 
    vfxAssets, setVfxAssets, onExit, customModels,
    currentVfxAssetId, setCurrentVfxAssetId, testParams, setTestParams,
    onBindVfx, onDeleteVfx,
    selectedEmitterId, setSelectedEmitterId, onUpdateEmitter
}) => {
    const [bindSlot, setBindSlot] = useState<'equip' | 'projectile' | 'impact'>('equip');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [bindFeedback, setBindFeedback] = useState(false); // Visual feedback state
    
    // Multi-select State
    const [multiSelectedEmitterIds, setMultiSelectedEmitterIds] = useState<Set<string>>(new Set());

    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const singleFileRef = useRef<HTMLInputElement>(null);

    // Auto-create initial asset if none
    useEffect(() => {
        if (vfxAssets.length === 0) {
            handleCreateAsset();
        } else if (!currentVfxAssetId && vfxAssets.length > 0) {
            setCurrentVfxAssetId(vfxAssets[0].id);
        }
    }, []);

    // Sync multi-select with single select
    useEffect(() => {
        if (selectedEmitterId) {
            if (!multiSelectedEmitterIds.has(selectedEmitterId)) {
                setMultiSelectedEmitterIds(new Set([selectedEmitterId]));
            }
        } else {
            if (multiSelectedEmitterIds.size === 1) setMultiSelectedEmitterIds(new Set());
        }
    }, [selectedEmitterId]);

    const currentAsset = vfxAssets.find(a => a.id === currentVfxAssetId);
    const currentEmitter = currentAsset?.emitters.find(e => e.id === selectedEmitterId);

    const handleCreateAsset = () => {
        const newId = `vfx_${Math.random().toString(36).substr(2, 9)}`;
        const newAsset: VfxAsset = {
            id: newId,
            name: 'New Effect',
            type: 'continuous',
            emitters: []
        };
        setVfxAssets(prev => [...prev, newAsset]);
        setCurrentVfxAssetId(newId);
        handleAddEmitter(newId); // Auto add one emitter
    };

    const handleDuplicateAsset = () => {
        if (!currentAsset) return;
        const newId = `vfx_${Math.random().toString(36).substr(2, 9)}`;
        const clone: VfxAsset = {
            ...JSON.parse(JSON.stringify(currentAsset)),
            id: newId,
            name: `${currentAsset.name} (Copy)`
        };
        // Regenerate emitter IDs
        clone.emitters = clone.emitters.map(e => ({
            ...e,
            id: `emit_${Math.random().toString(36).substr(2, 5)}`
        }));
        
        setVfxAssets(prev => [...prev, clone]);
        setCurrentVfxAssetId(newId);
    };

    const handleDeleteAsset = () => {
        if (!currentVfxAssetId) return;
        onDeleteVfx(currentVfxAssetId);
        setCurrentVfxAssetId(null);
        setShowDeleteConfirm(false);
    };

    const handleAddEmitter = (assetId: string) => {
        setVfxAssets(prev => prev.map(a => {
            if (a.id === assetId) {
                const newEmitter: VfxEmitterConfig = {
                    id: `emit_${Math.random().toString(36).substr(2, 5)}`,
                    name: `Emitter ${a.emitters.length + 1}`,
                    enabled: true,
                    shape: 'box',
                    colorStart: '#ffaa00',
                    colorEnd: '#ff0000',
                    opacity: 0.8,
                    opacityEnd: 0, // Default fade out
                    blending: 'normal',
                    rate: 20,
                    burstCount: 20,
                    lifetime: 1.0,
                    sizeStart: 0.2,
                    sizeEnd: 0.0,
                    speed: 2.0,
                    spread: 0.2,
                    gravity: 0,
                    offset: [0, 0, 0],
                    followParent: false,
                    rotationSpeed: 0,
                    turbulence: 0,
                    delay: 0
                };
                return { ...a, emitters: [...a.emitters, newEmitter] };
            }
            return a;
        }));
    };

    // Update Emitter (Handles Multi-select)
    const updateEmitter = (key: keyof VfxEmitterConfig, value: any) => {
        if (!currentVfxAssetId) return;
        
        // If single selection via Gizmo logic
        if (selectedEmitterId && onUpdateEmitter && multiSelectedEmitterIds.size <= 1) {
             onUpdateEmitter(selectedEmitterId, { [key]: value });
             return;
        }

        // Multi-edit
        setVfxAssets(prev => prev.map(a => {
            if (a.id === currentVfxAssetId) {
                return {
                    ...a,
                    emitters: a.emitters.map(e => multiSelectedEmitterIds.has(e.id) ? { ...e, [key]: value } : e)
                };
            }
            return a;
        }));
    };

    const handleDeleteEmitter = (emitterId: string) => {
        if (!currentVfxAssetId) return;
        setVfxAssets(prev => prev.map(a => {
            if (a.id === currentVfxAssetId) {
                return { ...a, emitters: a.emitters.filter(e => e.id !== emitterId) };
            }
            return a;
        }));
        if (selectedEmitterId === emitterId) setSelectedEmitterId(null);
        setMultiSelectedEmitterIds(prev => { const n = new Set(prev); n.delete(emitterId); return n; });
    };

    const toggleEmitterVisibility = (emitterId: string, current: boolean) => {
        if (!currentVfxAssetId) return;
        setVfxAssets(prev => prev.map(a => {
            if (a.id === currentVfxAssetId) {
                return {
                    ...a,
                    emitters: a.emitters.map(e => e.id === emitterId ? { ...e, enabled: !current } : e)
                };
            }
            return a;
        }));
    };

    const updateAssetType = (type: VfxType) => {
        if (!currentVfxAssetId) return;
        setVfxAssets(prev => prev.map(a => a.id === currentVfxAssetId ? { ...a, type } : a));
    };

    const handleBind = () => {
        if (!currentVfxAssetId || !testParams.referenceModelId) {
            alert("请选择一个参考模型来绑定此特效！");
            return;
        }
        
        onBindVfx(testParams.referenceModelId, bindSlot, currentVfxAssetId);
        setBindFeedback(true);
        setTimeout(() => setBindFeedback(false), 2000);
    };

    const togglePlay = () => {
        if (currentAsset?.type === 'burst') {
            triggerBurst();
        } else {
            setTestParams(p => ({ ...p, isPlaying: !p.isPlaying }));
        }
    };

    const triggerBurst = () => {
        setTestParams(p => ({ ...p, isPlaying: false }));
        setTimeout(() => setTestParams(p => ({ ...p, isPlaying: true })), 50);
    };

    // --- SELECTION LOGIC ---
    const handleSelectEmitter = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentAsset) return;

        let newSet = new Set(multiSelectedEmitterIds);

        if (e.shiftKey && selectedEmitterId) {
            const startIdx = currentAsset.emitters.findIndex(em => em.id === selectedEmitterId);
            const endIdx = currentAsset.emitters.findIndex(em => em.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const min = Math.min(startIdx, endIdx);
                const max = Math.max(startIdx, endIdx);
                for (let i = min; i <= max; i++) newSet.add(currentAsset.emitters[i].id);
            }
        } else if (e.ctrlKey || e.metaKey) {
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedEmitterId(id);
        } else {
            newSet = new Set([id]);
            setSelectedEmitterId(id);
        }
        setMultiSelectedEmitterIds(newSet);
    };

    // --- GROUP LOGIC ---
    const handleGroup = () => {
        if (!currentVfxAssetId || multiSelectedEmitterIds.size < 2) return;
        const groupId = `grp_${Math.random().toString(36).substr(2, 5)}`;
        setVfxAssets(prev => prev.map(a => {
            if (a.id === currentVfxAssetId) {
                return {
                    ...a,
                    emitters: a.emitters.map(e => multiSelectedEmitterIds.has(e.id) ? { ...e, groupId } : e)
                };
            }
            return a;
        }));
    };

    const handleUngroup = () => {
        if (!currentVfxAssetId || multiSelectedEmitterIds.size === 0) return;
        setVfxAssets(prev => prev.map(a => {
            if (a.id === currentVfxAssetId) {
                return {
                    ...a,
                    emitters: a.emitters.map(e => multiSelectedEmitterIds.has(e.id) ? { ...e, groupId: undefined } : e)
                };
            }
            return a;
        }));
    };

    const handleSelectGroup = (groupId: string) => {
        if (!currentAsset) return;
        const peers = currentAsset.emitters.filter(e => e.groupId === groupId);
        const newSet = new Set(peers.map(e => e.id));
        setMultiSelectedEmitterIds(newSet);
        if (peers.length > 0) setSelectedEmitterId(peers[0].id);
    };

    // --- AI GENERATION ---
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        const vfx = await generateVfxConfig(aiPrompt);
        if (vfx) {
            setVfxAssets(prev => [...prev, vfx]);
            setCurrentVfxAssetId(vfx.id);
            setShowAiModal(false);
            setAiPrompt('');
        } else {
            alert("生成失败，请重试。");
        }
        setIsGenerating(false);
    };

    // --- IMPORT / EXPORT LOGIC ---
    const handleExportLibrary = () => {
        const json = JSON.stringify(vfxAssets, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vfx_library_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                if (Array.isArray(json)) {
                    setVfxAssets(prev => {
                        const newAssets = [...prev];
                        json.forEach((imported: VfxAsset) => {
                            if (!newAssets.find(a => a.id === imported.id)) {
                                newAssets.push(imported);
                            }
                        });
                        return newAssets;
                    });
                    alert(`导入成功！`);
                } else {
                    alert("无效的文件格式");
                }
            } catch (err) {
                alert("导入失败");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportSingle = () => {
        if (!currentAsset) return;
        const json = JSON.stringify(currentAsset, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAsset.name.replace(/\s+/g, '_')}_vfx.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportSingle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                if (json.id && json.emitters) {
                    setVfxAssets(prev => {
                        const exists = prev.find(a => a.id === json.id);
                        if (exists) {
                            return prev.map(a => a.id === json.id ? json : a); // Update
                        } else {
                            return [...prev, json]; // Add
                        }
                    });
                    setCurrentVfxAssetId(json.id);
                    alert("导入成功！");
                } else {
                    alert("无效的特效文件");
                }
            } catch (err) {
                alert("导入失败");
            }
        };
        reader.readAsText(file);
        if (singleFileRef.current) singleFileRef.current.value = '';
    };

    const multiCount = multiSelectedEmitterIds.size;

    return (
        <div className="absolute inset-0 z-20 flex text-white font-sans pointer-events-none">
            
            {/* LEFT: ASSET LIST */}
            <div className="w-64 border-r border-gray-800 flex flex-col bg-gray-950/95 backdrop-blur pointer-events-auto">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="font-bold text-lg"><i className="fas fa-magic text-purple-500 mr-2"></i> 特效库</h2>
                    <button onClick={onExit} className="text-gray-500 hover:text-white"><i className="fas fa-times"></i></button>
                </div>
                
                {/* AI Button */}
                <div className="p-2">
                    <button onClick={() => setShowAiModal(true)} className="w-full py-1.5 bg-gradient-to-r from-purple-900 to-blue-900 hover:brightness-125 rounded border border-purple-500/50 text-xs font-bold text-purple-200 flex items-center justify-center gap-2">
                        <i className="fas fa-sparkles"></i> AI 灵感生成
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                    {vfxAssets.map(asset => (
                        <div 
                            key={asset.id} 
                            onClick={() => { setCurrentVfxAssetId(asset.id); setSelectedEmitterId(null); setMultiSelectedEmitterIds(new Set()); }}
                            className={`p-3 rounded border cursor-pointer flex justify-between items-center group ${currentVfxAssetId === asset.id ? 'bg-purple-900/50 border-purple-500' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                        >
                            <div>
                                <div className="font-bold text-sm truncate w-32">{asset.name}</div>
                                <div className="text-[10px] text-gray-400">{asset.type === 'burst' ? '💥 Burst' : '🔄 Loop'} • {asset.emitters.length} Emitters</div>
                            </div>
                            
                            <div className="flex gap-2">
                                {currentVfxAssetId === asset.id && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDuplicateAsset(); }}
                                        className="text-gray-500 hover:text-white transition-opacity"
                                        title="复制特效"
                                    >
                                        <i className="fas fa-copy text-xs"></i>
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setCurrentVfxAssetId(asset.id); setShowDeleteConfirm(true); }}
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-800 space-y-2">
                    <button onClick={handleCreateAsset} className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded font-bold text-xs"><i className="fas fa-plus"></i> 新建特效</button>
                    
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImportLibrary} accept=".json" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 rounded text-[10px]" title="导入库">导入库</button>
                        <button onClick={handleExportLibrary} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 rounded text-[10px]" title="导出库">导出库</button>
                    </div>
                </div>
            </div>

            {/* DELETE MODAL */}
            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                    <div className="bg-gray-900 border border-red-900 p-6 rounded-xl shadow-2xl max-w-sm w-full">
                        <h3 className="text-lg font-bold text-red-400 mb-2">删除特效</h3>
                        <p className="text-gray-300 text-sm mb-6">确定要删除 "{currentAsset?.name}" 吗？此操作无法撤销。</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-800 rounded text-xs hover:bg-gray-700">取消</button>
                            <button onClick={handleDeleteAsset} className="px-4 py-2 bg-red-600 rounded text-xs font-bold hover:bg-red-500">确认删除</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI MODAL */}
            {showAiModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto animate-fade-in">
                    <div className="bg-gray-900 border border-purple-500/50 p-6 rounded-xl shadow-2xl max-w-md w-full">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><i className="fas fa-magic text-purple-400"></i> AI 特效生成器</h3>
                        <p className="text-gray-400 text-xs mb-4">描述你想要的特效，AI 将尝试为你构建配置。</p>
                        <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="例如：一个螺旋上升的蓝色火焰..."
                            className="w-full h-24 bg-gray-800 border border-gray-600 rounded p-2 text-white text-xs mb-4 focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowAiModal(false)} className="px-4 py-2 bg-gray-800 rounded text-xs hover:bg-gray-700">取消</button>
                            <button onClick={handleAiGenerate} disabled={isGenerating || !aiPrompt.trim()} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded text-xs font-bold hover:brightness-110 text-white flex items-center gap-2">
                                {isGenerating ? '生成中...' : <><i className="fas fa-sparkles"></i> 生成</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CENTER: CONTROLS (Floating) */}
            <div className="flex-grow relative pointer-events-none">
                <div className="absolute top-4 left-4 z-10 flex gap-4 pointer-events-auto">
                    <div className="bg-gray-900/80 p-2 rounded border border-gray-700 shadow-xl">
                        <label className="text-[10px] text-gray-400 block mb-1 font-bold">参考模型 (Ref Model)</label>
                        <select 
                            value={testParams.referenceModelId || ''} 
                            onChange={(e) => setTestParams(p => ({ ...p, referenceModelId: e.target.value }))} 
                            className="bg-gray-800 border border-gray-600 rounded text-xs px-2 py-1 text-white w-40 outline-none"
                        >
                            <option value="">-- 无 --</option>
                            {customModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 pointer-events-auto">
                    {/* Dynamic Player Control */}
                    {bindSlot !== 'projectile' && (
                        <div className="flex items-center gap-2 bg-gray-900/90 p-2 rounded-full border border-gray-600 shadow-xl">
                            {bindSlot === 'impact' ? (
                                <button 
                                    onClick={triggerBurst}
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg active:scale-95"
                                    title="触发打击"
                                >
                                    <i className="fas fa-bomb"></i>
                                </button>
                            ) : (
                                <button 
                                    onClick={togglePlay}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${testParams.isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}
                                    title={testParams.isPlaying ? "暂停" : "播放"}
                                >
                                    <i className={`fas ${testParams.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Binding & Testing */}
                    <div className="flex gap-2 bg-gray-900/90 p-3 rounded-xl border border-gray-700 shadow-xl items-end">
                        
                        {/* Contextual Test Button */}
                        {bindSlot === 'projectile' && (
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1 font-bold">测试弹道</label>
                                <button 
                                    onClick={() => setTestParams(p => ({ ...p, isProjectileTesting: !p.isProjectileTesting }))} 
                                    className={`px-4 py-1.5 rounded font-bold text-xs border border-transparent transition-all ${testParams.isProjectileTesting ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {testParams.isProjectileTesting ? '停止模拟' : '🚀 模拟发射'}
                                </button>
                            </div>
                        )}
                        
                        {(bindSlot === 'projectile') && <div className="w-px h-8 bg-gray-700 mx-1"></div>}

                        <div>
                            <label className="text-[10px] text-gray-400 block mb-1 font-bold">绑定插槽 (Slot)</label>
                            <div className="flex bg-gray-800 rounded p-0.5">
                                <button onClick={() => setBindSlot('equip')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${bindSlot==='equip' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>装备</button>
                                <button onClick={() => setBindSlot('projectile')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${bindSlot==='projectile' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>弹道</button>
                                <button onClick={() => setBindSlot('impact')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${bindSlot==='impact' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>打击</button>
                            </div>
                        </div>
                        <button 
                            onClick={handleBind} 
                            disabled={bindFeedback}
                            className={`px-4 py-1.5 rounded font-bold text-xs h-fit mb-0.5 shadow-lg transition-all flex items-center gap-1 ${bindFeedback ? 'bg-green-600 text-white scale-105' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                        >
                            {bindFeedback ? <><i className="fas fa-check"></i> 已绑定！</> : <><i className="fas fa-save"></i> 保存绑定</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: INSPECTOR */}
            <div className="w-80 border-l border-gray-800 flex flex-col bg-gray-950/95 backdrop-blur pointer-events-auto">
                {currentAsset ? (
                    <>
                        {/* Header & Type */}
                        <div className="p-4 border-b border-gray-800 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-grow mr-2">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">特效名称</label>
                                    <input 
                                        value={currentAsset.name} 
                                        onChange={(e) => setVfxAssets(prev => prev.map(a => a.id === currentAsset.id ? {...a, name: e.target.value} : a))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 mt-4">
                                    <input type="file" ref={singleFileRef} onChange={handleImportSingle} accept=".json" className="hidden" />
                                    <button onClick={handleExportSingle} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-gray-400 hover:text-white" title="导出此特效"><i className="fas fa-file-export text-xs"></i></button>
                                    <button onClick={() => singleFileRef.current?.click()} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-gray-400 hover:text-white" title="导入覆盖"><i className="fas fa-file-import text-xs"></i></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">播放类型</label>
                                <div className="flex bg-gray-800 rounded p-1 mt-1 border border-gray-700">
                                    <button onClick={() => updateAssetType('continuous')} className={`flex-1 py-1 rounded text-xs font-bold ${currentAsset.type === 'continuous' ? 'bg-blue-600 text-white shadow' : 'text-gray-400'}`}>持续循环</button>
                                    <button onClick={() => updateAssetType('burst')} className={`flex-1 py-1 rounded text-xs font-bold ${currentAsset.type === 'burst' ? 'bg-orange-600 text-white shadow' : 'text-gray-400'}`}>单次爆发</button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Emitter List (Updated Layer Controls) */}
                        <div className="p-2 bg-gray-900 border-b border-gray-800 max-h-40 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <span className="text-xs font-bold text-gray-400">发射器图层 ({currentAsset.emitters.length}) <span className="text-[9px] text-gray-600 font-normal">多选: Shift/Ctrl</span></span>
                                <button onClick={() => handleAddEmitter(currentAsset.id)} className="text-purple-400 hover:text-purple-300 text-xs bg-purple-900/30 px-2 py-1 rounded border border-purple-800"><i className="fas fa-plus"></i> 添加</button>
                            </div>
                            
                            {/* Grouping Tools */}
                            <div className="flex gap-1 mb-2 px-2">
                                <button onClick={handleGroup} disabled={multiCount < 2} className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-[9px] text-gray-300 border border-gray-700 rounded">编组</button>
                                <button onClick={handleUngroup} disabled={multiCount === 0} className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-[9px] text-gray-300 border border-gray-700 rounded">解组</button>
                            </div>

                            <div className="space-y-1">
                                {currentAsset.emitters.map(emit => (
                                    <div 
                                        key={emit.id} 
                                        onClick={(e) => handleSelectEmitter(emit.id, e)}
                                        className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer border ${multiSelectedEmitterIds.has(emit.id) ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-gray-800 border-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: emit.colorStart}}></div>
                                            <span className="truncate">{emit.groupId ? '[G] ' : ''}{emit.name}</span>
                                            {emit.groupId && (
                                                <button onClick={(e) => { e.stopPropagation(); handleSelectGroup(emit.groupId!); }} className="text-[8px] bg-gray-700 px-1 rounded text-gray-400 hover:text-white" title="选中整组">GRP</button>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                            {/* Visibility Toggle */}
                                            <button 
                                                onClick={() => toggleEmitterVisibility(emit.id, emit.enabled)}
                                                className={`hover:text-white ${emit.enabled ? 'text-gray-400' : 'text-gray-600'}`}
                                                title={emit.enabled ? "隐藏" : "显示"}
                                            >
                                                <i className={`fas ${emit.enabled ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                            </button>
                                            {/* Delete */}
                                            <button 
                                                onClick={() => handleDeleteEmitter(emit.id)}
                                                className="text-gray-600 hover:text-red-500"
                                                title="删除图层"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Parameters (Updated with Opacity/Blending) */}
                        {currentEmitter || multiCount > 0 ? (
                            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {multiCount > 1 && (
                                    <div className="text-center text-xs text-purple-400 bg-purple-900/20 p-2 rounded border border-purple-800/50 mb-2">
                                        正在编辑 {multiCount} 个图层
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">粒子形状</label>
                                    <div className="grid grid-cols-4 gap-1 mt-1">
                                        {['box', 'sphere', 'plane', 'tetrahedron'].map(s => (
                                            <button key={s} onClick={() => updateEmitter('shape', s)} className={`py-1 text-[10px] border rounded ${(currentEmitter?.shape === s && multiCount <= 1) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-700 text-gray-400 bg-gray-800'}`}>{s}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Appearance Group */}
                                <div className="space-y-2 bg-gray-800/50 p-2 rounded border border-gray-800">
                                    <label className="text-[10px] text-gray-500 font-bold">外观设置</label>
                                    
                                    {/* Colors */}
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-[9px] text-gray-500 block mb-1">开始颜色</label>
                                            <div className="flex items-center bg-gray-800 rounded border border-gray-700 p-1">
                                                <input type="color" value={currentEmitter?.colorStart || '#ffffff'} onChange={(e) => updateEmitter('colorStart', e.target.value)} className="w-full h-4 bg-transparent border-none cursor-pointer"/>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[9px] text-gray-500 block mb-1">结束颜色</label>
                                            <div className="flex items-center bg-gray-800 rounded border border-gray-700 p-1">
                                                <input type="color" value={currentEmitter?.colorEnd || '#ffffff'} onChange={(e) => updateEmitter('colorEnd', e.target.value)} className="w-full h-4 bg-transparent border-none cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opacity */}
                                    <div>
                                        <div className="flex justify-between text-[9px] text-gray-400"><span>不透明度 (开始)</span><span>{(currentEmitter?.opacity ?? 0.8).toFixed(2)}</span></div>
                                        <input type="range" min="0" max="1" step="0.05" value={currentEmitter?.opacity ?? 0.8} onChange={(e) => updateEmitter('opacity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-purple-500"/>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[9px] text-gray-400"><span>结束透明度 (Fade Out)</span><span>{(currentEmitter?.opacityEnd ?? 0).toFixed(2)}</span></div>
                                        <input type="range" min="0" max="1" step="0.05" value={currentEmitter?.opacityEnd ?? 0} onChange={(e) => updateEmitter('opacityEnd', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-purple-500"/>
                                    </div>

                                    {/* Blending Mode */}
                                    <div>
                                        <label className="text-[9px] text-gray-500 block mb-1">混合模式</label>
                                        <select 
                                            value={currentEmitter?.blending || 'normal'} 
                                            onChange={(e) => updateEmitter('blending', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded text-xs px-2 py-1 text-white outline-none"
                                        >
                                            <option value="normal">正常 (Normal)</option>
                                            <option value="additive">叠加 (Additive)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {currentAsset.type === 'continuous' ? (
                                        <div><label className="text-[10px] text-gray-500 block mb-1">发射速率 (Rate)</label><input type="number" value={currentEmitter?.rate || 20} onChange={(e) => updateEmitter('rate', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"/></div>
                                    ) : (
                                        <div><label className="text-[10px] text-gray-500 block mb-1">爆发数量 (Count)</label><input type="number" value={currentEmitter?.burstCount || 20} onChange={(e) => updateEmitter('burstCount', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"/></div>
                                    )}
                                    <div><label className="text-[10px] text-gray-500 block mb-1">生命周期 (Life)</label><input type="number" step="0.1" value={currentEmitter?.lifetime || 1} onChange={(e) => updateEmitter('lifetime', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"/></div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1">大小渐变 ({currentEmitter?.sizeStart} -&gt; {currentEmitter?.sizeEnd})</label>
                                    <div className="flex gap-2 mt-1 items-center bg-gray-800 p-2 rounded border border-gray-700">
                                        <input type="range" min="0" max="2" step="0.1" value={currentEmitter?.sizeStart || 0.2} onChange={(e) => updateEmitter('sizeStart', parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-600 rounded accent-purple-500"/>
                                        <input type="range" min="0" max="2" step="0.1" value={currentEmitter?.sizeEnd || 0} onChange={(e) => updateEmitter('sizeEnd', parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-600 rounded accent-purple-500"/>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-gray-800">
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>速度</span><span>{currentEmitter?.speed}</span></div><input type="range" min="0" max="10" step="0.1" value={currentEmitter?.speed || 1} onChange={(e) => updateEmitter('speed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500"/></div>
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>扩散范围</span><span>{currentEmitter?.spread}</span></div><input type="range" min="0" max="1" step="0.05" value={currentEmitter?.spread || 0.2} onChange={(e) => updateEmitter('spread', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500"/></div>
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>重力</span><span>{currentEmitter?.gravity}</span></div><input type="range" min="-10" max="10" step="0.5" value={currentEmitter?.gravity || 0} onChange={(e) => updateEmitter('gravity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500"/></div>
                                    
                                    {/* NEW CONTROLS */}
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>旋转速度</span><span>{currentEmitter?.rotationSpeed || 0}</span></div><input type="range" min="0" max="10" step="0.5" value={currentEmitter?.rotationSpeed || 0} onChange={(e) => updateEmitter('rotationSpeed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500"/></div>
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>扰动 (Turbulence)</span><span>{currentEmitter?.turbulence || 0}</span></div><input type="range" min="0" max="2" step="0.1" value={currentEmitter?.turbulence || 0} onChange={(e) => updateEmitter('turbulence', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500"/></div>
                                    <div><div className="flex justify-between text-[10px] text-gray-400"><span>延迟 (Delay)</span><span>{currentEmitter?.delay || 0}</span></div><input type="range" min="0" max="2" step="0.1" value={currentEmitter?.delay || 0} onChange={(e) => updateEmitter('delay', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-orange-500"/></div>

                                    <div className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700 mt-2">
                                        <span className="text-[10px] text-gray-400">跟随父级 (Non-Trail)</span>
                                        <input type="checkbox" checked={currentEmitter?.followParent || false} onChange={(e) => updateEmitter('followParent', e.target.checked)} className="accent-blue-500"/>
                                    </div>
                                </div>

                                {/* Removed Numeric Offset Inputs - Using Gizmo Now */}
                                <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded text-[10px] text-blue-300 text-center">
                                    <i className="fas fa-arrows-alt mr-1"></i> 使用场景中的坐标轴拖动调整位置
                                </div>
                            </div>
                        ) : <div className="flex-grow flex items-center justify-center text-gray-600 text-xs">选择一个发射器进行编辑</div>}
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-gray-600 text-xs">请创建或选择一个特效</div>
                )}
            </div>
        </div>
    );
};
