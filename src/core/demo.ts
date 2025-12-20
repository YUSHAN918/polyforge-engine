/**
 * PolyForge v1.3.0 Core ECS Demo
 * 核心 ECS 演示脚本
 * 
 * 此脚本演示新 ECS 架构的基本功能，不干扰现有 UI
 */

import { EntityManager } from './EntityManager';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';
import { runEntityManagerTests } from './__tests__/EntityManager.test';

/**
 * 运行 ECS 核心演示
 */
export function runCoreDemo(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PolyForge v1.3.0 - Core ECS Architecture Demo           ║');
  console.log('║  影子构建 (Shadow Refactor) - 不干扰现有系统              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 运行单元测试
  runEntityManagerTests();

  // 运行实际演示
  runPracticalDemo();
}

/**
 * 实际应用演示
 */
function runPracticalDemo(): void {
  console.log('\n=== Practical Demo: Game Scene Setup ===\n');

  const manager = new EntityManager();
  
  // 注册组件类型
  manager.registerComponent('Transform', TransformComponent);
  manager.registerComponent('Name', NameComponent);

  console.log('Step 1: Creating game entities...');
  
  // 创建玩家
  const player = manager.createEntity('Player');
  manager.addComponent(player.id, new TransformComponent([0, 0, 0]));
  manager.addComponent(player.id, new NameComponent('Hero', 'The main character'));
  
  // 为玩家添加装备挂点
  player.addSocket({
    name: 'hand_right',
    localTransform: {
      position: [0.5, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });
  
  player.addSocket({
    name: 'hand_left',
    localTransform: {
      position: [-0.5, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });

  // 创建武器
  const weapon = manager.createEntity('Sword');
  manager.addComponent(weapon.id, new TransformComponent([0, 0, 0]));
  manager.addComponent(weapon.id, new NameComponent('Iron Sword', 'A basic sword'));

  // 将武器附加到玩家右手
  manager.setParent(weapon.id, player.id, 'hand_right');

  // 创建敌人
  const enemies: string[] = [];
  for (let i = 0; i < 5; i++) {
    const enemy = manager.createEntity(`Enemy_${i}`);
    manager.addComponent(enemy.id, new TransformComponent([i * 2, 0, 5]));
    manager.addComponent(enemy.id, new NameComponent(`Goblin ${i}`, 'A hostile creature'));
    enemies.push(enemy.id);
  }

  // 创建环境对象
  const tree = manager.createEntity('Tree');
  manager.addComponent(tree.id, new TransformComponent([10, 0, 10]));
  manager.addComponent(tree.id, new NameComponent('Oak Tree', 'A large tree'));

  console.log('✓ Created entities\n');

  // 查询演示
  console.log('Step 2: Querying entities...');
  
  const allEntities = manager.getAllEntities();
  console.log(`  Total entities: ${allEntities.length}`);
  
  const withTransform = manager.getEntitiesWithComponents(['Transform']);
  console.log(`  Entities with Transform: ${withTransform.length}`);
  
  const withBoth = manager.getEntitiesWithComponents(['Transform', 'Name']);
  console.log(`  Entities with Transform + Name: ${withBoth.length}`);

  console.log('✓ Query completed\n');

  // 层级演示
  console.log('Step 3: Hierarchy inspection...');
  
  console.log(`  Player children: ${player.children.length}`);
  console.log(`  Weapon parent: ${weapon.parent?.name}`);
  console.log(`  Right hand socket occupied: ${player.isSocketOccupied('hand_right')}`);
  console.log(`  Left hand socket occupied: ${player.isSocketOccupied('hand_left')}`);

  console.log('✓ Hierarchy inspection completed\n');

  // 序列化演示
  console.log('Step 4: Serialization test...');
  
  const serialized = manager.serializeAll();
  const jsonString = JSON.stringify(serialized, null, 2);
  console.log(`  Serialized data size: ${(jsonString.length / 1024).toFixed(2)} KB`);
  console.log(`  Serialized entities: ${serialized.length}`);

  // 验证序列化数据包含层级信息
  const weaponData = serialized.find(e => e.id === weapon.id);
  console.log(`  Weapon parent ID in serialized data: ${weaponData?.parentId}`);
  console.log(`  Weapon socket name in serialized data: ${weaponData?.socketName}`);

  console.log('✓ Serialization test completed\n');

  // 统计信息
  console.log('Step 5: Manager statistics...');
  const stats = manager.getStats();
  console.log(`  Total Entities: ${stats.totalEntities}`);
  console.log(`  Active Entities: ${stats.activeEntities}`);
  console.log(`  Root Entities: ${stats.rootEntities}`);
  console.log(`  Component Types: ${stats.componentTypes}`);
  console.log(`  Avg Components/Entity: ${stats.averageComponentsPerEntity.toFixed(2)}`);

  console.log('✓ Statistics retrieved\n');

  // 性能测试
  console.log('Step 6: Performance test (1000 entities)...');
  
  const startTime = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    const entity = manager.createEntity(`PerfTest_${i}`);
    manager.addComponent(entity.id, new TransformComponent([i, 0, 0]));
    if (i % 2 === 0) {
      manager.addComponent(entity.id, new NameComponent(`Entity ${i}`));
    }
  }
  
  const createTime = performance.now() - startTime;
  
  const queryStart = performance.now();
  const queryResult = manager.getEntitiesWithComponents(['Transform', 'Name']);
  const queryTime = performance.now() - queryStart;
  
  console.log(`  Create 1000 entities: ${createTime.toFixed(2)}ms`);
  console.log(`  Query with 2 components: ${queryTime.toFixed(2)}ms`);
  console.log(`  Query result count: ${queryResult.length}`);
  console.log(`  Total entities now: ${manager.getEntityCount()}`);

  console.log('✓ Performance test completed\n');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Demo Completed Successfully!                             ║');
  console.log('║  New ECS core is ready for integration                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// 如果直接运行此文件，执行演示
if (typeof window !== 'undefined') {
  // 在浏览器环境中，将演示函数暴露到全局
  (window as any).runPolyForgeCoreDemo = runCoreDemo;
  console.log('PolyForge Core Demo loaded. Run window.runPolyForgeCoreDemo() to start.');
}
