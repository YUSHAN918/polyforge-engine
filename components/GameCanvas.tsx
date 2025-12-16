
import React, { useRef, useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeElements } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Html, TransformControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import { CharacterConfig, AppMode, CharacterAction, Enemy, MapConfig, MapElement, MapItemType, GearTransformMap, AssetTransformMap, AnimationConfig, ModelPrimitive, CustomModel, CustomAction, BoneName, SavedCharacter, CameraMode, WorkshopRefType, CameraSettings, ShadowSettings, VfxAsset, VfxTestParams, VfxEmitterConfig } from '../types';
import { Character3D, CustomModelRenderer } from './Character3D';
import { VfxRenderer } from './VfxRenderer';
import * as THREE from 'three';

interface GameCanvasProps {
  config: CharacterConfig;
  mode: AppMode;
  mapConfig: MapConfig;
  setMapConfig: React.Dispatch<React.SetStateAction<MapConfig>>;
  selectedTool: MapItemType | 'eraser' | 'select'; 
  gearTransforms?: GearTransformMap;
  assetTransforms?: AssetTransformMap;
  onPartSelect?: (id: string, isDoubleClick?: boolean) => void;
  onPartRightClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  animConfig?: AnimationConfig;
  previewAction?: CharacterAction;
  lastAttackTrigger?: number;
  onTriggerAttack?: () => void; // New prop for gameplay attack
  focusedParentId?: string;
  // Model Editor Props
  primitives?: ModelPrimitive[];
  setPrimitives?: React.Dispatch<React.SetStateAction<ModelPrimitive[]>>;
  selectedPrimId?: string | null;
  setSelectedPrimId?: (id: string | null) => void;
  customModels?: CustomModel[];
  transformMode?: 'translate' | 'rotate' | 'scale';
  workshopRefType?: WorkshopRefType; 
  isSnapping?: boolean;
  onHistorySave?: () => void;
  referenceOpacity?: number;
  // Map Editor Props
  onMapHistorySave?: () => void;
  selectedEntityIds?: Set<string>;
  setSelectedEntityIds?: React.Dispatch<React.SetStateAction<Set<string>>>;
  savedCharacters?: SavedCharacter[];
  // Action Studio Props
  selectedBone?: string | null;
  overridePose?: Record<string, [number, number, number]>;
  setOverridePose?: (pose: Record<string, [number, number, number]>) => void;
  overridePosition?: Record<string, [number, number, number]>; // NEW
  setOverridePosition?: (pos: Record<string, [number, number, number]>) => void; // NEW
  activeCustomAction?: CustomAction | null;
  customActions?: CustomAction[]; // NEW: Pass all actions for linking
  animTime?: number;
  onBoneChange?: (bone: string, value: [number, number, number], type: 'rotation' | 'position') => void; // NEW Signature
  gizmoMode?: 'rotate' | 'translate'; // NEW Prop
  // Gameplay Props
  cameraMode?: CameraMode;
  cameraSettings?: CameraSettings; // New prop
  shadowSettings?: ShadowSettings; // New prop
  isProceduralPaused?: boolean;
  // VFX Studio Props
  currentVfxAsset?: VfxAsset;
  vfxTestParams?: VfxTestParams;
  vfxAssets?: VfxAsset[]; // NEW: Pass available assets to scenes
  selectedVfxEmitterId?: string | null; // NEW: Gizmo logic
  onVfxEmitterUpdate?: (emitterId: string, updates: Partial<VfxEmitterConfig>) => void; // NEW
}

// --- HELPER COMPONENT FOR ORBIT CONTROLS LOGIC ---
const CameraController = () => {
    const { camera, gl } = useThree();
    const controlsRef = useRef<any>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePressed(true);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return (
        <OrbitControls
            ref={controlsRef}
            // @ts-ignore
            args={[camera, gl.domElement]}
            makeDefault
            minDistance={2}
            maxDistance={50}
            mouseButtons={{
                LEFT: isSpacePressed ? THREE.MOUSE.PAN : undefined, 
                MIDDLE: THREE.MOUSE.ROTATE,
                RIGHT: THREE.MOUSE.ROTATE
            }}
            enableRotate={true}
            enablePan={true}
            enableZoom={true}
            screenSpacePanning={true}
            zoomSpeed={1.2}
        />
    );
};

