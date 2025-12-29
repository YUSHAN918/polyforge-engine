/**
 * PolyForge v1.3.0 EntityManager Implementation
 * EntityManager 实体管理器实现
 */

import { Entity } from './Entity';
import { Component, SerializedEntity, QueryResult } from './types';
import type { SystemManager } from './SystemManager';

/**
 * EntityManager 实体管理器
 * 负责管理所有 Entity 的生命周期和查询
 */
export class EntityManager {
  /** 所有实体的映射 */
  private entities: Map<string, Entity>;

  /** 组件索引：componentType -> Set<entityId> */
  private componentIndex: Map<string, Set<string>>;

  /** 根实体列表（没有父实体的实体） */
  private hierarchyRoot: Entity[];

  /** 组件注册表：componentType -> ComponentClass */
  private componentRegistry: Map<string, new () => Component>;

  /** SystemManager 引用（可选） */
  private systemManager?: SystemManager;

  constructor() {
    this.entities = new Map();
    this.componentIndex = new Map();
    this.hierarchyRoot = [];
    this.componentRegistry = new Map();
    this.systemManager = undefined;
  }

  // ============================================================================
  // SystemManager 集成
  // ============================================================================

  /**
   * 设置 SystemManager（用于实体/组件变化通知）
   */
  setSystemManager(systemManager: SystemManager): void {
    this.systemManager = systemManager;
  }

  // ============================================================================
  // 组件注册
  // ============================================================================

  /**
   * 注册组件类型
   */
  registerComponent(componentType: string, ComponentClass: new () => Component): void {
    if (this.componentRegistry.has(componentType)) {
      console.warn(`Component type ${componentType} already registered`);
      return;
    }
    this.componentRegistry.set(componentType, ComponentClass);
  }

  /**
   * 获取已注册的组件类型列表
   */
  getRegisteredComponentTypes(): string[] {
    return Array.from(this.componentRegistry.keys());
  }

  // ============================================================================
  // Entity 生命周期管理
  // ============================================================================

  /**
   * 创建实体
   */
  createEntity(name: string = 'Entity', id?: string): Entity {
    const entity = new Entity(name, id);
    this.entities.set(entity.id, entity);
    this.hierarchyRoot.push(entity);

    // 通知 SystemManager
    if (this.systemManager) {
      this.systemManager.notifyEntityAdded(entity);
    }

    return entity;
  }

  /**
   * 销毁实体
   */
  destroyEntity(id: string): boolean {
    const entity = this.entities.get(id);
    if (!entity) {
      // 静默返回，不产生警告
      return false;
    }

    // 通知 SystemManager（在销毁前）
    if (this.systemManager) {
      this.systemManager.notifyEntityRemoved(entity);
    }

    // 从组件索引中移除
    for (const componentType of entity.components.keys()) {
      this.removeFromComponentIndex(id, componentType);
    }

    // 从层级中移除
    if (entity.parent) {
      entity.removeParent();
    } else {
      const index = this.hierarchyRoot.indexOf(entity);
      if (index !== -1) {
        this.hierarchyRoot.splice(index, 1);
      }
    }

    // 递归销毁所有子实体
    const childrenIds = entity.children.map(c => c.id);
    for (const childId of childrenIds) {
      this.destroyEntity(childId);
    }

    // 清理实体
    entity.destroy();
    this.entities.delete(id);

    return true;
  }

  /**
   * 获取实体（静默返回，不产生警告）
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * 获取实体（如果不存在则发出警告）
   * 用于调试和需要明确错误提示的场景
   */
  getEntityOrWarn(id: string): Entity | undefined {
    const entity = this.entities.get(id);
    if (!entity) {
      console.warn(`⚠️ Entity not found: ${id}`);
    }
    return entity;
  }

  /**
   * 检查实体是否存在
   */
  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * 获取所有实体
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * 获取实体数量
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  // ============================================================================
  // 组件管理
  // ============================================================================

