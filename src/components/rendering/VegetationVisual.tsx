/**
 * PolyForge v1.3.0 - VegetationVisual
 * Phase 11.3: 植被渲染组件
 * 
 * 功能：
 * - 基于 THREE.InstancedMesh 的高性能渲染
 * - 塞尔达式风场 Shader（顶点着色器摆动）
 * - 自动对齐地形高度
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../core/Entity';
import { VegetationComponent, VegetationType, VegetationConfig } from '../../core/components/VegetationComponent';

/**
 * 植被实例数据（从 VegetationSystem 导入的类型）
 */
interface VegetationInstance {
  position: THREE.Vector3;
  rotation: number;
  scale: THREE.Vector3;
  colorOffset: THREE.Color;
}

/**
 * VegetationVisual Props
 */
interface VegetationVisualProps {
  entity: Entity;
  vegetationSystem: any; // VegetationSystem 实例
  grassScale?: number; // 🌿 动态草地缩放
  windStrength?: number; // 🌿 动态风场强度
  grassColor?: string; // 🌿 动态草地颜色
}

/**
 * 塞尔达式风场 Shader
 * 在顶点着色器中实现随风摆动效果
 */
const createWindShader = (baseColor: string, windStrength: number, windSpeed: number) => {
  return {
    uniforms: {
      time: { value: 0 },
      windStrength: { value: windStrength },
      windSpeed: { value: windSpeed },
      baseColor: { value: new THREE.Color(baseColor) },
    },
    vertexShader: `
      uniform float time;
      uniform float windStrength;
      uniform float windSpeed;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      // 简单的噪声函数
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        
        // 计算风场偏移（只影响顶部顶点）
        float heightFactor = position.y; // 越高摆动越大
        
        // 使用 sin 函数和噪声实现摆动
        float windPhase = time * windSpeed + position.x * 0.5 + position.z * 0.3;
        float windNoise = noise(vec2(position.x * 0.1, position.z * 0.1 + time * 0.1));
        
        float windOffsetX = sin(windPhase) * windStrength * heightFactor * (0.5 + windNoise * 0.5);
        float windOffsetZ = cos(windPhase * 0.7) * windStrength * heightFactor * (0.5 + windNoise * 0.5);
        
        // 应用风场偏移
        vec3 displaced = position;
        displaced.x += windOffsetX;
        displaced.z += windOffsetZ;
        
        // 变换到裁剪空间
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        // 简单的光照计算
        vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
        float diffuse = max(dot(normalize(vNormal), lightDir), 0.0);
        
        // 添加环境光
        float ambient = 0.3;
        
        // 根据高度添加渐变（底部更暗）
        float heightGradient = clamp(vPosition.y * 0.5 + 0.5, 0.0, 1.0);
        
        // 最终颜色
        vec3 color = baseColor * (ambient + diffuse * 0.7) * heightGradient;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  };
};

/**
 * VegetationVisual - 植被渲染组件
 */
export const VegetationVisual: React.FC<VegetationVisualProps> = ({ entity, vegetationSystem }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // 🔥 调试：组件挂载时打印
  useEffect(() => {
    console.log(`[VegetationVisual] Component mounted for entity: ${entity.name} (${entity.id})`);
    return () => {
      console.log(`[VegetationVisual] Component unmounted for entity: ${entity.name} (${entity.id})`);
    };
  }, [entity.id, entity.name]);
  
  // 获取植被组件
  const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
  
  // ✅ 始终获取配置和实例（即使为空）
  const config: VegetationConfig = vegetation?.config || {
    type: VegetationType.GRASS,
    baseColor: '#7cba3d',
    windStrength: 0.1,
    windSpeed: 1.0,
    scale: 1.0,
    density: 10,
    seed: 0,
    minHeight: 0.5,
    maxHeight: 1.0,
    minWidth: 0.1,
    maxWidth: 0.2,
    colorVariation: 0.2,
    alignToTerrain: true,
  };

  // 获取实例数据（如果没有则返回空数组）
  const instances = vegetationSystem?.getInstances(entity.id) || [];
  
  // 🔥 调试：打印实例数量
  useEffect(() => {
    console.log(`[VegetationVisual] Entity ${entity.name} (${entity.id}):`, {
      hasVegetationSystem: !!vegetationSystem,
      instancesLength: instances.length,
      vegetationEnabled: vegetation?.enabled,
      shouldRender: vegetation && vegetation.enabled && instances.length > 0,
    });
  }, [instances.length, entity.id, entity.name, vegetation?.enabled, vegetationSystem]);
  
  // ✅ 计算是否应该显示（但不影响 Hook 调用）
  const shouldRender = vegetation && vegetation.enabled && instances.length > 0;

  // ✅ 始终创建几何体（无条件）
  const geometry = useMemo(() => {
    let geom: THREE.BufferGeometry;
    
    switch (config.type) {
      case VegetationType.GRASS:
        // 草：简单的平面（两个交叉的平面）- 🔥 增大尺寸
        geom = new THREE.PlaneGeometry(1.0, 2.0, 1, 4);
        break;
      
      case VegetationType.FLOWER:
        // 花：圆柱体 + 球体
        geom = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        break;
      
      case VegetationType.TREE:
        // 树：圆锥体
        geom = new THREE.ConeGeometry(0.5, 2, 8);
        break;
      
      case VegetationType.BUSH:
        // 灌木：球体
        geom = new THREE.SphereGeometry(0.3, 8, 8);
        break;
      
      default:
        geom = new THREE.PlaneGeometry(1.0, 2.0, 1, 4);
    }
    
    // 🔥 关键：确保几何体居中，否则实例会偏移
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    
    return geom;
  }, [config.type]);

  // ✅ 始终创建风场 Shader 材质（无条件）
  const shader = useMemo(() => {
    return createWindShader(config.baseColor, config.windStrength, config.windSpeed);
  }, [config.baseColor, config.windStrength, config.windSpeed]);

  // 🔥 强制注入方式：预分配 5000 个实例空间，使用 useLayoutEffect 显式遍历数据
  useEffect(() => {
    if (!meshRef.current || !shouldRender || instances.length === 0) {
      console.log('[VegetationVisual] ⚠️ Skipping injection:', {
        hasMesh: !!meshRef.current,
        shouldRender,
        instancesLength: instances.length,
      });
      return;
    }

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();
    
    // 获取全局缩放倍数
    const globalScale = config.scale ?? 1.0;

    console.log(`[VegetationVisual] 🔥 Force-injecting ${instances.length} instances for ${entity.name}`);
    console.log(`[VegetationVisual] 🔥 Mesh current count BEFORE: ${mesh.count}`);

    // 🔥 显式遍历数据，强制注入矩阵
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      
      // 设置位置（使用地形高度，不需要额外补偿）
      dummy.position.set(
        instance.position.x,
        instance.position.y,
        instance.position.z
      );
      
      dummy.rotation.y = instance.rotation;
      
      // 应用全局缩放 + 实例缩放（移除最小缩放限制）
      dummy.scale.set(
        instance.scale.x * globalScale,
        instance.scale.y * globalScale,
        instance.scale.z * globalScale
      );
      
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      
      // 设置颜色
      if (mesh.instanceColor) {
        mesh.setColorAt(i, instance.colorOffset);
      }
    }
    
    // 🔥 手动设置当前显示数量
    mesh.count = instances.length;
    
    console.log(`[VegetationVisual] 🔥 Mesh current count AFTER: ${mesh.count}`);
    
    // 🔥 强制更新实例矩阵
    mesh.instanceMatrix.needsUpdate = true;
    
    // 🔥 强制刷新包围球
    mesh.computeBoundingSphere();
    
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    // 调试日志 - 打印前5个实例的详细信息
    console.log('[VegetationVisual] ✅ Force-injection complete:', {
      count: mesh.count,
      maxInstances: 5000,
      geometryType: config.type,
      samples: instances.slice(0, 5).map((inst, i) => ({
        index: i,
        position: inst.position.toArray(),
        scale: inst.scale.toArray(),
        rotation: inst.rotation,
      })),
    });
  }, [instances, entity.name, shouldRender, config.scale, config.type, entity.id]);

  // ✅ 始终执行 useFrame（Shader 时间更新）
  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms && shouldRender) {
      // 🌿 更新 Shader 时间（风场动画）
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // 🔥 调试：每帧检查 mesh.count 是否被重置
    if (meshRef.current && instances.length > 0) {
      if (meshRef.current.count !== instances.length) {
        console.warn(`[VegetationVisual] ⚠️ mesh.count was reset! Expected: ${instances.length}, Got: ${meshRef.current.count}`);
        // 🔥 强制恢复正确的 count
        meshRef.current.count = instances.length;
      }
    }
  });

  // 🔥 预分配 5000 个实例空间，废除 key 属性（避免闪烁和性能浪费）
  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, 5000]} // 🔥 硬编码预分配 5000 个实例空间
      // 🔥 移除 count 属性，让 useEffect 手动设置
      castShadow
      receiveShadow
      visible={shouldRender}
      frustumCulled={false}
    >
      {/* 🌿 风场 Shader 材质 */}
      <shaderMaterial
        ref={materialRef}
        attach="material"
        {...shader}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};
