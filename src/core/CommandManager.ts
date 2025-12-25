/**
 * PolyForge v1.3.0 CommandManager
 * 命令管理器 - 实现撤销/重做功能
 */

import { EntityManager } from './EntityManager';
import { SerializationService } from './SerializationService';
import { Component, SerializedEntity } from './types';

/**
 * 命令接口
 * 所有命令必须实现此接口
 */
export interface ICommand {
  /** 命令唯一 ID */
  id: string;

  /** 命令名称 */
  name: string;

  /** 时间戳 */
  timestamp: number;

  /** 执行命令 */
  execute(): void;

  /** 撤销命令 */
  undo(): void;
}

/**
 * CommandManager 命令管理器
 * 管理撤销/重做栈
 */
export class CommandManager {
  /** 撤销栈 */
  private undoStack: ICommand[] = [];

  /** 重做栈 */
  private redoStack: ICommand[] = [];

  /** 最大步数限制 */
  private maxStackSize: number;

  /** EntityManager 引用 */
  private entityManager: EntityManager;

  /** SerializationService 引用 */
  private serializationService: SerializationService;

  constructor(
    entityManager: EntityManager,
    serializationService: SerializationService,
    maxStackSize: number = 50
  ) {
    this.entityManager = entityManager;
    this.serializationService = serializationService;
    this.maxStackSize = maxStackSize;
  }

  // ============================================================================
  // 命令执行
  // ============================================================================

  /**
   * 执行命令并添加到撤销栈
   */
  execute(command: ICommand): void {
    // 执行命令
    command.execute();

    // 添加到撤销栈
    this.undoStack.push(command);

    // 清空重做栈（执行新命令后，之前的重做历史失效）
    this.redoStack = [];

    // 限制栈大小
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift(); // 移除最旧的命令
    }

    console.log(`✓ Command executed: ${command.name}`);
  }

  // ============================================================================
  // 撤销/重做
  // ============================================================================

  /**
   * 撤销上一个命令
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      console.warn('⚠️  Nothing to undo');
      return false;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);

    console.log(`↶ Undo: ${command.name}`);
    return true;
  }

  /**
   * 重做上一个撤销的命令
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      console.warn('⚠️  Nothing to redo');
      return false;
    }

    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);

    console.log(`↷ Redo: ${command.name}`);
    return true;
  }

  // ============================================================================
  // 查询
  // ============================================================================

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 获取最后一个命令的名称
   */
  getLastCommandName(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].name;
  }

  // ============================================================================
  // 栈管理
  // ============================================================================

  /**
   * 清空所有历史
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    console.log('✓ Command history cleared');
  }

  /**
   * 设置最大栈大小
   */
  setMaxStackSize(size: number): void {
    this.maxStackSize = Math.max(1, size);

    // 如果当前栈超过新的限制，裁剪
    while (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    undoStackSize: number;
    redoStackSize: number;
    maxStackSize: number;
    lastCommand: string | null;
  } {
    return {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      maxStackSize: this.maxStackSize,
      lastCommand: this.getLastCommandName(),
    };
  }

  /**
   * 获取所有命令历史 (用于可视化列表)
   */
  getHistory(): { undo: ICommand[], redo: ICommand[] } {
    return {
      undo: [...this.undoStack],
      redo: [...this.redoStack]
    };
  }

  /**
   * 打印调试信息
   */
  debug(): void {
    console.log('=== CommandManager Debug Info ===');
    console.log(`Undo Stack: ${this.undoStack.length} commands`);
    console.log(`Redo Stack: ${this.redoStack.length} commands`);
    console.log(`Max Stack Size: ${this.maxStackSize}`);
    console.log(`Last Command: ${this.getLastCommandName() || 'None'}`);

    if (this.undoStack.length > 0) {
      console.log('\nUndo Stack:');
      this.undoStack.forEach((cmd, index) => {
        console.log(`  ${index + 1}. ${cmd.name} (${new Date(cmd.timestamp).toLocaleTimeString()})`);
      });
    }
  }
}

// ============================================================================
// 命令实现
// ============================================================================

/**
 * 创建实体命令
 */
export class CreateEntityCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;

  private entityManager: EntityManager;
  private entityName: string;
  private createdEntityId: string | null = null;

  constructor(entityManager: EntityManager, entityName: string) {
    this.id = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = `Create Entity: ${entityName}`;
    this.timestamp = Date.now();
    this.entityManager = entityManager;
    this.entityName = entityName;
  }

  execute(): void {
    const entity = this.entityManager.createEntity(this.entityName);
    this.createdEntityId = entity.id;
  }

  undo(): void {
    if (this.createdEntityId) {
      this.entityManager.destroyEntity(this.createdEntityId);
      this.createdEntityId = null;
    }
  }
}

/**
 * 删除实体命令
 */
