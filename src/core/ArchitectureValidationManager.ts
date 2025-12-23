/**
 * PolyForge v1.3.0 - ArchitectureValidationManager
 * 架构验证观测窗口 - 核心管理器
 * 
 * 功能：
 * - 管理独立的 ECS 实例（与 Demo 系统解耦）
 * - 自动创建地形和相机实体
 * - 提供控制接口（地形编辑、植被生成）
 * - 提供统计接口（实体数、FPS、顶点数）
 * - 环境状态管理（日落光影）
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { WorldStateManager } from './WorldStateManager';
import { Clock } from './Clock';
import { Entity } from './Entity';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { TerrainComponent } from './components/TerrainComponent';
import { VegetationComponent } from './components/VegetationComponent';
import { CameraComponent } from './components/CameraComponent';
import { TerrainSystem } from './systems/TerrainSystem';
import { VegetationSystem } from './systems/VegetationSystem';
import { CameraSystem } from './systems/CameraSystem';

/**
 * ArchitectureValidationManager
 * 
 * 职责：
 * - 管理 ECS 核心系统
 * - 自动创建验证场景（地形 + 相机）
 * - 提供控制接口和统计接口
 */
export class ArchitectureValidationManager {
  // 核心系统
  private entityManager: EntityManager;
  private systemManager: SystemManager;
  private worldStateManager: WorldStateManager;
  private clock: Clock;
  
  // 系统实例
  private terrainSystem: TerrainSystem;
  private vegetationSystem: VegetationSystem;
  private cameraSystem: CameraSystem;
  
  // 实体引用
  private terrainEntity: Entity | null = null;
  private cameraEntity: Entity | null = null;
  
  constructor() {
    console.log('🏗️ [ArchitectureValidationManager] Initializing...');
    
    // 初始化 ECS 核心
    this.entityManager = new EntityManager();
    this.clock = new Clock();
    this.systemManager = new SystemManager(this.entityManager, this.clock);
    this.worldStateManager = new WorldStateManager();
    
    // 注册组件
    this.entityManager.registerComponent('Transform', TransformComponent);
    this.entityManager.registerComponent('Visual', VisualComponent);
    this.entityManager.registerComponent('Terrain', TerrainComponent);
    this.entityManager.registerComponent('Vegetation', VegetationComponent);
    this.entityManager.registerComponent('Camera', CameraComponent);
    
    console.log('✓ Components registered');
    
    // 创建系统
    this.terrainSystem = new TerrainSystem();
    this.vegetationSystem = new VegetationSystem(this.worldStateManager);
    this.cameraSystem = new CameraSystem();
    
    // 注册系统
    this.systemManager.registerSystem('TerrainSystem', this.terrainSystem);
    this.systemManager.registerSystem('VegetationSystem', this.vegetationSystem);
    this.systemManager.registerSystem('CameraSystem', this.cameraSystem);
    
    console.log('✓ Systems registered');
    
    // 自动创建场景
    this.initializeScene();
    
    console.log('✓ ArchitectureValidationManager initialized');
  }
  
  /**
   * 初始化场景（自动创建地形和相机）
   */
  private initializeScene(): void {
    console.log('🌍 [ArchitectureValidationManager] Initializing scene...');
    
    // 创建地形实体
    this.terrainEntity = this.entityManager.createEntity('ValidationTerrain');
    
    const terrainTransform = new TransformComponent();
    terrainTransform.position = [0, 0, 0];
    this.terrainEntity.addComponent(terrainTransform);
    
    const terrain = new TerrainComponent({
      width: 50,
      depth: 50,
      widthSegments: 100,
      depthSegments: 100,
    });
    this.terrainEntity.addComponent(terrain);
    
    const terrainVisual = new VisualComponent();
    terrainVisual.geometry = { type: 'plane', parameters: { width: 50, height: 50 } };
    terrainVisual.material = { 
      type: 'standard', 
      color: '#7cba3d', 
      metalness: 0.0, 
      roughness: 0.9 
    };
    terrainVisual.receiveShadow = true;
    terrainVisual.visible = true; // 确保可见
    this.terrainEntity.addComponent(terrainVisual);
    
    console.log('✓ Terrain entity created');
    
    // 创建上帝视角相机
    this.cameraEntity = this.entityManager.createEntity('GodCamera');
    
    const cameraTransform = new TransformComponent();
    cameraTransform.position = [0, 100, 0];
    this.cameraEntity.addComponent(cameraTransform);
    
    const camera = new CameraComponent();
    camera.mode = 'orbit';
    camera.distance = 100;
    camera.pitch = -60;
    camera.yaw = 0;
    camera.fov = 60;
    camera.targetEntityId = this.terrainEntity.id;
    camera.enabled = true;
    this.cameraEntity.addComponent(camera);
    
    console.log('✓ God Camera created (Orbit mode, distance=100, pitch=-60°)');
    console.log('✓ Validation scene initialized');
  }
  
