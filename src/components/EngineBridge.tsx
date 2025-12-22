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
import * as THREE from 'three';
import { EntityManager } from '../core/EntityManager';
import { Entity } from '../core/Entity';
import { TransformComponent } from '../core/components/TransformComponent';
import { VisualComponent } from '../core/components/VisualComponent';
import { TerrainComponent } from '../core/components/TerrainComponent';
import { VegetationComponent } from '../core/components/VegetationComponent';
import { WorldStateManager } from '../core/WorldStateManager';
import { getAssetRegistry } from '../core/assets/AssetRegistry';
import { AssetType } from '../core/assets/types';
import { PostProcessing } from './PostProcessing';
import { TerrainVisual } from './rendering/TerrainVisual';
import { VegetationVisual } from './rendering/VegetationVisual';

/**
 * EngineBridge Props
 */
interface EngineBridgeProps {
  entityManager: EntityManager;
  worldStateManager?: WorldStateManager;
  terrainSystem?: any; // TerrainSystem 实例（用于鼠标交互）
  vegetationSystem?: any; // VegetationSystem 实例
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
}>(({ entity, worldState, terrainSystem, vegetationSystem }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [modelLoaded, setModelLoaded] = useState(false);

  // 获取组件
  const transform = entity.getComponent<TransformComponent>('Transform');
  const visual = entity.getComponent<VisualComponent>('Visual');
  const terrain = entity.getComponent<TerrainComponent>('Terrain');
  const vegetation = entity.getComponent<VegetationComponent>('Vegetation');

  // 如果是地形实体，使用 TerrainVisual 渲染
  if (terrain) {
    return <TerrainVisual entity={entity} terrainSystem={terrainSystem} />;
  }

  // 如果是植被实体，使用 VegetationVisual 渲染
  if (vegetation) {
    return <VegetationVisual entity={entity} vegetationSystem={vegetationSystem} />;
  }

  // 加载模型资产
  useEffect(() => {
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
        console.warn(`Model asset not found: ${visual.geometry.assetId}`);
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
  }, [visual?.geometry.assetId]);

  // 更新变换
  useEffect(() => {
    if (!groupRef.current || !transform) return;

    const group = groupRef.current;
    
    // 位置
    group.position.set(
      transform.position[0],
      transform.position[1],
      transform.position[2]
    );

    // 旋转（欧拉角转四元数）
    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(transform.rotation[0]),
      THREE.MathUtils.degToRad(transform.rotation[1]),
      THREE.MathUtils.degToRad(transform.rotation[2])
    );
    group.quaternion.setFromEuler(euler);

    // 缩放
    group.scale.set(
      transform.scale[0],
      transform.scale[1],
      transform.scale[2]
    );
  }, [transform?.position, transform?.rotation, transform?.scale]);

  // 更新材质（响应 WorldState 变化）
  useEffect(() => {
    if (!visual || meshes.length === 0) return;

    meshes.forEach((mesh) => {
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        // 更新基础材质属性
        mesh.material.color.set(visual.material.color);
        mesh.material.metalness = visual.material.metalness ?? 0.5;
        mesh.material.roughness = visual.material.roughness ?? 0.5;
        mesh.material.opacity = visual.material.opacity ?? 1.0;
        mesh.material.transparent = visual.material.transparent ?? false;

        // 更新自发光
        if (visual.hasEmissive()) {
          mesh.material.emissive.set(visual.emissive.color);
          mesh.material.emissiveIntensity = visual.emissive.intensity;
        } else {
          mesh.material.emissive.set('#000000');
          mesh.material.emissiveIntensity = 0;
        }

        // 响应环境光照变化
        if (worldState) {
          // 根据光照强度调整材质亮度
          const lightIntensity = worldState.lightIntensity || 1.0;
          mesh.material.envMapIntensity = lightIntensity;
        }

        mesh.material.needsUpdate = true;
      }
    });
  }, [visual, meshes, worldState]);

  if (!visual || !visual.visible) return null;

  return (
    <group ref={groupRef} name={entity.name}>
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

      {/* 递归渲染子实体 */}
      {entity.children.map((child) => (
        <EntityRenderer key={child.id} entity={child} worldState={worldState} terrainSystem={terrainSystem} vegetationSystem={vegetationSystem} />
      ))}
    </group>
  );
});

