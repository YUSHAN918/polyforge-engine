import React, { useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

import { Entity } from '../../core/types';
import { VegetationSystem } from '../../core/systems/VegetationSystem';
import { VegetationComponent } from '../../core/components/VegetationComponent';

/**
 * 🔥 稳定引用：Geometry 提取到组件外部
 * 避免每次渲染都创建新对象，防止 React 认为参数变化而重建 InstancedMesh
 */
const GRASS_GEOMETRY = new THREE.PlaneGeometry(0.5, 1, 1, 4);
GRASS_GEOMETRY.translate(0, 0.5, 0); // 🔥 关键修复：将几何体底座移至 Y=0，防止“半截入土”变成影子

interface VegetationVisualProps {
  entity: Entity;
  vegetationSystem: VegetationSystem;
  lightIntensity?: number; // 🔥 新增 prop
}

export const VegetationVisual = ({ entity, vegetationSystem, lightIntensity = 1.0 }: VegetationVisualProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // 🔥 优化更新：使用 ref 跟踪注册状态，避免重复注册
  const isRegisteredRef = useRef(false);

  // 1. 材质注入：在标准材质基础上添加风场摆动
  const customMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#4ade80',
      emissive: '#2f8f50', // 🔥 初始给一个较亮的自发光色，确保默认就有光
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    mat.onBeforeCompile = (shader) => {
      // 注入 Uniforms
      shader.uniforms.time = { value: 0 };
      shader.uniforms.windStrength = { value: 0.1 };
      shader.uniforms.uGlobalScale = { value: 1.0 }; // ✅ 新增：全局缩放 Uniform

      // 注入顶点着色器逻辑
      shader.vertexShader = `
        uniform float time;
        uniform float windStrength;
        uniform float uGlobalScale; // ✅ 注入 Uniform
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        
        // 1. 应用全局缩放 (GPU 瞬时计算)
        transformed *= uGlobalScale;

        // 2. 计算世界坐标用于风场
        #ifdef USE_INSTANCING
          vec4 worldInstancePos = instanceMatrix * vec4(transformed, 1.0);
        #else
          vec4 worldInstancePos = vec4(transformed, 1.0);
        #endif
        vec4 vLocalWorldPos = modelMatrix * worldInstancePos; // 🔥 避免使用 worldPosition 重名
        
        // 3. 基于世界坐标采样
        float h = position.y; 
        float windPhase = time * 2.0 + vLocalWorldPos.x * 0.5 + vLocalWorldPos.z * 0.3;
        float windOffset = sin(windPhase) * windStrength * h;

        // 4. 应用风场 (统一世界风向：X 轴)
        // 使用转置矩阵技巧将世界风向量映射回局部空间
        vec3 worldWindDir = vec3(1.0, 0.0, 0.0);
        #ifdef USE_INSTANCING
           // GLSL中 vec * mat 等同于 mat_transpose * vec，即逆旋转
           vec3 localWindDir = worldWindDir * mat3(instanceMatrix); 
        #else
           vec3 localWindDir = worldWindDir;
        #endif

        transformed += localWindDir * windOffset; 
        `
      );

      mat.userData.shader = shader;
    };
    return mat;
  }, []);

  // 2. 句柄注册（ECS 智系统模式）
  // 🔥 优化更新：使用 ref 跟踪注册状态，避免重复注册
  useEffect(() => {
    if (meshRef.current && vegetationSystem && entity && !isRegisteredRef.current) {
      console.log(`[VegetationVisual] 注册标注实体句柄: ${entity.id}`);
      vegetationSystem.registerMesh(entity.id, meshRef.current);
      isRegisteredRef.current = true;
    }
  }, [vegetationSystem, entity?.id]);

  // 4. 实时渲染循环：每帧从 ECS 获取最新状态同步至 GPU Uniform
  useFrame((state) => {
    if (customMaterial.userData.shader) {
      const shader = customMaterial.userData.shader;
      shader.uniforms.time.value = state.clock.elapsedTime;

      const veg = entity?.getComponent<VegetationComponent>('Vegetation');
      if (veg) {
        // 🔥 核心修复：直接从 ECS 组件每帧读取数值，无视 React 刷新机制
        shader.uniforms.windStrength.value = veg.config.windStrength || 0.1;
        shader.uniforms.uGlobalScale.value = veg.config.scale || 1.0;

        // 🎨 额外惊喜:同步草地基础颜色
        customMaterial.color.set(veg.config.baseColor);

        // 🔥 修复:使用 HSL 智能增益确保泛光
        // 无论底色多暗，我们强制提升自发光的亮度（Lightness），保留原色相
        const baseColor = new THREE.Color(veg.config.baseColor);
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);

        // 策略：如果亮度太低(<0.2)，强制提升到 0.4 作为自发光底色，否则直接用原亮度
        // 这样深色草也会有微弱的幽光，而不是死黑
        const targetL = Math.max(hsl.l, 0.4);
        const emissiveColor = new THREE.Color().setHSL(hsl.h, hsl.s, targetL);

        customMaterial.emissive.copy(emissiveColor);

        // 🔥 动态光感联动：
        // 基础强度 (0.3) * 环境光强度 (0~1)
        // 白天(1.0) -> intensity 0.3 (发光)
        // 晚上(0.0) -> intensity 0.0 (不发光)
        customMaterial.emissiveIntensity = 0.3 * lightIntensity;
      }
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      // 🔥 稳定引用：使用模块级常量 GRASS_GEOMETRY，避免每次渲染创建新对象
      args={[GRASS_GEOMETRY, customMaterial, 100000]}
      frustumCulled={true} // 🔥 性能关键：开启视锥剔除，配合 System 层的包围球计算
      castShadow
      receiveShadow
    />
  );
};
