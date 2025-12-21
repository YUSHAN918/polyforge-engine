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

import type { System } from '../types';
import type { Entity } from '../Entity';
import { TransformComponent } from '../components/TransformComponent';
import { CameraComponent, type CameraMode, type CameraSnapshot } from '../components/CameraComponent';

/**
 * 相机状态（用于平滑过渡）
 */
interface CameraState {
  position: [number, number, number];
  rotation: [number, number, number];
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
    fov: 60,
  };

  // 目标相机状态
  private targetState: CameraState = {
    position: [0, 5, 10],
    rotation: [0, 0, 0],
    fov: 60,
  };

  // 模式切换过渡
  private isTransitioning = false;
  private transitionProgress = 0;
  private transitionDuration = 0.5;  // 秒

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
      this.currentState.fov = camera.fov;

      this.targetState.position = [...transform.position];
      this.targetState.rotation = [...transform.rotation];
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
    if (!entities) return;

    for (const entity of entities) {
      const camera = entity.getComponent<CameraComponent>('Camera');
      const transform = entity.getComponent<TransformComponent>('Transform');

      if (!camera || !transform || !camera.enabled) continue;

      // 更新目标状态
      this.updateTargetState(camera, entities);

      // 平滑插值到目标状态
      this.smoothUpdate(camera, transform, deltaTime);
    }
  }

  /**
   * 更新目标状态（根据相机模式）
   */
  private updateTargetState(camera: CameraComponent, entities: Entity[]): void {
    // 查找跟随目标
    const target = camera.targetEntityId 
      ? entities.find(e => e.id === camera.targetEntityId)
      : null;

    switch (camera.mode) {
      case 'orbit':
        this.updateOrbitMode(camera, target);
        break;
      case 'firstPerson':
        this.updateFirstPersonMode(camera, target);
        break;
      case 'thirdPerson':
        this.updateThirdPersonMode(camera, target);
        break;
      case 'isometric':
        this.updateIsometricMode(camera, target);
        break;
      case 'sidescroll':
        this.updateSidescrollMode(camera, target);
        break;
    }

    this.targetState.fov = camera.fov;
  }

  /**
   * Orbit 模式：编辑器风格旋转
   */
  private updateOrbitMode(camera: CameraComponent, target: Entity | null): void {
    const targetPos = target 
      ? target.getComponent<TransformComponent>('Transform')?.position || [0, 0, 0]
      : [0, 0, 0];

    // 计算相机位置（球坐标）
    const pitch = camera.pitch * Math.PI / 180;
    const yaw = camera.yaw * Math.PI / 180;
    const distance = camera.distance;

    const x = targetPos[0] + distance * Math.cos(pitch) * Math.sin(yaw);
    const y = targetPos[1] + distance * Math.sin(pitch);
    const z = targetPos[2] + distance * Math.cos(pitch) * Math.cos(yaw);

    this.targetState.position = [x, y, z];
    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
  }

  /**
   * FirstPerson 模式：锁定头部 Socket
   */
  private updateFirstPersonMode(camera: CameraComponent, target: Entity | null): void {
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
      this.targetState.position = socketWorldPos;
    } else {
      // 没有 Socket，使用实体位置 + 偏移
      const pos = transform.getWorldPosition();
      this.targetState.position = [pos[0], pos[1] + 1.7, pos[2]];
    }

    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
  }

  /**
   * ThirdPerson 模式：平滑跟随
   */
  private updateThirdPersonMode(camera: CameraComponent, target: Entity | null): void {
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

    this.targetState.position = [
      targetPos[0] + rotatedX,
      targetPos[1] + offsetY,
      targetPos[2] + rotatedZ,
    ];

    this.targetState.rotation = [camera.pitch, camera.yaw, 0];
  }

  /**
   * Isometric 模式：等距视角（类暗黑上帝视角）
   */
  private updateIsometricMode(camera: CameraComponent, target: Entity | null): void {
    const targetPos = target 
      ? target.getComponent<TransformComponent>('Transform')?.getWorldPosition() || [0, 0, 0]
      : [0, 0, 0];

    // 固定俯仰角（45度）和偏航角（45度）
    const pitch = -45;
    const yaw = 45;
    const distance = camera.distance;

    const pitchRad = pitch * Math.PI / 180;
    const yawRad = yaw * Math.PI / 180;

    const x = targetPos[0] + distance * Math.cos(pitchRad) * Math.sin(yawRad);
    const y = targetPos[1] + distance * Math.sin(pitchRad);
    const z = targetPos[2] + distance * Math.cos(pitchRad) * Math.cos(yawRad);

    this.targetState.position = [x, y, z];
    this.targetState.rotation = [pitch, yaw, 0];

    // 锁定 Y 轴旋转
    if (camera.lockAxis === 'y') {
      this.targetState.rotation[1] = yaw;
    }
  }

  /**
   * Sidescroll 模式：横版卷轴（类 DNF 视角）
   */
  private updateSidescrollMode(camera: CameraComponent, target: Entity | null): void {
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

    // FOV 插值
    this.currentState.fov = this.lerp(this.currentState.fov, this.targetState.fov, t);

    // 应用到 Transform
    transform.position = [...this.currentState.position];
    transform.rotation = [...this.currentState.rotation];
    transform.markLocalDirty();
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
  public applyCameraSnapshot(camera: CameraComponent, snapshot: CameraSnapshot): void {
    camera.applySnapshot(snapshot);
    console.log(`📷 Camera snapshot applied: ${snapshot.mode}`);
  }
}