// --- VFX STUDIO SCENE ---
const VfxStudioScene: React.FC<{
    vfxAsset?: VfxAsset;
    testParams?: VfxTestParams;
    customModels?: CustomModel[];
    selectedEmitterId?: string | null;
    onUpdateEmitter?: (emitterId: string, updates: Partial<VfxEmitterConfig>) => void;
}> = ({ vfxAsset, testParams, customModels, selectedEmitterId, onUpdateEmitter }) => {
    const parentRef = useRef<THREE.Group>(null);
    const projRef = useRef<THREE.Group>(null);
    
    // Projectile Animation Logic
    const startTimeRef = useRef(0);
    const lastActiveRef = useRef(false);

    useFrame((state) => {
        if (testParams?.isProjectileTesting) {
            // Reset start time on toggle
            if (!lastActiveRef.current) {
                startTimeRef.current = state.clock.getElapsedTime();
                lastActiveRef.current = true;
            }

            if (projRef.current) {
                const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
                const t = elapsed % 1.5; // 1.5s loop
                
                // Move along Z
                const z = t * 15;
                projRef.current.position.set(0, 1, z);
            }
        } else {
            lastActiveRef.current = false;
            if (projRef.current) {
                projRef.current.position.set(0, 1, 0);
            }
        }
    });

    if (!vfxAsset) return null;

    const referenceModel = testParams?.referenceModelId 
        ? customModels?.find(m => m.id === testParams.referenceModelId) 
        : undefined;
        
    const projectileModel = testParams?.projectileModelId
        ? customModels?.find(m => m.id === testParams.projectileModelId)
        : undefined;

    const selectedEmitter = vfxAsset.emitters.find(e => e.id === selectedEmitterId);

    const EmitterGizmo = () => {
        if (!selectedEmitter || !onUpdateEmitter) return null;
        
        return (
            <TransformControls
                position={[selectedEmitter.offset[0], selectedEmitter.offset[1], selectedEmitter.offset[2]]}
                mode="translate"
                space="local"
                size={0.5}
                onMouseUp={(e: any) => {
                    if (e?.target?.object) {
                        const o = e.target.object;
                        onUpdateEmitter(selectedEmitter.id, { offset: [o.position.x, o.position.y, o.position.z] });
                    }
                }}
            >
                {/* Visual Anchor for the Emitter Offset */}
                <mesh>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color="#ffff00" wireframe depthTest={false} />
                </mesh>
            </TransformControls>
        );
    };

    return (
        <group>
            {/* Reference (Weapon/Prop) */}
            {referenceModel && (
                <group position={[0, 1, 0]} ref={parentRef}>
                    <CustomModelRenderer model={referenceModel} />
                    {/* If NOT testing projectile, bind VFX here */}
                    {!projectileModel && (
                        <>
                            <VfxRenderer vfxAsset={vfxAsset} isPlaying={testParams?.isPlaying} parentRef={parentRef as any} />
                            {/* GIZMO MUST BE INSIDE THE PARENT GROUP TO BE RELATIVE */}
                            {!testParams?.isProjectileTesting && <EmitterGizmo />}
                        </>
                    )}
                </group>
            )}

            {/* Projectile (Fireball etc.) */}
            {projectileModel ? (
                <group ref={projRef} position={[0, 1, 0]}>
                    <CustomModelRenderer model={projectileModel} />
                    <VfxRenderer vfxAsset={vfxAsset} isPlaying={testParams?.isPlaying} parentRef={projRef as any} />
                    <EmitterGizmo />
                </group>
            ) : (
                // If no reference at all, just play at center. OR if testing projectile without a specific model
                (!referenceModel || testParams?.isProjectileTesting) && (
                    <group ref={testParams?.isProjectileTesting ? projRef : undefined} position={[0, 1, 0]}>
                        <mesh visible={false}><boxGeometry/></mesh>
                        <VfxRenderer vfxAsset={vfxAsset} isPlaying={testParams?.isPlaying} parentRef={testParams?.isProjectileTesting ? projRef as any : undefined}/>
                        <EmitterGizmo />
                    </group>
                )
            )}
        </group>
    );
};

