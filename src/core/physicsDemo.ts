/**
 * PolyForge v1.3.0 Physics Demo
 * Phase 8: 物理系统演示
 * 
 * 教学目标：
 * 1. 演示如何集成 Rapier 3D 物理引擎
 * 2. 展示 Static 和 Dynamic 刚体的区别
 * 3. 演示物理引擎与 ECS 的双向同步
 * 4. 提供交互式控制函数供实验
 * 
 * 场景描述：
 * - 1 个静态地板（不受重力影响，固定不动）
 * - 5 个动力学方块（受重力影响，自由落体）
 * - 观察碰撞、弹跳、摩擦等物理效果
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { TransformComponent } from './components/TransformComponent';
import { VisualComponent } from './components/VisualComponent';
import { PhysicsComponent } from './components/PhysicsComponent';
import { NameComponent } from './components/NameComponent';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { Clock } from './Clock';

// ============================================================================
// 全局变量 - 用于交互式控制
// ============================================================================
// 这些变量允许我们在浏览器控制台中动态控制物理演示
let globalEntityManager: EntityManager | null = null;
let globalSystemManager: SystemManager | null = null;
let globalPhysicsSystem: PhysicsSystem | null = null;
let globalClock: Clock | null = null;
let animationFrameId: number | null = null;

/**
 * Physics Demo 主函数
 * 
 * 演示流程：
 * 1. 初始化 ECS 管理器（EntityManager, SystemManager, Clock）
 * 2. 初始化 Rapier 物理引擎（异步加载 WASM 模块）
 * 3. 创建静态地板（Static 刚体）
 * 4. 创建动力学方块（Dynamic 刚体）
 * 5. 启动物理模拟循环（60 FPS）
 * 
 * 注意：此函数是异步的，因为需要加载 Rapier WASM 模块
 */
