/**
 * PolyForge v1.3.0 - EngineBridge
 * Phase 12: ECS 到 R3F 的桥接层
 * 
 * 功能：
 * - 监听 EntityManager 状态变化
 * - 将 ECS 实体层级 1:1 映射到 R3F 场景
 * - 性能优化：React.memo + 按需更新
 * - 支持 VisualComponent 渲染
 * - 支持 HDR 环境贴图
 * - 支持 WorldStateManager 光影联动
 */

import React, { useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { EntityManager } from '../../core/EntityManager';
import { Entity } from '../../core/Entity';
import { TransformComponent } from '../../core/components/TransformComponent';
import { VisualComponent } from '../../core/components/VisualComponent';
import { TerrainComponent } from '../../core/components/TerrainComponent';
import { VegetationComponent } from '../../core/components/VegetationComponent';
import { WorldStateManager } from '../../core/WorldStateManager';
import { getAssetRegistry } from '../../core/assets/AssetRegistry';
import { AssetType } from '../../core/assets/types';
import { PostProcessing } from './PostProcessing';
import { TerrainVisual } from './TerrainVisual';
import { VegetationVisual } from './VegetationVisual';
import { eventBus } from '../../core/EventBus';

/**
 * EngineBridge Props
 */
interface EngineBridgeProps {
  entityManager: EntityManager;
  worldStateManager?: WorldStateManager;
  terrainSystem?: any; // TerrainSystem 实例（用于鼠标交互）
  vegetationSystem?: any; // VegetationSystem 实例
  archValidationManager?: any; // ArchitectureValidationManager 实例（用于输入系统）
  postProcessingEnabled?: boolean;
  bloomEnabled?: boolean;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  smaaEnabled?: boolean;
}

/**
 * EntityRenderer - 渲染单个实体
 * 使用 React.memo 优化性能
 */
const EntityRenderer = React.memo<{
  entity: Entity;
  worldState?: any;
  terrainSystem?: any;
  vegetationSystem?: any;
  getCameraMode?: () => string; // 🔥 Added prop definition
}>(({ entity, worldState, terrainSystem, vegetationSystem, getCameraMode }) => { // 🔥 Destructure getCameraMode
  const groupRef = useRef<THREE.Group>(null);
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [modelLoaded, setModelLoaded] = useState(false);

  // 获取组件
  const transform = entity.getComponent<TransformComponent>('Transform');
  const visual = entity.getComponent<VisualComponent>('Visual');
  const terrain = entity.getComponent<TerrainComponent>('Terrain');
  const vegetation = entity.getComponent<VegetationComponent>('Vegetation');

  // 加载模型资产
  useEffect(() => {
    if (terrain || vegetation) return; // 🔥 如果是特殊实体，跳过模型加载
    if (!visual || !visual.geometry.assetId) return;

    const assetRegistry = getAssetRegistry();

    // 获取资产数据
    const loadModel = async () => {
      // ✅ 健壮性检查：确保 AssetRegistry 已初始化
      if (!assetRegistry['initialized']) {
        console.log('[EntityRenderer] Initializing AssetRegistry...');
        await assetRegistry.initialize();
      }

      const blob = await assetRegistry.getAsset(visual.geometry.assetId!);

      if (!blob) {
        // console.warn(`Model asset not found: ${visual.geometry.assetId}`);
        return;
      }

      // 加载 GLTF 模型
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');

      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      const url = URL.createObjectURL(blob);

      gltfLoader.load(url, (gltf) => {
        const loadedMeshes: THREE.Mesh[] = [];

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            loadedMeshes.push(child);
          }
        });

        setMeshes(loadedMeshes);
        setModelLoaded(true);
        URL.revokeObjectURL(url);

        console.log(`[EntityRenderer] Model loaded: ${visual.geometry.assetId}`);
      });
    };

    loadModel().catch((error) => {
      console.error(`Failed to load model asset: ${visual.geometry.assetId}`, error);
    });
  }, [visual?.geometry.assetId, terrain, vegetation]);

  // 🔥 核心修复：使用 useFrame 实时同步变换 (解决 React 不重绘物理结果的问题)
  // 通过 useFrame 直接推送到 Three.js 对象，避开 React 脏检查和重渲染
  useFrame(() => {
    if (terrain || vegetation) return; // 🔥 如果是特殊实体，跳过常规同步
    if (!groupRef.current || !transform) return;

    const group = groupRef.current;

    // 1. 位置同步
    group.position.set(
      transform.position[0],
      transform.position[1],
      transform.position[2]
    );

    // 2. 旋转同步
    if (transform.quaternion) {
      // 🚀 优先：物理精准四元数同步
      group.quaternion.set(
        transform.quaternion[0],
        transform.quaternion[1],
        transform.quaternion[2],
        transform.quaternion[3]
      );
    } else {
      // 兼容：度数转弧度同步
      group.rotation.set(
        THREE.MathUtils.degToRad(transform.rotation[0]),
        THREE.MathUtils.degToRad(transform.rotation[1]),
        THREE.MathUtils.degToRad(transform.rotation[2])
      );
    }

    // 3. 缩放同步
    group.scale.set(
      transform.scale[0],
      transform.scale[1],
      transform.scale[2]
    );

    // 4. 🔥 后处理标志同步 (Outline/Hover)
    // 深度隔离 (2026-01-02): 体验模式强制屏蔽一切编辑器辅助视觉
    if (visual) {
      const isExperience = worldState?.context === 'EXPERIENCE';
      group.userData.outline = isExperience ? false : !!visual.postProcessing.outline;
      group.userData.hover = isExperience ? false : !!visual.postProcessing.hover;
      group.userData.entityId = entity.id;
    }
  });

  // 更新材质(响应 WorldState 变化)
  useEffect(() => {
    if (terrain || vegetation) return; // 🔥 如果是特殊实体,跳过材质更新
    if (!visual || meshes.length === 0) return;

    meshes.forEach((mesh) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        // 更新基础材质属性
        mesh.material.color.set(visual.material.color);
        mesh.material.metalness = visual.material.metalness ?? 0.5;
        mesh.material.roughness = visual.material.roughness ?? 0.5;
        mesh.material.opacity = visual.material.opacity ?? 1.0;
        mesh.material.transparent = visual.material.transparent ?? false;

        // 🔥 [Visual Polish] 材质染色悬停反馈 (全方位识别 - 晶莹白方案)
        if (visual.postProcessing.hover) {
          // 如果悬停，叠加一层纯白荧光 (对比度最高)
          mesh.material.emissive.set('#ffffff');
          mesh.material.emissiveIntensity = 1.2;
        } else if (visual.hasEmissive()) {
          // 正常的逻辑自发光
          mesh.material.emissive.set(visual.emissive.color);
          mesh.material.emissiveIntensity = visual.emissive.intensity;
        } else {
          mesh.material.emissive.set('#000000');
          mesh.material.emissiveIntensity = 0;
        }

        // 响应环境光照变化
        if (worldState) {
          const lightIntensity = worldState.lightIntensity || 1.0;
          mesh.material.envMapIntensity = lightIntensity;
        }

        mesh.material.needsUpdate = true;
      }
    });
  }, [visual, meshes, worldState, terrain, vegetation]);

  // 渲染逻辑分发
  // 如果是地形实体,使用 TerrainVisual 渲染
  if (terrain) {
    return <TerrainVisual entity={entity} terrainSystem={terrainSystem} getCameraMode={getCameraMode} />;
  }

  // 如果是植被实体,使用 VegetationVisual 渲染
  if (vegetation) {
    return <VegetationVisual
      entity={entity}
      vegetationSystem={vegetationSystem}
      lightIntensity={worldState?.lightIntensity ?? 1.0}
    />;
  }



  if (!visual || !visual.visible) return null;

  return (
    <group ref={groupRef} name={entity.name}>
      {/* 🚀 Visual Sub-Group: Handles local offsets (like character footprint alignment) */}
      <group position={visual.offset || [0, 0, 0]}>
        {/* 渲染加载的模型 */}
        {modelLoaded && meshes.map((mesh, index) => (
          <primitive key={index} object={mesh.clone()} />
        ))}

        {/* 渲染基础几何体（如果没有模型资产） */}
        {!visual.geometry.assetId && (
          <mesh
            castShadow={visual.castShadow}
            receiveShadow={visual.receiveShadow}
          >
            {/* 几何体 */}
            {visual.geometry.type === 'box' && (
              <boxGeometry args={[
                visual.geometry.parameters?.width || 1,
                visual.geometry.parameters?.height || 1,
                visual.geometry.parameters?.depth || 1,
              ]} />
            )}
            {visual.geometry.type === 'sphere' && (
              <sphereGeometry args={[
                visual.geometry.parameters?.radius || 0.5,
                visual.geometry.parameters?.segments || 32,
                visual.geometry.parameters?.segments || 32,
              ]} />
            )}
            {visual.geometry.type === 'cylinder' && (
              <cylinderGeometry args={[
                visual.geometry.parameters?.radius || 0.5,
                visual.geometry.parameters?.radius || 0.5,
                visual.geometry.parameters?.height || 1,
                visual.geometry.parameters?.segments || 32,
              ]} />
            )}
            {visual.geometry.type === 'cone' && (
              <coneGeometry args={[
                visual.geometry.parameters?.radius || 0.5,
                visual.geometry.parameters?.height || 1,
                visual.geometry.parameters?.segments || 32,
              ]} />
            )}
            {visual.geometry.type === 'plane' && (
              <planeGeometry args={[
                visual.geometry.parameters?.width || 1,
                visual.geometry.parameters?.height || 1,
              ]} />
            )}

            {/* 材质 */}
            <meshStandardMaterial
              color={visual.material.color}
              metalness={visual.material.metalness ?? 0.5}
              roughness={visual.material.roughness ?? 0.5}
              opacity={visual.material.opacity ?? 1.0}
              transparent={visual.material.transparent ?? false}
              emissive={visual.emissive.color}
              emissiveIntensity={visual.emissive.intensity}
              envMapIntensity={worldState?.lightIntensity || 1.0}
            />
          </mesh>
        )}
      </group>

      {/* 递归渲染子实体 */}
      {entity.children.map((child) => (
        <EntityRenderer key={child.id} entity={child} worldState={worldState} terrainSystem={terrainSystem} vegetationSystem={vegetationSystem} getCameraMode={getCameraMode} />
      ))}
    </group>
  );
});

