/**
 * PolyForge v1.3.0 TransformComponent
 * 变换组件 - 用于测试和演示
 */

import { Component, ComponentData } from '../types';

/**
 * TransformComponent 变换组件
 * 存储实体的位置、旋转、缩放信息
 */
export class TransformComponent implements Component {
  public readonly type = 'Transform';
  public enabled: boolean = true;

  public position: [number, number, number];
  public rotation: [number, number, number];
  public scale: [number, number, number];

  constructor(
    position: [number, number, number] = [0, 0, 0],
    rotation: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1]
  ) {
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }

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
  }
}
