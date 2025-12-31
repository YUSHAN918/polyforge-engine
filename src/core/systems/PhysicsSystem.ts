/**
 * PolyForge v1.3.0 PhysicsSystem
 * Phase 8: 物理系统（Rapier 集成）
 * 
 * 功能：
 * - 集成 Rapier 3D 物理引擎
 * - 管理刚体和碰撞体
 * - 双向同步：物理 ↔ Transform
 * - 支持 Static, Dynamic, Kinematic 刚体
 */

import type { System, Entity } from '../types';
import { TransformComponent } from '../components/TransformComponent';
import { PhysicsComponent, type BodyType } from '../components/PhysicsComponent';

// Rapier 类型（延迟加载）
type RAPIER = typeof import('@dimforge/rapier3d');
type World = import('@dimforge/rapier3d').World;
type RigidBody = import('@dimforge/rapier3d').RigidBody;
type Collider = import('@dimforge/rapier3d').Collider;
type RigidBodyDesc = import('@dimforge/rapier3d').RigidBodyDesc;
type ColliderDesc = import('@dimforge/rapier3d').ColliderDesc;

/**
 * 物理系统
 * 负责物理模拟和同步
 */
export class PhysicsSystem implements System {
  public readonly name = 'PhysicsSystem';
  public readonly priority = 100;      // 在 InputSystem 之后，RenderSystem 之前
  public enabled = true;
  public readonly requiredComponents = ['Physics', 'Transform'];

  private RAPIER: RAPIER | null = null;
  private world: World | null = null;
  private entityManager: any | null = null;
  private bodyMap: Map<string, RigidBody> = new Map();  // entityId -> RigidBody
  private colliderMap: Map<string, Collider> = new Map(); // entityId -> Collider
  private initialized = false;
  private gravity: [number, number, number] = [0, -9.81, 0];  // 默认重力
  private clock: any | null = null;

  /**
   * 设置实体管理器引用 (用于初始化时的 Catch-up)
   */
  public setEntityManager(em: any): void {
    this.entityManager = em;
  }

  /**
   * 初始化物理引擎
   * @param entityManager 注入实体管理器（由 SystemManager 自动传入）
   * @param clock 注入时钟系统
   */
  public async initialize(entityManager?: any, clock?: any): Promise<void> {
    if (this.initialized) return;

    // 🔥 确保持有引用
    if (entityManager) this.entityManager = entityManager;
    if (clock) this.clock = clock;

    try {
      // 动态导入 Rapier（WASM 模块）
      this.RAPIER = await import('@dimforge/rapier3d');

      // 创建物理世界
      const gravity = { x: this.gravity[0], y: this.gravity[1], z: this.gravity[2] };
      this.world = new this.RAPIER.World(gravity);

      this.initialized = true;
      console.log('✓ PhysicsSystem initialized with Rapier');

      // 🔥 Catch-up: 发现所有在初始化完成前就被添加的实体
      // 解决因异步加载 WASM 导致的初期实体被忽略的问题
      if (this.entityManager) {
        const entities = this.entityManager.getEntitiesWithComponents(this.requiredComponents);
        console.log(`[PhysicsSystem] Catch-up: processing ${entities.length} entities`);
        entities.forEach((entity: Entity) => this.onEntityAdded(entity));
      }

      // console.log(`  Gravity: [${this.gravity.join(', ')}]`);
    } catch (error) {
      console.error('Failed to initialize PhysicsSystem:', error);
      this.enabled = false;
    }
  }

  /**
   * 设置重力
   */
  public setGravity(x: number, y: number, z: number): void {
    this.gravity = [x, y, z];
    if (this.world) {
      this.world.gravity = { x, y, z };
      // console.log(`✓ Gravity updated: [${x}, ${y}, ${z}]`);
    }
  }

  /**
   * System 接口：实体添加回调
   */
  public onEntityAdded(entity: Entity): void {
    if (!this.initialized || !this.RAPIER || !this.world) return;

    const physics = entity.getComponent<PhysicsComponent>('Physics');
    const transform = entity.getComponent<TransformComponent>('Transform');

    if (!physics || !transform) return;

    // 创建刚体
    this.createRigidBody(entity, physics, transform);

    // 🔥 初始位置同步
    this.syncTransformToPhysics(entity);
    // console.log(`✓ RigidBody created and synced for entity: ${entity.id}`);
  }

  /**
   * System 接口：实体移除回调
   */
  public onEntityRemoved(entity: Entity): void {
    if (!this.world) return;

    // 移除刚体和碰撞体
    const body = this.bodyMap.get(entity.id);
    const collider = this.colliderMap.get(entity.id);

    if (body) {
      this.world.removeRigidBody(body);
      this.bodyMap.delete(entity.id);
    }

    if (collider) {
      this.world.removeCollider(collider, false);
      this.colliderMap.delete(entity.id);
    }
  }

