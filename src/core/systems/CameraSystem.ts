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

  // 模式切换过渡
  private isTransitioning = false;
  private transitionProgress = 0;
  private transitionDuration = 0.5;  // 秒

  // 🎮 输入系统引用
  private inputSystem: any = null;  // InputSystem 实例

  // 🌍 物理系统引用
  private physicsSystem: any = null;

  // 🏛️ 实体管理器引用 (Required for target lookup across filtered lists)
  private entityManager: any = null;

  // 🎥 R3F 相机引用（直接控制）
  private r3fCamera: any = null;

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

      // 更新目标状态前处理输入
      this.handleInputs(camera, deltaTime);

      // 更新目标状态
      this.updateTargetState(camera, entities, deltaTime);

      // 平滑插值到目标状态
      this.smoothUpdate(camera, transform, deltaTime);
    }

    // 🔥 Fix: Reset frame data ONLY ONCE after ALL cameras are processed
    this.inputSystem.resetFrameData();
  }

  /**
   * 更新目标状态（根据相机模式）
   */
  private updateTargetState(camera: CameraComponent, entities: Entity[], deltaTime: number): void {
    // 🔥 核心修复：从 EntityManager 全局查找目标，而不是从过滤后的 entities 数组查找
    const target = (camera.targetEntityId && this.entityManager)
      ? this.entityManager.getEntity(camera.targetEntityId)
      : null;

    // 默认 Pivot 为 Camera 的 pivotOffset (手动偏移)
    // 注意：Orbit模式下 pivot 会包含 targetPos，这里先初始化为手动偏移
    this.targetState.pivot = [camera.pivotOffset[0], camera.pivotOffset[1], camera.pivotOffset[2]];

    switch (camera.mode) {
      case 'orbit':
        this.updateOrbitMode(camera, target || null, deltaTime);
        break;
      case 'firstPerson':
        this.updateFirstPersonMode(camera, target || null, deltaTime);
        break;
      case 'thirdPerson':
        this.updateThirdPersonMode(camera, target || null, deltaTime);
        break;
      case 'isometric':
        this.updateIsometricMode(camera, target || null, deltaTime);
        break;
      case 'sidescroll':
        this.updateSidescrollMode(camera, target || null, deltaTime);
        break;
    }

    this.targetState.fov = camera.fov;
  }

  /**
   * 处理通用相机输入（分发到不同逻辑块）
   */
  private handleInputs(camera: CameraComponent, deltaTime: number): void {
    if (!this.inputSystem) return;

    // 制作人愿景分治：创造块 (Orbit) vs 体验块 (其他)
    const isCreation = camera.mode === 'orbit'; // Changed from 'Orbit' to 'orbit' for consistency

    if (isCreation) {
      this.handleCreationInputs(camera, deltaTime);
    } else {
      this.handleExperienceInputs(camera, deltaTime);
    }

    const wheelDelta = this.inputSystem.wheelDelta;
    if (wheelDelta !== 0 && (camera.mode === 'orbit' || camera.mode === 'thirdPerson' || camera.mode === 'isometric' || camera.mode === 'sidescroll')) {
      // 🔥 制作人：锁定逻辑。跟随目标时禁止手动缩放。
      if (camera.targetEntityId) return;

      // 调整缩放速度：1.3.0 优化
      camera.distance += wheelDelta * 0.05;
      camera.distance = Math.max(camera.minDistance, Math.min(camera.maxDistance, camera.distance));
    }

    // 🌍 全局角色控制 (Global Character Control)
    // 移出 if/else，确保在 Orbit 模式 (Unbound) 下也能控制角色
    const controlledId = camera.controlledEntityId || camera.targetEntityId;
    if (controlledId) {
      // 如果正在跟随，强制归心
      if (camera.targetEntityId) {
        camera.pivotOffset.fill(0);
      }
      this.updateCharacterControl(camera, controlledId, deltaTime);
    }
  }

  /**
   * [CREATION] 创造块控制器：仅处理 Orbit 逻辑
   */
  private handleCreationInputs(camera: CameraComponent, deltaTime: number): void {
    // 如果正在跟随目标，则禁用手动 Panning 和旋转 (ISO 模式下通常固定，但也防止干扰)
    if (camera.targetEntityId) return;

    const mouseDelta = this.inputSystem.mouseDelta;
    const pressedButtons = this.inputSystem.pressedButtons || new Set();
    const pressedKeys = this.inputSystem.pressedKeys || new Set();

    // 1. Panning: Space + Left Click (0) OR Middle Click (1)
    if (pressedKeys.has(' ') && (pressedButtons.has(0) || pressedButtons.has(1))) {
      if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
        const panSpeed = camera.distance * 0.002;
        const yawRad = camera.yaw * Math.PI / 180;
        const forwardX = Math.sin(yawRad);
        const forwardZ = Math.cos(yawRad);
        const rightX = Math.cos(yawRad);
        const rightZ = -Math.sin(yawRad);

        camera.pivotOffset[0] -= (rightX * mouseDelta.x + forwardX * mouseDelta.y) * panSpeed;
        camera.pivotOffset[2] -= (rightZ * mouseDelta.x + forwardZ * mouseDelta.y) * panSpeed;
      }
    }

    // 2. Rotation: Middle Click Only (Fixed: Removed Right Click/Button 2)
    if (pressedButtons.has(1)) {
      if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
        camera.yaw -= mouseDelta.x * 0.3;
        camera.pitch += mouseDelta.y * 0.3; // Editor Move: Mouse Up -> Look Up
        camera.pitch = Math.max(-89, Math.min(89, camera.pitch));
      }
    }
  }

  /**
   * [EXPERIENCE] 体验块控制器：分发到不同玩法原型
   */
  private handleExperienceInputs(camera: CameraComponent, deltaTime: number): void {
    const mouseDelta = this.inputSystem.mouseDelta;
    const pressedButtons = this.inputSystem.pressedButtons || new Set();

    // 1. 视角旋转 (通用逻辑，Sidescroll 和 Isometric 禁止自由旋转)
    // 🔥 Remove Right Click (Button 2) support to avoid browser conflict
    // 🔥 Disable Rotation for Isometric (Fixed Angle Strategy)
    const canRotate = camera.mode !== 'sidescroll' && camera.mode !== 'isometric';
    if (canRotate && pressedButtons.has(1)) {
      if (mouseDelta && (Math.abs(mouseDelta.x) > 0 || Math.abs(mouseDelta.y) > 0)) {
        // 🔥 Fix: Invert Rotation Direction (Move Mouse Right -> Rotate Right -> Increase Yaw)
        camera.yaw += mouseDelta.x * 0.3;
        if (camera.mode !== 'isometric') {
          camera.pitch -= mouseDelta.y * 0.3;
          camera.pitch = Math.max(-85, Math.min(85, camera.pitch));
        }
      }
    }

    // 🔥 2. ESC 退出跟随 (Exit Follow & Dolly Out)
    if (this.inputSystem.isActionPressed('ESCAPE')) {
      if (camera.targetEntityId) {

        // 🔥 关键优化：退出跟随前，将 Pivot 同步到当前目标位置
        // 这样切回 Orbit 模式时，相机会继续看向角色当前位置，而不是跳回 (0,0,0)
        if (this.entityManager) {
          const targetEnt = this.entityManager.getEntity(camera.targetEntityId);
          if (targetEnt) {
            const t = targetEnt.getComponent('Transform');
            if (t) {
              camera.pivotOffset[0] = t.position[0];
              camera.pivotOffset[1] = t.position[1];
              camera.pivotOffset[2] = t.position[2];
            }
          }
        }

        camera.targetEntityId = null;

        // 🔓 还原视距 (Dolly Out to Fixed 100 as requested)
        camera.distance = 100;

        // 切回自由观察模式 (Orbit)
        camera.mode = 'orbit';

        console.log(`🔓 Camera Released & Fixed Dolly Out to ${camera.distance}`);
      }
    }



    // 3. 分发到特定相机行为控制器 (Camera Behavior Only)
    if (camera.mode === 'firstPerson' || camera.mode === 'thirdPerson') {
      // FP/TP Camera Logic allows for rotation, covered by generic rotation above.
      // Specific follow logic is in update*Mode methods.
    } else if (camera.mode === 'isometric') {
      this.updateStrategyController(camera, deltaTime);
    } else if (camera.mode === 'sidescroll') {
      this.updateSidescrollController(camera, deltaTime);
    }
  }

  /**
   * 角色控制器 (Character Control): 通用 WASD 物理驱动
   * 支持 FPS/TPS (基于 Yaw), Isometric (基于 Yaw), Sidescroll (基于 World X)
   */
  private updateCharacterControl(camera: CameraComponent, entityId: string, deltaTime: number): void {
    const targetEntity = this.entityManager?.getEntity(entityId);
    if (!targetEntity) return;

    let dx = 0;
    let dz = 0;

    // 根据模式决定移动参照系
    if (camera.mode === 'sidescroll') {
      // 🔥 Sidescroll: 锁定为世界坐标 X 轴移动
      // A -> Left (-X), D -> Right (+X), W/S -> Ignored (or Z depth if needed)
      if (this.inputSystem.isActionPressed('MOVE_LEFT')) dx = -1;
      if (this.inputSystem.isActionPressed('MOVE_RIGHT')) dx = 1;
    } else {
      // 🔥 FPS/TPS/Isometric: 基于相机 Yaw 的移动
      // 投影到地面 (Y=0) 的相机极坐标转换
      const moveYaw = camera.yaw * Math.PI / 180;
      const sin = Math.sin(moveYaw);
      const cos = Math.cos(moveYaw);

      // 参照系说明 (Camera Forward is -Z when Yaw=0):
      // Forward:  (-sin, -cos)
      // Backward: (sin, cos)
      // Left:     (-cos, sin)
      // Right:    (cos, -sin)

      if (this.inputSystem.isActionPressed('MOVE_FORWARD')) {
        dx -= sin; dz -= cos;
      }
      if (this.inputSystem.isActionPressed('MOVE_BACKWARD')) {
        dx += sin; dz += cos;
      }
      if (this.inputSystem.isActionPressed('MOVE_LEFT')) {
        dx -= cos; dz += sin;
      }
      if (this.inputSystem.isActionPressed('MOVE_RIGHT')) {
        dx += cos; dz -= sin;
      }
    }

    // 🔥 Normalize Vector (Fix "Fast Diagonal" issue)
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length > 0.001) {
      dx /= length;
      dz /= length;
    }

    // 应用速度 (Logic Scale)
    // Speed Slider (moveSpeed) -> Velocity Magnitude
    const speed = camera.moveSpeed || 10.0;

    // 应用移动
    const physics = (targetEntity as Entity).getComponent('Physics');
    if (physics && this.physicsSystem) {
      // ✅ 修正：获取当前速度，保留 Y
      const currentVel = this.physicsSystem.getRigidBody((targetEntity as Entity).id)?.linvel();
      const currentY = currentVel ? currentVel.y : 0;

      this.physicsSystem.setLinearVelocity(
        (targetEntity as Entity).id,
        dx * speed, // Use Speed Slider directly
        currentY,
        dz * speed
      );
    } else {
      // 非物理移动 (Fallback)
      const transform = (targetEntity as Entity).getComponent<TransformComponent>('Transform');
      if (transform) {
        transform.position[0] += dx * speed * deltaTime;
        transform.position[2] += dz * speed * deltaTime;
        transform.markLocalDirty();
      }
    }
  }

  /**
   * 战略/动作 RPG 控制器 (Strategy): Isometric 自由平移或锁定跟随
   */
  private updateStrategyController(camera: CameraComponent, deltaTime: number): void {
    let dx = 0;
    let dz = 0;
    const moveYaw = camera.yaw * Math.PI / 180;

    // 🔥 Legacy Fallback: Enable Camera WASD if NO Character is being controlled
    // This restores functionality for old demos that rely on camera panning.
    if (!camera.controlledEntityId && !camera.targetEntityId) {
      if (this.inputSystem.isActionPressed('MOVE_FORWARD')) {
        dx -= Math.sin(moveYaw); dz -= Math.cos(moveYaw);
      }
      if (this.inputSystem.isActionPressed('MOVE_BACKWARD')) {
        dx += Math.sin(moveYaw); dz += Math.cos(moveYaw);
      }
      if (this.inputSystem.isActionPressed('MOVE_LEFT')) {
        dx -= Math.cos(moveYaw); dz += Math.sin(moveYaw);
      }
      if (this.inputSystem.isActionPressed('MOVE_RIGHT')) {
        dx += Math.cos(moveYaw); dz -= Math.sin(moveYaw);
      }

      const panSpeed = camera.distance * 0.01;
      camera.pivotOffset[0] += dx * panSpeed;
      camera.pivotOffset[2] += dz * panSpeed;
    }
  }

  /**
   * 卷轴/平台控制器 (Sidescroll): 锁定 Z 轴
   */
  private updateSidescrollController(camera: CameraComponent, deltaTime: number): void {
    const moveSpeed = (camera.moveSpeed || 15.0) * deltaTime;
    if (this.inputSystem.isActionPressed('MOVE_LEFT')) camera.pivotOffset[0] -= moveSpeed;
    if (this.inputSystem.isActionPressed('MOVE_RIGHT')) camera.pivotOffset[0] += moveSpeed;
  }

  // 注入依赖
  public setEntityManager(em: any) { this.entityManager = em; }
  public setPhysicsSystem(ps: any) { this.physicsSystem = ps; }

  /**
   * Orbit 模式：编辑器风格旋转
   */
  private updateOrbitMode(camera: CameraComponent, target: Entity | null, deltaTime: number): void {
    const targetPos = target
      ? target.getComponent<TransformComponent>('Transform')?.position || [0, 0, 0]
      : [0, 0, 0];

    // 🎮 处理输入 (Input Processing)
    // this.handleInputs(camera, deltaTime); // Handled once at the beginning of update

    // 基础参数
    const distance = camera.distance;

    // Euler Angles to Radians
    const pitchRad = camera.pitch * Math.PI / 180;
    const yawRad = camera.yaw * Math.PI / 180;

    // 计算相机相对于 Pivot 的偏移向量 (Spherical to Cartesian)
    const y = distance * Math.sin(pitchRad);
    const hDist = distance * Math.cos(pitchRad); // 水平投影距离
    const x = hDist * Math.sin(yawRad);
    const z = hDist * Math.cos(yawRad);

    // 最终位置 = 目标位置 + 手动平移偏移 + 球面旋转偏移
    const pivotX = targetPos[0] + camera.pivotOffset[0];
    const pivotY = targetPos[1] + camera.pivotOffset[1];
    const pivotZ = targetPos[2] + camera.pivotOffset[2];

    const finalX = pivotX + x;
    const finalY = pivotY + y;
    const finalZ = pivotZ + z;

    this.targetState.position = [finalX, finalY, finalZ];
    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
    this.targetState.pivot = [pivotX, pivotY, pivotZ];
  }

  /**
   * FirstPerson 模式：锁定头部 Socket
   */
  private updateFirstPersonMode(camera: CameraComponent, target: Entity | null, deltaTime: number): void {
    // 🎮 处理输入
    // this.handleInputs(camera, deltaTime); // Handled once at the beginning of update

    if (!target) {
      this.targetState.position = [0, 1.7, 0];  // 默认高度
      this.targetState.rotation = [camera.pitch, camera.yaw, 0];
      return;
    }

    const transform = target.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    // 尝试获取头部 Socket
    const headSocket = target.getSocket(camera.firstPersonSocket);

    if (headSocket) {
      // 使用 Socket 的世界位置
      const socketWorldPos = this.getSocketWorldPosition(target, headSocket.name);
      this.targetState.position = [
        socketWorldPos[0] + camera.pivotOffset[0],
        socketWorldPos[1] + camera.pivotOffset[1],
        socketWorldPos[2] + camera.pivotOffset[2]
      ];
    } else {
      // 没有 Socket，使用实体位置 + 偏移
      const pos = transform.getWorldPosition();
      this.targetState.position = [
        pos[0] + camera.pivotOffset[0],
        pos[1] + 1.7 + camera.pivotOffset[1],
        pos[2] + camera.pivotOffset[2]
      ];
    }

    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
    // FPS 不需要 pivot 插值，因为它不是 LookAt 模式
  }

  /**
   * ThirdPerson 模式：平滑跟随
   */
  private updateThirdPersonMode(camera: CameraComponent, target: Entity | null, deltaTime: number): void {
    // 🎮 处理输入
    // this.handleInputs(camera, deltaTime); // Handled once at the beginning of update

    if (!target) {
      this.targetState.position = [0, 2, 5];
      this.targetState.rotation = [-20, 0, 0];
      return;
    }

    const transform = target.getComponent<TransformComponent>('Transform');
    if (!transform) return;

    const targetPos = transform.getWorldPosition();

    // 计算相机位置（基于偏移和旋转）
    const pitch = camera.pitch * Math.PI / 180;
    const yaw = camera.yaw * Math.PI / 180;

    // 应用偏移
    const offsetX = camera.offset[0];
    const offsetY = camera.offset[1];
    const offsetZ = camera.offset[2];

    // 旋转偏移向量
    const rotatedX = offsetX * Math.cos(yaw) - offsetZ * Math.sin(yaw);
    const rotatedZ = offsetX * Math.sin(yaw) + offsetZ * Math.cos(yaw);

    // 🔥 Fix: Update Pivot for Interpolation!
    // Without this, the camera looks at [0,0,0] or old pivot while moving, causing "No Rotation" visual effect
    // Pivot should be the Target Position (Head/Body) we are looking at.
    const pivotX = targetPos[0];
    const pivotY = targetPos[1] + offsetY; // Look at head height?
    const pivotZ = targetPos[2];

    this.targetState.position = [
      targetPos[0] + rotatedX + camera.pivotOffset[0],
      targetPos[1] + offsetY + camera.pivotOffset[1],
      targetPos[2] + rotatedZ + camera.pivotOffset[2],
    ];

    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
    this.targetState.pivot = [pivotX, pivotY, pivotZ]; // 🔥 Critical Fix
  }

  /**
   * Isometric 模式：等距视角（类暗黑上帝视角）
   */
  private updateIsometricMode(camera: CameraComponent, target: Entity | null, deltaTime: number): void {
    // 🎮 处理输入 (只支持缩放)
    // this.handleInputs(camera, deltaTime); // Handled once at the beginning of update

    let targetPos: [number, number, number] = [0, 0, 0];
    if (target) {
      const t = target.getComponent<TransformComponent>('Transform');
      if (t) {
        // 🔥 Fix: Use raw position for root entities to avoid HierarchySystem latency/stale matrix
        // Player is usually a root entity.
        targetPos = (target.parent && t.getWorldPosition) ? t.getWorldPosition() : t.position;
      }
    }

    // 🔥 制作人提示：纠正方向乱跳。Isometric 模式应使用组件自身的参数，
    // 这样 handleInputs 修改的 camera.yaw 才能与 updateCharacterControl 保持一致。
    const pitch = 45; // Isometric 俯视通常固定 45 度，或者使用 camera.pitch
    const yaw = camera.yaw; // 使用组件 Yaw，保证 WASD 逻辑一致
    const distance = camera.distance;

    const pitchRad = pitch * Math.PI / 180;
    const yawRad = yaw * Math.PI / 180;

    // 🔥 Pivot: 基准看向目标位置 (稍微抬高看向头部)
    const pivotX = targetPos[0];
    const pivotY = targetPos[1] + 1.2; // 稍微抬高看向中心偏上
    const pivotZ = targetPos[2];

    // 相机位置 (围绕目标点旋转)
    // 🔥 Force Pitch to 45 or 30 for strict ISO look? 
    // User requested "Isometric", usually implies fixed pitch. Let's stick to camera.pitch but input is disabled.
    // If logic above disabled input, then camera.pitch stays constant.
    const x = distance * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = distance * Math.sin(pitchRad);
    const z = distance * Math.cos(pitchRad) * Math.cos(yawRad);



    // 最终状态：将 pivotOffset 应用于整体 (跟随模式下为 0)
    this.targetState.pivot = [
      pivotX + camera.pivotOffset[0],
      pivotY + camera.pivotOffset[1],
      pivotZ + camera.pivotOffset[2]
    ];

    this.targetState.position = [
      this.targetState.pivot[0] + x,
      this.targetState.pivot[1] + y,
      this.targetState.pivot[2] + z
    ];

    this.targetState.rotation = [-pitch, yaw, 0];
    // 锁定 Y 轴旋转
    if (camera.lockAxis === 'y') {
      this.targetState.rotation[1] = yaw;
    }
  }

  /**
   * Sidescroll 模式：横版卷轴（类 DNF 视角）
   */
  private updateSidescrollMode(camera: CameraComponent, target: Entity | null, deltaTime: number): void {
    // 🎮 Handle Inputs (Movement & Zoom handled inside)
    this.handleInputs(camera, deltaTime);

    const targetPos = target
      ? target.getComponent<TransformComponent>('Transform')?.getWorldPosition() || [0, 0, 0]
      : [0, 0, 0];

    // 固定 Z 轴位置，只跟随 X 和 Y
    const distance = camera.distance;

    this.targetState.position = [
      targetPos[0],
      targetPos[1] + camera.offset[1],
      targetPos[2] + distance,
    ];

    this.targetState.rotation = [0, 0, 0];  // 固定朝向

    // 锁定 Z 轴移动
    if (camera.lockAxis === 'z') {
      this.targetState.position[2] = distance;
    }
  }

  /**
   * 平滑更新相机状态
   */
  private smoothUpdate(camera: CameraComponent, transform: TransformComponent, deltaTime: number): void {
    const t = Math.min(1, camera.smoothSpeed * deltaTime);

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

      // 🔥 动态计算 Pivot Point (LookAt Target)
      // 这个逻辑需要与 updateOrbitMode 保持一致
      // Pivot = TargetPos + PivotOffset
      // 由于 CameraSystem 不直接持有 TargetPos，我们这里用反推法或者简化法
      // 简化法：Orbit 模式下，相机永远看向 PivotOffset (假设 TargetPos 为 0，或者 PivotOffset 包含了 TargetPos)
      // 等等，updateOrbitMode 里：Pivot = targetPos + camera.pivotOffset

      // 正确做法：应该是 LookAt (Position - SphericalOffset)
      const pitchRad = THREE.MathUtils.degToRad(this.currentState.rotation[0]);
      const yawRad = THREE.MathUtils.degToRad(this.currentState.rotation[1]);

      // 反向计算看的目标点
      // 既然 Position = Pivot + SphericalOffset
      // 那么 Pivot = Position - SphericalOffset

      // 注意：这里用的是 currentState 的数据，保证平滑
      // 但是 distance 需要从 camera 组件拿（或者也插值？）camera.distance 没有被插值存入 state
      // 这是一个小缺陷，但通常 distance 变化不剧烈。
      // 为了精确，我们应该计算前向向量。

      if (camera.mode === 'orbit' || camera.mode === 'isometric' || camera.mode === 'thirdPerson') {
        // 现在我们有了平滑插值过的 Pivot，直接 LookAt 它
        // 这样 Camera Pos 和 Camera Target 以相同的速度移动 -> 相对角度不变 -> 无抖动
        this.r3fCamera.lookAt(
          this.currentState.pivot[0],
          this.currentState.pivot[1],
          this.currentState.pivot[2]
        );
      } else {
        // FPS/TPS/Sidescroll: 使用欧拉角旋转
        this.r3fCamera.rotation.set(
          THREE.MathUtils.degToRad(this.currentState.rotation[0]),
          THREE.MathUtils.degToRad(this.currentState.rotation[1]),
          THREE.MathUtils.degToRad(this.currentState.rotation[2]),
          'YXZ' // FPS 通常用 YXZ 顺序
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
    this.isTransitioning = true;
    this.transitionProgress = 0;

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

  // 缓存当前激活的相机组件引用
  private currentCameraComponent: CameraComponent | null = null;
}
