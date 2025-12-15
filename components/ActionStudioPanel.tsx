
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CustomAction, Keyframe, BoneName, AnimationConfig, CharacterAction, ActionInterpolationMode, SavedProceduralAction, ActionCategory, CharacterConfig, CustomModel, CombatStyle } from '../types';
import { generateCharacterAction, generateProceduralConfig } from '../services/aiService';

interface ActionStudioPanelProps {
  customActions: CustomAction[];
  currentActionId: string | null;
  setCurrentActionId: (id: string | null) => void;
  onSaveAction: (action: CustomAction) => void;
  onDeleteAction: (id: string) => void;
  
  // Keyframe Editor State
  currentTime: number; // 0-1
  setCurrentTime: (t: number) => void;
  selectedBone: string | null;
  setSelectedBone: (bone: string | null) => void;
  onUpdateKeyframe: (time: number, bone: string, value: [number, number, number], type?: 'rotation' | 'position') => void; // UPDATED SIG
  onCreateKeyframe?: () => void;
  onDeleteKeyframe?: () => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  // Procedural Animation Props
  animConfig?: AnimationConfig;
  setAnimConfig?: React.Dispatch<React.SetStateAction<AnimationConfig>>;
  previewAction?: CharacterAction;
  setPreviewAction?: (action: CharacterAction) => void;
  
  // Procedural Actions CRUD
  savedProceduralActions?: SavedProceduralAction[];
  currentProceduralId?: string | null;
  onSaveProceduralAction?: (action: SavedProceduralAction) => void;
  onDeleteProceduralAction?: (id: string) => void;
  onSelectProceduralAction?: (id: string) => void;
  
  // Procedural Playback Control
  isProceduralPaused?: boolean;
  setIsProceduralPaused?: (paused: boolean) => void;
  onResetPose?: () => void; // Clear overrides

  onHistorySave?: () => void; // For Undo
  
  // New Trigger for Attack Preview
  onTriggerAttack?: () => void;
  
  // NEW: Config for Smart Filtering
  config?: CharacterConfig;
  customModels?: CustomModel[];
  
  // NEW: Timeline Interaction Props
  onMoveKeyframe?: (actionId: string, kfIndex: number, newTime: number) => void;
  onImportActions?: (actions: CustomAction[]) => void;
  
  // NEW: Project-level Import
  onImportProject?: (data: { customActions?: CustomAction[], savedProceduralActions?: SavedProceduralAction[] }) => void;

  // NEW: Lifted Gizmo State
  gizmoMode?: 'rotate' | 'translate';
  setGizmoMode?: (mode: 'rotate' | 'translate') => void;

  // NEW: External Request for AI Navigation
  externalRequest?: { mode: 'keyframe' | 'procedural', category: ActionCategory } | null;
}

const BONES: {id: BoneName, label: string}[] = [
    { id: 'hips', label: 'Hips (臀部)' },
    { id: 'chest', label: 'Chest (胸部)' },
    { id: 'head', label: 'Head (头部)' },
    { id: 'arm_left', label: 'L. Arm (左大臂)' },
    { id: 'forearm_left', label: 'L. Forearm (左小臂)' },
    { id: 'hand_left', label: 'L. Hand (左手)' },
    { id: 'arm_right', label: 'R. Arm (右大臂)' },
    { id: 'forearm_right', label: 'R. Forearm (右小臂)' },
    { id: 'hand_right', label: 'R. Hand (右手)' },
    { id: 'thigh_left', label: 'L. Thigh (左大腿)' },
    { id: 'calf_left', label: 'L. Calf (左小腿)' },
    { id: 'foot_left', label: 'L. Foot (左脚)' },
    { id: 'thigh_right', label: 'R. Thigh (右大腿)' },
    { id: 'calf_right', label: 'R. Calf (右小腿)' },
    { id: 'foot_right', label: 'R. Foot (右脚)' },
];