  /**
   * 创建刚体
   */
  private createRigidBody(
    entity: Entity,
    physics: PhysicsComponent,
    transform: TransformComponent
  ): void {
    if (!this.RAPIER || !this.world) return;

    // 创建刚体描述
    let rigidBodyDesc: RigidBodyDesc;

    switch (physics.bodyType) {
      case 'static':
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
        break;
      case 'kinematic':
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'dynamic':
      default:
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
        break;
    }

    // 设置初始位置和旋转
    rigidBodyDesc.setTranslation(
      transform.position[0],
      transform.position[1],
      transform.position[2]
    );

    // 将欧拉角转换为四元数（简化版，假设 ZYX 顺序）
    const [rx, ry, rz] = transform.rotation;
    const quat = this.eulerToQuaternion(rx, ry, rz);
    rigidBodyDesc.setRotation(quat);

    // 设置物理属性
    if (physics.bodyType === 'dynamic') {
      rigidBodyDesc.setLinearDamping(physics.linearDamping);
      rigidBodyDesc.setAngularDamping(physics.angularDamping);
      rigidBodyDesc.setGravityScale(physics.useGravity ? 1.0 : 0.0);
    }

    // 创建刚体
    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    // 创建碰撞体
    const collider = this.createCollider(physics, rigidBody);

    // 保存映射
    this.bodyMap.set(entity.id, rigidBody);
    if (collider) {
      this.colliderMap.set(entity.id, collider);
    }

    // 保存 Rapier 句柄到组件
    physics.rapierHandle = rigidBody.handle;
    if (collider) {
      physics.rapierColliderHandle = collider.handle;
    }
  }

  /**
   * 创建碰撞体
   */
  private createCollider(physics: PhysicsComponent, rigidBody: RigidBody): Collider | null {
    if (!this.RAPIER || !this.world) return null;

    let colliderDesc: ColliderDesc;
    const { shape, size, offset } = physics.collider;

    // 根据形状创建碰撞体描述
    switch (shape) {
      case 'box':
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
          size[0] / 2,
          size[1] / 2,
          size[2] / 2
        );
        break;
      case 'sphere':
        colliderDesc = this.RAPIER.ColliderDesc.ball(size[0]);
        break;
      case 'capsule':
        colliderDesc = this.RAPIER.ColliderDesc.capsule(size[1] / 2, size[0]);
        break;
      case 'cylinder':
        colliderDesc = this.RAPIER.ColliderDesc.cylinder(size[1] / 2, size[0]);
        break;
      default:
        console.warn(`Unsupported collider shape: ${shape}`);
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }

    // 设置偏移
    colliderDesc.translation = { x: offset[0], y: offset[1], z: offset[2] };

    // 设置物理材质
    colliderDesc.setFriction(physics.friction);
    colliderDesc.setRestitution(physics.restitution);
    colliderDesc.setDensity(physics.mass);

    // 设置为传感器（如果需要）
    if (physics.collider.isSensor) {
      colliderDesc.setSensor(true);
    }

