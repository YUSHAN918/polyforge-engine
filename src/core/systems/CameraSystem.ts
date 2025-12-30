/**
 * PolyForge v1.3.0 CameraSystem
 * Phase 10: 相机系统
 * 
 * 功能：
 * - 多模态相机切换（Orbit, FirstPerson, ThirdPerson, Isometric, Sidescroll）
 * - 平滑跟随和过渡
 * - 参数自定义和持久化
 * - 碰撞检测（可选）
 */

import type { System, Entity } from '../types';
import { TransformComponent } from '../components/TransformComponent';
import * as THREE from 'three';
import { CameraComponent, type CameraMode, type CameraSnapshot } from '../components/CameraComponent';
import { ICameraStrategy } from './camera_strategies/ICameraStrategy';
import { IsometricStrategy } from './camera_strategies/IsometricStrategy';
import { OrbitStrategy } from './camera_strategies/OrbitStrategy';
import { FirstPersonStrategy } from './camera_strategies/FirstPersonStrategy';
import { ThirdPersonStrategy } from './camera_strategies/ThirdPersonStrategy';
import { SidescrollStrategy } from './camera_strategies/SidescrollStrategy';
import { CameraPresetManager } from './CameraPresetManager';
import { ArchitectureValidationManager, ValidationContext } from '../ArchitectureValidationManager';

/**
 * 相机状态（用于平滑过渡）
 */
interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
  pivot: [number, number, number]; // 🔥 Add Pivot for smooth panning
  fov: number;
}

/**
 * CameraSystem 相机系统
 * 负责相机的更新、跟随和模式切换
 */
export class CameraSystem implements System {
  public readonly name = 'CameraSystem';
  public readonly priority = 150;  // 在物理系统之后
  public enabled = true;
  public readonly requiredComponents = ['Camera', 'Transform'];

  // 🆕 预设管理器
  public presetManager: CameraPresetManager | null = null;

  // 当前相机状态（用于平滑插值）
  private currentState: CameraState = {
    position: [0, 5, 10],
    rotation: [0, 0, 0],
    pivot: [0, 0, 0],
    fov: 60,
  };

  // 目标相机状态
  private targetState: CameraState = {
    position: [0, 5, 10],
    rotation: [0, 0, 0],
    pivot: [0, 0, 0],
    fov: 60,
  };

  // 🎮 输入系统引用
  private inputSystem: any = null;  // InputSystem 实例

  // 🌍 物理系统引用
  private physicsSystem: any = null;

  // 🏛️ 实体管理器引用 (Required for target lookup across filtered lists)
  private entityManager: any = null;

  // 🆕 架构管理器引用
  private manager: ArchitectureValidationManager | null = null;

  // 🎥 R3F 相机引用（直接控制）
  private r3fCamera: any = null;

  // 🔥 缓存当前活跃相机引用 (For external query like getMode)
  private currentCameraComponent: any = null;

  // 🛡️ Strategy Map & State Memo
  private strategies: Map<CameraMode, ICameraStrategy> = new Map();
  private cameraModeMap: Map<string, CameraMode> = new Map();

  constructor() {
    this.strategies.set('isometric', new IsometricStrategy());
    this.strategies.set('orbit', new OrbitStrategy());
    this.strategies.set('firstPerson', new FirstPersonStrategy());
    this.strategies.set('thirdPerson', new ThirdPersonStrategy());
    this.strategies.set('sidescroll', new SidescrollStrategy());
  }

  /**
   * 系统初始化
   */
  public initialize(entityManager: any): void {
    this.entityManager = entityManager;
    console.log('🎥 CameraSystem: EntityManager reference linked');
  }

  /**
   * 设置架构管理器引用并初始化预设系统
   */
  public setArchitectureManager(manager: ArchitectureValidationManager): void {
    this.manager = manager;
    if (this.entityManager) {
      this.presetManager = new CameraPresetManager(this, this.entityManager, manager);
      console.log('🎥 CameraSystem: CameraPresetManager initialized');
    }
  }

  /**
   * 获取指定的相机策略
   */
  public getStrategy(mode: CameraMode): ICameraStrategy | undefined {
    return this.strategies.get(mode);
  }

