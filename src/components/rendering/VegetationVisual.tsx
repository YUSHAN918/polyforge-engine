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
import { VegetationComponent, VegetationType } from '../../core/components/VegetationComponent';

/**
 * VegetationVisual Props
 */
interface VegetationVisualProps {
  entity: Entity;
  vegetationSystem: any; // VegetationSystem 实例
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
      varying vec2 vUv;
      
      // 简单的噪声函数
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vPosition = position;
        vNormal = normal;
        vUv = uv;
        
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
        
        // 变换到世界空间
        vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      
      void main() {
        // 简单的光照计算
        vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
        float diffuse = max(dot(vNormal, lightDir), 0.0);
        
        // 添加环境光
        float ambient = 0.3;
        
        // 根据高度添加渐变（底部更暗）
        float heightGradient = vPosition.y * 0.5 + 0.5;
        
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
  
  // 获取植被组件
  const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
  
  if (!vegetation || !vegetation.enabled) {
    return null;
  }

  const config = vegetation.config;

  // 获取实例数据
  const instances = vegetationSystem.getInstances(entity.id);
  
  if (!instances || instances.length === 0) {
    return null;
  }

  // 创建几何体（根据植被类型）
  const geometry = useMemo(() => {
    switch (config.type) {
      case VegetationType.GRASS:
        // 草：简单的平面（两个交叉的平面）
        return new THREE.PlaneGeometry(0.1, 1, 1, 4);
      
      case VegetationType.FLOWER:
        // 花：圆柱体 + 球体
        return new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
      
      case VegetationType.TREE:
        // 树：圆锥体
        return new THREE.ConeGeometry(0.5, 2, 8);
      
      case VegetationType.BUSH:
        // 灌木：球体
        return new THREE.SphereGeometry(0.3, 8, 8);
      
      default:
        return new THREE.PlaneGeometry(0.1, 1, 1, 4);
    }
  }, [config.type]);

  // 创建风场 Shader 材质
  const shader = useMemo(() => {
    return createWindShader(config.baseColor, config.windStrength, config.windSpeed);
  }, [config.baseColor, config.windStrength, config.windSpeed]);

  // 更新实例矩阵
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    const dummy = new THREE.Object3D();

    instances.forEach((instance, i) => {
      // 设置位置、旋转、缩放
      dummy.position.copy(instance.position);
      dummy.rotation.y = instance.rotation;
      dummy.scale.copy(instance.scale);
      
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      
      // 设置颜色（如果支持）
      if (mesh.instanceColor) {
        mesh.setColorAt(i, instance.colorOffset);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    console.log(`[VegetationVisual] Updated ${instances.length} instances for ${entity.name}`);
  }, [instances, entity.name]);

  // 更新 Shader 时间
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      <shaderMaterial
        ref={materialRef}
        attach="material"
        {...shader}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};