    // 创建碰撞体
    return this.world.createCollider(colliderDesc, rigidBody);
  }

  /**
   * System 接口：更新
   */
  public update(deltaTime: number, entities?: Entity[]): void {
    if (!this.initialized || !this.world || !entities || !this.enabled) return;

    // 步进物理模拟
    this.world.step();

    // 🔥 KillZ: 坠落回收 (每间隔一定帧数检查一次，平衡性能)
    if (this.clock && this.clock.getFrameCount() % 30 === 0) {
      this.checkKillZ(entities);
    }

    // 同步物理状态到 Transform
    this.syncPhysicsToTransform(entities);
  }

  /**
   * 检查坠落死区并回收实体
   */
  private checkKillZ(entities: Entity[]): void {
    const KILL_Z = -50; // 虚空深度阈值
    for (const entity of entities) {
      const body = this.bodyMap.get(entity.id);
      // 只检查动态刚体，且排除受控角色（角色由角色逻辑处理，或给更高的阈值）
      if (body && body.isDynamic() && body.translation().y < KILL_Z) {
        if (entity.name?.includes('Player')) continue; // 保护玩家

        console.log(`♻️ [PhysicsSystem] KillZ triggered: Purging entity ${entity.id} (${entity.name})`);
        if (this.entityManager) {
          this.entityManager.destroyEntity(entity.id);
        }
      }
    }
  }

  /**
   * 同步物理状态到 Transform（物理 → 视觉）
   */
  private syncPhysicsToTransform(entities: Entity[]): void {
    for (const entity of entities) {
      const rigidBody = this.bodyMap.get(entity.id);
      if (!rigidBody) continue;

      // 只同步动态刚体（静态和运动学刚体由用户控制）
      if (!rigidBody.isDynamic()) continue;

      const transform = entity.getComponent<TransformComponent>('Transform');
      if (!transform) continue;

      // 获取物理位置
      const translation = rigidBody.translation();
      transform.position[0] = translation.x;
      transform.position[1] = translation.y;
      transform.position[2] = translation.z;

      // 获取物理旋转
      const rotation = rigidBody.rotation();
      const euler = this.quaternionToEuler(rotation);
      transform.rotation[0] = euler[0];
      transform.rotation[1] = euler[1];
      transform.rotation[2] = euler[2];

      // 🔥 Force update matrix so Camera can read new position
      transform.markLocalDirty();
    }
  }

  /**
   * 同步 Transform 到物理（视觉 → 物理）
   * 当用户手动修改 Transform 时调用
   */
  public syncTransformToPhysics(entity: Entity): void {
    if (!this.world) return;

    // ... Implementation skipped for brevity if not needed right now
    // Actually, let's keep it safe.
    const rigidBody = this.bodyMap.get(entity.id);
    const transform = entity.getComponent<TransformComponent>('Transform');
    if (rigidBody && transform) {
      rigidBody.setTranslation({ x: transform.position[0], y: transform.position[1], z: transform.position[2] }, true);
      const q = this.eulerToQuaternion(transform.rotation[0], transform.rotation[1], transform.rotation[2]);
      rigidBody.setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] }, true);
    }
  }

  /**
   * 设置实体线性速度 (用于角色控制器)
   */
  public setEntityVelocity(entityId: string, velocity: [number, number, number]): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      body.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
    }
  }



  /**
   * 欧拉角转四元数 (度数 -> 弧度)
   */
  private eulerToQuaternion(rxDeg: number, ryDeg: number, rzDeg: number): { w: number; x: number; y: number; z: number } {
    const rx = rxDeg * Math.PI / 180;
    const ry = ryDeg * Math.PI / 180;
    const rz = rzDeg * Math.PI / 180;

    const cx = Math.cos(rx / 2);
    const cy = Math.cos(ry / 2);
    const cz = Math.cos(rz / 2);
    const sx = Math.sin(rx / 2);
    const sy = Math.sin(ry / 2);
    const sz = Math.sin(rz / 2);

    return {
      w: cx * cy * cz + sx * sy * sz,
      x: sx * cy * cz - cx * sy * sz,
      y: cx * sy * cz + sx * cy * sz,
      z: cx * cy * sz - sx * sy * cz,
    };
  }

  /**
   * 四元数转欧拉角 (弧度 -> 度数)
   */
  private quaternionToEuler(quat: { w: number; x: number; y: number; z: number }): [number, number, number] {
    const { w, x, y, z } = quat;

    // 🔥 修正：使用标准 XYZ 顺序 (Tait-Bryan angles) 进行转换
    // https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles

    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * Math.PI / 2; // 使用 90 度锁定
    } else {
      pitch = Math.asin(sinp);
    }

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    // 返回度数（符合 PolyForge Transform 标准）
    return [
      roll * 180 / Math.PI,
      pitch * 180 / Math.PI,
      yaw * 180 / Math.PI
    ];
  }

  /**
   * 设置线性速度 (用于角色控制器驱动)
   */
  public setLinearVelocity(entityId: string, x: number, y: number, z: number): void {
    const rigidBody = this.bodyMap.get(entityId);
    if (rigidBody) {
      rigidBody.setLinvel({ x, y, z }, true);
    }
  }

  /**
   * 获取刚体
   */
  public getRigidBody(entityId: string): RigidBody | undefined {
    return this.bodyMap.get(entityId);
  }

  /**
   * 获取统计信息
   */
  public getStats() {
    return {
      initialized: this.initialized,
      totalBodies: this.bodyMap.size,
      totalColliders: this.colliderMap.size,
      gravity: this.gravity,
    };
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    if (this.world) {
      this.world.free();
      this.world = null;
    }
    this.bodyMap.clear();
    this.colliderMap.clear();
    this.initialized = false;
  }

  /**
   * 获取调试渲染数据 (Vertices + Colors)
   */
  public getDebugBuffers(): { vertices: Float32Array; colors: Float32Array } | null {
    if (!this.world) return null;
    return this.world.debugRender();
  }

  /**
   * 施加爆炸力 (用于测试)
   */
  public applyExplosion(center: [number, number, number], force: number, radius: number): void {
    if (!this.world) return;

    this.bodyMap.forEach((body) => {
      if (!body.isDynamic()) return;

      const translation = body.translation();
      const dx = translation.x - center[0];
      const dy = translation.y - center[1];
      const dz = translation.z - center[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < radius) {
        // 计算方向
        const dirX = dx / distance;
        const dirY = dy / distance;
        const dirZ = dz / distance;

        // 简单的线性衰减
        const intensity = force * (1 - distance / radius);

        body.applyImpulse({
          x: dirX * intensity,
          y: dirY * intensity,
          z: dirZ * intensity
        }, true);
      }
    });

    console.log(`💥 Explosion applied! Center: [${center}], Radius: ${radius}, Force: ${force}`);
  }
}
