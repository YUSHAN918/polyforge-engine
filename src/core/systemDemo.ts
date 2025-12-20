/**
 * PolyForge v1.3.0 SystemManager Demo
 * SystemManager 演示脚本 - 展示系统更新循环
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';
import { MovementSystem } from './systems/MovementSystem';

/**
 * 运行 SystemManager 演示
 */
export function runSystemDemo(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PolyForge v1.3.0 - SystemManager Demo                   ║');
  console.log('║  系统更新循环 - 赋予实体生命力！                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. 创建管理器
  console.log('Step 1: Creating managers...');
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  
  // 连接两个管理器
  entityManager.setSystemManager(systemManager);
  console.log('✓ EntityManager and SystemManager created and linked\n');

  // 2. 注册组件类型
  console.log('Step 2: Registering components...');
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  console.log('✓ Components registered\n');

  // 3. 注册系统
  console.log('Step 3: Registering systems...');
  const movementSystem = new MovementSystem(2.0); // 速度 2.0
  systemManager.registerSystem('MovementSystem', movementSystem);
  console.log('');

  // 4. 创建测试实体
  console.log('Step 4: Creating test entities...');
  
  const player = entityManager.createEntity('Player');
  entityManager.addComponent(player.id, new TransformComponent([0, 0, 0]));
  entityManager.addComponent(player.id, new NameComponent('Hero'));
  console.log(`✓ Player created at [0, 0, 0]`);

  const enemy1 = entityManager.createEntity('Enemy1');
  entityManager.addComponent(enemy1.id, new TransformComponent([5, 0, 0]));
  entityManager.addComponent(enemy1.id, new NameComponent('Goblin'));
  console.log(`✓ Enemy1 created at [5, 0, 0]`);

  const enemy2 = entityManager.createEntity('Enemy2');
  entityManager.addComponent(enemy2.id, new TransformComponent([-5, 0, 0]));
  entityManager.addComponent(enemy2.id, new NameComponent('Orc'));
  console.log(`✓ Enemy2 created at [-5, 0, 0]`);

  console.log('');

  // 5. 模拟游戏循环
  console.log('Step 5: Simulating game loop (10 frames)...\n');
  
  const deltaTime = 0.016; // 约 60 FPS
  const frames = 10;

  for (let frame = 0; frame < frames; frame++) {
    // 更新所有系统
    systemManager.update(deltaTime);

    // 每隔几帧打印一次位置
    if (frame % 3 === 0) {
      console.log(`Frame ${frame}:`);
      
      const playerTransform = player.getComponent<TransformComponent>('Transform');
      console.log(`  Player: [${playerTransform?.position.map(v => v.toFixed(2)).join(', ')}]`);
      
      const enemy1Transform = enemy1.getComponent<TransformComponent>('Transform');
      console.log(`  Enemy1: [${enemy1Transform?.position.map(v => v.toFixed(2)).join(', ')}]`);
      
      const enemy2Transform = enemy2.getComponent<TransformComponent>('Transform');
      console.log(`  Enemy2: [${enemy2Transform?.position.map(v => v.toFixed(2)).join(', ')}]`);
      console.log('');
    }
  }

  // 6. 最终状态
  console.log('Step 6: Final state after 10 frames...');
  const playerTransform = player.getComponent<TransformComponent>('Transform');
  const enemy1Transform = enemy1.getComponent<TransformComponent>('Transform');
  const enemy2Transform = enemy2.getComponent<TransformComponent>('Transform');

  console.log(`  Player final position: [${playerTransform?.position.map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`  Enemy1 final position: [${enemy1Transform?.position.map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`  Enemy2 final position: [${enemy2Transform?.position.map(v => v.toFixed(2)).join(', ')}]`);
  console.log('');

  // 7. 统计信息
  console.log('Step 7: Statistics...');
  const systemStats = systemManager.getStats();
  console.log(`  Total systems: ${systemStats.totalSystems}`);
  console.log(`  System names: [${systemStats.systemNames.join(', ')}]`);
  console.log(`  Average priority: ${systemStats.averagePriority}`);
  console.log('');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Demo Completed Successfully!                             ║');
  console.log('║  实体正在随着系统更新而移动！                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

/**
 * 运行持续的心跳演示（用于 quickDemo）
 */
export function runHeartbeatDemo(): void {
  console.log('\n🎮 PolyForge v1.3.0 - Heartbeat Demo\n');

  // 创建管理器
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  entityManager.setSystemManager(systemManager);

  // 注册组件和系统
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  
  const movementSystem = new MovementSystem(1.0);
  systemManager.registerSystem('MovementSystem', movementSystem);

  // 创建测试实体
  const entity = entityManager.createEntity('HeartbeatEntity');
  entityManager.addComponent(entity.id, new TransformComponent([0, 0, 0]));
  entityManager.addComponent(entity.id, new NameComponent('Pulsing Cube'));

  console.log('✓ Heartbeat entity created');
  console.log('✓ MovementSystem registered');
  console.log('\n💓 Starting heartbeat (5 beats)...\n');

  // 模拟 5 次心跳
  const deltaTime = 0.1; // 100ms per beat
  for (let beat = 0; beat < 5; beat++) {
    systemManager.update(deltaTime);
    
    const transform = entity.getComponent<TransformComponent>('Transform');
    console.log(`Beat ${beat + 1}: Position [${transform?.position.map(v => v.toFixed(3)).join(', ')}]`);
  }

  console.log('\n✅ Heartbeat demo completed!');
  console.log('🎉 Systems are alive and updating entities!\n');
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).runSystemDemo = runSystemDemo;
  (window as any).runHeartbeatDemo = runHeartbeatDemo;
}
