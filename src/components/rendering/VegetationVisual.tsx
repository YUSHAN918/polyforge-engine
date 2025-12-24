import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const VegetationVisual = ({ entity, vegetationSystem }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

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
  useEffect(() => {
    if (meshRef.current && vegetationSystem) {
      console.log('[VegetationVisual] 注册标准实例化句柄');
      vegetationSystem.registerMesh(meshRef.current);
    }
  }, [vegetationSystem]);

  // 3. 实时动画更新
  useFrame((state) => {
    if (customMaterial.userData.shader) {
      customMaterial.userData.shader.uniforms.time.value = state.clock.elapsedTime;
      const veg = entity.getComponent('Vegetation');
      if (veg) {
        customMaterial.userData.shader.uniforms.windStrength.value = veg.config.windStrength || 0.1;
      }
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[new THREE.PlaneGeometry(0.5, 1, 1, 4), customMaterial, 5000]}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  );
};
