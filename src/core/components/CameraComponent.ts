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
  pivotOffset: [number, number, number];
  lockAxis?: 'x' | 'y' | 'z';
  smoothSpeed: number;
  moveSpeed: number;

  forceMultiplier: number;
  enableCollision?: boolean;
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

  // 视距备份与控制 (Dolly Loop)
  public preFollowDistance: number = 100;

  /** @deprecated 使用 targetEntityId 代替 */
  public controlledEntityId: string | null = null;

  // ========== 🆕 预设系统字段 ==========

  /** 当前激活的预设 ID */
  public activePreset: string | null = null;

  /** 预设历史记录（最近使用的预设，用于快速切换） */
  public presetHistory: string[] = [];

  // ========== 现有交互参数 ==========

  // 第三人称偏移（相对于目标）
  public offset: [number, number, number] = [0, 2, 5];  // [x, y, z]

  // 核心：平移偏移（Panning Offset，适用于 Orbit 和 Isometric）
  public pivotOffset: [number, number, number] = [0, 0, 0];

  // 距离约束
  public distance: number = 5;
  public minDistance: number = 2;
  public maxDistance: number = 200;

  // 旋转角度（度）
  public pitch: number = -20;  // 俯仰角（上下）
  public yaw: number = 0;      // 偏航角（左右）

  // 轴锁定（用于 Isometric 和 Sidescroll）
  public lockAxis?: 'x' | 'y' | 'z';

  // 平滑参数
  public smoothSpeed: number = 5.0;  // 跟随平滑速度
  public rotationSpeed: number = 100;  // 旋转速度（度/秒）

  // 玩法响应参数 (New in Phase 16)
  public moveSpeed: number = 10.0;     // 基础移动速度 (Transform)
  public forceMultiplier: number = 25.0; // 物理推力倍率 (Physics)

  // 碰撞检测
  public enableCollision: boolean = false; // 默认关闭，需手动开启 (TPS/ISO)
  public collisionRadius: number = 0.2;    // 碰撞检测半径 (虽然目前用 Raycast，保留此参数供 SphereCast 扩展)

  constructor() { }

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
      pivotOffset: [...this.pivotOffset] as [number, number, number],
      lockAxis: this.lockAxis,
      smoothSpeed: this.smoothSpeed,
      moveSpeed: this.moveSpeed,

      forceMultiplier: this.forceMultiplier,
      enableCollision: this.enableCollision,
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
    this.pivotOffset = [...snapshot.pivotOffset] as [number, number, number];
    this.lockAxis = snapshot.lockAxis;
    this.smoothSpeed = snapshot.smoothSpeed;
    this.moveSpeed = snapshot.moveSpeed || 10.0;
    this.moveSpeed = snapshot.moveSpeed || 10.0;
    this.forceMultiplier = snapshot.forceMultiplier || 25.0;
    if (snapshot.enableCollision !== undefined) this.enableCollision = snapshot.enableCollision;
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
      controlledEntityId: this.controlledEntityId,
      activePreset: this.activePreset,
      presetHistory: this.presetHistory,
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
      pivotOffset: this.pivotOffset,
      lockAxis: this.lockAxis,
      smoothSpeed: this.smoothSpeed,
      rotationSpeed: this.rotationSpeed,
      moveSpeed: this.moveSpeed,
      forceMultiplier: this.forceMultiplier,
      enableCollision: this.enableCollision,
    };
  }

  /**
   * 反序列化
   */
  deserialize(data: ComponentData): void {
    this.enabled = data.enabled;
    this.mode = data.mode || 'orbit';

    // 自动迁移 controlledEntityId -> targetEntityId
    this.targetEntityId = data.targetEntityId || data.controlledEntityId || null;
    this.controlledEntityId = data.controlledEntityId || null;

    this.activePreset = data.activePreset || null;
    this.presetHistory = data.presetHistory || [];

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
    this.pivotOffset = data.pivotOffset || [0, 0, 0];
    this.lockAxis = data.lockAxis;
    this.smoothSpeed = data.smoothSpeed || 5.0;
    this.rotationSpeed = data.rotationSpeed || 100;
    this.moveSpeed = data.moveSpeed || 10.0;
    this.forceMultiplier = data.forceMultiplier || 25.0;
    this.enableCollision = data.enableCollision !== undefined ? data.enableCollision : true;
  }
}
