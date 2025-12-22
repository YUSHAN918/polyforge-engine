/**
 * PolyForge v1.3.0 - TerrainSystem
 * Phase 11.2: 动态地形系统
 * 
 * 功能：
 * - 高性能动态地形管理
 * - 笔刷引擎（The God Hand）
 * - 射线检测定位
 * - 局部顶点更新优化
 */

import { System } from '../types';
import { EntityManager } from '../EntityManager';
import { Clock } from '../Clock';
import { TerrainComponent } from '../components/TerrainComponent';
import * as THREE from 'three';

/**
 * 笔刷配置
 */
export interface BrushConfig {
  radius: number;      // 半径（世界单位）
  strength: number;    // 强度（高度变化量）
  hardness: number;    // 硬度（0-1，控制衰减曲线）
}

/**
 * TerrainSystem - 地形系统
 * 
 * 管理动态地形的变形和更新
 */
export class TerrainSystem implements System {
  readonly name = 'TerrainSystem';
  readonly priority = 100;
  readonly requiredComponents: string[] = [];  // TerrainSystem 不需要特定组件

  private entityManager: EntityManager;
  private clock: Clock;

  // 笔刷配置
  private brush: BrushConfig = {
    radius: 2.0,
    strength: 0.1,
    hardness: 0.5,
  };

  // 射线检测器（用于鼠标定位）
  private raycaster: THREE.Raycaster;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  initialize(entityManager: EntityManager, clock: Clock): void {
    this.entityManager = entityManager;
    this.clock = clock;
    console.log('[TerrainSystem] Initialized');
  }

  update(): void {
    // TerrainSystem 主要通过外部调用 modifyHeight 来工作
    // update 循环中不需要做什么
  }

  onEntityAdded(entity: any): void {
    if (entity?.hasComponent('Terrain')) {
      console.log(`[TerrainSystem] Terrain entity added: ${entity.name}`);
    }
  }

  onEntityRemoved(entity: any): void {
    // 清理逻辑（如果需要）
  }

  /**
   * 设置笔刷配置
   */
  setBrush(config: Partial<BrushConfig>): void {
    this.brush = { ...this.brush, ...config };
    console.log('[TerrainSystem] Brush updated:', this.brush);
  }

  /**
   * 获取笔刷配置
   */
  getBrush(): BrushConfig {
    return { ...this.brush };
  }

