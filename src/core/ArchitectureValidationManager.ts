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
import { CameraComponent, CameraMode } from './components/CameraComponent';
import { PhysicsComponent } from './components/PhysicsComponent'; // Added
import { TerrainSystem } from './systems/TerrainSystem';
import { VegetationSystem } from './systems/VegetationSystem';
import { CameraSystem } from './systems/CameraSystem';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { AudioSystem } from './systems/AudioSystem'; // Added
import { AssetRegistry, getAssetRegistry } from './assets/AssetRegistry'; // Added
import { SerializationService } from './SerializationService';
import { CommandManager } from './CommandManager';
import { ArchitectureStorageManager } from './ArchitectureStorageManager';
import { BundleSystem } from './bundling/BundleSystem';

/**
 * 验证上下文模式
 */
export enum ValidationContext {
  CREATION = 'CREATION',     // 创造模式（编辑器）
  EXPERIENCE = 'EXPERIENCE'  // 体验模式（第一/第三人称）
}

/**
 * 玩法原型类型
 */
export type GameplayArchetype = 'FPS' | 'TPS' | 'ActionRPG' | 'Platformer';

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
  private physicsSystem: PhysicsSystem;
  private audioSystem: AudioSystem;
  private assetRegistry: AssetRegistry;
  private serializationService: SerializationService;
  private commandManager: CommandManager;
  private storageManager: ArchitectureStorageManager;
  private bundleSystem: BundleSystem; // Added

  // 存档控制
  private autoSaveInterval: number = 5000; // 5秒心跳
  private lastSaveTime: number = 0;

  // 实体引用
  private terrainEntity: Entity | null = null;
  private cameraEntity: Entity | null = null;
  private avatarEntity: Entity | null = null; // 🔥 替身实体引用

  // 🎬 后处理参数（可通过控制接口修改）
  public postProcessingSettings = {
    enabled: true,
    bloomEnabled: true,
    bloomStrength: 0.5, // 🔥 降低初始强度，防止“白茫茫”雪盲效应
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    smaaEnabled: true,
  };

  // 🎭 当前验证上下文
  private currentContext: ValidationContext = ValidationContext.CREATION;

  constructor() {
    console.log('🏗️ [ArchitectureValidationManager] Initializing...');

    // 初始化 ECS 核心
    this.entityManager = new EntityManager();
    this.clock = new Clock();
    this.systemManager = new SystemManager(this.entityManager, this.clock);
    // 🔥 核心连接：让 EntityManager 能通知 SystemManager 实体变更
    this.entityManager.setSystemManager(this.systemManager);

    this.worldStateManager = new WorldStateManager();
    this.serializationService = new SerializationService(this.entityManager);
    this.commandManager = new CommandManager(this.entityManager, this.serializationService);
    this.storageManager = new ArchitectureStorageManager(this.entityManager, this.worldStateManager);

    // 初始化 BundleSystem
    this.assetRegistry = getAssetRegistry(); // Needed early for BundleSystem
    this.bundleSystem = new BundleSystem(this.entityManager, this.assetRegistry, this.serializationService);


    // 注册组件
    this.entityManager.registerComponent('Transform', TransformComponent);
    this.entityManager.registerComponent('Visual', VisualComponent);
    this.entityManager.registerComponent('Terrain', TerrainComponent);  // 🔥 恢复注册
    this.entityManager.registerComponent('Vegetation', VegetationComponent);  // 🔥 恢复注册
    this.entityManager.registerComponent('Camera', CameraComponent);
    this.entityManager.registerComponent('Physics', PhysicsComponent);

    console.log('✓ Components registered');

    // 创建系统
    this.inputSystem = new InputSystem();
    this.terrainSystem = new TerrainSystem();
    this.vegetationSystem = new VegetationSystem(this.worldStateManager);
    this.cameraSystem = new CameraSystem();
    this.physicsSystem = new PhysicsSystem();
    this.physicsSystem.setEntityManager(this.entityManager);
    this.audioSystem = new AudioSystem(); // Added
    this.assetRegistry = getAssetRegistry(); // Added

    // 🎮 连接 InputSystem 到 CameraSystem
    this.cameraSystem.setInputSystem(this.inputSystem);
    this.cameraSystem.setEntityManager(this.entityManager);
    this.cameraSystem.setPhysicsSystem(this.physicsSystem);

    // 注册系统
    this.systemManager.registerSystem('InputSystem', this.inputSystem);
    this.systemManager.registerSystem('TerrainSystem', this.terrainSystem);
    this.systemManager.registerSystem('VegetationSystem', this.vegetationSystem);
    this.systemManager.registerSystem('CameraSystem', this.cameraSystem);
    this.systemManager.registerSystem('PhysicsSystem', this.physicsSystem);
    this.systemManager.registerSystem('AudioSystem', this.audioSystem); // Added

    console.log('✓ Systems registered');
    console.log('✓ InputSystem connected to CameraSystem');

    // ⌨️ 连接指令系统到输入系统 (激活 Ctrl+Z/Y)
    this.inputSystem.setCommandManager(this.commandManager);
    console.log('✓ CommandManager linked to InputSystem');

    // ⚡ 始终异步初始化物理引擎
    this.physicsSystem.initialize().then(() => {
      console.log('⚡ Physics engine warmed up');
    });

    // 📦 初始化资产注册表（恢复持久化资产）
    this.assetRegistry.initialize().then(() => {
      console.log('📦 AssetRegistry initialized from IndexedDB');
    }).catch(err => {
      console.error('❌ AssetRegistry initialization failed:', err);
    });

    // 📂 尝试加载存档
    const savedState = this.storageManager.load();
    if (savedState) {
      this.restoreFromSnapshot(savedState);
      console.log('✓ Architecture state restored from LocalStorage');
    } else {
      // 自动创建场景
      this.initializeScene();
      console.log('✓ Default validation scene initialized');
    }

    console.log('✓ ArchitectureValidationManager initialized');
  }

  /**
   * 初始化场景（自动创建地形和相机）
   */
  private initializeScene(): void {
    console.log('🌍 [ArchitectureValidationManager] Initializing scene...');

    // 创建地形实体 (使用固定 ID 保持持久化稳定)
    this.terrainEntity = this.entityManager.createEntity('ValidationTerrain', 'ValidationTerrain');

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

    // 🔥 为地形添加物理碰撞体 (Static)
    const terrainPhysics = new PhysicsComponent('static');
    terrainPhysics.setCollider('box', [50, 2, 50], [0, -1, 0]); // 2米厚的地面挡板
    this.entityManager.addComponent(this.terrainEntity.id, terrainPhysics);

    console.log('✓ Terrain entity created with Physics Collider');

    // 创建上帝视角相机 (使用固定 ID 保持持久化稳定)
    this.cameraEntity = this.entityManager.createEntity('GodCamera', 'GodCamera');

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

    // 💓 存储心跳
    const now = Date.now();
    if (now - this.lastSaveTime > this.autoSaveInterval) {
      this.saveScene();
      this.lastSaveTime = now;
    }
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
   * 获取 CommandManager（用于 UI 撤销重做）
   */
  getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * 获取存储管理器
   */
  getStorageManager(): ArchitectureStorageManager {
    return this.storageManager;
  }

  /**
   * 获取音频系统
   */
  getAudioSystem(): AudioSystem {
    return this.audioSystem;
  }

  /**
   * 获取资产注册表
   */
  getAssetRegistry(): AssetRegistry {
    return this.assetRegistry;
  }

  /**
   * 获取指令执行历史
   */
  getCommandHistory() {
    return this.commandManager.getHistory();
  }

  /**
   * 显式保存场景
   */
  saveScene(): void {
    this.storageManager.save();
  }

  /**
   * 恢复场景到快照
   */
  restoreFromSnapshot(snapshot: any): void {
    try {
      // 1. 恢复环境
      this.worldStateManager.deserialize(snapshot.worldState);

      // 🔥 同步恢复的物理参数
      if (snapshot.worldState.gravityY !== undefined) {
        this.physicsSystem.setGravity(0, snapshot.worldState.gravityY, 0);
      }

      // 2. 恢复实体 (清空并重新反序列化)
      this.entityManager.clear();
      this.entityManager.deserializeAll(snapshot.entities);

      // 🔥 强制触发物理系统的全量发现 (解决瞬移同步问题)
      const physicsEntities = this.entityManager.getEntitiesWithComponents(['Physics', 'Transform']);
      physicsEntities.forEach(e => this.physicsSystem.onEntityAdded(e));

      // 3. 重新获取核心实体引用 (使用固定 ID + 智能回退)
      this.terrainEntity = this.entityManager.getEntity('ValidationTerrain');
      if (!this.terrainEntity) {
        // 回退：通过组件查找
        const terrains = this.entityManager.getEntitiesWithComponents(['Terrain']);
        if (terrains.length > 0) this.terrainEntity = terrains[0];
      }

      this.cameraEntity = this.entityManager.getEntity('GodCamera');
      if (!this.cameraEntity) {
        // 回退：通过组件查找
        const cameras = this.entityManager.getEntitiesWithComponents(['Camera']);
        if (cameras.length > 0) this.cameraEntity = cameras[0];
      }

      console.log('✓ Scene restored successfully', {
        hasTerrain: !!this.terrainEntity,
        hasCamera: !!this.cameraEntity
      });
    } catch (error) {
      console.error('❌ Failed to restore scene from snapshot:', error);
    }
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
   * 📦 导出当前场景为 Bundle 包
   */
  async exportBundle(name: string = 'MyLevel'): Promise<void> {
    try {
      console.log('📦 Starting bundle export:', name);

      // 1. 创建 Bundle
      const bundle = await this.bundleSystem.createBundle({
        name,
        author: 'User',
        description: 'Exported from PolyForge Orbital Command',
      });

      // 🔥 1.5. 注入 WorldState (SerializationService 不包含此数据)
      bundle.manifest.sceneData.worldState = this.worldStateManager.getState();

      // 2. 打包为 JSON (Base64)
      const jsonContent = await this.bundleSystem.packToJSON(bundle);

      // 3. 触发下载
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_${Date.now()}.pfb`; // PolyForge Bundle
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Bundle exported successfully');
    } catch (error) {
      console.error('❌ Bundle export failed:', error);
      throw error;
    }
  }

  /**
   * 📦 导入 Bundle 包 (逆向解包)
   * @param file 用户上传的 .pfb 文件
   */
  async importBundle(file: File): Promise<void> {
    try {
      console.log('📦 Starting bundle import:', file.name);

      // 1. 读取文件
      const jsonString = await file.text();

      // 2. 调用 BundleSystem 解析并还原资产
      const manifest = await this.bundleSystem.loadBundle(jsonString);

      // 3. 恢复场景数据
      console.log('📦 Restoring scene from manifest...');
      this.restoreFromSnapshot({
        worldState: manifest.sceneData.worldState,
        entities: manifest.sceneData.entities
      });

      // 🔥 4. 立即持久化保存 (防止 reload 后回退到旧存档)
      this.storageManager.save();

      console.log(`✅ Bundle "${manifest.description}" imported successfully!`);
    } catch (error) {
      console.error('❌ Bundle import failed:', error);
      throw error;
    }
  }

  /**
   * 清除所有植被
   */
  clearVegetation(): void {
    const entities = this.entityManager.getAllEntities();
    const vegetationEntities = entities.filter(e => e.hasComponent('Vegetation'));

    if (vegetationEntities.length === 0) {
      console.log('🧹 No vegetation to clear');
      return;
    }

    console.log(`🧹 Clearing ${vegetationEntities.length} vegetation entities...`);
    vegetationEntities.forEach(e => {
      this.entityManager.destroyEntity(e.id);
    });
    console.log('✓ All vegetation cleared');
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
   * 平整地形
   */
  flattenTerrain(): void {
    if (!this.terrainEntity) {
      console.error('❌ Cannot flatten terrain: Terrain entity not found');
      return;
    }

    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) {
      console.error('❌ Cannot flatten terrain: Terrain component not found');
      return;
    }

    console.log('🧹 Flattening terrain...');
    terrain.heightData.fill(0);
    terrain.isDirty = true;
    console.log('✓ Terrain flattened');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    entityCount: number;
    systemCount: number;
    vegetationCount: number;
    terrainVertices: number;
    physicsInitialized: boolean;
    physicsBodies: number;
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
      systemCount: 5, // Input, Terrain, Vegetation, Camera, Physics
      vegetationCount: totalVegetation,
      terrainVertices,
      physicsInitialized: this.physicsSystem.getStats().initialized,
      physicsBodies: this.physicsSystem.getStats().totalBodies,
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
   * 设置环境时间（黄昏，光影最具质感的时候）
   */
  setSunsetTime(): void {
    this.worldStateManager.setTimeOfDay(16.5); // 16:30 = 金色时刻
    console.log('🌅 Time set to Golden Hour (16:30)');
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
   * 设置泛光强度
   * @param strength 强度 (0.0-5.0)
   */
  setBloomStrength(strength: number): void {
    this.worldStateManager.setBloomStrength(strength);
    console.log(`✨ Bloom strength set to ${strength}`);
  }

  /**
   * 设置泛光阈值
   * @param threshold 阈值 (0.0-1.0)
   */
  setBloomThreshold(threshold: number): void {
    this.worldStateManager.setBloomThreshold(threshold);
    console.log(`✨ Bloom threshold set to ${threshold}`);
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
        // 🔥 数据-渲染分离：仅更新配置和缩放脏标记
        // 不触发 isDirty，避免重新生成实例
        vegetation.config.scale = scale;
        vegetation.isScaleDirty = true;
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
   * ⚡ 物理：切换仿真开关
   */
  setPhysicsEnabled(enabled: boolean): void {
    this.physicsSystem.enabled = enabled;
    console.log(`⚡ Physics simulation: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * ⚡ 物理：设置重力
   */
  setGravity(y: number): void {
    this.physicsSystem.setGravity(0, y, 0);
  }

  /**
   * ⚡ 物理：生成实验方块
   */
  spawnPhysicsBox(): string {
    const id = `physics_box_${Date.now()}`;
    const entity = this.entityManager.createEntity(id);

    const transform = new TransformComponent();
    // 随机位置在天空
    transform.position = [
      (Math.random() - 0.5) * 20,
      30 + Math.random() * 10,
      (Math.random() - 0.5) * 20
    ];
    // 随机旋转 (使用度数 0-360)
    transform.rotation = [Math.random() * 360, Math.random() * 360, Math.random() * 360];

    const visual = new VisualComponent();
    visual.geometry = { type: 'box', parameters: { width: 2, height: 2, depth: 2 } };
    visual.material = { type: 'standard', color: '#3b82f6' };
    visual.castShadow = true;

    const physics = new PhysicsComponent('dynamic', {
      shape: 'box',
      size: [2, 2, 2],
      offset: [0, 0, 0]
    });
    physics.restitution = 0.6;

    // 包装成指令进行执行，以支持撤销
    this.commandManager.execute({
      id: `spawn_physics_${Date.now()}`,
      name: 'Spawn Physics Box',
      timestamp: Date.now(),
      execute: () => {
        // 🔥 关键修复：支持 Redo
        // 如果实体已被销毁（在撤销之后），则重新创建它
        if (!this.entityManager.getEntity(entity.id)) {
          this.entityManager.createEntity(entity.name, entity.id);
        }

        this.entityManager.addComponent(entity.id, transform);
        this.entityManager.addComponent(entity.id, visual);
        this.entityManager.addComponent(entity.id, physics);
      },
      undo: () => {
        this.entityManager.destroyEntity(entity.id);
      }
    });

    console.log('📦 Spawned physics experiment box (Undoable)');
    return entity.id;
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


  /**
   * 设置相机视野
   */
  public setCameraFOV(fov: number): void {
    if (this.cameraSystem) {
      this.cameraSystem.setFOV(fov);
    }
  }

  /**
   * 设置抗锯齿开关
   */
  public setSMAAEnabled(enabled: boolean): void {
    this.worldStateManager.setSMAAEnabled(enabled);
  }

  /**
   * 设置色调映射曝光度
   */
  public setToneMappingExposure(exposure: number): void {
    this.worldStateManager.setToneMappingExposure(exposure);
  }

  /**
   * 设置物理调试绘制
   */
  public setPhysicsDebugEnabled(enabled: boolean): void {
    this.worldStateManager.setPhysicsDebugEnabled(enabled);
  }

  /**
   * 获取物理调试数据
   */
  public getPhysicsDebugBuffers(): { vertices: Float32Array; colors: Float32Array } | null {
    if (this.physicsSystem) {
      return this.physicsSystem.getDebugBuffers();
    }
    return null;
  }

  /**
   * 施加物理爆炸
   */
  public applyPhysicsExplosion(center: [number, number, number], force: number, radius: number): void {
    if (this.physicsSystem) {
      this.physicsSystem.applyExplosion(center, force, radius);
    }
  }

  /**
   * 获取音频调试信息
   */
  public getAudioDebugInfo(): any[] {
    if (this.audioSystem) {
      return this.audioSystem.getDebugInfo();
    }
    return [];
  }

  /**
   * 设置音频调试绘制
   */
  public setAudioDebugEnabled(enabled: boolean): void {
    this.worldStateManager.setAudioDebugEnabled(enabled);
  }

  /**
   * 生成花朵
   */
  public spawnFlowers(density: number): void {
    if (!this.vegetationSystem || !this.entityManager) return;

    // 查找地形实体
    const terrainEntity = this.entityManager.getAllEntities().find(e => e.hasComponent('Terrain'));
    if (terrainEntity) {
      this.vegetationSystem.spawnFlowers(density, terrainEntity.id);
    } else {
      console.warn('Cannot spawn flowers: No terrain found');
    }
  }


  /**
   * 切换相机模式
   */
  public setCameraMode(mode: CameraMode): void {
    if (!this.cameraEntity) return;
    const camera = this.cameraEntity.getComponent<CameraComponent>('Camera');
    if (!camera) return;

    console.log(`🎥 [ArchitectureValidationManager] Switching mode to: ${mode}`);

    // 🔥 模式重连协议：根据模式自动切换 Context
    // 制作人要求：创造块仅 orbit，体验块包含 firstPerson/thirdPerson/isometric/sidescroll
    const isCreation = mode === 'orbit';
    const newContext = isCreation ? ValidationContext.CREATION : ValidationContext.EXPERIENCE;

    if (this.currentContext !== newContext) {
      console.log(`🔄 [Context] Transition: ${this.currentContext} -> ${newContext}`);
      this.currentContext = newContext;
    }

    camera.mode = mode;

    // 🔥 模式对齐协议：同步输入预设
    if (this.inputSystem) {
      const preset = isCreation ? 'default' : 'game';
      this.inputSystem.setPreset(preset);
      console.log(`⌨️ [Input] Preset switched to: ${preset}`);
    }

    // 分场景同步
    if (mode === 'firstPerson' || mode === 'thirdPerson' || mode === 'isometric' || mode === 'sidescroll') {
      this.spawnOrRelockAvatar(mode);
    } else {
      this.removeAvatar();
    }
  }

  /**
   * 选择玩法原型
   * 自动映射相机模式并生成角色
   */
  public selectArchetype(type: GameplayArchetype): void {
    console.log(`🎮 [Archetype] Selecting: ${type}`);
    switch (type) {
      case 'FPS':
        this.setCameraMode('firstPerson');
        break;
      case 'TPS':
        this.setCameraMode('thirdPerson');
        break;
      case 'ActionRPG':
        this.setCameraMode('isometric');
        break;
      case 'Platformer':
        this.setCameraMode('sidescroll');
        break;
    }
  }

  /**
   * 生成或重连替身
   */
  private spawnOrRelockAvatar(mode: CameraMode): void {
    if (mode === 'orbit') return;

    // 模式接管：所有非 Orbit 模式均支持替身生成
    this.spawnAvatar(mode);
  }

  /**
   * 获取当前上下文
   */
  public getContext(): ValidationContext {
    return this.currentContext;
  }

  /**
   * 生成替身 (Avatar)：一个受物理控制的胶囊体
   */
  private spawnAvatar(mode: CameraMode): void {
    // 1. 如果已存在，先销毁
    this.removeAvatar();

    console.log(`👤 Spawning Avatar for ${mode}...`);

    // 2. 创建实体
    const avatar = this.entityManager.createEntity('Player_Avatar');
    if (!avatar) return;

    // 3. 初始位置
    const startPos: [number, number, number] = [0, 5, 0];
    if (this.cameraEntity) {
      const camTransform = this.cameraEntity.getComponent('Transform') as TransformComponent;
      if (camTransform) {
        startPos[0] = camTransform.position[0];
        startPos[2] = camTransform.position[2];
        if (Math.abs(startPos[0]) < 1 && Math.abs(startPos[2]) < 1) {
          startPos[1] = 10;
        }
      }
    }

    // 4. 添加组件
    // (1) Transform
    // (1) Transform
    const transform = new TransformComponent(startPos, [0, 0, 0], [1, 1, 1]);
    avatar.addComponent(transform);

    // (2) Visual (仅 TP 模式显示)
    // (2) Visual (仅 TP 模式显示)
    if (mode === 'thirdPerson') {
      const visual = new VisualComponent(
        // 1. Geometry
        { type: 'cylinder', parameters: { radius: 0.5, height: 2, segments: 16 } },
        // 2. Material
        { type: 'standard', color: '#00ff00', metalness: 0, roughness: 1 },
        // 3. Emissive (High Intensity to verify visibility)
        { color: '#00ff00', intensity: 2.0 },
        // 4. PostProcessing (Enable Bloom)
        { bloom: true, outline: false }
      );
      visual.visible = true;
      visual.castShadow = true;
      visual.receiveShadow = true;
      avatar.addComponent(visual);
    }

    // (3) Physics (动力学刚体)
    const physics = new PhysicsComponent(
      'dynamic',
      { shape: 'capsule', size: [0.5, 1.0, 0.5], offset: [0, 0, 0] },
      1.0, 0.5, 0.0
    );
    physics.lockRotation = [true, true, true]; // Lock rotation to prevent tipping over
    avatar.addComponent(physics);

    // 6. 绑定相机
    if (this.cameraEntity) {
      const camera = this.cameraEntity.getComponent('Camera') as CameraComponent;
      const camTransform = this.cameraEntity.getComponent('Transform') as TransformComponent;
      if (camera && camTransform) {
        camera.targetEntityId = avatar.id;

        if (mode === 'firstPerson') {
          camera.distance = 0.1;
          camera.minDistance = 0.1;
          const avatarVis = avatar.getComponent('Visual') as VisualComponent;
          if (avatarVis) avatarVis.visible = false;
          camera.yaw = 0;
          camera.pitch = 0;
        } else if (mode === 'isometric') {
          camera.distance = 30; // 稍微拉远一些
          camera.minDistance = 10;
          camera.pitch = -45; // 45度角俯视
          camera.yaw = 45;   // 45度角侧视
        } else if (mode === 'sidescroll') {
          camera.distance = 20;
          camera.minDistance = 5;
          camera.pitch = -10; // 近乎平视
          camera.yaw = 0;    // 正对着
        } else {
          // Third Person Default
          camera.distance = 10;
          camera.minDistance = 2;
          camera.yaw = 0;
          camera.pitch = -20;
        }

        camera.pivotOffset = [0, 0, 0];
        console.log(`🔗 Camera locked to Avatar (${mode}): ${avatar.id}`);
      }
    }

    this.avatarEntity = avatar;
  }

  /**
   * 移除替身
   */
  private removeAvatar(): void {
    if (this.avatarEntity) {
      this.entityManager.destroyEntity(this.avatarEntity.id);
      this.avatarEntity = null;
      console.log('👤 Avatar removed.');
    }
  }
}