// --- GAMEPLAY SCENE (WASD + MOUSE AIM + SHIFT RUN) ---
const GameplayScene: React.FC<{
    config: CharacterConfig;
    mapConfig: MapConfig;
    cameraMode: CameraMode;
    cameraSettings?: CameraSettings;
    gearTransforms?: GearTransformMap;
    customModels?: CustomModel[];
    assetTransforms?: AssetTransformMap;
    savedCharacters?: SavedCharacter[];
    onTriggerAttack?: () => void;
    lastAttackTrigger?: number;
    animConfig?: AnimationConfig;
    customActions?: CustomAction[]; 
    vfxAssets?: VfxAsset[]; // NEW
}> = ({ config, mapConfig, cameraMode, cameraSettings, gearTransforms, customModels, assetTransforms, savedCharacters, onTriggerAttack, lastAttackTrigger, animConfig, customActions, vfxAssets }) => {
    const playerGroup = useRef<THREE.Group>(null);
    const groundPlaneRef = useRef<THREE.Mesh>(null); // Ref for infinite floor mesh (clicks)
    const [action, setAction] = useState<CharacterAction>(CharacterAction.IDLE);
    const [isMoving, setIsMoving] = useState(false);
    const [isRunning, setIsRunning] = useState(false); // Toggle state for running
    const [moveLocal, setMoveLocal] = useState<THREE.Vector2>(new THREE.Vector2(0, 0));
    
    // Key states
    const keys = useRef<{ w: boolean; a: boolean; s: boolean; d: boolean }>({ 
        w: false, a: false, s: false, d: false 
    });
    
    // Physics / Movement State
    const position = useRef(new THREE.Vector3(0, 0, 0));
    const mouseWorldPos = useRef(new THREE.Vector3(0, 0, 5)); // Default look target
    
    // Mathematical Plane for Raycasting (Infinite Ground at Y=0)
    const mathPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'w') keys.current.w = true;
            if (k === 'a') keys.current.a = true;
            if (k === 's') keys.current.s = true;
            if (k === 'd') keys.current.d = true;
            
            // Toggle Run on Shift Press
            if (k === 'shift' && !e.repeat) {
                setIsRunning(prev => !prev);
            }
        };
        const handleUp = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'w') keys.current.w = false;
            if (k === 'a') keys.current.a = false;
            if (k === 's') keys.current.s = false;
            if (k === 'd') keys.current.d = false;
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
        };
    }, []);

    // Camera FOV Update
    const { camera } = useThree();
    useEffect(() => {
        if (cameraMode === CameraMode.ISOMETRIC && cameraSettings && camera instanceof THREE.PerspectiveCamera) {
            camera.fov = cameraSettings.fov;
            camera.updateProjectionMatrix();
        } else if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = 50; // Default
            camera.updateProjectionMatrix();
        }
    }, [camera, cameraMode, cameraSettings?.fov]);

    useFrame((state, delta) => {
        if (!playerGroup.current) return;

        // --- 0. COMBAT STATUS CHECK ---
        const speedMult = animConfig?.attack.speedMult || 1.0;
        const atkDuration = 600 / speedMult; // Base 600ms scaled by speed
        const timeSinceAtk = Date.now() - (lastAttackTrigger || 0);
        const isAttacking = timeSinceAtk < atkDuration;

        // Weapon Weight Check
        const w = config.gear.weapon || '';
        const weaponModel = customModels?.find(m => m.id === w);
        const isTwoHanded = weaponModel?.subCategory === 'two_handed' || w.includes('great') || w.includes('2h');

        // Logic for movement allowance: Priority to User Config > Weapon Type
        const allowMoveConfig = animConfig?.attack.allowMovement;
        const canMove = allowMoveConfig !== undefined ? allowMoveConfig : !isTwoHanded;

        const cam = state.camera;

        // --- 1. MOVEMENT LOGIC (Camera Relative) ---
        // If attacking, apply restrictions
        let effectiveIsRunning = isRunning;
        let inputScale = 1.0;

        if (isAttacking) {
            if (!canMove) {
                inputScale = 0; // Root Motion (Stop)
            } else {
                effectiveIsRunning = false; // Force Walk
            }
        }

        const moveSpeed = effectiveIsRunning ? 10.0 : 5.0;
        const inputVector = new THREE.Vector3(0, 0, 0);
        
        // Get Camera Directions projected to Ground (XZ)
        const camForward = new THREE.Vector3();
        cam.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        // Calculate Movement Vector based on Camera Alignment
        if (keys.current.w) inputVector.add(camForward);
        if (keys.current.s) inputVector.sub(camForward);
        if (keys.current.d) inputVector.add(camRight);
        if (keys.current.a) inputVector.sub(camRight);

        // Apply Input Scale (e.g. Stop for Heavy Attack)
        inputVector.multiplyScalar(inputScale);

        let currentActionState = CharacterAction.IDLE;

        if (inputVector.length() > 0) {
            inputVector.normalize();
            setIsMoving(true);
            currentActionState = effectiveIsRunning ? CharacterAction.RUN : CharacterAction.WALK;
            
            position.current.x += inputVector.x * moveSpeed * delta;
            position.current.z += inputVector.z * moveSpeed * delta;
        } else {
            setIsMoving(false);
            currentActionState = CharacterAction.IDLE;
        }

        // --- REAL-TIME RAYCASTING (Fix for Stale Mouse Pos) ---
        // Update raycaster from camera based on current mouse position
        state.raycaster.setFromCamera(state.pointer, state.camera);
        
        // Intersect with infinite mathematical plane
        // This ensures mouseWorldPos is ALWAYS accurate relative to the moving camera/character
        state.raycaster.ray.intersectPlane(mathPlane, mouseWorldPos.current);

        // --- UPDATE GROUND MESH (For Click Events) ---
        if (groundPlaneRef.current) {
            groundPlaneRef.current.position.x = position.current.x;
            groundPlaneRef.current.position.z = position.current.z;
        }

        // --- ROTATION LOGIC ---
        // Smooth rotation towards mouse
        if (mouseWorldPos.current) {
            const targetPos = mouseWorldPos.current.clone();
            targetPos.y = position.current.y;
            
            // Distance Check (Deadzone) to prevent jitter when mouse is too close
            const dist = position.current.distanceTo(targetPos);
            
            if (dist > 0.5) {
                const targetDir = new THREE.Vector3().subVectors(targetPos, position.current).normalize();
                const angle = Math.atan2(targetDir.x, targetDir.z);
                
                // Smooth Rotation (Damping)
                const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                playerGroup.current.quaternion.slerp(q, 20 * delta); 
            }
        }

        // --- CALCULATE LOCAL MOVEMENT VECTOR (For Animation Blending) ---
        // Project world movement onto character's local axis
        if (isMoving && inputVector.length() > 0) {
            const charQuat = playerGroup.current.quaternion.clone();
            const localInput = inputVector.clone().applyQuaternion(charQuat.invert());
            // Z is Forward in Model Space (usually)
            setMoveLocal(new THREE.Vector2(localInput.x, localInput.z));
        } else {
            setMoveLocal(new THREE.Vector2(0, 0));
        }

        setAction(currentActionState);

        // Apply Position
        playerGroup.current.position.copy(position.current);

        // --- 3. CAMERA LOGIC ---
        const target = position.current.clone();
        
        let offset = new THREE.Vector3();
        let lookAtOffset = new THREE.Vector3(0, 1.0, 0); 
        let lerpSpeed = 5 * delta;

        switch(cameraMode) {
            case CameraMode.ISOMETRIC:
                // Use dynamic settings or defaults
                const dist = cameraSettings?.distance || 14;
                const height = cameraSettings?.height || 20;
                offset.set(dist, height, dist); 
                break;
            case CameraMode.TPS:
                // High shoulder cam
                offset.set(0, 8, 10); 
                break;
            case CameraMode.SIDE_SCROLL:
                offset.set(0, 3, 12);
                target.x = position.current.x; // Follow X
                target.z = 0; // Lock Z view
                lookAtOffset.set(0, 1, 0);
                break;
        }

        const desiredPos = target.clone().add(offset);
        cam.position.lerp(desiredPos, lerpSpeed);
        cam.lookAt(target.clone().add(lookAtOffset));
    });

    return (
        <group>
            {/* Invisible Floor for Mouse Events (Clicks) - MOVES WITH PLAYER */}
            <mesh 
                ref={groundPlaneRef}
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, 0, 0]} 
                visible={false}
                onPointerDown={(e) => {
                    // Left click to attack
                    if (e.button === 0 && onTriggerAttack) {
                        onTriggerAttack();
                    }
                }}
            >
                <planeGeometry args={[100, 100]} />
            </mesh>

            <group ref={playerGroup}>
                 <Character3D 
                    config={config} 
                    action={action} 
                    isMoving={isMoving}
                    moveLocal={moveLocal}
                    gearTransforms={gearTransforms}
                    customModels={customModels}
                    lastAttackTime={lastAttackTrigger} // Pass trigger to animation layer
                    animConfig={animConfig} // Pass config so Character3D uses same speeds
                    customActions={customActions} // NEW: Pass actions for linking
                    vfxAssets={vfxAssets} // Pass assets to render bindings
                />
            </group>

            {/* Map Elements */}
            {mapConfig.elements.map(el => (
                <MapObject 
                    key={el.id} 
                    type={el.type} 
                    position={new THREE.Vector3(...el.position)} 
                    assetTransforms={assetTransforms} 
                    customModels={customModels} 
                    savedCharacters={savedCharacters}
                    vfxAssets={vfxAssets} // Pass assets to NPC bindings
                />
            ))}
        </group>
    );
};


