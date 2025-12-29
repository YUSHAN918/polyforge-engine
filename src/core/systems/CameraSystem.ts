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

  // 🎥 R3F 相机引用（直接控制）
  private r3fCamera: any = null;

  // 🔥 缓存当前活跃相机引用 (For external query like getMode)
  private currentCameraComponent: any = null;

  // 🛡️ Strategy Map
  private strategies: Map<CameraMode, ICameraStrategy> = new Map();
  private currentStrategy: ICameraStrategy | null = null;
  private lastMode: CameraMode | null = null;

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
    // 相机移除时清理
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

      // 🔥 缓存当前活跃相机引用
      this.currentCameraComponent = camera;

      // 🔄 Strategy Switch
      if (camera.mode !== this.lastMode) {
        if (this.currentStrategy) this.currentStrategy.exit(camera);
        this.currentStrategy = this.strategies.get(camera.mode) || this.strategies.get('orbit')!;
        this.currentStrategy.enter(camera);
        this.lastMode = camera.mode;
        // console.log(`🎥 Switched to Strategy: ${camera.mode}`);
      }

      const strategy = this.currentStrategy;
      if (!strategy) continue; // Should not happen

      // 1. Handle Strategy Input (Camera Control)
      if (this.inputSystem) {
        strategy.handleInput(camera, this.inputSystem, deltaTime);
      }

      // 2. Global Character Control (Physics)
      // 🔥 ISO Mode is LOCKED to Legacy Control to prevent regressions
      // 🔥 Other modes use the new Physics Control
      const controlledId = camera.controlledEntityId || camera.targetEntityId;
      if (controlledId) {
        if (camera.targetEntityId) camera.pivotOffset.fill(0); // Center pivot if following

        if (camera.mode === 'isometric') {
          this.updateLegacyCharacterControl(camera, controlledId, deltaTime); // 🔒 LOCKED
        } else {
          this.updateCharacterControl(camera, controlledId, deltaTime); // 🚀 Active Dev
        }
      }

      // 3. Update Target State
      const targetEntity = (camera.targetEntityId && this.entityManager)
        ? this.entityManager.getEntity(camera.targetEntityId)
        : null;

      const result = strategy.updateTarget(camera, targetEntity, deltaTime);

      this.targetState.position = result.position;
      this.targetState.rotation = result.rotation;
      this.targetState.pivot = result.pivot;
      this.targetState.fov = result.fov;

      // 4. Smooth Update & Apply
      this.smoothUpdate(camera, transform, deltaTime);
    }

    // 🔥 Fix: Reset frame data ONLY ONCE after ALL cameras are processed
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

    // Physics Check
    const physics = (targetEntity as Entity).getComponent('Physics');
    if (physics && this.physicsSystem) {
      let currentY = 0;
      const sys = this.physicsSystem as any;
      if (sys.bodyMap) {
        const body = sys.bodyMap.get((targetEntity as Entity).id);
        if (body) {
          const v = body.linvel();
          if (v) currentY = v.y;
        }
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

      const speed = camera.moveSpeed || 15.0;

      // Physics
      if (this.physicsSystem) {
        const sys = this.physicsSystem as any;
        // Get Y...
        let currentY = 0;
        if (sys.bodyMap) {
          const body = sys.bodyMap.get(targetEntity.id);
          if (body) currentY = body.linvel().y;
        }
        sys.setEntityVelocity(targetEntity.id, [dx * speed, currentY, 0]); // Lock Z
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
      const sys = this.physicsSystem as any;
      let currentY = 0;
      if (sys.bodyMap) {
        const body = sys.bodyMap.get(targetEntity.id);
        if (body) currentY = body.linvel().y;
      }
      sys.setEntityVelocity(
        targetEntity.id,
        [dx * speed, currentY, dz * speed]
      );
    }
  }

  /**
   * 平滑更新相机状态
   */
  private smoothUpdate(camera: CameraComponent, transform: TransformComponent, deltaTime: number): void {
    const t = Math.min(1, (camera.smoothSpeed || 10.0) * deltaTime);

    // 位置插值
    this.currentState.position[0] = this.lerp(this.currentState.position[0], this.targetState.position[0], t);
    this.currentState.position[1] = this.lerp(this.currentState.position[1], this.targetState.position[1], t);
    this.currentState.position[2] = this.lerp(this.currentState.position[2], this.targetState.position[2], t);

    // 旋转插值
    this.currentState.rotation[0] = this.lerp(this.currentState.rotation[0], this.targetState.rotation[0], t);
    this.currentState.rotation[1] = this.lerpAngle(this.currentState.rotation[1], this.targetState.rotation[1], t);
    this.currentState.rotation[2] = this.lerp(this.currentState.rotation[2], this.targetState.rotation[2], t);

    // 🔥 Pivot 插值 (消除平移时的旋转抖动)
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

      // Update: OrbitStrategy returns rotation derived from lookAt math logic.
      // So setting rotation is correct.
      this.r3fCamera.rotation.set(
        THREE.MathUtils.degToRad(this.currentState.rotation[0]),
        THREE.MathUtils.degToRad(this.currentState.rotation[1]),
        THREE.MathUtils.degToRad(this.currentState.rotation[2]),
        'YXZ'
      );

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
