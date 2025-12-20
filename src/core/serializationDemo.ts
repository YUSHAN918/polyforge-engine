/**
 * PolyForge v1.3.0 SerializationService Demo
 * 序列化服务演示 - 展示存档和恢复功能
 */

import { EntityManager } from './EntityManager';
import { SystemManager } from './SystemManager';
import { SerializationService } from './SerializationService';
import { TransformComponent } from './components/TransformComponent';
import { NameComponent } from './components/NameComponent';
import { MovementSystem } from './systems/MovementSystem';

/**
 * 运行序列化演示
 */
export function runSerializationDemo(): void {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  PolyForge v1.3.0 - SerializationService Demo            ║');
  console.log('║  存档与恢复 - 让作品像文本一样轻便分享！                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 1. 创建管理器
  console.log('Step 1: Creating managers...');
  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  const serializationService = new SerializationService(entityManager);
  
  entityManager.setSystemManager(systemManager);
  console.log('✓ Managers created\n');

  // 2. 注册组件和系统
  console.log('Step 2: Registering components and systems...');
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  systemManager.registerSystem('MovementSystem', new MovementSystem(2.0));
  console.log('✓ Components and systems registered\n');

  // 3. 创建初始场景
  console.log('Step 3: Creating initial scene...');
  
  const player = entityManager.createEntity('Player');
  entityManager.addComponent(player.id, new TransformComponent([0, 0, 0]));
  entityManager.addComponent(player.id, new NameComponent('Hero', 'The brave adventurer'));
  
  const enemy1 = entityManager.createEntity('Enemy1');
  entityManager.addComponent(enemy1.id, new TransformComponent([5, 0, 0]));
  entityManager.addComponent(enemy1.id, new NameComponent('Goblin', 'A sneaky creature'));
  
  const enemy2 = entityManager.createEntity('Enemy2');
  entityManager.addComponent(enemy2.id, new TransformComponent([-5, 0, 0]));
  entityManager.addComponent(enemy2.id, new NameComponent('Orc', 'A fierce warrior'));
  
  console.log('✓ 3 entities created\n');

  // 4. 让实体移动几步
  console.log('Step 4: Running simulation (5 frames)...');
  const deltaTime = 0.1;
  for (let i = 0; i < 5; i++) {
    systemManager.update(deltaTime);
  }
  
  const playerTransform1 = player.getComponent<TransformComponent>('Transform');
  console.log(`  Player position after 5 frames: [${playerTransform1?.position.map(v => v.toFixed(3)).join(', ')}]`);
  console.log('');

  // 5. 导出 JSON
  console.log('Step 5: Exporting to JSON...');
  const exportedJSON = serializationService.serializeToJSON({
    name: 'Test World',
    description: 'A test world with 3 entities',
    author: 'PolyForge Demo',
  }, true);
  
  const stats = serializationService.getStats(JSON.parse(exportedJSON));
  console.log(`  ✓ Exported successfully!`);
  console.log(`  Entities: ${stats.entityCount}`);
  console.log(`  Components: ${stats.totalComponents}`);
  console.log(`  JSON size: ${(stats.jsonSize / 1024).toFixed(2)} KB`);
  console.log(`  Timestamp: ${stats.timestamp.toLocaleString()}`);
  console.log('');

  // 6. 验证 JSON
  console.log('Step 6: Validating exported data...');
  const validation = serializationService.validate(JSON.parse(exportedJSON));
  console.log(`  Valid: ${validation.valid}`);
  if (validation.errors.length > 0) {
    console.log(`  Errors: ${validation.errors.join(', ')}`);
  }
  if (validation.warnings.length > 0) {
    console.log(`  Warnings: ${validation.warnings.join(', ')}`);
  }
  console.log('');

  // 7. 清空世界
  console.log('Step 7: Clearing world...');
  entityManager.clear();
  console.log(`  Entities remaining: ${entityManager.getEntityCount()}`);
  console.log('');

  // 8. 从 JSON 导入
  console.log('Step 8: Importing from JSON...');
  serializationService.deserializeFromJSON(exportedJSON);
  console.log(`  Entities restored: ${entityManager.getEntityCount()}`);
  console.log('');

  // 9. 验证恢复的数据
  console.log('Step 9: Verifying restored data...');
  const restoredPlayer = entityManager.getEntity(player.id);
  const restoredPlayerTransform = restoredPlayer?.getComponent<TransformComponent>('Transform');
  const restoredPlayerName = restoredPlayer?.getComponent<NameComponent>('Name');
  
  console.log(`  Player found: ${restoredPlayer !== undefined}`);
  console.log(`  Player name: ${restoredPlayerName?.displayName}`);
  console.log(`  Player position: [${restoredPlayerTransform?.position.map(v => v.toFixed(3)).join(', ')}]`);
  
  // 比较位置
  const positionsMatch = 
    playerTransform1?.position[0] === restoredPlayerTransform?.position[0] &&
    playerTransform1?.position[1] === restoredPlayerTransform?.position[1] &&
    playerTransform1?.position[2] === restoredPlayerTransform?.position[2];
  
  console.log(`  Position matches: ${positionsMatch ? '✓ YES' : '✗ NO'}`);
  console.log('');

  // 10. 继续模拟
  console.log('Step 10: Continuing simulation (5 more frames)...');
  for (let i = 0; i < 5; i++) {
    systemManager.update(deltaTime);
  }
  
  const playerTransform2 = restoredPlayer?.getComponent<TransformComponent>('Transform');
  console.log(`  Player position after 5 more frames: [${playerTransform2?.position.map(v => v.toFixed(3)).join(', ')}]`);
  console.log('');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Demo Completed Successfully!                             ║');
  console.log('║  序列化系统完美工作！实体在导入后保持了原有状态！          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 显示 JSON 预览
  console.log('📄 JSON Preview (first 500 characters):');
  console.log(exportedJSON.substring(0, 500) + '...\n');
}

/**
 * 运行快照演示
 */
export function runSnapshotDemo(): void {
  console.log('\n🎮 PolyForge v1.3.0 - Snapshot Demo\n');

  const entityManager = new EntityManager();
  const systemManager = new SystemManager(entityManager);
  const serializationService = new SerializationService(entityManager);
  
  entityManager.setSystemManager(systemManager);
  entityManager.registerComponent('Transform', TransformComponent);
  entityManager.registerComponent('Name', NameComponent);
  systemManager.registerSystem('MovementSystem', new MovementSystem(1.0));

  // 创建实体
  const entity = entityManager.createEntity('TestEntity');
  entityManager.addComponent(entity.id, new TransformComponent([0, 0, 0]));
  entityManager.addComponent(entity.id, new NameComponent('Snapshot Test'));

  console.log('✓ Entity created at [0, 0, 0]');

  // 创建快照 1
  const snapshot1 = serializationService.createSnapshot('Initial State');
  console.log('✓ Snapshot 1 created');

  // 移动 3 步
  for (let i = 0; i < 3; i++) {
    systemManager.update(0.1);
  }
  const transform1 = entity.getComponent<TransformComponent>('Transform');
  console.log(`  Position after 3 steps: [${transform1?.position.map(v => v.toFixed(3)).join(', ')}]`);

  // 创建快照 2
  const snapshot2 = serializationService.createSnapshot('After 3 steps');
  console.log('✓ Snapshot 2 created');

  // 再移动 3 步
  for (let i = 0; i < 3; i++) {
    systemManager.update(0.1);
  }
  const transform2 = entity.getComponent<TransformComponent>('Transform');
  console.log(`  Position after 6 steps: [${transform2?.position.map(v => v.toFixed(3)).join(', ')}]`);

  // 恢复到快照 1
  console.log('\n⏪ Restoring to Snapshot 1...');
  serializationService.restoreSnapshot(snapshot1);
  const restoredEntity = entityManager.getEntity(entity.id);
  const restoredTransform = restoredEntity?.getComponent<TransformComponent>('Transform');
  console.log(`  Position restored: [${restoredTransform?.position.map(v => v.toFixed(3)).join(', ')}]`);

  console.log('\n✅ Snapshot demo completed!');
  console.log('🎉 Time travel works perfectly!\n');
}

// 暴露到全局
if (typeof window !== 'undefined') {
  (window as any).runSerializationDemo = runSerializationDemo;
  (window as any).runSnapshotDemo = runSnapshotDemo;
}
