import React, { useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * 🔥 稳定引用：Geometry 提取到组件外部
 * 避免每次渲染都创建新对象，防止 React 认为参数变化而重建 InstancedMesh
 */
const GRASS_GEOMETRY = new THREE.PlaneGeometry(0.5, 1, 1, 4);

export const VegetationVisual = ({ entity, vegetationSystem }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  // 🔥 优化更新：使用 ref 跟踪注册状态，避免重复注册
  const isRegisteredRef = useRef(false);

  // 1. 材质注入：在标准材质基础上添加风场摆动
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    mat.onBeforeCompile = (shader) => {
      // 注入 Uniforms
      shader.uniforms.time = { value: 0 };
      shader.uniforms.windStrength = { value: 0.1 };
      
      // 注入顶点着色器逻辑
      shader.vertexShader = `
        uniform float time;
        uniform float windStrength;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // 基于位置的随机风场
        float h = position.y;
        float wind = sin(time * 2.0 + transformed.x * 0.5) * windStrength * h;
        transformed.x += wind;
        transformed.z += wind * 0.5;
        `
      );
      
      mat.userData.shader = shader;
    };
    return mat;
  }, []);

  // 2. 句柄注册（ECS 智系统模式）
  // 🔥 优化更新：使用 ref 跟踪注册状态，避免重复注册
  useEffect(() => {
    if (meshRef.current && vegetationSystem && !isRegisteredRef.current) {
      console.log('[VegetationVisual] 注册标准实例化句柄');
      vegetationSystem.registerMesh(meshRef.current);
      isRegisteredRef.current = true;
    }
  }, [vegetationSystem]);

  // 3. 🔥 数据-渲染分离：监听 globalScale 变化，触发矩阵重新灌入
  // 使用 useLayoutEffect 在 DOM 更新后立即执行，确保矩阵数据同步
  useLayoutEffect(() => {
    if (meshRef.current && vegetationSystem) {
      const veg = entity?.getComponent('Vegetation');
      if (veg) {
        // 🔥 仅设置缩放脏标记，不触发实例重新生成
        // VegetationSystem 的 update() 方法会在下一帧自动重新灌入矩阵
        veg.isScaleDirty = true;
        console.log('[VegetationVisual] 🔥 Scale changed, triggering matrix re-injection');
      }
    }
  }, [entity, vegetationSystem, entity?.getComponent('Vegetation')?.config?.scale]);

  // 4. 实时动画更新
  useFrame((state) => {
    if (customMaterial.userData.shader) {
      customMaterial.userData.shader.uniforms.time.value = state.clock.elapsedTime;
      const veg = entity?.getComponent('Vegetation');
      if (veg) {
        customMaterial.userData.shader.uniforms.windStrength.value = veg.config.windStrength || 0.1;
      }
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      // 🔥 稳定引用：使用模块级常量 GRASS_GEOMETRY，避免每次渲染创建新对象
      args={[GRASS_GEOMETRY, customMaterial, 100000]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};
