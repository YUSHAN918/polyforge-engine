/**
 * PolyForge v1.3.0 - TerrainComponent
 * Phase 11.2: 动态地形组件
 * 
 * 功能：
 * - 存储地形高度数据（Float32Array）
 * - 支持序列化到 WorldStateManager
 * - 高性能顶点数据管理
 */

import { Component } from '../types';

/**
 * 地形配置
 */
export interface TerrainConfig {
  width: number;           // 地形宽度（世界单位）
  depth: number;           // 地形深度（世界单位）
  widthSegments: number;   // 宽度分段数
  depthSegments: number;   // 深度分段数
}

/**
 * TerrainComponent - 地形组件
 * 
 * 存储地形的高度数据和配置信息
 */
export class TerrainComponent implements Component {
  readonly type = 'Terrain';
  enabled: boolean = true;  // 组件启用状态

  // 地形配置
  config: TerrainConfig;

  // 高度数据（Float32Array，可序列化）
  heightData: Float32Array;

  // 脏标记（用于优化更新）
  isDirty: boolean = false;

  // 受影响的区域（用于局部更新优化）
  dirtyRegion: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null = null;

  constructor(config?: TerrainConfig) {
    // 🔥 提供默认配置，支持无参数构造（用于组件注册）
    this.config = config || {
      width: 50,
      depth: 50,
      widthSegments: 100,
      depthSegments: 100,
    };

    // 初始化高度数据
    const vertexCount = (this.config.widthSegments + 1) * (this.config.depthSegments + 1);
    this.heightData = new Float32Array(vertexCount);

    // 初始化为平坦地形（高度为 0）
    this.heightData.fill(0);
  }

  /**
   * 获取指定位置的高度
   * 
   * @param x 网格 X 坐标（0 到 widthSegments）
   * @param z 网格 Z 坐标（0 到 depthSegments）
   * @returns 高度值
   */
  getHeight(x: number, z: number): number {
    if (x < 0 || x > this.config.widthSegments || z < 0 || z > this.config.depthSegments) {
      return 0;
    }

    const index = z * (this.config.widthSegments + 1) + x;
    return this.heightData[index];
  }

  /**
   * 设置指定位置的高度
   * 
   * @param x 网格 X 坐标
   * @param z 网格 Z 坐标
   * @param height 高度值
   */
  setHeight(x: number, z: number, height: number): void {
    if (x < 0 || x > this.config.widthSegments || z < 0 || z > this.config.depthSegments) {
      return;
    }

    const index = z * (this.config.widthSegments + 1) + x;
    this.heightData[index] = height;

    // 标记为脏
    this.isDirty = true;

    // 更新脏区域
    if (!this.dirtyRegion) {
      this.dirtyRegion = { minX: x, maxX: x, minZ: z, maxZ: z };
    } else {
      this.dirtyRegion.minX = Math.min(this.dirtyRegion.minX, x);
      this.dirtyRegion.maxX = Math.max(this.dirtyRegion.maxX, x);
      this.dirtyRegion.minZ = Math.min(this.dirtyRegion.minZ, z);
      this.dirtyRegion.maxZ = Math.max(this.dirtyRegion.maxZ, z);
    }
  }

  /**
   * 修改指定位置的高度（增量）
   * 
   * @param x 网格 X 坐标
   * @param z 网格 Z 坐标
   * @param delta 高度变化量
   */
  modifyHeight(x: number, z: number, delta: number): void {
    const currentHeight = this.getHeight(x, z);
    this.setHeight(x, z, currentHeight + delta);
  }

  /**
   * 清除脏标记
   */
  clearDirty(): void {
    this.isDirty = false;
    this.dirtyRegion = null;
  }

  /**
   * 序列化为 JSON
   */
  serialize(): any {
    return {
      type: this.type,
      enabled: this.enabled,
      config: this.config,
      heightData: Array.from(this.heightData), // 转换为普通数组以便序列化
    };
  }

  /**
   * 从 JSON 反序列化
   */
  deserialize(data: any): void {
    this.enabled = data.enabled ?? true;
    this.config = data.config;
    this.heightData = new Float32Array(data.heightData);
  }

  /**
   * 动态调整地形物理尺寸
   * 保持现有分段数不变，即“拉伸”模式
   */
  public resize(width: number, depth: number): void {
    if (width <= 0 || depth <= 0) return;

    this.config.width = width;
    this.config.depth = depth;

    // 标记为全量脏，触发网格重建
    this.isDirty = true;
    this.dirtyRegion = {
      minX: 0,
      maxX: this.config.widthSegments,
      minZ: 0,
      maxZ: this.config.depthSegments,
    };

    console.log(`🗺️ [TerrainComponent] Size updated: ${width}x${depth}`);
  }

  /**
   * 静态反序列化方法（用于创建新实例）
   */
  static deserialize(data: any): TerrainComponent {
    const component = new TerrainComponent(data.config);
    component.enabled = data.enabled ?? true;
    component.heightData = new Float32Array(data.heightData);
    return component;
  }
}

