/**
 * PolyForge v1.3.0 - TerrainVisual
 * Phase 11.2: 地形可视化组件
 * 
 * 功能：
 * - 使用 PlaneGeometry 渲染动态地形
 * - 监听 TerrainComponent 的 isDirty 标记
 * - 高性能顶点更新（直接拷贝到 position.array）
 * - 实时重算法线（computeVertexNormals）
 * - 支持阴影投射和接收
 * - 鼠标交互编辑（左键抬高，右键降低，滚轮调整笔刷）
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../core/Entity';
import { TerrainComponent } from '../../core/components/TerrainComponent';
import { TransformComponent } from '../../core/components/TransformComponent';
import { VisualComponent } from '../../core/components/VisualComponent';

interface TerrainVisualProps {
  entity: Entity;
  terrainSystem?: any; // TerrainSystem 实例
  getCameraMode?: () => string;
}

/**
 * TerrainVisual - 地形可视化组件
 */
export const TerrainVisual: React.FC<TerrainVisualProps> = ({ entity, terrainSystem, getCameraMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometryRef = useRef<THREE.PlaneGeometry | null>(null);
  const { camera, raycaster, gl } = useThree();

  const [isHovering, setIsHovering] = useState(false);
  const [brushRadius, setBrushRadius] = useState(2.0);

  // 获取组件
  const terrain = entity.getComponent('Terrain') as TerrainComponent;
  const transform = entity.getComponent('Transform') as TransformComponent;
  const visual = entity.getComponent('Visual') as VisualComponent;

  if (!terrain || !transform || !visual) {
    console.warn('[TerrainVisual] Missing required components');
    return null;
  }

  // 初始化几何体
  useEffect(() => {
    if (!meshRef.current) return;

    const { widthSegments, depthSegments, width, depth } = terrain.config;

    // 创建 PlaneGeometry
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      widthSegments,
      depthSegments
    );

    // 旋转到水平面（PlaneGeometry 默认是垂直的）
    geometry.rotateX(-Math.PI / 2);

    geometryRef.current = geometry;
    meshRef.current.geometry = geometry;

    console.log(`[TerrainVisual] Initialized terrain geometry: ${widthSegments}x${depthSegments} segments`);

    return () => {
      geometry.dispose();
    };
  }, [terrain]);

  // 监听 isDirty 标记，更新顶点高度
  useFrame(() => {
    if (!terrain.isDirty || !geometryRef.current) return;

    const geometry = geometryRef.current;
    const positions = geometry.attributes.position.array as Float32Array;
    const { widthSegments, depthSegments } = terrain.config;

    // 直接拷贝高度数据到 Y 轴分量
    for (let z = 0; z <= depthSegments; z++) {
      for (let x = 0; x <= widthSegments; x++) {
        const vertexIndex = z * (widthSegments + 1) + x;
        const height = terrain.getHeight(x, z);

        // PlaneGeometry 旋转后，Y 轴是高度
        positions[vertexIndex * 3 + 1] = height;
      }
    }

    // 标记需要更新
    geometry.attributes.position.needsUpdate = true;

    // 重算法线（确保光影正确）
    geometry.computeVertexNormals();

    // 清除脏标记
    terrain.clearDirty();
  });

  // 鼠标交互：Shift+左键抬高，Ctrl+左键降低
  const handlePointerDown = (event: any) => {
    if (!terrainSystem || !terrain) return;

    // 🔥 冲突解决：只有按下 Shift 或 Ctrl 时才启用地形编辑
    // 否则让事件冒泡，交由 CameraSystem 处理旋转/平移
    // 🔥 模式隔离：只有在 Orbit 模式下才允许编辑地形
    // Crash Fix: use safe getter or assume orbit if getter missing (but here we want strictly orbit)
    // If getCameraMode is missing, we default to block or allow? Safest is to allow only if we know it's orbit.
    // If undefined, let's assuming orbit for now to avoid breaking existing flow, OR default to 'orbit'.
    const currentMode = getCameraMode ? getCameraMode() : 'orbit';
    if (currentMode !== 'orbit') return;

    if (!event.shiftKey && !event.ctrlKey) return;

    event.stopPropagation(); // 阻止冒泡，避免同时旋转相机

    // 获取鼠标在地形上的交点
    const intersect = event.intersections[0];
    if (!intersect) return;

    const worldPoint = intersect.point;

    // Shift: 抬高 (1.0), Ctrl: 降低 (-1.0)
    const delta = event.shiftKey ? 1.0 : -1.0;

    terrainSystem.modifyHeight(entity, worldPoint, delta);
  };

  // 滚轮：Shift/Ctrl + 滚轮调整笔刷大小
  const handleWheel = (event: any) => {
    if (!terrainSystem) return;

    // 只有在编辑模式下拦截滚轮
    if (!event.shiftKey && !event.ctrlKey) return;

    event.stopPropagation(); // 阻止相机缩放

    const delta = event.deltaY > 0 ? -0.5 : 0.5;
    const newRadius = Math.max(0.5, Math.min(10, brushRadius + delta));

    setBrushRadius(newRadius);
    terrainSystem.setBrush({ radius: newRadius });

    console.log(`[TerrainVisual] Brush radius: ${newRadius.toFixed(1)}`);
  };

  // 鼠标悬停
  const handlePointerOver = () => setIsHovering(true);
  const handlePointerOut = () => setIsHovering(false);

  // 材质配置
  const materialProps = {
    color: visual.material?.color || '#7cba3d',
    metalness: visual.material?.metalness ?? 0.0,
    roughness: visual.material?.roughness ?? 0.9,
  };

  return (
    <mesh
      ref={meshRef}
      position={transform.position as [number, number, number]}
      rotation={transform.rotation as [number, number, number]}
      scale={transform.scale as [number, number, number]}
      castShadow={visual.castShadow}
      receiveShadow={visual.receiveShadow}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onWheel={handleWheel}
    >
      <meshStandardMaterial
        {...materialProps}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
