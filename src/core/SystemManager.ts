/**
 * PolyForge v1.3.0 SystemManager Implementation
 * SystemManager 系统管理器实现
 */

import { System, Entity } from './types';
import { EntityManager } from './EntityManager';
import { Clock } from './Clock';

/**
 * SystemManager 系统管理器
 * 负责管理所有 System 的注册、排序和更新循环
 */
export class SystemManager {
  /** 所有注册的系统 */
  private systems: System[];

  /** 系统映射（用于快速查找） */
  private systemMap: Map<string, System>;

  /** EntityManager 引用 */
  private entityManager: EntityManager;

  /** Clock 时钟引用 */
  private clock: Clock;

  /** 是否已排序 */
  private sorted: boolean;

  constructor(entityManager: EntityManager, clock?: Clock) {
    this.systems = [];
    this.systemMap = new Map();
    this.entityManager = entityManager;
    this.clock = clock || new Clock();
    this.sorted = true;
  }

  // ============================================================================
  // Clock 管理
  // ============================================================================

  /**
   * 获取 Clock 实例
   */
  getClock(): Clock {
    return this.clock;
  }

  /**
   * 设置 Clock 实例
   */
  setClock(clock: Clock): void {
    this.clock = clock;
  }

  // ============================================================================
  // System 注册管理
  // ============================================================================

  /**
   * 注册系统
   */
  registerSystem(name: string, system: System): void {
    if (this.systemMap.has(name)) {
      console.warn(`System ${name} already registered`);
      return;
    }

    this.systems.push(system);
    this.systemMap.set(name, system);
    this.sorted = false; // 标记需要重新排序

    // 🆕 自动调用 initialize（如果存在）
    if (typeof (system as any).initialize === 'function') {
      try {
        (system as any).initialize(this.entityManager, this.clock);
        console.log(`✓ System initialized: ${name}`);
      } catch (error) {
        console.error(`✗ System initialization failed: ${name}`, error);
      }
    }

    console.log(`✓ System registered: ${name} (priority: ${system.priority})`);
  }

  /**
   * 注销系统
   */
  unregisterSystem(name: string): boolean {
    const system = this.systemMap.get(name);
    if (!system) {
      console.warn(`System ${name} not found`);
      return false;
    }

    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }

