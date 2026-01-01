/**
 * PolyForge v1.3.0 - ArchitectureValidationManager
 * 架构验证观测窗口 - 核心管理器 (Shadow Engine Core)
 *
 * "Guard Rail Implementation" - 严格遵循影子架构。
 * UI 只能通过 dispatch(command) 与此管理器交互。
 */

import * as THREE from 'three';
import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { WorldStateManager, WorldState } from './WorldStateManager';
import { Clock } from './Clock';
import { Entity } from './Entity';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { TerrainComponent } from './components/TerrainComponent';
import { VegetationType, VegetationComponent } from './components/VegetationComponent';
import { CameraComponent, CameraMode } from './components/CameraComponent';
import { PhysicsComponent } from './components/PhysicsComponent';
import { TerrainSystem } from './systems/TerrainSystem';
import { VegetationSystem } from './systems/VegetationSystem';
import { CameraSystem } from './systems/CameraSystem';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { AudioSystem } from './systems/AudioSystem';
import { AssetRegistry, getAssetRegistry } from './assets/AssetRegistry';
import { SerializationService } from './SerializationService';
import { CommandManager, ICommand } from './CommandManager';
import { ArchitectureStorageManager } from './ArchitectureStorageManager';
import { BundleSystem } from './bundling/BundleSystem';
import { BundleOptions } from './bundling/BundleBuilder';
import { BundleProgress } from './bundling/types';
import { IArchitectureFacade, ValidationStats } from './IArchitectureFacade';
import { EngineCommand, EngineCommandType } from './EngineCommand';
import { eventBus } from './EventBus';
import { CreateEntityCommand, UpdateWorldStateCommand } from './CommandManager';

export enum ValidationContext {
  CREATION = 'CREATION',
  EXPERIENCE = 'EXPERIENCE'
}

export class ArchitectureValidationManager implements IArchitectureFacade {
  // 核心 ECS 系统 (Private Lockdown)
  private entityManager: EntityManager;
  private systemManager: SystemManager;
  private worldStateManager: WorldStateManager;
  private clock: Clock;

  // 子系统
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
  private bundleSystem: BundleSystem;

  // 实体引用
  private terrainEntity: Entity | null = null;
  private cameraEntity: Entity | null = null;
  private playerEntity: Entity | null = null;

  // 状态维护
  private autoSaveInterval: number = 5000;
  private lastSaveTime: number = 0;
  private currentContext: ValidationContext = ValidationContext.CREATION;
  private isDisposed: boolean = false;
  private selectedEntityId: string | null = null;

  // 放置系统状态 (Placement State)
  private ghostEntityId: string | null = null;
  private placementMode: 'standee' | 'sticker' | 'billboard' | 'model' = 'model';
  private currentPlacementAsset: { id: string, name: string, type: 'model' | 'image' } | null = null;
  private placementScale: number = 1.0;
  private placementRotationY: number = 0;
  private placementRotationX: boolean = false; // Shift+R 用于翻转
  private tickCounter: number = 0; // 🔥 Performance Throttle

  constructor() {
    console.log('🏗️ [ArchitectureValidationManager] Initializing Shadow Core...');

    // 1. Core Initialization
    this.entityManager = new EntityManager();
    this.clock = new Clock();
    this.systemManager = new SystemManager(this.entityManager, this.clock);
    this.entityManager.setSystemManager(this.systemManager);

    this.worldStateManager = new WorldStateManager();
    this.serializationService = new SerializationService(this.entityManager);
    this.commandManager = new CommandManager(this.entityManager, this.serializationService);
    this.storageManager = new ArchitectureStorageManager(this.entityManager, this.worldStateManager);

    this.assetRegistry = getAssetRegistry();
    this.bundleSystem = new BundleSystem(this.entityManager, this.assetRegistry, this.serializationService, this.worldStateManager);

    // 2. Component Registration
    this.entityManager.registerComponent('Transform', TransformComponent);
    this.entityManager.registerComponent('Visual', VisualComponent);
    this.entityManager.registerComponent('Terrain', TerrainComponent);
    this.entityManager.registerComponent('Vegetation', VegetationComponent);
    this.entityManager.registerComponent('Camera', CameraComponent);
    this.entityManager.registerComponent('Physics', PhysicsComponent);

    // 3. System Initialization
    this.inputSystem = new InputSystem();
    this.terrainSystem = new TerrainSystem();
    this.vegetationSystem = new VegetationSystem(this.worldStateManager);
    this.cameraSystem = new CameraSystem();
    this.physicsSystem = new PhysicsSystem();
    this.physicsSystem.setEntityManager(this.entityManager); // Critical Fix for Physics
    this.audioSystem = new AudioSystem();

    // 4. Wiring
    this.cameraSystem.setInputSystem(this.inputSystem);
    this.cameraSystem.setEntityManager(this.entityManager);
    this.cameraSystem.setArchitectureManager(this); // 🆕 注入 Manager 以支持预设系统
    this.cameraSystem.setPhysicsSystem(this.physicsSystem);
    this.inputSystem.setCommandManager(this.commandManager);

    // 5. System Registration
    this.systemManager.registerSystem('InputSystem', this.inputSystem);
    this.systemManager.registerSystem('TerrainSystem', this.terrainSystem);
    this.systemManager.registerSystem('VegetationSystem', this.vegetationSystem);
    this.systemManager.registerSystem('CameraSystem', this.cameraSystem);
    this.systemManager.registerSystem('PhysicsSystem', this.physicsSystem);
    this.systemManager.registerSystem('AudioSystem', this.audioSystem);

    // 6. Async Polish
    this.physicsSystem.initialize().then(() => console.log('⚡ Physics Warmup Complete'));
    this.assetRegistry.initialize().then(async () => {
      console.log('📦 Assets Initialized');
      // 🚨 修正判据：检查元数据总量而非内存 Blob 缓存 (Fix duplication)
      if (this.assetRegistry.getTotalAssetCount() === 0) {
        console.log('🌱 Seeding default assets...');
        await this.seedDefaultAssets();
      }
    });

    // 7. Auto Recovery
    this.tryRestoreOrInit();
  }

  /**
   * 启动影子引擎子系统。
   */
  public start(): void {
    console.log('⚡ [ArchitectureValidationManager] Starting Shadow Core Systems...');
    this.clock.start();
    this.inputSystem.pushContext('orbit');
  }

  private tryRestoreOrInit() {
    try {
      const savedState = this.storageManager.load();
      if (savedState) {
        this.restoreFromSnapshot(savedState);
        // 🚨 检查恢复后的健康度（如果实体数为0，说明恢复了个寂寞，强制重置）
        if (this.entityManager.getEntityCount() === 0) {
          console.warn('⚠️ [Manager] Restore returned 0 entities, falling back to clean init.');
          this.initializeScene();
        }
      } else {
        this.initializeScene();
      }
    } catch (error) {
      console.error('🔥 [Manager] Recovery failed, self-destructing and re-initializing:', error);
      this.entityManager.clear();
      this.initializeScene();
    }
  }

  // ===================================================================================
  // 🛡️ The God's Law: Dispatch Implementation
  // ===================================================================================

  public async dispatch(command: EngineCommand): Promise<void> {
    // 🛡️ 拦截器：非撤销类指令且非元指令（如选中/上下文切换）才进入撤销栈
    const isUndoable = command.type !== EngineCommandType.UNDO &&
      command.type !== EngineCommandType.REDO &&
      command.type !== EngineCommandType.SELECT_ENTITY &&
      command.type !== EngineCommandType.SET_CONTEXT &&
      command.type !== EngineCommandType.SAVE_SCENE &&
      command.type !== EngineCommandType.RESET_SCENE &&
      command.type !== EngineCommandType.EXPORT_BUNDLE;

    if (isUndoable) {
      // ✅ 架构回归：针对性地封装底层指令，不再使用重度全量快照
      switch (command.type) {
        case EngineCommandType.SPAWN_PHYSICS_BOX: {
          const createCmd = new CreateEntityCommand(this.entityManager, 'GravityCube');
          this.commandManager.execute(createCmd);
          // 执行后的附加逻辑（如添加物理组件）交由 dispatchInternal 处理
          await this.dispatchInternal(command, (createCmd as any).createdEntityId);
          break;
        }

        case EngineCommandType.SET_TIME_OF_DAY: {
          const oldTime = this.worldStateManager.getState().timeOfDay;
          const cmd = new UpdateWorldStateCommand(this.worldStateManager, 'timeOfDay', oldTime, command.hour);
          this.commandManager.execute(cmd);
          break;
        }

        default:
          // 其他暂未定义的指令直接执行（可通过 dispatchInternal 扩展更多精密指令）
          await this.dispatchInternal(command);
          break;
      }
    } else {
      // 执行元指令
      await this.dispatchInternal(command);
    }
  }