/**
 * 物理调试渲染器
 */
const PhysicsDebugRenderer = ({ manager, enabled }: { manager: any, enabled: boolean }) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useFrame(() => {
    if (!enabled || !manager || !geometryRef.current) return;

    const buffers = manager.getPhysicsDebugBuffers();
    if (!buffers) {
      geometryRef.current.setDrawRange(0, 0);
      return;
    }

    const { vertices, colors } = buffers;

    // update geometry
    geometryRef.current.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometryRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 4));

    // Force update
    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.attributes.color.needsUpdate = true;

    // Draw all lines
    geometryRef.current.setDrawRange(0, vertices.length / 3);
  });

  if (!enabled) return null;

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors toneMapped={false} linewidth={1} />
    </lineSegments>
  );
};

/**
 * 音频调试渲染器 (Wireframe Spheres)
 */
const AudioDebugRenderer = ({ manager, enabled }: { manager: any, enabled: boolean }) => {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(() => {
    if (!enabled || !manager) {
      meshRefs.current.forEach(mesh => { if (mesh) mesh.visible = false; });
      return;
    }

    const infos = manager.getAudioDebugInfo();
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;

      const info = infos[index];
      if (info) {
        mesh.visible = true;
        mesh.position.set(info.position[0], info.position[1], info.position[2]);
        const scale = info.maxDistance > 0 ? info.maxDistance : 1.0;
        mesh.scale.set(scale, scale, scale);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(info.isPlaying ? 0x00ff00 : 0xffff00);
      } else {
        mesh.visible = false;
      }
    });
  });

  if (!enabled) return null;

  return (
    <group>
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} visible={false}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial wireframe color={0xffff00} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