export class DeleteEntityCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;

  private entityManager: EntityManager;
  private serializationService: SerializationService;
  private entityId: string;
  private entitySnapshot: SerializedEntity | null = null;

  constructor(
    entityManager: EntityManager,
    serializationService: SerializationService,
    entityId: string
  ) {
    this.id = `delete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.entityManager = entityManager;
    this.serializationService = serializationService;
    this.entityId = entityId;

    // 获取实体名称用于显示
    const entity = entityManager.getEntity(entityId);
    this.name = `Delete Entity: ${entity?.name || entityId}`;
    this.timestamp = Date.now();
  }

  execute(): void {
    // 在删除前保存快照
    const entity = this.entityManager.getEntity(this.entityId);
    if (entity) {
      this.entitySnapshot = entity.serialize();
    }

    // 删除实体
    this.entityManager.destroyEntity(this.entityId);
  }

  undo(): void {
    // 使用快照恢复实体
    if (this.entitySnapshot) {
      this.serializationService.deserializeEntities([this.entitySnapshot]);
      console.log(`✓ Entity restored: ${this.entitySnapshot.name}`);
    }
  }
}

/**
 * 修改组件命令
 */
export class ModifyComponentCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;

  private entityManager: EntityManager;
  private entityId: string;
  private componentType: string;
  private propertyPath: string;
  private oldValue: any;
  private newValue: any;

  constructor(
    entityManager: EntityManager,
    entityId: string,
    componentType: string,
    propertyPath: string,
    oldValue: any,
    newValue: any
  ) {
    this.id = `modify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = `Modify ${componentType}.${propertyPath}`;
    this.timestamp = Date.now();
    this.entityManager = entityManager;
    this.entityId = entityId;
    this.componentType = componentType;
    this.propertyPath = propertyPath;
    this.oldValue = this.deepClone(oldValue);
    this.newValue = this.deepClone(newValue);
  }

  execute(): void {
    this.setPropertyValue(this.newValue);
  }

  undo(): void {
    this.setPropertyValue(this.oldValue);
  }

  /**
   * 设置属性值（支持嵌套路径，如 "position[0]" 或 "transform.position"）
   */
  private setPropertyValue(value: any): void {
    const entity = this.entityManager.getEntity(this.entityId);
    if (!entity) {
      console.warn(`Entity ${this.entityId} not found`);
      return;
    }

    const component = entity.getComponent<Component>(this.componentType);
    if (!component) {
      console.warn(`Component ${this.componentType} not found on entity ${this.entityId}`);
      return;
    }

    // 解析属性路径
    const pathParts = this.propertyPath.split('.');
    let target: any = component;

    // 导航到目标对象
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);

      if (arrayMatch) {
        const [, prop, index] = arrayMatch;
        target = target[prop][parseInt(index)];
      } else {
        target = target[part];
      }
    }

    // 设置最终属性
    const finalPart = pathParts[pathParts.length - 1];
    const arrayMatch = finalPart.match(/^(\w+)\[(\d+)\]$/);

    if (arrayMatch) {
      const [, prop, index] = arrayMatch;
      target[prop][parseInt(index)] = value;
    } else {
      target[finalPart] = value;
    }
  }

  /**
   * 深度克隆（避免引用问题）
   */
  private deepClone(value: any): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
      return value.map(item => this.deepClone(item));
    }

    if (value instanceof Float32Array) {
      return new Float32Array(value);
    }

    const cloned: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(value[key]);
      }
    }
    return cloned;
  }
}

/**
 * 附加到 Socket 命令
 */
export class AttachToSocketCommand implements ICommand {
  public readonly id: string;
  public readonly name: string;
  public readonly timestamp: number;

  private entityManager: EntityManager;
  private childId: string;
  private parentId: string;
  private socketName: string;
  private previousParentId: string | null = null;
  private previousSocketName: string | null = null;

  constructor(
    entityManager: EntityManager,
    childId: string,
    parentId: string,
    socketName: string
  ) {
    this.id = `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.name = `Attach to Socket: ${socketName}`;
    this.timestamp = Date.now();
    this.entityManager = entityManager;
    this.childId = childId;
    this.parentId = parentId;
    this.socketName = socketName;
  }

  execute(): void {
    const child = this.entityManager.getEntity(this.childId);
    if (child) {
      // 保存之前的父实体信息
      this.previousParentId = child.parent?.id || null;
      this.previousSocketName = child.parentSocket || null;
    }

    // 附加到新的 Socket
    this.entityManager.setParent(this.childId, this.parentId, this.socketName);
  }

  undo(): void {
    if (this.previousParentId) {
      // 恢复到之前的父实体
      this.entityManager.setParent(
        this.childId,
        this.previousParentId,
        this.previousSocketName || undefined
      );
    } else {
      // 移除父实体
      this.entityManager.removeParent(this.childId);
    }
  }
}