// --- CUSTOM ASSET RENDERER ---
// (Already imported from Character3D now, but kept MapObject usage consistent)

const MobRenderer: React.FC<{ type: MapItemType; hitFlash?: boolean; customModels?: CustomModel[] }> = ({ type, hitFlash, customModels }) => {
    const customModel = customModels?.find(m => m.id === type);
    
    if (customModel) {
        return (
            <group>
                <CustomModelRenderer model={customModel} />
                {hitFlash && (
                    <mesh>
                        <boxGeometry args={[1, 1, 1]} />
                        <meshBasicMaterial color="white" transparent opacity={0.5} />
                    </mesh>
                )}
            </group>
        );
    }

    const colorMap: Record<string, string> = {
        rabbit: '#e5e7eb', duck: '#fbbf24', toad: '#4ade80',
        boar: '#57534e', deer: '#c2410c', goblin: '#059669',
        golem: '#64748b', troll: '#115e59', dragon: '#7f1d1d'
    };
    const c = hitFlash ? '#ffffff' : (colorMap[type] || '#fff');
    const emissive = hitFlash ? 0.8 : 0;
    
    return (
        <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.5, 0.8, 0.5]} />
            <meshStandardMaterial color={c} emissive="white" emissiveIntensity={emissive} />
        </mesh>
    );
}

const MapObject: React.FC<{ 
    type: MapItemType; 
    position: THREE.Vector3; 
    assetTransforms?: AssetTransformMap; 
    customModels?: CustomModel[]; 
    savedCharacters?: SavedCharacter[];
    isEditing?: boolean;
    isSelected?: boolean; 
    vfxAssets?: VfxAsset[]; // NEW
}> = React.memo(({ type, position, assetTransforms, customModels, savedCharacters, isEditing, isSelected, vfxAssets }) => {
    
    // 1. Check if it's a Saved Character (NPC)
    const savedChar = savedCharacters?.find(c => c.id === type);
    
    let content;
    let boundVfx: React.ReactNode = null;

    // Helper for Map Object VFX
    const getBoundVfx = (modelId: string) => {
        if (!vfxAssets || !customModels) return null;
        const model = customModels.find(m => m.id === modelId);
        if (model?.vfxBindings?.equip) {
            const vfx = vfxAssets.find(v => v.id === model.vfxBindings!.equip);
            // Render VFX component if found. 
            // Note: We use trackerRef inside VfxRenderer to attach to current position if parentRef is not passed explicitly,
            // OR since we are inside a group here, we can just place it. 
            // Wait, VfxRenderer with world trail needs care.
            // If we place <VfxRenderer> here, it will be a child of the <group position={position}>.
            // But VfxRenderer uses portal to scene. So it needs parent world pos.
            // The internal trackerRef in VfxRenderer handles this! It tracks its own world position (which matches this group) and spawns particles.
            if (vfx) return <VfxRenderer vfxAsset={vfx} isPlaying={true} />;
        }
        return null;
    };

    if (savedChar) {
        content = (
            <group scale={0.8}> 
                <Character3D 
                    config={savedChar} 
                    action={CharacterAction.IDLE}
                    customModels={customModels}
                    vfxAssets={vfxAssets} // Pass VFX Assets to NPC
                />
            </group>
        );
    } else {
        // 2. Standard Logic
        const customModel = customModels?.find(m => m.id === type);

        if (customModel) {
            content = <CustomModelRenderer model={customModel} />;
            // Add VFX if binding exists
            boundVfx = getBoundVfx(type);
        } else if (type === 'wall') {
            content = (
                <mesh position={[0, 1, 0]}>
                    <boxGeometry args={[1, 2, 1]} />
                    <meshStandardMaterial color="#6b7280" />
                </mesh>
            );
        } else if (type === 'tree') {
            content = (
                <group>
                    <mesh position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.2, 0.2, 1]} />
                        <meshStandardMaterial color="#78350f" />
                    </mesh>
                    <mesh position={[0, 1.5, 0]}>
                        <coneGeometry args={[1, 2, 8]} />
                        <meshStandardMaterial color="#166534" />
                    </mesh>
                </group>
            );
        } else if (type === 'crate') {
            content = (
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[0.8, 1, 0.8]} />
                    <meshStandardMaterial color="#d97706" />
                    <mesh position={[0, 0, 0.41]} rotation={[0, 0, 0]}>
                    <planeGeometry args={[0.6, 0.8]} />
                    <meshStandardMaterial color="#92400e" />
                    </mesh>
                </mesh>
            );
        } else {
             content = <MobRenderer type={type} customModels={customModels} />;
        }
    }

    const transform = assetTransforms?.[type];
    const userScale = transform?.scale || 1;
    const userPos = transform?.position ? new THREE.Vector3(...transform.position) : new THREE.Vector3(0,0,0);
    const userRot = transform?.rotation ? new THREE.Euler(...transform.rotation) : new THREE.Euler(0,0,0);

    return (
        <group position={position}>
            <group position={userPos} rotation={userRot} scale={userScale} raycast={isEditing ? () => null : undefined}>
                {content}
                {boundVfx}
                {isSelected && (
                    <mesh position={[0, 1, 0]}>
                        <boxGeometry args={[1.2, 2.2, 1.2]} />
                        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.6} />
                    </mesh>
                )}
            </group>
        </group>
    );
});

