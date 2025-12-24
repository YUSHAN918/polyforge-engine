/**
 * PolyForge v1.3.0 - VegetationComponent
 * Phase 11.3: 植被系统组件
 * 
 * 功能：
 * - 定义植被参数（密度、类型、种子）
 * - 支持多种植被类型（草、花、树）
 * - 序列化支持
 */

import { Component } from '../types';

/**
 * 植被类型
 */
export enum VegetationType {
  GRASS = 'grass',      // 草
  FLOWER = 'flower',    // 花
  TREE = 'tree',        // 树
  BUSH = 'bush',        // 灌木
}

/**
 * 植被配置
 */
export interface VegetationConfig {
  density: number;              // 密度（每平方米的植被数量）
  type: VegetationType;         // 植被类型
  seed: number;                 // 随机种子（用于确定性生成）
  
  // 尺寸参数
  minHeight: number;            // 最小高度
  maxHeight: number;            // 最大高度
  minWidth: number;             // 最小宽度
  maxWidth: number;             // 最大宽度
  scale?: number;               // 全局缩放倍数（可选，默认 1.0）
  
  // 颜色参数
  baseColor: string;            // 基础颜色
  colorVariation: number;       // 颜色变化（0-1）
  
  // 风场参数
  windStrength: number;         // 风力强度（0-1）
  windSpeed: number;            // 风速（影响摆动频率）
  
  // 地形对齐
  alignToTerrain: boolean;      // 是否对齐地形
  terrainEntityId?: string;     // 关联的地形实体 ID
}

/**
 * VegetationComponent - 植被组件
 * 
 * 存储植被的配置信息，实际渲染由 VegetationSystem 管理
 */
export class VegetationComponent implements Component {
  readonly type = 'Vegetation';
  enabled: boolean = true;

  // 植被配置
  config: VegetationConfig;

  // 实例数据（由 VegetationSystem 生成）
  instanceCount: number = 0;
  instanceData: Float32Array | null = null; // 位置、旋转、缩放数据

  // 🔥 版本控制：每次数据重写时递增，用于触发渲染层更新
  version: number = 0;

  // 脏标记（用于触发重新生成）
  isDirty: boolean = true;
  
  // 🔥 缩放脏标记（用于触发矩阵重新灌入，不重新生成实例）
  isScaleDirty: boolean = false;

  constructor(config: Partial<VegetationConfig> = {}) {
    // 默认配置
    this.config = {
      density: 10,
      type: VegetationType.GRASS,
      seed: Math.random() * 10000,
      minHeight: 0.5,
      maxHeight: 1.0,
      minWidth: 0.1,
      maxWidth: 0.2,
      scale: 1.0, // 🔥 默认全局缩放为 1.0
      baseColor: '#4a7c3a',
      colorVariation: 0.2,
      windStrength: 0.5,
      windSpeed: 1.0,
      alignToTerrain: true,
      ...config,
    };
  }

  /**
   * 设置密度
   */
  setDensity(density: number): void {
    this.config.density = Math.max(0, density);
    this.isDirty = true;
  }

  /**
   * 设置植被类型
   */
  setType(type: VegetationType): void {
    this.config.type = type;
    this.isDirty = true;
  }

  /**
   * 设置随机种子
   */
  setSeed(seed: number): void {
    this.config.seed = seed;
    this.isDirty = true;
  }

  /**
   * 设置风力参数
   */
  setWind(strength: number, speed: number): void {
    this.config.windStrength = Math.max(0, Math.min(1, strength));
    this.config.windSpeed = Math.max(0, speed);
  }

  /**
   * 关联地形实体
   */
  setTerrainEntity(terrainEntityId: string): void {
    this.config.terrainEntityId = terrainEntityId;
    this.isDirty = true;
  }

  /**
   * 标记为脏（触发重新生成）
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * 清除脏标记
   */
  clearDirty(): void {
    this.isDirty = false;
  }

  /**
   * 序列化为 JSON
   */
  serialize(): any {
    return {
      type: this.type,
      enabled: this.enabled,
      config: this.config,
      instanceCount: this.instanceCount,
    };
  }

  /**
   * 从 JSON 反序列化
   */
  deserialize(data: any): void {
    this.enabled = data.enabled ?? true;
    this.config = data.config;
    this.instanceCount = data.instanceCount || 0;
    this.isDirty = true; // 反序列化后需要重新生成
  }

  /**
   * 静态反序列化方法
   */
  static deserialize(data: any): VegetationComponent {
    const component = new VegetationComponent(data.config);
    component.enabled = data.enabled ?? true;
    component.instanceCount = data.instanceCount || 0;
    component.isDirty = true;
    return component;
  }
}
