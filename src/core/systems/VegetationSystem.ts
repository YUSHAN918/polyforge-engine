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

  // 🔥 PERFORMANCE: 对象池 - 复用 Vector3 和 Color 对象
  private tempVector = new THREE.Vector3();
  private tempColor = new THREE.Color();
  private _tempMatrix = new THREE.Matrix4(); // 🔥 预分配矩阵，严禁 new

  // 🔥 架构剥离：多 Mesh 注册表
  // 每个实体拥有独立的 InstancedMesh，避免句柄覆盖
  private meshMap: Map<string, THREE.InstancedMesh> = new Map();

  // 植被全局缩放（用于新批次同步）
  private globalScale: number = 1.0;

  constructor(worldStateManager?: WorldStateManager) {
    this.worldStateManager = worldStateManager;
  }

  initialize(entityManager: EntityManager, clock: Clock): void {
    this.entityManager = entityManager;
    this.clock = clock;
    console.log('[VegetationSystem] Initialized');
  }

  /**
   * 🔥 架构剥离：注册 InstancedMesh 句柄
   * 哑组件挂载时调用，将当前实体的渲染句柄告知系统
   */
  registerMesh(entityId: string, mesh: THREE.InstancedMesh): void {
    this.meshMap.set(entityId, mesh);
    console.log(`[VegetationSystem] 🔥 Mesh registered for Entity ${entityId}`);
  }

  update(): void {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.warn('[VegetationSystem] EntityManager not initialized, skipping update');
      return;
    }

    // 检查所有植被实体
    const entities = this.entityManager.getAllEntities();

    let targetGlobalScale: number | null = null;

    // 第一步：检测是否有任何一个实体的缩放发生了变化
    for (const entity of entities) {
      const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
      if (vegetation && vegetation.enabled) {
        if (vegetation.config.scale !== this.globalScale) {
          targetGlobalScale = vegetation.config.scale!;
          break; // 以第一个检测到的变化为准
        }
      }
    }

    // 第二步：如果发生变化，同步给系统及所有其它实体
    if (targetGlobalScale !== null) {
      console.log(`[VegetationSystem] 缩放同步广播: ${this.globalScale} -> ${targetGlobalScale}`);
      this.globalScale = targetGlobalScale;
      for (const entity of entities) {
        const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
        if (vegetation) {
          vegetation.config.scale = targetGlobalScale;
        }
      }
    }

    // 第三步：处理脏标记和生成逻辑
    for (const entity of entities) {
      const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
      if (vegetation && vegetation.enabled) {
        // 🔥 数据层净化：isDirty 触发重新生成实例
        if (vegetation.isDirty) {
          this.generateVegetation(entity);
          vegetation.clearDirty();
        }
        // 🔥 缩放脏标记：已弃用 (缩放移至 GPU)
        if (vegetation.isScaleDirty) {
          vegetation.isScaleDirty = false;
        }
      }
    }

    // 🔥 架构剥离：物理灌入矩阵 (多 Mesh 遍历)
    if (this.meshMap.size > 0 && this.instanceCache.size > 0) {
      this.injectMatricesToMesh();
    }
  }

  /**
   * 🔥 架构剥离：物理灌入矩阵 (多 Mesh)
   * 支持多实体、多 Mesh 独立灌入，解决渲染覆盖 Bug
   */
  private injectMatricesToMesh(): void {
    const dummy = new THREE.Object3D();

    // 遍历所有缓存的实例数据
    for (const [entityId, instances] of this.instanceCache.entries()) {
      const mesh = this.meshMap.get(entityId);
      if (!mesh) continue;

      const entity = this.entityManager.getEntity(entityId);
      if (!entity) continue;

      const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
      if (!vegetation || !vegetation.enabled) continue;

      // 🔥 精准灌入：索引现在是针对当前 Mesh 的局部索引
      for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];

        dummy.position.copy(instance.position);
        dummy.rotation.y = instance.rotation;
        dummy.scale.copy(instance.scale);

        dummy.updateMatrix();
        this._tempMatrix.copy(dummy.matrix);
        mesh.setMatrixAt(i, this._tempMatrix);

        if (mesh.instanceColor) {
          mesh.setColorAt(i, instance.colorOffset);
        }
      }

      // 🔥 关键修复：设置该 Mesh 的实际显示数量
      mesh.count = instances.length;

      // 🔥 性能关键：手动计算包围球，配合 FrustumCulling 极大提升 FPS
      mesh.computeBoundingSphere();

      // 🔥 标记该 Mesh 需要更新
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  onEntityAdded(entity: any): void {
    if (entity?.hasComponent('Vegetation')) {
      console.log(`[VegetationSystem] 🌱 Vegetation entity added: ${entity.name} (ID: ${entity.id})`);
      this.generateVegetation(entity);
      const vegetation = entity.getComponent('Vegetation') as VegetationComponent;
      if (vegetation) vegetation.clearDirty();

      // 🔥 调试：立即检查生成结果
      const instances = this.instanceCache.get(entity.id);
      console.log(`[VegetationSystem] 🌱 After generation, instances count:`, instances ? instances.length : 'NULL');
    }
  }

  onEntityRemoved(entity: any): void {
    // 清理实例缓存
    if (this.instanceCache.has(entity.id)) {
      this.instanceCache.delete(entity.id);
      console.log(`[VegetationSystem] Vegetation instances cleared for: ${entity.name}`);
    }
    // 🔥 清理 Mesh 注册表
    if (this.meshMap.has(entity.id)) {
      this.meshMap.delete(entity.id);
      console.log(`[VegetationSystem] Mesh handle released for: ${entity.id}`);
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

    // 🔥 PERFORMANCE: 预分配数组容量
    instances.length = instanceCount;

    for (let i = 0; i < instanceCount; i++) {
      // 🔥 随机位置（在地形范围内）- 使用更大的分布范围
      const x = (rng() - 0.5) * terrain.config.width;
      const z = (rng() - 0.5) * terrain.config.depth;

      // 🔥 添加更大的随机偏移，确保分布更均匀
      const jitterX = (rng() - 0.5) * 2.0; // 增加到 2.0
      const jitterZ = (rng() - 0.5) * 2.0; // 增加到 2.0

      const finalX = x + jitterX;
      const finalZ = z + jitterZ;

      // 获取地形高度
      const y = this.getTerrainHeightAt(terrain, finalX, finalZ);

      // 随机旋转
      const rotation = rng() * Math.PI * 2;

      // 🔥 数据层净化：严禁参考任何滑块值
      // 所有草的 instance.scale 必须是固定的常数或基于种子的随机偏离
      // 目标：无论滑块在 0.1 还是 1.0，新生成的草存入 ECS 的数据必须是一模一样的"标准体"
      const baseScale = 1.0; // 固定基准缩放
      const randomVariation = 0.8 + rng() * 0.4; // 0.8 到 1.2 的随机偏离

      // 🔥 PERFORMANCE: 复用对象池中的 Vector3 和 Color
      const position = new THREE.Vector3(finalX, y, finalZ);

      // 颜色变化
      this.tempColor.set(config.baseColor);
      const variation = (rng() - 0.5) * config.colorVariation;
      this.tempColor.offsetHSL(0, 0, variation);
      const colorOffset = this.tempColor.clone();

      instances[i] = {
        position,
        rotation,
        scale: new THREE.Vector3(randomVariation, randomVariation, randomVariation),
        colorOffset,
      };
    }

    // 缓存实例数据
    this.instanceCache.set(entity.id, instances);
    vegetation.instanceCount = instanceCount;

    // 🔥 关键：递增版本号，打破引用不变的魔咒
    vegetation.version++;

    // 🔥 调试日志：检查前几个实例的位置
    if (instances.length > 0) {
      console.log(`[VegetationSystem] Sample positions:`, {
        first: instances[0].position.toArray(),
        middle: instances[Math.floor(instanceCount / 2)]?.position.toArray(),
        last: instances[instanceCount - 1].position.toArray(),
      });
    }

    console.log(`[VegetationSystem] Generated ${instanceCount} instances for ${entity.name}, version=${vegetation.version}`);
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
   * @param density 密度（每平方单位的实例数）或总实例数（如果 > 1000）
   * @param terrainEntityId 地形实体 ID
   */
  spawnGrass(density: number, terrainEntityId: string): string {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.error('[VegetationSystem] ❌ EntityManager not initialized, cannot spawn grass');
      return '';
    }

    console.log(`[VegetationSystem] 🌱 spawnGrass called with density=${density}, terrainEntityId=${terrainEntityId}`);

    // 🔥 CRITICAL: 防止实例数过载
    // 如果 density > 1000，视为总实例数而非密度
    let actualDensity = density;
    if (density > 1000) {
      // 获取地形面积
      const terrainEntity = this.entityManager.getEntity(terrainEntityId);
      if (terrainEntity) {
        const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
        if (terrain) {
          const area = terrain.config.width * terrain.config.depth;
          actualDensity = density / area;
          console.log(`[VegetationSystem] Converting total count ${density} to density ${actualDensity.toFixed(4)} (area: ${area})`);
        }
      } else {
        console.error(`[VegetationSystem] ❌ Terrain entity not found: ${terrainEntityId}`);
        return '';
      }
    }

    // 🔥 CRITICAL: 强制上限保护（单次生成不超过 100,000 实例）
    const MAX_INSTANCES = 100000;
    const terrainEntity = this.entityManager.getEntity(terrainEntityId);
    if (terrainEntity) {
      const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
      if (terrain) {
        const area = terrain.config.width * terrain.config.depth;
        const estimatedCount = Math.floor(area * actualDensity);

        if (estimatedCount > MAX_INSTANCES) {
          console.warn(`[VegetationSystem] ⚠️ Instance count ${estimatedCount} exceeds limit ${MAX_INSTANCES}, capping density`);
          actualDensity = MAX_INSTANCES / area;
        }
      }
    }

    const entity = this.entityManager.createEntity(`Grass_${Date.now()}`);
    console.log(`[VegetationSystem] 🌱 Created entity: ${entity.name} (ID: ${entity.id})`);

    // 🔥 种子混淆：使用 ID + 随机数确保绝对不重叠
    const mixedSeed = this.hashString(entity.id) + Math.random() * 1000;

    const vegetation = new VegetationComponent({
      density: actualDensity,
      type: VegetationType.GRASS,
      seed: mixedSeed,
      scale: this.globalScale, // 🔥 同步当前全局缩放
      minHeight: 1.0,
      maxHeight: 2.0,
      minWidth: 0.3,
      maxWidth: 0.6,
      baseColor: '#4a7c3a',
      colorVariation: 0.3,
      windStrength: 0.6,
      windSpeed: 1.2,
      alignToTerrain: true,
      terrainEntityId,
    });

    this.entityManager.addComponent(entity.id, vegetation);
    console.log(`[VegetationSystem] 🌱 Added VegetationComponent to entity`);

    console.log(`[VegetationSystem] Spawned grass with density ${actualDensity.toFixed(4)}`);

    return entity.id;
  }

  /**
   * 生成指定密度的花朵
   * @param density 密度（每平方单位的实例数）或总实例数（如果 > 1000）
   * @param terrainEntityId 地形实体 ID
   */
  spawnFlowers(density: number, terrainEntityId: string): string {
    // 🆕 健壮性检查
    if (!this.entityManager) {
      console.error('[VegetationSystem] EntityManager not initialized, cannot spawn flowers');
      return '';
    }

    // 🔥 CRITICAL: 防止实例数过载
    let actualDensity = density;
    if (density > 1000) {
      const terrainEntity = this.entityManager.getEntity(terrainEntityId);
      if (terrainEntity) {
        const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
        if (terrain) {
          const area = terrain.config.width * terrain.config.depth;
          actualDensity = density / area;
          console.log(`[VegetationSystem] Converting total count ${density} to density ${actualDensity.toFixed(4)} (area: ${area})`);
        }
      }
    }

    // 🔥 CRITICAL: 强制上限保护
    const MAX_INSTANCES = 100000;
    const terrainEntity = this.entityManager.getEntity(terrainEntityId);
    if (terrainEntity) {
      const terrain = terrainEntity.getComponent('Terrain') as TerrainComponent;
      if (terrain) {
        const area = terrain.config.width * terrain.config.depth;
        const estimatedCount = Math.floor(area * actualDensity);

        if (estimatedCount > MAX_INSTANCES) {
          console.warn(`[VegetationSystem] ⚠️ Instance count ${estimatedCount} exceeds limit ${MAX_INSTANCES}, capping density`);
          actualDensity = MAX_INSTANCES / area;
        }
      }
    }

    const entity = this.entityManager.createEntity(`Flowers_${Date.now()}`);

    const vegetation = new VegetationComponent({
      density: actualDensity,
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

    this.entityManager.addComponent(entity.id, vegetation);

    console.log(`[VegetationSystem] Spawned flowers with density ${actualDensity.toFixed(4)}`);

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

  /**
   * 设置全局植被缩放（实现同步缩放）
   */
  setGlobalScale(scale: number): void {
    this.globalScale = scale;
    console.log(`[VegetationSystem] Global scale updated: ${scale}`);
  }

  /**
   * 简单的字符串 Hash 辅助方法
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
