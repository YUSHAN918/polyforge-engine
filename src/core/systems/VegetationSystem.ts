/**
 * PolyForge v1.3.0 - VegetationSystem
 * Phase 11.3: 植被系统
 * 
 * 功能：
 * - 基于 GPU Instancing 的高性能渲染
 * - 实时读取 TerrainComponent 的 heightMap
 * - 自动对齐地形高度
 * - 塞尔达式风场 Shader
 */

import { System } from '../types';
import { EntityManager } from '../EntityManager';
import { Clock } from '../Clock';
import { VegetationComponent, VegetationType } from '../components/VegetationComponent';
import { TerrainComponent } from '../components/TerrainComponent';
import { WorldStateManager } from '../WorldStateManager';
import * as THREE from 'three';

/**
 * 植被实例数据
 */
interface VegetationInstance {
  position: THREE.Vector3;
  rotation: number;
  scale: THREE.Vector3;
  colorOffset: THREE.Color;
}

/**
 * VegetationSystem - 植被系统
 * 
 * 管理植被的生成、更新和渲染
 */
export class VegetationSystem implements System {
  readonly name = 'VegetationSystem';
  readonly priority = 110; // 在 TerrainSystem 之后
  readonly requiredComponents: string[] = [];

  private entityManager: EntityManager;
  private clock: Clock;
  private worldStateManager?: WorldStateManager;

  // 植被实例缓存（entityId -> instances）
  private instanceCache: Map<string, VegetationInstance[]> = new Map();

  constructor(worldStateManager?: WorldStateManager) {
    this.worldStateManager = worldStateManager;
  }

  initialize(entityManager: EntityManager, clock: Clock): void {
    this.entityManager = entityManager;
    this.clock = clock;
    console.log('[VegetationSystem] Initialized');
  }

  update(): void {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.warn('[VegetationSystem] EntityManager not initialized, skipping update');
      return;
    }

    // 检查所有植被实体，如果脏标记为 true，重新生成
    const entities = this.entityManager.getAllEntities();
    