  /**
   * 设置输入系统引用
   */
  public setInputSystem(inputSystem: any): void {
    this.inputSystem = inputSystem;
  }

  /**
   * 设置 R3F 相机引用（直接控制）
   */
  public setR3FCamera(camera: any): void {
    this.r3fCamera = camera;
    console.log('🎥 CameraSystem: R3F camera reference set');
  }

  /**
   * System 接口：实体添加回调
   */
  public onEntityAdded(entity: Entity): void {
    // 相机实体添加时初始化状态
    const camera = entity.getComponent<CameraComponent>('Camera');
    const transform = entity.getComponent<TransformComponent>('Transform');

    if (camera && transform) {
      this.currentState.position = [...transform.position];
      this.currentState.rotation = [...transform.rotation];
      this.currentState.pivot = [...camera.pivotOffset]; // Init pivot
      this.currentState.fov = camera.fov;

      this.targetState.position = [...transform.position];
      this.targetState.rotation = [...transform.rotation];
      this.targetState.pivot = [...camera.pivotOffset];
      this.targetState.fov = camera.fov;
    }
  }

  /**
   * System 接口：实体移除回调
   */
  public onEntityRemoved(entity: Entity): void {
    this.cameraModeMap.delete(entity.id);
  }

  /**
   * System 接口：更新
   */
  public update(deltaTime: number, entities?: Entity[]): void {
    if (!entities || entities.length === 0) {
      // 静默处理，不输出日志
      return;
    }

    for (const entity of entities) {
      const camera = entity.getComponent<CameraComponent>('Camera');
      const transform = entity.getComponent<TransformComponent>('Transform');

      if (!camera || !transform || !camera.enabled) continue;

      // 🔥 缓存当前活跃相机引用 (供 UI 查询)
      this.currentCameraComponent = camera;

      // 🔄 Per-Camera Strategy Switch
      // 使用 cameraModeMap 记忆每个相机的模式，防止多相机干扰
      const lastMode = this.cameraModeMap.get(entity.id);
      const strategy = this.strategies.get(camera.mode) || this.strategies.get('orbit')!;

      if (camera.mode !== lastMode) {
        // Mode changed for this specific camera
        if (lastMode) {
          const prevStrategy = this.strategies.get(lastMode);
          if (prevStrategy) prevStrategy.exit(camera);
        }
        strategy.enter(camera);
        this.cameraModeMap.set(entity.id, camera.mode);
        // console.log(`🎥 Camera ${entity.id} switched to: ${camera.mode}`);
      }

      // 1. Handle Strategy Input (Camera Control)
      if (this.inputSystem) {
        strategy.handleInput(camera, this.inputSystem, deltaTime);
      }

      // 2. Global Character Control (Physics)
      // 🔥 仅当明确有被控制实体时才处理 WASD 移动（避免无角色时的输入污染）
      const controlledId = camera.controlledEntityId;
      if (controlledId) {
        if (camera.mode === 'isometric') {
          this.updateLegacyCharacterControl(camera, controlledId, deltaTime); // 🔒 LOCKED
        } else {
          this.updateCharacterControl(camera, controlledId, deltaTime); // 🚀 Active Dev
        }
      }

      // 3. Update Target State
      let targetEntity = (camera.targetEntityId && this.entityManager)
        ? this.entityManager.getEntity(camera.targetEntityId)
        : null;

      // 🆕 角色删除自动回退检测 (Task 1.5)
      if (camera.targetEntityId && !targetEntity) {
        if (this.manager?.getContext() === ValidationContext.EXPERIENCE && camera.mode !== 'orbit') {
          // 体验模式：触发回退
          console.log(`[CameraSystem] Target entity ${camera.targetEntityId} lost. Falling back...`);
          this.presetManager?.fallbackToSafePreset(camera);
        } else {
          // 创造模式：静默清理
          camera.targetEntityId = null;
        }
      }

      const result = strategy.updateTarget(camera, targetEntity, deltaTime);

      this.targetState.position = result.position;
      this.targetState.rotation = result.rotation;
      this.targetState.pivot = result.pivot;
      this.targetState.fov = result.fov;

      // 4. Smooth Update & Apply
      this.smoothUpdate(camera, transform, deltaTime);
    }

    // 🏁 Input Cycle Termination (Safety Anchor)
    // 根据制作人规约，输入重置必须位于整个相机链条的最末端
    if (this.inputSystem) this.inputSystem.resetFrameData();
  }