export async function physicsDemo(): Promise<void> {
  console.log('\n=== PolyForge Phase 8: Physics System Demo ===\n');

  // ============================================================================
  // 步骤 1: 初始化 ECS 核心管理器
  // ============================================================================
  // EntityManager: 管理所有实体和组件
  // Clock: 管理时间和帧率
  // SystemManager: 管理所有系统的更新循环
  // PhysicsSystem: 物理引擎系统
  const entityManager = new EntityManager();
  const clock = new Clock();
  const systemManager = new SystemManager(entityManager, clock);
  const physicsSystem = new PhysicsSystem();

  // 保存到全局变量
  globalEntityManager = entityManager;
  globalSystemManager = systemManager;
  globalPhysicsSystem = physicsSystem;
  globalClock = clock;

  // ============================================================================
  // 步骤 2: 注册组件类型
  // ============================================================================
  // 必须先注册组件类型，才能在实体上添加组件
  entityManager.registerComponent('Transform', TransformComponent);  // 位置、旋转、缩放
  entityManager.registerComponent('Visual', VisualComponent);        // 视觉外观
  entityManager.registerComponent('Physics', PhysicsComponent);      // 物理属性
  entityManager.registerComponent('Name', NameComponent);            // 名称标签

  console.log('✓ Managers initialized\n');

  // ============================================================================
  // 步骤 3: 初始化 Rapier 物理引擎
  // ============================================================================
  // Rapier 是一个高性能的 3D 物理引擎，使用 WebAssembly 实现
  // 初始化过程是异步的，需要等待 WASM 模块加载完成
  console.log('Initializing Rapier physics engine...');
  await physicsSystem.initialize();

  // 将物理系统注册到 SystemManager
  // 这样每帧更新时，SystemManager 会自动调用 PhysicsSystem.update()
  systemManager.registerSystem('PhysicsSystem', physicsSystem);

  console.log('✓ PhysicsSystem registered\n');

  // ============================================================================
  // 步骤 4: 创建地板（Static 静态刚体）
  // ============================================================================
  // Static 刚体特点：
  // - 不受重力影响
  // - 不会移动（除非手动修改 Transform）
  // - 可以与 Dynamic 刚体碰撞
  // - 适用于：地板、墙壁、静态障碍物

  console.log('=== Creating Ground ===\n');

  const ground = entityManager.createEntity('Ground');

  // Transform: 位于原点下方 (y = -1)
  // 尺寸：10x0.5x10（宽x高x深）
  const groundTransform = new TransformComponent([0, -1, 0], [0, 0, 0], [10, 0.5, 10]);
  entityManager.addComponent(ground.id, groundTransform);

  // Visual: 灰色地板外观
  const groundVisual = new VisualComponent();
  groundVisual.geometry = { type: 'box', parameters: { width: 10, height: 0.5, depth: 10 } };
  groundVisual.material = { type: 'standard', color: '#808080' };
  entityManager.addComponent(ground.id, groundVisual);

  // Physics: 静态刚体配置
  // 参数：bodyType, collider, mass, friction, restitution
  const groundPhysics = new PhysicsComponent(
    'static',                                      // 刚体类型：静态
    { shape: 'box', size: [10, 0.5, 10], offset: [0, 0, 0] },  // 碰撞体形状和尺寸
    1.0,                                           // 质量（静态刚体忽略此参数）
    0.5,                                           // 摩擦系数（0-1，越大越粗糙）
    0.3                                            // 弹性系数（0-1，越大越弹）
  );
  entityManager.addComponent(ground.id, groundPhysics);

  // Name
  entityManager.addComponent(ground.id, new NameComponent('Ground', 'Static ground plane'));

  console.log(`✓ Ground created: ${ground.id}`);
  console.log(`  Position: [${groundTransform.position.join(', ')}]`);
  console.log(`  Size: [${groundTransform.scale.join(', ')}]`);
  console.log(`  Body Type: static\n`);

  // ============================================================================
  // 步骤 5: 创建随机方块（Dynamic 动力学刚体）
  // ============================================================================
  // Dynamic 刚体特点：
  // - 受重力影响（会下落）
  // - 受力和碰撞影响（会移动和旋转）
  // - 有质量、摩擦、弹性等物理属性
  // - 适用于：可移动物体、角色、道具

  console.log('=== Creating Falling Boxes ===\n');

  const boxCount = 5;
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

  for (let i = 0; i < boxCount; i++) {
    const box = entityManager.createEntity(`Box${i + 1}`);

    // Transform: 随机位置（空中 y = 5-10）
    // 这样方块会从不同高度落下，产生有趣的碰撞效果
    const x = (Math.random() - 0.5) * 6;  // x: -3 到 3
    const y = 5 + Math.random() * 5;      // y: 5 到 10
    const z = (Math.random() - 0.5) * 6;  // z: -3 到 3
    const boxTransform = new TransformComponent([x, y, z], [0, 0, 0], [1, 1, 1]);
    entityManager.addComponent(box.id, boxTransform);

    // Visual: 彩色方块外观
    const boxVisual = new VisualComponent();
    boxVisual.geometry = { type: 'box', parameters: { width: 1, height: 1, depth: 1 } };
    boxVisual.material = { type: 'standard', color: colors[i] };
    entityManager.addComponent(box.id, boxVisual);

    // Physics: 动力学刚体配置
    const boxPhysics = new PhysicsComponent(
      'dynamic',                                   // 刚体类型：动力学
      { shape: 'box', size: [1, 1, 1], offset: [0, 0, 0] },  // 碰撞体形状
      1.0,    // 质量：1.0 kg（影响惯性和碰撞效果）
      0.5,    // 摩擦：0.5（中等摩擦，不会太滑也不会太粗糙）
      0.3     // 弹性：0.3（轻微弹跳，不会像皮球一样弹得很高）
    );
    entityManager.addComponent(box.id, boxPhysics);

    // Name
    entityManager.addComponent(box.id, new NameComponent(`Box ${i + 1}`, 'Falling box'));

    console.log(`✓ Box ${i + 1} created at [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
  }

  console.log('\n✓ All boxes created\n');

  // ============================================================================
  // 步骤 6: 启动物理模拟循环
  // ============================================================================
  // 物理模拟需要持续更新，通常以 60 FPS 运行
  // 每帧执行：
  // 1. Clock.tick() - 计算 deltaTime
  // 2. PhysicsSystem.update() - 步进物理模拟
  // 3. 同步物理状态到 TransformComponent

  console.log('=== Starting Physics Simulation ===\n');

  const stats = physicsSystem.getStats();
  console.log(`Total Bodies: ${stats.totalBodies}`);
  console.log(`Total Colliders: ${stats.totalColliders}`);
  console.log(`Gravity: [${stats.gravity.join(', ')}]\n`);

  console.log('✓ Physics simulation started\n');
  console.log('=== Physics Demo Running! ===\n');
  console.log('✅ Ground created (static)');
  console.log('✅ 5 boxes created (dynamic)');
  console.log('✅ Physics engine running');
  console.log('✅ Gravity enabled\n');

  console.log('💡 Observe:');
  console.log('  - Boxes falling due to gravity');
  console.log('  - Boxes colliding with ground');
  console.log('  - Boxes bouncing and settling');
  console.log('  - Realistic physics simulation\n');

  console.log('💡 Controls:');
  console.log('  window.stopPhysics()         - Stop simulation');
  console.log('  window.startPhysics()        - Start simulation');
  console.log('  window.resetPhysics()        - Reset all boxes');
  console.log('  window.setGravity(x,y,z)     - Change gravity');
  console.log('  window.spawnPhysicsBox()     - Spawn new dynamic rigid body\n');

  // 启动更新循环
  startPhysicsLoop();
}

/**
 * 启动物理更新循环
 * 
 * 使用 requestAnimationFrame 实现 60 FPS 的更新循环
 * 每帧调用 SystemManager.update()，它会：
 * 1. 调用 Clock.tick() 计算 deltaTime
 * 2. 调用所有注册系统的 update() 方法
 * 3. PhysicsSystem 会步进物理模拟并同步状态
 */
function startPhysicsLoop(): void {
  if (!globalSystemManager || !globalClock || !globalEntityManager) return;

  const loop = () => {
    if (!globalSystemManager) return;

    // SystemManager 内部会调用 Clock.tick()
    globalSystemManager.update();

    // 继续循环
    animationFrameId = requestAnimationFrame(loop);
  };

  loop();
  console.log('✓ Physics loop started (60 FPS)\n');
}

/**
 * 停止物理模拟
 * 
 * 取消 requestAnimationFrame 循环，暂停物理更新
 * 方块会停在当前位置，不再受重力影响
 */
export function stopPhysics(): void {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    console.log('⏸️  Physics simulation stopped');
  }
}

/**
 * 启动物理模拟
 * 
 * 重新启动 requestAnimationFrame 循环，恢复物理更新
 */
export function startPhysics(): void {
  if (animationFrameId === null) {
    startPhysicsLoop();
    console.log('▶️  Physics simulation started');
  }
}

/**
 * 重置所有方块
 * 
 * 将所有方块重新放置到随机的空中位置
 * 并重置它们的速度（线性速度和角速度）
 * 
 * 这演示了如何手动修改物理对象的状态：
 * 1. 修改 TransformComponent
 * 2. 调用 syncTransformToPhysics() 同步到物理引擎
 * 3. 手动重置刚体的速度
 */
export function resetPhysics(): void {
  if (!globalEntityManager || !globalPhysicsSystem) {
    console.warn('Physics demo not initialized. Run physicsDemo() first.');
    return;
  }

  // 获取所有方块
  const entities = globalEntityManager.getActiveEntities();
  const boxes = entities.filter(e => e.name.startsWith('Box'));

  // 重置位置
  for (const box of boxes) {
    const transform = box.getComponent<TransformComponent>('Transform');
    if (transform) {
      const x = (Math.random() - 0.5) * 6;
      const y = 5 + Math.random() * 5;
      const z = (Math.random() - 0.5) * 6;

      transform.position[0] = x;
      transform.position[1] = y;
      transform.position[2] = z;

      // 同步到物理引擎
      globalPhysicsSystem.syncTransformToPhysics(box);

      // 重置速度
      const rigidBody = globalPhysicsSystem.getRigidBody(box.id);
      if (rigidBody) {
        rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  }

  console.log('🔄 Physics reset - all boxes repositioned');
}

/**
 * 设置重力
 * 
 * 动态修改物理世界的重力向量
 * 
 * 示例：
 * - 地球重力：setGravity(0, -9.81, 0)
 * - 月球重力：setGravity(0, -1.62, 0)
 * - 零重力：setGravity(0, 0, 0)
 * - 侧向重力：setGravity(-9.81, 0, 0)
 */
export function setGravity(x: number, y: number, z: number): void {
  if (!globalPhysicsSystem) {
    console.warn('Physics demo not initialized. Run physicsDemo() first.');
    return;
  }

  globalPhysicsSystem.setGravity(x, y, z);
}

/**
 * 生成新的动力学刚体方块
 * 
 * 独立函数，不依赖 commandDemo
 * 
 * 这演示了如何在运行时动态创建物理对象：
 * 1. 创建实体
 * 2. 添加 Transform, Visual, Physics 组件
 * 3. PhysicsSystem 会自动检测到新实体并创建对应的刚体
 * 
 * 注意：与 Phase 5 的 spawnBox() 不同，这个函数：
 * - 不集成命令系统（不支持撤销/重做）
 * - 专注于物理演示
 * - 方块从更高的位置生成（y = 8-11）
 */
export function spawnPhysicsBox(): void {
  if (!globalEntityManager || !globalPhysicsSystem) {
    console.warn('⚠️  Physics demo not initialized. Run await physicsDemo() first.');
    return;
  }

  const boxCount = globalEntityManager.getActiveEntities().filter(e => e.name.startsWith('Box')).length;
  const box = globalEntityManager.createEntity(`Box${boxCount + 1}`);

  // Transform: 随机位置
  const x = (Math.random() - 0.5) * 6;
  const y = 8 + Math.random() * 3;
  const z = (Math.random() - 0.5) * 6;
  const boxTransform = new TransformComponent([x, y, z], [0, 0, 0], [1, 1, 1]);
  globalEntityManager.addComponent(box.id, boxTransform);

  // Visual: 随机颜色
  const boxVisual = new VisualComponent();
  boxVisual.geometry = { type: 'box', parameters: { width: 1, height: 1, depth: 1 } };
  boxVisual.material = {
    type: 'standard',
    color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
  };
  globalEntityManager.addComponent(box.id, boxVisual);

  // Physics: 动力学刚体
  const boxPhysics = new PhysicsComponent(
    'dynamic',
    { shape: 'box', size: [1, 1, 1], offset: [0, 0, 0] },
    1.0,
    0.5,
    0.3
  );
  globalEntityManager.addComponent(box.id, boxPhysics);

  // Name
  globalEntityManager.addComponent(box.id, new NameComponent(`Box ${boxCount + 1}`, 'Dynamic rigid body'));

  console.log(`📦 Dynamic rigid body spawned at [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);
}

/**
 * 显示物理系统状态
 * 
 * 打印当前物理系统的统计信息：
 * - 初始化状态
 * - 刚体数量
 * - 碰撞体数量
 * - 当前重力
 * - 所有方块的位置
 * 
 * 用于调试和观察物理模拟的状态
 */
export function showPhysicsStatus(): void {
  if (!globalPhysicsSystem || !globalEntityManager) {
    console.warn('Physics demo not initialized. Run physicsDemo() first.');
    return;
  }

  const stats = globalPhysicsSystem.getStats();
  console.log('\n=== Physics System Status ===\n');
  console.log(`Initialized: ${stats.initialized}`);
  console.log(`Total Bodies: ${stats.totalBodies}`);
  console.log(`Total Colliders: ${stats.totalColliders}`);
  console.log(`Gravity: [${stats.gravity.join(', ')}]`);

  // 显示所有方块的位置
  const entities = globalEntityManager.getActiveEntities();
  const boxes = entities.filter(e => e.name.startsWith('Box'));

  console.log(`\nBoxes (${boxes.length}):`);
  for (const box of boxes) {
    const transform = box.getComponent<TransformComponent>('Transform');
    if (transform) {
      console.log(`  ${box.name}: [${transform.position.map(v => v.toFixed(2)).join(', ')}]`);
    }
  }
  console.log('');
}
