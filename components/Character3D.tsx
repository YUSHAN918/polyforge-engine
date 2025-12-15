
import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { CharacterConfig, CharacterAction, GearTransformMap, AnimationConfig, CustomModel, BoneName, CustomAction, Character3DProps, Keyframe, VfxAsset } from '../types';
import { VfxRenderer } from './VfxRenderer';
import * as THREE from 'three';

const SAFE_ANIM_DEFAULTS: AnimationConfig = {
  idle: { speed: 2.0, amplitude: 0.05, sway: 0.02, headBob: 0.01 },
  walk: { speed: 10.0, legAmplitude: 0.6, armAmplitude: 0.6, bounciness: 0.1, kneeBend: 1.5, armSpan: 0.1, spineRotation: 0.1, stepWidth: 0.2, armRotation: 0 },
  run: { speed: 18.0, legAmplitude: 1.0, armAmplitude: 1.2, bodyLean: 0.3, kneeBend: 1.8, armSpan: 0.2, spineRotation: 0.2, stepWidth: 0.3, armRotation: 0 },
  attack: { speedMult: 1.0, windupRatio: 0.25, intensity: 1.0, decay: 0.5, recoil: 0.2, legSpread: 0.4, kneeBend: 0.15 }
};

// Wrapper for interactive parts with hierarchy support
const InteractivePart: React.FC<{
    partId: string;
    parentId?: string;
    focusedParentId?: string;
    defaults?: { position?: [number, number, number], rotation?: [number, number, number], scale?: number | [number, number, number] };
    transforms?: GearTransformMap;
    onSelect?: (id: string, isDoubleClick?: boolean) => void;
    onRightClick?: (id: string) => void;
    children: React.ReactNode;
    parentHovered?: boolean;
    referenceOpacity?: number;
}> = ({ partId, parentId, focusedParentId, defaults, transforms, onSelect, onRightClick, children, parentHovered, referenceOpacity }) => {
    const [hovered, setHovered] = useState(false);
    const override = transforms?.[partId];
    
    const defPos = defaults?.position || [0, 0, 0];
    const defRot = defaults?.rotation || [0, 0, 0];
    const defScale = defaults?.scale || 1;

    const pos = override?.position && override.position.length >= 3 ? override.position : defPos;
    const rot = override?.rotation && override.rotation.length >= 3 ? override.rotation : defRot;
    
    let scale: [number, number, number] = [1, 1, 1];
    const rawScale = override?.scale !== undefined ? override.scale : defScale;

    if (typeof rawScale === 'number') {
        const s = isNaN(rawScale) ? 1 : rawScale;
        scale = [s, s, s];
    } else if (Array.isArray(rawScale) && rawScale.length >= 3) {
        scale = [rawScale[0] || 1, rawScale[1] || 1, rawScale[2] || 1];
    }

    const isInteractive = !!onSelect || !!onRightClick;
    const isChildOfFocused = parentId && parentId === focusedParentId;
    const isFocusedParent = partId === focusedParentId;
    const isNormalMode = !focusedParentId;

    const shouldHandleEvents = isInteractive && ((isNormalMode && !parentId) || (isChildOfFocused));
    const effectiveHover = isInteractive ? (isChildOfFocused ? hovered : (hovered || parentHovered)) : false;

    const handlePointerOver = (e: any) => {
        if (!shouldHandleEvents) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (e: any) => {
        if (!shouldHandleEvents) return;
        setHovered(false);
        document.body.style.cursor = 'auto';
    };
    
    const handleClick = (e: any) => {
        if (!onSelect) return;
        if (!shouldHandleEvents) return;
        e.stopPropagation();
        onSelect(partId, false);
    };

    const handleContextMenu = (e: any) => {
        if (!onRightClick) return;
        if (isNormalMode && !parentId) {
            e.stopPropagation();
            onRightClick(partId);
        }
    }

    const colorOverride = override?.color;

    const recursiveClone = (nodes: React.ReactNode): React.ReactNode => {
        return React.Children.map(nodes, child => {
            if (!React.isValidElement(child)) return child;

            if (typeof child.type === 'function') {
                 return React.cloneElement(child, {
                     // @ts-ignore
                     parentHovered: effectiveHover,
                     focusedParentId: focusedParentId,
                     referenceOpacity
                 });
            }

            const childEl = child as React.ReactElement<any>;
            const childProps: any = {
                children: recursiveClone(childEl.props.children)
            };

            if (child.type === 'meshStandardMaterial') {
                 const matProps: any = {};
                 if (effectiveHover) {
                     matProps.emissive = "#ffffff";
                     matProps.emissiveIntensity = 0.3;
                 }
                 if (colorOverride) matProps.color = colorOverride;
                 if (referenceOpacity !== undefined && referenceOpacity < 1) {
                     matProps.transparent = true;
                     matProps.opacity = referenceOpacity;
                     matProps.depthWrite = false;
                 }
                 return React.cloneElement(child, matProps);
            }
            return React.cloneElement(child, childProps);
        });
    };
    
    const safeVector3 = (v: number[]) => new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
    const safeEuler = (v: number[]) => new THREE.Euler(v[0] || 0, v[1] || 0, v[2] || 0);

    const groupProps: any = {
        position: safeVector3(pos),
        rotation: safeEuler(rot),
        scale: safeVector3(scale),
    };

    if (isInteractive) {
        groupProps.onPointerOver = handlePointerOver;
        groupProps.onPointerOut = handlePointerOut;
        groupProps.onClick = handleClick;
        groupProps.onContextMenu = handleContextMenu;
    }

    return (
        <group {...groupProps}>
            {recursiveClone(children)}
        </group>
    );
};

// --- Custom Asset Renderer ---
export const CustomModelRenderer: React.FC<{ model: CustomModel; referenceOpacity?: number; parentHovered?: boolean }> = ({ model, referenceOpacity, parentHovered }) => {
    if (!model || !Array.isArray(model.parts)) return null;

    return (
        <group>
            {model.parts.map((part, idx) => {
                if (!part) return null;
                const opacity = referenceOpacity !== undefined ? referenceOpacity : 1;
                const transparent = opacity < 1;
                const emissive = parentHovered ? "#ffffff" : "#000000";
                const emissiveIntensity = parentHovered ? 0.3 : 0;
                
                const safeNum = (v: any, def: number) => {
                     const n = Number(v);
                     return isNaN(n) ? def : n;
                };

                const pos = Array.isArray(part.position) && part.position.length >= 3 ? part.position : [0,0,0];
                const rot = Array.isArray(part.rotation) && part.rotation.length >= 3 ? part.rotation : [0,0,0];
                
                let scl = [1, 1, 1];
                if (Array.isArray(part.scale) && part.scale.length >= 3) {
                     scl = part.scale as any;
                } else if (typeof part.scale === 'number') {
                     scl = [part.scale, part.scale, part.scale];
                }
                
                const vPos = new THREE.Vector3(safeNum(pos[0],0), safeNum(pos[1],0), safeNum(pos[2],0));
                const vRot = new THREE.Euler(safeNum(rot[0],0), safeNum(rot[1],0), safeNum(rot[2],0));
                const vScl = new THREE.Vector3(safeNum(scl[0],1), safeNum(scl[1],1), safeNum(scl[2],1));

                return (
                    <mesh 
                        key={part.id || idx}
                        position={vPos}
                        rotation={vRot}
                        scale={vScl}
                    >
                        {part.type === 'box' && <boxGeometry args={[1,1,1]} />}
                        {part.type === 'sphere' && <sphereGeometry args={[0.5]} />}
                        {part.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1]} />}
                        {part.type === 'cone' && <coneGeometry args={[0.5, 1]} />}
                        {part.type === 'torus' && <torusGeometry args={[0.5, 0.2]} />}
                        {part.type === 'capsule' && <capsuleGeometry args={[0.25, 1, 4, 8]} />}
                        {part.type === 'plane' && <planeGeometry args={[1, 1]} />}
                        {part.type === 'tetrahedron' && <tetrahedronGeometry args={[0.5]} />}
                        {part.type === 'ring' && <torusGeometry args={[0.5, 0.05, 16, 100]} />}
                        <meshStandardMaterial 
                            color={part.color} 
                            side={THREE.DoubleSide} 
                            transparent={transparent}
                            opacity={opacity}
                            emissive={emissive}
                            emissiveIntensity={emissiveIntensity}
                        />
                    </mesh>
                )
            })}
        </group>
    );
};