  /**
   * 获取当前相机模式 (供 UI/EngineBridge 使用)
   */
  public getMode(): CameraMode {
    return this.currentCameraComponent?.mode || 'orbit';
  }

  /**
   * 获取当前相机世界坐标 (供 Spawn 使用)
   */
  public getCurrentPosition(): [number, number, number] {
    return [...this.currentState.position];
  }

  /**
   * 获取当前相机聚焦中心点 (供 Spawn 使用)
   */
  public getCurrentPivot(): [number, number, number] {
    return [...this.currentState.pivot];
  }

  // 注入依赖
  public setEntityManager(em: any) { this.entityManager = em; }
  public setPhysicsSystem(ps: any) { this.physicsSystem = ps; }

  /**
   * 🛡️ LOCKED LEGACY CONTROL (ISO)
   * 严禁修改此方法，除非为了修复 ISO 模式的重大 Bug。
   * 此逻辑复制自 v1.3.0 早期版本，确保手感一致。
   */
  private updateLegacyCharacterControl(camera: CameraComponent, entityId: string, deltaTime: number): void {
    const targetEntity = this.entityManager?.getEntity(entityId);
    if (!targetEntity) return;

    // ISO standard: Camera Pitch 45, Yaw 45.
    // WASD should act in Screen Space or World Space?
    // Originally: Based on Camera Yaw.
    const moveYaw = camera.yaw * Math.PI / 180;
    const sin = Math.sin(moveYaw);
    const cos = Math.cos(moveYaw);

    let dx = 0;
    let dz = 0;

    // Use raw keys for safety
    const pressedKeys = this.inputSystem?.pressedKeys || new Set();
    const isForward = this.inputSystem?.isActionPressed('MOVE_FORWARD') || pressedKeys.has('w');
    const isBackward = this.inputSystem?.isActionPressed('MOVE_BACKWARD') || pressedKeys.has('s');
    const isLeft = this.inputSystem?.isActionPressed('MOVE_LEFT') || pressedKeys.has('a');
    const isRight = this.inputSystem?.isActionPressed('MOVE_RIGHT') || pressedKeys.has('d');

    if (isForward) { dx -= sin; dz -= cos; }
    if (isBackward) { dx += sin; dz += cos; }
    if (isLeft) { dx -= cos; dz += sin; }
    if (isRight) { dx += cos; dz -= sin; }

    // Normalize
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length > 0.001) {
      dx /= length;
      dz /= length;
    }

    const speed = camera.moveSpeed || 10.0;