  /**
   * 更新循环（每帧调用）
   */
  update(): void {
    this.systemManager.update();
  }
  
  /**
   * 启动时钟
   */
  start(): void {
    this.clock.start();
    console.log('⏰ Clock started');
  }
  
  /**
   * 生成植被
   * @param density 植被密度（实例数量）
   * @returns 植被实体 ID，如果失败返回 null
   */
  spawnVegetation(density: number): string | null {
    if (!this.terrainEntity) {
      console.error('❌ Cannot spawn vegetation: Terrain entity not found');
      return null;
    }
    
    console.log(`🌱 Spawning vegetation (density: ${density})...`);
    const vegetationId = this.vegetationSystem.spawnGrass(density, this.terrainEntity.id);
    
    if (vegetationId) {
      console.log(`✓ Vegetation spawned (ID: ${vegetationId})`);
    } else {
      console.error('❌ Failed to spawn vegetation');
    }
    
    return vegetationId;
  }
  
  /**
   * 创建山峰
   */
  createMountain(): void {
    if (!this.terrainEntity) {
      console.error('❌ Cannot create mountain: Terrain entity not found');
      return;
    }
    
    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) {
      console.error('❌ Cannot create mountain: Terrain component not found');
      return;
    }
    
    console.log('⛰️ Creating mountain...');
    
    const centerX = terrain.config.widthSegments / 2;
    const centerZ = terrain.config.depthSegments / 2;
    
    for (let z = 0; z <= terrain.config.depthSegments; z++) {
      for (let x = 0; x <= terrain.config.widthSegments; x++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const maxDistance = Math.min(terrain.config.widthSegments, terrain.config.depthSegments) / 3;
        
        if (distance < maxDistance) {
          const height = (1 - distance / maxDistance) * 8;
          terrain.setHeight(x, z, height);
        }
      }
    }
    
    console.log('✓ Mountain created');
  }
  
  /**
   * 创建山谷
   */
  createValley(): void {
    if (!this.terrainEntity) {
      console.error('❌ Cannot create valley: Terrain entity not found');
      return;
    }
    
    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) {
      console.error('❌ Cannot create valley: Terrain component not found');
      return;
    }
    
    console.log('🏞️ Creating valley...');
    
    const centerX = terrain.config.widthSegments / 2;
    const centerZ = terrain.config.depthSegments / 2;
    
    for (let z = 0; z <= terrain.config.depthSegments; z++) {
      for (let x = 0; x <= terrain.config.widthSegments; x++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const maxDistance = Math.min(terrain.config.widthSegments, terrain.config.depthSegments) / 3;
        
        if (distance < maxDistance) {
          const height = -(1 - distance / maxDistance) * 5;
          terrain.setHeight(x, z, height);
        }
      }
    }
    
    console.log('✓ Valley created');
  }
  
  /**
   * 获取统计信息
   */
  getStats(): {
    entityCount: number;
    systemCount: number;
    vegetationCount: number;
    terrainVertices: number;
  } {
    const entities = this.entityManager.getAllEntities();
    const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));
    
    let totalVegetation = 0;
    vegetationEntities.forEach(e => {
      const veg = e.getComponent<VegetationComponent>('Vegetation');
      if (veg) totalVegetation += veg.instanceCount;
    });
    
    const terrain = this.terrainEntity?.getComponent<TerrainComponent>('Terrain');
    const terrainVertices = terrain ? terrain.heightData.length : 0;
    
    return {
      entityCount: entities.length,
      systemCount: 3, // TerrainSystem, VegetationSystem, CameraSystem
      vegetationCount: totalVegetation,
      terrainVertices,
    };
  }
  
  /**
   * 获取 EntityManager（用于 EngineBridge）
   */
  getEntityManager(): EntityManager {
    return this.entityManager;
  }
  
  /**
   * 获取 WorldStateManager（用于 EngineBridge）
   */
  getWorldStateManager(): WorldStateManager {
    return this.worldStateManager;
  }
  
  /**
   * 获取 TerrainSystem（用于 EngineBridge）
   */
  getTerrainSystem(): TerrainSystem {
    return this.terrainSystem;
  }
  
  /**
   * 获取 VegetationSystem（用于 EngineBridge）
   */
  getVegetationSystem(): VegetationSystem {
    return this.vegetationSystem;
  }
  
  /**
   * 设置环境时间（日落前1小时）
   */
  setSunsetTime(): void {
    this.worldStateManager.setTimeOfDay(17); // 17:00 = 日落前1小时
    console.log('🌅 Time set to sunset (17:00)');
  }
}
