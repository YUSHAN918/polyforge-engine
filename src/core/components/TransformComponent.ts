/**
 * PolyForge v1.3.0 TransformComponent
 * 变换组件 - 支持层级变换和矩阵计算
 */

import { Component, ComponentData } from '../types';

/**
 * 4x4 矩阵类型（列主序）
 */
export type Matrix4 = Float32Array;

/**
 * TransformComponent 变换组件
 * 存储实体的位置、旋转、缩放信息，支持层级变换
 */
export class TransformComponent implements Component {
  public readonly type = 'Transform';
  public enabled: boolean = true;

  // 本地变换
  public position: [number, number, number];
  public rotation: [number, number, number]; // Euler angles (degrees)
  public scale: [number, number, number];

  // 矩阵缓存
  private _localMatrix: Matrix4;
  private _worldMatrix: Matrix4;

  // 脏标记
  private _localDirty: boolean = true;
  private _worldDirty: boolean = true;

  constructor(
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1]
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;

    // 初始化矩阵
    this._localMatrix = new Float32Array(16);
    this._worldMatrix = new Float32Array(16);
    this.setIdentity(this._localMatrix);
    this.setIdentity(this._worldMatrix);
  }

  // ============================================================================
  // 脏标记管理
  // ============================================================================

  /**
   * 标记本地变换为脏
   */
  markLocalDirty(): void {
    this._localDirty = true;
    this._worldDirty = true;
  }

  /**
   * 标记世界变换为脏
   */
  markWorldDirty(): void {
    this._worldDirty = true;
  }

  /**
   * 检查世界变换是否为脏
   */
  isWorldDirty(): boolean {
    return this._worldDirty;
  }

  /**
   * 清除脏标记
   */
  clearDirty(): void {
    this._worldDirty = false;
  }

  // ============================================================================
  // 矩阵计算
  // ============================================================================

  /**
   * 获取本地矩阵
   */
  getLocalMatrix(): Matrix4 {
    if (this._localDirty) {
      this.updateLocalMatrix();
      this._localDirty = false;
    }
    return this._localMatrix;
  }

  /**
   * 获取世界矩阵
   */
  getWorldMatrix(): Matrix4 {
    return this._worldMatrix;
  }

  /**
   * 设置世界矩阵（由 HierarchySystem 调用）
   */
  setWorldMatrix(matrix: Matrix4): void {
    this._worldMatrix.set(matrix);
    this._worldDirty = false;
  }

  /**
   * 更新本地矩阵
   */
  private updateLocalMatrix(): void {
    const m = this._localMatrix;
    this.setIdentity(m);

    // 应用缩放
    this.scale3(m, this.scale);

    // 应用旋转（ZYX 顺序）
    this.rotateZ(m, this.rotation[2]);
    this.rotateY(m, this.rotation[1]);
    this.rotateX(m, this.rotation[0]);

    // 应用平移
    this.translate(m, this.position);
  }

  /**
   * 从世界矩阵提取世界位置
   */
  getWorldPosition(): [number, number, number] {
    const m = this._worldMatrix;
    return [m[12], m[13], m[14]];
  }

  /**
   * 从世界矩阵提取世界旋转（简化版，仅提取 Y 轴旋转）
   */
  getWorldRotation(): [number, number, number] {
    // 简化实现：仅返回本地旋转
    // 完整实现需要从矩阵分解欧拉角
    return [...this.rotation] as [number, number, number];
  }

  /**
   * 从世界矩阵提取世界缩放
   */
  getWorldScale(): [number, number, number] {
    const m = this._worldMatrix;
    const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
    const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
    const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
    return [sx, sy, sz];
  }

  // ============================================================================
  // 矩阵工具方法
  // ============================================================================

  /**
   * 设置为单位矩阵
   */
  private setIdentity(m: Matrix4): void {
    m[0] = 1; m[4] = 0; m[8] = 0; m[12] = 0;
    m[1] = 0; m[5] = 1; m[9] = 0; m[13] = 0;
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0;
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1;
  }

  /**
   * 平移矩阵
   */
  private translate(m: Matrix4, v: [number, number, number]): void {
    m[12] += v[0];
    m[13] += v[1];
    m[14] += v[2];
  }

  /**
   * 绕 X 轴旋转
   */
  private rotateX(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    const m1 = m[1], m2 = m[2];
    const m5 = m[5], m6 = m[6];
    const m9 = m[9], m10 = m[10];

    m[1] = m1 * c + m2 * s;
    m[2] = m2 * c - m1 * s;
    m[5] = m5 * c + m6 * s;
    m[6] = m6 * c - m5 * s;
    m[9] = m9 * c + m10 * s;
    m[10] = m10 * c - m9 * s;
  }

  /**
   * 绕 Y 轴旋转
   */
  private rotateY(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    const m0 = m[0], m2 = m[2];
    const m4 = m[4], m6 = m[6];
    const m8 = m[8], m10 = m[10];

    m[0] = m0 * c - m2 * s;
    m[2] = m2 * c + m0 * s;
    m[4] = m4 * c - m6 * s;
    m[6] = m6 * c + m4 * s;
    m[8] = m8 * c - m10 * s;
    m[10] = m10 * c + m8 * s;
  }

  /**
   * 绕 Z 轴旋转
   */
  private rotateZ(m: Matrix4, degrees: number): void {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    const m0 = m[0], m1 = m[1];
    const m4 = m[4], m5 = m[5];
    const m8 = m[8], m9 = m[9];

    m[0] = m0 * c + m1 * s;
    m[1] = m1 * c - m0 * s;
    m[4] = m4 * c + m5 * s;
    m[5] = m5 * c - m4 * s;
    m[8] = m8 * c + m9 * s;
    m[9] = m9 * c - m8 * s;
  }

  /**
   * 缩放矩阵
   */
  private scale3(m: Matrix4, v: [number, number, number]): void {
    m[0] *= v[0];
    m[1] *= v[0];
    m[2] *= v[0];
    m[3] *= v[0];

    m[4] *= v[1];
    m[5] *= v[1];
    m[6] *= v[1];
    m[7] *= v[1];

    m[8] *= v[2];
    m[9] *= v[2];
    m[10] *= v[2];
    m[11] *= v[2];
  }

  /**
   * 矩阵相乘：result = a * b
   */
  static multiply(a: Matrix4, b: Matrix4, result: Matrix4): void {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
    const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
    const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
    const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

    result[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    result[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    result[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    result[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;

    result[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    result[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    result[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    result[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;

    result[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    result[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    result[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    result[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;

    result[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    result[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    result[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    result[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;
  }

  // ============================================================================
  // 序列化
  // ============================================================================

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      position: this.position,
      rotation: this.rotation,
      scale: this.scale,
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled;
    this.position = data.position || [0, 0, 0];
    this.rotation = data.rotation || [0, 0, 0];
    this.scale = data.scale || [1, 1, 1];
    this.markLocalDirty();
  }
}
