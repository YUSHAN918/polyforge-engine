/**
 * PolyForge v1.3.0 VisualComponent
 * 视觉组件 - 定义实体的渲染外观
 */

import { Component, ComponentData } from '../types';

/**
 * 几何体数据
 */
export interface GeometryData {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'custom' | 'model';
  parameters?: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
    segments?: number;
    [key: string]: any;
  };
  assetId?: string; // 自定义模型的资产 ID
}

/**
 * 材质数据
 */
export interface MaterialData {
  type: 'standard' | 'basic' | 'phong' | 'physical';
  color: string; // 十六进制颜色 '#RRGGBB'
  metalness?: number; // 0-1
  roughness?: number; // 0-1
  opacity?: number; // 0-1
  transparent?: boolean;
  textureAssetId?: string; // 纹理资产 ID
}

/**
 * 自发光配置
 */
export interface EmissiveConfig {
  color: string; // 十六进制颜色 '#RRGGBB'
  intensity: number; // 发光强度 0-10
}

/**
 * 后期处理配置
 */
export interface PostProcessingConfig {
  bloom: boolean; // 是否参与辉光效果
  outline: boolean; // 是否显示轮廓
  hover?: boolean; // 🔥 是否显示悬停高亮
}

/**
 * VisualComponent 视觉组件
 * 定义实体的视觉外观，包括几何体、材质、自发光和后期处理
 */
export class VisualComponent implements Component {
  public readonly type = 'Visual';
  public enabled: boolean = true;

  // 网格数据
  public geometry: GeometryData;
  public material: MaterialData;

  // 自发光配置
  public emissive: EmissiveConfig;

  // 后期处理配置
  public postProcessing: PostProcessingConfig;

  // 阴影配置
  public castShadow: boolean;
  public receiveShadow: boolean;

  // 偏移量 (相对于实体的本地偏移)
  public offset: [number, number, number];

  // 可见性
  public visible: boolean;

  constructor(
    geometry: GeometryData = {
      type: 'box',
      parameters: { width: 1, height: 1, depth: 1 },
    },
    material: MaterialData = {
      type: 'standard',
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.5,
    },
    emissive: EmissiveConfig = {
      color: '#000000',
      intensity: 0,
    },
    postProcessing: PostProcessingConfig = {
      bloom: false,
      outline: false,
      hover: false,
    }
  ) {
    this.geometry = geometry;
    this.material = material;
    this.emissive = emissive;
    this.postProcessing = postProcessing;
    this.castShadow = true;
    this.receiveShadow = true;
    this.offset = [0, 0, 0];
    this.visible = true;
  }

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      geometry: this.geometry,
      material: this.material,
      emissive: this.emissive,
      postProcessing: this.postProcessing,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow,
      offset: this.offset,
      visible: this.visible,
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled ?? true;
    this.geometry = data.geometry || {
      type: 'box',
      parameters: { width: 1, height: 1, depth: 1 },
    };
    this.material = data.material || {
      type: 'standard',
      color: '#ffffff',
      metalness: 0.5,
      roughness: 0.5,
    };
    this.emissive = data.emissive || {
      color: '#000000',
      intensity: 0,
    };
    this.postProcessing = data.postProcessing || {
      bloom: false,
      outline: false,
      hover: false,
    };
    this.castShadow = data.castShadow ?? true;
    this.receiveShadow = data.receiveShadow ?? true;
    this.offset = data.offset || [0, 0, 0];
    this.visible = data.visible ?? true;
  }

  /**
   * 设置自发光
   */
  setEmissive(color: string, intensity: number): void {
    this.emissive.color = color;
    this.emissive.intensity = intensity;
    // 如果有自发光，自动启用 bloom
    if (intensity > 0) {
      this.postProcessing.bloom = true;
    }
  }

  /**
   * 检查是否有自发光
   */
  hasEmissive(): boolean {
    return this.emissive.intensity > 0;
  }

  /**
   * 启用/禁用后期处理效果
   */
  setPostProcessing(bloom: boolean, outline: boolean): void {
    this.postProcessing.bloom = bloom;
    this.postProcessing.outline = outline;
  }
}