    const physics = (targetEntity as Entity).getComponent('Physics');
    if (physics && this.physicsSystem) {
      const body = (this.physicsSystem as any).getRigidBody((targetEntity as Entity).id);
      let currentY = 0;
      if (body) {
        currentY = body.linvel().y;
      }
      (this.physicsSystem as any).setEntityVelocity(
        (targetEntity as Entity).id,
        [dx * speed, currentY, dz * speed]
      );
    } else {
      const t = (targetEntity as Entity).getComponent<TransformComponent>('Transform');
      if (t) {
        t.position[0] += dx * speed * deltaTime;
        t.position[2] += dz * speed * deltaTime;
        t.markLocalDirty();
      }
    }
  }

  /**
   * 🚀 Modern Character Control (FPS/TPS)
   * 正在积极开发中
   */
  private updateCharacterControl(camera: CameraComponent, entityId: string, deltaTime: number): void {
    const targetEntity = this.entityManager?.getEntity(entityId);
    if (!targetEntity) return;

    // Sidescroll override
    if (camera.mode === 'sidescroll') {
      let dx = 0;
      if (this.inputSystem.isActionPressed('MOVE_LEFT')) dx = -1;
      if (this.inputSystem.isActionPressed('MOVE_RIGHT')) dx = 1;

      // DEBUG: Verify input
      // if (dx !== 0) console.log(`[Sidescroll] Input: ${dx}`);

      const speed = camera.moveSpeed || 15.0;

      // Physics
      if (this.physicsSystem) {
        const body = (this.physicsSystem as any).getRigidBody(targetEntity.id);
        let currentY = 0;
        if (body) currentY = body.linvel().y;

        // 🔥 Apply velocity
        (this.physicsSystem as any).setEntityVelocity(targetEntity.id, [dx * speed, currentY, 0]); // Lock Z
      }
      return;
    }

    // FPS/TPS Logic (Yaw Based)
    const moveYaw = camera.yaw * Math.PI / 180;
    const sin = Math.sin(moveYaw);
    const cos = Math.cos(moveYaw);

    let dx = 0;
    let dz = 0;

    const pressedKeys = this.inputSystem?.pressedKeys || new Set();
    const isForward = this.inputSystem?.isActionPressed('MOVE_FORWARD') || pressedKeys.has('w');
    const isBackward = this.inputSystem?.isActionPressed('MOVE_BACKWARD') || pressedKeys.has('s');
    const isLeft = this.inputSystem?.isActionPressed('MOVE_LEFT') || pressedKeys.has('a');
    const isRight = this.inputSystem?.isActionPressed('MOVE_RIGHT') || pressedKeys.has('d');

    if (isForward) { dx -= sin; dz -= cos; }
    if (isBackward) { dx += sin; dz += cos; }
    if (isLeft) { dx -= cos; dz += sin; }
    if (isRight) { dx += cos; dz -= sin; }

    // Interlock for FPS
    if (camera.mode === 'firstPerson') {
      if (typeof document !== 'undefined' && !document.pointerLockElement) return;
    }

    const length = Math.sqrt(dx * dx + dz * dz);
    if (length > 0.001) {
      dx /= length;
      dz /= length;
    }

    const speed = camera.moveSpeed || 10.0;

    if (this.physicsSystem) {
      const body = (this.physicsSystem as any).getRigidBody(targetEntity.id);
      let currentY = 0;
      if (body) {
        currentY = body.linvel().y;
      }
      (this.physicsSystem as any).setEntityVelocity(
        targetEntity.id,
        [dx * speed, currentY, dz * speed]
      );
    }
  }

  /**
   * 平滑更新相机状态
   */
  private smoothUpdate(camera: CameraComponent, transform: TransformComponent, deltaTime: number): void {
    // 🔥 FPS Hard-Lock (Instant)
    // First-person view must be 1:1 sync with body, no smoothing allowed for position.
    let t = Math.min(1, (camera.smoothSpeed || 10.0) * deltaTime);

    if (camera.mode === 'firstPerson') {
      t = 1.0;
    } else {
      // 🚀 Adaptive Damping (Catch-up mechanism)
      // If lag is too large (high speed), increase t to prevent leaving screen
      const dx = this.targetState.position[0] - this.currentState.position[0];
      const dy = this.targetState.position[1] - this.currentState.position[1];
      const dz = this.targetState.position[2] - this.currentState.position[2];
      const sqDist = dx * dx + dy * dy + dz * dz;

      // Threshold: 0.25 (0.5m) -> Accelerate
      // 🔥 修复：Orbit 模式下禁用"追赶"机制，保证电影级平滑阻尼（防止滚轮缩放时瞬移）
      if (sqDist > 0.25 && camera.mode !== 'orbit') {
        // Logarithmic boost: larger error = faster Lerp
        // Max t can go up to 0.8 or 1.0
        const boost = Math.min(1.0, sqDist * 0.1);
        t = Math.max(t, 0.1 + boost);
      }
    }

    // 位置插值
    this.currentState.position[0] = this.lerp(this.currentState.position[0], this.targetState.position[0], t);
    this.currentState.position[1] = this.lerp(this.currentState.position[1], this.targetState.position[1], t);
    this.currentState.position[2] = this.lerp(this.currentState.position[2], this.targetState.position[2], t);

    // 旋转插值
    this.currentState.rotation[0] = this.lerp(this.currentState.rotation[0], this.targetState.rotation[0], t);
    this.currentState.rotation[1] = this.lerpAngle(this.currentState.rotation[1], this.targetState.rotation[1], t);
    this.currentState.rotation[2] = this.lerp(this.currentState.rotation[2], this.targetState.rotation[2], t);

    // 🔥 Pivot 插值 (消除平移时的旋转抖动)
    // Pivot should match Position sync logic
    this.currentState.pivot[0] = this.lerp(this.currentState.pivot[0], this.targetState.pivot[0], t);
    this.currentState.pivot[1] = this.lerp(this.currentState.pivot[1], this.targetState.pivot[1], t);
    this.currentState.pivot[2] = this.lerp(this.currentState.pivot[2], this.targetState.pivot[2], t);

    // FOV 插值
    this.currentState.fov = this.lerp(this.currentState.fov, this.targetState.fov, t);

    // 应用到 Transform
    transform.position = [...this.currentState.position];
    transform.rotation = [...this.currentState.rotation];
    transform.markLocalDirty();

    // 🔥 核物理隔离：强制矩阵覆盖（直接操控 R3F 相机）
    if (this.r3fCamera) {
      // 🔥 强制设置位置
      this.r3fCamera.position.set(
        this.currentState.position[0],
        this.currentState.position[1],
        this.currentState.position[2]
      );

      // 🔄 LookAt vs Euler Decision
      // Orbit, Isometric, ThirdPerson: 必须注视轴心点以保证地心引力般的稳固
      if (camera.mode === 'orbit' || camera.mode === 'isometric' || camera.mode === 'thirdPerson') {
        this.r3fCamera.lookAt(
          this.currentState.pivot[0],
          this.currentState.pivot[1],
          this.currentState.pivot[2]
        );
      } else {
        // FPS/Sidescroll/Generic: 使用欧拉角旋转
        this.r3fCamera.rotation.set(
          THREE.MathUtils.degToRad(this.currentState.rotation[0]),
          THREE.MathUtils.degToRad(this.currentState.rotation[1]),
          THREE.MathUtils.degToRad(this.currentState.rotation[2]),
          'YXZ'
        );
      }

      // 🔥 强制更新 FOV
      this.r3fCamera.fov = this.currentState.fov;
      this.r3fCamera.updateProjectionMatrix();
    }
  }

  /**
   * 线性插值
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * 角度插值（处理 360 度循环）
   */
  private lerpAngle(a: number, b: number, t: number): number {
    let delta = b - a;

    // 处理角度循环
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    return a + delta * t;
  }

  /**
   * 获取 Socket 的世界位置
   */
  private getSocketWorldPosition(entity: Entity, socketName: string): [number, number, number] {
    const socket = entity.getSocket(socketName);
    if (!socket) return [0, 0, 0];

    const transform = entity.getComponent<TransformComponent>('Transform');
    if (!transform) return [0, 0, 0];

    const worldPos = transform.getWorldPosition();
    const socketLocal = socket.localTransform.position;

    // 简化：直接加上本地偏移（完整实现需要矩阵变换）
    return [
      worldPos[0] + socketLocal[0],
      worldPos[1] + socketLocal[1],
      worldPos[2] + socketLocal[2],
    ];
  }

  /**
   * 切换相机模式（带平滑过渡）
   */
  public switchMode(camera: CameraComponent, newMode: CameraMode): void {
    if (camera.mode === newMode) return;

    camera.mode = newMode;
    // Transition logic handled by Strategy Enter/Exit // this.isTransitioning = true;

    console.log(`📷 Camera mode switched to: ${newMode}`);
  }

  /**
   * 获取相机快照
   */
  public getCameraSnapshot(camera: CameraComponent): CameraSnapshot {
    return camera.getSnapshot();
  }

  /**
   * 应用相机快照
   */
  public applySnapshot(camera: CameraComponent, snapshot: CameraSnapshot): void {
    camera.applySnapshot(snapshot);
    console.log(`📷 Camera snapshot applied: ${snapshot.mode} `);
  }

  /**
   * 全局设置相机模式（用于架构验证）
   */
  public setMode(mode: CameraMode): void {
    if (this.currentCameraComponent) {
      this.switchMode(this.currentCameraComponent, mode);
    }
  }

  /**
   * 全局设置 FOV
   */
  public setFOV(fov: number): void {
    if (this.currentCameraComponent) {
      this.currentCameraComponent.fov = fov;
    }
  }


}