EntityRenderer.displayName = 'EntityRenderer';

/**
 * EngineBridge - ECS 到 R3F 的桥接组件
 */
export const EngineBridge: React.FC<EngineBridgeProps> = ({
  entityManager,
  worldStateManager,
  terrainSystem,
  vegetationSystem,
  archValidationManager,
  postProcessingEnabled = true,
  bloomEnabled = true,
  bloomStrength = 1.5,
  bloomRadius = 0.4,
  bloomThreshold = 0.85,
  smaaEnabled = true,
}) => {
  const [rootEntities, setRootEntities] = useState<Entity[]>([]);
  const [worldState, setWorldState] = useState<any>(null);
  const [hdrEnvMap, setHdrEnvMap] = useState<THREE.Texture | null>(null);
  const [sunPosition, setSunPosition] = useState<[number, number, number]>([20, 20, 10]); // 🔥 修复:使用 state 管理太阳位置

  const { scene, gl, camera } = useThree();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shadowCameraRef = useRef<THREE.PerspectiveCamera | null>(null); // 🔥 影子引擎专属相机引用

  // Helper to get current camera mode safely
  const getCameraMode = () => {
    return archValidationManager?.cameraSystem?.mode || 'orbit';
  };

  // Inject getCameraMode into terrainSystem for passing down (hacky but effective)
  if (terrainSystem) {
    terrainSystem.getCameraMode = getCameraMode;
  }

  // 🎮 设置输入系统的 DOM 元素（用于相机控制）
  useEffect(() => {
    if (archValidationManager && gl?.domElement) {
      archValidationManager.setInputElement(gl.domElement);
      canvasRef.current = gl.domElement as HTMLCanvasElement;
      console.log('🎮 Input element wired to ArchitectureValidationManager');
    }
  }, [archValidationManager, gl]);

  // 🎥 设置 R3F 相机引用（让 CameraSystem 直接控制）
  useEffect(() => {
    // 🔥 使用影子引擎专属相机，而不是 useThree() 的默认相机
    if (archValidationManager && shadowCameraRef.current) {
      archValidationManager.setR3FCamera(shadowCameraRef.current);
      console.log('🎥 R3F shadow camera wired to CameraSystem');
    }
  }, [archValidationManager, shadowCameraRef.current]);

  // 🎮 物理层相机控制：直接在 Canvas 上拦截鼠标和滚轮
  useEffect(() => {
    if (!gl?.domElement || !archValidationManager) return;

    const canvas = gl.domElement as HTMLCanvasElement;
    const inputSystem = archValidationManager.getInputSystem();

    if (!inputSystem) {
      console.error('❌ InputSystem not found');
      return;
    }

    // 🎯 滚轮缩放（物理拦截）
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 直接设置 wheelDelta（InputSystem 会在 update 中读取）
      inputSystem.wheelDelta += e.deltaY;

      // console.log('🎮 Canvas wheel:', e.deltaY, 'wheelDelta set to:', inputSystem.wheelDelta);
    };

    // 🎯 鼠标按下（追踪拖拽状态）
    const handlePointerDown = (e: PointerEvent) => {
      // 0: Left, 1: Middle, 2: Right
      // 🔥 关键：同步更新 InputSystem 的 pressedButtons
      inputSystem.pressedButtons.add(e.button);

      // 任何键按下都捕获指针，防止移出 Canvas 后丢失 Up 事件
      // 🔥 Fix: Don't capture if already locked (PointerLock API conflicts with setPointerCapture)
      if (document.pointerLockElement !== canvas) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore InvalidStateError (happens if pointer is invalid or race condition)
        }
      }

      // 只有中键(1)或右键(2)需要阻止默认行为（防止弹出菜单）
      // 左键(0)需要允许点击 UI（虽然这里是在 Canvas 上，但以防万一）
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
      }

      // console.log('🎮 Pointer DOWN:', e.button, 'Buttons:', e.buttons);
    };

    // 🎯 鼠标移动（物理拦截）
    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();

      // 直接设置 mouseDelta
      inputSystem.mouseDelta = {
        x: e.movementX,
        y: e.movementY,
      };

      // 追踪当前真实位置
      inputSystem.mousePosition = {
        x: e.clientX,
        y: e.clientY
      };

      // Debug: Log only if moving significantly
      if (Math.abs(e.movementX) > 0 || Math.abs(e.movementY) > 0) {
        // console.log('🎮 Pointer MOVE:', e.movementX, e.movementY);
      }
    };

    // 🎯 鼠标释放
    const handlePointerUp = (e: PointerEvent) => {
      // 🔥 关键：同步更新 InputSystem 的 pressedButtons
      inputSystem.pressedButtons.delete(e.button);

      canvas.releasePointerCapture(e.pointerId);
      // console.log('🎮 Pointer UP:', e.button, 'Remaining:', Array.from(inputSystem.pressedButtons));
    };

    // 🎯 额外保险：指针取消/丢失捕获
    const handlePointerCancel = (e: PointerEvent) => {
      inputSystem.pressedButtons.delete(e.button);
      canvas.releasePointerCapture(e.pointerId);
      // console.log('🎮 Pointer CANCEL/LOST:', e.button);
    };

    // 🎯 右键菜单拦截（只在 Canvas 上）
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      // console.log('🎮 Context menu blocked');
    };

    // 🎯 键盘焦点修复：Canvas 被点击时获取焦点，以便接收 KeyDown
    // 之前的问题：初始化时 Canvas 没焦点，按空格没反应，直到右键点击（触发 focus？）
    // 强行把这个逻辑加到 PointerDown

    // Bind events
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
    canvas.addEventListener('lostpointercapture', handlePointerCancel);
    canvas.addEventListener('contextmenu', handleContextMenu);

    console.log('✅ Canvas event listeners attached (Enhanced)');

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerCancel);
      canvas.removeEventListener('lostpointercapture', handlePointerCancel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      console.log('🧹 Canvas event listeners removed');
    };
  }, [gl, archValidationManager]);

  // 🔥 性能修复 (2026-01-01): 事件驱动的 Outline 收集
  // 订阅 SELECTION_CHANGED 事件，仅在选中实体变化时执行一次场景遍历
  useEffect(() => {
    const handleSelectionChanged = () => {
      // 在下一帧延迟执行，确保 EntityRenderer 已同步 userData.outline/hover
      requestAnimationFrame(() => {
        const outlineObjects: THREE.Object3D[] = [];
        scene.traverse((obj) => {
          if (obj.userData?.outline === true || obj.userData?.hover === true) {
            outlineObjects.push(obj);
          }
        });
        eventBus.emit('OUTLINE_UPDATE', outlineObjects);
      });
    };

    eventBus.on('SELECTION_CHANGED', handleSelectionChanged);
    console.log('[EngineBridge] Subscribed to SELECTION_CHANGED (Event-Driven Outline Collection)');

    return () => {
      eventBus.off('SELECTION_CHANGED', handleSelectionChanged);
    };
  }, [scene]);

  // 监听 EntityManager 变化
  useEffect(() => {
    const updateEntities = () => {
      setRootEntities([...entityManager.getRootEntities()]);
    };

    // 初始加载
    updateEntities();

    // 监听实体变化（简化版，实际应该监听 EntityManager 事件）
    const interval = setInterval(updateEntities, 100);

    return () => clearInterval(interval);
  }, [entityManager]);

  // 监听 WorldStateManager 变化
  useEffect(() => {
    if (!worldStateManager) return;

    const handleStateChange = (state: any) => {
      setWorldState(state);
    };

    worldStateManager.onStateChanged(handleStateChange);

    // 初始状态
    setWorldState(worldStateManager.getState());

    return () => {
      worldStateManager.offStateChanged(handleStateChange);
    };
  }, [worldStateManager]);

  // 加载 HDR 环境贴图（或使用程序化天空）
  useEffect(() => {
    const loadHDR = async () => {
      const assetRegistry = getAssetRegistry();

      // ✅ 健壮性检查：确保 WorldState 与 AssetRegistry 已就绪
      if (!worldState) {
        console.log('[EngineBridge] Skipping loadHDR: worldState not ready');
        return;
      }

      if (!assetRegistry['initialized']) {
        console.log('[EngineBridge] Initializing AssetRegistry before loadHDR...');
        await assetRegistry.initialize();
      }

      let hdrAsset = null;
      const targetId = worldState?.hdrAssetId;
      console.log(`[EngineBridge] loadHDR check: targetId=${targetId || 'undefined'}, worldStateReady=${!!worldState}`);

      if (targetId) {
        // 1. 尝试加载指定的 HDR
        hdrAsset = await assetRegistry.getMetadata(targetId);
      }

      if (!hdrAsset) {
        // 2. 自动匹配逻辑：查询所有 HDR
        const hdrAssets = await assetRegistry.queryAssets({ type: AssetType.HDR });

        if (hdrAssets.length === 0) {
          console.log('[EngineBridge] No HDR assets in registry - attempting local fallback...');

          // 🔥 Local First: 强制尝试加载本地资源 (Kloofendal)
          try {
            const { HDRLoader } = await import('three/addons/loaders/HDRLoader.js');
            const hdrLoader = new HDRLoader();
            const localHdrPath = '/assets/env/kloofendal_48d_partly_cloudy_puresky_1k.hdr';

            hdrLoader.load(localHdrPath, (texture) => {
              const pmremGenerator = new THREE.PMREMGenerator(gl);
              pmremGenerator.compileEquirectangularShader();
              const envMap = pmremGenerator.fromEquirectangular(texture).texture;

              scene.environment = envMap;
              scene.background = envMap;
              setHdrEnvMap(envMap);
              console.log('✓ [LocalFirst] Fallback HDR loaded successfully');

              texture.dispose();
              pmremGenerator.dispose();
            }, undefined, (err) => {
              console.warn('❌ [LocalFirst] Failed to load local HDR fallback:', err);
              setHdrEnvMap(null);
            });
            return;
          } catch (e) {
            console.error('❌ [LocalFirst] Critical failure in HDR fallback logic:', e);
            setHdrEnvMap(null);
            return;
          }
        }

        // 3. 智能回退：优先寻找 kloofendal，否则取第一个
        hdrAsset = hdrAssets.find(a => a.name.toLowerCase().includes('kloofendal')) || hdrAssets[0];
      }

      console.log(`[EngineBridge] Loading HDR: ${hdrAsset.name} (ID: ${hdrAsset.id})`);

      // 获取 HDR 资产的 Blob 数据
      const blob = await assetRegistry.getAsset(hdrAsset.id);

      if (!blob) {
        console.warn('[EngineBridge] HDR asset data not found - using procedural sky');
        setHdrEnvMap(null);
        return;
      }

      // 使用 HDRLoader 加载 HDR
      const { HDRLoader } = await import('three/addons/loaders/HDRLoader.js');
      const hdrLoader = new HDRLoader();
      const url = URL.createObjectURL(blob);

      hdrLoader.load(url, (texture) => {
        const pmremGenerator = new THREE.PMREMGenerator(gl);
        pmremGenerator.compileEquirectangularShader();
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;

        setHdrEnvMap(envMap);
        scene.environment = envMap;
        scene.background = envMap;

        console.log(`[EngineBridge] HDR environment applied: ${hdrAsset!.name}`);

        texture.dispose();
        pmremGenerator.dispose();
        URL.revokeObjectURL(url);
      });
    };

    loadHDR();
  }, [scene, gl, worldState?.hdrAssetId]);

  // 🔥 FPS Mode: Pointer Lock Integration
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const handleClick = () => {
      if (!archValidationManager) return;
      const camSys = archValidationManager.getCameraSystem();
      // 🔥 修复：同时支持 FPS 和 TPS 模式的 Pointer Lock
      const mode = camSys?.getMode();
      if (mode === 'firstPerson' || mode === 'thirdPerson') {
        canvas.requestPointerLock();
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [gl, archValidationManager]);

  // 🔥 主渲染循环:神经合龙(ECS → R3F 相机强制同步)
  useFrame((state, delta) => {
    // 🎮 调用 ECS 更新循环（关键！）
    if (archValidationManager) {
      archValidationManager.update();

      // 🔥 神经合龙：强制同步 ECS 相机到 R3F 相机
      const cameraSystem = archValidationManager.getCameraSystem();
      if (cameraSystem) {
        // CameraSystem 已经在 update() 中计算了新的相机位置
        // 但我们需要确保 R3F 的 state.camera 也被更新
        // 注意：CameraSystem.smoothUpdate() 已经调用了 this.r3fCamera.position.set()
        // 所以这里不需要额外操作，只需要确保 update() 被调用即可
      }
    }

    // 更新太阳光照(塞尔达式光影联动)
    if (!worldState || !sunLightRef.current) return;

    // 🔥 修复:每帧根据最新时间计算太阳位置,防止阴影分界线
    const time = worldState.timeOfDay || 12;
    const sunAngle = ((time - 6) / 12) * Math.PI;
    const sunOffsetRadius = 300; // 🔥 太阳距离焦点的距离 (从 50 提升至 300，确保大场景下光线更接近平行光)
    const sunX = Math.cos(sunAngle) * sunOffsetRadius;
    const sunY = Math.sin(sunAngle) * sunOffsetRadius;
    const sunZ = 50; // 稍微偏移 Z 轴

    // 🎥 获取相机当前焦点 (Pivot) - 实现“影随人动” (Shadow Follows Camera)
    let pivot: [number, number, number] = [0, 0, 0];
    if (archValidationManager) {
      const camSys = archValidationManager.getCameraSystem();
      if (camSys) {
        pivot = camSys.getCurrentPivot();
      }
    }

    // 1. 太阳位置 = 相对偏移 + 焦点位置
    sunLightRef.current.position.set(
      sunX + pivot[0],
      Math.max(sunY, 1) + pivot[1],
      sunZ + pivot[2]
    );

    // 2. 太阳目标 = 焦点位置 (确保光线始终指向玩家视野中心)
    sunLightRef.current.target.position.set(pivot[0], pivot[1], pivot[2]);
    sunLightRef.current.target.updateMatrixWorld();

    setSunPosition([sunX, sunY, sunZ]);

    // 🔥 环境自适应联动
    const normalizedHeight = Math.max(0, sunY / sunOffsetRadius);
    const nightFactor = Math.pow(normalizedHeight, 1.5); // 稍微调平过渡

    // 🔥 Shadow Opacity Logic: 
    // Opacity controls how much Ambient/Env light fills the shadows.
    // Opacity 1.0 (Max) -> EnvIntensity 0.0 (Pitch Black Shadows)
    // Opacity 0.0 (Min) -> EnvIntensity 1.0 (Full Ambient)
    const opacityInv = 1.0 - (worldState.shadowOpacity ?? 0.8);

    // IBL 与背景同步 (恢复为纯粹的时间/高度联动，不与 ShadowOpacity 耦合)
    scene.environmentIntensity = 0.05 + nightFactor * 0.95;
    scene.backgroundIntensity = 0.05 + nightFactor * 0.95;

    // 🌅 更新太阳光强度
    const baseIntensity = worldState.lightIntensity || 1.0;
    sunLightRef.current.intensity = baseIntensity * 8.0 * nightFactor;

    // 🔥 Native Shadow Blur:
    // Reverted boost as per user request (feature ineffective on native PCF).
    if (worldState.shadowRadius !== undefined) {
      sunLightRef.current.shadow.radius = worldState.shadowRadius;
    }

    // 🔥 ASA (Adaptive Shadow Adapter) 核心逻辑：影随距变
    if (sunLightRef.current && state.camera) {
      const shadowCam = sunLightRef.current.shadow.camera as THREE.OrthographicCamera;

      const camPos = state.camera.position;
      const pivotV3 = new THREE.Vector3(...pivot);
      const dist = camPos.distanceTo(pivotV3);

      // 🎥 动态范围计算 (ASA + Manual Override)：
      // 如果用户设置了 shadowDistance > 0，则强制使用该值；否则走 ASA 自动逻辑
      let adaptiveSize = 0;
      if (worldState.shadowDistance && worldState.shadowDistance > 0) {
        adaptiveSize = worldState.shadowDistance;
      } else {
        adaptiveSize = Math.max(150, Math.min(600, dist * 1.5));
      }
      const halfSize = adaptiveSize / 2;

      // 2. 应用参数
      if (Math.abs(shadowCam.left - (-halfSize)) > 2.0) {
        shadowCam.left = -halfSize;
        shadowCam.right = halfSize;
        shadowCam.top = halfSize;
        shadowCam.bottom = -halfSize;

        // 🔥 极大提升精度：缩减 Far 面，从 3000 降回 1000
        // 这将提高深度贴图在 1 像素内能表达的单位长度精度
        shadowCam.near = 1;
        shadowCam.far = 1000;
        shadowCam.updateProjectionMatrix();

        // 🔥 修复“消失”与“重心脱离”：
        // 1. 设置极小的 Bias。针对 1000m range，0.1m 对应的深度值约为 0.0001
        // 所以 Bias 必须显著小于 0.0001 才能保证小草影子的存在
        // 🔥 Now controlled by UI
        sunLightRef.current.shadow.bias = worldState.shadowBias ?? -0.00002;

        // 2. 彻底移除 normalBias (设为 0)
        // normalBias 会沿法线平移，这对超薄的单面草丛会造成惨不忍睹的影子位移
        // 🔥 Now controlled by UI
        sunLightRef.current.shadow.normalBias = worldState.shadowNormalBias ?? 0;
      } else {
        // 🔥 实时响应 UI 调整 (即便投影矩阵不需要更新，Bias 也需要更新)
        // 这是一个优化路径，确保滑块拖动时阴影实时变化，不需要等待相机移动
        if (worldState.shadowBias !== undefined) {
          sunLightRef.current.shadow.bias = worldState.shadowBias;
        }
        if (worldState.shadowNormalBias !== undefined) {
          sunLightRef.current.shadow.normalBias = worldState.shadowNormalBias;
        }
      }
    }

    // 更新光照颜色与软阴影半径
    if (worldState.directionalColor) {
      sunLightRef.current.color.set(worldState.directionalColor);
    }
    // 🔥 PCSS 半径控制
    if (worldState.shadowRadius !== undefined) {
      sunLightRef.current.shadow.radius = worldState.shadowRadius;
    }

    // Environment sync complete
  });

  // 更新场景背景颜色
  useEffect(() => {
    if (!worldState) return;

    // 如果没有 HDR，使用纯色背景
    if (!hdrEnvMap && worldState.ambientColor) {
      scene.background = new THREE.Color(worldState.ambientColor);
    }
  }, [worldState, hdrEnvMap, scene]);

  return (
    <>
      {/* 🔥 Reverting to Native Shadows for clean, noise-free rendering */}
      {/* <SoftShadows /> removed to eliminate "black dots" artifacts */}

      {/* 🔥 核物理隔离：独立相机（强制接管 R3F 上下文） */}
      <PerspectiveCamera
        ref={shadowCameraRef} // 🔥 绑定 ref，让 CameraSystem 能直接操控
        makeDefault
        position={[0, 100, 100]}
        fov={60}
        near={0.1}
        far={1000}
      />

      {/* 后处理管线 */}
      {postProcessingEnabled && (
        <PostProcessing
          enabled={postProcessingEnabled}
          bloomEnabled={bloomEnabled}
          // 🔥 优先使用 WorldState (影子引擎状态)，其次尝试从管理器直接拉取，最后使用默认值
          // 彻底切断对 App.tsx props 的依赖
          bloomStrength={worldState?.bloomStrength ?? worldStateManager?.getState().bloomStrength ?? 0.5}
          bloomRadius={bloomRadius}
          bloomThreshold={worldState?.bloomThreshold ?? worldStateManager?.getState().bloomThreshold ?? 0.85}
          smaaEnabled={worldState?.smaaEnabled ?? worldStateManager?.getState().smaaEnabled ?? true}
          toneMappingExposure={worldState?.toneMappingExposure ?? worldStateManager?.getState().toneMappingExposure ?? 1.0}
        />
      )}

      {/* 🌙 环境光基底：完全由 WorldState.ambientColor 控制，不再硬编码 */}
      {/* 修复：添加半球光作为基础补光 (Fill Light)，防止阴影死黑，解决"数值阻碍感" */}
      {/* 🔥 Shadow Opacity Logic: Opacity 1.0 => Ambient 0; Opacity 0.0 => Ambient Base */}
      {/* 🔥 Shadow Color Logic: Opacity controls Intensity; Color controls GroundColor */}
      <hemisphereLight
        color="#ebf4fa" // Sky Color (Keep cool)
        groundColor={worldState?.shadowColor || "#3f423e"} // 🔥 Shadow Tint (Ground Color)
        // 🔥 Boost Intensity to 5.0 (was 3.5) so it competes with HDR Sun (8.0)
        // This allows "Opacity" slider to actually lighten the shadows by adding fill light.
        intensity={(worldState?.lightIntensity || 1.0) * 5.0 * (1.0 - (worldState?.shadowOpacity ?? 0.8))}
      />

      {/* 方向光（太阳） */}
      <directionalLight
        ref={sunLightRef}
        position={[20, 20, 10]}
        intensity={worldState?.lightIntensity * 2.5 || 2.5}
        color={worldState?.directionalColor || '#ffffff'}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-far={1000} // 🔥 增加远裁剪面，适配大场景
        // 🔥 修复：默认视锥体设置为 150x150，足以覆盖常规视野
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.0005}
      />
      {/* 🔥 关键修复：显式将目标添加到场景，否则 target.position 更新将无效 */}
      {sunLightRef.current && <primitive object={sunLightRef.current.target} />}

      {/* 渲染所有根实体 */}
      {rootEntities.map((entity) => (
        <EntityRenderer key={entity.id} entity={entity} worldState={worldState} terrainSystem={terrainSystem} vegetationSystem={vegetationSystem} getCameraMode={getCameraMode} />
      ))}

      {/* 物理调试渲染 */}
      <PhysicsDebugRenderer manager={archValidationManager} enabled={worldState?.physicsDebugEnabled ?? false} />

      {/* 音频调试渲染 */}
      <AudioDebugRenderer manager={archValidationManager} enabled={worldState?.audioDebugEnabled ?? false} />
    </>
  );
};