// --- EDITOR LOGIC FOR MAP EDITOR ---
const MapEditorScene: React.FC<{
    mapConfig: MapConfig;
    selectedTool: MapItemType | 'eraser' | 'select';
    setMapConfig: React.Dispatch<React.SetStateAction<MapConfig>>;
    assetTransforms?: AssetTransformMap;
    customModels?: CustomModel[];
    selectedEntityIds: Set<string>;
    setSelectedEntityIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    onMapHistorySave?: () => void;
    savedCharacters?: SavedCharacter[];
    vfxAssets?: VfxAsset[]; // NEW
}> = ({ mapConfig, selectedTool, setMapConfig, assetTransforms, customModels, selectedEntityIds, setSelectedEntityIds, onMapHistorySave, savedCharacters, vfxAssets }) => {
    // ... (Map Editor logic remains the same, omitted for brevity but part of file)
    // Actually, I must include full file content or placeholder for existing parts.
    // I will include the full MapEditorScene logic to be safe.
    
    const [hoverPos, setHoverPos] = useState<[number, number, number] | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Selection Box State
    const [selectionStart, setSelectionStart] = useState<THREE.Vector3 | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<THREE.Vector3 | null>(null);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        if (selectedTool === 'select' && isDragging && selectionStart) {
            setSelectionEnd(e.point.clone());
            return;
        }

        const x = Math.round(e.point.x);
        const z = Math.round(e.point.z);
        setHoverPos([x, 0, z]);

        if (isDragging && selectedTool !== 'eraser' && selectedTool !== 'select') {
             // Continuous painting
             setMapConfig(prev => {
                const exists = prev.elements.some(el => Math.round(el.position[0]) === x && Math.round(el.position[2]) === z);
                if (!exists) {
                    return {
                        ...prev,
                        elements: [...prev.elements, { id: Math.random().toString(36).substr(2, 9), type: selectedTool, position: [x, 0, z] }]
                    };
                }
                return prev;
             });
        }
    };

    const handlePointerDown = (e: any) => {
        e.stopPropagation();
        if (e.button !== 0) return; // Only Left Click
        setIsDragging(true);

        if (selectedTool === 'select') {
            setSelectionStart(e.point.clone());
            setSelectionEnd(e.point.clone());
            if (!e.shiftKey) setSelectedEntityIds(new Set());
            return;
        }

        if (onMapHistorySave) onMapHistorySave();

        const x = Math.round(e.point.x);
        const z = Math.round(e.point.z);

        if (selectedTool === 'eraser') {
            setMapConfig(prev => ({
                ...prev,
                elements: prev.elements.filter(el => Math.round(el.position[0]) !== x || Math.round(el.position[2]) !== z)
            }));
        } else {
             setMapConfig(prev => {
                const exists = prev.elements.some(el => Math.round(el.position[0]) === x && Math.round(el.position[2]) === z);
                if (!exists) {
                    return {
                        ...prev,
                        elements: [...prev.elements, { id: Math.random().toString(36).substr(2, 9), type: selectedTool, position: [x, 0, z] }]
                    };
                }
                return prev;
             });
        }
    };

    const handlePointerUp = () => {
        setIsDragging(false);
        if (selectedTool === 'select' && selectionStart && selectionEnd) {
             const minX = Math.min(selectionStart.x, selectionEnd.x);
             const maxX = Math.max(selectionStart.x, selectionEnd.x);
             const minZ = Math.min(selectionStart.z, selectionEnd.z);
             const maxZ = Math.max(selectionStart.z, selectionEnd.z);

             const selected = new Set(selectedEntityIds);
             mapConfig.elements.forEach(el => {
                 if (el.position[0] >= minX && el.position[0] <= maxX && el.position[2] >= minZ && el.position[2] <= maxZ) {
                     selected.add(el.id);
                 }
             });
             setSelectedEntityIds(selected);
             setSelectionStart(null);
             setSelectionEnd(null);
        }
    };

    return (
        <group>
            {/* Ground Plane for Interaction */}
            <mesh 
                rotation={[-Math.PI / 2, 0, 0]} 
                position={[0, -0.05, 0]} 
                onPointerMove={handlePointerMove} 
                onPointerDown={handlePointerDown} 
                onPointerUp={handlePointerUp}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color={mapConfig.groundColor} roughness={0.8} />
            </mesh>

            {/* Selection Box Visual */}
            {selectedTool === 'select' && selectionStart && selectionEnd && (
                <mesh position={[
                    (selectionStart.x + selectionEnd.x) / 2,
                    0.5,
                    (selectionStart.z + selectionEnd.z) / 2
                ]}>
                    <boxGeometry args={[
                        Math.abs(selectionEnd.x - selectionStart.x),
                        1,
                        Math.abs(selectionEnd.z - selectionStart.z)
                    ]} />
                    <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} wireframe />
                </mesh>
            )}

            {/* Ghost Preview */}
            {hoverPos && selectedTool !== 'eraser' && selectedTool !== 'select' && (
                <group position={new THREE.Vector3(...hoverPos)}>
                    <MapObject type={selectedTool} position={new THREE.Vector3(0,0,0)} assetTransforms={assetTransforms} customModels={customModels} isEditing={true} savedCharacters={savedCharacters} vfxAssets={vfxAssets} />
                </group>
            )}

            {/* Placed Objects */}
            {mapConfig.elements.map(el => (
                <MapObject 
                    key={el.id} 
                    type={el.type} 
                    position={new THREE.Vector3(...el.position)} 
                    assetTransforms={assetTransforms} 
                    customModels={customModels}
                    isEditing={true}
                    isSelected={selectedEntityIds.has(el.id)}
                    savedCharacters={savedCharacters}
                    vfxAssets={vfxAssets} // Propagate
                />
            ))}
        </group>
    );
};


