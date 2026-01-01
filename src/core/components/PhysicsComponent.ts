/**
 * PolyForge v1.3.0 PhysicsComponent
 * 物理组件 - 定义实体的物理属性
 */

import { Component, ComponentData } from '../types';

/**
 * 刚体类型
 */
export type BodyType = 'static' | 'dynamic' | 'kinematic';

/**
 * 碰撞体形状
 */
export type ColliderShape = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'cone' | 'mesh' | 'heightfield';

/**
 * 碰撞体配置
 */
export interface ColliderConfig {
  shape: ColliderShape;
  size: [number, number, number]; // 尺寸 [width, height, depth] 或 [radius, height, 0]
  offset: [number, number, number]; // 相对实体的偏移
  isSensor?: boolean; // 是否为传感器（不产生物理碰撞，只触发事件）
}

/**
 * PhysicsComponent 物理组件
 * 定义实体的物理行为，集成 Rapier 物理引擎
 */
export class PhysicsComponent implements Component {
  public readonly type = 'Physics';
  public enabled: boolean = true;

  // 刚体类型
  public bodyType: BodyType;

  // 碰撞体配置
  public collider: ColliderConfig;

  // 物理属性
  public mass: number; // 质量（kg）
  public friction: number; // 摩擦系数 0-1
  public restitution: number; // 弹性系数 0-1（0=完全非弹性，1=完全弹性）
  public linearDamping: number; // 线性阻尼 0-1
  public angularDamping: number; // 角阻尼 0-1

  // 约束
  public lockRotation: [boolean, boolean, boolean]; // 锁定旋转轴 [x, y, z]
  public lockPosition: [boolean, boolean, boolean]; // 锁定位置轴 [x, y, z]

  // Rapier 集成（运行时填充）
  public rapierHandle?: number; // Rapier 刚体句柄
  public rapierColliderHandle?: number; // Rapier 碰撞体句柄

  // 重力
  public useGravity: boolean; // 是否受重力影响

  // 角色控制器标记
  public isCharacterController: boolean = false;

  // 物理微调系数 (用于补偿非紧致模型或制作人特定需求)
  public colliderScale: number = 1.0;

  constructor(
    bodyType: BodyType = 'dynamic',
    collider: ColliderConfig = {
      shape: 'box',
      size: [1, 1, 1],
      offset: [0, 0, 0],
    },
    mass: number = 1.0,
    friction: number = 0.5,
    restitution: number = 0.3
  ) {
    this.bodyType = bodyType;
    this.collider = collider;
    this.mass = mass;
    this.friction = friction;
    this.restitution = restitution;
    this.linearDamping = 0.1;
    this.angularDamping = 0.1;
    this.lockRotation = [false, false, false];
    this.lockPosition = [false, false, false];
    this.useGravity = true;
  }

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      bodyType: this.bodyType,
      collider: this.collider,
      mass: this.mass,
      friction: this.friction,
      restitution: this.restitution,
      linearDamping: this.linearDamping,
      angularDamping: this.angularDamping,
      lockRotation: this.lockRotation,
      lockPosition: this.lockPosition,
      useGravity: this.useGravity,
      colliderScale: this.colliderScale,
      // 注意：不序列化 Rapier 句柄，这些是运行时数据
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled ?? true;
    this.bodyType = data.bodyType || 'dynamic';
    this.collider = data.collider || {
      shape: 'box',
      size: [1, 1, 1],
      offset: [0, 0, 0],
    };
    this.mass = data.mass ?? 1.0;
    this.friction = data.friction ?? 0.5;
    this.restitution = data.restitution ?? 0.3;
    this.linearDamping = data.linearDamping ?? 0.1;
    this.angularDamping = data.angularDamping ?? 0.1;
    this.lockRotation = data.lockRotation || [false, false, false];
    this.lockPosition = data.lockPosition || [false, false, false];
    this.useGravity = data.useGravity ?? true;
    this.colliderScale = data.colliderScale ?? 1.0;
  }

  /**
   * 设置刚体类型
   */
  setBodyType(type: BodyType): void {
    this.bodyType = type;
  }

  /**
   * 设置碰撞体
   */
  setCollider(shape: ColliderShape, size: [number, number, number], offset?: [number, number, number]): void {
    this.collider.shape = shape;
    this.collider.size = size;
    if (offset) {
      this.collider.offset = offset;
    }
  }

  /**
   * 锁定旋转
   */
  setLockRotation(x: boolean, y: boolean, z: boolean): void {
    this.lockRotation = [x, y, z];
  }

  /**
   * 锁定位置
   */
  setLockPosition(x: boolean, y: boolean, z: boolean): void {
    this.lockPosition = [x, y, z];
  }

  /**
   * 设置为传感器（不产生物理碰撞）
   */
  setSensor(isSensor: boolean): void {
    this.collider.isSensor = isSensor;
  }

  /**
   * 检查是否为静态刚体
   */
  isStatic(): boolean {
    return this.bodyType === 'static';
  }

  /**
   * 检查是否为动态刚体
   */
  isDynamic(): boolean {
    return this.bodyType === 'dynamic';
  }

  /**
   * 检查是否为运动学刚体
   */
  isKinematic(): boolean {
    return this.bodyType === 'kinematic';
  }
}
