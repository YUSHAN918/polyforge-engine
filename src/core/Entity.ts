/**
 * PolyForge v1.3.0 Entity Implementation
 * Entity 实体实现
 */

import { Entity as IEntity, Component, Socket, SerializedEntity } from './types';
import { generateUID } from './utils';

/**
 * Entity 实体类
 * 游戏世界中的基本对象单元，通过组件组合定义其行为
 */
export class Entity implements IEntity {
  public readonly id: string;
  public name: string;
  public components: Map<string, Component>;
  public parent?: Entity;
  public parentSocket: string | null = null; // 存储父实体的 socket 名称
  public children: Entity[];
  public sockets: Map<string, Socket>;
  public active: boolean;

  constructor(name: string = 'Entity', id?: string) {
    this.id = id || generateUID();
    this.name = name;
    this.components = new Map();
    this.children = [];
    this.sockets = new Map();
    this.active = true;
  }

  // ============================================================================
  // 组件管理
  // ============================================================================

  /**
   * 添加组件
   */
  addComponent(component: Component): void {
    if (this.components.has(component.type)) {
      console.warn(`Entity ${this.id} already has component of type ${component.type}`);
      return;
    }
    this.components.set(component.type, component);
  }

  /**
   * 移除组件
   */
  removeComponent(componentType: string): boolean {
    return this.components.delete(componentType);
  }

  /**
   * 获取组件
   */
  getComponent<T extends Component>(componentType: string): T | undefined {
    return this.components.get(componentType) as T | undefined;
  }

  /**
   * 检查是否有组件
   */
  hasComponent(componentType: string): boolean {
    return this.components.has(componentType);
  }

  /**
   * 检查是否有所有指定组件
   */
  hasAllComponents(componentTypes: string[]): boolean {
    return componentTypes.every(type => this.components.has(type));
  }

  // ============================================================================
  // 层级管理
  // ============================================================================

  /**
   * 设置父实体
   */
  setParent(parent: Entity, socketName?: string): void {
    // 移除旧的父子关系
    if (this.parent) {
      const index = this.parent.children.indexOf(this);
      if (index !== -1) {
        this.parent.children.splice(index, 1);
      }
      
      // 如果之前占用了 socket，清空它
      if (this.parentSocket && this.parent.sockets.has(this.parentSocket)) {
        const socket = this.parent.sockets.get(this.parentSocket)!;
        if (socket.occupied === this) {
          socket.occupied = undefined;
        }
      }
    }

    // 建立新的父子关系
    this.parent = parent;
    this.parentSocket = socketName || null; // 存储 socket 名称
    parent.children.push(this);

    // 如果指定了 socket，占用它
    if (socketName) {
      const socket = parent.sockets.get(socketName);
      if (socket) {
        // 检查类型限制
        if (socket.allowedTypes && socket.allowedTypes.length > 0) {
          // 这里可以添加类型检查逻辑
          // 暂时简化处理
        }
        socket.occupied = this;
      } else {
        console.warn(`Socket ${socketName} not found on parent entity ${parent.id}`);
      }
    }
  }

  /**
   * 移除父实体
   */
  removeParent(): void {
    if (!this.parent) return;

    const index = this.parent.children.indexOf(this);
    if (index !== -1) {
      this.parent.children.splice(index, 1);
    }

    // 清空占用的 socket
    for (const socket of this.parent.sockets.values()) {
      if (socket.occupied === this) {
        socket.occupied = undefined;
      }
    }

    this.parent = undefined;
    this.parentSocket = null; // 清空 socket 名称
  }

