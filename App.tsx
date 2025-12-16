
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { EditorPanel } from './components/EditorPanel';
import { MapEditorPanel } from './components/MapEditorPanel';
import { ModelWorkshopPanel } from './components/ModelWorkshopPanel';
import { Sidebar } from './components/Sidebar';
import { AssetLibraryPanel } from './components/AssetLibraryPanel';
import { ActionStudioPanel } from './components/ActionStudioPanel'; 
import { AIAssistant } from './components/AIAssistant'; 
import { VfxEditorPanel } from './components/VfxEditorPanel'; // NEW
import { ArchitectureEditor } from './components/ArchitectureEditor/ArchitectureEditor'; // NEW
import { SettingsModal } from './components/SettingsModal'; // NEW
import './i18n'; // 初始化国际化
import i18n from 'i18next'; // 导入 i18n 实例
import { AppMode, CharacterConfig, MapConfig, MapItemType, GearTransformMap, AssetTransformMap, AnimationConfig, CharacterAction, CustomModel, ModelPrimitive, AssetCategory, AssetSubCategory, CustomAction, Keyframe, SavedCharacter, CameraMode, WorkshopRefType, SavedProceduralAction, CameraSettings, ShadowSettings, ActionCategory, VfxAsset, VfxTestParams, VfxBindingMap, VfxEmitterConfig } from './types'; // Updated imports
import { INITIAL_GEAR_TRANSFORMS, INITIAL_ASSET_TRANSFORMS, DEFAULT_ANIMATION_CONFIG, INITIAL_CUSTOM_MODELS, INITIAL_CUSTOM_ACTIONS, INITIAL_SKILLS, NATIVE_TEMPLATES, sanitizeModel, INITIAL_PROCEDURAL_ACTIONS, DEFAULT_CONFIG } from './initialData';
import { generate3DModel, generateProceduralConfig, generateCharacterAction, generateVfxConfig } from './services/aiService'; 
import { exportToFile, importFromFile, saveToLocal } from './services/storageService';
import * as THREE from 'three'; // Import THREE for vector math

const DEFAULT_MAP_CONFIG: MapConfig = {
    groundColor: '#2a2a2a', // Dark Stone
    elements: []
};

// Default Sample Character
const SAMPLE_CHARACTER: SavedCharacter = {
    ...DEFAULT_CONFIG,
    id: 'char_sample_01',
    name: '艾瑞克 (示例)',
    className: '战士',
    stats: { strength: 15, agility: 8, intelligence: 5, vitality: 12 },
    gear: { weapon: 'sword_basic', shield: 'shield_round', helm: 'helm_plate', mask: 'none' },
    createdAt: Date.now()
};

export const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHARACTER_EDITOR);
  const [config, setConfig] = useState<CharacterConfig>(DEFAULT_CONFIG);
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([SAMPLE_CHARACTER]);

  const [mapConfig, setMapConfig] = useState<MapConfig>(DEFAULT_MAP_CONFIG);
  const [mapHistory, setMapHistory] = useState<MapConfig[]>([]);
  const [selectedTool, setSelectedTool] = useState<MapItemType | 'eraser' | 'select'>('wall');
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set()); 

  const [gearTransforms, setGearTransforms] = useState<GearTransformMap>(INITIAL_GEAR_TRANSFORMS);
  const [assetTransforms, setAssetTransforms] = useState<AssetTransformMap>(INITIAL_ASSET_TRANSFORMS);
  const [animConfig, setAnimConfig] = useState<AnimationConfig>(DEFAULT_ANIMATION_CONFIG);
  
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [focusedParentId, setFocusedParentId] = useState<string>(''); 

  const [editorStep, setEditorStep] = useState<1 | 2 | 3>(1); 
  const [editorWeaponCategory, setEditorWeaponCategory] = useState<'one_handed' | 'two_handed' | 'custom'>('one_handed');

  const [previewAction, setPreviewAction] = useState<CharacterAction>(CharacterAction.IDLE);
  const [lastAttackTrigger, setLastAttackTrigger] = useState(0);
  
