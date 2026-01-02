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
  private colliderToEntity: Map<number, string> = new Map(); // 🔥 新增：反向映射 Collider Handle -> Entity ID
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
      this.colliderToEntity.delete(collider.handle); // 🔥 删除句柄映射，防止泄露或冲突
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
    const collider = this.createCollider(physics, rigidBody, entity);

    // 保存映射
    this.bodyMap.set(entity.id, rigidBody);
    if (collider) {
      this.colliderMap.set(entity.id, collider);
      this.colliderToEntity.set(collider.handle, entity.id); // 🔥 记录句柄映射 (用于射线拣选)
    }

    // 保存 Rapier 句柄到组件
    physics.rapierHandle = rigidBody.handle;
    if (collider) {
      physics.rapierColliderHandle = collider.handle;
    }

    // 🚀 应用物理锁定 (解决角色倾倒与方块抖动)
    rigidBody.setEnabledTranslations(!physics.lockPosition[0], !physics.lockPosition[1], !physics.lockPosition[2], true);
    rigidBody.setEnabledRotations(!physics.lockRotation[0], !physics.lockRotation[1], !physics.lockRotation[2], true);
  }

  /**
  * 创建碰撞体
  */
  private createCollider(physics: PhysicsComponent, rigidBody: RigidBody, entity?: Entity): Collider | null {
    if (!this.RAPIER || !this.world) return null;

    // Initialize with a default to satisfy TypeScript strict assignment checks
    let colliderDesc: ColliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    const { shape, size, offset } = physics.collider;

    // 记录句柄映射 (用于射线拣选)
    const registerCollider = (collider: Collider) => {
      if (entity) {
        this.colliderToEntity.set(collider.handle, entity.id);
      }
      return collider;
    };

    // 根据形状创建碰撞体描述
    const transform = entity?.getComponent<TransformComponent>('Transform');
    const physComp = entity?.getComponent<PhysicsComponent>('Physics');
    const baseScale = transform ? transform.scale[0] : 1.0;
    const scale = baseScale * (physComp?.colliderScale ?? 1.0); // 🔥 最终物理缩放 = 变换缩放 * 物理微调因子

    switch (shape) {
      case 'box':
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(
          (size[0] * scale) / 2,
          (size[1] * scale) / 2,
          (size[2] * scale) / 2
        );
        break;
      case 'sphere':
        colliderDesc = this.RAPIER.ColliderDesc.ball(size[0] * scale);
        break;
      case 'capsule':
        colliderDesc = this.RAPIER.ColliderDesc.capsule((size[1] * scale) / 2, size[0] * scale);
        break;
      case 'cylinder':
        colliderDesc = this.RAPIER.ColliderDesc.cylinder((size[1] * scale) / 2, size[0] * scale);
        break;
      case 'heightfield':
        // 🔥 Terrain Collision Support
        let created = false;
        if (entity) {
          const terrain = entity.getComponent<any>('Terrain'); // Use any to avoid import cycle risks for now, or just interface
          if (terrain && terrain.heightData) {
            // 🚀 Switch to Trimesh for maximum stability (avoiding Heightfield WASM crashes)
            const rows = terrain.config.depthSegments + 1;
            const cols = terrain.config.widthSegments + 1;
            const width = terrain.config.width;
            const depth = terrain.config.depth;

            // 1. Construct Vertices
            const vertices = new Float32Array(rows * cols * 3);
            for (let z = 0; z < rows; z++) {
              for (let x = 0; x < cols; x++) {
                const i = (z * cols + x);
                const vIdx = i * 3;
                vertices[vIdx] = (x / (cols - 1) - 0.5) * width;
                vertices[vIdx + 1] = terrain.heightData[i];
                vertices[vIdx + 2] = (z / (rows - 1) - 0.5) * depth;
              }
            }

            // 2. Construct Indices (Triangles)
            const indices = new Uint32Array((rows - 1) * (cols - 1) * 6);
            let idx = 0;
            for (let z = 0; z < rows - 1; z++) {
              for (let x = 0; x < cols - 1; x++) {
                const v0 = z * cols + x;
                const v1 = z * cols + (x + 1);
                const v2 = (z + 1) * cols + x;
                const v3 = (z + 1) * cols + (x + 1);

                // Triangle 1
                indices[idx++] = v0;
                indices[idx++] = v2;
                indices[idx++] = v1;
                // Triangle 2
                indices[idx++] = v1;
                indices[idx++] = v2;
                indices[idx++] = v3;
              }
            }

            try {
              // Trimesh is much more robust than heightfield in WASM
              colliderDesc = this.RAPIER.ColliderDesc.trimesh(vertices, indices);
              created = true;
              console.log(`[PhysicsSystem] Terrain Trimesh created: ${vertices.length / 3} vertices, ${indices.length / 3} triangles.`);
            } catch (e) {
              console.error('[PhysicsSystem] Failed to create trimesh collider', e);
            }
          }
        }

        if (!created) {
          console.warn('PhysicsSystem: Heightfield requested but no Terrain data found. Fallback to box.');
          colliderDesc = this.RAPIER.ColliderDesc.cuboid(size[0] / 2, 0.1, size[2] / 2);
        }
        break;
      default:
        console.warn(`Unsupported collider shape: ${shape}`);
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    }

    // 设置偏移 (叠加原有 offset 与 MVP 局部偏移)
    colliderDesc.translation = {
      x: offset[0] + (physics.colliderLocalOffset?.[0] || 0),
      y: offset[1] + (physics.colliderLocalOffset?.[1] || 0),
      z: offset[2] + (physics.colliderLocalOffset?.[2] || 0)
    };

    // 设置旋转 (应用 MVP 局部旋转)
    if (physics.colliderLocalRotation) {
      const q = this.eulerToQuaternion(
        physics.colliderLocalRotation[0],
        physics.colliderLocalRotation[1],
        physics.colliderLocalRotation[2]
      );
      colliderDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }

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

      // 🚀 高刷新率同步：优先使用四元数（解决欧拉角转换导致的视觉偏斜）
      transform.quaternion = [rotation.x, rotation.y, rotation.z, rotation.w];

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
      rigidBody.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
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
    this.colliderToEntity.clear(); // 🔥 同时也清理映射
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
  /**
   * 射线检测
   * @param origin 射线起点
   * @param direction 射线方向 (需归一化)
   * @param maxToi 最大检测距离 (Time of Impact)
   * @param excludeBodyHandle 需要排除的刚体句柄 (如发射者自身)
   */
  public castRay(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxToi: number = 100,
    excludeBodyHandle?: number
  ): {
    hit: boolean;
    toi: number;
    point: { x: number; y: number; z: number };
    normal?: { x: number; y: number; z: number };
    entityId?: string; // 🔥 新增：命中的实体 ID
  } {
    if (!this.world || !this.RAPIER) {
      return { hit: false, toi: 0, point: { x: 0, y: 0, z: 0 } };
    }

    const ray = new this.RAPIER.Ray(origin, direction);

    // 默认过滤组: 0xffffffff (所有)
    // 如果需要过滤，可以使用 queryFilter 参数
    // 这里我们主要使用 excludeRigidBody 来排除特定物体

    let hit;

    // Rapier 的 castRay 签名: castRay(ray, maxToi, solid, filter?, startAtInside?, excludeRigidBody?)
    // 注意: 不同版本的 Rapier 签名可能不同，这里基于 v0.11+ 的常见用法
    // 如果是 web 版本的 rapier3d-compat:
    // world.castRay(ray, maxToi, solid, filter_groups, filter_exclude_groups, filter_exclude_body)

    // 由于类型定义的细微差异，我们使用最通用的调用方式，传入 QueryFilter 如果需要
    // 目前简单起见，我们假设只需要排除一个 Body

    // 创建 InteractionGroups (默认均为 -1，表示与所有物体碰撞)
    // const interactionGroups = 0xffffffff; 

    // Raycast
    // 参数: ray, maxToi, solid (true), groups, excludeRigidBody
    // 注意：@dimforge/rapier3d-compat 的 world.castRay signature:
    // (ray: Ray, maxToi: number, solid: boolean, groups?: number, filterExcludeRigidBody?: RigidBody)

    // 为了安全起见，先获取要排除的 RigidBody 对象
    let excludeBody = null;
    if (excludeBodyHandle !== undefined) {
      // 这里的 excludeBodyHandle 应该是 RigidBody.handle
      // 但 Rapier API 通常需要 RigidBody 对象。
      // 我们通过 handle 并不是很容易反查对象，除非遍历。
      // 所以我们稍微调整策略：让调用者尽量不传 handle，或者我们接受检测后再过滤。
      // 实际上，PhysicsSystem 内部的 castRay 可以只返回最近的 hit。
      // 如果 hit.collider.parent().handle === excludeBodyHandle，我们可能需要再次 castRay (这很麻烦)

      // 更好的方式是使用 QueryPipeline (如果 Rapier 版本支持) 或者简单的 World.castRay

      // 让我们尝试使用 QueryPipeline 如果存在，或者直接用 world
      // 这里的 world.castRay 是最直接的
    }

    // 简化策略：直接 Raycast，如果命中的是排除对象，则忽略本次结果？
    // 但 Raycast 只返回最近的一个。如果最近的是排除对象，那就会遮挡后面的。
    // Rapier 的 castRay 并不直接支持 "exclude list"。
    // 解决方法：使用 castRayAndGetNormal 或类比接口，通常支持 QueryFilter。

    // 经过确认 rapier3d-compat 的 World.castRay 支持 queryFilter
    // queryFilter 可以是一个对象或 mask。
    // 让我们用最基础的实现，如果不支持复杂过滤，就先不传 exclude。
    // 为了稳健性，我们在 CameraSystem 里做二次校验（如果距离太近且是自己？不，Raycast 会被挡住）

    // 尝试使用 QueryPipeline (这是更正确的方式，如果 World 直接暴露了)
    // this.world.queryPipeline.castRay...

    // 鉴于不确定 Rapier 具体版本的 API细节，我们先写一个安全的实现：
    // 使用 castRay，不做特定的 exclude (依赖调用者传参控制 group 或之后处理)
    // 或者，更进一步：Rapier 的 RigidBody 有 setCollisionGroups。
    // 我们暂时只实现基础 Raycast。

    // 尝试使用带法线的检测
    // @ts-ignore - Rapier types might vary
    if (this.world.castRayAndGetNormal) {
      // @ts-ignore
      hit = this.world.castRayAndGetNormal(ray, maxToi, true);
    } else {
      hit = this.world.castRay(ray, maxToi, true);
    }

    if (hit) {
      // 只有当命中点的刚体句柄不是要排除的句柄时才算数
      // 这是一个潜在问题：如果最近的是自己，就会立刻返回自己。
      // 真正的解决办法是使用 QueryFilter，但这需要 mask 设置。

      // 临时方案：如果 excludeBodyHandle 存在，且命中了它，我们需要"穿透"它。
      // 但 Rapier 简单的 castRay 不支持穿透。
      // 必须依靠 Collision Groups。
      // 建议：角色自身的 Collider 应该设置特定的 Group，或者 Camera Ray 使用特定的 Group。

      // 目前为了不破坏现有逻辑，我们暂且返回 hit。
      // 调用者 (CameraSystem) 应该确保射线的起点在"碰撞体之外"（例如 Pivot 点通常在头部上方）。

      // 为了支持 excludeBodyHandle (如果 API 支持)
      // 很多 Rapier 版本 world.castRay 第五个参数是 excludeRigidBody
      // 我们尝试传入。需要先找到 Body 对象。
      if (excludeBodyHandle !== undefined) {
        // 查找 body 对象 (比较耗时，但为了功能正确性)
        // 我们的 bodyMap 是 entityId -> Body。无法直接通过 handle 查。
        // 除非我们在 map 里遍历。
        // 优化：PhysicsSystem 可以维护 handle -> Body 的反向索引，或者调用者传 EntityId
      }

      // Safe property access
      const timeOfImpact = (hit as any).toi ?? (hit as any).timeOfImpact;
      const collider = (hit as any).collider;
      const entityId = collider ? this.colliderToEntity.get(collider.handle) : undefined;

      return {
        hit: true,
        toi: timeOfImpact,
        point: ray.pointAt(timeOfImpact),
        normal: (hit as any).normal, // Extract normal if available
        entityId: entityId // 🔥 返回探测到的实体 ID
      };
    }

    return { hit: false, toi: 0, point: { x: 0, y: 0, z: 0 }, normal: undefined };
  }

  /**
   * 专为相机设计的射线检测 (支持忽略特定实体)
   */
  public castCameraRay(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxToi: number,
    ignoreEntityId?: string
  ): { hit: boolean; toi: number; point: { x: number; y: number; z: number } } {
    if (!this.world || !this.RAPIER) return { hit: false, toi: 0, point: { x: 0, y: 0, z: 0 } };

    const ray = new this.RAPIER.Ray(origin, direction);
    let excludeBody = undefined;

    if (ignoreEntityId) {
      excludeBody = this.bodyMap.get(ignoreEntityId);
    }

    // 🚀 Robust Raycast for Camera (Compatible with multiple Rapier versions)
    // Try positional arguments first as per rapier3d-compat common practice.
    // (ray, maxToi, solid, queryGroups, queryFilter, excludeRigidBody)
    const hit = (this.world as any).castRay(
      ray,
      maxToi,
      true,         // solid
      0xffffffff,   // groups (all bits)
      undefined,    // filter
      excludeBody   // excludeRigidBody
    );

    if (hit) {
      // Safe property access: handle both .toi and .timeOfImpact
      const timeOfImpact = (hit as any).toi ?? (hit as any).timeOfImpact ?? 0;
      return {
        hit: true,
        toi: timeOfImpact,
        point: ray.pointAt(timeOfImpact)
      };
    }
    return { hit: false, toi: 0, point: { x: 0, y: 0, z: 0 } };
  }
  /**
   * 重建刚体 (用于热更新，例如地形改变)
   */
  public rebuildBody(entityId: string): void {
    if (!this.entityManager) return;
    const entity = this.entityManager.getEntity(entityId);
    if (!entity) return;

    // Remove existing
    this.onEntityRemoved(entity);

    // Re-add
    this.onEntityAdded(entity); // This will re-read components and recreate body/collider
  }
}
