/**
 * PolyForge v1.3.0 CameraComponent
 * Phase 10: 相机组件
 * 
 * 定义相机的基本属性和配置
 */

import { Component, ComponentData } from '../types';

/**
 * 相机模式
 */
export type CameraMode = 
  | 'orbit'        // 编辑器风格旋转
  | 'firstPerson'  // 第一人称（锁定头部 Socket）
  | 'thirdPerson'  // 第三人称（平滑跟随）
  | 'isometric'    // 等距视角（类暗黑上帝视角）
  | 'sidescroll';  // 横版卷轴（类 DNF 视角）

/**
 * 相机配置快照
 * 用于保存和恢复特定机位
 */
export interface CameraSnapshot {
  mode: CameraMode;
  fov: number;
  offset: [number, number, number];
  distance: number;
  minDistance: number;
  maxDistance: number;
  pitch: number;
  yaw: number;
  lockAxis?: 'x' | 'y' | 'z';
  smoothSpeed: number;
}

/**
 * CameraComponent 相机组件
 * 定义相机的视角、跟随目标和行为参数
 */
export class CameraComponent implements Component {
  public readonly type = 'Camera';
  public enabled: boolean = true;

  // 相机模式
  public mode: CameraMode = 'orbit';

  // 跟随目标（Entity ID）
  public targetEntityId: string | null = null;

  // 第一人称模式：锁定的 Socket 名称
  public firstPersonSocket: string = 'head';

  // 视野参数
  public fov: number = 60;  // Field of View (度)
  public near: number = 0.1;
  public far: number = 1000;

  // 第三人称偏移（相对于目标）
  public offset: [number, number, number] = [0, 2, 5];  // [x, y, z]

  // 距离约束
  public distance: number = 5;
  public minDistance: number = 2;
  public maxDistance: number = 20;

  // 旋转角度（度）
  public pitch: number = -20;  // 俯仰角（上下）
  public yaw: number = 0;      // 偏航角（左右）

  // 轴锁定（用于 Isometric 和 Sidescroll）
  public lockAxis?: 'x' | 'y' | 'z';

  // 平滑参数
  public smoothSpeed: number = 5.0;  // 跟随平滑速度
  public rotationSpeed: number = 100;  // 旋转速度（度/秒）

  // 碰撞检测
  public enableCollision: boolean = true;

  constructor() {}

  /**
   * 获取当前配置快照
   */
  getSnapshot(): CameraSnapshot {
    return {
      mode: this.mode,
      fov: this.fov,
      offset: [...this.offset] as [number, number, number],
      distance: this.distance,
      minDistance: this.minDistance,
      maxDistance: this.maxDistance,
      pitch: this.pitch,
      yaw: this.yaw,
      lockAxis: this.lockAxis,
      smoothSpeed: this.smoothSpeed,
    };
  }

  /**
   * 应用配置快照
   */
  applySnapshot(snapshot: CameraSnapshot): void {
    this.mode = snapshot.mode;
    this.fov = snapshot.fov;
    this.offset = [...snapshot.offset] as [number, number, number];
    this.distance = snapshot.distance;
    this.minDistance = snapshot.minDistance;
    this.maxDistance = snapshot.maxDistance;
    this.pitch = snapshot.pitch;
    this.yaw = snapshot.yaw;
    this.lockAxis = snapshot.lockAxis;
    this.smoothSpeed = snapshot.smoothSpeed;
  }

  /**
   * 序列化
   */
  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      mode: this.mode,
      targetEntityId: this.targetEntityId,
      firstPersonSocket: this.firstPersonSocket,
      fov: this.fov,
      near: this.near,
      far: this.far,
      offset: this.offset,
      distance: this.distance,
      minDistance: this.minDistance,
      maxDistance: this.maxDistance,
      pitch: this.pitch,
      yaw: this.yaw,
      lockAxis: this.lockAxis,
      smoothSpeed: this.smoothSpeed,
      rotationSpeed: this.rotationSpeed,
      enableCollision: this.enableCollision,
    };
  }

  /**
   * 反序列化
   */
  deserialize(data: ComponentData): void {
    this.enabled = data.enabled;
    this.mode = data.mode || 'orbit';
    this.targetEntityId = data.targetEntityId || null;
    this.firstPersonSocket = data.firstPersonSocket || 'head';
    this.fov = data.fov || 60;
    this.near = data.near || 0.1;
    this.far = data.far || 1000;
    this.offset = data.offset || [0, 2, 5];
    this.distance = data.distance || 5;
    this.minDistance = data.minDistance || 2;
    this.maxDistance = data.maxDistance || 20;
    this.pitch = data.pitch || -20;
    this.yaw = data.yaw || 0;
    this.lockAxis = data.lockAxis;
    this.smoothSpeed = data.smoothSpeed || 5.0;
    this.rotationSpeed = data.rotationSpeed || 100;
    this.enableCollision = data.enableCollision !== undefined ? data.enableCollision : true;
  }
}
