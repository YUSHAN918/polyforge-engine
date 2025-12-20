/**
 * PolyForge v1.3.0 MovementSystem
 * 移动系统 - 用于测试和演示
 */

import { System, Entity } from '../types';
import { TransformComponent } from '../components/TransformComponent';

/**
 * MovementSystem 移动系统
 * 自动更新实体的位置（用于演示系统更新循环）
 */
export class MovementSystem implements System {
  public readonly priority = 100; // 中等优先级
  public readonly requiredComponents = ['Transform'];

  private moveSpeed: number;
  private entityVelocities: Map<string, [number, number, number]>;

  constructor(moveSpeed: number = 1.0) {
    this.moveSpeed = moveSpeed;
    this.entityVelocities = new Map();
  }

  /**
   * 更新逻辑
   */
  update(deltaTime: number, entities: Entity[]): void {
    for (const entity of entities) {
      const transform = entity.getComponent<TransformComponent>('Transform');
      if (!transform || !transform.enabled) continue;

      // 获取或初始化速度
      let velocity = this.entityVelocities.get(entity.id);
      if (!velocity) {
        // 随机初始速度
        velocity = [
          (Math.random() - 0.5) * this.moveSpeed,
          (Math.random() - 0.5) * this.moveSpeed,
          (Math.random() - 0.5) * this.moveSpeed,
        ];
        this.entityVelocities.set(entity.id, velocity);
      }

      // 更新位置
      transform.position[0] += velocity[0] * deltaTime;
      transform.position[1] += velocity[1] * deltaTime;
      transform.position[2] += velocity[2] * deltaTime;

      // 简单的边界检测（在 -10 到 10 之间反弹）
      for (let i = 0; i < 3; i++) {
        if (transform.position[i] > 10 || transform.position[i] < -10) {
          velocity[i] *= -1; // 反向
        }
      }
    }
  }

  /**
   * 实体添加回调
   */
  onEntityAdded(entity: Entity): void {
    console.log(`MovementSystem: Entity ${entity.name} (${entity.id}) added`);
  }

  /**
   * 实体移除回调
   */
  onEntityRemoved(entity: Entity): void {
    console.log(`MovementSystem: Entity ${entity.name} (${entity.id}) removed`);
    this.entityVelocities.delete(entity.id);
  }

  /**
   * 设置实体的速度
   */
  setVelocity(entityId: string, velocity: [number, number, number]): void {
    this.entityVelocities.set(entityId, velocity);
  }

  /**
   * 获取实体的速度
   */
  getVelocity(entityId: string): [number, number, number] | undefined {
    return this.entityVelocities.get(entityId);
  }
}
