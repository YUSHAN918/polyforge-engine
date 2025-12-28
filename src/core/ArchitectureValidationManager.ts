/**
 * PolyForge v1.3.0 - ArchitectureValidationManager
 * 架构验证观测窗口 - 核心管理器 (Shadow Engine Core)
 *
 * "Guard Rail Implementation" - 严格遵循影子架构。
 * UI 只能通过 dispatch(command) 与此管理器交互。
 */

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
import { CommandManager } from './CommandManager';
import { ArchitectureStorageManager } from './ArchitectureStorageManager';
import { BundleSystem } from './bundling/BundleSystem';
import { IArchitectureFacade, ValidationStats } from './IArchitectureFacade';
import { EngineCommand, EngineCommandType } from './EngineCommand';

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
    this.bundleSystem = new BundleSystem(this.entityManager, this.assetRegistry, this.serializationService);

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
    this.assetRegistry.initialize().then(() => console.log('📦 Assets Initialized'));

    // 7. Auto Recovery
    this.tryRestoreOrInit();
  }

  private tryRestoreOrInit() {
    const savedState = this.storageManager.load();
    if (savedState) {
      this.restoreFromSnapshot(savedState);
    } else {
      this.initializeScene();
    }
  }

  // ===================================================================================
  // 🛡️ The God's Law: Dispatch Implementation
  // ===================================================================================

  public async dispatch(command: EngineCommand): Promise<void> {
    // console.log(`⚡ Dispatching: ${command.type}`, command); // Debug log
    // 记录到历史栈 (除了 UNDO/REDO)
    if (command.type !== EngineCommandType.UNDO && command.type !== EngineCommandType.REDO) {
      // ⚠️ FIXME: EngineCommand is a raw data payload, not an ICommand object with execute/undo methods.
      // We cannot pass it directly to CommandManager. To support Undo/Redo for these, we need to wrap them.
      // this.commandManager.execute(command);
    }

    // 执行命令
    switch (command.type) {
      // --- Environment ---
      case EngineCommandType.SET_TIME_OF_DAY:
        // Set time but DO NOT auto-update lighting yet to prevent override
        // logic moved to check 'autoUpdateLighting' flag if needed, 
        // but currently we just set state.
        this.worldStateManager.setTimeOfDay(command.hour);
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
        this.worldStateManager.setGravity(command.value);
        this.physicsSystem.setGravity(0, command.value, 0); // Sync Physics
        break;

      // --- Camera ---
      case EngineCommandType.SET_CAMERA_MODE:
        this.setCameraMode(command.mode);
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
        this.spawnPhysicsBox();
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
      case EngineCommandType.UNDO:
        this.commandManager.undo();
        break;
      case EngineCommandType.REDO:
        this.commandManager.redo();
        break;
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
    }
  }

  // ===================================================================================
  // 🔍 Getters (ReadOnly / Safe Refs)
  // ===================================================================================

  public getEnvironmentState(): WorldState {
    return this.worldStateManager.getState();
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
      physicsBodies: this.physicsSystem.getStats().totalBodies
    };
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

  public getPhysicsDebugBuffers(): { vertices: Float32Array; colors: Float32Array } | null {
    return this.physicsSystem.getDebugBuffers();
  }

  public dispose(): void {
    this.clock.pause();
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
    });

    // Update Context
    if (mode === 'orbit') {
      this.currentContext = ValidationContext.CREATION;
      this.inputSystem.popContext(); // Ensure clean slate
      this.inputSystem.pushContext('orbit');

      // Optional: Despawn player when going back to orbit? 
      // User didn't ask, but it might be cleaner. Keeping it simple for now.
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
    this.playerEntity = entity;

    // 1. Transform
    const transform = new TransformComponent();
    transform.position = [0, 5, 0]; // Drop from sky
    this.entityManager.addComponent(entity.id, transform);

    // 2. Physics (Dynamic Capsule)
    const physics = new PhysicsComponent('dynamic');
    physics.setCollider('capsule', [0.5, 1, 0], [0, 0.5, 0]);
    physics.mass = 1.0;
    physics.lockRotation = [true, false, true];
    physics.friction = 0.5;
    this.entityManager.addComponent(entity.id, physics);
    physics.isCharacterController = true; // Enable CharacterController Logic

    // 3. Visual (Green Glowing Capsule -> Cylinder Proxy)
    const visual = new VisualComponent();
    visual.geometry = { type: 'cylinder', parameters: { radius: 0.5, height: 1 } };
    visual.material = { type: 'standard', color: '#00ff00', roughness: 0.3 };
    visual.emissive = { color: '#00ff00', intensity: 2.0 };
    visual.castShadow = true;
    this.entityManager.addComponent(entity.id, visual);

    // 4. Sockets (Head for FPS)
    entity.addSocket({
      name: 'Head',
      localTransform: {
        position: [0, 0.8, 0],
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

    // Zoom In to 35
    cam.distance = 35;

    // Switch to ISO if in Orbit
    if (cam.mode === 'orbit') cam.mode = 'isometric';

    console.log('📷 Camera Bound & Zoomed-In to 35');
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
    cam.mode = 'orbit';
    console.log('🔓 Camera Unbound & Zoomed-Out to 100');
  }

  public getSpawnButtonState(): 'Spawn' | 'Bind' | 'Unbind' {
    if (!this.playerEntity) return 'Spawn';
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam && cam.targetEntityId === this.playerEntity.id) return 'Unbind';
    }
    return 'Bind';
  }

  private despawnPlayerCharacter() {
    if (!this.playerEntity) return;

    // Unlink Camera first
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam) {
        if (cam.targetEntityId === this.playerEntity.id) {
          cam.targetEntityId = null;
        }
        if (cam.controlledEntityId === this.playerEntity.id) {
          cam.controlledEntityId = null;
        }
        // Restore distance on despawn
        cam.distance = 100;
        // Maybe reset lookat?
      }
    }

    this.entityManager.destroyEntity(this.playerEntity.id);
    this.playerEntity = null;
    console.log('👋 Despawning Player Character');
  }

  private toggleFlightMode(enabled: boolean) {
    if (!this.playerEntity) return;

    // Physics Component
    const physics = this.playerEntity.getComponent<PhysicsComponent>('Physics');
    if (physics) {
      physics.useGravity = !enabled; // Flight = No Gravity
      physics.linearDamping = enabled ? 5.0 : 0.01; // High damping for air control

      // Update Rapier
      const rigidBody = this.physicsSystem.getRigidBody(this.playerEntity.id);
      if (rigidBody) {
        rigidBody.setGravityScale(enabled ? 0.0 : 1.0, true);
        rigidBody.setLinearDamping(enabled ? 5.0 : 0.0); // Keep damping consistent for now? Or user preference.

        if (enabled) {
          // 🔥 Lift off!
          const currentPos = rigidBody.translation();
          rigidBody.setTranslation({ x: currentPos.x, y: currentPos.y + 1.5, z: currentPos.z }, true);
          rigidBody.setLinvel({ x: 0, y: 2, z: 0 }, true); // Gentle upward impulse
        }
      }
    }
    console.log(`✈️ Flight Mode: ${enabled ? 'ON' : 'OFF'}`);
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
  }

  private spawnPhysicsBox() {
    const id = `GravityCube_${Date.now()}`;
    // 🔥 复原：使用 GravityCube 作为名称，建立更强的业务关联
    const entity = this.entityManager.createEntity('GravityCube', id);

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
    const bundle = await this.bundleSystem.createBundle({ name, author: 'User', description: 'Exported' });
    bundle.manifest.sceneData.worldState = this.worldStateManager.getState();
    const json = await this.bundleSystem.packToJSON(bundle);

    // Trigger Download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}_${Date.now()}.pfb`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async importBundle(file: File) {
    const json = await file.text();
    const manifest = await this.bundleSystem.loadBundle(json);
    this.restoreFromSnapshot({
      worldState: manifest.sceneData.worldState,
      entities: manifest.sceneData.entities
    });
    this.storageManager.save();
  }

  // --- Scene Logic ---

  public update(): void {
    this.systemManager.updateManual(1 / 60); // 🔥 Fixed: usage of updateManual as per Stability Strike

    // Auto Save
    if (Date.now() - this.lastSaveTime > this.autoSaveInterval) {
      this.storageManager.save();
      this.lastSaveTime = Date.now();
    }
  }

  public start(): void {
    this.clock.start();
    this.inputSystem.pushContext('orbit');
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
    tPhys.setCollider('box', [50, 2, 50], [0, -1, 0]);
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

    // Re-init Physics bodies
    this.entityManager.getEntitiesWithComponents(['Physics']).forEach(e => this.physicsSystem.onEntityAdded(e));

    // 🔥 Force Upgrade: Fix persisting 1.2.x state where maxDistance was 20
    if (this.cameraEntity) {
      const cam = this.cameraEntity.getComponent<CameraComponent>('Camera');
      if (cam && cam.maxDistance < 200) {
        cam.maxDistance = 200;
        console.log('🔄 [Manager] Upgraded camera maxDistance to 200 for persisted state');
      }
    }
  }
}