EntityRenderer.displayName = 'EntityRenderer';

/**
 * EngineBridge - ECS 到 R3F 的桥接组件
 */
export const EngineBridge: React.FC<EngineBridgeProps> = ({
  entityManager,
  worldStateManager,
  terrainSystem,
  vegetationSystem,
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
  
  const { scene, gl } = useThree();
  const sunLightRef = useRef<THREE.DirectionalLight>(null);

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

  // 加载 HDR 环境贴图
  useEffect(() => {
    const loadHDR = async () => {
      const assetRegistry = getAssetRegistry();
      
      // ✅ 健壮性检查：确保 AssetRegistry 已初始化
      if (!assetRegistry['initialized']) {
        console.log('[EngineBridge] Initializing AssetRegistry...');
        await assetRegistry.initialize();
      }
      
      // 查询第一个 HDR 资产
      const hdrAssets = await assetRegistry.queryAssets({ type: AssetType.HDR });
      
      if (hdrAssets.length === 0) {
        console.log('[EngineBridge] No HDR assets found');
        return;
      }

      console.log(`[EngineBridge] Loading HDR: ${hdrAssets[0].name}`);
      const hdrAsset = hdrAssets[0];
      
      // 获取 HDR 资产的 Blob 数据
      const blob = await assetRegistry.getAsset(hdrAsset.id);
      
      if (!blob) {
        console.warn('[EngineBridge] HDR asset not found');
        return;
      }

      // 使用 HDRLoader 加载 HDR
      const { HDRLoader } = await import('three/addons/loaders/HDRLoader.js');
      const hdrLoader = new HDRLoader();
      
      const url = URL.createObjectURL(blob);
      
      hdrLoader.load(url, (texture) => {
        // 使用 PMREMGenerator 预处理纹理
        const pmremGenerator = new THREE.PMREMGenerator(gl);
        pmremGenerator.compileEquirectangularShader();
        
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        setHdrEnvMap(envMap);

        // 应用到场景
        scene.environment = envMap;
        scene.background = envMap;

        console.log('[EngineBridge] HDR environment applied');
        
        // 清理
        texture.dispose();
        pmremGenerator.dispose();
        URL.revokeObjectURL(url);
      });
    };

    loadHDR();
  }, [scene, gl]);

  // 更新太阳光照（塞尔达式光影联动）
  useFrame(() => {
    if (!worldState || !sunLightRef.current) return;

    const time = worldState.timeOfDay || 12;
    
    // 计算太阳位置（简化版）
    const sunAngle = ((time - 6) / 12) * Math.PI;
    const sunX = Math.cos(sunAngle) * 20;
    const sunY = Math.sin(sunAngle) * 20;
    
    sunLightRef.current.position.set(sunX, Math.max(sunY, 1), 10);
    sunLightRef.current.intensity = worldState.lightIntensity || 1.0;
    
    // 更新光照颜色
    if (worldState.directionalColor) {
      sunLightRef.current.color.set(worldState.directionalColor);
    }
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
      {/* 后处理管线 */}
      {postProcessingEnabled && (
        <PostProcessing
          enabled={postProcessingEnabled}
          bloomEnabled={bloomEnabled}
          bloomStrength={bloomStrength}
          bloomRadius={bloomRadius}
          bloomThreshold={bloomThreshold}
          smaaEnabled={smaaEnabled}
        />
      )}

      {/* 环境光 */}
      <ambientLight intensity={worldState?.lightIntensity * 0.3 || 0.3} color={worldState?.ambientColor || '#ffffff'} />
      
      {/* 方向光（太阳） */}
      <directionalLight
        ref={sunLightRef}
        position={[20, 20, 10]}
        intensity={worldState?.lightIntensity || 1.0}
        color={worldState?.directionalColor || '#ffffff'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />

      {/* 渲染所有根实体 */}
      {rootEntities.map((entity) => (
        <EntityRenderer key={entity.id} entity={entity} worldState={worldState} terrainSystem={terrainSystem} vegetationSystem={vegetationSystem} />
      ))}
    </>
  );
};