  // 🤫 Internal execution (Do not call directly unless you know what you are doing)
  public async dispatchInternal(command: EngineCommand, targetId?: string): Promise<void> {
    // console.log(`⚡ Executing: ${command.type}`, command);
    switch (command.type) {
      // --- Undo/Redo ---
      case EngineCommandType.UNDO:
        this.commandManager.undo();
        break;
      case EngineCommandType.REDO:
        this.commandManager.redo();
        break;

      // --- Environment ---
      case EngineCommandType.SET_TIME_OF_DAY:
        // 如果不是从精密指令（UpdateWorldStateCommand）来的，则执行原始逻辑
        if (!(command as any)._fromCommand) {
          this.worldStateManager.setTimeOfDay(command.hour);
        }
        break;
      case EngineCommandType.SET_LIGHT_INTENSITY:
        this.worldStateManager.setLightIntensity(command.intensity);
        break;
      case EngineCommandType.SET_BLOOM_STRENGTH:
        this.worldStateManager.setBloomStrength(command.strength);
        break;
      case EngineCommandType.SET_BLOOM_THRESHOLD:
        this.worldStateManager.setBloomThreshold(command.threshold);
        break;
      case EngineCommandType.SET_TONE_MAPPING_EXPOSURE:
        this.worldStateManager.setToneMappingExposure(command.exposure);
        break;
      case EngineCommandType.SET_SMAA_ENABLED:
        this.worldStateManager.setSMAAEnabled(command.enabled);
        break;
      case EngineCommandType.SET_GRAVITY:
        this.worldStateManager.setGravity((command as any).value);
        this.physicsSystem.setGravity(0, (command as any).value, 0);
        break;
      case EngineCommandType.SET_HDR:
        this.worldStateManager.setHDR((command as any).assetId);
        break;

      // --- Camera ---
      case EngineCommandType.SET_CAMERA_MODE:
        this.setCameraMode(command.mode);
        break;
      case EngineCommandType.APPLY_CAMERA_PRESET:
        if (this.cameraEntity) {
          const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
          if (cam && this.cameraSystem.presetManager) {
            this.cameraSystem.presetManager.applyPreset(cam, (command as any).presetId);
          }
        }
        break;
      case EngineCommandType.SET_CAMERA_FOV:
        this.updateCameraComponent(c => c.fov = command.fov);
        break;
      case EngineCommandType.SET_MOVE_SPEED:
        this.updateCameraComponent(c => c.moveSpeed = command.speed);
        break;
      case EngineCommandType.SET_FORCE_MULTIPLIER:
        this.updateCameraComponent(c => c.forceMultiplier = command.multiplier);
        break;
      case EngineCommandType.SET_CAMERA_PITCH:
        this.updateCameraComponent(c => c.pitch = command.pitch);
        break;
      case EngineCommandType.SET_CAMERA_YAW:
        this.updateCameraComponent(c => c.yaw = command.yaw);
        break;
      case EngineCommandType.SET_CAMERA_DISTANCE:
        this.updateCameraComponent(c => c.distance = command.distance);
        break;

      case EngineCommandType.SET_TERRAIN_SIZE:
        this.setTerrainSize(command.width, command.depth);
        break;

      // --- Vegetation ---
      case EngineCommandType.SPAWN_VEGETATION:
        this.spawnVegetation(command.count, command.vegType, command.color);
        break;
      case EngineCommandType.CLEAR_VEGETATION:
        this.clearVegetation();
        break;
      case EngineCommandType.SET_GRASS_SCALE:
        this.updateVegetationConfig(c => { c.scale = command.scale; return true; });
        break;
      case EngineCommandType.SET_WIND_STRENGTH:
        this.updateVegetationConfig(c => { c.windStrength = command.strength; return false; });
        break;
      case EngineCommandType.SET_GRASS_COLOR:
        this.updateVegetationConfig(c => {
          if (c.type === VegetationType.GRASS) { c.baseColor = command.color; return false; }
          return false;
        });
        break;
      case EngineCommandType.SET_FLOWER_COLOR:
        this.updateVegetationConfig(c => {
          if (c.type === VegetationType.FLOWER) { c.baseColor = command.color; return false; }
          return false;
        });
        break;

      // --- Terrain ---
      case EngineCommandType.CREATE_MOUNTAIN:
        this.modifyTerrain('mountain');
        break;
      case EngineCommandType.CREATE_VALLEY:
        this.modifyTerrain('valley');
        break;
      case EngineCommandType.FLATTEN_TERRAIN:
        this.modifyTerrain('flatten');
        break;

      // --- Physics & Debug ---
      case EngineCommandType.SPAWN_PHYSICS_BOX:
        this.spawnPhysicsBox(targetId);
        break;
      case EngineCommandType.SPAWN_CHARACTER:
        this.spawnPlayerCharacter();
        break;
      case EngineCommandType.DESPAWN_CHARACTER:
        this.despawnPlayerCharacter();
        break;
      case EngineCommandType.TOGGLE_FLIGHT_MODE:
        this.toggleFlightMode(command.enabled);
        break;
      case EngineCommandType.APPLY_PHYSICS_EXPLOSION:
        this.physicsSystem.applyExplosion(command.position, command.force, command.radius);
        break;
      case EngineCommandType.TOGGLE_PHYSICS_DEBUG:
        this.worldStateManager.setPhysicsDebugEnabled(command.enabled);
        break;
      case EngineCommandType.TOGGLE_AUDIO_DEBUG:
        this.worldStateManager.setAudioDebugEnabled(command.enabled);
        break;

      // --- System ---
      case EngineCommandType.SAVE_SCENE:
        this.storageManager.save();
        break;
      case EngineCommandType.RESET_SCENE:
        this.storageManager.clear();
        window.location.reload(); // Hard Reset
        break;

      // --- Bundling ---
      case EngineCommandType.EXPORT_BUNDLE:
        await this.exportBundle(command.name);
        break;
      case EngineCommandType.IMPORT_BUNDLE:
        await this.importBundle(command.file);
        break;

      // --- Placement System ---
      case EngineCommandType.ENTER_PLACEMENT_MODE:
        await this.handleEnterPlacementMode(command.assetId, command.assetName);
        break;
      case EngineCommandType.ENTER_IMAGE_PLACEMENT_MODE:
        await this.handleEnterImagePlacementMode(command.assetId, command.assetName);
        break;
      case EngineCommandType.TOGGLE_PLACEMENT_MODE:
        this.handleTogglePlacementMode();
        break;
      case EngineCommandType.CANCEL_PLACEMENT:
        this.handleCancelPlacement();
        break;
      case EngineCommandType.COMMIT_PLACEMENT:
        this.handleCommitPlacement();
        break;

      case EngineCommandType.DELETE_ENTITY: // 🔥 新增删除指令
        // 使用 this.ghostEntityId 判断是否正在放置中
        const isPlacing = !!this.ghostEntityId;
        if (this.selectedEntityId && !isPlacing) {
          this.entityManager.destroyEntity(this.selectedEntityId);
          this.selectedEntityId = null;
          console.log('🗑️ [Manager] Selected entity deleted.');
        }
        break;

      // 放置微调指令 (由 UI 快捷键触发)
      case EngineCommandType.ROTATE_PLACEMENT:
        // TypeScript Now Knows 'command' is RotatePlacementPayload
        if (command.axis === 'x') this.placementRotationX = !this.placementRotationX;
        else this.placementRotationY = (this.placementRotationY + 90) % 360;
        break;

      case EngineCommandType.SCALE_PLACEMENT:
        // TypeScript Now Knows 'command' is ScalePlacementPayload
        const delta = command.delta || 0;
        this.placementScale = Math.max(0.1, Math.min(100, this.placementScale + delta));
        break;

      // --- Audio ---
      case EngineCommandType.SET_PLAYBACK_RATE:
        this.audioSystem.setPlaybackRate(command.rate);
        break;

      // --- Selection & Context (Isolation) ---
      case EngineCommandType.SET_CONTEXT:
        this.currentContext = (command as any).context === 'CREATION' ? ValidationContext.CREATION : ValidationContext.EXPERIENCE;
        console.log(`📡 [Manager] Context switched to: ${this.currentContext}`);

        if (this.currentContext === ValidationContext.EXPERIENCE) {
          this.handleCancelPlacement(); // 切换到体验模式时强制取消放置
        } else {
          // 🔥 神经修复：切换回创造模式时强制释放指针锁定 (防止鼠标消失)
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
        break;

      case EngineCommandType.SELECT_ENTITY:
        this.selectedEntityId = (command as any).entityId;
        console.log(`📡 [Manager] Entity selected: ${this.selectedEntityId}`);
        break;

      case EngineCommandType.APPLY_ASSET_TO_SELECTION:
        this.handleApplyAssetToSelection((command as any).assetId, (command as any).assetType);
        break;
    }
  }

  // ===================================================================================
  // 🔍 Getters (ReadOnly / Safe Refs)
  // ===================================================================================

  public getEnvironmentState(): WorldState {
    return this.worldStateManager.getState();
  }

  public getSerializationService(): SerializationService {
    return this.serializationService;
  }

  public getStats(): ValidationStats {
    const entities = this.entityManager.getAllEntities();
    let vegCount = 0;
    entities.forEach(e => {
      const v = e.getComponent<VegetationComponent>('Vegetation');
      if (v) vegCount += v.instanceCount;
    });

    return {
      entityCount: entities.length,
      systemCount: 6,
      vegetationCount: vegCount,
      terrainVertices: this.terrainEntity?.getComponent<TerrainComponent>('Terrain')?.heightData.length || 0,
      physicsInitialized: this.physicsSystem.getStats().initialized,
      physicsBodies: this.physicsSystem.getStats().totalBodies,
    };
  }

  public setShadowBias(bias: number): void {
    this.worldStateManager.setShadowBias(bias);
  }

  public setShadowNormalBias(bias: number): void {
    this.worldStateManager.setShadowNormalBias(bias);
  }

  public setShadowOpacity(opacity: number): void {
    this.worldStateManager.setShadowOpacity(opacity);
  }

  public setShadowRadius(radius: number): void {
    this.worldStateManager.setShadowRadius(radius);
  }

  public setShadowColor(color: string): void {
    this.worldStateManager.setShadowColor(color);
  }

  public setShadowDistance(distance: number): void {
    this.worldStateManager.setShadowDistance(distance);
  }

  public getContext(): string {
    return this.currentContext;
  }

  public getAssetRegistry(): AssetRegistry {
    return this.assetRegistry;
  }

  public getCommandManager(): CommandManager {
    return this.commandManager;
  }

  public getStorageManager(): ArchitectureStorageManager {
    return this.storageManager;
  }

  // 🔥 Special Getter for EngineBridge - Bridge needs access to State Manager to subscribe
  public getWorldStateManager(): WorldStateManager {
    return this.worldStateManager;
  }

  // 🔥 Special Getter for EngineBridge
  public getEntityManager(): EntityManager {
    return this.entityManager;
  }

  // 🔥 Special Getter for EngineBridge
  public getInputSystem(): InputSystem {
    return this.inputSystem;
  }

  // 🔥 Special Getter for EngineBridge
  public getCameraSystem(): CameraSystem {
    return this.cameraSystem;
  }

  // 🔥 Special Getter for EngineBridge
  public getTerrainSystem(): TerrainSystem {
    return this.terrainSystem;
  }

  // 🔥 Special Getter for EngineBridge
  public getVegetationSystem(): VegetationSystem {
    return this.vegetationSystem;
  }

  public getPlacementState() {
    return {
      isPlacing: !!this.ghostEntityId,
      mode: this.placementMode,
      assetName: this.currentPlacementAsset?.name || null
    };
  }

  /**
   * 彻底清理影子引擎所有资源，防止“僵尸系统”劫持输入信号。
   */
  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    console.log('Sweep 🧹 [ArchitectureValidationManager] Disposing Shadow Core...');

    // 🔥 0a. 清理非持久化实体（防止保存带有角色的脏状态）
    if (this.playerEntity) {
      this.despawnPlayerCharacter(); // 删除角色并解除绑定
    }
    this.entityManager.clearNonPersistent(); // 清理所有临时实体

    // 🆕 0b. 相机模式重置 (批准条件1)
    // 确保体验模式的状态不会残留到下次启动
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam && (this.currentContext === ValidationContext.EXPERIENCE || cam.mode !== 'orbit')) {
        console.log('🔄 [Manager] Resetting camera to Orbit for clean disposal.');
        cam.mode = 'orbit';
        cam.activePreset = null;
        cam.targetEntityId = null;
      }
    }

    // 🔥 0c. 强制保存：确保模块切换、关闭窗口前数据不丢失（现在是干净状态）
    if (this.storageManager) {
      this.storageManager.save();
    }

    // 1. 停止时钟
    this.clock.pause();

    // 2. 销毁输入系统（拔除全局监听器）
    if (this.inputSystem) {
      this.inputSystem.destroy();
    }

    // 3. 销毁物理世界（释放 WASD 内存）
    if (this.physicsSystem) {
      this.physicsSystem.destroy();
    }

    // 🔥 4. 销毁地形与植被系统（清理 GPU 缓存与笔刷状态）
    if (this.terrainSystem) {
      this.terrainSystem.destroy();
    }
    if (this.vegetationSystem) {
      this.vegetationSystem.destroy();
    }

    // 5. 销毁音频上下文
    if (this.audioSystem) {
      this.audioSystem.dispose();
    }

    // 🔥 6. 彻底关闭资产单例（释放 HDR 材质与模型句柄）
    if (this.assetRegistry) {
      this.assetRegistry.close();
    }

    // 7. 清理实体集
    this.entityManager.clear();

    console.log('✅ Shadow Core disposed successfully.');
  }

  // ===================================================================================
  // 🧠 Internal Logic (Helpers) - NOW PRIVATE
  // ===================================================================================

  private updateCameraComponent(updater: (comp: CameraComponent) => void) {
    if (!this.cameraEntity) return;
    const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
    if (cam) updater(cam);
  }



  private setCameraMode(mode: CameraMode) {
    this.updateCameraComponent(c => {
      c.mode = mode;
      // Reset pitch for FP/TP
      if (mode === 'firstPerson' || mode === 'thirdPerson') {
        c.pitch = 0;
        c.pivotOffset = [0, 0, 0];
      }
      // 🔥 统一体验模式初始镜头高度（与删除角色后的高度保持一致）
      if (mode === 'isometric') {
        c.distance = 50; // Match Preset
      }

      // Force disable collision for Orbit (Editor Mode)
      if (mode === 'orbit') {
        c.enableCollision = false;
        // Optional: Ensure not too close if coming from FPS
        if (c.distance < 2) c.distance = 10;
      }
    });

    // Update Context
    if (mode === 'orbit') {
      this.currentContext = ValidationContext.CREATION;

      // 🔥 完整清理：切换回创造模式时自动删除角色并解除绑定
      if (this.playerEntity) {
        this.despawnPlayerCharacter(); // 主动删除角色
        // despawnPlayerCharacter 内部会调用 unbindCamera，已包含相机解绑
      }

      // 🔥 核心隔离：物理摧毁所有非持久化实体
      this.entityManager.clearNonPersistent();
      // playerEntity 已在 despawnPlayerCharacter 中设为 null

      this.inputSystem.popContext(); // Ensure clean slate
      this.inputSystem.pushContext('orbit');

      // 🔥 Reset Camera Pivot to Origin if it was tracking a deleted entity?
      // Not necessarily, but if stuck, we might want to. 
      // User complaint: "Stuck". Often caused by Pivot being inside an object or invalid.
      // Let's reset Pivot to [0,0,0] for safety when returning to Creation Mode.
      if (this.cameraEntity) {
        const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
        if (cam) cam.pivotOffset = [0, 0, 0];
      }
    } else {
      this.currentContext = ValidationContext.EXPERIENCE;
      this.inputSystem.popContext();
      this.inputSystem.pushContext('gameplay');

      // 🔥 Auto-Spawn Removed (User Request)
      // if (!this.playerEntity) {
      //   this.spawnPlayerCharacter();
      // }

      // Link Camera if player exists
      if (this.playerEntity && this.cameraEntity) {
        const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
        if (cam) {
          cam.targetEntityId = this.playerEntity.id;
          // Set socket for FPS default
          if (mode === 'firstPerson') cam.firstPersonSocket = 'Head';
        }
      }
    }
  }

  private spawnPlayerCharacter() {
    // 🔥 Tri-state Logic: Spawn (Start Fresh) -> Unbind (Release Camera) -> Bind (Re-Lock Camera)

    // Case 2 & 3: Player already exists
    if (this.playerEntity) {
      if (this.cameraEntity) {
        const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
        if (cam) {
          // Case 2: Camera currently following player -> Unbind (Release)
          if (cam.targetEntityId === this.playerEntity.id) {
            this.unbindCamera(cam);
            return;
          }
          // Case 3: Camera unbound but player exists -> Bind (Re-Lock)
          else {
            this.bindCamera(cam, this.playerEntity);
            return;
          }
        }
      }
      return;
    }

    // Case 1: Player does not exist -> Spawn & Bind
    const id = `Player_${Date.now()}`;
    const entity = this.entityManager.createEntity('Player', id);
    entity.persistent = false; // 🔥 标记为非持久化：不存入存档，切回创造模式自动销毁
    this.playerEntity = entity;

    // 1. Transform
    const transform = new TransformComponent();

    // 🔥 Dynamic Spawn: Drop from Camera
    // 🔥 Dynamic Spawn: Drop from Sky (Pivot-Aware)
    let spawnPos: [number, number, number] = [0, 10, 0];
    const terrainSys = this.systemManager.getSystem('TerrainSystem') as any;

    if (this.cameraSystem) {
      const camSys = this.cameraSystem as any;
      const mode = camSys.getMode ? camSys.getMode() : 'orbit';

      // Select Source Position
      let targetX = 0;
      let targetZ = 0;

      // 在 Orbit/ISO 模式下，相机位置可能很远，必须使用 pivot (屏幕中心/目标点) 作为生成基准
      if ((mode === 'orbit' || mode === 'isometric' || mode === 'sidescroll') && camSys.getCurrentPivot) {
        const pivot = camSys.getCurrentPivot();
        targetX = pivot[0];
        targetZ = pivot[2];
      } else if (camSys.getCurrentPosition) {
        // FPS/TPS 模式下，可以使用相机位置（或者相机前方）
        const camPos = camSys.getCurrentPosition();
        targetX = camPos[0];
        targetZ = camPos[2];
      }

      // --- START: SMARTSPAWN (Commercial Engine Ground Snap) ---
      let groundY = 0;
      let foundGround = false;

      // 1. Primary: Physics Raycast (Optimal - hits terrain, buildings, etc.)
      if (this.physicsSystem) {
        const hitResult = this.physicsSystem.castRay(
          { x: targetX, y: 100, z: targetZ }, // Ray start from 100m sky
          { x: 0, y: -1, z: 0 },              // Direction: Straight down
          200                                // Max distance
        );
        if (hitResult.hit) {
          groundY = hitResult.point.y;
          foundGround = true;
          // console.log(`[SmartSpawn] Ground found via Physics at Y=${groundY}`);
        }
      }

      // 2. Fallback: Terrain Math (Internal interpolation)
      if (!foundGround && terrainSys && terrainSys.getHeightAtWorld) {
        groundY = terrainSys.getHeightAtWorld(targetX, targetZ);
        foundGround = true;
        // console.log(`[SmartSpawn] Ground found via Terrain Math at Y=${groundY}`);
      }

      // 3. Last Resort: World Zero
      if (!foundGround) {
        groundY = 0;
      }

      // Final Spawn Position (Ground + small safety margin for foot origin)
      spawnPos = [targetX, groundY + 0.1, targetZ];
      // --- END: SMARTSPAWN ---
    }

    transform.position = spawnPos as [number, number, number];
    this.entityManager.addComponent(entity.id, transform);

    // 2. Physics (Dynamic Capsule: Radius 0.5, Total Height 2.0)
    const physics = new PhysicsComponent('dynamic');
    // radius=0.5, halfHeight=0.5. Total height = 2r + 2h = 1 + 1 = 2m.
    // Center at [0, 1, 0] makes bottom at 0, top at 2m.
    physics.setCollider('capsule', [0.5, 0.5, 0], [0, 1, 0]);
    physics.mass = 1.0;
    // 🚀 Critical: Lock X and Z rotation to keep character standing
    physics.lockRotation = [true, false, true];
    physics.friction = 0.5;
    this.entityManager.addComponent(entity.id, physics);
    physics.isCharacterController = true; // Enable CharacterController Logic

    // 3. Visual (Green Glowing Capsule -> Cylinder Proxy)
    const visual = new VisualComponent();
    // Match physical height (2m)
    visual.geometry = { type: 'cylinder', parameters: { radius: 0.5, height: 2 } };
    visual.material = { type: 'standard', color: '#00ff00', roughness: 0.3 };
    visual.emissive = { color: '#00ff00', intensity: 2.0 };
    visual.castShadow = true;
    // 🚀 Visual Offset: Raise by 1.0 to align bottom with entity origin (foot at Y=0)
    visual.offset = [0, 1, 0];
    this.entityManager.addComponent(entity.id, visual);

    // 4. Sockets (Head for FPS)
    entity.addSocket({
      name: 'Head',
      localTransform: {
        position: [0, 1.7, 0], // Eye level for 2m character
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      }
    });

    // Link
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam) this.bindCamera(cam, entity);
    }

    console.log('🦸 Spawning Player Character:', entity.id);
  }

  // --- Helpers for Tri-state Logic ---

  private bindCamera(cam: CameraComponent, target: Entity) {
    cam.preFollowDistance = cam.distance; // Backup current distance
    cam.targetEntityId = target.id;
    cam.controlledEntityId = target.id; // Ensure WASD works

    // Switch to ISO if in Orbit (God View safe default)
    if (cam.mode === 'orbit') cam.mode = 'isometric';

    console.log('📷 Camera Bound to Target');
  }

  private unbindCamera(cam: CameraComponent) {
    // Sync pivot before unbinding for continuity
    if (this.entityManager && cam.targetEntityId) {
      const t = this.entityManager.getEntity(cam.targetEntityId)?.getComponent<TransformComponent>('Transform');
      if (t) {
        cam.pivotOffset[0] = t.position[0];
        cam.pivotOffset[1] = t.position[1];
        cam.pivotOffset[2] = t.position[2];
      }
    }

    cam.targetEntityId = null;
    // Note: we Keep controlledEntityId set so WASD still works!

    // Zoom Out to 100
    cam.distance = 100;
    // 🔥 Fix: Switch to Isometric (God View) instead of Orbit (Editor View) to prevent free rotation
    cam.mode = 'isometric';
    console.log('🔓 Camera Unbound & Zoomed-Out to 100 (Isometric Mode)');
  }

  public getSpawnButtonState(): 'Spawn' | 'Bind' | 'Unbind' {
    if (!this.playerEntity) return 'Spawn';
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam && cam.targetEntityId === this.playerEntity.id) return 'Unbind';
    }
    return 'Bind';
  }

  public despawnPlayerCharacter() {
    if (!this.playerEntity) return;

    // 1. 强制关闭飞行模式 (Cleanup)
    this.toggleFlightMode(false);

    // 2. Unlink Camera first
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam) {
        // 🔥 Use Standard Fallback to ensure EventBus and UI sync
        if (this.cameraSystem.presetManager) {
          this.cameraSystem.presetManager.fallbackToSafePreset(cam);
        } else {
          // Manual Fallback (Backup)
          cam.targetEntityId = null;
          cam.controlledEntityId = null;
          cam.distance = 100;
          cam.mode = 'isometric';
        }
      }
    }

    this.entityManager.destroyEntity(this.playerEntity.id);
    this.playerEntity = null;

    // 🔥 UI Sync: Reset Flight Mode State
    // Physics component is gone, so state is effectively off. Notify UI.
    eventBus.emit('gameplay:flight_mode:reset');

    console.log('👋 Despawning Player Character');
  }

  /**
   * 获取当前飞行模式状态
   */
  public isFlightModeEnabled(): boolean {
    if (!this.playerEntity) return false;
    const physics = this.playerEntity.getComponent<PhysicsComponent>('Physics');
    return physics ? !physics.useGravity : false;
  }

  private toggleFlightMode(enabled: boolean) {
    if (!this.playerEntity) return;

    // Physics Component
    const physics = this.playerEntity.getComponent<PhysicsComponent>('Physics');
    if (physics) {
      // 🛡️ 幂等性校验：如果状态一致，直接跳过，防止坐标累加
      const currentEnabled = !physics.useGravity;
      if (enabled === currentEnabled) {
        console.log(`✈️ Flight Mode: Already ${enabled ? 'ON' : 'OFF'}, skipping.`);
        return;
      }

      physics.useGravity = !enabled; // Flight = No Gravity
      physics.linearDamping = enabled ? 5.0 : 0.01; // High damping for air control

      // Update Rapier
      const rigidBody = this.physicsSystem.getRigidBody(this.playerEntity.id);
      if (rigidBody) {
        rigidBody.setGravityScale(enabled ? 0.0 : 1.0, true);
        rigidBody.setLinearDamping(enabled ? 5.0 : 0.0);

        if (enabled) {
          // 🔥 Lift off! 只在开启瞬间提供一个向上的初始力
          const currentPos = rigidBody.translation();

          // 如果已经在空中（y > 地面高度），则不需要传送 1.5m，只需要关闭重力
          // 如果在地面，则传送一小段距离防止与地面摩擦力产生粘连
          const terrainSys = this.systemManager.getSystem('TerrainSystem') as any;
          const groundY = terrainSys?.getHeightAt ? terrainSys.getHeightAt(currentPos.x, currentPos.z) : 0;

          if (currentPos.y < groundY + 0.5) {
            rigidBody.setTranslation({ x: currentPos.x, y: groundY + 1.2, z: currentPos.z }, true);
          }

          rigidBody.setLinvel({ x: 0, y: 1.5, z: 0 }, true); // 轻微向上冲力
        } else {
          // 关闭飞行模式时，清除阻尼，让其受重力自由落体
          rigidBody.setLinvel({ x: 0, y: -0.1, z: 0 }, true); // 给一个微小的下压力引导下落
        }
      }
    }
    console.log(`✈️ Flight Mode: ${enabled ? 'ON' : 'OFF'}`);
  }

  private setTerrainSize(width: number, depth: number) {
    const terrainEntity = this.entityManager.getEntitiesWithComponents(['Terrain'])[0];
    if (terrainEntity) {
      const terrain = terrainEntity.getComponent<TerrainComponent>('Terrain');
      const physics = terrainEntity.getComponent<PhysicsComponent>('Physics');
      const visual = terrainEntity.getComponent<VisualComponent>('Visual');

      if (terrain) terrain.resize(width, depth);

      // 1. 同步视觉参数 (Args 改变会触发 R3F 重新构造 Geometry)
      if (visual && visual.geometry.type === 'plane' && visual.geometry.parameters) {
        visual.geometry.parameters.width = width;
        visual.geometry.parameters.height = depth; // Plane 使用 width/height 作为 XZ 对应
      }

      // 2. 同步物理碰撞体 (Static 刚体需重建以更新 Shape)
      if (physics) {
        // 🔥 Keep Heightfield and update offset/size
        physics.setCollider('heightfield', [width, 2, depth], [0, 0, 0]);
        // 🔥 强制物理系统重载此实体
        this.physicsSystem.onEntityRemoved(terrainEntity);
        this.physicsSystem.onEntityAdded(terrainEntity);
      }

      // 3. 强制标记所有植被实体为脏，触发重新分布 (防止扩容后出现空地)
      const vegEntities = this.entityManager.getEntitiesWithComponents(['Vegetation']);
      vegEntities.forEach(entity => {
        const veg = entity.getComponent<VegetationComponent>('Vegetation');
        if (veg) veg.isDirty = true;
      });

      console.log(`🌍 [ArchitectureValidationManager] Global Resize: ${width}x${depth}`);
    }
  }

  private updateVegetationConfig(updater: (config: any) => boolean) {
    const entities = this.entityManager.getAllEntities();
    entities.forEach(e => {
      const v = e.getComponent<VegetationComponent>('Vegetation');
      if (v) {
        const shouldSetScaleDirty = updater(v.config);
        v.markDirty();
        if (shouldSetScaleDirty) v.isScaleDirty = true;
      }
    });
  }

  private spawnVegetation(count: number, type: 'grass' | 'flower', color?: string) {
    if (!this.terrainEntity) return;

    // Logic from original spawnFlowers/spawnGrass
    const density = type === 'grass' ? count : Math.min(count, 2000); // Cap flowers

    console.log(`🌱 Spawning ${type} (count: ${density}, color: ${color})...`);

    // Use System to spawn logic

    // Determine Type Enum
    const vegType = type === 'grass' ? VegetationType.GRASS : VegetationType.FLOWER;

    // Use spawnGrass or spawnFlowers from system if available, or manually create
    // Since we know VegetationSystem has spawnGrass/spawnFlowers, let's use them but we need to pass type?
    // Looking at VegetationSystem code:
    // spawnGrass sets VegetationType.GRASS
    // spawnFlowers sets VegetationType.FLOWER

    let id: string;

    if (type === 'grass') {
      id = this.vegetationSystem.spawnGrass(density, this.terrainEntity.id);
    } else {
      id = this.vegetationSystem.spawnFlowers(density, this.terrainEntity.id);
    }

    if (id) {
      const entity = this.entityManager.getEntity(id);
      const veg = entity?.getComponent<VegetationComponent>('Vegetation');
      if (veg) {
        // Validation specific overrides
        if (color) {
          veg.config.baseColor = color; // ✅ Apply user selected color immediately
        } else if (type === 'flower') {
          veg.config.baseColor = '#ff69b4'; // Default Pink fallback
        }

        // Remove hardcoded scale if present in previous versions
        // veg.config.scale = 1.5; 

        veg.markDirty();
      }
    }
  }

  private clearVegetation() {
    const toKill = this.entityManager.getAllEntities().filter(e => e.hasComponent('Vegetation'));
    toKill.forEach(e => this.entityManager.destroyEntity(e.id));
  }

  private modifyTerrain(type: 'mountain' | 'valley' | 'flatten') {
    if (!this.terrainEntity) return;
    const terrain = this.terrainEntity.getComponent<TerrainComponent>('Terrain');
    if (!terrain) return;

    const centerX = terrain.config.widthSegments / 2;
    const centerZ = terrain.config.depthSegments / 2;

    if (type === 'flatten') {
      terrain.heightData.fill(0);
    } else {
      for (let z = 0; z <= terrain.config.depthSegments; z++) {
        for (let x = 0; x <= terrain.config.widthSegments; x++) {
          const dx = x - centerX;
          const dz = z - centerZ;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const maxDist = Math.min(terrain.config.widthSegments, terrain.config.depthSegments) / 3;

          if (dist < maxDist) {
            const factor = (1 - dist / maxDist);
            const height = type === 'mountain' ? factor * 8 : -factor * 5;
            terrain.setHeight(x, z, height);
          }
        }
      }
    }
    terrain.isDirty = true;

    // 🔥 Rebuild Physics Collider to match new height data
    if (this.physicsSystem && this.terrainEntity) {
      this.physicsSystem.rebuildBody(this.terrainEntity.id);
    }
  }

  /**
   * 物理生成重力方块
   * @param existingId 如果是由 CreateEntityCommand 先行生成的实体 ID
   */
  public spawnPhysicsBox(existingId?: string) {
    const id = existingId || `GravityCube_${Date.now()}`;
    // 🔥 如果实体已存在（CreateEntityCommand 创建），则直接获取，否则按需创建
    const entity = existingId ? this.entityManager.getEntity(existingId)! : this.entityManager.createEntity('GravityCube', id);
    // 🔥 根据模式决定持久化：创造模式下持久化（场景搭建），体验模式下非持久化（物理测试）
    entity.persistent = this.currentContext === ValidationContext.CREATION;

    // Transform
    const transform = new TransformComponent();
    transform.position = [0, 20, 0];
    this.entityManager.addComponent(entity.id, transform);

    // Physics
    const physics = new PhysicsComponent('dynamic');
    physics.setCollider('box', [1, 1, 1]);
    physics.mass = 1.0;
    physics.restitution = 0.5;
    this.entityManager.addComponent(entity.id, physics);

    // Visual
    const visual = new VisualComponent();
    visual.geometry = { type: 'box', parameters: { width: 1, height: 1, depth: 1 } };
    // 🔥 美学回归：正蓝色
    visual.material = { type: 'standard', color: '#0000FF', metalness: 0.1, roughness: 0.2 };
    // 无自发光
    visual.emissive = { color: '#000000', intensity: 0 };
    visual.castShadow = true;
    visual.visible = true;
    visual.postProcessing = { bloom: false, outline: false }; // 禁用辉光
    this.entityManager.addComponent(entity.id, visual);

    // console.log('🌌 Spawning Blue Gravity Cube:', entity.id);
  }

  private async exportBundle(name: string) {
    console.log(`📦 [Manager] Starting PFB Binary Export: ${name}`);

    try {
      // 1. 执行二进制打包装箱 (内部已包含依赖收集与序列化)
      const buffer = await this.bundleSystem.packToBinary({
        name,
        author: 'PolyForge Creator',
        description: 'Standalone PFB Bundle',
        includeUnusedAssets: false
      }, (progress: BundleProgress) => {
        // 🔥 通过 EventBus 分发进度
        eventBus.emit('BUNDLE_PROGRESS', progress);
      });

      // 2. 触发浏览器下载
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_${Date.now()}.pfb`;
      a.click();

      // 延迟释放以确保下载正常
      setTimeout(() => {
        URL.revokeObjectURL(url);
        // 清理进度 UI
        eventBus.emit('BUNDLE_PROGRESS', null);
      }, 1000);

      console.log(`✅ [Manager] Exported Binary PFB: ${name}`);
    } catch (error) {
      console.error('🔥 [Manager] Export failed:', error);
      eventBus.emit('BUNDLE_PROGRESS', null);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  private async importBundle(file: File) {
    console.log(`📦 [Manager] Importing bundle: ${file.name}`);
    const buffer = await file.arrayBuffer();

    // 1. 检测 Magic Number: PFB! (little endian: 0x21424650)
    const view = new DataView(buffer);
    const isBinary = buffer.byteLength > 4 && view.getUint32(0, true) === 0x21424650;

    let manifest;
    try {
      if (isBinary) {
        // 🔥 新版二进制解析流程 (高效率，带进度回调)
        manifest = await this.bundleSystem.loadFromBinary(buffer, (progress: BundleProgress) => {
          eventBus.emit('BUNDLE_PROGRESS', progress);
        });
      } else {
        // ⚠️ 旧版 JSON 降级兼容
        console.warn('⚠️ [Manager] Legacy JSON bundle detected. Falling back to text decoder...');
        const text = new TextDecoder().decode(buffer);
        manifest = await this.bundleSystem.loadBundle(text);
      }

      // 2. 还原场景镜像
      this.restoreFromSnapshot({
        worldState: manifest.sceneData.worldState,
        entities: manifest.sceneData.entities
      });

      this.storageManager.save();

      // 清理进度 UI
      setTimeout(() => eventBus.emit('BUNDLE_PROGRESS', null), 500);

      console.log(`✅ [Manager] Bundle "${file.name}" imported successfully.`);
    } catch (error) {
      console.error('🔥 [Manager] Import failed:', error);
      eventBus.emit('BUNDLE_PROGRESS', null);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // --- Scene Logic ---

  public update(): void {
    if (this.isDisposed) return;
    const deltaTime = this.clock.tick(); // 使用 Clock 驱动并获取 DeltaTime
    this.systemManager.updateManual(deltaTime);

    // 🚀 [Placement System] 实时射线检测与幽灵同步 (仅在 CREATION 模式激活)
    if (this.currentContext === ValidationContext.CREATION) {
      this.handlePlacementTick();
    }

    // 🔥 Keyboard Input Handler (ESC, SCALE, ROTATE)
    if (this.currentContext === ValidationContext.CREATION) {
      this.handleKeyboardInputs();
    }

    // 🔥 Anti-Drift: Reset input deltas at the end of frame processing
    if (this.inputSystem) {
      this.inputSystem.resetFrameData();
    }

    // 🕒 [Heartbeat Auto Save] 每 5s 进行一次低频状态固化 (仅在 CREATION 模式)
    const now = Date.now();
    if (this.currentContext === ValidationContext.CREATION && now - this.lastSaveTime > this.autoSaveInterval) {
      this.storageManager.save();
      this.lastSaveTime = now;
      // console.log('🕒 [Manager] Heartbeat auto-save completed.');
    }
  }

  public setInputElement(domElement: HTMLElement) {
    // Placeholder as InputSystem uses window listeners currently
  }

  public setR3FCamera(camera: any) {
    this.cameraSystem.setR3FCamera(camera);
  }

  private initializeScene() {
    // Terrain
    this.terrainEntity = this.entityManager.createEntity('ValidationTerrain');
    const tTrans = new TransformComponent();
    this.entityManager.addComponent(this.terrainEntity.id, tTrans);
    const tComp = new TerrainComponent({ width: 50, depth: 50, widthSegments: 100, depthSegments: 100 });
    this.entityManager.addComponent(this.terrainEntity.id, tComp);
    const tVis = new VisualComponent();
    tVis.geometry = { type: 'plane', parameters: { width: 50, height: 50 } };
    tVis.material = { type: 'standard', color: '#444444', roughness: 0.8 };
    tVis.visible = true;
    tVis.receiveShadow = true;
    this.entityManager.addComponent(this.terrainEntity.id, tVis);
    const tPhys = new PhysicsComponent('static');
    tPhys.setCollider('heightfield', [50, 2, 50], [0, 0, 0]); // Test with zero offset
    this.entityManager.addComponent(this.terrainEntity.id, tPhys);

    // Camera
    this.cameraEntity = this.entityManager.createEntity('GodCamera');
    const cTrans = new TransformComponent();
    cTrans.position = [0, 50, 50];
    this.entityManager.addComponent(this.cameraEntity.id, cTrans);
    const cComp = new CameraComponent();
    cComp.mode = 'orbit';
    cComp.distance = 70;
    cComp.maxDistance = 200; // Ensure we can zoom out
    cComp.pitch = -45;
    cComp.yaw = 45;
    this.entityManager.addComponent(this.cameraEntity.id, cComp);

    // Demo Veg
    setTimeout(() => this.spawnVegetation(5000, 'grass'), 100);
  }

  private restoreFromSnapshot(snapshot: any) {
    this.worldStateManager.deserialize(snapshot.worldState);
    if (snapshot.worldState.gravityY !== undefined) {
      this.physicsSystem.setGravity(0, snapshot.worldState.gravityY, 0);
    }

    this.entityManager.clear();
    this.entityManager.deserializeAll(snapshot.entities);

    // Re-link core refs
    this.terrainEntity = this.entityManager.getEntity('ValidationTerrain') || this.entityManager.getEntitiesWithComponents(['Terrain'])[0] || null;
    this.cameraEntity = this.entityManager.getEntity('GodCamera') || this.entityManager.getEntitiesWithComponents(['Camera'])[0] || null;
    this.playerEntity = this.entityManager.getEntitiesWithComponents(['CharacterController'])[0] || null;

    // 🔥 Re-init Physics bodies (redundant due to deserializeAll but kept for safety)
    this.entityManager.getEntitiesWithComponents(['Physics']).forEach(e => this.physicsSystem.onEntityAdded(e));

    // 🔥 Force Camera Alignment: Prevent "Sky Freeze"
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam) {
        // Fix persisting 1.2.x state where maxDistance was 20
        if (cam.maxDistance < 200) cam.maxDistance = 200;

        // Ensure camera mode is valid
        if (!cam.mode) cam.mode = 'isometric';

        // If we have a player, re-bind to it for visual continuity
        if (this.playerEntity) {
          this.bindCamera(cam, this.playerEntity);
        }

        console.log('🔄 [Manager] Camera re-aligned and tracking re-linked.');
      }
    }
  }

  // ===================================================================================
  // 🎮 Placement System Implementations
  // ===================================================================================

  private async handleEnterPlacementMode(assetId: string, assetName: string) {
    this.handleCancelPlacement(); // 清理旧的放置状态

    const id = `Ghost_${assetName}_${Date.now()}`;
    const entity = this.entityManager.createEntity(`Ghost: ${assetName}`, id);
    entity.persistent = false;

    // 1. Transform
    const transform = new TransformComponent();
    this.entityManager.addComponent(id, transform);

    // 2. Visual (Ghost Style)
    const visual = new VisualComponent();
    visual.geometry = { type: 'custom', assetId: assetId };
    visual.material = {
      type: 'physical',
      color: '#00ffff', // 轨道青
      opacity: 0.5,
      transparent: true,
      metalness: 0.2,
      roughness: 0.2
    };
    visual.emissive = { color: '#00ffff', intensity: 1.0 };
    visual.postProcessing = { bloom: true, outline: true };
    this.entityManager.addComponent(id, visual);

    this.ghostEntityId = id;
    this.placementMode = 'model';
    this.currentPlacementAsset = { id: assetId, name: assetName, type: 'model' };

    // 🔥 初始化变换状态
    this.placementScale = 1.0; // TODO: 这里可以在 AssetRegistry 中读取模型原始尺寸来做归一化
    this.placementRotationY = 0;
    this.placementRotationX = false;

    console.log(`📡 [Placement] Entered Ghost Mode for model: ${assetName}`);
  }

  private async handleEnterImagePlacementMode(assetId: string, assetName: string) {
    this.handleCancelPlacement();

    const id = `Ghost_Image_${assetName}_${Date.now()}`;
    const entity = this.entityManager.createEntity(`Ghost Image: ${assetName}`, id);
    entity.persistent = false;

    const transform = new TransformComponent();
    this.entityManager.addComponent(id, transform);

    const visual = new VisualComponent();
    // 默认生成一个 1:1 的面片
    visual.geometry = { type: 'plane', parameters: { width: 4, height: 4 } };
    visual.material = {
      type: 'standard',
      color: '#ffffff',
      textureAssetId: assetId,
      opacity: 0.7,
      transparent: true
    };
    visual.emissive = { color: '#ffffff', intensity: 0.5 };
    visual.postProcessing = { bloom: true, outline: true };
    this.entityManager.addComponent(id, visual);

    this.ghostEntityId = id;
    this.placementMode = 'sticker'; // 图片默认进入贴纸模式 (贴地)
    this.currentPlacementAsset = { id: assetId, name: assetName, type: 'image' };

    // 🔥 初始化变换状态
    this.placementScale = 1.0;
    this.placementRotationY = 0;
    this.placementRotationX = false;

    console.log(`📡 [Placement] Entered Ghost Mode for image: ${assetName}`);
  }

  private handleTogglePlacementMode() {
    if (!this.ghostEntityId || !this.currentPlacementAsset) return;

    if (this.currentPlacementAsset.type === 'image') {
      const modes: Array<'sticker' | 'standee' | 'billboard'> = ['sticker', 'standee', 'billboard'];
      const currentIndex = modes.indexOf(this.placementMode as any);
      this.placementMode = modes[(currentIndex + 1) % modes.length];

      // 更新 Visual 组件以适应新模式
      const visual = this.entityManager.getEntity(this.ghostEntityId)?.getComponent<VisualComponent>('Visual');
      if (visual) {
        if (this.placementMode === 'standee') {
          visual.offset = [0, 2, 0]; // 立牌中心抬高
        } else {
          visual.offset = [0, 0, 0];
        }
      }

      console.log(`🔄 [Placement] Image mode toggled to: ${this.placementMode}`);
    }
  }

  private handleCancelPlacement() {
    if (this.ghostEntityId) {
      this.entityManager.destroyEntity(this.ghostEntityId);
      this.ghostEntityId = null;
    }
    this.currentPlacementAsset = null;
  }

  private handleCommitPlacement() {
    if (!this.ghostEntityId || !this.currentPlacementAsset) return;

    const ghost = this.entityManager.getEntity(this.ghostEntityId);
    if (!ghost) return;

    const transform = ghost.getComponent<TransformComponent>('Transform');
    const visual = ghost.getComponent<VisualComponent>('Visual');
    if (!transform || !visual) return;

    // 固化实体
    const solidId = `${this.currentPlacementAsset.name}_${Date.now()}`;
    const solidEntity = this.entityManager.createEntity(this.currentPlacementAsset.name, solidId);
    solidEntity.persistent = true;

    // 复制变换
    const solidTransform = new TransformComponent();
    solidTransform.position = [...transform.position];
    solidTransform.rotation = [...transform.rotation];
    solidTransform.scale = [this.placementScale, this.placementScale, this.placementScale]; // 🔥 应用最终缩放
    if (transform.quaternion) solidTransform.quaternion = [...transform.quaternion];
    this.entityManager.addComponent(solidId, solidTransform);

    // 复制视觉并去除幽灵效果
    const solidVisual = new VisualComponent();
    solidVisual.geometry = { ...visual.geometry };
    solidVisual.material = {
      ...visual.material,
      opacity: 1.0,
      transparent: visual.material.transparent || false, // 保留图片透明度
      color: this.currentPlacementAsset.type === 'model' ? '#ffffff' : visual.material.color
    };
    solidVisual.emissive = { color: '#000000', intensity: 0 };
    solidVisual.postProcessing = { bloom: false, outline: false };
    solidVisual.offset = visual.offset ? [...visual.offset] : [0, 0, 0];
    this.entityManager.addComponent(solidId, solidVisual);

    // 如果是模型，且非贴纸，可能需要物理碰撞
    if (this.currentPlacementAsset.type === 'model') {
      const solidPhysics = new PhysicsComponent('static');
      // 默认给个包围盒碰撞，未来可以基于模型数据生成更精准的
      solidPhysics.setCollider('box', [1, 1, 1], [0, 0, 0]);
      this.entityManager.addComponent(solidId, solidPhysics);
    }

    this.entityManager.addComponent(solidId, solidVisual);

    // 🔥 交互优化：放置后自动选中，方便微调
    const oldId = this.selectedEntityId;
    this.selectedEntityId = solidId;
    this.updateSelectionOutline(oldId, this.selectedEntityId);
    console.log(`✅ [Placement] Committed & Selected: ${solidId}`);

    // 退出放置模式，进入编辑模式
    this.handleCancelPlacement();
  }

  public isPlacing(): boolean {
    return this.ghostEntityId !== null;
  }

  private handlePlacementTick() {
    if (!this.ghostEntityId) return;

    // 🔥 性能优化：降低射线检测频率 (30Hz instead of 60Hz)
    this.tickCounter++;
    if (this.tickCounter % 2 !== 0) return;

    const ghost = this.entityManager.getEntity(this.ghostEntityId);
    const transform = ghost?.getComponent<TransformComponent>('Transform');
    const camSys = this.cameraSystem as any;
    if (!transform) return;

    // 🔥 交互革命：从 InputSystem 获取鼠标位置，从 CameraSystem 获取动态射线
    const mouse = this.inputSystem.mousePosition;
    const ray = this.cameraSystem.getRayFromScreen(mouse.x, mouse.y);
    if (!ray) return;

    // 实时射线检测以调整落位点
    let hitPos = [0, 0, 0] as [number, number, number];
    let hitNormal = [0, 1, 0];
    let isHit = false;

    if (this.physicsSystem) {
      const hit = this.physicsSystem.castRay(
        { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
        { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z },
        1000 // 探测半径
      ) as any;

      if (hit.hit) {
        hitPos = [hit.point.x, hit.point.y, hit.point.z];
        hitNormal = hit.normal ? [hit.normal.x, hit.normal.y, hit.normal.z] : [0, 1, 0];
        isHit = true;
      }
    }

    // 兜底：如果射线没碰到物体，则与 Y=0 平面相交
    if (!isHit) {
      if (ray.direction.y < -0.01) {
        const t = -ray.origin.y / ray.direction.y;
        if (t > 0) {
          hitPos = [
            ray.origin.x + ray.direction.x * t,
            0,
            ray.origin.z + ray.direction.z * t
          ];
          isHit = true;
        }
      }
    }

    if (isHit) {
      transform.position = [...hitPos];
      transform.scale = [this.placementScale, this.placementScale, this.placementScale];

      // 更新旋转逻辑 (三模态)
      if (this.placementMode === 'sticker') {
        const dummy = new THREE.Object3D();
        dummy.position.set(hitPos[0], hitPos[1], hitPos[2]);
        const targetNormal = new THREE.Vector3(hitNormal[0], hitNormal[1], hitNormal[2]);
        const lookAtPos = new THREE.Vector3().addVectors(dummy.position, targetNormal);
        dummy.lookAt(lookAtPos);
        const q = dummy.quaternion;
        transform.quaternion = [q.x, q.y, q.z, q.w];
        transform.rotation = [0, 0, 0];
      } else if (this.placementMode === 'standee') {
        const camPos = camSys.getCurrentPosition ? camSys.getCurrentPosition() : [0, 50, 50];
        const angle = Math.atan2(camPos[0] - hitPos[0], camPos[2] - hitPos[2]);
        transform.quaternion = undefined;
        transform.rotation = [0, angle * (180 / Math.PI) + this.placementRotationY, 0];
      } else if (this.placementMode === 'model') {
        transform.quaternion = undefined;
        transform.rotation = [this.placementRotationX ? -90 : 0, this.placementRotationY, 0];
      } else if (this.placementMode === 'billboard') {
        const dummy = new THREE.Object3D();
        dummy.position.set(hitPos[0], hitPos[1], hitPos[2]);
        const camPos = camSys.getCurrentPosition ? camSys.getCurrentPosition() : [0, 50, 50];
        dummy.lookAt(camPos[0], camPos[1], camPos[2]);
        const q = dummy.quaternion;
        transform.quaternion = [q.x, q.y, q.z, q.w];
        transform.rotation = [0, 0, 0];
      }

      transform.markLocalDirty();
    }
  }

  public getPhysicsDebugBuffers(): { vertices: Float32Array; colors: Float32Array } | null {
    if (!this.physicsSystem) return null;
    return this.physicsSystem.getDebugBuffers();
  }

  // --- Utility Handlers ---

  private handleApplyAssetToSelection(assetId: string, assetType: 'model' | 'image') {
    if (!this.selectedEntityId) return;
    const entity = this.entityManager.getEntity(this.selectedEntityId);
    if (!entity) return;

    const visual = entity.getComponent<VisualComponent>('Visual');
    if (!visual) return;

    if (assetType === 'model') {
      visual.geometry = { type: 'model', assetId };
    } else {
      // 图片作为贴图应用
      if (!visual.material) visual.material = { type: 'standard', color: '#ffffff' };
      visual.material.textureAssetId = assetId;
      visual.material.transparent = true;
    }

    console.log(`🎨 [Manager] Applied ${assetType} (${assetId}) to entity: ${this.selectedEntityId}`);
  }

  public getSelectedEntityId(): string | null {
    return this.selectedEntityId;
  }

  // 🔥 交互革新：统一入口处理点击与交互
  public handleInteraction(type: 'click' | 'rightClick', data: { x: number, y: number }) {
    if (this.currentContext !== ValidationContext.CREATION) return;

    // 1. 放置模式逻辑 (High Priority)
    if (this.ghostEntityId) {
      if (type === 'click') {
        this.handleCommitPlacement(); // 左键放置
      } else if (type === 'rightClick') {
        this.handleCancelPlacement(); // 右键取消
      }
      return;
    }

    // 2. 选择模式逻辑 (Selection)
    if (type === 'click') {
      this.performSelectionRaycast(data.x, data.y);
    }
  }

  private performSelectionRaycast(screenX: number, screenY: number) {
    if (!this.physicsSystem) return;

    const ray = this.cameraSystem.getRayFromScreen(screenX, screenY);
    if (!ray) return;

    const hit = this.physicsSystem.castRay(
      { x: ray.origin.x, y: ray.origin.y, z: ray.origin.z },
      { x: ray.direction.x, y: ray.direction.y, z: ray.direction.z },
      1000
    ) as any; // 🔥 使用 any 暂时绕过 IDE 的跨文件类型扫描延迟

    const oldId = this.selectedEntityId;

    if (hit.hit && hit.entityId) {
      // 排除地形的选中
      if (hit.entityId === this.terrainEntity?.id) {
        this.selectedEntityId = null;
      } else {
        this.selectedEntityId = hit.entityId;
        console.log(`🎯 [Selection] Picked entity: ${hit.entityId}`);
      }
    } else {
      this.selectedEntityId = null;
    }

    // 🔥 视觉反馈：更新 Outline 状态
    this.updateSelectionOutline(oldId, this.selectedEntityId);
  }

  /**
   * 更新选择高亮状态
   */
  private updateSelectionOutline(oldId: string | null, newId: string | null) {
    if (oldId === newId) return;

    // 清除旧的高亮
    if (oldId) {
      const entity = this.entityManager.getEntity(oldId);
      const visual = entity?.getComponent<VisualComponent>('Visual');
      if (visual) {
        visual.postProcessing.outline = false;
      }
    }

    // 开启新的高亮
    if (newId) {
      const entity = this.entityManager.getEntity(newId);
      const visual = entity?.getComponent<VisualComponent>('Visual');
      if (visual) {
        visual.postProcessing.outline = true;
      }
    }

    // 🔥 性能修复 (2026-01-01): 通知渲染层更新 Outline
    // EngineBridge 订阅此事件后，会在下一帧收集需要 outline 的 Object3D 并发射 OUTLINE_UPDATE
    eventBus.emit('SELECTION_CHANGED', { oldId, newId });
  }

  public handleDeleteSelectedEntity() {
    if (!this.selectedEntityId) return;

    // 禁止删除核心实体
    if (this.selectedEntityId === this.terrainEntity?.id || this.selectedEntityId === this.cameraEntity?.id) {
      return;
    }

    console.log(`🗑️ [Manager] Deleting entity: ${this.selectedEntityId}`);
    this.entityManager.destroyEntity(this.selectedEntityId);
    this.selectedEntityId = null;
  }

  /**
   * ⌨️ 键盘交互核心：处理编辑器快捷键 (ESC, R, [, ])
   */
  private handleKeyboardInputs() {
    if (!this.inputSystem) return;

    // 1. ESC: 取消放置或取消选中
    if (this.inputSystem.isActionPressed('CANCEL_PLACEMENT')) {
      if (this.isPlacing()) {
        this.handleCancelPlacement();
        console.log('⌨️ [Keyboard] Placement Cancelled');
      } else if (this.selectedEntityId) {
        const oldId = this.selectedEntityId;
        this.selectedEntityId = null;
        this.updateSelectionOutline(oldId, null);
        console.log('⌨️ [Keyboard] Selection Cleared');
      }
    }

    // 2. ENTER: 确认放置
    if (this.inputSystem.isActionPressed('COMMIT_PLACEMENT')) {
      if (this.isPlacing()) {
        this.handleCommitPlacement();
        console.log('⌨️ [Keyboard] Placement Committed');
      }
    }

    // 3. R: 旋转当前 Ghost 或 选中物体
    if (this.inputSystem.isActionPressed('ROTATE_ENTITY')) {
      if (this.isPlacing()) {
        this.dispatch({ type: EngineCommandType.ROTATE_PLACEMENT, axis: 'y' } as any);
      } else if (this.selectedEntityId) {
        const entity = this.entityManager.getEntity(this.selectedEntityId);
        const transform = entity?.getComponent<TransformComponent>('Transform');
        if (transform) {
          transform.rotation[1] = (transform.rotation[1] + 90) % 360;
          transform.markLocalDirty();
          console.log(`⌨️ [Keyboard] Rotating Selected Entity: ${transform.rotation[1]}°`);
        }
      }
    }

    // 4. [ / ]: 缩放
    if (this.inputSystem.isActionPressed('SCALE_UP')) {
      this.adjustKeyboardScale(0.1);
    }
    if (this.inputSystem.isActionPressed('SCALE_DOWN')) {
      this.adjustKeyboardScale(-0.1);
    }
  }

  private adjustKeyboardScale(delta: number) {
    if (this.isPlacing()) {
      this.dispatch({ type: EngineCommandType.SCALE_PLACEMENT, delta } as any);
    } else if (this.selectedEntityId) {
      const entity = this.entityManager.getEntity(this.selectedEntityId);
      const transform = entity?.getComponent<TransformComponent>('Transform');
      const physics = entity?.getComponent<PhysicsComponent>('Physics');

      if (transform) {
        const oldScale = transform.scale[0];
        const newScale = Math.max(0.1, oldScale + delta);
        const scaleRatio = newScale / oldScale;

        // 1. 更新视觉缩放
        transform.scale = [newScale, newScale, newScale];
        transform.markLocalDirty();

        // 2. 🔥 同步物理碰撞盒尺寸 (解决缩放后检测不匹配问题)
        if (physics && this.physicsSystem) {
          const currentSize = physics.collider.size;
          physics.collider.size = [
            currentSize[0] * scaleRatio,
            currentSize[1] * scaleRatio,
            currentSize[2] * scaleRatio
          ];
          // 重建物理体以应用新尺寸
          this.physicsSystem.rebuildBody(this.selectedEntityId);
        }

        console.log(`⌨️ [Keyboard] Scaling Selected Entity: ${newScale.toFixed(2)} (Collider synced)`);
      }
    }
  }

  private async seedDefaultAssets(): Promise<void> {
    try {
      // 1. 生成渐变贴图 (Gradient Texture)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grd = ctx.createLinearGradient(0, 0, 512, 512);
        grd.addColorStop(0, '#0f172a');
        grd.addColorStop(1, '#0891b2');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PolyForge', 256, 256);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await this.assetRegistry.registerAsset({
              name: 'Default HoloTexture',
              type: 'texture' as any,
              category: 'textures',
              tags: ['system', 'default', 'holo'],
              size: blob.size
            }, blob);
          }
        }, 'image/png');
      }

      // 2. 生成沉默音频 (Silent Audio)
      const wavHeader = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
        0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
        0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
      ]);
      const audioBlob = new Blob([wavHeader], { type: 'audio/wav' });
      await this.assetRegistry.registerAsset({
        name: 'System Silence',
        type: 'audio' as any,
        category: 'audio',
        tags: ['system', 'default'],
        size: audioBlob.size
      }, audioBlob);

      // 3. 标记完成
      console.log('🌱 [Seeding] Default assets injected.');

    } catch (e) {
      console.warn('🌱 [Seeding] Failed to seed default assets:', e);
    }
  }
}