  /**
   * 获取所有子实体（递归）
   */
  getAllChildren(): Entity[] {
    const result: Entity[] = [];
    const traverse = (entity: Entity) => {
      for (const child of entity.children) {
        result.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return result;
  }

  // ============================================================================
  // Socket 管理
  // ============================================================================

  /**
   * 添加 Socket
   */
  addSocket(socket: Socket): void {
    if (this.sockets.has(socket.name)) {
      console.warn(`Entity ${this.id} already has socket ${socket.name}`);
      return;
    }
    this.sockets.set(socket.name, socket);
  }

  /**
   * 移除 Socket
   */
  removeSocket(socketName: string): boolean {
    const socket = this.sockets.get(socketName);
    if (socket && socket.occupied) {
      socket.occupied.removeParent();
    }
    return this.sockets.delete(socketName);
  }

  /**
   * 获取 Socket
   */
  getSocket(socketName: string): Socket | undefined {
    return this.sockets.get(socketName);
  }

  /**
   * 检查 Socket 是否被占用
   */
  isSocketOccupied(socketName: string): boolean {
    const socket = this.sockets.get(socketName);
    return socket ? socket.occupied !== undefined : false;
  }

  // ============================================================================
  // 序列化
  // ============================================================================

  /**
   * 序列化为 JSON
   */
  serialize(): SerializedEntity {
    const components = Array.from(this.components.values()).map(c => c.serialize());
    
    const sockets = Array.from(this.sockets.values()).map(s => ({
      name: s.name,
      localTransform: s.localTransform,
      allowedTypes: s.allowedTypes,
    }));

    const data: SerializedEntity = {
      id: this.id,
      name: this.name,
      active: this.active,
      components,
      sockets,
    };

    // 如果有父实体，记录父实体 ID
    if (this.parent) {
      data.parentId = this.parent.id;
      
      // 查找附加到哪个 socket
      for (const [socketName, socket] of this.parent.sockets.entries()) {
        if (socket.occupied === this) {
          data.socketName = socketName;
          break;
        }
      }
    }

    return data;
  }

  /**
   * 从序列化数据恢复（不包括层级关系，需要 EntityManager 处理）
   */
  static deserialize(data: SerializedEntity, componentRegistry: Map<string, new () => Component>): Entity {
    const entity = new Entity(data.name, data.id);
    entity.active = data.active;

    // 恢复 sockets
    for (const socketData of data.sockets) {
      entity.addSocket({
        name: socketData.name,
        localTransform: socketData.localTransform,
        allowedTypes: socketData.allowedTypes,
      });
    }

    // 恢复 components（需要组件注册表）
    for (const componentData of data.components) {
      const ComponentClass = componentRegistry.get(componentData.type);
      if (ComponentClass) {
        const component = new ComponentClass();
        component.deserialize(componentData);
        entity.addComponent(component);
      } else {
        console.warn(`Component type ${componentData.type} not registered, skipping`);
      }
    }

    return entity;
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 克隆实体（深拷贝，不包括层级关系）
   */
  clone(newName?: string): Entity {
    const cloned = new Entity(newName || `${this.name}_clone`);
    cloned.active = this.active;

    // 克隆组件
    for (const [type, component] of this.components.entries()) {
      const data = component.serialize();
      const ComponentClass = (component as any).constructor;
      const clonedComponent = new ComponentClass();
      clonedComponent.deserialize(data);
      cloned.addComponent(clonedComponent);
    }

    // 克隆 sockets
    for (const socket of this.sockets.values()) {
      cloned.addSocket({
        name: socket.name,
        localTransform: {
          position: [...socket.localTransform.position] as [number, number, number],
          rotation: [...socket.localTransform.rotation] as [number, number, number],
          scale: [...socket.localTransform.scale] as [number, number, number],
        },
        allowedTypes: socket.allowedTypes ? [...socket.allowedTypes] : undefined,
      });
    }

    return cloned;
  }

  /**
   * 销毁实体（清理所有引用）
   */
  destroy(): void {
    // 移除父子关系
    this.removeParent();

    // 递归销毁所有子实体
    for (const child of [...this.children]) {
      child.destroy();
    }

    // 清空所有数据
    this.components.clear();
    this.sockets.clear();
    this.children = [];
    this.active = false;
  }
}