interface Character3DExtendedProps extends Character3DProps {
    forceStepInterpolation?: boolean; // NEW: Force step interpolation for editor preview
}

export const Character3D: React.FC<Character3DExtendedProps> = ({ 
    config, 
    action = CharacterAction.IDLE, 
    lastAttackTime = 0, 
    isMoving = false,
    moveLocal,
    gearTransforms,
    onPartSelect,
    onPartRightClick,
    animConfig,
    focusedParentId,
    customModels = [],
    hiddenSlots = [],
    onBoneRegister,
    overridePose,
    overridePosition, 
    activeCustomAction,
    animTime = 0,
    forceTPose = false,
    freezeAnim = false,
    referenceOpacity,
    isProceduralPaused = false,
    customActions = [],
    forceStepInterpolation = false,
    vfxBindings, // Deprecated, using customModel.vfxBindings now
    vfxAssets = []
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const accumulatedTimeRef = useRef(0);

  const getAnim = <K extends keyof AnimationConfig>(key: K): AnimationConfig[K] => 
    (animConfig?.[key] || SAFE_ANIM_DEFAULTS[key]) as AnimationConfig[K];
    
  const runConfig = getAnim('run');
  const walkConfig = getAnim('walk');
  const idleConfig = getAnim('idle');
  const atkConfig = getAnim('attack');

  const commonProps = {
      transforms: gearTransforms,
      onSelect: onPartSelect,
      onRightClick: onPartRightClick,
      focusedParentId: focusedParentId,
      referenceOpacity: referenceOpacity
  };

  const hipsRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Group>(null);
  const rightFootRef = useRef<THREE.Group>(null);
  const floatingRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (onBoneRegister && hipsRef.current) {
        onBoneRegister({
            hips: hipsRef.current,
            chest: chestRef.current!,
            head: headRef.current!,
            arm_left: leftShoulderRef.current!,
            forearm_left: leftElbowRef.current!,
            hand_left: leftHandRef.current!,
            arm_right: rightShoulderRef.current!,
            forearm_right: rightElbowRef.current!,
            hand_right: rightHandRef.current!,
            thigh_left: leftThighRef.current!,
            calf_left: leftKneeRef.current!,
            foot_left: leftFootRef.current!,
            thigh_right: rightThighRef.current!,
            calf_right: rightKneeRef.current!,
            foot_right: rightFootRef.current!
        });
    }
  }, [onBoneRegister]);

  // --- HELPER TO RENDER VFX ---
  const renderVfxForModel = (modelId: string, slot: 'equip' | 'impact' = 'equip') => {
      const model = getCustomModel(modelId);
      if (!model) return null;
      
      // 1. Check Model Persistence (New way)
      let vfxId = model.vfxBindings?.[slot];
      
      // 2. Fallback to App State Binding (Old way)
      if (!vfxId && vfxBindings && vfxBindings[modelId]) {
          vfxId = vfxBindings[modelId][slot];
      }

      if (!vfxId) return null;
      
      const vfxAsset = vfxAssets.find(v => v.id === vfxId);
      if (!vfxAsset) return null;

      // Note: We don't need to pass a parent ref here because the VfxRenderer 
      // is mounted as a CHILD of the bone. It will automatically track the parent's world position
      // using the internal trackerRef logic in VfxRenderer.tsx.
      return <VfxRenderer vfxAsset={vfxAsset} isPlaying={true} />;
  };

  // --- SMART INTERPOLATION (Handles Sparse Data & Position) ---
  const interpolateAction = (action: CustomAction, time: number, bone: BoneName, type: 'rotation' | 'position' = 'rotation'): THREE.Vector3 | null => {
      if (!action.keyframes || action.keyframes.length === 0) return null;

      const relevantFrames = action.keyframes.filter(k => {
          if (type === 'rotation') return k.boneRotations && k.boneRotations[bone];
          if (type === 'position') return k.bonePositions && k.bonePositions[bone];
          return false;
      });
      
      if (relevantFrames.length === 0) return null;
      
      relevantFrames.sort((a,b) => a.time - b.time);
      
      const getData = (k: Keyframe) => type === 'rotation' ? k.boneRotations[bone] : k.bonePositions![bone];

      if (relevantFrames.length === 1) return new THREE.Vector3(...getData(relevantFrames[0]));

      let prevFrame = relevantFrames[relevantFrames.length - 1];
      let nextFrame = relevantFrames[0];

      for (let i = 0; i < relevantFrames.length; i++) {
          if (time >= relevantFrames[i].time) {
              prevFrame = relevantFrames[i];
          } else {
              nextFrame = relevantFrames[i];
              break;
          }
      }
      
      let isWrapping = false;
      if (prevFrame === relevantFrames[relevantFrames.length - 1] && time >= prevFrame.time) {
          nextFrame = relevantFrames[0];
          isWrapping = true;
      }

      if (!action.loop && time >= relevantFrames[relevantFrames.length - 1].time) {
           return new THREE.Vector3(...getData(relevantFrames[relevantFrames.length - 1]));
      }

      const valA = getData(prevFrame);
      const valB = getData(nextFrame);

      if (!valA || !valB) return null; 

      if (forceStepInterpolation || action.interpolation === 'step') return new THREE.Vector3(...valA);

      let alpha = 0;
      const tA = prevFrame.time;
      const tB = nextFrame.time;

      if (isWrapping) {
          const duration = (1.0 - tA) + tB;
          if (duration > 0) {
              const dist = time >= tA ? (time - tA) : (1.0 - tA + time);
              alpha = dist / duration;
          }
      } else {
          const duration = tB - tA;
          if (duration > 0) alpha = (time - tA) / duration;
      }

      alpha = Math.max(0, Math.min(1, alpha));

      if (action.interpolation === 'easeInOut') {
          alpha = -(Math.cos(Math.PI * alpha) - 1) / 2;
      }

      if (type === 'rotation') {
          const lerpAngle = (start: number, end: number, t: number) => {
              const diff = end - start;
              const delta = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
              return start + delta * t;
          };
          const x = lerpAngle(valA[0], valB[0], alpha);
          const y = lerpAngle(valA[1], valB[1], alpha);
          const z = lerpAngle(valA[2], valB[2], alpha);
          return new THREE.Vector3(x, y, z);
      } else {
          const x = valA[0] + (valB[0] - valA[0]) * alpha;
          const y = valA[1] + (valB[1] - valA[1]) * alpha;
          const z = valA[2] + (valB[2] - valA[2]) * alpha;
          return new THREE.Vector3(x, y, z);
      }
  };

  const prevAttackTimePropRef = useRef(lastAttackTime);
  const localAttackStartRef = useRef(0);

  // NEW: SCALING LOGIC
  const scaleH = 1.0; 
  const scaleW = 1.0;

  // Extract dimensions safely with defaults
  const { 
      bodyScale = 1.0, bodyWidth = 1.0, bodyHeight = 1.0, 
      headScale = 1.0 // Removed explicit width/height for head to keep it uniform and simple
  } = config.dimensions || {};

  // Calculate actual scale factors applied to the Body Group
  const finalBodyScaleX = bodyScale * bodyWidth;
  const finalBodyScaleY = bodyScale * bodyHeight;
  const finalBodyScaleZ = bodyScale * bodyWidth; // Assuming uniform Z width

  // Calculate INVERSE scale for the head to neutralize body scaling
  // If Body is 2x, Head should be 0.5x locally to appear 1x globally
  // Then multiply by desired headScale
  const headLocalScaleX = (headScale / (finalBodyScaleX || 1));
  const headLocalScaleY = (headScale / (finalBodyScaleY || 1));
  const headLocalScaleZ = (headScale / (finalBodyScaleZ || 1));

  // FIX: Calculate offset to maintain constant world-space neck length
  // We maintain a fixed Gap + Radius in world space.
  // Head Center Y = Chest Top Y + Gap + Radius.
  // In Local Chest Space (divided by BodyScaleY):
  const baseHeadRadius = 0.25; 
  const desiredNeckGap = 0.05; 
  const headRadiusWorld = baseHeadRadius * headScale;
  const headNeckOffset = (desiredNeckGap + headRadiusWorld) / (finalBodyScaleY || 1);

  const CHEST_HEIGHT = 0.5 * scaleH;
  const CHEST_WIDTH = 0.5 * scaleW;
  const CHEST_DEPTH = 0.3;
  const HIPS_HEIGHT = 0.3 * scaleH;
  const HIPS_WIDTH = 0.45 * scaleW;
  const HIPS_DEPTH = 0.28;
  const UPPER_ARM_LEN = 0.35 * scaleH;
  const LOWER_ARM_LEN = 0.35 * scaleH;
  const LIMB_THICKNESS = 0.18 * ((scaleH + scaleW)/2);
  const THIGH_LEN = 0.45 * scaleH;
  const CALF_LEN = 0.45 * scaleH;
  const LEG_THICKNESS = 0.2 * ((scaleH + scaleW)/2);
  const FOOT_LEN = 0.3;
  const HAND_SIZE = 0.15;
  const SHOULDER_OFFSET_X = CHEST_WIDTH * 0.7; 
  const HIP_JOINT_OFFSET_X = HIPS_WIDTH * 0.4;
  const BASE_HIPS_Y = THIGH_LEN + CALF_LEN + 0.1;

  const weapon = config.gear.weapon || 'none';
  const isFloatingWeapon = weapon === 'staff_orb';

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (forceTPose) {
        if (hipsRef.current) {
            hipsRef.current.position.y = BASE_HIPS_Y;
            hipsRef.current.position.x = 0; hipsRef.current.position.z = 0;
        }
        const reset = (ref: any) => ref && ref.rotation.set(0,0,0);
        reset(hipsRef.current); reset(chestRef.current);
        reset(leftThighRef.current); reset(leftKneeRef.current); reset(leftFootRef.current);
        reset(rightThighRef.current); reset(rightKneeRef.current); reset(rightFootRef.current);
        reset(leftShoulderRef.current); reset(leftElbowRef.current); reset(leftHandRef.current);
        reset(rightShoulderRef.current); reset(rightElbowRef.current); reset(rightHandRef.current);
        reset(headRef.current);
        if (leftShoulderRef.current) leftShoulderRef.current.rotation.z = Math.PI / 2;
        if (rightShoulderRef.current) rightShoulderRef.current.rotation.z = -Math.PI / 2;
        return;
    }
    
    if (!isProceduralPaused && !freezeAnim) {
        accumulatedTimeRef.current += delta;
    }
    
    const t = freezeAnim ? 0 : accumulatedTimeRef.current;
    const iPoseMode = freezeAnim;

    if (lastAttackTime !== prevAttackTimePropRef.current) {
        prevAttackTimePropRef.current = lastAttackTime;
        localAttackStartRef.current = t;
    }
    const timeSinceAttack = t - localAttackStartRef.current;
    
    if (floatingRef.current) {
        floatingRef.current.position.y = Math.sin(t * 1.5) * 0.05;
    }

    // =========================================================================================
    //  ANIMATION VARIABLES (FULL DOF)
    // =========================================================================================
    let hipsPosY = BASE_HIPS_Y; 
    let hipsPosX = 0, hipsPosZ = 0; // Hips Translation
    let hipsX = 0, hipsY = 0, hipsZ = 0;
    
    let chestX = 0, chestY = 0, chestZ = 0;
    let headX = 0, headY = 0, headZ = 0;

    let ltThighX = 0, ltThighY = 0, ltThighZ = 0;
    let rtThighX = 0, rtThighY = 0, rtThighZ = 0;
    
    let ltKneeX = 0, ltKneeY = 0, ltKneeZ = 0;
    let rtKneeX = 0, rtKneeY = 0, rtKneeZ = 0;
    
    let ltFootX = 0, ltFootY = 0, ltFootZ = 0;
    let rtFootX = 0, rtFootY = 0, rtFootZ = 0;

    // --- BASE POSE LOGIC ---
    let ltShoulderX = 0, ltShoulderY = 0, ltShoulderZ = 0;
    let rtShoulderX = 0, rtShoulderY = 0, rtShoulderZ = 0;
    let ltElbowX = 0, ltElbowY = 0, ltElbowZ = 0;
    let rtElbowX = 0, rtElbowY = 0, rtElbowZ = 0;
    let ltHandX = 0, ltHandY = 0, ltHandZ = 0;
    let rtHandX = 0, rtHandY = 0, rtHandZ = 0;

    // IMPORTANT: If we are in EDITOR MODE (activeCustomAction exists), we SKIP most procedural logic
    if (!activeCustomAction) {
        const armSpan = (action === CharacterAction.RUN) ? (runConfig.armSpan ?? 0.2) : (walkConfig.armSpan ?? 0.1);
        const baseArmFlare = iPoseMode ? 0 : armSpan;
        const armRotOffset = (action === CharacterAction.RUN) ? (runConfig.armRotation ?? 0) : (walkConfig.armRotation ?? 0);

        ltShoulderX = armRotOffset;
        ltShoulderZ = baseArmFlare;
        rtShoulderX = armRotOffset;
        rtShoulderZ = -baseArmFlare;

        // --- HELPER: Apply Keyframe Action to Variables ---
        const applyLinkedAction = (actionId: string, timeProgress: number) => {
            const linkedAction = customActions.find(a => a.id === actionId);
            if (!linkedAction) return false;

            const apply = (bone: BoneName, cx: number, cy: number, cz: number, setter: (x: number, y: number, z: number) => void) => {
                const euler = interpolateAction(linkedAction, timeProgress, bone, 'rotation');
                if (euler) {
                    setter(euler.x, euler.y, euler.z);
                }
            };

            const hipsPos = interpolateAction(linkedAction, timeProgress, 'hips', 'position');
            if (hipsPos) {
                hipsPosX = hipsPos.x;
                hipsPosY = hipsPos.y; 
                hipsPosZ = hipsPos.z;
            }

            apply('hips', hipsX, hipsY, hipsZ, (x, y, z) => { hipsX = x; hipsY = y; hipsZ = z; });
            apply('chest', chestX, chestY, chestZ, (x, y, z) => { chestX = x; chestY = y; chestZ = z; });
            apply('head', headX, headY, headZ, (x, y, z) => { headX = x; headY = y; headZ = z; });
            
            apply('thigh_left', ltThighX, ltThighY, ltThighZ, (x, y, z) => { ltThighX = x; ltThighY = y; ltThighZ = z; });
            apply('thigh_right', rtThighX, rtThighY, rtThighZ, (x, y, z) => { rtThighX = x; rtThighY = y; rtThighZ = z; });
            
            apply('calf_left', ltKneeX, ltKneeY, ltKneeZ, (x, y, z) => { ltKneeX = x; ltKneeY = y; ltKneeZ = z; });
            apply('calf_right', rtKneeX, rtKneeY, rtKneeZ, (x, y, z) => { rtKneeX = x; rtKneeY = y; rtKneeZ = z; });
            
            apply('foot_left', ltFootX, ltFootY, ltFootZ, (x, y, z) => { ltFootX = x; ltFootY = y; ltFootZ = z; });
            apply('foot_right', rtFootX, rtFootY, rtFootZ, (x, y, z) => { rtFootX = x; rtFootY = y; rtFootZ = z; });

            apply('arm_left', ltShoulderX, ltShoulderY, ltShoulderZ, (x, y, z) => { ltShoulderX = x; ltShoulderY = y; ltShoulderZ = z; });
            apply('arm_right', rtShoulderX, rtShoulderY, rtShoulderZ, (x, y, z) => { rtShoulderX = x; rtShoulderY = y; rtShoulderZ = z; });
            
            apply('forearm_left', ltElbowX, ltElbowY, ltElbowZ, (x, y, z) => { ltElbowX = x; ltElbowY = y; ltElbowZ = z; });
            apply('forearm_right', rtElbowX, rtElbowY, rtElbowZ, (x, y, z) => { rtElbowX = x; rtElbowY = y; rtElbowZ = z; });
            
            apply('hand_left', ltHandX, ltHandY, ltHandZ, (x, y, z) => { ltHandX = x; ltHandY = y; ltHandZ = z; });
            apply('hand_right', rtHandX, rtHandY, rtHandZ, (x, y, z) => { rtHandX = x; rtHandY = y; rtHandZ = z; });

            return true;
        };

        // --- 1. LOCOMOTION LOGIC ---
        const strafeVal = moveLocal ? moveLocal.x : 0;
        const fwdVal = moveLocal ? moveLocal.y : 0;
        const isMovingLocal = Math.abs(strafeVal) > 0.1 || Math.abs(fwdVal) > 0.1;
        const isMovingBackward = fwdVal < -0.2; 

        // ATTACK DURATION
        const speedMult = atkConfig.speedMult || 1.0;
        const duration = 0.6 / speedMult;
        const isAttacking = timeSinceAttack < duration;

        // Config Selection
        let speed = 0, legAmp = 1.0, armAmp = 1.0, bounce = 0, kneeBend = 1.5, spineRot = 0.1;
        let activeLinkedActionId: string | undefined = undefined;
        let activeActionDuration = 1.0;
        
        let idleChestOffset = 0, idleHipsOffset = 0, idleHeadOffset = 0;

        if (action === CharacterAction.RUN) {
            speed = runConfig.speed || 18;
            legAmp = runConfig.legAmplitude || 1.0;
            armAmp = runConfig.armAmplitude || 1.2;
            activeLinkedActionId = runConfig.linkedActionId;
            
            chestX = runConfig.bodyLean || 0.3;
            bounce = runConfig.bounciness || 0.15;
            kneeBend = runConfig.kneeBend ?? 1.8;
            spineRot = runConfig.spineRotation ?? 0.2;
        } else if (action === CharacterAction.WALK || (isAttacking && isMoving)) {
            speed = walkConfig.speed || 10;
            legAmp = walkConfig.legAmplitude || 0.6;
            armAmp = walkConfig.armAmplitude || 0.6;
            activeLinkedActionId = walkConfig.linkedActionId;

            bounce = walkConfig.bounciness || 0.05;
            kneeBend = walkConfig.kneeBend ?? 1.5;
            spineRot = walkConfig.spineRotation ?? 0.1;
        } else if (action === CharacterAction.ATTACK) {
            activeLinkedActionId = idleConfig?.linkedActionId; 
            legAmp = 1.0;
            armAmp = 1.0;
        } else {
            // IDLE
            const idleSpeed = idleConfig.speed || 2.0;
            activeLinkedActionId = idleConfig.linkedActionId;
            
            legAmp = 1.0;
            armAmp = 1.0;

            idleChestOffset = Math.sin(t * idleSpeed) * (idleConfig.amplitude || 0.05);
            idleHipsOffset = Math.sin(t * (idleSpeed * 0.5)) * (idleConfig.sway || 0.02);
            idleHeadOffset = -Math.sin(t * idleSpeed) * (idleConfig.headBob || 0.01);
        }

        if (activeLinkedActionId) {
            const linkedAct = customActions.find(a => a.id === activeLinkedActionId);
            if (linkedAct) activeActionDuration = linkedAct.duration;
        }

        // --- APPLY LOCOMOTION (LINKED vs PROCEDURAL) ---
        if (activeLinkedActionId) {
            // --- A. HYBRID DRIVER (Linked + Parametric) ---
            const baseSpeed = action === CharacterAction.RUN ? 18.0 : 10.0;
            const playbackRate = (action === CharacterAction.IDLE || action === CharacterAction.ATTACK) ? 1.0 : (speed > 0 ? (speed / baseSpeed) : 1.0);
            
            const effectiveDuration = activeActionDuration; 
            const scaledTime = t * playbackRate; 
            const loopTime = effectiveDuration > 0 ? (scaledTime % effectiveDuration) / effectiveDuration : 0;
            
            applyLinkedAction(activeLinkedActionId, loopTime);

            if (legAmp !== 1.0) {
                ltThighX *= legAmp; rtThighX *= legAmp;
                ltKneeX *= legAmp; rtKneeX *= legAmp;
            }
            if (armAmp !== 1.0) {
                ltShoulderX *= armAmp; rtShoulderX *= armAmp;
                ltElbowX *= armAmp; rtElbowX *= armAmp;
            }

            if (action === CharacterAction.IDLE) {
                chestX += idleChestOffset;
                hipsY += idleHipsOffset;
                headX += idleHeadOffset;
            }

            if (speed > 0 && action !== CharacterAction.IDLE && action !== CharacterAction.ATTACK) {
                hipsPosY += Math.abs(Math.sin(scaledTime * 10)) * bounce * 0.5; 

                if (isMovingBackward) {
                    chestX += -0.2;
                } else if (isMovingLocal) {
                    const moveAngle = Math.atan2(strafeVal, fwdVal);
                    hipsY += moveAngle;
                    chestY += -moveAngle;
                }
            }

        } else if (speed > 0) {
            // --- B. PURE PROCEDURAL (Math) ---
            if (isMovingBackward) {
                chestX = -0.2;
            } else if (isMovingLocal) {
                const moveAngle = Math.atan2(strafeVal, fwdVal);
                hipsY = moveAngle;
                chestY = -moveAngle;
                chestY += Math.cos(t * speed) * spineRot;
            }

            hipsPosY += Math.abs(Math.sin(t * speed)) * bounce;

            const cycleTime = isMovingBackward ? -t : t;
            const ltCycle = Math.sin(cycleTime * speed + Math.PI);
            const rtCycle = Math.sin(cycleTime * speed);
            
            ltThighX = ltCycle * legAmp;
            rtThighX = rtCycle * legAmp;
            
            ltKneeX = ltCycle > 0 ? 0 : Math.abs(ltCycle) * kneeBend * legAmp; 
            rtKneeX = rtCycle > 0 ? 0 : Math.abs(rtCycle) * kneeBend * legAmp;
            
            ltFootX = ltCycle * 0.2;
            rtFootX = rtCycle * 0.2;

            if (!isAttacking && action !== CharacterAction.ATTACK) {
                const armRotOffset = (action === CharacterAction.RUN) ? (runConfig.armRotation ?? 0) : (walkConfig.armRotation ?? 0);
                
                ltShoulderX = armRotOffset + Math.sin(t * speed) * armAmp; 
                rtShoulderX = armRotOffset + Math.sin(t * speed + Math.PI) * armAmp;
                
                if (action === CharacterAction.RUN) { ltElbowX = -1.5; rtElbowX = -1.5; } 
                else { ltElbowX = -0.2; rtElbowX = -0.2; }
            }
        } else {
            // --- C. PURE PROCEDURAL IDLE (No Linked Action, No Speed) ---
            if (action === CharacterAction.IDLE) {
                chestX = idleChestOffset;
                hipsY = idleHipsOffset;
                headX = idleHeadOffset;

                const iSpeed = idleConfig.speed || 2.0;
                ltShoulderZ += Math.sin(t * iSpeed) * 0.02;
                rtShoulderZ -= Math.sin(t * iSpeed) * 0.02;
            }
        }
        
        // --- 3. ATTACK OVERLAY LOGIC ---
        if (action === CharacterAction.ATTACK || isAttacking) {
            const decay = atkConfig.decay || 0.5;
            const progress = Math.min(1, timeSinceAttack / duration);
            const recoveryTime = duration * (1/decay); 
            const recoveryProgress = Math.max(0, (timeSinceAttack - duration) / recoveryTime);
            const isRecovering = timeSinceAttack > duration;
            
            const linkedActionId = atkConfig.linkedActionId;
            const linkedAction = linkedActionId ? customActions.find(a => a.id === linkedActionId) : null;
            
            if (linkedActionId && linkedAction) {
                const kfTime = progress;
                
                const applyBone = (bone: BoneName, cx: number, cy: number, cz: number, isUpperBody: boolean): [number, number, number] => {
                    if (isMoving && !isUpperBody) return [cx, cy, cz];

                    const euler = interpolateAction(linkedAction, kfTime, bone, 'rotation');
                    if (euler) {
                        let tx = euler.x;
                        let ty = euler.y;
                        let tz = euler.z;

                        if (isRecovering && recoveryProgress < 1) {
                            const blend = 1 - recoveryProgress;
                            return [
                                cx * (1-blend) + tx * blend,
                                cy * (1-blend) + ty * blend,
                                cz * (1-blend) + tz * blend
                            ];
                        } else if (!isRecovering) {
                            if (bone === 'chest') {
                                return [tx, cy + ty, tz]; 
                            }
                            if (bone === 'hips') {
                                return [tx, ty, tz];
                            }
                            return [tx, ty, tz];
                        }
                    }
                    return [cx, cy, cz];
                };

                let res: [number, number, number];

                res = applyBone('hips', hipsX, hipsY, hipsZ, false);
                hipsX = res[0]; hipsY = res[1]; hipsZ = res[2];

                if (!isMoving) {
                    const hipsPos = interpolateAction(linkedAction, kfTime, 'hips', 'position');
                    if (hipsPos) {
                        if (isRecovering && recoveryProgress < 1) {
                            const blend = 1 - recoveryProgress;
                            hipsPosX = hipsPosX * (1-blend) + hipsPos.x * blend;
                            hipsPosY = hipsPosY * (1-blend) + hipsPos.y * blend; 
                            hipsPosZ = hipsPosZ * (1-blend) + hipsPos.z * blend;
                        } else if (!isRecovering) {
                            hipsPosX = hipsPos.x;
                            hipsPosY = hipsPos.y; 
                            hipsPosZ = hipsPos.z;
                        }
                    }
                }

                res = applyBone('thigh_left', ltThighX, ltThighY, ltThighZ, false);
                ltThighX = res[0]; ltThighY = res[1]; ltThighZ = res[2];

                res = applyBone('thigh_right', rtThighX, rtThighY, rtThighZ, false);
                rtThighX = res[0]; rtThighY = res[1]; rtThighZ = res[2];

                res = applyBone('calf_left', ltKneeX, ltKneeY, ltKneeZ, false);
                ltKneeX = res[0]; ltKneeY = res[1]; ltKneeZ = res[2];

                res = applyBone('calf_right', rtKneeX, rtKneeY, rtKneeZ, false);
                rtKneeX = res[0]; rtKneeY = res[1]; rtKneeZ = res[2];

                res = applyBone('foot_left', ltFootX, ltFootY, ltFootZ, false);
                ltFootX = res[0]; ltFootY = res[1]; ltFootZ = res[2];

                res = applyBone('foot_right', rtFootX, rtFootY, rtFootZ, false);
                rtFootX = res[0]; rtFootY = res[1]; rtFootZ = res[2];

                res = applyBone('chest', chestX, chestY, chestZ, true);
                chestX = res[0]; chestY = res[1]; chestZ = res[2];

                res = applyBone('head', headX, headY, headZ, true);
                headX = res[0]; headY = res[1]; headZ = res[2];

                res = applyBone('arm_left', ltShoulderX, ltShoulderY, ltShoulderZ, true);
                ltShoulderX = res[0]; ltShoulderY = res[1]; ltShoulderZ = res[2];

                res = applyBone('arm_right', rtShoulderX, rtShoulderY, rtShoulderZ, true);
                rtShoulderX = res[0]; rtShoulderY = res[1]; rtShoulderZ = res[2];

                res = applyBone('forearm_left', ltElbowX, ltElbowY, ltElbowZ, true);
                ltElbowX = res[0]; ltElbowY = res[1]; ltElbowZ = res[2];

                res = applyBone('forearm_right', rtElbowX, rtElbowY, rtElbowZ, true);
                rtElbowX = res[0]; rtElbowY = res[1]; rtElbowZ = res[2];

                res = applyBone('hand_left', ltHandX, ltHandY, ltHandZ, true);
                ltHandX = res[0]; ltHandY = res[1]; ltHandZ = res[2];

                res = applyBone('hand_right', rtHandX, rtHandY, rtHandZ, true);
                rtHandX = res[0]; rtHandY = res[1]; rtHandZ = res[2];

            } else {
                if (linkedActionId) {
                    ltShoulderX = 0; rtShoulderX = 0;
                } else {
                    const stanceWidth = atkConfig.legSpread ?? 0.4;
                    const attackCrouch = atkConfig.kneeBend ?? 0.15;
                    const windupEnd = atkConfig.windupRatio || 0.25;
                    const intensity = atkConfig.intensity || 1.0;
                    const recoil = atkConfig.recoil || 0.2;

                    if (!isMoving) {
                        let recoilVal = 0;
                        if (progress > windupEnd && !isRecovering) {
                            recoilVal = Math.sin((progress - windupEnd)/(1-windupEnd) * Math.PI) * recoil;
                        }
                        hipsPosY -= attackCrouch; 
                        if (hipsRef.current) hipsRef.current.position.z = -recoilVal; 
                        ltThighX = -stanceWidth - recoilVal; 
                        rtThighX = stanceWidth - recoilVal; 
                        if (attackCrouch > 0.2) { ltKneeX = 0.5; rtKneeX = 0.5; }
                    }

                    let targetRotX = rtShoulderX;
                    let targetRotY = 0;
                    let targetRotZ = rtShoulderZ;
                    let targetChestRotY = chestY;
                    
                    if (progress < windupEnd) {
                        const p = progress / windupEnd;
                        targetRotX = -Math.PI * 0.8 * p * intensity;
                        targetRotZ = 0.5 * p;
                        rtElbowX = -1.5 * p;
                        targetChestRotY += -0.8 * p * intensity;
                    } else if (!isRecovering) {
                        const p = (progress - windupEnd) / (1 - windupEnd);
                        targetRotX = (-Math.PI * 0.8) + (Math.PI * 1.2 * p * intensity);
                        rtElbowX = -1.5 * (1-p);
                        targetChestRotY += -0.8 + (1.2 * p * intensity);
                    }

                    if (isRecovering && recoveryProgress < 1) {
                        const blend = 1 - recoveryProgress; 
                        rtShoulderX = rtShoulderX * (1-blend) + (targetRotX * blend);
                        rtShoulderY = rtShoulderY * (1-blend) + (targetRotY * blend);
                        rtShoulderZ = rtShoulderZ * (1-blend) + (targetRotZ * blend);
                        chestY = chestY * (1-blend) + (targetChestRotY * blend);
                    } else if (!isRecovering) {
                        rtShoulderX = targetRotX;
                        rtShoulderY = targetRotY;
                        rtShoulderZ = targetRotZ;
                        chestY = targetChestRotY;
                    }
                }
            }
        }
    } // End of !activeCustomAction block

    const isCustomActionActive = !!activeCustomAction;

    const apply = (ref: any, name: BoneName, x: number, y: number, z: number) => {
        if (!ref) return;
        let finalX = x; let finalY = y; let finalZ = z;

        if (isCustomActionActive && activeCustomAction) {
            const interpolated = interpolateAction(activeCustomAction, animTime, name, 'rotation');
            if (interpolated) { finalX = interpolated.x; finalY = interpolated.y; finalZ = interpolated.z; }
        }

        if (overridePose && overridePose[name]) { 
            [finalX, finalY, finalZ] = overridePose[name]; 
        } 

        ref.rotation.set(finalX, finalY, finalZ);
    }

    if (hipsRef.current) {
        let finalHipsX = hipsPosX;
        let finalHipsY = hipsPosY;
        let finalHipsZ = hipsPosZ;

        if (isCustomActionActive && activeCustomAction) {
             const interpolatedPos = interpolateAction(activeCustomAction, animTime, 'hips', 'position');
             if (interpolatedPos) {
                 finalHipsX = interpolatedPos.x;
                 finalHipsY = interpolatedPos.y; 
                 finalHipsZ = interpolatedPos.z;
             }
        }

        if (overridePosition && overridePosition['hips']) {
            [finalHipsX, finalHipsY, finalHipsZ] = overridePosition['hips'];
        }

        hipsRef.current.position.set(finalHipsX, finalHipsY, finalHipsZ);
    }
    
    apply(hipsRef.current, 'hips', hipsX, hipsY, hipsZ); 
    apply(chestRef.current, 'chest', chestX, chestY, chestZ);
    
    apply(leftThighRef.current, 'thigh_left', ltThighX, ltThighY, ltThighZ);
    apply(leftKneeRef.current, 'calf_left', ltKneeX, ltKneeY, ltKneeZ);
    apply(leftFootRef.current, 'foot_left', ltFootX, ltFootY, ltFootZ);
    
    apply(rightThighRef.current, 'thigh_right', rtThighX, rtThighY, rtThighZ);
    apply(rightKneeRef.current, 'calf_right', rtKneeX, rtKneeY, rtKneeZ);
    apply(rightFootRef.current, 'foot_right', rtFootX, rtFootY, rtFootZ);
    
    apply(leftShoulderRef.current, 'arm_left', ltShoulderX, ltShoulderY, ltShoulderZ);
    apply(leftElbowRef.current, 'forearm_left', ltElbowX, ltElbowY, ltElbowZ);
    apply(leftHandRef.current, 'hand_left', ltHandX, ltHandY, ltHandZ);

    apply(rightShoulderRef.current, 'arm_right', rtShoulderX, rtShoulderY, rtShoulderZ);
    apply(rightElbowRef.current, 'forearm_right', rtElbowX, rtElbowY, rtElbowZ);
    apply(rightHandRef.current, 'hand_right', rtHandX, rtHandY, rtHandZ);

    apply(headRef.current, 'head', headX, headY, headZ);
  });

  const getCustomModel = (id: string | undefined) => id ? customModels.find(m => m.id === id) : undefined;
  const shouldHide = (slot: string) => hiddenSlots.includes(slot);
  const hasHelm = config.gear.helm && config.gear.helm !== 'none';
  const showHair = !shouldHide('hair') && !hasHelm;

  return (
    <group ref={groupRef}>
      {/* 
          NEW SCALING WRAPPER GROUP 
          Scales the entire body hierarchy uniformly from the root (0,0,0 feet).
          Head scale is applied LOCALLY to the headRef using INVERSE logic.
      */}
      <group scale={[finalBodyScaleX, finalBodyScaleY, finalBodyScaleZ]}>
          <group ref={hipsRef} position={[0, THIGH_LEN + CALF_LEN + 0.1, 0]}>
              <InteractivePart partId="hips" {...commonProps}>
                 {config.hipsStyle && getCustomModel(config.hipsStyle) ? (
                     <CustomModelRenderer model={getCustomModel(config.hipsStyle)!} />
                 ) : (
                     <mesh><boxGeometry args={[HIPS_WIDTH, HIPS_HEIGHT, HIPS_DEPTH]} /><meshStandardMaterial color={config.bodyColor} /></mesh>
                 )}
              </InteractivePart>

              <group ref={chestRef} position={[0, (HIPS_HEIGHT + CHEST_HEIGHT)/2, 0]}>
                 <InteractivePart partId="chest" {...commonProps}>
                    {config.chestStyle && getCustomModel(config.chestStyle) ? (
                        <CustomModelRenderer model={getCustomModel(config.chestStyle)!} />
                    ) : (
                        <mesh><boxGeometry args={[CHEST_WIDTH, CHEST_HEIGHT, CHEST_DEPTH]} /><meshStandardMaterial color={config.bodyColor} /></mesh>
                    )}
                 </InteractivePart>
                 
                 {isFloatingWeapon && !shouldHide('weapon') && (
                     <group position={[0, 0, 0]}>
                         <group ref={floatingRef}>
                            <InteractivePart partId={config.gear.weapon} {...commonProps}>
                                 {config.gear.weapon === 'staff_orb' && (
                                    <group>
                                        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.04, 0.04, 1.6]} /><meshStandardMaterial color="#581c87"/></mesh>
                                        <mesh position={[0, 1.4, 0]}><octahedronGeometry args={[0.2]} /><meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2}/></mesh>
                                    </group>
                                 )}
                            </InteractivePart>
                         </group>
                     </group>
                 )}

                 {/* HEAD GROUP - Inverse Scaling Applied Here to maintain constant visual size */}
                 <group 
                    ref={headRef} 
                    position={[0, CHEST_HEIGHT/2 + headNeckOffset, 0]}
                    scale={[headLocalScaleX, headLocalScaleY, headLocalScaleZ]}
                 >
                     {!shouldHide('head') && (
                         <InteractivePart partId={config.headStyle === 'box' ? 'head' : config.headStyle} {...commonProps}>
                            {getCustomModel(config.headStyle) ? (
                                <CustomModelRenderer model={getCustomModel(config.headStyle)!} />
                            ) : (
                                <mesh><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={config.skinColor} /></mesh>
                            )}
                         </InteractivePart>
                     )}
                     {/* Helm Logic */}
                     {!shouldHide('helm') && config.gear.helm && config.gear.helm !== 'none' && (
                         <InteractivePart partId={config.gear.helm} {...commonProps}>
                             {getCustomModel(config.gear.helm) && <CustomModelRenderer model={getCustomModel(config.gear.helm)!} />}
                             {/* VFX Injection */}
                             {renderVfxForModel(config.gear.helm, 'equip')}
                         </InteractivePart>
                     )}
                     {/* Mask Logic (New Slot) */}
                     {!shouldHide('mask') && config.gear.mask && config.gear.mask !== 'none' && (
                         <InteractivePart partId={config.gear.mask} {...commonProps}>
                             {getCustomModel(config.gear.mask) && <CustomModelRenderer model={getCustomModel(config.gear.mask)!} />}
                             {/* VFX Injection */}
                             {renderVfxForModel(config.gear.mask, 'equip')}
                         </InteractivePart>
                     )}
                     
                     {!shouldHide('eye') && (
                         <group position={[0, 0, 0]}>
                             {config.eyeStyle && getCustomModel(config.eyeStyle) ? (
                                <InteractivePart partId={config.eyeStyle} {...commonProps}>
                                     <CustomModelRenderer model={getCustomModel(config.eyeStyle)!} />
                                </InteractivePart>
                             ) : (
                                <>
                                    {config.eyeStyle === 'dot' && (
                                        <>
                                            <InteractivePart partId="eye_left_dot" {...commonProps}><mesh position={[0.12, 0, 0.25]}><sphereGeometry args={[0.04]} /><meshStandardMaterial color="black"/></mesh></InteractivePart>
                                            <InteractivePart partId="eye_right_dot" {...commonProps}><mesh position={[-0.12, 0, 0.25]}><sphereGeometry args={[0.04]} /><meshStandardMaterial color="black"/></mesh></InteractivePart>
                                        </>
                                    )}
                                </>
                             )}
                         </group>
                     )}
                     {!shouldHide('mouth') && (
                         <group position={[0, 0, 0]}>
                             {config.mouthStyle && getCustomModel(config.mouthStyle) ? (
                                <InteractivePart partId={config.mouthStyle} {...commonProps}>
                                     <CustomModelRenderer model={getCustomModel(config.mouthStyle)!} />
                                </InteractivePart>
                             ) : (
                                <>
                                    {/* Default mouths */}
                                </>
                             )}
                         </group>
                     )}
                     {showHair && (
                         <group position={[0, 0, 0]}>
                             {config.hairStyle && getCustomModel(config.hairStyle) ? (
                                <InteractivePart partId={config.hairStyle} {...commonProps}>
                                     <CustomModelRenderer model={getCustomModel(config.hairStyle)!} />
                                </InteractivePart>
                             ) : null}
                         </group>
                     )}
                 </group>
                 
                 {/* LEFT ARM */}
                 <group ref={leftShoulderRef} position={[SHOULDER_OFFSET_X, CHEST_HEIGHT/2 - 0.1, 0]}>
                    <InteractivePart partId="arm_left" {...commonProps}>
                        {config.upperArmStyle && getCustomModel(config.upperArmStyle) ? (
                            <CustomModelRenderer model={getCustomModel(config.upperArmStyle)!} />
                        ) : (
                            <mesh position={[0, -UPPER_ARM_LEN/2, 0]}><boxGeometry args={[LIMB_THICKNESS, UPPER_ARM_LEN, LIMB_THICKNESS]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                        )}
                    </InteractivePart>
                    <group ref={leftElbowRef} position={[0, -UPPER_ARM_LEN, 0]}>
                        <InteractivePart partId="forearm_left" {...commonProps}>
                            {config.forearmStyle && getCustomModel(config.forearmStyle) ? (
                                <CustomModelRenderer model={getCustomModel(config.forearmStyle)!} />
                            ) : (
                                <mesh position={[0, -LOWER_ARM_LEN/2, 0]}><boxGeometry args={[LIMB_THICKNESS * 0.9, LOWER_ARM_LEN, LIMB_THICKNESS * 0.9]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                            )}
                        </InteractivePart>
                        <group ref={leftHandRef} position={[0, -LOWER_ARM_LEN, 0]}>
                            <InteractivePart partId="hand_left" {...commonProps}>
                                {config.handStyle && getCustomModel(config.handStyle) ? (
                                    <CustomModelRenderer model={getCustomModel(config.handStyle)!} />
                                ) : (
                                    <mesh><boxGeometry args={[HAND_SIZE, HAND_SIZE, HAND_SIZE]} /><meshStandardMaterial color={config.skinColor} /></mesh>
                                )}
                            </InteractivePart>
                            {/* Shield Logic */}
                            {!shouldHide('shield') && config.gear.shield && config.gear.shield !== 'none' && (
                                <InteractivePart partId={config.gear.shield} {...commonProps}>
                                     {getCustomModel(config.gear.shield) && <CustomModelRenderer model={getCustomModel(config.gear.shield)!} />}
                                     {/* VFX Injection */}
                                     {renderVfxForModel(config.gear.shield, 'equip')}
                                </InteractivePart>
                            )}
                            {/* Dual Wield Logic (Daggers/Twin Blades) */}
                            {!shouldHide('weapon') && config.gear.weapon && (config.gear.weapon.includes('daggers') || config.gear.weapon === 'daggers_basic') && (
                                 <InteractivePart partId={config.gear.weapon + "_left"} {...commonProps}>
                                     <group scale={[-1, 1, 1]}>
                                         {getCustomModel(config.gear.weapon) && <CustomModelRenderer model={getCustomModel(config.gear.weapon)!} />}
                                         {/* VFX Injection */}
                                         {renderVfxForModel(config.gear.weapon, 'equip')}
                                     </group>
                                </InteractivePart>
                            )}
                        </group>
                    </group>
                 </group>

                 {/* RIGHT ARM */}
                 <group ref={rightShoulderRef} position={[-SHOULDER_OFFSET_X, CHEST_HEIGHT/2 - 0.1, 0]}>
                    <InteractivePart partId="arm_right" {...commonProps}>
                        {config.upperArmStyle && getCustomModel(config.upperArmStyle) ? (
                             <group scale={[-1, 1, 1]}>
                                 <CustomModelRenderer model={getCustomModel(config.upperArmStyle)!} />
                             </group>
                        ) : (
                            <mesh position={[0, -UPPER_ARM_LEN/2, 0]}><boxGeometry args={[LIMB_THICKNESS, UPPER_ARM_LEN, LIMB_THICKNESS]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                        )}
                    </InteractivePart>
                    <group ref={rightElbowRef} position={[0, -UPPER_ARM_LEN, 0]}>
                        <InteractivePart partId="forearm_right" {...commonProps}>
                            {config.forearmStyle && getCustomModel(config.forearmStyle) ? (
                                <group scale={[-1, 1, 1]}>
                                    <CustomModelRenderer model={getCustomModel(config.forearmStyle)!} />
                                </group>
                            ) : (
                                <mesh position={[0, -LOWER_ARM_LEN/2, 0]}><boxGeometry args={[LIMB_THICKNESS * 0.9, LOWER_ARM_LEN, LIMB_THICKNESS * 0.9]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                            )}
                        </InteractivePart>
                        <group ref={rightHandRef} position={[0, -LOWER_ARM_LEN, 0]}>
                            <InteractivePart partId="hand_right" {...commonProps}>
                                {config.handStyle && getCustomModel(config.handStyle) ? (
                                    <group scale={[-1, 1, 1]}>
                                        <CustomModelRenderer model={getCustomModel(config.handStyle)!} />
                                    </group>
                                ) : (
                                    <mesh><boxGeometry args={[HAND_SIZE, HAND_SIZE, HAND_SIZE]} /><meshStandardMaterial color={config.skinColor} /></mesh>
                                )}
                            </InteractivePart>
                            {/* Weapon Logic */}
                            {!shouldHide('weapon') && config.gear.weapon && config.gear.weapon !== 'none' && !isFloatingWeapon && (
                                <InteractivePart partId={config.gear.weapon} {...commonProps}>
                                     {getCustomModel(config.gear.weapon) && <CustomModelRenderer model={getCustomModel(config.gear.weapon)!} />}
                                     {/* VFX Injection */}
                                     {renderVfxForModel(config.gear.weapon, 'equip')}
                                </InteractivePart>
                            )}
                        </group>
                    </group>
                 </group>
              </group>

              {/* LEGS */}
              <group ref={leftThighRef} position={[HIP_JOINT_OFFSET_X, -HIPS_HEIGHT/2, 0]}>
                 <InteractivePart partId="thigh_left" {...commonProps}>
                     {config.thighStyle && getCustomModel(config.thighStyle) ? (
                        <CustomModelRenderer model={getCustomModel(config.thighStyle)!} />
                     ) : (
                        <mesh position={[0, -THIGH_LEN/2, 0]}><boxGeometry args={[LEG_THICKNESS, THIGH_LEN, LEG_THICKNESS]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                     )}
                 </InteractivePart>
                 <group ref={leftKneeRef} position={[0, -THIGH_LEN, 0]}>
                     <InteractivePart partId="calf_left" {...commonProps}>
                         {config.calfStyle && getCustomModel(config.calfStyle) ? (
                            <CustomModelRenderer model={getCustomModel(config.calfStyle)!} />
                         ) : (
                            <mesh position={[0, -CALF_LEN/2, 0]}><boxGeometry args={[LEG_THICKNESS * 0.9, CALF_LEN, LEG_THICKNESS * 0.9]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                         )}
                     </InteractivePart>
                     <group ref={leftFootRef} position={[0, -CALF_LEN, 0]}>
                         <InteractivePart partId="foot_left" {...commonProps}>
                             {config.footStyle && getCustomModel(config.footStyle) ? (
                                <CustomModelRenderer model={getCustomModel(config.footStyle)!} />
                             ) : (
                                <mesh position={[0, -0.1, 0.05]}><boxGeometry args={[LEG_THICKNESS * 1.1, 0.15, FOOT_LEN]} /><meshStandardMaterial color="#1f2937" /></mesh>
                             )}
                         </InteractivePart>
                     </group>
                 </group>
              </group>

              <group ref={rightThighRef} position={[-HIP_JOINT_OFFSET_X, -HIPS_HEIGHT/2, 0]}>
                 <InteractivePart partId="thigh_right" {...commonProps}>
                     {config.thighStyle && getCustomModel(config.thighStyle) ? (
                         <group scale={[-1, 1, 1]}>
                            <CustomModelRenderer model={getCustomModel(config.thighStyle)!} />
                         </group>
                     ) : (
                        <mesh position={[0, -THIGH_LEN/2, 0]}><boxGeometry args={[LEG_THICKNESS, THIGH_LEN, LEG_THICKNESS]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                     )}
                 </InteractivePart>
                 <group ref={rightKneeRef} position={[0, -THIGH_LEN, 0]}>
                     <InteractivePart partId="calf_right" {...commonProps}>
                         {config.calfStyle && getCustomModel(config.calfStyle) ? (
                            <group scale={[-1, 1, 1]}>
                                <CustomModelRenderer model={getCustomModel(config.calfStyle)!} />
                            </group>
                         ) : (
                            <mesh position={[0, -CALF_LEN/2, 0]}><boxGeometry args={[LEG_THICKNESS * 0.9, CALF_LEN, LEG_THICKNESS * 0.9]} /><meshStandardMaterial color={config.limbColor} /></mesh>
                         )}
                     </InteractivePart>
                     <group ref={rightFootRef} position={[0, -CALF_LEN, 0]}>
                         <InteractivePart partId="foot_right" {...commonProps}>
                            {config.footStyle && getCustomModel(config.footStyle) ? (
                                <group scale={[-1, 1, 1]}>
                                    <CustomModelRenderer model={getCustomModel(config.footStyle)!} />
                                </group>
                            ) : (
                                <mesh position={[0, -0.1, 0.05]}><boxGeometry args={[LEG_THICKNESS * 1.1, 0.15, FOOT_LEN]} /><meshStandardMaterial color="#1f2937" /></mesh>
                             )}
                         </InteractivePart>
                     </group>
                 </group>
              </group>
          </group>
      </group>
    </group>
  );
};