// --- AI SPRITE STATE ---
const [isAiDocked, setIsAiDocked] = useState(false);
const [isAiChatVisible, setIsAiChatVisible] = useState(true);

  // --- SETTINGS MODAL STATE ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- VFX STATE (NEW) ---
  const [vfxAssets, setVfxAssets] = useState<VfxAsset[]>([]);
  const [vfxBindings, setVfxBindings] = useState<Record<string, VfxBindingMap>>({}); 
  const [currentVfxAssetId, setCurrentVfxAssetId] = useState<string | null>(null);
  const [selectedVfxEmitterId, setSelectedVfxEmitterId] = useState<string | null>(null); // Lifted state
  const [vfxTestParams, setVfxTestParams] = useState<VfxTestParams>({ isPlaying: true, isProjectileTesting: false });

  // --- WORKSHOP STATE ---
  const [customModels, setCustomModels] = useState<CustomModel[]>(INITIAL_CUSTOM_MODELS);
  const [workshopPrimitives, setWorkshopPrimitives] = useState<ModelPrimitive[]>([]);
  const [selectedWorkshopPrimId, setSelectedWorkshopPrimId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [workshopRefType, setWorkshopRefType] = useState<WorkshopRefType>('none');
  const [isSnapping, setIsSnapping] = useState(false);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [workshopReturnMode, setWorkshopReturnMode] = useState<AppMode>(AppMode.CHARACTER_EDITOR);
  const [referenceOpacity, setReferenceOpacity] = useState(0.8);
  
  // New State for Context Locking
  const [workshopLockState, setWorkshopLockState] = useState<{ category: AssetCategory, subCategory: AssetSubCategory } | null>(null);
  
  // Workshop Suggestion from AI
  const [workshopSuggestion, setWorkshopSuggestion] = useState<{ category: AssetCategory, subCategory: AssetSubCategory } | null>(null);
  
  // Action Studio Request (AI Navigation)
  const [actionStudioRequest, setActionStudioRequest] = useState<{ mode: 'keyframe' | 'procedural', category: ActionCategory } | null>(null);

  // Memoized Workshop Data
  const workshopInitialData = useMemo(() => {
    if (!editingModelId) return undefined;
    const model = customModels.find(m => m.id === editingModelId);
    return model ? { id: model.id, name: model.name, category: model.category, subCategory: model.subCategory } : undefined;
  }, [editingModelId, customModels]);


  const historyStack = useRef<ModelPrimitive[][]>([]);
  const historyPtr = useRef<number>(-1);
  const primitivesRef = useRef<ModelPrimitive[]>([]); 

  useEffect(() => {
    primitivesRef.current = workshopPrimitives;
  }, [workshopPrimitives]);

  const [customActions, setCustomActions] = useState<CustomAction[]>(INITIAL_CUSTOM_ACTIONS);
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);
  const [animTime, setAnimTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const [overridePose, setOverridePose] = useState<Record<string, [number, number, number]>>({});
  const [overridePosition, setOverridePosition] = useState<Record<string, [number, number, number]>>({}); 
  
  // Lifted state for Gizmo Mode
  const [gizmoMode, setGizmoMode] = useState<'rotate' | 'translate'>('rotate');

  // Procedural Animation State
  const [savedProceduralActions, setSavedProceduralActions] = useState<SavedProceduralAction[]>(INITIAL_PROCEDURAL_ACTIONS);
  const [currentProceduralId, setCurrentProceduralId] = useState<string | null>('proc_standard');
  const [isProceduralPaused, setIsProceduralPaused] = useState(false);


  const [cameraMode, setCameraMode] = useState<CameraMode>(CameraMode.ISOMETRIC);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
      fov: 35,
      height: 30,
      distance: 20
  });
  
  // Shadow Settings
  const [shadowSettings, setShadowSettings] = useState<ShadowSettings>({
      opacity: 0.75,
      blur: 0.4,
      color: "#000000",
      offsetY: 0,
      offsetX: 0,
      offsetZ: 0
  });

  const [isDirty, setIsDirty] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const mapSnapshot = useRef<MapConfig | null>(null);
  
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  const settingsInputRef = useRef<HTMLInputElement>(null); 

  // --- HISTORY STACKS ---
  const characterHistory = useRef<{config: CharacterConfig, gearTransforms: GearTransformMap}[]>([]);
  const actionHistory = useRef<{customActions: CustomAction[], savedProceduralActions: SavedProceduralAction[]}[]>([]);
  const assetHistory = useRef<CustomModel[][]>([]);

  // --- DERIVED ANIMATION CONFIG (GAMEPLAY MODE) ---
  const derivedAnimConfig = useMemo(() => {
      // 1. Start with Defaults
      let base: AnimationConfig;
      try {
          base = JSON.parse(JSON.stringify(DEFAULT_ANIMATION_CONFIG));
      } catch (e) {
          base = {
              idle: { speed: 2.0, amplitude: 0.05, sway: 0.02, headBob: 0.01 },
              walk: { speed: 10.0, legAmplitude: 0.6, armAmplitude: 0.6, bounciness: 0.1, kneeBend: 1.5, armSpan: 0.1, spineRotation: 0.1, stepWidth: 0.2, armRotation: 0 },
              run: { speed: 18.0, legAmplitude: 1.0, armAmplitude: 1.2, bodyLean: 0.3, kneeBend: 1.8, armSpan: 0.2, spineRotation: 0.2, stepWidth: 0.3, armRotation: 0 },
              attack: { speedMult: 1.0, windupRatio: 0.25, intensity: 1.0, decay: 0.5, recoil: 0.2, legSpread: 0.4, kneeBend: 0.15 }
          } as AnimationConfig;
      }
      
      if (!config.actionSet) return base;

      const apply = (cat: 'idle'|'walk'|'run'|'attack', id?: string) => {
          if (!id) return;
          const action = savedProceduralActions.find(a => a.id === id);
          if (action && action.config[cat]) {
              (base[cat] as any) = { ...base[cat], ...action.config[cat] };
          }
      }
      apply('idle', config.actionSet.idleId);
      apply('walk', config.actionSet.walkId);
      apply('run', config.actionSet.runId);
      apply('attack', config.actionSet.attackId);
      return base;
  }, [config.actionSet, savedProceduralActions]);

  const effectiveAnimConfig = (mode === AppMode.ACTION_STUDIO) ? animConfig : derivedAnimConfig;

  // History handlers...
  const handleCharacterHistorySave = useCallback(() => {
      characterHistory.current.push({
          config: JSON.parse(JSON.stringify(config)),
          gearTransforms: JSON.parse(JSON.stringify(gearTransforms))
      });
      if (characterHistory.current.length > 20) characterHistory.current.shift();
  }, [config, gearTransforms]);

  const handleActionHistorySave = useCallback(() => {
      actionHistory.current.push({
          customActions: JSON.parse(JSON.stringify(customActions)),
          savedProceduralActions: JSON.parse(JSON.stringify(savedProceduralActions))
      });
      if (actionHistory.current.length > 20) actionHistory.current.shift();
  }, [customActions, savedProceduralActions]);

  const handleAssetHistorySave = useCallback(() => {
      assetHistory.current.push(JSON.parse(JSON.stringify(customModels)));
      if (assetHistory.current.length > 20) assetHistory.current.shift();
  }, [customModels]);
  
  const handleConfigChange = useCallback(() => {
     if (mode === AppMode.CHARACTER_EDITOR) setIsDirty(true);
  }, [mode]);

  const handleSetMapConfig: React.Dispatch<React.SetStateAction<MapConfig>> = useCallback((value) => {
      setMapConfig(value);
      if (mode === AppMode.MAP_EDITOR) setIsDirty(true);
  }, [mode]);

  const handleModeSwitchAttempt = (targetMode: AppMode) => {
      if (targetMode === mode) return;
      if (isDirty && (mode === AppMode.MAP_EDITOR || mode === AppMode.CHARACTER_EDITOR)) {
          setPendingMode(targetMode);
          setShowSaveDialog(true);
      } else {
          switchMode(targetMode);
      }
  };

  const switchMode = (targetMode: AppMode) => {
      if (targetMode === AppMode.MAP_EDITOR) {
          mapSnapshot.current = JSON.parse(JSON.stringify(mapConfig));
      }
      setIsDirty(false);
      setMode(targetMode);
      setSelectedEntityIds(new Set()); 
  }

  const handleConfirmSave = () => {
     if (pendingMode) switchMode(pendingMode);
     setShowSaveDialog(false);
  }
  
  const handleConfirmDiscard = () => {
      if (mode === AppMode.MAP_EDITOR && mapSnapshot.current) {
          setMapConfig(mapSnapshot.current);
      }
      if (pendingMode) switchMode(pendingMode);
      setShowSaveDialog(false);
  }

  // VFX HANDLERS
  const handleBindVfx = (modelId: string, slot: 'equip' | 'projectile' | 'impact', vfxId: string) => {
      handleAssetHistorySave();
      
      // Update the specific CustomModel
      setCustomModels(prev => prev.map(m => {
          if (m.id === modelId) {
              return {
                  ...m,
                  vfxBindings: {
                      ...(m.vfxBindings || {}),
                      [slot]: vfxId
                  }
              };
          }
          return m;
      }));
      
      // Also update the global binding state for compatibility
      setVfxBindings(prev => ({
          ...prev,
          [modelId]: {
              ...(prev[modelId] || {}),
              [slot]: vfxId
          }
      }));
  };

  const handleDeleteVfx = (vfxId: string) => {
      setVfxAssets(prev => prev.filter(v => v.id !== vfxId));
      if (currentVfxAssetId === vfxId) setCurrentVfxAssetId(null);
  };

  // VFX EMITTER UPDATE HANDLER (For Gizmo & UI)
  const handleVfxEmitterUpdate = (assetId: string, emitterId: string, updates: Partial<VfxEmitterConfig>) => {
      setVfxAssets(prev => prev.map(a => {
          if (a.id === assetId) {
              const targetEmitter = a.emitters.find(e => e.id === emitterId);
              
              // GROUP MOVEMENT LOGIC
              // If we are updating offset (Gizmo drag) and the emitter is part of a group, move all peers
              if (targetEmitter && targetEmitter.groupId && updates.offset) {
                  const oldPos = new THREE.Vector3(...targetEmitter.offset);
                  const newPos = new THREE.Vector3(...updates.offset);
                  const delta = newPos.sub(oldPos);

                  return {
                      ...a,
                      emitters: a.emitters.map(e => {
                          if (e.groupId === targetEmitter.groupId) {
                              const ePos = new THREE.Vector3(...e.offset).add(delta);
                              return { ...e, offset: [ePos.x, ePos.y, ePos.z] };
                          }
                          // Apply non-offset updates normally or skip if not in group (though logic implies only offset matters here)
                          return e;
                      })
                  };
              }

              // Standard single update (or non-offset update)
              return {
                  ...a,
                  emitters: a.emitters.map(e => e.id === emitterId ? { ...e, ...updates } : e)
              };
          }
          return a;
      }));
  };

  // ... (Rest of App.tsx logic unchanged: timeline, animation loop, etc.) ...
  useEffect(() => {
    if (!currentActionId) {
        setOverridePose({});
        setOverridePosition({});
        return;
    }
    const action = customActions.find(a => a.id === currentActionId);
    if (!action) return;
    
    const kf = action.keyframes.find(k => Math.abs(k.time - animTime) < 0.01);
    if (kf) {
        if (kf.boneRotations) setOverridePose(kf.boneRotations);
        if (kf.bonePositions) setOverridePosition(kf.bonePositions);
    }
  }, [currentActionId, animTime]);

  useEffect(() => {
    if (!isPlaying || mode !== AppMode.ACTION_STUDIO || !currentActionId) return;
    const action = customActions.find(a => a.id === currentActionId);
    if (!action) return;

    let start = Date.now();
    let initialTime = animTime;
    
    if (initialTime >= 1 && !action.loop) {
        initialTime = 0;
        setAnimTime(0);
    }
    
    const loop = setInterval(() => {
        const now = Date.now();
        const delta = (now - start) / 1000;
        let nextTime = initialTime + (delta / action.duration);
        
        if (nextTime > 1) {
            if (action.loop) {
                nextTime = nextTime % 1;
                start = Date.now();
                initialTime = nextTime;
            }
            else {
                nextTime = 1;
                setIsPlaying(false);
            }
        }
        setAnimTime(nextTime);
    }, 16);

    return () => clearInterval(loop);
  }, [isPlaying, mode, currentActionId, customActions]);


  const handleUpdateKeyframe = (time: number, bone: string, value: [number, number, number], type: 'rotation' | 'position' = 'rotation') => {
      if (!currentActionId) return;
      handleActionHistorySave();
      
      setCustomActions(prev => prev.map(a => {
          if (a.id !== currentActionId) return a;
          let kfs = [...a.keyframes];
          let kfIndex = kfs.findIndex(k => Math.abs(k.time - time) < 0.01);
          
          if (kfIndex !== -1) {
              const kf = kfs[kfIndex];
              if (type === 'rotation') {
                  kfs[kfIndex] = { ...kf, boneRotations: { ...kf.boneRotations, [bone]: value } };
              } else {
                  kfs[kfIndex] = { ...kf, bonePositions: { ...(kf.bonePositions || {}), [bone]: value } };
              }
          } else {
              if (type === 'rotation') {
                  kfs.push({ time, boneRotations: { [bone]: value } });
              } else {
                  kfs.push({ time, boneRotations: {}, bonePositions: { [bone]: value } });
              }
              kfs.sort((x, y) => x.time - y.time);
          }
          return { ...a, keyframes: kfs };
      }));

      if (type === 'rotation') {
          setOverridePose(prev => ({ ...prev, [bone]: value }));
      } else {
          setOverridePosition(prev => ({ ...prev, [bone]: value }));
      }
  };

  const handleBoneChange = (bone: string, value: [number, number, number], type: 'rotation' | 'position') => {
      handleUpdateKeyframe(animTime, bone, value, type);
  };

  const handleCreateKeyframe = () => {
      if (!currentActionId) return;
      handleActionHistorySave();
      setCustomActions(prev => prev.map(a => {
          if (a.id !== currentActionId) return a;
          const currentRot = JSON.parse(JSON.stringify(overridePose));
          const currentPos = JSON.parse(JSON.stringify(overridePosition));
          
          let kfs = [...a.keyframes];
          let kfIndex = kfs.findIndex(k => Math.abs(k.time - animTime) < 0.01);
          if (kfIndex !== -1) {
               kfs[kfIndex] = { 
                   ...kfs[kfIndex], 
                   boneRotations: { ...kfs[kfIndex].boneRotations, ...currentRot },
                   bonePositions: { ...kfs[kfIndex].bonePositions, ...currentPos }
               };
          } else {
               kfs.push({ time: animTime, boneRotations: currentRot, bonePositions: currentPos });
               kfs.sort((x, y) => x.time - y.time);
          }
          return { ...a, keyframes: kfs };
      }));
      alert("已在当前时间添加/更新关键帧！");
  };

  const handleDeleteKeyframe = () => {
      if (!currentActionId) return;
      handleActionHistorySave();
      setCustomActions(prev => prev.map(a => {
          if (a.id !== currentActionId) return a;
          const kfs = a.keyframes.filter(k => Math.abs(k.time - animTime) > 0.02);
          return { ...a, keyframes: kfs };
      }));
      alert("已删除当前位置的关键帧！");
  };

  const handleMoveKeyframe = (actionId: string, kfIndex: number, newTime: number) => {
      handleActionHistorySave();
      setCustomActions(prev => prev.map(a => {
          if (a.id !== actionId) return a;
          const newKfs = [...a.keyframes];
          if (newKfs[kfIndex]) {
              newKfs[kfIndex] = { ...newKfs[kfIndex], time: newTime };
              newKfs.sort((x, y) => x.time - y.time);
          }
          return { ...a, keyframes: newKfs };
      }));
  };

  const handleImportActions = (importedActions: CustomAction[]) => {
      handleActionHistorySave();
      setCustomActions(prev => {
          const merged = [...prev];
          importedActions.forEach(imp => {
              const idx = merged.findIndex(ex => ex.id === imp.id);
              if (idx !== -1) merged[idx] = imp;
              else merged.push(imp);
          });
          return merged;
      });
      alert(`已导入 ${importedActions.length} 个动作动作。`);
  };

  const handleImportProject = (data: { customActions?: CustomAction[], savedProceduralActions?: SavedProceduralAction[] }) => {
      handleActionHistorySave();
      
      let kfCount = 0;
      let procCount = 0;

      if (data.customActions && Array.isArray(data.customActions)) {
          setCustomActions(prev => {
              const merged = [...prev];
              data.customActions!.forEach(imp => {
                  const idx = merged.findIndex(ex => ex.id === imp.id);
                  if (idx !== -1) merged[idx] = imp;
                  else merged.push(imp);
              });
              kfCount = data.customActions!.length;
              return merged;
          });
      }

      if (data.savedProceduralActions && Array.isArray(data.savedProceduralActions)) {
          setSavedProceduralActions(prev => {
              const merged = [...prev];
              data.savedProceduralActions!.forEach(imp => {
                  const idx = merged.findIndex(ex => ex.id === imp.id);
                  if (idx !== -1) merged[idx] = imp;
                  else merged.push(imp);
              });
              procCount = data.savedProceduralActions!.length;
              return merged;
          });
      }

      alert(`导入成功！\n关键帧动作: ${kfCount}\n程序化配置: ${procCount}`);
  };

  const handleSaveProceduralAction = (action: SavedProceduralAction) => {
      handleActionHistorySave(); 
      setSavedProceduralActions(prev => {
          const idx = prev.findIndex(a => a.id === action.id);
          if (idx !== -1) {
              const newArr = [...prev];
              newArr[idx] = action;
              return newArr;
          }
          return [...prev, action];
      });
      setCurrentProceduralId(action.id);
  };

  const handleDeleteProceduralAction = (id: string) => {
      handleActionHistorySave(); 
      setSavedProceduralActions(prev => prev.filter(a => a.id !== id));
      if (currentProceduralId === id) {
          setCurrentProceduralId(null);
      }
  };
  
  const handleSelectProceduralAction = (id: string) => {
      const action = savedProceduralActions.find(a => a.id === id);
      if (action) {
          setAnimConfig(JSON.parse(JSON.stringify(action.config)));
          setCurrentProceduralId(id);
      } else {
          setCurrentProceduralId(null);
      }
  }

  const handleTriggerAttack = useCallback(() => {
      setLastAttackTrigger(Date.now());
  }, []);

  const handleHistorySave = useCallback(() => { 
      const snapshot = JSON.parse(JSON.stringify(primitivesRef.current)); 
      const newPtr = historyPtr.current + 1;
      if (newPtr < historyStack.current.length) {
          historyStack.current = historyStack.current.slice(0, newPtr);
      }
      historyStack.current.push(snapshot);
      historyPtr.current = newPtr;
  }, []); 

  const handleWorkshopUndo = useCallback(() => { 
      if(historyPtr.current >= 0) { 
          const stateToRestore = historyStack.current[historyPtr.current];
          if (stateToRestore) {
              setWorkshopPrimitives(stateToRestore);
              primitivesRef.current = stateToRestore;
          }
          historyPtr.current--;
      }
  }, []);

  const handleWorkshopDuplicate = useCallback(() => {
      if (!selectedWorkshopPrimId) return;
      handleHistorySave();
      setWorkshopPrimitives(prev => {
          const target = prev.find(p => p.id === selectedWorkshopPrimId);
          if (!target) return prev;
          const newId = Math.random().toString(36).substr(2, 9);
          const clone: ModelPrimitive = {
              ...JSON.parse(JSON.stringify(target)),
              id: newId,
              position: [target.position[0] + 0.5, target.position[1], target.position[2] + 0.5] 
          };
          setTimeout(() => setSelectedWorkshopPrimId(newId), 0);
          return [...prev, clone];
      });
  }, [selectedWorkshopPrimId, handleHistorySave]);

  const handleMapHistorySave = useCallback(() => {
      setMapHistory(prev => {
          const newH = [...prev, mapConfig];
          if (newH.length > 20) newH.shift();
          return newH;
      });
      if (mode === AppMode.MAP_EDITOR) setIsDirty(true);
  }, [mapConfig, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault(); 
            if (mode === AppMode.MODEL_WORKSHOP) {
                handleWorkshopUndo();
            } else if (mode === AppMode.MAP_EDITOR) {
                 setMapHistory(prev => {
                    if (prev.length === 0) return prev;
                    const last = prev[prev.length - 1];
                    setMapConfig(last);
                    return prev.slice(0, -1);
                });
            } else if (mode === AppMode.CHARACTER_EDITOR) {
                if (characterHistory.current.length > 0) {
                    const prevState = characterHistory.current.pop();
                    if (prevState) {
                        setConfig(prevState.config);
                        setGearTransforms(prevState.gearTransforms);
                    }
                }
            } else if (mode === AppMode.ACTION_STUDIO) {
                if (actionHistory.current.length > 0) {
                    const prevState = actionHistory.current.pop();
                    if (prevState) {
                        setCustomActions(prevState.customActions);
                        setSavedProceduralActions(prevState.savedProceduralActions);
                    }
                }
            } else if (mode === AppMode.ASSET_LIBRARY) {
                if (assetHistory.current.length > 0) {
                    const prevState = assetHistory.current.pop();
                    if (prevState) {
                        setCustomModels(prevState);
                    }
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleWorkshopUndo]); 

  // Part Selection Logic
  const handlePartSelect = useCallback((id: string, isDoubleClick?: boolean) => {
      // Action Studio
      if (mode === AppMode.ACTION_STUDIO) {
          let bone = id;
          if (id.includes('eye') || id.includes('mouth') || id.includes('hair') || id.includes('hat') || id.includes('helm') || id.includes('mask') || id.startsWith('head')) bone = 'head';
          else if (id === 'chest' || id.includes('staff_orb')) bone = 'chest';
          else if (id === 'hips') bone = 'hips';
          else if (id === config.gear.weapon || id.includes('sword') || id.includes('hammer') || id.includes('wand') || id.includes('book')) bone = 'hand_right';
          else if (id === config.gear.shield || id.includes('shield')) bone = 'hand_left';
          else {
              if (['arm_left','forearm_left','hand_left','arm_right','forearm_right','hand_right','thigh_left','calf_left','foot_left','thigh_right','calf_right','foot_right'].some(b => id.includes(b))) {
                 if (id.includes('daggers_left')) bone = 'hand_left';
                 else if (id.includes('daggers_right')) bone = 'hand_right';
                 else bone = id;
              }
          }
          setSelectedBone(bone);
          return;
      }
      
      // Model Workshop
      if (mode === AppMode.MODEL_WORKSHOP) {
          if (workshopLockState) return;

          let refType: WorkshopRefType = 'none';
          
          if (id.includes('head') || id.includes('eye') || id.includes('mouth') || id.includes('hair') || id.includes('hat') || id.includes('helm') || id.includes('mask')) refType = 'head';
          else if (id.includes('hand_left') || id.includes('shield')) refType = 'hand_l';
          else if (id.includes('hand_right') || id.includes('weapon')) refType = 'hand_r';
          else if (id.includes('arm_left')) refType = 'arm_l';
          else if (id.includes('forearm_left')) refType = 'forearm_l';
          else if (id.includes('arm_right')) refType = 'arm_r';
          else if (id.includes('forearm_right')) refType = 'forearm_r';
          else if (id.includes('thigh_left')) refType = 'thigh_l';
          else if (id.includes('calf_left')) refType = 'calf_l';
          else if (id.includes('foot_left')) refType = 'foot_l';
          else if (id.includes('thigh_right')) refType = 'thigh_r';
          else if (id.includes('calf_right')) refType = 'calf_r';
          else if (id.includes('foot_right')) refType = 'foot_r';
          else if (id.includes('chest')) refType = 'chest';
          else if (id.includes('hips')) refType = 'hips';
          else if (id.includes('back')) refType = 'back';
          else refType = 'ground';

          setWorkshopRefType(refType);
          return;
      }

      // Character Editor
      if (focusedParentId) {
          if (id.startsWith(focusedParentId)) setSelectedPartId(id);
          return;
      }
      setSelectedPartId(id);

      if (isDoubleClick) {
           if (config.gear.weapon === id || config.gear.shield === id || config.gear.helm === id || config.gear.mask === id || id.includes('daggers')) {
               setFocusedParentId(id);
           }
      }
  }, [focusedParentId, config.gear, mode, workshopLockState]);

  const handlePartRightClick = useCallback((id: string) => { 
      if (mode === AppMode.MODEL_WORKSHOP) return; // Disable Right Click Focus in Workshop
      setFocusedParentId(id); setSelectedPartId(''); 
  }, [mode]);
  
  const handleBackgroundClick = useCallback(() => { 
      setSelectedPartId(''); setFocusedParentId(''); setSelectedWorkshopPrimId(null); setSelectedBone(null);
      // Deselect emitter gizmo if clicking background in VFX mode
      if (mode === AppMode.VFX_STUDIO) setSelectedVfxEmitterId(null);
  }, [mode]);

  const handleEditorFinish = () => {
      const newCharacterAsset: SavedCharacter = { 
          ...config, 
          id: `char_${Math.random().toString(36).substr(2,9)}`, 
          createdAt: Date.now() 
      };
      setSavedCharacters(prev => [...prev, newCharacterAsset]);
      alert("角色已保存！进入实机演示模式。");
      switchMode(AppMode.GAMEPLAY);
  };

  const handleDeleteCustomModel = (id: string) => { 
      setDeleteTargetId(id); 
  };
  
  const handleConfirmDelete = () => {
      if (!deleteTargetId) return;
      const id = deleteTargetId;
      handleAssetHistorySave(); 
      handleCharacterHistorySave(); 

      setCustomModels(p => p.filter(m => m.id !== id)); 
      
      setConfig(prev => {
          let next = { ...prev };
          let changed = false;

          if (prev.gear.weapon === id) { next.gear.weapon = 'none'; changed = true; }
          if (prev.gear.shield === id) { next.gear.shield = 'none'; changed = true; }
          if (prev.gear.helm === id) { next.gear.helm = 'none'; changed = true; }
          if (prev.gear.mask === id) { next.gear.mask = 'none'; changed = true; }
          
          if (prev.headStyle === id) { next.headStyle = 'box'; changed = true; }
          if (prev.eyeStyle === id) { next.eyeStyle = 'dot'; changed = true; }
          if (prev.mouthStyle === id) { next.mouthStyle = 'smile'; changed = true; }
          if (prev.hairStyle === id) { next.hairStyle = 'bald'; changed = true; }
          
          if (prev.chestStyle === id) { next.chestStyle = 'chest_default'; changed = true; }
          if (prev.hipsStyle === id) { next.hipsStyle = 'hips_default'; changed = true; }
          if (prev.upperArmStyle === id) { next.upperArmStyle = 'arm_default'; changed = true; }
          if (prev.forearmStyle === id) { next.forearmStyle = 'forearm_default'; changed = true; }
          if (prev.handStyle === id) { next.handStyle = 'hand_default'; changed = true; }
          if (prev.thighStyle === id) { next.thighStyle = 'thigh_default'; changed = true; }
          if (prev.calfStyle === id) { next.calfStyle = 'calf_default'; changed = true; }
          if (prev.footStyle === id) { next.footStyle = 'foot_default'; changed = true; }

          return changed ? next : prev;
      });
      
      if (mode === AppMode.MODEL_WORKSHOP && editingModelId === id) {
          handleWorkshopExit();
      }

      setDeleteTargetId(null);
  };
  
  const handleCreateCustomModel = (cat: AssetCategory, sub?: AssetSubCategory) => { 
      setWorkshopPrimitives([]); primitivesRef.current = []; historyStack.current = []; historyPtr.current = -1; 
      setEditingModelId(null); setWorkshopReturnMode(mode); 
      let lockState = null;
      if (sub && sub !== 'none') {
          lockState = { category: cat, subCategory: sub };
      }
      setWorkshopLockState(lockState);
      if (cat === 'map_object' || cat === 'mob') setWorkshopRefType('ground'); 
      else setWorkshopRefType('head'); 
      switchMode(AppMode.MODEL_WORKSHOP); 
  };

  const handleBatchImportData = (models: CustomModel[]) => {
      handleAssetHistorySave();
      setCustomModels(prev => {
          const newModels = [...prev];
          models.forEach((rawModel: any) => {
               const m = sanitizeModel(rawModel);
               const idx = newModels.findIndex(ex => ex.id === m.id);
               if (idx >= 0) newModels[idx] = m;
               else newModels.push(m);
          });
          return newModels;
      });
  };
  
  const handleEditCustomModel = (id: string, category?: AssetCategory, subCategory?: AssetSubCategory) => { 
      const m = customModels.find(x => x.id === id); 
      
      let parts: ModelPrimitive[] = [];
      let refType: WorkshopRefType = 'ground';
      let lockState = null;

      if (category && subCategory) {
          lockState = { category, subCategory };
      }

      if (m) {
          parts = JSON.parse(JSON.stringify(m.parts));
          setEditingModelId(id); 
          
          if (!lockState) {
              lockState = { category: m.category, subCategory: m.subCategory || 'none' };
          }
          
          if (m.category === 'character_part' || m.category === 'helm' || m.category === 'mask') {
              if (m.subCategory === 'chest') refType = 'chest';
              else if (m.subCategory === 'hips') refType = 'hips';
              else if (m.subCategory === 'upper_arm') refType = 'arm_l'; 
              else if (m.subCategory === 'forearm') refType = 'forearm_l'; 
              else if (m.subCategory === 'hand') refType = 'hand_l';
              else if (m.subCategory === 'thigh') refType = 'thigh_l';
              else if (m.subCategory === 'calf') refType = 'calf_l';
              else if (m.subCategory === 'foot') refType = 'foot_l';
              else refType = 'head'; 
          }
          else if (m.category === 'weapon') refType = 'hand_r';
          else if (m.category === 'shield') refType = 'hand_l';
      } else {
          const template = NATIVE_TEMPLATES[id];
          if (template) {
              parts = JSON.parse(JSON.stringify(template));
              setEditingModelId(null); 
              
              if (subCategory) {
                  if (subCategory === 'chest') refType = 'chest';
                  else if (subCategory === 'hips') refType = 'hips';
                  else if (subCategory === 'upper_arm') refType = 'arm_l';
                  else if (subCategory === 'forearm') refType = 'forearm_l';
                  else if (subCategory === 'hand') refType = 'hand_l';
                  else if (subCategory === 'thigh') refType = 'thigh_l';
                  else if (subCategory === 'calf') refType = 'calf_l';
                  else if (subCategory === 'foot') refType = 'foot_l';
                  else if (subCategory === 'head' || subCategory === 'eye' || subCategory === 'mouth' || subCategory === 'hair' || subCategory === 'mask') refType = 'head';
              } else {
                  if (id.includes('chest')) refType = 'chest';
                  else if (id.includes('hips')) refType = 'hips';
                  else if (id.includes('arm')) refType = 'arm_l';
                  else if (id.includes('hand')) refType = 'hand_l';
                  else if (id.includes('thigh')) refType = 'thigh_l';
                  else if (id.includes('foot')) refType = 'foot_l';
                  else refType = 'head';
              }
              
          } else {
              alert("未找到资产数据。");
              return;
          }
      }
      
      setWorkshopLockState(lockState);
      setWorkshopPrimitives(parts); 
      primitivesRef.current = parts; 
      historyStack.current = []; 
      historyPtr.current = -1; 
      setWorkshopReturnMode(mode); 
      setWorkshopRefType(refType);
      switchMode(AppMode.MODEL_WORKSHOP); 
  };
  
  const saveCustomModel = (name: string, cat: AssetCategory, sub: AssetSubCategory) => { 
      handleAssetHistorySave(); 
      const parts = workshopPrimitives; 
      let newId = editingModelId;
      
      const finalCat = workshopLockState ? workshopLockState.category : cat;
      const finalSub = workshopLockState ? workshopLockState.subCategory : sub;

      if(editingModelId) { 
          setCustomModels(p=>p.map(m=>m.id===editingModelId?{...m,name,category:finalCat,subCategory:finalSub,parts}:m)); 
          setEditingModelId(null); 
      } else { 
          newId = `custom_${finalCat}_${Math.random().toString(36).substr(2,6)}`; 
          setCustomModels(p=>[...p, {id: newId!, name, category:finalCat, subCategory:finalSub, parts}]); 
      } 
      
      setWorkshopPrimitives([]); 
      setWorkshopLockState(null);

      if (newId) {
          setConfig(prev => {
              const next = { ...prev };
              
              if (finalCat === 'weapon') next.gear.weapon = newId!;
              else if (finalCat === 'shield') next.gear.shield = newId!;
              else if (finalCat === 'helm') next.gear.helm = newId!;
              else if (finalCat === 'mask') next.gear.mask = newId!;
              else if (finalCat === 'character_part') {
                  if (finalSub === 'head') next.headStyle = newId!;
                  else if (finalSub === 'eye') next.eyeStyle = newId!;
                  else if (finalSub === 'mouth') next.mouthStyle = newId!;
                  else if (finalSub === 'hair') next.hairStyle = newId!;
                  else if (finalSub === 'chest') next.chestStyle = newId!;
                  else if (finalSub === 'hips') next.hipsStyle = newId!;
                  else if (finalSub === 'upper_arm') next.upperArmStyle = newId!; 
                  else if (finalSub === 'forearm') next.forearmStyle = newId!; 
                  else if (finalSub === 'hand') next.handStyle = newId!;
                  else if (finalSub === 'thigh') next.thighStyle = newId!; 
                  else if (finalSub === 'calf') next.calfStyle = newId!; 
                  else if (finalSub === 'foot') next.footStyle = newId!;
              }
              return next;
          });
      }

      if(workshopReturnMode===AppMode.ASSET_LIBRARY) switchMode(AppMode.ASSET_LIBRARY); 
      else { 
          switchMode(AppMode.CHARACTER_EDITOR); 
          setEditorStep(s => s); 
      } 
  };

  const handleWorkshopExit = () => { setWorkshopPrimitives([]); setEditingModelId(null); setWorkshopLockState(null); switchMode(workshopReturnMode); };
  
  const handleDeleteSelectedMapItems = useCallback(() => {
     if (mode === AppMode.MAP_EDITOR && selectedEntityIds.size > 0) {
         handleMapHistorySave();
         setMapConfig(prev => ({
             ...prev,
             elements: prev.elements.filter(el => !selectedEntityIds.has(el.id))
         }));
         setSelectedEntityIds(new Set());
     }
  }, [mode, selectedEntityIds, handleMapHistorySave]);
  
  const handleLoadCharacter = (charId: string) => {
      const char = savedCharacters.find(c => c.id === charId);
      if (char) {
          setConfig(char);
          switchMode(AppMode.CHARACTER_EDITOR);
          setEditorStep(2); 
      }
  }

  // --- AI COMMAND HANDLER ---
  const handleAiCommand = async (action: string, payload: any) => {
      if (action === 'GENERATE_MODEL') {
          let description = '';
          let cat: AssetCategory = 'map_object'; 
          let sub: AssetSubCategory = 'prop';
          let hasStructuredData = false;

          if (typeof payload === 'string') {
              description = payload;
          } else if (typeof payload === 'object') {
              description = payload.description;
              cat = payload.category;
              sub = payload.subCategory;
              hasStructuredData = true;
          }

          if (mode !== AppMode.MODEL_WORKSHOP) {
              setWorkshopPrimitives([]);
              setEditingModelId(null);
              setWorkshopReturnMode(mode);
              
              if (hasStructuredData) {
                  if (cat === 'map_object' || cat === 'mob') setWorkshopRefType('ground');
                  else if (cat === 'weapon') setWorkshopRefType('hand_r');
                  else if (cat === 'shield') setWorkshopRefType('hand_l');
                  else if (cat === 'helm' || cat === 'mask' || (cat === 'character_part' && sub === 'head')) setWorkshopRefType('head');
                  else setWorkshopRefType('ground'); 
                  
                  setWorkshopSuggestion({ category: cat, subCategory: sub });
              } else {
                  setWorkshopRefType('ground'); 
                  setWorkshopSuggestion(null);
              }

              switchMode(AppMode.MODEL_WORKSHOP);
          } else {
              if (hasStructuredData) {
                   setWorkshopSuggestion({ category: cat, subCategory: sub });
                   if (cat === 'map_object' || cat === 'mob') setWorkshopRefType('ground');
              }
          }
          
          const parts = await generate3DModel(description);
          if (parts && parts.length > 0) {
              setWorkshopPrimitives(parts);
              handleHistorySave(); 
          } else {
              alert("生成模型失败");
          }
      }
      
      else if (action === 'GENERATE_ANIMATION') {
          let description = '';
          let type = 'keyframe';
          let category: ActionCategory = 'idle';

          if (typeof payload === 'string') {
              description = payload;
              if (description.includes('walk') || description.includes('run')) type = 'procedural';
              if (description.includes('walk')) category = 'walk';
              else if (description.includes('run')) category = 'run';
              else if (description.includes('attack')) category = 'attack';
          } else {
              description = payload.description;
              type = payload.type;
              category = payload.category;
          }

          if (mode !== AppMode.ACTION_STUDIO) {
              switchMode(AppMode.ACTION_STUDIO);
          }
          
          if (type === 'keyframe') {
              const newAction = await generateCharacterAction(description);
              if (newAction) {
                  newAction.category = category; 
                  setCustomActions(prev => [...prev, newAction]);
                  setCurrentActionId(newAction.id);
                  setActionStudioRequest({ mode: 'keyframe', category });
              } else {
                  alert("生成关键帧动作失败");
              }
          } else {
              const newConfig = await generateProceduralConfig(description, category);
              if (newConfig) {
                  setAnimConfig(prev => {
                      const next = { ...prev };
                      if (newConfig[category]) {
                          // @ts-ignore
                          next[category] = { ...next[category], ...newConfig[category] };
                      }
                      return next;
                  });
                  setActionStudioRequest({ mode: 'procedural', category });
              } else {
                  alert("生成程序化配置失败");
              }
          }
      }

      else if (action === 'GENERATE_VFX') {
          let description = '';
          if (typeof payload === 'string') description = payload;
          else return;

          if (mode !== AppMode.VFX_STUDIO) switchMode(AppMode.VFX_STUDIO);

          // Show loading or toast?
          const vfx = await generateVfxConfig(description);
          if (vfx) {
              setVfxAssets(prev => [...prev, vfx]);
              setCurrentVfxAssetId(vfx.id);
          } else {
              alert("AI 生成特效失败");
          }
      }

      else if (action === 'GENERATE_LORE') {
          alert("功能开发中：Lore Generation");
      }

      else if (action === 'NAVIGATE' && typeof payload === 'string') {
          const targetMode = payload as AppMode;
          if (Object.values(AppMode).includes(targetMode)) {
              switchMode(targetMode);
          }
      }
  };

  // --- PROJECT SAVE/LOAD HANDLERS ---
  const handleSaveProject = () => {
    try {
      // Get current language from i18n
      const language = i18n.language || 'zh';
      
      // Build project data matching ProjectSaveData interface
      const projectData = {
        metadata: {
          version: '1.0.0',
          timestamp: Date.now(),
          name: config.name || '未命名项目'
        },
        hero: config,
        settings: {
          language
        },
        actions: customActions
      };
      
      // Trigger download
      exportToFile(projectData, `polyforge_project_${Date.now()}.json`);
      
      // Silent backup to localStorage
      saveToLocal(projectData);
      
      alert('项目已保存！已下载文件并备份到本地存储。');
    } catch (error) {
      console.error('保存项目失败:', error);
      alert('保存项目失败，请查看控制台获取详细信息。');
    }
  };

  const handleLoadProject = async (file: File) => {
    try {
      const projectData = await importFromFile(file);
      
      // Validate imported data
      if (!projectData.hero) {
        throw new Error('导入的文件缺少角色数据');
      }
      
      // Update the current state with imported data
      setConfig(projectData.hero);
      
      // Update language if different
      if (projectData.settings?.language && projectData.settings.language !== i18n.language) {
        i18n.changeLanguage(projectData.settings.language);
      }
      
      // Load custom actions if available
      if (projectData.actions && Array.isArray(projectData.actions)) {
        setCustomActions(projectData.actions);
      } else {
        // If no actions field, initialize with empty array to maintain consistency
        setCustomActions([]);
      }
      
      alert('项目加载成功！角色和动作已更新。');
    } catch (error) {
      console.error('加载项目失败:', error);
      alert(`加载项目失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleExportSettings = () => {
      const settingsData = {
          cameraSettings,
          shadowSettings,
          animationConfig: animConfig 
      };
      const json = JSON.stringify(settingsData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gameplay_config_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const text = event.target?.result as string;
              const json = JSON.parse(text);
              
              let updatedCount = 0;
              if (json.cameraSettings) {
                  setCameraSettings(json.cameraSettings);
                  updatedCount++;
              }
              if (json.shadowSettings) {
                  setShadowSettings(json.shadowSettings);
                  updatedCount++;
              }
              if (json.animationConfig) {
                  setAnimConfig(json.animationConfig);
                  updatedCount++;
              }
              
              if (updatedCount > 0) {
                  alert(`成功导入配置参数 (更新了 ${updatedCount} 项)`);
              } else {
                  alert("未找到有效的配置数据");
              }
          } catch (err) {
              alert("导入失败：文件无效");
          }
      };
      reader.readAsText(file);
      if (settingsInputRef.current) settingsInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-black font-sans">
      <Sidebar 
        currentMode={mode} 
        setMode={handleModeSwitchAttempt} 
        isAiDocked={isAiDocked} 
        onUndock={() => setIsAiDocked(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex-1 relative flex min-w-0 overflow-hidden">
        <div className="flex-1 relative h-full min-w-0">
            <GameCanvas 
                config={config} 
                mode={mode} 
                mapConfig={mapConfig} setMapConfig={handleSetMapConfig} selectedTool={selectedTool}
                gearTransforms={gearTransforms} assetTransforms={assetTransforms}
                onPartSelect={mode === AppMode.MODEL_WORKSHOP && workshopLockState ? undefined : handlePartSelect} onPartRightClick={handlePartRightClick} onBackgroundClick={handleBackgroundClick}
                animConfig={effectiveAnimConfig} 
                previewAction={previewAction} lastAttackTrigger={lastAttackTrigger}
                focusedParentId={focusedParentId}
                primitives={workshopPrimitives} setPrimitives={setWorkshopPrimitives} selectedPrimId={selectedWorkshopPrimId} setSelectedPrimId={setSelectedWorkshopPrimId} transformMode={transformMode} customModels={customModels} workshopRefType={workshopRefType} isSnapping={isSnapping} onHistorySave={handleHistorySave}
                onMapHistorySave={handleMapHistorySave}
                selectedEntityIds={selectedEntityIds}
                setSelectedEntityIds={setSelectedEntityIds}
                savedCharacters={savedCharacters}
                selectedBone={selectedBone}
                overridePose={overridePose}
                setOverridePose={setOverridePose}
                overridePosition={overridePosition}
                setOverridePosition={setOverridePosition}
                activeCustomAction={customActions.find(a => a.id === currentActionId) || null} 
                animTime={animTime}
                cameraMode={cameraMode}
                cameraSettings={cameraSettings}
                referenceOpacity={referenceOpacity}
                isProceduralPaused={isProceduralPaused}
                onTriggerAttack={handleTriggerAttack}
                shadowSettings={shadowSettings}
                customActions={customActions} 
                onBoneChange={handleBoneChange}
                gizmoMode={gizmoMode}
                // VFX Studio Props
                currentVfxAsset={vfxAssets.find(a => a.id === currentVfxAssetId) || undefined}
                vfxTestParams={vfxTestParams}
                // Pass vfxAssets so Character3D can render bindings
                vfxAssets={vfxAssets} 
                // NEW: Gizmo control for VFX Emitters
                selectedVfxEmitterId={selectedVfxEmitterId}
                onVfxEmitterUpdate={currentVfxAssetId ? (emitterId, updates) => handleVfxEmitterUpdate(currentVfxAssetId, emitterId, updates) : undefined}
            />
            {mode === AppMode.GAMEPLAY && (
                <div className="absolute top-4 left-4 z-40 bg-gray-900/80 backdrop-blur border border-gray-700 p-3 rounded-xl shadow-xl flex flex-col gap-2 min-w-[200px]">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">镜头控制</h3>
                    <div className="flex gap-1 mb-2">
                        <button onClick={() => setCameraMode(CameraMode.ISOMETRIC)} className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${cameraMode === CameraMode.ISOMETRIC ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>上帝视角</button>
                        <button onClick={() => setCameraMode(CameraMode.TPS)} className={`flex-1 px-2 py-1 rounded text-[10px] font-bold ${cameraMode === CameraMode.TPS ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>越肩</button>
                    </div>
                    
                    {cameraMode === CameraMode.ISOMETRIC && (
                        <div className="space-y-2 mb-2 pb-2 border-b border-gray-700">
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>视场角 (FOV)</span><span>{cameraSettings.fov}°</span></div>
                                <input type="range" min="10" max="90" value={cameraSettings.fov} onChange={(e) => setCameraSettings(p => ({...p, fov: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>高度 (Height)</span><span>{cameraSettings.height}</span></div>
                                <input type="range" min="5" max="50" value={cameraSettings.height} onChange={(e) => setCameraSettings(p => ({...p, height: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>距离 (Distance)</span><span>{cameraSettings.distance}</span></div>
                                <input type="range" min="5" max="50" value={cameraSettings.distance} onChange={(e) => setCameraSettings(p => ({...p, distance: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 mb-2 pb-2 border-b border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">环境投影</h3>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>不透明度 (Opacity)</span><span>{shadowSettings.opacity}</span></div>
                            <input type="range" min="0" max="1" step="0.05" value={shadowSettings.opacity} onChange={(e) => setShadowSettings(p => ({...p, opacity: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>模糊度 (Blur)</span><span>{shadowSettings.blur}</span></div>
                            <input type="range" min="0" max="5" step="0.1" value={shadowSettings.blur} onChange={(e) => setShadowSettings(p => ({...p, blur: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>垂直偏移 (Y)</span><span>{shadowSettings.offsetY}</span></div>
                            <input type="range" min="-1" max="1" step="0.05" value={shadowSettings.offsetY} onChange={(e) => setShadowSettings(p => ({...p, offsetY: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>水平偏移 X</span><span>{shadowSettings.offsetX}</span></div>
                            <input type="range" min="-2" max="2" step="0.1" value={shadowSettings.offsetX} onChange={(e) => setShadowSettings(p => ({...p, offsetX: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>水平偏移 Z</span><span>{shadowSettings.offsetZ}</span></div>
                            <input type="range" min="-2" max="2" step="0.1" value={shadowSettings.offsetZ} onChange={(e) => setShadowSettings(p => ({...p, offsetZ: parseFloat(e.target.value)}))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] text-gray-400">颜色</span>
                             <input type="color" value={shadowSettings.color} onChange={(e) => setShadowSettings(p => ({...p, color: e.target.value}))} className="w-full h-4 rounded cursor-pointer bg-transparent border-none p-0" />
                        </div>
                    </div>

                    <div className="mt-1 text-[9px] text-gray-500 pb-2 border-b border-gray-700 mb-2">
                        <div className="flex justify-between"><span><b className="text-white">WASD</b> 移动</span> <span><b className="text-white">Shift</b> 奔跑</span></div>
                        <div className="flex justify-between mt-1"><span><b className="text-white">鼠标</b> 瞄准</span> <span><b className="text-white">左键</b> 攻击</span></div>
                    </div>
                    
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">环境与手感配置</h3>
                        <div className="flex gap-1">
                            <input type="file" ref={settingsInputRef} onChange={handleImportSettings} accept=".json" className="hidden" />
                            <button onClick={handleExportSettings} className="flex-1 py-1.5 bg-purple-600/30 hover:bg-purple-600 border border-purple-500 text-purple-100 rounded text-[10px] transition-colors">导出参数</button>
                            <button onClick={() => settingsInputRef.current?.click()} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 rounded text-[10px] transition-colors">导入参数</button>
                        </div>
                    </div>
                </div>
            )}
            {showSaveDialog && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-white shadow-2xl max-w-md w-full">
                         <div className="flex items-center gap-3 mb-4 text-amber-500"><i className="fas fa-exclamation-triangle text-2xl"></i><h2 className="text-xl font-bold text-white">未保存的更改</h2></div>
                         <p className="text-gray-300 mb-8 text-sm leading-relaxed">您在当前场景中进行了修改。如果现在离开，所有未保存的更改都将丢失。<br/>是否要保存更改？</p>
                         <div className="flex gap-3 justify-end"><button onClick={() => setShowSaveDialog(false)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold transition-colors">取消</button><button onClick={handleConfirmDiscard} className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-700 border border-red-800 text-red-200 text-sm font-bold transition-colors">放弃</button><button onClick={handleConfirmSave} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors shadow-lg">保存</button></div>
                    </div>
                </div>
            )}
            
            {deleteTargetId && (
                 <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 border border-red-900/50 rounded-2xl p-8 text-white shadow-2xl max-w-sm w-full relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-600"></div>
                         <div className="flex items-center gap-3 mb-4 text-red-500"><i className="fas fa-trash-alt text-2xl"></i><h2 className="text-xl font-bold text-white">删除资产</h2></div>
                         <p className="text-gray-300 mb-2 text-sm">确定要永久删除这个资产吗？</p>
                         <p className="text-gray-500 mb-8 text-xs italic">如果是系统默认资产，刷新页面后会恢复。自定义资产将无法找回。</p>
                         <div className="flex gap-3 justify-end">
                             <button onClick={() => setDeleteTargetId(null)} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold transition-colors">取消</button>
                             <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors shadow-lg flex items-center gap-2"><i className="fas fa-check"></i> 确认删除</button>
                         </div>
                    </div>
                </div>
            )}
            
            
        </div>
        {mode === AppMode.CHARACTER_EDITOR && (
            <EditorPanel 
                config={config} setConfig={setConfig} setMode={handleModeSwitchAttempt} onFinish={handleEditorFinish} 
                selectedPartId={selectedPartId} setSelectedPartId={setSelectedPartId} 
                focusedParentId={focusedParentId} setFocusedParentId={setFocusedParentId} customModels={customModels}
                currentStep={editorStep} setStep={setEditorStep} weaponCategory={editorWeaponCategory} setWeaponCategory={setEditorWeaponCategory}
                onDeleteCustomModel={handleDeleteCustomModel} onEditCustomModel={handleEditCustomModel} onCreateCustomModel={handleCreateCustomModel}
                onConfigChange={handleConfigChange}
                onHistorySave={handleCharacterHistorySave}
                savedProceduralActions={savedProceduralActions} 
            />
        )}
        {mode === AppMode.ASSET_LIBRARY && (
            <AssetLibraryPanel 
                customModels={customModels} savedCharacters={savedCharacters} 
                onDelete={handleDeleteCustomModel} onEdit={handleEditCustomModel} onCreate={handleCreateCustomModel} onLoadCharacter={handleLoadCharacter} 
                onImportData={handleBatchImportData} 
            />
        )}
        {mode === AppMode.MAP_EDITOR && (
            <MapEditorPanel 
                mapConfig={mapConfig} setMapConfig={handleSetMapConfig} setMode={handleModeSwitchAttempt} selectedTool={selectedTool} setSelectedTool={setSelectedTool} assetTransforms={assetTransforms} setAssetTransforms={setAssetTransforms} customModels={customModels} 
                selectedEntityCount={selectedEntityIds.size} onDeleteSelected={handleDeleteSelectedMapItems} savedCharacters={savedCharacters} 
                onHistorySave={handleMapHistorySave}
            />
        )}
        {mode === AppMode.MODEL_WORKSHOP && (
            <ModelWorkshopPanel 
                initialData={workshopInitialData}
                primitives={workshopPrimitives} setPrimitives={setWorkshopPrimitives} selectedPrimId={selectedWorkshopPrimId} setSelectedPrimId={setSelectedWorkshopPrimId} 
                onSave={saveCustomModel} onExit={handleWorkshopExit} transformMode={transformMode} setTransformMode={setTransformMode} workshopRefType={workshopRefType} setWorkshopRefType={setWorkshopRefType} isSnapping={isSnapping} setIsSnapping={setIsSnapping} onUndo={handleWorkshopUndo} onDuplicate={handleWorkshopDuplicate} onHistorySave={handleHistorySave} 
                setReferenceOpacity={setReferenceOpacity} referenceOpacity={referenceOpacity}
                lockedCategory={workshopLockState?.category}
                lockedSubCategory={workshopLockState?.subCategory}
                suggestion={workshopSuggestion} 
                onDelete={handleDeleteCustomModel} 
            />
        )}
        {mode === AppMode.ACTION_STUDIO && (
            <ActionStudioPanel 
                customActions={customActions} currentActionId={currentActionId} setCurrentActionId={setCurrentActionId} onSaveAction={(a) => { handleActionHistorySave(); setCustomActions(p => { const idx = p.findIndex(x => x.id === a.id); if (idx >= 0) { const n = [...p]; n[idx] = a; return n; } return [...p, a]; }); }} onDeleteAction={(id) => { handleActionHistorySave(); setCustomActions(p => p.filter(a => a.id !== id)); }}
                currentTime={animTime} setCurrentTime={setAnimTime} selectedBone={selectedBone} setSelectedBone={setSelectedBone} onUpdateKeyframe={handleUpdateKeyframe} isPlaying={isPlaying} setIsPlaying={setIsPlaying} animConfig={animConfig} setAnimConfig={setAnimConfig} previewAction={previewAction} setPreviewAction={setPreviewAction} onCreateKeyframe={handleCreateKeyframe} onDeleteKeyframe={handleDeleteKeyframe}
                onHistorySave={handleActionHistorySave}
                
                savedProceduralActions={savedProceduralActions}
                currentProceduralId={currentProceduralId}
                onSaveProceduralAction={handleSaveProceduralAction}
                onDeleteProceduralAction={handleDeleteProceduralAction}
                onSelectProceduralAction={handleSelectProceduralAction}
                
                isProceduralPaused={isProceduralPaused}
                setIsProceduralPaused={setIsProceduralPaused}
                onResetPose={() => { setOverridePose({}); setOverridePosition({}); }} 
                
                onTriggerAttack={handleTriggerAttack}
                config={config} 
                customModels={customModels}
                
                onMoveKeyframe={handleMoveKeyframe}
                onImportActions={handleImportActions}
                gizmoMode={gizmoMode}
                setGizmoMode={setGizmoMode}
                
                onImportProject={handleImportProject} 
                externalRequest={actionStudioRequest} 
            />
        )}
        {mode === AppMode.VFX_STUDIO && (
            <VfxEditorPanel 
                vfxAssets={vfxAssets}
                setVfxAssets={setVfxAssets}
                onExit={() => switchMode(AppMode.CHARACTER_EDITOR)} // Go back to default or previous
                customModels={customModels}
                // Updated Binding Props
                onBindVfx={handleBindVfx}
                onDeleteVfx={handleDeleteVfx}
                // Shared State
                currentVfxAssetId={currentVfxAssetId}
                setCurrentVfxAssetId={setCurrentVfxAssetId}
                testParams={vfxTestParams}
                setTestParams={setVfxTestParams}
                // NEW: Gizmo control for VFX Emitters
                selectedEmitterId={selectedVfxEmitterId}
                setSelectedEmitterId={setSelectedVfxEmitterId}
                onUpdateEmitter={currentVfxAssetId ? (emitterId, updates) => handleVfxEmitterUpdate(currentVfxAssetId, emitterId, updates) : undefined}
            />
        )}
        
        {mode === AppMode.ARCHITECTURE_VALIDATOR && (
            <ArchitectureEditor />
        )}
        
        {/* AI Assistant at the end for z-index layering */}
        {isAiChatVisible && (
          <AIAssistant 
              currentMode={mode} 
              onAiCommand={handleAiCommand} 
              isDocked={isAiDocked}
              onDock={() => setIsAiDocked(true)}
              onTurnOff={() => setIsAiChatVisible(false)}
          />
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isAiChatVisible={isAiChatVisible}
        setIsAiChatVisible={setIsAiChatVisible}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
      />
    </div>
  );
};