// --- WORKSHOP GIZMOS (Refactored for WYSIWYG & Dynamic Snapping) ---
// (Already present, kept for completeness of file structure)
const WorkshopScene: React.FC<{
    primitives: ModelPrimitive[];
    selectedPrimId: string | null;
    setSelectedPrimId: (id: string | null) => void;
    setPrimitives: React.Dispatch<React.SetStateAction<ModelPrimitive[]>>;
    transformMode: 'translate' | 'rotate' | 'scale';
    isSnapping: boolean;
    onHistorySave?: () => void;
    config?: CharacterConfig; 
    customModels?: CustomModel[];
    workshopRefType: WorkshopRefType;
    gearTransforms?: GearTransformMap;
    referenceOpacity?: number;
    onPartSelect?: (id: string, isDoubleClick?: boolean) => void;
}> = ({ primitives, selectedPrimId, setSelectedPrimId, setPrimitives, transformMode, isSnapping, onHistorySave, config, customModels, workshopRefType, gearTransforms, referenceOpacity, onPartSelect }) => {
    // ... Workshop Scene Implementation ...
    const containerRef = useRef<THREE.Group>(null);
    const [targetObject, setTargetObject] = useState<THREE.Object3D | null>(null);
    const [bones, setBones] = useState<Record<string, THREE.Object3D> | null>(null);
    const groupSnapshot = useRef<{ id: string; matrix: THREE.Matrix4; }[]>([]);
    const anchorInitialMatrix = useRef<THREE.Matrix4>(new THREE.Matrix4());
    const { camera, controls } = useThree();

    const getBoneTarget = (refType: WorkshopRefType, boneMap: Record<string, THREE.Object3D>) => {
        switch(refType) {
            case 'head': return boneMap.head;
            case 'chest': return boneMap.chest;
            case 'hips': return boneMap.hips;
            case 'arm_l': return boneMap.arm_left;
            case 'forearm_l': return boneMap.forearm_left;
            case 'hand_l': return boneMap.hand_left;
            case 'arm_r': return boneMap.arm_right;
            case 'forearm_r': return boneMap.forearm_right;
            case 'hand_r': return boneMap.hand_right;
            case 'thigh_l': return boneMap.thigh_left;
            case 'calf_l': return boneMap.calf_left;
            case 'foot_l': return boneMap.foot_left;
            case 'thigh_r': return boneMap.thigh_right;
            case 'calf_r': return boneMap.calf_right;
            case 'foot_r': return boneMap.foot_right;
            default: return null;
        }
    };

    useFrame(() => {
        if (!containerRef.current) return;
        let targetBone: THREE.Object3D | null = null;
        if (bones && workshopRefType !== 'none' && workshopRefType !== 'ground') {
            targetBone = getBoneTarget(workshopRefType, bones);
        }
        if (targetBone) {
            targetBone.getWorldPosition(containerRef.current.position);
            targetBone.getWorldQuaternion(containerRef.current.quaternion);
        } else {
            containerRef.current.position.set(0, 0, 0);
            containerRef.current.rotation.set(0, 0, 0);
        }
        if (controls && containerRef.current) {
            const target = containerRef.current.position;
            // @ts-ignore
            controls.target.lerp(target, 0.1);
            // @ts-ignore
            controls.update();
        }
    });

    useEffect(() => {
        if (selectedPrimId && containerRef.current) {
            const obj = containerRef.current.getObjectByName(`prim-${selectedPrimId}`);
            setTargetObject(obj || null);
        } else {
            setTargetObject(null);
        }
    }, [selectedPrimId, primitives]); 

    return (
        <group>
            {config && workshopRefType !== 'none' && (
                <group>
                    <Character3D 
                        config={config} 
                        customModels={customModels}
                        hiddenSlots={['weapon', 'shield', 'helm']}
                        gearTransforms={gearTransforms}
                        forceTPose={false}
                        freezeAnim={true} 
                        referenceOpacity={referenceOpacity}
                        onPartSelect={onPartSelect}
                        onBoneRegister={setBones}
                    />
                </group>
            )}
            <group ref={containerRef}>
                <gridHelper args={[4, 10]} />
                <axesHelper args={[0.5]} />
                {primitives.map((prim, idx) => {
                     const safeNum = (v: any, def: number) => { const n = Number(v); return isNaN(n) ? def : n; };
                     const pos = Array.isArray(prim.position) && prim.position.length >= 3 ? prim.position : [0,0,0];
                     const rot = Array.isArray(prim.rotation) && prim.rotation.length >= 3 ? prim.rotation : [0,0,0];
                     let scl = [1, 1, 1];
                     if (Array.isArray(prim.scale) && prim.scale.length >= 3) { scl = prim.scale as any; } else if (typeof prim.scale === 'number') { scl = [prim.scale, prim.scale, prim.scale]; }
                     const vPos = new THREE.Vector3(safeNum(pos[0],0), safeNum(pos[1],0), safeNum(pos[2],0));
                     const vRot = new THREE.Euler(safeNum(rot[0],0), safeNum(rot[1],0), safeNum(rot[2],0));
                     const vScl = new THREE.Vector3(safeNum(scl[0],1), safeNum(scl[1],1), safeNum(scl[2],1));

                     return (
                         <mesh key={prim.id || idx} name={`prim-${prim.id}`} position={vPos} rotation={vRot} scale={vScl} onClick={(e) => { e.stopPropagation(); setSelectedPrimId(prim.id); }}>
                            {prim.type === 'box' && <boxGeometry />}
                            {prim.type === 'sphere' && <sphereGeometry args={[0.5]} />}
                            {prim.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1]} />}
                            {prim.type === 'cone' && <coneGeometry args={[0.5, 1]} />}
                            {prim.type === 'torus' && <torusGeometry args={[0.5, 0.2]} />}
                            {prim.type === 'capsule' && <capsuleGeometry args={[0.25, 1, 4, 8]} />}
                            {prim.type === 'plane' && <planeGeometry args={[1, 1]} />}
                            {prim.type === 'tetrahedron' && <tetrahedronGeometry args={[0.5]} />}
                            {prim.type === 'ring' && <torusGeometry args={[0.5, 0.05, 16, 100]} />}
                            <meshStandardMaterial color={prim.color} emissive={prim.id === selectedPrimId ? '#444' : '#000'} side={THREE.DoubleSide} />
                         </mesh>
                    );
                })}
            </group>
            {targetObject && targetObject.parent && (
                <TransformControls object={targetObject} mode={transformMode} space="local" translationSnap={isSnapping ? 0.5 : null} rotationSnap={isSnapping ? Math.PI / 4 : null}
                    onMouseDown={() => { 
                        if(onHistorySave) onHistorySave(); 
                        const activePrim = primitives.find(p => p.id === selectedPrimId);
                        if (activePrim && activePrim.groupId) {
                             const groupPrims = primitives.filter(p => p.groupId === activePrim.groupId);
                             groupSnapshot.current = groupPrims.map(p => {
                                 const pos = new THREE.Vector3(...p.position);
                                 const rot = new THREE.Euler(...p.rotation);
                                 const scale = new THREE.Vector3(...p.scale);
                                 const mat = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(rot), scale);
                                 return { id: p.id, matrix: mat };
                             });
                             if (targetObject) { targetObject.updateMatrix(); anchorInitialMatrix.current.copy(targetObject.matrix); }
                        }
                    }}
                    onMouseUp={(e: any) => {
                        if (!e?.target?.object) return;
                        const o = e.target.object;
                        const activePrim = primitives.find(p => p.id === selectedPrimId);
                        if (activePrim && activePrim.groupId) {
                             o.updateMatrix();
                             const newAnchorMatrix = o.matrix;
                             const oldAnchorInverse = anchorInitialMatrix.current.clone().invert();
                             const deltaMatrix = new THREE.Matrix4().multiplyMatrices(newAnchorMatrix, oldAnchorInverse);
                             setPrimitives(prev => prev.map(p => {
                                 if (p.groupId === activePrim.groupId) {
                                     const snap = groupSnapshot.current.find(s => s.id === p.id);
                                     if (!snap) return p;
                                     const finalMatrix = new THREE.Matrix4().multiplyMatrices(deltaMatrix, snap.matrix);
                                     const pos = new THREE.Vector3(); const quat = new THREE.Quaternion(); const scale = new THREE.Vector3();
                                     finalMatrix.decompose(pos, quat, scale);
                                     const rot = new THREE.Euler().setFromQuaternion(quat);
                                     return { ...p, position: [pos.x, pos.y, pos.z], rotation: [rot.x, rot.y, rot.z], scale: [scale.x, scale.y, scale.z] };
                                 }
                                 return p;
                             }));
                        } else {
                            setPrimitives(prev => prev.map(p => {
                                if (p.id === selectedPrimId) { return { ...p, position: [o.position.x, o.position.y, o.position.z], rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: [o.scale.x, o.scale.y, o.scale.z] }; }
                                return p;
                            }));
                        }
                    }}
                />
            )}
        </group>
    );
};

