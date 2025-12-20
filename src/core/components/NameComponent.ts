/**
 * PolyForge v1.3.0 NameComponent
 * 名称组件 - 用于测试和演示
 */

import { Component, ComponentData } from '../types';

/**
 * NameComponent 名称组件
 * 存储实体的显示名称和描述
 */
export class NameComponent implements Component {
  public readonly type = 'Name';
  public enabled: boolean = true;

  public displayName: string;
  public description: string;

  constructor(displayName: string = 'Unnamed', description: string = '') {
    this.displayName = displayName;
    this.description = description;
  }

  serialize(): ComponentData {
    return {
      type: this.type,
      enabled: this.enabled,
      displayName: this.displayName,
      description: this.description,
    };
  }

  deserialize(data: ComponentData): void {
    this.enabled = data.enabled;
    this.displayName = data.displayName || 'Unnamed';
    this.description = data.description || '';
  }
}