export const ActionStudioPanel: React.FC<ActionStudioPanelProps> = ({
    customActions,
    currentActionId,
    setCurrentActionId,
    onSaveAction,
    onDeleteAction,
    currentTime,
    setCurrentTime,
    selectedBone,
    setSelectedBone,
    onUpdateKeyframe,
    onCreateKeyframe,
    onDeleteKeyframe,
    isPlaying,
    setIsPlaying,
    animConfig,
    setAnimConfig,
    previewAction,
    setPreviewAction,
    savedProceduralActions,
    currentProceduralId,
    onSaveProceduralAction,
    onDeleteProceduralAction,
    onSelectProceduralAction,
    isProceduralPaused,
    setIsProceduralPaused,
    onResetPose,
    onHistorySave,
    onTriggerAttack,
    config,
    customModels,
    onMoveKeyframe,
    onImportActions,
    onImportProject,
    gizmoMode = 'rotate',
    setGizmoMode,
    externalRequest
}) => {
    const [editorMode, setEditorMode] = useState<'keyframe' | 'procedural'>('keyframe');
    const [activeCategory, setActiveCategory] = useState<ActionCategory>('idle');
    const [showIncompatible, setShowIncompatible] = useState(false);
    
    // Keyframe State
    const [actionName, setActionName] = useState('New Action');
    const [duration, setDuration] = useState(1.0);
    const [isLoop, setIsLoop] = useState(true);
    const [interpolation, setInterpolation] = useState<ActionInterpolationMode>('linear');
    // const [gizmoMode, setGizmoMode] = useState<'rotate' | 'translate'>('rotate'); // REMOVED LOCAL STATE

    // Procedural State
    const [procName, setProcName] = useState('');
    
    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const projectFileInputRef = useRef<HTMLInputElement>(null);
    
    // Drag State for Timeline
    const [draggingKeyframe, setDraggingKeyframe] = useState<{actionId: string, kfIndex: number} | null>(null);

    const currentAction = customActions.find(a => a.id === currentActionId);
    
    useEffect(() => {
        if (currentAction) {
            setActionName(currentAction.name);
            setDuration(currentAction.duration);
            setIsLoop(currentAction.loop);
            setInterpolation(currentAction.interpolation || 'linear');
            setEditorMode('keyframe'); 
        }
    }, [currentActionId]);

    // Handle External Request (AI Navigation)
    useEffect(() => {
        if (externalRequest) {
            setEditorMode(externalRequest.mode);
            setActiveCategory(externalRequest.category);
        }
    }, [externalRequest]);

    // Reset Gizmo Mode when selecting non-hips
    useEffect(() => {
        if (selectedBone !== 'hips' && setGizmoMode) setGizmoMode('rotate');
    }, [selectedBone, setGizmoMode]);

    // --- HELPER: DETERMINE COMBAT STYLE ---
    const getCombatStyle = useMemo(() => {
        if (!config || !customModels) return CombatStyle.UNARMED;
        const weaponId = config.gear.weapon;
        if (!weaponId || weaponId === 'none') return CombatStyle.UNARMED;

        const model = customModels.find(m => m.id === weaponId);
        
        // 1. Check Subcategory (Most Reliable)
        if (model?.subCategory === 'one_handed') return CombatStyle.MELEE_1H;
        if (model?.subCategory === 'two_handed') return CombatStyle.MELEE_2H;
        
        // 2. Fallback: Check ID strings
        if (weaponId.includes('bow') || weaponId.includes('gun') || weaponId.includes('wand') || weaponId.includes('staff')) return CombatStyle.RANGED;
        if (weaponId.includes('sword') || weaponId.includes('axe') || weaponId.includes('hammer') || weaponId.includes('dagger')) return CombatStyle.MELEE_1H;

        return CombatStyle.MELEE_1H; // Default fallback
    }, [config, customModels]);

    // --- ATTACK PREVIEW LOOP ---
    useEffect(() => {
        let interval: any;
        // Check Linked Action for preview duration for ALL categories if needed, but primarily Attack needs precise triggering
        if (editorMode === 'procedural' && activeCategory === 'attack' && !isProceduralPaused && onTriggerAttack) {
            // Trigger immediately
            onTriggerAttack();
            
            // Calculate Loop Duration
            let cycleTime = 1500;
            const speedMult = animConfig?.attack.speedMult || 1.0;

            if (animConfig?.attack.linkedActionId) {
                 const linkedAction = customActions.find(a => a.id === animConfig.attack.linkedActionId);
                 // If linked action exists, use its duration for perfect loop
                 if (linkedAction) {
                     const baseDuration = linkedAction.duration > 0 ? linkedAction.duration : 1.0;
                     // SpeedMult is calculated as (0.6 / baseDuration). 
                     // Duration in game = baseDuration. 
                     // We add a small buffer for "rest" pose.
                     cycleTime = (baseDuration * 1000) + 200; 
                 } else {
                     const animDur = (0.6 / speedMult) * 1000;
                     cycleTime = animDur + 300; 
                 }
            } else {
                 cycleTime = Math.max(500, (1000 / speedMult) + 500); 
            }
            
            interval = setInterval(() => {
                onTriggerAttack();
            }, cycleTime);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [editorMode, activeCategory, isProceduralPaused, animConfig?.attack.speedMult, animConfig?.attack.linkedActionId, customActions]);

    // --- SPACEBAR PLAYBACK ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && editorMode === 'keyframe' && currentActionId) {
                // Avoid triggering if typing in an input
                const tag = (e.target as HTMLElement).tagName;
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    e.preventDefault();
                    
                    // Logic fix: if starting playback from end, rewind to 0
                    if (!isPlaying && currentTime >= 0.99) {
                        setCurrentTime(0);
                    }
                    setIsPlaying(!isPlaying);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editorMode, currentActionId, isPlaying, currentTime]);

    // --- MODE SWITCHING & STATE CLEANUP ---
    const handleSwitchToKeyframe = () => {
        setEditorMode('keyframe');
        if (setPreviewAction) setPreviewAction(CharacterAction.IDLE);
        if (setIsProceduralPaused) setIsProceduralPaused(false);
        if (onResetPose) onResetPose();
    };

    const handleSwitchToProcedural = () => {
        setEditorMode('procedural');
        setCurrentActionId(null);
        setIsPlaying(false);
        if (onResetPose) onResetPose();
        updatePreviewForCategory(activeCategory);
    };

    const updatePreviewForCategory = (cat: ActionCategory) => {
        if (!setPreviewAction) return;
        const map: Record<string, CharacterAction> = {
            idle: CharacterAction.IDLE,
            walk: CharacterAction.WALK,
            run: CharacterAction.RUN,
            attack: CharacterAction.ATTACK,
            special: CharacterAction.IDLE
        };
        setPreviewAction(map[cat] || CharacterAction.IDLE);
    };
    
    useEffect(() => {
        if (editorMode === 'procedural') {
            updatePreviewForCategory(activeCategory);
        }
    }, [activeCategory]);

    const filteredKeyframeActions = customActions.filter(a => (a.category || 'idle') === activeCategory);
    
    // --- SMART FILTERING ---
    const filteredProceduralActions = (savedProceduralActions || []).filter(a => {
        if (a.category !== activeCategory) return false;
        if (activeCategory !== 'attack') return true; // Only filter attacks for now
        if (showIncompatible) return true;
        
        // If action has NO style defined, assume universal
        if (!a.compatibleStyles || a.compatibleStyles.length === 0) return true;
        
        // Check if current style is in compatible list
        // MELEE_1H and MELEE_2H often share animations
        const currentStyle = getCombatStyle;
        if (a.compatibleStyles.includes(currentStyle)) return true;
        
        // Loose matching for Melee
        if ((currentStyle === CombatStyle.MELEE_1H || currentStyle === CombatStyle.MELEE_2H) && 
            (a.compatibleStyles.includes(CombatStyle.MELEE_1H) || a.compatibleStyles.includes(CombatStyle.MELEE_2H))) {
            return true;
        }

        return false;
    });

    // --- SELECTION HANDLERS ---
    const selectKeyframeAction = (id: string) => {
        if (onSelectProceduralAction) onSelectProceduralAction(''); 
        setCurrentActionId(id);
        setIsPlaying(false);
        if (setPreviewAction) setPreviewAction(CharacterAction.IDLE); 
        setEditorMode('keyframe');
    };

    const selectProceduralAction = (act: SavedProceduralAction) => {
        setCurrentActionId(null); 
        if (onSelectProceduralAction) onSelectProceduralAction(act.id);
        if (setAnimConfig) setAnimConfig(JSON.parse(JSON.stringify(act.config)));
        setProcName(act.name); // NEW: Auto-populate name
        updatePreviewForCategory(act.category);
        setEditorMode('procedural');
    };

    // --- DUPLICATE KEYFRAME ACTION ---
    const handleDuplicateKeyframeAction = () => {
        if (!currentAction) return;
        if (onHistorySave) onHistorySave();

        // 1. Deep Copy
        const newAction = JSON.parse(JSON.stringify(currentAction));
        
        // 2. New ID and Name
        newAction.id = `action_${activeCategory}_${Math.random().toString(36).substr(2,9)}`;
        newAction.name = `${currentAction.name} (Copy)`;
        
        // 3. Save
        onSaveAction(newAction);
        
        // 4. Select New Action
        selectKeyframeAction(newAction.id);
        alert("动作已复制！");
    };

    // --- CONVERTER / LINKER LOGIC (UPDATED) ---
    const handleConvertKeyframeToProcedural = () => {
        const sourceAction = currentAction; 
        if (!sourceAction || !animConfig || !setAnimConfig) return;

        const actionDur = sourceAction.duration > 0 ? sourceAction.duration : 1.0;
        const calculatedSpeed = parseFloat((0.6 / actionDur).toFixed(2));
        
        const newConfig = { ...animConfig };
        let newStyles: CombatStyle[] | undefined = undefined;
        
        if (activeCategory === 'attack') {
            const currentStyle = getCombatStyle;
            
            // Auto-detect AnimType for Config
            let animType: 'melee' | 'ranged' | 'unarmed' = 'melee';
            if (currentStyle === CombatStyle.RANGED) animType = 'ranged';
            else if (currentStyle === CombatStyle.UNARMED) animType = 'unarmed';

            newConfig.attack = {
                ...newConfig.attack,
                linkedActionId: sourceAction.id,
                speedMult: calculatedSpeed, 
                decay: 0.5,
                animType: animType
            };
            newStyles = [currentStyle];
        } else if (activeCategory === 'idle') {
            newConfig.idle = { 
                ...newConfig.idle, 
                linkedActionId: sourceAction.id,
                // Optional: Adjust speed based on duration if needed, but for idle we mostly rely on linked action's natural loop
            };
        } else if (activeCategory === 'walk') {
            newConfig.walk = { 
                ...newConfig.walk, 
                linkedActionId: sourceAction.id,
                // We keep speed logic for procedural blending, but the loop is driven by Keyframe duration
            };
        } else if (activeCategory === 'run') {
            newConfig.run = { 
                ...newConfig.run, 
                linkedActionId: sourceAction.id,
            };
        }

        setAnimConfig(newConfig);
        
        const newId = `proc_custom_${Math.random().toString(36).substr(2,9)}`;
        const newAction: SavedProceduralAction = {
            id: newId,
            name: `${sourceAction.name} (Custom)`,
            category: activeCategory,
            config: newConfig,
            compatibleStyles: newStyles
        };
        if (onSaveProceduralAction) onSaveProceduralAction(newAction);
        if (onSelectProceduralAction) onSelectProceduralAction(newId);
        setProcName(newAction.name); // Set name for editing
        
        handleSwitchToProcedural();
        alert(`绑定成功！程序化${activeCategory}动作现在由关键帧动作 "${sourceAction.name}" 驱动。`);
    };
    
    const handleUnlinkAction = () => {
        if (!animConfig || !setAnimConfig) return;
        const newConfig = { ...animConfig };
        if (activeCategory === 'attack') {
            newConfig.attack = { ...newConfig.attack, linkedActionId: undefined };
        } else if (activeCategory === 'idle') {
            newConfig.idle = { ...newConfig.idle, linkedActionId: undefined };
        } else if (activeCategory === 'walk') {
            newConfig.walk = { ...newConfig.walk, linkedActionId: undefined };
        } else if (activeCategory === 'run') {
            newConfig.run = { ...newConfig.run, linkedActionId: undefined };
        }
        setAnimConfig(newConfig);
    };

    // --- ACTION CREATION (NON-EMPTY DEFAULT) ---
    const handleCreateKeyframeAction = () => {
        if (onHistorySave) onHistorySave();
        const newId = `action_${activeCategory}_${Math.random().toString(36).substr(2,9)}`;
        
        // Create a basic pose so it's not invisible
        const defaultKeyframes: Keyframe[] = activeCategory === 'attack' 
            ? [
                { time: 0, boneRotations: { arm_right: [0, 0, 0.2], forearm_right: [0, 0, 0.5] } },
                { time: 0.4, boneRotations: { arm_right: [-1.5, 0.5, 0.5], forearm_right: [0, 0, 0.1], chest: [0, -0.5, 0] } },
                { time: 1, boneRotations: { arm_right: [0, 0, 0.2], forearm_right: [0, 0, 0.5], chest: [0, 0, 0] } }
              ]
            : [{ time: 0, boneRotations: {} }, { time: 1, boneRotations: {} }];

        const newAction: CustomAction = {
            id: newId,
            name: `New ${activeCategory}`,
            category: activeCategory,
            duration: 1.0,
            loop: true, // ALWAYS LOOP FOR EDITING CONVENIENCE
            interpolation: 'linear',
            keyframes: defaultKeyframes
        };
        onSaveAction(newAction);
        selectKeyframeAction(newId);
    };

    // --- NEW SAVE LOGIC (Overwrite or Create) ---
    const handleSaveProcedural = () => {
        if (!onSaveProceduralAction || !animConfig) return;
        if (onHistorySave) onHistorySave(); // Call History Save
        const nameToUse = procName.trim() || `${activeCategory.toUpperCase()} Config`;
        
        // If we have an active ID, use it (OVERWRITE), otherwise create new
        const idToUse = currentProceduralId || `proc_${activeCategory}_${Math.random().toString(36).substr(2,9)}`;

        const newAction: SavedProceduralAction = {
            id: idToUse,
            name: nameToUse,
            category: activeCategory,
            config: JSON.parse(JSON.stringify(animConfig)),
            compatibleStyles: activeCategory === 'attack' ? [getCombatStyle] : undefined
        };
        onSaveProceduralAction(newAction);
        // If it was new, select it now
        if (!currentProceduralId) {
            onSelectProceduralAction && onSelectProceduralAction(idToUse);
        }
    };

    // --- NEW DUPLICATE LOGIC ---
    const handleDuplicateProcedural = () => {
        if (!onSaveProceduralAction || !animConfig) return;
        if (onHistorySave) onHistorySave(); // Call History Save
        const baseName = procName.trim() || `${activeCategory.toUpperCase()}`;
        const nameToUse = `${baseName} (Copy)`;
        
        const newId = `proc_${activeCategory}_${Math.random().toString(36).substr(2,9)}`;
        const newAction: SavedProceduralAction = {
            id: newId,
            name: nameToUse,
            category: activeCategory,
            config: JSON.parse(JSON.stringify(animConfig)),
            compatibleStyles: activeCategory === 'attack' ? [getCombatStyle] : undefined
        };
        onSaveProceduralAction(newAction);
        onSelectProceduralAction && onSelectProceduralAction(newId); // Switch to copy
        setProcName(nameToUse);
    };

    const updateActionProperty = (key: keyof CustomAction, value: any) => {
        if (!currentAction) return;
        if (key === 'name') setActionName(value);
        if (key === 'duration') setDuration(value);
        if (key === 'loop') setIsLoop(value);
        if (key === 'interpolation') setInterpolation(value);
        onSaveAction({ ...currentAction, [key]: value });
    };

    const updateAnimConfig = (category: keyof AnimationConfig, key: string, value: any) => {
        if (!setAnimConfig) return;
        setAnimConfig(prev => ({ ...prev, [category]: { ...prev[category], [key]: value } }));
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        
        // CAPTURE CONTEXT to ensure safety during async
        const targetCategory = activeCategory;
        const targetMode = editorMode;

        setIsGenerating(true);
        if (onHistorySave) onHistorySave();

        if (targetMode === 'keyframe') {
            const action = await generateCharacterAction(aiPrompt);
            if (action) {
                // FORCE Consistency: Ensure the generated action matches the TARGET category (closure)
                action.category = targetCategory;
                
                onSaveAction(action);
                
                // AUTO-SWITCH BACK if user navigated away
                if (activeCategory !== targetCategory) {
                    setActiveCategory(targetCategory);
                }
                if (editorMode !== 'keyframe') {
                    setEditorMode('keyframe');
                }

                selectKeyframeAction(action.id);
                setAiPrompt('');
            } else {
                alert("生成失败，请重试。");
            }
        } else {
            // PROCEDURAL
            if (setAnimConfig && onSaveProceduralAction && animConfig) {
                const partialConfig = await generateProceduralConfig(aiPrompt, targetCategory);
                if (partialConfig) {
                    setAnimConfig(prev => {
                        const newAnimConfig = { ...prev };
                        if (partialConfig[targetCategory]) {
                            // @ts-ignore
                            newAnimConfig[targetCategory] = { ...newAnimConfig[targetCategory], ...partialConfig[targetCategory] };
                        }
                        
                        // Save as new Procedural Action
                        const newId = `proc_ai_${Math.random().toString(36).substr(2, 9)}`;
                        const newAction: SavedProceduralAction = {
                            id: newId,
                            name: `AI: ${aiPrompt.substring(0, 12)}`, 
                            category: targetCategory,
                            config: newAnimConfig // Save the RESULT
                        };
                        
                        setTimeout(() => {
                             onSaveProceduralAction(newAction);
                             
                             if (activeCategory !== targetCategory) setActiveCategory(targetCategory);
                             if (editorMode !== 'procedural') setEditorMode('procedural');
                             
                             if (onSelectProceduralAction) onSelectProceduralAction(newId);
                             setProcName(newAction.name); 
                        }, 0);

                        return newAnimConfig;
                    });
                    
                    setAiPrompt('');
                } else {
                    alert("生成失败，请重试。");
                }
            }
        }
        setIsGenerating(false);
    };

    // --- IMPORT/EXPORT LOGIC ---
    
    // 1. Keyframe Actions Export (Legacy)
    const handleExportActions = () => {
        const json = JSON.stringify(customActions, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Use current action name if selected, else timestamp
        const fileName = currentAction ? currentAction.name.replace(/[^a-z0-9_\u4e00-\u9fa5]/gi, '_').toLowerCase() : `actions_library_${Date.now()}`;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 2. Project Export (Full Library) - Procedural Mode
    const handleExportProject = () => {
        const projectData = {
            customActions: customActions,
            savedProceduralActions: savedProceduralActions || []
        };
        const json = JSON.stringify(projectData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `polyforge_project_actions_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Keyframe File Select
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImportActions) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                const actions: CustomAction[] = Array.isArray(json) ? json : (json.id && json.keyframes ? [json] : []);
                if (actions.length > 0) {
                    onImportActions(actions);
                } else {
                    alert("文件格式不正确，未找到动作数据。");
                }
            } catch (err) {
                alert("导入失败：文件无效");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Project File Select
    const handleProjectFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onImportProject) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);
                
                // Validate if it has either customActions or savedProceduralActions
                if (Array.isArray(json.customActions) || Array.isArray(json.savedProceduralActions)) {
                    onImportProject(json);
                } else if (Array.isArray(json)) {
                    // Fallback for raw actions array
                    onImportProject({ customActions: json });
                } else {
                    alert("文件格式不正确，未找到工程数据。");
                }
            } catch (err) {
                alert("导入失败：文件无效");
            }
        };
        reader.readAsText(file);
        if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    };

    // --- TIMELINE DRAGGING LOGIC ---
    const handleDotMouseDown = (e: React.MouseEvent, actionId: string, idx: number) => {
        e.stopPropagation();
        e.preventDefault();
        // IMPORTANT: Save history BEFORE starting a manipulation
        if (onHistorySave) onHistorySave();
        setDraggingKeyframe({ actionId, kfIndex: idx });
        setIsPlaying(false);
    };

    const handleTimelineMouseMove = (e: React.MouseEvent) => {
        if (!draggingKeyframe || !onMoveKeyframe) return;
        const rect = e.currentTarget.getBoundingClientRect();
        let newTime = (e.clientX - rect.left) / rect.width;
        newTime = Math.max(0, Math.min(1, newTime));
        
        // Round to nearest 0.01
        newTime = Math.round(newTime * 100) / 100;
        
        onMoveKeyframe(draggingKeyframe.actionId, draggingKeyframe.kfIndex, newTime);
        setCurrentTime(newTime);
    };

    const handleTimelineMouseUp = () => {
        setDraggingKeyframe(null);
    };

    // Global mouse up for drag end
    useEffect(() => {
        const handleUp = () => { if (draggingKeyframe) setDraggingKeyframe(null); };
        window.addEventListener('mouseup', handleUp);
        return () => window.removeEventListener('mouseup', handleUp);
    }, [draggingKeyframe]);

    // Check if current category has a linked action
    const currentLinkedActionId = animConfig ? (
        activeCategory === 'attack' ? animConfig.attack.linkedActionId :
        activeCategory === 'idle' ? animConfig.idle.linkedActionId :
        activeCategory === 'walk' ? animConfig.walk.linkedActionId :
        activeCategory === 'run' ? animConfig.run.linkedActionId : undefined
    ) : undefined;

    return (
        <div className="absolute inset-0 pointer-events-none z-20 font-sans animate-fade-in">
            
            {/* 1. LEFT PANEL: LIBRARY ONLY */}
            <div className="absolute left-20 top-4 bottom-4 w-64 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-r-xl shadow-2xl pointer-events-auto flex flex-col">
                <div className="flex border-b border-gray-700">
                    <button onClick={handleSwitchToKeyframe} className={`flex-1 py-3 text-[10px] font-bold uppercase ${editorMode === 'keyframe' ? 'bg-purple-600/20 text-purple-300 border-b-2 border-purple-500' : 'text-gray-500 hover:text-white'}`}><i className="fas fa-film mr-1"></i> 关键帧</button>
                    <button onClick={handleSwitchToProcedural} className={`flex-1 py-3 text-[10px] font-bold uppercase ${editorMode === 'procedural' ? 'bg-blue-600/20 text-blue-300 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}><i className="fas fa-cogs mr-1"></i> 程序化</button>
                </div>
                <div className="p-2 grid grid-cols-5 gap-1 border-b border-gray-800 bg-gray-900/50">
                    {[{ id: 'idle', icon: 'fa-clock' }, { id: 'walk', icon: 'fa-walking' }, { id: 'run', icon: 'fa-running' }, { id: 'attack', icon: 'fa-khanda' }, { id: 'special', icon: 'fa-star' }].map(cat => (
                        <button key={cat.id} onClick={() => setActiveCategory(cat.id as ActionCategory)} className={`h-8 rounded flex items-center justify-center transition-all ${activeCategory === cat.id ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-800 hover:text-gray-300'}`} title={cat.id.toUpperCase()}><i className={`fas ${cat.icon} text-xs`}></i></button>
                    ))}
                </div>
                
                {/* SMART FILTER INDICATOR */}
                {editorMode === 'procedural' && activeCategory === 'attack' && (
                    <div className="px-3 py-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                        <div className="text-[9px] text-gray-400">
                            当前武器: <span className="text-white font-bold">{getCombatStyle}</span>
                        </div>
                        <label className="flex items-center gap-1 text-[9px] text-gray-500 cursor-pointer">
                            <input type="checkbox" checked={showIncompatible} onChange={e => setShowIncompatible(e.target.checked)} className="rounded bg-gray-700 border-gray-600"/>
                            显示全部
                        </label>
                    </div>
                )}

                <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {editorMode === 'keyframe' ? (
                        filteredKeyframeActions.map(action => (
                            <div key={action.id} onClick={() => selectKeyframeAction(action.id)} className={`p-2 rounded border flex justify-between items-center group cursor-pointer text-xs ${currentActionId === action.id ? 'bg-purple-900/30 border-purple-500/50 text-white' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800'}`}>
                                <span className="truncate">{action.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteAction(action.id); }} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><i className="fas fa-trash"></i></button>
                            </div>
                        ))
                    ) : (
                        filteredProceduralActions.length > 0 ? filteredProceduralActions.map(act => (
                            <div key={act.id} onClick={() => selectProceduralAction(act)} className={`p-2 rounded border flex justify-between items-center group cursor-pointer text-xs ${currentProceduralId === act.id ? 'bg-blue-900/30 border-blue-500/50 text-white' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800'}`}>
                                <div className="flex flex-col min-w-0">
                                    <span className="truncate">{act.name}</span>
                                    {act.category === 'attack' && (
                                        <div className="flex gap-1 mt-0.5">
                                            {act.compatibleStyles?.map(s => (
                                                <span key={s} className="text-[7px] bg-gray-700 px-1 rounded text-gray-300">{s.split('_')[0]}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteProceduralAction && onDeleteProceduralAction(act.id); }} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><i className="fas fa-trash"></i></button>
                            </div>
                        )) : (
                            <div className="text-center py-4 text-gray-500 text-[10px]">没有匹配的动作<br/>(尝试勾选"显示全部")</div>
                        )
                    )}
                </div>
                <div className="p-3 border-t border-gray-800 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button onClick={editorMode === 'keyframe' ? handleCreateKeyframeAction : () => { setProcName(`New ${activeCategory}`); onSelectProceduralAction && onSelectProceduralAction(''); }} className={`flex-grow py-2 rounded text-xs font-bold text-white shadow-lg flex items-center justify-center gap-1 ${editorMode === 'keyframe' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                            <i className="fas fa-plus"></i> 新建
                        </button>
                        {/* TOGGLE FLOATING PANEL INSTEAD OF MODAL */}
                        <button onClick={() => setShowAiModal(!showAiModal)} className={`w-10 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold rounded shadow-lg flex items-center justify-center ${showAiModal ? 'ring-2 ring-purple-300' : ''}`} title="AI 动作助手">
                            <i className="fas fa-magic"></i>
                        </button>
                    </div>
                    
                    {/* KEYFRAME IMPORT/EXPORT BUTTONS */}
                    {editorMode === 'keyframe' && (
                        <div className="flex gap-2 pt-2 border-t border-gray-800 mt-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".json" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 rounded text-[10px]" title="导入动作库"><i className="fas fa-file-import"></i> 导入</button>
                            <button onClick={handleExportActions} className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 rounded text-[10px]" title="导出动作库"><i className="fas fa-file-export"></i> 导出</button>
                        </div>
                    )}

                    {/* PROCEDURAL (FULL PROJECT) IMPORT/EXPORT BUTTONS */}
                    {editorMode === 'procedural' && (
                        <div className="flex gap-2 pt-2 border-t border-gray-800 mt-1">
                            <input type="file" ref={projectFileInputRef} onChange={handleProjectFileSelect} accept=".json" className="hidden" />
                            <button onClick={() => projectFileInputRef.current?.click()} className="flex-1 py-1.5 bg-blue-900/30 hover:bg-blue-800/50 text-blue-200 border border-blue-800/50 rounded text-[10px]" title="导入工程"><i className="fas fa-file-import"></i> 导入工程</button>
                            <button onClick={handleExportProject} className="flex-1 py-1.5 bg-blue-900/30 hover:bg-blue-800/50 text-blue-200 border border-blue-800/50 rounded text-[10px]" title="导出工程"><i className="fas fa-file-export"></i> 导出工程</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. RIGHT PANEL: UNIFIED INSPECTOR */}
            <div className="absolute right-4 top-4 bottom-32 w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl pointer-events-auto flex flex-col animate-slide-in-right">
                
                {/* Header */}
                <div className="flex border-b border-gray-800 px-4 py-3 items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                        <i className="fas fa-sliders-h mr-2"></i> 
                        {editorMode === 'keyframe' ? '关键帧属性' : '程序化参数'}
                    </h3>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                    {editorMode === 'keyframe' && currentAction ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">名称</label>
                                <div className="flex gap-2">
                                    <input value={actionName} onChange={(e) => updateActionProperty('name', e.target.value)} className="flex-grow bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white focus:border-purple-500 outline-none" />
                                    <button onClick={handleDuplicateKeyframeAction} className="px-3 bg-gray-800 hover:bg-purple-600 border border-gray-700 text-gray-300 hover:text-white rounded text-xs" title="复制动作"><i className="fas fa-copy"></i></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">时长 (s)</label><input type="number" step="0.1" value={duration} onChange={(e) => updateActionProperty('duration', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white" /></div>
                                <div><label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">插值</label><select value={interpolation} onChange={(e) => updateActionProperty('interpolation', e.target.value as any)} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs text-white outline-none"><option value="linear">线性</option><option value="step">步进</option><option value="easeInOut">平滑</option></select></div>
                            </div>
                            
                            {/* BONE SELECTION & GIZMO MODE */}
                            <div className="border-t border-gray-800 pt-4">
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2">选择骨骼 (点击编辑)</label>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar bg-gray-800/50 rounded p-1">
                                    {BONES.map(bone => (
                                        <button key={bone.id} onClick={() => setSelectedBone(bone.id)} className={`w-full text-left px-3 py-1.5 rounded text-[10px] flex items-center justify-between ${selectedBone === bone.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                                            <span>{bone.label}</span>
                                            {selectedBone === bone.id && <i className="fas fa-pen text-[8px]"></i>}
                                        </button>
                                    ))}
                                </div>
                                {selectedBone === 'hips' && (
                                    <div className="mt-2 flex gap-1 p-1 bg-gray-800 rounded">
                                        <button onClick={() => setGizmoMode && setGizmoMode('rotate')} className={`flex-1 py-1 text-[9px] font-bold rounded ${gizmoMode === 'rotate' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>旋转 (Rotate)</button>
                                        <button onClick={() => setGizmoMode && setGizmoMode('translate')} className={`flex-1 py-1 text-[9px] font-bold rounded ${gizmoMode === 'translate' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>位移 (Move)</button>
                                    </div>
                                )}
                            </div>

                            {/* CONVERTER BUTTON (Inside Properties) */}
                            <div className="mt-4 pt-4 border-t border-gray-800">
                                <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                                    <div className="text-[10px] text-blue-300 font-bold mb-1"><i className="fas fa-link mr-1"></i> 绑定到程序化</div>
                                    <p className="text-[9px] text-gray-500 mb-2">将此关键帧动作设为源，自动同步速度并驱动程序化播放。</p>
                                    <button onClick={handleConvertKeyframeToProcedural} className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded">绑定并转换</button>
                                </div>
                            </div>
                        </div>
                    ) : editorMode === 'procedural' && animConfig ? (
                        <div className="space-y-4">
                            <div className="flex gap-2 mb-2">
                                <input value={procName} onChange={(e) => setProcName(e.target.value)} placeholder="配置名称..." className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white" />
                                <button onClick={handleDuplicateProcedural} className="bg-gray-700 hover:bg-gray-600 px-2 rounded text-white text-xs" title="另存为/复制"><i className="fas fa-clone"></i></button>
                                <button onClick={handleSaveProcedural} className="bg-blue-600 px-3 rounded text-white text-xs font-bold hover:bg-blue-500" title="保存/覆盖"><i className="fas fa-save"></i></button>
                            </div>
                            <div className="space-y-4">
                                {/* LINKED ACTION INDICATOR - GENERIC */}
                                {currentLinkedActionId && (
                                    <div className="p-2 bg-purple-900/30 border border-purple-500/30 rounded flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <i className="fas fa-link text-purple-400"></i>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] text-purple-300 font-bold">已绑定关键帧动作</div>
                                                <div className="text-[8px] text-purple-400/70 truncate">{customActions.find(a=>a.id===currentLinkedActionId)?.name || 'Unknown ID'}</div>
                                            </div>
                                        </div>
                                        <button onClick={handleUnlinkAction} className="w-full py-1 bg-red-900/50 hover:bg-red-700 text-red-200 text-[9px] rounded">解除绑定</button>
                                    </div>
                                )}

                                {/* EXPANDED SLIDERS */}
                                {activeCategory === 'idle' && (
                                    <>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>呼吸速度</span><span>{animConfig.idle.speed}</span></div><input type="range" min="0.5" max="5" step="0.1" value={animConfig.idle.speed} onChange={(e) => updateAnimConfig('idle', 'speed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-green-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>呼吸幅度</span><span>{animConfig.idle.amplitude}</span></div><input type="range" min="0" max="0.2" step="0.01" value={animConfig.idle.amplitude} onChange={(e) => updateAnimConfig('idle', 'amplitude', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-green-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>身体摇晃 (Sway)</span><span>{animConfig.idle.sway}</span></div><input type="range" min="0" max="0.1" step="0.01" value={animConfig.idle.sway || 0.02} onChange={(e) => updateAnimConfig('idle', 'sway', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-green-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>头部微动 (Head Bob)</span><span>{animConfig.idle.headBob}</span></div><input type="range" min="0" max="0.05" step="0.005" value={animConfig.idle.headBob || 0.01} onChange={(e) => updateAnimConfig('idle', 'headBob', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-green-500" /></div>
                                    </>
                                )}
                                {(activeCategory === 'walk' || activeCategory === 'run') && (
                                    <>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>速度</span><span>{animConfig[activeCategory].speed}</span></div><input type="range" min="2" max="25" step="0.5" value={animConfig[activeCategory].speed} onChange={(e) => updateAnimConfig(activeCategory, 'speed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>腿幅</span><span>{animConfig[activeCategory].legAmplitude}</span></div><input type="range" min="0.2" max="1.5" step="0.1" value={animConfig[activeCategory].legAmplitude} onChange={(e) => updateAnimConfig(activeCategory, 'legAmplitude', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>颠簸 (Bounce)</span><span>{animConfig[activeCategory].bounciness}</span></div><input type="range" min="0" max="0.3" step="0.01" value={animConfig[activeCategory].bounciness || 0.1} onChange={(e) => updateAnimConfig(activeCategory, 'bounciness', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>抬膝高度 (Knee)</span><span>{animConfig[activeCategory].kneeBend}</span></div><input type="range" min="0.5" max="3.0" step="0.1" value={animConfig[activeCategory].kneeBend || 1.5} onChange={(e) => updateAnimConfig(activeCategory, 'kneeBend', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>双脚间距 (Width)</span><span>{animConfig[activeCategory].stepWidth}</span></div><input type="range" min="0" max="0.6" step="0.05" value={animConfig[activeCategory].stepWidth || 0.2} onChange={(e) => updateAnimConfig(activeCategory, 'stepWidth', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>手臂摆动 (Arm Amp)</span><span>{animConfig[activeCategory].armAmplitude}</span></div><input type="range" min="0" max="1.5" step="0.1" value={animConfig[activeCategory].armAmplitude} onChange={(e) => updateAnimConfig(activeCategory, 'armAmplitude', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>手臂开合 (Span)</span><span>{animConfig[activeCategory].armSpan}</span></div><input type="range" min="0" max="1.0" step="0.1" value={animConfig[activeCategory].armSpan || 0.1} onChange={(e) => updateAnimConfig(activeCategory, 'armSpan', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>手臂前后 (Arm Rot)</span><span>{animConfig[activeCategory].armRotation}</span></div><input type="range" min="-1.5" max="1.5" step="0.1" value={animConfig[activeCategory].armRotation || 0} onChange={(e) => updateAnimConfig(activeCategory, 'armRotation', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>脊柱扭转 (Spine)</span><span>{animConfig[activeCategory].spineRotation}</span></div><input type="range" min="0" max="0.5" step="0.05" value={animConfig[activeCategory].spineRotation || 0.1} onChange={(e) => updateAnimConfig(activeCategory, 'spineRotation', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-blue-500" /></div>
                                    </>
                                )}
                                {activeCategory === 'attack' && (
                                    <>
                                        <h4 className="text-[9px] font-bold text-gray-500 uppercase mt-4 mb-2 border-b border-gray-700">上半身 (动作)</h4>
                                        <button onClick={onTriggerAttack} className="w-full py-2 mb-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold flex items-center justify-center gap-2"><i className="fas fa-bullseye"></i> 手动触发攻击</button>

                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>速度倍率</span><span>{animConfig.attack.speedMult}</span></div><input type="range" min="0.5" max="3" step="0.1" value={animConfig.attack.speedMult} onChange={(e) => updateAnimConfig('attack', 'speedMult', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>
                                        {/* Hide Intensity if linked, as Keyframes handle pose */}
                                        {!animConfig.attack.linkedActionId && (
                                            <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>力度</span><span>{animConfig.attack.intensity}</span></div><input type="range" min="0.5" max="2" step="0.1" value={animConfig.attack.intensity} onChange={(e) => updateAnimConfig('attack', 'intensity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>
                                        )}
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>恢复速度 (Decay)</span><span>{animConfig.attack.decay}</span></div><input type="range" min="0.1" max="1.0" step="0.1" value={animConfig.attack.decay || 0.5} onChange={(e) => updateAnimConfig('attack', 'decay', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>
                                        
                                        <div className="flex items-center justify-between text-[9px] text-gray-400 mt-2 p-1 border border-gray-700 rounded bg-gray-800">
                                            <span>允许移动攻击</span>
                                            <input 
                                                type="checkbox" 
                                                checked={animConfig.attack.allowMovement ?? false} 
                                                onChange={(e) => updateAnimConfig('attack', 'allowMovement', e.target.checked)} 
                                                className="rounded bg-gray-700 border-gray-600 accent-red-500" 
                                            />
                                        </div>

                                        <h4 className="text-[9px] font-bold text-gray-500 uppercase mt-4 mb-2 border-b border-gray-700">下半身 (站姿 - 仅静止时生效)</h4>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>后坐力 (Recoil)</span><span>{animConfig.attack.recoil}</span></div><input type="range" min="0" max="0.5" step="0.05" value={animConfig.attack.recoil || 0.2} onChange={(e) => updateAnimConfig('attack', 'recoil', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>站姿跨度 (Stance Width)</span><span>{animConfig.attack.legSpread}</span></div><input type="range" min="0" max="1.0" step="0.05" value={animConfig.attack.legSpread ?? 0.4} onChange={(e) => updateAnimConfig('attack', 'legSpread', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>
                                        <div className="space-y-1"><div className="flex justify-between text-[9px] text-gray-400"><span>战斗蹲姿 (Crouch)</span><span>{animConfig.attack.kneeBend}</span></div><input type="range" min="0" max="0.5" step="0.05" value={animConfig.attack.kneeBend ?? 0.15} onChange={(e) => updateAnimConfig('attack', 'kneeBend', parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded accent-red-500" /></div>

                                        <div className="mt-3 p-2 bg-red-900/20 border border-red-900/50 rounded flex items-center justify-between">
                                            <span className="text-[10px] text-red-300 font-bold"><i className="fas fa-play-circle mr-1"></i> 攻击预览中</span>
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <button onClick={() => setIsProceduralPaused && setIsProceduralPaused(!isProceduralPaused)} className={`w-full py-2 rounded text-xs font-bold mt-4 ${isProceduralPaused ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{isProceduralPaused ? '已暂停' : (activeCategory === 'attack' ? '暂停攻击' : '暂停预览')}</button>
                        </div>
                    ) : <div className="text-center py-10 text-gray-500 text-xs">请先选择一个动作进行编辑</div>}
                </div>
            </div>

            {/* 3. BOTTOM TIMELINE (KEYFRAME MODE ONLY) */}
            {editorMode === 'keyframe' && currentAction && (
                <div className="absolute bottom-4 left-80 right-4 h-28 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl pointer-events-auto flex flex-col p-4 shadow-2xl z-30">
                    <div className="flex items-center gap-4 mb-3">
                         <button onClick={() => {
                             if (!isPlaying && currentTime >= 0.99) setCurrentTime(0);
                             setIsPlaying(!isPlaying);
                         }} className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-green-600 hover:bg-green-500'}`}><i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`}></i></button>
                         <div className="flex flex-col ml-2"><div className="text-sm font-mono font-bold text-white">{(currentTime * duration).toFixed(2)}s</div><div className="text-[10px] text-gray-500">Total: {duration.toFixed(1)}s</div></div>
                         <div className="h-8 w-px bg-gray-700 mx-2"></div>
                         <button onClick={onCreateKeyframe} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-2"><i className="fas fa-plus-circle"></i> 添加关键帧</button>
                         <button onClick={onDeleteKeyframe} className="px-3 py-2 bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-500 text-gray-400 hover:text-red-400 text-xs font-bold rounded-lg"><i className="fas fa-trash-alt"></i></button>
                    </div>
                    <div 
                        className="relative h-6 bg-gray-800 rounded-full cursor-pointer group mt-1 border border-gray-700/50 select-none"
                        onMouseMove={handleTimelineMouseMove}
                        onMouseLeave={handleTimelineMouseUp}
                        onMouseUp={handleTimelineMouseUp}
                    >
                        <input type="range" min="0" max="1" step="0.01" value={currentTime} onChange={(e) => { setCurrentTime(parseFloat(e.target.value)); setIsPlaying(false); }} className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" />
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-80" style={{width: `${currentTime * 100}%`}}></div>
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow pointer-events-none z-10 transform -translate-x-1/2 transition-transform h-full" style={{left: `${currentTime * 100}%`}}><div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-sm"></div></div>
                        
                        {currentAction.keyframes.map((kf, idx) => (
                            <div 
                                key={idx} 
                                onMouseDown={(e) => handleDotMouseDown(e, currentAction.id, idx)}
                                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-gray-900 z-30 transform -translate-x-1/2 transition-all hover:scale-125 cursor-ew-resize ${
                                    Math.abs(kf.time - currentTime) < 0.02 ? 'bg-yellow-300 scale-125' : 'bg-yellow-600'
                                }`} 
                                style={{left: `${kf.time * 100}%`}}
                                title={`Time: ${kf.time.toFixed(2)}`}
                            ></div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI FLOATING PANEL (Non-blocking) */}
            {showAiModal && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-80 bg-gray-900/95 backdrop-blur-md border border-purple-500/50 rounded-xl shadow-2xl animate-fade-in-down pointer-events-auto flex flex-col transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
                        <h3 className="text-xs font-bold text-white flex items-center gap-2">
                            <i className="fas fa-magic text-purple-400"></i> AI 动作助手
                            <span className="text-[9px] bg-purple-900/50 text-purple-200 px-2 py-0.5 rounded border border-purple-500/30 uppercase">{editorMode}</span>
                        </h3>
                        <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-white transition-colors">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 flex flex-col gap-3">
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            {editorMode === 'keyframe' 
                                ? "描述一个动作姿态（如：向观众挥手），AI 将生成关键帧序列。" 
                                : "描述动作风格（如：僵尸走路、忍者跑），AI 将调整程序化参数。"}
                        </p>
                        
                        <textarea 
                            value={aiPrompt} 
                            onChange={(e) => setAiPrompt(e.target.value)} 
                            placeholder={editorMode === 'keyframe' ? "例如：挥手致意、踢腿..." : "例如：沉重的步伐，摇晃的身体..."} 
                            className="w-full bg-gray-950/50 border border-gray-600 rounded p-2 text-xs text-white h-20 resize-none focus:border-purple-500 outline-none transition-colors" 
                            disabled={isGenerating}
                        />
                        
                        <div className="flex items-center justify-between pt-1">
                            <div className="text-[9px] text-gray-500 italic">
                                {isGenerating ? <span className="text-purple-400 animate-pulse"><i className="fas fa-circle-notch fa-spin mr-1"></i> 正在生成中...</span> : "生成后将自动切换并应用"}
                            </div>
                            <button 
                                onClick={handleAiGenerate} 
                                disabled={isGenerating || !aiPrompt.trim()} 
                                className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-2 transition-all ${
                                    isGenerating 
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white shadow-lg'
                                }`}
                            >
                                {isGenerating ? '生成中...' : <><i className="fas fa-sparkles"></i> 开始生成</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