// --- BONE CONTROL SCENE ---
const BoneControlScene: React.FC<{
    selectedBone: string | null;
    bones: React.MutableRefObject<Record<string, THREE.Object3D> | null>;
    setOverridePose?: (pose: Record<string, [number, number, number]>) => void;
    overridePose?: Record<string, [number, number, number]>;
    setOverridePosition?: (pos: Record<string, [number, number, number]>) => void; 
    overridePosition?: Record<string, [number, number, number]>; 
    onBoneChange?: (bone: string, value: [number, number, number], type: 'rotation' | 'position') => void;
    transformMode?: 'rotate' | 'translate';
}> = ({ selectedBone, bones, setOverridePose, overridePose, setOverridePosition, overridePosition, onBoneChange, transformMode = 'rotate' }) => {
    const [isGizmoDragging, setIsGizmoDragging] = useState(false);
    if (!selectedBone || !bones.current || !bones.current[selectedBone]) return null;
    const targetObj = bones.current[selectedBone];
    if (!targetObj.parent) return null;
    const worldPos = new THREE.Vector3();
    targetObj.getWorldPosition(worldPos);
    const isHips = selectedBone === 'hips';
    const effectiveMode = isHips ? transformMode : 'rotate'; 

    return (
        <group>
            <mesh position={worldPos}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color="#fbbf24" wireframe depthTest={false} />
            </mesh>
            <TransformControls object={targetObj} mode={effectiveMode as any} space="local" 
                // @ts-ignore
                onDraggingChanged={(e) => setIsGizmoDragging(e.value)}
                onObjectChange={(e: any) => {
                    if ((e.target as any).object) {
                        const o = (e.target as any).object;
                        if (effectiveMode === 'rotate' && setOverridePose) { setOverridePose({ ...overridePose, [selectedBone]: [o.rotation.x, o.rotation.y, o.rotation.z] }); } 
                        else if (effectiveMode === 'translate' && setOverridePosition) { setOverridePosition({ ...overridePosition, [selectedBone]: [o.position.x, o.position.y, o.position.z] }); }
                    }
                }}
                onMouseUp={(e: any) => {
                    if (onBoneChange && (e?.target as any)?.object) {
                        const o = (e.target as any).object;
                        if (effectiveMode === 'rotate') { onBoneChange(selectedBone, [o.rotation.x, o.rotation.y, o.rotation.z], 'rotation'); } 
                        else { onBoneChange(selectedBone, [o.position.x, o.position.y, o.position.z], 'position'); }
                    }
                }}
            />
        </group>
    );
}

