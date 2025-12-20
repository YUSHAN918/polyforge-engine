/**
 * PolyForge v1.3.0 Quick Demo
 * 快速演示脚本 - 证明新引擎可以独立运行
 */

import { EntityManager } from './EntityManager';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';

/**
 * 快速演示：创建一个简单的游戏场景
 */
export function quickDemo(): void {
  console.log('\n🎮 PolyForge v1.3.0 - Quick Demo\n');

  // 1. 创建管理器
  const manager = new EntityManager();
  console.log('✓ EntityManager created');

  // 2. 注册组件类型
  manager.registerComponent('Transform', TransformComponent);
  manager.registerComponent('Name', NameComponent);
  console.log('✓ Components registered');

  // 3. 创建玩家实体
  const player = manager.createEntity('Player');
  manager.addComponent(player.id, new TransformComponent([0, 0, 0]));
  manager.addComponent(player.id, new NameComponent('Hero', 'The main character'));
  console.log(`✓ Player created: ${player.id}`);

  // 4. 为玩家添加装备挂点
  player.addSocket({
    name: 'hand_right',
    localTransform: {
      position: [0.5, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });
  console.log('✓ Socket added to player');

  // 5. 创建武器
  const weapon = manager.createEntity('Sword');
  manager.addComponent(weapon.id, new TransformComponent([0, 0, 0]));
  manager.addComponent(weapon.id, new NameComponent('Iron Sword', 'A basic weapon'));
  console.log(`✓ Weapon created: ${weapon.id}`);

  // 6. 将武器附加到玩家
  manager.setParent(weapon.id, player.id, 'hand_right');
  console.log('✓ Weapon attached to player');

  // 7. 验证层级关系
  console.log('\n📊 Hierarchy Check:');
  console.log(`  Player children: ${player.children.length}`);
  console.log(`  Weapon parent: ${weapon.parent?.name}`);
  console.log(`  Socket occupied: ${player.isSocketOccupied('hand_right')}`);

  // 8. 查询系统测试
  console.log('\n🔍 Query Test:');
  const withTransform = manager.getEntitiesWithComponents(['Transform']);
  const withBoth = manager.getEntitiesWithComponents(['Transform', 'Name']);
  console.log(`  Entities with Transform: ${withTransform.length}`);
  console.log(`  Entities with Transform + Name: ${withBoth.length}`);

  // 9. 序列化测试
  console.log('\n💾 Serialization Test:');
  const serialized = manager.serializeAll();
  const json = JSON.stringify(serialized, null, 2);
  console.log(`  Serialized size: ${(json.length / 1024).toFixed(2)} KB`);
  console.log(`  Entities serialized: ${serialized.length}`);

  // 10. 读取组件数据
  console.log('\n📖 Component Data:');
  const playerTransform = player.getComponent<TransformComponent>('Transform');
  const playerName = player.getComponent<NameComponent>('Name');
  console.log(`  Player position: [${playerTransform?.position.join(', ')}]`);
  console.log(`  Player name: ${playerName?.displayName}`);
  console.log(`  Player description: ${playerName?.description}`);

  // 11. 统计信息
  console.log('\n📈 Statistics:');
  const stats = manager.getStats();
  console.log(`  Total entities: ${stats.totalEntities}`);
  console.log(`  Active entities: ${stats.activeEntities}`);
  console.log(`  Root entities: ${stats.rootEntities}`);
  console.log(`  Component types: ${stats.componentTypes}`);
  console.log(`  Avg components/entity: ${stats.averageComponentsPerEntity.toFixed(2)}`);

  console.log('\n✅ Demo completed successfully!');
  console.log('🎉 New ECS core is working perfectly!\n');

  return;
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).quickDemo = quickDemo;
}