    for (const entity of entities) {
      const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
      
      if (vegetation && vegetation.enabled && vegetation.isDirty) {
        this.generateVegetation(entity);
        vegetation.clearDirty();
      }
    }
  }

  onEntityAdded(entity: any): void {
    if (entity?.hasComponent('Vegetation')) {
      console.log(`[VegetationSystem] Vegetation entity added: ${entity.name}`);
      this.generateVegetation(entity);
    }
  }

  onEntityRemoved(entity: any): void {
    // 清理实例缓存
    if (this.instanceCache.has(entity.id)) {
      this.instanceCache.delete(entity.id);
      console.log(`[VegetationSystem] Vegetation instances cleared for: ${entity.name}`);
    }
  }

  /**
   * 生成植被实例
   */
  private generateVegetation(entity: any): void {
    const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
    if (!vegetation) return;

    const config = vegetation.config;
    
    // 获取关联的地形实体
    let terrainEntity: any = null;
    let terrain: TerrainComponent | null = null;
    
    if (config.terrainEntityId) {
      terrainEntity = this.entityManager.getEntity(config.terrainEntityId);
      if (terrainEntity) {
        terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
      }
    }

    if (!terrain) {
      console.warn('[VegetationSystem] No terrain found for vegetation entity:', entity.name);
      return;
    }

    // 计算实例数量
    const terrainArea = terrain.config.width * terrain.config.depth;
    const instanceCount = Math.floor(terrainArea * config.density);
    
    console.log(`[VegetationSystem] Generating ${instanceCount} vegetation instances for ${entity.name}`);

    // 生成实例
    const instances: VegetationInstance[] = [];
    const rng = this.seededRandom(config.seed);

    for (let i = 0; i < instanceCount; i++) {
      // 随机位置（在地形范围内）
      const x = (rng() - 0.5) * terrain.config.width;
      const z = (rng() - 0.5) * terrain.config.depth;
      
      // 获取地形高度
      const y = this.getTerrainHeightAt(terrain, x, z);
      
      // 随机旋转
      const rotation = rng() * Math.PI * 2;
      
      // 随机缩放
      const height = config.minHeight + rng() * (config.maxHeight - config.minHeight);
      const width = config.minWidth + rng() * (config.maxWidth - config.minWidth);
      
      // 颜色变化
      const colorOffset = new THREE.Color(config.baseColor);
      const variation = (rng() - 0.5) * config.colorVariation;
      colorOffset.offsetHSL(0, 0, variation);
      
      instances.push({
        position: new THREE.Vector3(x, y, z),
        rotation,
        scale: new THREE.Vector3(width, height, width),
        colorOffset,
      });
    }

    // 缓存实例数据
    this.instanceCache.set(entity.id, instances);
    vegetation.instanceCount = instanceCount;

    console.log(`[VegetationSystem] Generated ${instanceCount} instances for ${entity.name}`);
  }

  /**
   * 获取地形在指定世界坐标的高度
   */
  private getTerrainHeightAt(terrain: TerrainComponent, worldX: number, worldZ: number): number {
    // 世界坐标转网格坐标
    const halfWidth = terrain.config.width / 2;
    const halfDepth = terrain.config.depth / 2;

    const gridX = ((worldX + halfWidth) / terrain.config.width) * terrain.config.widthSegments;
    const gridZ = ((worldZ + halfDepth) / terrain.config.depth) * terrain.config.depthSegments;

    // 双线性插值
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

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const h = h0 * (1 - fz) + h1 * fz;

    return h;
  }

  /**
   * 获取植被实例数据（供渲染层使用）
   */
  getInstances(entityId: string): VegetationInstance[] | null {
    return this.instanceCache.get(entityId) || null;
  }

  /**
   * 清除所有植被
   */
  clearAllVegetation(): void {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.warn('[VegetationSystem] EntityManager not initialized, cannot clear vegetation');
      return;
    }

    const entities = this.entityManager.getAllEntities();
    
    for (const entity of entities) {
      if (entity.hasComponent('Vegetation')) {
        this.entityManager.destroyEntity(entity.id);
      }
    }

    this.instanceCache.clear();
    console.log('[VegetationSystem] All vegetation cleared');
  }

  /**
   * 生成指定密度的草地
   */
  spawnGrass(density: number, terrainEntityId: string): string {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.error('[VegetationSystem] EntityManager not initialized, cannot spawn grass');
      return '';
    }

    const entity = this.entityManager.createEntity(`Grass_${Date.now()}`);
    
    const vegetation = new VegetationComponent({
      density,
      type: VegetationType.GRASS,
      seed: Math.random() * 10000,
      minHeight: 0.3,
      maxHeight: 0.8,
      minWidth: 0.05,
      maxWidth: 0.15,
      baseColor: '#4a7c3a',
      colorVariation: 0.3,
      windStrength: 0.6,
      windSpeed: 1.2,
      alignToTerrain: true,
      terrainEntityId,
    });

    entity.addComponent(vegetation);
    
    console.log(`[VegetationSystem] Spawned grass with density ${density}`);
    
    return entity.id;
  }

  /**
   * 生成指定密度的花朵
   */
  spawnFlowers(density: number, terrainEntityId: string): string {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.error('[VegetationSystem] EntityManager not initialized, cannot spawn flowers');
      return '';
    }

    const entity = this.entityManager.createEntity(`Flowers_${Date.now()}`);
    
    const vegetation = new VegetationComponent({
      density,
      type: VegetationType.FLOWER,
      seed: Math.random() * 10000,
      minHeight: 0.2,
      maxHeight: 0.5,
      minWidth: 0.1,
      maxWidth: 0.2,
      baseColor: '#ff6b9d',
      colorVariation: 0.4,
      windStrength: 0.4,
      windSpeed: 0.8,
      alignToTerrain: true,
      terrainEntityId,
    });

    entity.addComponent(vegetation);
    
    console.log(`[VegetationSystem] Spawned flowers with density ${density}`);
    
    return entity.id;
  }

  /**
   * 伪随机数生成器（基于种子）
   */
  private seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  /**
   * 获取风场参数（从 WorldStateManager）
   */
  getWindParams(): { strength: number; speed: number; direction: THREE.Vector2 } {
    // 默认风场参数
    let strength = 0.5;
    let speed = 1.0;
    const direction = new THREE.Vector2(1, 0);

    // 从 WorldStateManager 获取风场参数（预留接口）
    if (this.worldStateManager) {
      const state = this.worldStateManager.getState();
      
      // 根据天气调整风力
      if (state.weather === 'rain') {
        strength = 0.8;
        speed = 1.5;
      } else if (state.weather === 'snow') {
        strength = 0.3;
        speed = 0.6;
      }
    }

    return { strength, speed, direction };
  }
}