// --- MAIN CANVAS COMPONENT ---
const GameCanvasComponent: React.FC<GameCanvasProps> = ({ 
    config, mode, mapConfig, setMapConfig, selectedTool, gearTransforms, assetTransforms, 
    onPartSelect, onPartRightClick, onBackgroundClick, animConfig, previewAction = CharacterAction.IDLE, 
    lastAttackTrigger = 0, onTriggerAttack, focusedParentId, primitives, setPrimitives, selectedPrimId, setSelectedPrimId, 
    customModels, transformMode = 'translate', workshopRefType = 'none', isSnapping = false, onHistorySave,
    onMapHistorySave, referenceOpacity,
    selectedEntityIds, setSelectedEntityIds, 
    selectedBone, overridePose, setOverridePose, overridePosition, setOverridePosition, activeCustomAction, customActions, animTime,
    savedCharacters, cameraMode = CameraMode.ISOMETRIC, cameraSettings, shadowSettings, isProceduralPaused = false,
    onBoneChange, gizmoMode, currentVfxAsset, vfxTestParams, vfxAssets,
    // NEW Props
    selectedVfxEmitterId, onVfxEmitterUpdate
}) => {
  const [bonesVersion, setBonesVersion] = useState(0);
  const boneMap = useRef<Record<string, THREE.Object3D> | null>(null);
  const handleBoneRegister = useCallback((bones: Record<string, THREE.Object3D>) => {
      boneMap.current = bones;
      setBonesVersion(v => v + 1); 
  }, []);

  const isEditorMoving = previewAction === CharacterAction.WALK || previewAction === CharacterAction.RUN;

  return (
    <div className="relative w-full h-full bg-gray-900">
        <Canvas shadows className="bg-gray-900" onPointerMissed={onBackgroundClick}>
            <Suspense fallback={null}>
                <hemisphereLight args={["#ffffff", "#444444", 2.0]} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
                <ambientLight intensity={0.8} />
                
                <Suspense fallback={null}><Environment preset="city" /></Suspense>
                
                <ContactShadows resolution={1024} scale={100} blur={shadowSettings?.blur ?? 0.4} opacity={shadowSettings?.opacity ?? 0.75} color={shadowSettings?.color ?? "#000000"} position={[shadowSettings?.offsetX ?? 0, shadowSettings?.offsetY ?? 0, shadowSettings?.offsetZ ?? 0]} far={10} />

                {(mode === AppMode.MAP_EDITOR || mode === AppMode.ACTION_STUDIO || mode === AppMode.ASSET_LIBRARY || mode === AppMode.CHARACTER_EDITOR || mode === AppMode.MODEL_WORKSHOP || mode === AppMode.VFX_STUDIO) && (
                    <Grid infiniteGrid fadeDistance={40} cellColor="#374151" sectionColor="#1f2937" sectionSize={4} cellSize={1} position={[0, 0.01, 0]} />
                )}
                
                {mode !== AppMode.GAMEPLAY && <CameraController />}

                {mode !== AppMode.MAP_EDITOR && mode !== AppMode.MODEL_WORKSHOP && (
                     <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                        <planeGeometry args={[200, 200]} />
                        <meshStandardMaterial color={mode === AppMode.GAMEPLAY ? mapConfig.groundColor : "#2a2a2a"} roughness={0.8} />
                    </mesh>
                )}

                {/* --- MODE SPECIFIC RENDERING --- */}
                
                {mode === AppMode.MAP_EDITOR ? (
                    <MapEditorScene 
                        mapConfig={mapConfig} setMapConfig={setMapConfig} selectedTool={selectedTool} assetTransforms={assetTransforms} customModels={customModels} selectedEntityIds={selectedEntityIds || new Set()} setSelectedEntityIds={setSelectedEntityIds || (() => {})} onMapHistorySave={onMapHistorySave} savedCharacters={savedCharacters} vfxAssets={vfxAssets} 
                    />
                ) : mode === AppMode.MODEL_WORKSHOP ? (
                     <WorkshopScene 
                        primitives={primitives || []} selectedPrimId={selectedPrimId || null} setSelectedPrimId={setSelectedPrimId!} setPrimitives={setPrimitives!} transformMode={transformMode!} isSnapping={isSnapping} onHistorySave={onHistorySave} config={config} customModels={customModels} workshopRefType={workshopRefType || 'none'} gearTransforms={gearTransforms} referenceOpacity={referenceOpacity} onPartSelect={onPartSelect}
                    />
                ) : mode === AppMode.VFX_STUDIO ? (
                    <VfxStudioScene 
                        vfxAsset={currentVfxAsset} 
                        testParams={vfxTestParams} 
                        customModels={customModels}
                        selectedEmitterId={selectedVfxEmitterId} // Propagate selection
                        onUpdateEmitter={onVfxEmitterUpdate} // Propagate update logic
                    />
                ) : mode === AppMode.GAMEPLAY ? (
                     <GameplayScene 
                        config={config} mapConfig={mapConfig} cameraMode={cameraMode} cameraSettings={cameraSettings} gearTransforms={gearTransforms} customModels={customModels} assetTransforms={assetTransforms} savedCharacters={savedCharacters} onTriggerAttack={onTriggerAttack} lastAttackTrigger={lastAttackTrigger} animConfig={animConfig} customActions={customActions} vfxAssets={vfxAssets} 
                     />
                ) : (
                    <>
                        <Character3D 
                            config={config} action={previewAction} isMoving={isEditorMoving} gearTransforms={gearTransforms} onPartSelect={onPartSelect} onPartRightClick={onPartRightClick} animConfig={animConfig} lastAttackTime={lastAttackTrigger} focusedParentId={focusedParentId} customModels={customModels} onBoneRegister={handleBoneRegister} overridePose={overridePose} overridePosition={overridePosition} activeCustomAction={activeCustomAction} animTime={animTime} isProceduralPaused={isProceduralPaused} customActions={customActions} vfxAssets={vfxAssets} 
                        />
                        {mode === AppMode.ACTION_STUDIO && selectedBone && (
                            <BoneControlScene 
                                selectedBone={selectedBone} bones={boneMap} overridePose={overridePose} setOverridePose={setOverridePose} overridePosition={overridePosition} setOverridePosition={setOverridePosition} onBoneChange={onBoneChange} transformMode={gizmoMode || 'rotate'} 
                            />
                        )}
                    </>
                )}
          </Suspense>
        </Canvas>
    </div>
  );
};

export const GameCanvas = React.memo(GameCanvasComponent);