  /**
   * 为实体添加组件
   */
  addComponent(entityId: string, component: Component): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      // 静默返回，不产生警告
      return false;
    }

    entity.addComponent(component);
    this.addToComponentIndex(entityId, component.type);

    // 通知 SystemManager
    if (this.systemManager) {
      this.systemManager.notifyComponentChanged(entity, component.type, true);
    }

    return true;
  }

  /**
   * 从实体移除组件
   */
  removeComponent(entityId: string, componentType: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) {
      // 静默返回，不产生警告
      return false;
    }

    const removed = entity.removeComponent(componentType);
    if (removed) {
      this.removeFromComponentIndex(entityId, componentType);

      // 通知 SystemManager
      if (this.systemManager) {
        this.systemManager.notifyComponentChanged(entity, componentType, false);
      }
    }
    return removed;
  }

  /**
   * 添加到组件索引
   */
  private addToComponentIndex(entityId: string, componentType: string): void {
    if (!this.componentIndex.has(componentType)) {
      this.componentIndex.set(componentType, new Set());
    }
    this.componentIndex.get(componentType)!.add(entityId);
  }

  /**
   * 从组件索引移除
   */
  private removeFromComponentIndex(entityId: string, componentType: string): void {
    const index = this.componentIndex.get(componentType);
    if (index) {
      index.delete(entityId);
      if (index.size === 0) {
        this.componentIndex.delete(componentType);
      }
    }
  }

  // ============================================================================
  // 查询系统
  // ============================================================================

  /**
   * 查询拥有指定组件的实体
   * 使用组件索引进行高效查询
   */
  getEntitiesWithComponents(componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) {
      return this.getAllEntities();
    }

    // 找到拥有实体最少的组件类型，从它开始查询
    let smallestSet: Set<string> | undefined;
    let smallestSize = Infinity;

    for (const type of componentTypes) {
      const set = this.componentIndex.get(type);
      if (!set || set.size === 0) {
        // 如果任何一个组件类型没有实体，直接返回空数组
        return [];
      }
      if (set.size < smallestSize) {
        smallestSet = set;
        smallestSize = set.size;
      }
    }

    if (!smallestSet) {
      return [];
    }

    // 从最小集合开始，检查每个实体是否拥有所有其他组件
    const result: Entity[] = [];
    for (const entityId of smallestSet) {
      const entity = this.entities.get(entityId);
      if (entity && entity.hasAllComponents(componentTypes)) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * 查询拥有指定组件的实体（返回详细结果）
   */
  queryEntities(componentTypes: string[]): QueryResult {
    const entities = this.getEntitiesWithComponents(componentTypes);
    return {
      entities,
      count: entities.length,
    };
  }

  /**
   * 查询激活的实体
   */
  getActiveEntities(): Entity[] {
    return this.getAllEntities().filter(e => e.active);
  }

  /**
   * 查询拥有指定组件且激活的实体
   */
  getActiveEntitiesWithComponents(componentTypes: string[]): Entity[] {
    return this.getEntitiesWithComponents(componentTypes).filter(e => e.active);
  }

  // ============================================================================
  // 层级管理
  // ============================================================================

  /**
   * 设置父子关系
   */
  setParent(childId: string, parentId: string, socketName?: string): boolean {
    const child = this.entities.get(childId);
    const parent = this.entities.get(parentId);

    if (!child || !parent) {
      // 静默返回，不产生警告
      return false;
    }

    // 检查是否会形成循环引用
    if (this.wouldCreateCycle(child, parent)) {
      console.warn(`Cannot set parent: would create cycle`);
      return false;
    }

    // 如果 child 之前是根实体，从根列表移除
    if (!child.parent) {
      const index = this.hierarchyRoot.indexOf(child);
      if (index !== -1) {
        this.hierarchyRoot.splice(index, 1);
      }
    }

    child.setParent(parent, socketName);
    return true;
  }

  /**
   * 移除父子关系
   */
  removeParent(childId: string): boolean {
    const child = this.entities.get(childId);
    if (!child) {
      // 静默返回，不产生警告
      return false;
    }

    if (child.parent) {
      child.removeParent();
      this.hierarchyRoot.push(child);
    }

    return true;
  }

  /**
   * 获取子实体
   */
  getChildren(parentId: string): Entity[] {
    const parent = this.entities.get(parentId);
    return parent ? parent.children : [];
  }

  /**
   * 获取根实体
   */
  getRootEntities(): Entity[] {
    return [...this.hierarchyRoot];
  }

  /**
   * 检查是否会形成循环引用
   */
  private wouldCreateCycle(child: Entity, newParent: Entity): boolean {
    let current: Entity | undefined = newParent;
    while (current) {
      if (current === child) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  // ============================================================================
  // 序列化
  // ============================================================================

  /**
   * 序列化所有实体
   */
  serializeAll(): SerializedEntity[] {
    return this.getAllEntities().map(e => e.serialize());
  }

  /**
   * 从序列化数据恢复所有实体
   */
  deserializeAll(data: SerializedEntity[]): void {
    // 第一遍：创建所有实体
    const entityMap = new Map<string, Entity>();
    for (const entityData of data) {
      const entity = Entity.deserialize(entityData, this.componentRegistry);
      this.entities.set(entity.id, entity);
      entityMap.set(entity.id, entity);

      // 更新组件索引
      for (const componentType of entity.components.keys()) {
        this.addToComponentIndex(entity.id, componentType);
      }
    }

    // 第二遍：恢复层级关系
    for (const entityData of data) {
      const entity = entityMap.get(entityData.id);
      if (!entity) continue;

      if (entityData.parentId) {
        const parent = entityMap.get(entityData.parentId);
        if (parent) {
          entity.setParent(parent, entityData.socketName);
        } else {
          // 父实体未找到，将其作为根实体
          this.hierarchyRoot.push(entity);
        }
      } else {
        this.hierarchyRoot.push(entity);
      }
    }

    // 🔥 第三遍：通知所有系统（打通影子引擎神经网络）
    if (this.systemManager) {
      for (const entity of entityMap.values()) {
        this.systemManager.notifyEntityAdded(entity);
        // 通知组件初始状态
        for (const componentType of entity.components.keys()) {
          this.systemManager.notifyComponentChanged(entity, componentType, true);
        }
      }
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 清空所有实体
   */
  clear(): void {
    // 销毁所有实体
    const entityIds = Array.from(this.entities.keys());
    for (const id of entityIds) {
      this.destroyEntity(id);
    }

    this.entities.clear();
    this.componentIndex.clear();
    this.hierarchyRoot = [];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalEntities: number;
    activeEntities: number;
    rootEntities: number;
    componentTypes: number;
    averageComponentsPerEntity: number;
  } {
    const totalEntities = this.entities.size;
    const activeEntities = this.getActiveEntities().length;
    const rootEntities = this.hierarchyRoot.length;
    const componentTypes = this.componentIndex.size;

    let totalComponents = 0;
    for (const entity of this.entities.values()) {
      totalComponents += entity.components.size;
    }

    return {
      totalEntities,
      activeEntities,
      rootEntities,
      componentTypes,
      averageComponentsPerEntity: totalEntities > 0 ? totalComponents / totalEntities : 0,
    };
  }

  /**
   * 打印调试信息
   */
  debug(): void {
    const stats = this.getStats();
    console.log('=== EntityManager Debug Info ===');
    console.log(`Total Entities: ${stats.totalEntities}`);
    console.log(`Active Entities: ${stats.activeEntities}`);
    console.log(`Root Entities: ${stats.rootEntities}`);
    console.log(`Component Types: ${stats.componentTypes}`);
    console.log(`Avg Components/Entity: ${stats.averageComponentsPerEntity.toFixed(2)}`);
    console.log('Component Index:');
    for (const [type, entityIds] of this.componentIndex.entries()) {
      console.log(`  ${type}: ${entityIds.size} entities`);
    }
  }
}