    this.systemMap.delete(name);
    console.log(`✓ System unregistered: ${name}`);
    return true;
  }

  /**
   * 获取系统
   */
  getSystem(name: string): System | undefined {
    return this.systemMap.get(name);
  }

  /**
   * 获取所有系统
   */
  getAllSystems(): System[] {
    return [...this.systems];
  }

  /**
   * 获取已注册的系统数量
   */
  getSystemCount(): number {
    return this.systems.length;
  }

  // ============================================================================
  // 系统排序
  // ============================================================================

  /**
   * 根据优先级排序系统
   * 优先级数值越小，越先执行
   */
  private sortSystems(): void {
    if (this.sorted) return;

    this.systems.sort((a, b) => a.priority - b.priority);
    this.sorted = true;

    console.log('✓ Systems sorted by priority:');
    this.systems.forEach((system, index) => {
      const name = this.getSystemName(system);
      console.log(`  ${index + 1}. ${name} (priority: ${system.priority})`);
    });
  }

  /**
   * 获取系统名称（用于调试）
   */
  private getSystemName(system: System): string {
    for (const [name, sys] of this.systemMap.entries()) {
      if (sys === system) return name;
    }
    return 'Unknown';
  }

  // ============================================================================
  // 更新循环
  // ============================================================================

  /**
   * 更新所有系统（使用 Clock 的 deltaTime）
   */
  update(): void {
    // 更新 Clock，获取经过 TimeScale 缩放后的 deltaTime
    const deltaTime = this.clock.tick();

    // 确保系统已排序
    if (!this.sorted) {
      this.sortSystems();
    }

    // 按优先级顺序更新所有系统
    for (const system of this.systems) {
      // 获取该系统需要的实体
      const entities = this.entityManager.getActiveEntitiesWithComponents(
        system.requiredComponents
      );

      // 更新系统（传入经过 TimeScale 缩放后的 deltaTime）
      system.update(deltaTime, entities);
    }
  }

  /**
   * 更新所有系统（手动指定 deltaTime，用于测试）
   * @param deltaTime 时间增量（秒）
   * @deprecated 建议使用 update() 让 Clock 自动管理时间
   */
  updateManual(deltaTime: number): void {
    // 步进时钟（同步帧计数与总时间）
    this.clock.tickManual(deltaTime);

    // 确保系统已排序
    if (!this.sorted) {
      this.sortSystems();
    }

    // 按优先级顺序更新所有系统
    for (const system of this.systems) {
      // 获取该系统需要的实体
      const entities = this.entityManager.getActiveEntitiesWithComponents(
        system.requiredComponents
      );

      // 更新系统
      system.update(deltaTime, entities);
    }
  }

  // ============================================================================
  // 实体生命周期钩子
  // ============================================================================

  /**
   * 通知所有系统：实体已添加
   */
  notifyEntityAdded(entity: Entity): void {
    for (const system of this.systems) {
      // 检查实体是否满足系统的组件要求
      if (entity.hasAllComponents(system.requiredComponents)) {
        system.onEntityAdded(entity);
      }
    }
  }

  /**
   * 通知所有系统：实体即将移除
   */
  notifyEntityRemoved(entity: Entity): void {
    for (const system of this.systems) {
      // 检查实体是否满足系统的组件要求
      if (entity.hasAllComponents(system.requiredComponents)) {
        system.onEntityRemoved(entity);
      }
    }
  }

  /**
   * 通知所有系统：实体的组件已改变
   */
  notifyComponentChanged(entity: Entity, componentType: string, added: boolean): void {
    for (const system of this.systems) {
      // 如果该系统不关心这个组件，则跳过
      if (!system.requiredComponents.includes(componentType)) {
        continue;
      }

      const hasAll = entity.hasAllComponents(system.requiredComponents);

      if (added) {
        // 🔥 核心修复：如果刚刚添加了组件，且现在到齐了，则通知添加
        // 这里不需要 !hadComponents，因为 componentType 是刚加的，
        // 只要现在齐了，就说明这是“补全”的瞬间。
        if (hasAll) {
          system.onEntityAdded(entity);
        }
      } else {
        // 🔥 核心修复：如果刚刚移除了组件，说明原本可能是齐的
        // 检查除了刚移除的这个，剩下的组件是否还是齐的
        const remainingRequired = system.requiredComponents.filter(c => c !== componentType);
        const hadOthers = entity.hasAllComponents(remainingRequired);

        if (hadOthers) {
          // 如果原本其他组件都齐，说明移除这个后，就不再满足系统要求
          system.onEntityRemoved(entity);
        }
      }
    }
  }

  // ============================================================================
  // 工具方法
  // ============================================================================

  /**
   * 清空所有系统
   */
  clear(): void {
    this.systems = [];
    this.systemMap.clear();
    this.sorted = true;
    console.log('✓ All systems cleared');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSystems: number;
    systemNames: string[];
    averagePriority: number;
  } {
    const systemNames = Array.from(this.systemMap.keys());
    const totalPriority = this.systems.reduce((sum, sys) => sum + sys.priority, 0);

    return {
      totalSystems: this.systems.length,
      systemNames,
      averagePriority: this.systems.length > 0 ? totalPriority / this.systems.length : 0,
    };
  }

  /**
   * 打印调试信息
   */
  debug(): void {
    console.log('=== SystemManager Debug Info ===');
    console.log(`Total Systems: ${this.systems.length}`);
    console.log(`Sorted: ${this.sorted}`);
    console.log('Systems:');

    this.sortSystems();
    this.systems.forEach((system, index) => {
      const name = this.getSystemName(system);
      console.log(`  ${index + 1}. ${name}`);
      console.log(`     Priority: ${system.priority}`);
      console.log(`     Required Components: [${system.requiredComponents.join(', ')}]`);
    });
  }
}