  /**
   * 修改地形高度（The God Hand）
   * 
   * @param terrainEntity 地形实体
   * @param worldPoint 世界坐标点（THREE.Vector3）
   * @param delta 高度变化量（正数抬高，负数降低）
   */
  modifyHeight(terrainEntity: any, worldPoint: THREE.Vector3, delta: number): void {
    const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
    if (!terrain) {
      console.warn('[TerrainSystem] Entity does not have TerrainComponent');
      return;
    }

    // 将世界坐标转换为网格坐标
    const { gridX, gridZ } = this.worldToGrid(terrain, worldPoint);

    // 计算受影响的区域
    const radiusInGrid = this.brush.radius / (terrain.config.width / terrain.config.widthSegments);
    const minX = Math.max(0, Math.floor(gridX - radiusInGrid));
    const maxX = Math.min(terrain.config.widthSegments, Math.ceil(gridX + radiusInGrid));
    const minZ = Math.max(0, Math.floor(gridZ - radiusInGrid));
    const maxZ = Math.min(terrain.config.depthSegments, Math.ceil(gridZ + radiusInGrid));

    // 应用笔刷效果
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        // 计算距离
        const dx = x - gridX;
        const dz = z - gridZ;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // 计算衰减（基于硬度）
        const falloff = this.calculateFalloff(distance, radiusInGrid, this.brush.hardness);

        // 应用高度变化
        if (falloff > 0) {
          const heightDelta = delta * this.brush.strength * falloff;
          terrain.modifyHeight(x, z, heightDelta);
        }
      }
    }

    console.log(`[TerrainSystem] Modified terrain at (${gridX.toFixed(2)}, ${gridZ.toFixed(2)}), affected ${(maxX - minX + 1) * (maxZ - minZ + 1)} vertices`);
  }

  /**
   * 射线检测地形交点
   * 
   * @param terrainEntity 地形实体
   * @param ray 射线（THREE.Ray）
   * @returns 交点世界坐标，如果没有交点返回 null
   */
  raycastTerrain(terrainEntity: any, ray: THREE.Ray): THREE.Vector3 | null {
    const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
    if (!terrain) {
      return null;
    }

    // 简化版射线检测：假设地形在 XZ 平面上
    // 计算射线与 Y=0 平面的交点
    const t = -ray.origin.y / ray.direction.y;
    if (t < 0) {
      return null; // 射线向上，不会与地形相交
    }

    const intersectionPoint = new THREE.Vector3();
    intersectionPoint.copy(ray.origin).addScaledVector(ray.direction, t);

    // 检查交点是否在地形范围内
    const halfWidth = terrain.config.width / 2;
    const halfDepth = terrain.config.depth / 2;

    if (
      intersectionPoint.x < -halfWidth ||
      intersectionPoint.x > halfWidth ||
      intersectionPoint.z < -halfDepth ||
      intersectionPoint.z > halfDepth
    ) {
      return null; // 交点在地形范围外
    }

    // 获取交点处的实际高度
    const { gridX, gridZ } = this.worldToGrid(terrain, intersectionPoint);
    const height = this.interpolateHeight(terrain, gridX, gridZ);
    intersectionPoint.y = height;

    return intersectionPoint;
  }

  /**
   * 世界坐标转网格坐标
   */
  private worldToGrid(terrain: TerrainComponent, worldPoint: THREE.Vector3): { gridX: number; gridZ: number } {
    const halfWidth = terrain.config.width / 2;
    const halfDepth = terrain.config.depth / 2;

    const gridX = ((worldPoint.x + halfWidth) / terrain.config.width) * terrain.config.widthSegments;
    const gridZ = ((worldPoint.z + halfDepth) / terrain.config.depth) * terrain.config.depthSegments;

    return { gridX, gridZ };
  }

  /**
   * 插值获取指定网格坐标的高度（双线性插值）
   */
  private interpolateHeight(terrain: TerrainComponent, gridX: number, gridZ: number): number {
    const x0 = Math.floor(gridX);
    const x1 = Math.ceil(gridX);
    const z0 = Math.floor(gridZ);
    const z1 = Math.ceil(gridZ);

    const fx = gridX - x0;
    const fz = gridZ - z0;

    const h00 = terrain.getHeight(x0, z0);
    const h10 = terrain.getHeight(x1, z0);
    const h01 = terrain.getHeight(x0, z1);
    const h11 = terrain.getHeight(x1, z1);

    // 双线性插值
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const h = h0 * (1 - fz) + h1 * fz;

    return h;
  }

  /**
   * 计算笔刷衰减
   * 
   * @param distance 距离中心的距离
   * @param radius 笔刷半径
   * @param hardness 硬度（0-1）
   * @returns 衰减值（0-1）
   */
  private calculateFalloff(distance: number, radius: number, hardness: number): number {
    if (distance >= radius) {
      return 0;
    }

    const normalizedDistance = distance / radius;

    // 使用平滑步函数（smoothstep）
    // hardness 控制衰减曲线的陡峭程度
    const t = 1 - normalizedDistance;
    const smoothT = t * t * (3 - 2 * t); // smoothstep

    // 应用硬度
    return Math.pow(smoothT, 1 / (hardness + 0.1));
  }

  /**
   * 重置地形为平坦
   */
  resetTerrain(terrainEntity: any): void {
    const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
    if (!terrain) {
      return;
    }

    terrain.heightData.fill(0);
    terrain.isDirty = true;
    terrain.dirtyRegion = {
      minX: 0,
      maxX: terrain.config.widthSegments,
      minZ: 0,
      maxZ: terrain.config.depthSegments,
    };

    console.log('[TerrainSystem] Terrain reset to flat');
  }

  /**
   * 生成随机地形（用于测试）
   */
  generateRandomTerrain(terrainEntity: any, amplitude: number = 5): void {
    const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
    if (!terrain) {
      return;
    }

    for (let z = 0; z <= terrain.config.depthSegments; z++) {
      for (let x = 0; x <= terrain.config.widthSegments; x++) {
        const height = (Math.random() - 0.5) * amplitude;
        terrain.setHeight(x, z, height);
      }
    }

    terrain.isDirty = true;
    terrain.dirtyRegion = {
      minX: 0,
      maxX: terrain.config.widthSegments,
      minZ: 0,
      maxZ: terrain.config.depthSegments,
    };

    console.log('[TerrainSystem] Random terrain generated');
  }
}

