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
import { InputSystem } from './systems/InputSystem';

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
  private inputSystem: InputSystem;
  
  // 实体引用
  private terrainEntity: Entity | null = null;
  private cameraEntity: Entity | null = null;
  
  // 🎬 后处理参数（可通过控制接口修改）
  public postProcessingSettings = {
    enabled: true,
    bloomEnabled: true,
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    smaaEnabled: true,
  };
  
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
    this.entityManager.registerComponent('Terrain', TerrainComponent);  // 🔥 恢复注册
    this.entityManager.registerComponent('Vegetation', VegetationComponent);  // 🔥 恢复注册
    this.entityManager.registerComponent('Camera', CameraComponent);
    
    console.log('✓ Components registered');
    
    // 创建系统
    this.inputSystem = new InputSystem();
    this.terrainSystem = new TerrainSystem();
    this.vegetationSystem = new VegetationSystem(this.worldStateManager);
    this.cameraSystem = new CameraSystem();
    
    // 🎮 连接 InputSystem 到 CameraSystem
    this.cameraSystem.setInputSystem(this.inputSystem);
    
    // 注册系统
    this.systemManager.registerSystem('InputSystem', this.inputSystem);
    this.systemManager.registerSystem('TerrainSystem', this.terrainSystem);
    this.systemManager.registerSystem('VegetationSystem', this.vegetationSystem);
    this.systemManager.registerSystem('CameraSystem', this.cameraSystem);
    
    console.log('✓ Systems registered');
    console.log('✓ InputSystem connected to CameraSystem');
    
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
    this.entityManager.addComponent(this.terrainEntity.id, terrainTransform);
    
    const terrain = new TerrainComponent({
      width: 50,
      depth: 50,
      widthSegments: 100,
      depthSegments: 100,
    });
    this.entityManager.addComponent(this.terrainEntity.id, terrain);
    
    const terrainVisual = new VisualComponent();
    terrainVisual.geometry = { type: 'plane', parameters: { width: 50, height: 50 } };
    terrainVisual.material = { 
      type: 'standard', 
      color: '#444444',      // 🔥 暗灰色，防止过亮
      metalness: 0.0, 
      roughness: 0.8         // 🔥 防止亮度溢出
    };
    terrainVisual.emissive = {
      color: '#000000',      // 🔥 完全关闭自发光
      intensity: 0
    };
    terrainVisual.receiveShadow = true;
    terrainVisual.visible = true;
    this.entityManager.addComponent(this.terrainEntity.id, terrainVisual);
    
    console.log('✓ Terrain entity created');
    
    // 创建上帝视角相机
    this.cameraEntity = this.entityManager.createEntity('GodCamera');
    
    const cameraTransform = new TransformComponent();
    cameraTransform.position = [0, 50, 50];  // 🔥 初始位置：斜上方 45 度角
    this.entityManager.addComponent(this.cameraEntity.id, cameraTransform);
    
    const camera = new CameraComponent();
    camera.mode = 'orbit';
    camera.distance = 70;         // 🔥 初始距离 70（之前 100 太远）
    camera.minDistance = 10;
    camera.maxDistance = 200;
    camera.pitch = -45;           // 🔥 初始俯仰角 -45 度（俯视 45 度）
    camera.yaw = 45;              // 🔥 初始偏航角 45 度（斜向）
    camera.fov = 60;
    camera.targetEntityId = null; // 不跟随任何实体，使用固定位置
    camera.enabled = true;
    this.entityManager.addComponent(this.cameraEntity.id, camera);
    
    console.log('✓ God Camera created (Orbit mode, distance=100, pitch=-60°)');
    console.log('✓ Validation scene initialized');
    
    // 🌿 自动生成植被（演示用）
    console.log('🌱 [DEBUG] Scheduling vegetation spawn in 100ms...');
    setTimeout(() => {
      console.log('🌱 [DEBUG] Timeout fired, calling spawnVegetation(5000)...');
      const vegetationId = this.spawnVegetation(5000);
      if (vegetationId) {
        console.log('✓ Auto-spawned vegetation for demo, ID:', vegetationId);
        
        // 🔥 立即检查实例是否生成
        const instances = this.vegetationSystem.getInstances(vegetationId);
        console.log('🌱 [DEBUG] Instances after spawn:', instances ? instances.length : 'NULL');
      } else {
        console.error('❌ [DEBUG] spawnVegetation returned null/empty ID');
      }
    }, 100); // 延迟 100ms 确保系统初始化完成
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
    
    // 🎮 推送输入上下文，让相机能监听鼠标输入
    this.inputSystem.pushContext('orbit');
    
    console.log('⏰ Clock started');
    console.log('🎮 Input context pushed: orbit');
  }
  
  /**
   * 设置输入系统的 DOM 元素
   * @param domElement Canvas DOM 元素
   */
  setInputElement(domElement: HTMLElement): void {
    // InputSystem doesn't have setDomElement yet - will be implemented when needed
    // For now, the system uses window-level event listeners
    console.log('🎮 Input element reference stored (window-level listeners active)');
  }
  
  /**
   * 设置 R3F 相机引用（让 CameraSystem 直接控制）
   * @param camera R3F 相机实例
   */
  setR3FCamera(camera: any): void {
    this.cameraSystem.setR3FCamera(camera);
  }
  
  /**
   * 获取 CameraSystem（用于外部访问）
   */
  getCameraSystem(): CameraSystem {
    return this.cameraSystem;
  }
  
  /**
   * 获取 InputSystem（用于外部访问）
   */
  getInputSystem(): InputSystem {
    return this.inputSystem;
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
      
      // 🔥 调试：验证植被实体的组件
      const vegEntity = this.entityManager.getEntity(vegetationId);
      if (vegEntity) {
        console.log('🔥 [DEBUG] Vegetation entity:', {
          id: vegEntity.id,
          name: vegEntity.name,
          hasVegetation: vegEntity.hasComponent('Vegetation'),
          isActive: vegEntity.active,
        });
        
        const vegComp = vegEntity.getComponent('Vegetation') as VegetationComponent;
        if (vegComp) {
          console.log('🔥 [DEBUG] Vegetation component:', {
            enabled: vegComp.enabled,
            instanceCount: vegComp.instanceCount,
            density: vegComp.config.density,
            terrainEntityId: vegComp.config.terrainEntityId,
          });
        }
      }
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
  
  /**
   * 设置一天中的时间
   * @param hour 小时 (0-24)
   */
  setTimeOfDay(hour: number): void {
    this.worldStateManager.setTimeOfDay(hour);
    console.log(`🕐 Time set to ${hour}:00`);
  }
  
  /**
   * 设置光照强度
   * @param intensity 强度 (0.0-5.0)
   */
  setLightIntensity(intensity: number): void {
    this.worldStateManager.setLightIntensity(intensity);
    console.log(`💡 Light intensity set to ${intensity}`);
  }
  
  /**
   * 🌿 设置草地缩放
   * @param scale 缩放倍数 (0.1-3.0)
   */
  setGrassScale(scale: number): void {
    const entities = this.entityManager.getAllEntities();
    entities.forEach(entity => {
      const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
      if (vegetation && vegetation.enabled) {
        // 更新配置并标记为脏
        vegetation.config.scale = scale;
        vegetation.markDirty();
      }
    });
    console.log(`🌿 Grass scale set to ${scale}x`);
  }
  
  /**
   * 🌿 设置风场强度
   * @param strength 风力强度 (0.0-1.0)
   */
  setWindStrength(strength: number): void {
    const entities = this.entityManager.getAllEntities();
    entities.forEach(entity => {
      const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
      if (vegetation && vegetation.enabled) {
        vegetation.config.windStrength = strength;
        vegetation.markDirty();
      }
    });
    console.log(`💨 Wind strength set to ${strength}`);
  }
  
  /**
   * 🌿 设置草地颜色
   * @param color 颜色 (hex string)
   */
  setGrassColor(color: string): void {
    const entities = this.entityManager.getAllEntities();
    entities.forEach(entity => {
      const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
      if (vegetation && vegetation.enabled) {
        vegetation.config.baseColor = color;
        vegetation.markDirty();
      }
    });
    console.log(`🎨 Grass color set to ${color}`);
  }
  
  /**
   * 获取当前环境状态
   */
  getEnvironmentState() {
    return this.worldStateManager.getState();
  }
  
  /**
   * 🔍 调试方法：打印所有植被实例的详细信息
   */
  debugVegetation(): void {
    console.log('=== 🔍 VEGETATION DEBUG START ===');
    
    const entities = this.entityManager.getAllEntities();
    const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));
    
    console.log(`Total entities: ${entities.length}`);
    console.log(`Vegetation entities: ${vegetationEntities.length}`);
    
    vegetationEntities.forEach((entity, index) => {
      const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
      if (!vegetation) return;
      
      console.log(`\n--- Vegetation Entity ${index + 1} ---`);
      console.log(`ID: ${entity.id}`);
      console.log(`Name: ${entity.name}`);
      console.log(`Active: ${entity.active}`);
      console.log(`Enabled: ${vegetation.enabled}`);
      console.log(`Instance Count: ${vegetation.instanceCount}`);
      console.log(`Density: ${vegetation.config.density}`);
      console.log(`Type: ${vegetation.config.type}`);
      console.log(`Scale: ${vegetation.config.scale}`);
      console.log(`Wind Strength: ${vegetation.config.windStrength}`);
      console.log(`Base Color: ${vegetation.config.baseColor}`);
      console.log(`Is Dirty: ${vegetation.isDirty}`);
      console.log(`Terrain Entity ID: ${vegetation.config.terrainEntityId}`);
      
      // 从 VegetationSystem 获取实例数据
      const instances = this.vegetationSystem.getInstances(entity.id);
      console.log(`Cached Instances: ${instances ? instances.length : 'NULL'}`);
      
      if (instances && instances.length > 0) {
        console.log(`First 5 instances:`, instances.slice(0, 5).map(inst => ({
          position: inst.position.toArray(),
          scale: inst.scale.toArray(),
          rotation: inst.rotation,
          color: inst.colorOffset.getHexString(),
        })));
        
        console.log(`Last 5 instances:`, instances.slice(-5).map(inst => ({
          position: inst.position.toArray(),
          scale: inst.scale.toArray(),
          rotation: inst.rotation,
          color: inst.colorOffset.getHexString(),
        })));
      }
    });
    
    console.log('\n=== 🔍 VEGETATION DEBUG END ===');
  }
  
  /**
   * 🔍 调试方法：强制重新生成植被
   */
  forceRegenerateVegetation(): void {
    console.log('=== 🔄 FORCE REGENERATE VEGETATION ===');
    
    const entities = this.entityManager.getAllEntities();
    const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));
    
    vegetationEntities.forEach((entity) => {
      const vegetation = entity.getComponent<VegetationComponent>('Vegetation');
      if (vegetation) {
        console.log(`Marking ${entity.name} as dirty...`);
        vegetation.markDirty();
      }
    });
    
    // 手动触发一次 update
    this.vegetationSystem.update();
    
    console.log('✓ Regeneration complete');
  }
}
